import React, { useRef, useState, useEffect } from 'react';
import { useProject } from '../../../context/ProjectContext';
import { 
  ZoomIn, ZoomOut, Maximize2, MousePointer, Edit3, 
  Ruler, RefreshCw, Upload, Sparkles, FileText, Layers, Plus 
} from 'lucide-react';
import { api } from '../../../api/client';
import { formatFeetToImperial, parseImperialToFeet } from '../../../utils/imperial';

export const FloorplanCanvas: React.FC = () => {
  const {
    activeProject,
    activeDrawing,
    walls,
    rooms,
    equipment,
    equipmentTypes,
    selectedType,
    selectedId,
    selectItem,
    addWall,
    updateEquipment,
    addEquipment,
    activeTool,
    setActiveTool,
    pendingEquipmentTypeId,
    setPendingEquipmentTypeId,
    setCursorCoords,
    setModalOpen,
    setDetectedGeometryData,
    refreshProjectData,
    uploadFloorplanFile
  } = useProject();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Tool interaction state
  const [wallStart, setWallStart] = useState<{ x: number; y: number } | null>(null);
  const [wallCurrent, setWallCurrent] = useState<{ x: number; y: number } | null>(null);

  const [scaleStart, setScaleStart] = useState<{ x: number; y: number } | null>(null);
  const [scaleCurrent, setScaleCurrent] = useState<{ x: number; y: number } | null>(null);

  const [draggingEquipmentId, setDraggingEquipmentId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadFile = async (file: File) => {
    setIsProcessing(true);
    try {
      await uploadFloorplanFile(file);
    } catch (err: any) {
      console.error('Failed to upload floorplan', err);
      alert(err.message || 'Error uploading floorplan PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSampleFloorplan = async () => {
    setIsProcessing(true);
    try {
      const sampleBlob = await fetch('/api/sample-files/floorplan').then(r => r.blob());
      const sampleFile = new File([sampleBlob], 'sample_architectural_floorplan.pdf', { type: 'application/pdf' });
      await uploadFloorplanFile(sampleFile);
    } catch (err: any) {
      console.error('Failed to load sample floorplan', err);
      alert('Error loading sample floorplan PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  // Preview Image
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  // Load preview image when drawing changes
  useEffect(() => {
    if (!activeProject || !activeDrawing) {
      setBgImage(null);
      return;
    }

    const img = new Image();
    img.src = `/api/projects/${activeProject.id}/drawings/${activeDrawing.id}/preview`;
    img.onload = () => {
      setBgImage(img);
    };
  }, [activeProject, activeDrawing]);

  // SketchUp-style Precision Input Commit (Measurements box in status bar)
  useEffect(() => {
    const handlePrecisionCommit = (e: any) => {
      const valStr = e.detail?.value;
      if (!valStr) return;
      const parsedFeet = parseImperialToFeet(valStr);
      if (parsedFeet === null || parsedFeet <= 0.1) return;

      // When actively drawing a wall and start point exists, commit wall with exact typed length
      if (activeTool === 'DRAW_WALL' && wallStart && wallCurrent) {
        const dx = wallCurrent.x - wallStart.x;
        const dy = wallCurrent.y - wallStart.y;
        const currentLen = Math.hypot(dx, dy);
        const angle = currentLen > 0.001 ? Math.atan2(dy, dx) : 0;
        const snappedEndX = wallStart.x + Math.cos(angle) * parsedFeet;
        const snappedEndY = wallStart.y + Math.sin(angle) * parsedFeet;

        addWall({
          start_x: wallStart.x,
          start_y: wallStart.y,
          end_x: snappedEndX,
          end_y: snappedEndY,
          wall_type: 'interior',
          thickness: 0.5,
          height: 9.0
        });

        setWallStart(null);
        setWallCurrent(null);
      }
    };

    window.addEventListener('cad-precision-input', handlePrecisionCommit);
    return () => window.removeEventListener('cad-precision-input', handlePrecisionCommit);
  }, [activeTool, wallStart, wallCurrent, addWall]);

  // Transform screen canvas coords to drawing coords
  const screenToWorld = (screenX: number, screenY: number) => {
    const scaleFactor = activeProject?.settings?.scale_factor || 0.1;
    // Drawing space pixels
    const drawX = (screenX - pan.x) / zoom;
    const drawY = (screenY - pan.y) / zoom;

    // Real world feet relative to drawing origin (assumes drawing margin offset or 1:1)
    const feetX = drawX * scaleFactor;
    const feetY = drawY * scaleFactor;

    return { drawX, drawY, feetX, feetY };
  };

  const worldToScreen = (feetX: number, feetY: number) => {
    const scaleFactor = activeProject?.settings?.scale_factor || 0.1;
    const drawX = feetX / scaleFactor;
    const drawY = feetY / scaleFactor;
    const screenX = drawX * zoom + pan.x;
    const screenY = drawY * zoom + pan.y;
    return { screenX, screenY };
  };

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to client dimensions
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }

    const width = canvas.width;
    const height = canvas.height;

    // Clear background (architectural drafting table dark grey)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // 1. Draw Architectural Grid
    const gridSize = 50; // 50px grid
    const startX = Math.floor(-pan.x / (gridSize * zoom)) * gridSize - gridSize * 5;
    const startY = Math.floor(-pan.y / (gridSize * zoom)) * gridSize - gridSize * 5;
    const endX = startX + (width / zoom) + gridSize * 10;
    const endY = startY + (height / zoom) + gridSize * 10;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5 / zoom;
    for (let x = startX; x < endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    for (let y = startY; y < endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    // 2. Draw PDF preview background if loaded
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0);
    }

    const scaleFactor = activeProject?.settings?.scale_factor || 0.1;

    // 3. Draw Rooms
    rooms.forEach(room => {
      const rx = (room.center_x / scaleFactor);
      const ry = (room.center_y / scaleFactor);

      const isSelected = selectedType === 'room' && selectedId === room.id;
      ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(51, 65, 85, 0.15)';
      ctx.strokeStyle = isSelected ? '#60a5fa' : '#475569';
      ctx.lineWidth = 1.5 / zoom;

      // Draw room marker / zone
      ctx.beginPath();
      ctx.arc(rx, ry, 28 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Room label
      ctx.fillStyle = '#f8fafc';
      ctx.font = `${Math.max(11 / zoom, 10)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(room.name, rx, ry - 6 / zoom);
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.max(9 / zoom, 8)}px monospace`;
      ctx.fillText(`${room.area_sq_ft} sq ft`, rx, ry + 8 / zoom);
    });

    // 4. Draw Walls
    walls.forEach(wall => {
      const isSelected = selectedType === 'wall' && selectedId === wall.id;
      const x1 = wall.draw_start_x ?? (wall.start_x / scaleFactor);
      const y1 = wall.draw_start_y ?? (wall.start_y / scaleFactor);
      const x2 = wall.draw_end_x ?? (wall.end_x / scaleFactor);
      const y2 = wall.draw_end_y ?? (wall.end_y / scaleFactor);

      const wallPixelThickness = Math.max((wall.thickness / scaleFactor), 3);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);

      if (isSelected) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = wallPixelThickness + 3 / zoom;
        ctx.stroke();
      }

      ctx.strokeStyle = wall.wall_type === 'exterior' ? '#f1f5f9' : '#94a3b8';
      ctx.lineWidth = wallPixelThickness;
      ctx.lineCap = 'square';
      ctx.stroke();

      // Vertex handles
      if (isSelected) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(x1, y1, 5 / zoom, 0, Math.PI * 2);
        ctx.arc(x2, y2, 5 / zoom, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 5. Draw Multi-Discipline MEP & Custom Equipment
    equipment.forEach(eq => {
      const isSelected = selectedType === 'equipment' && selectedId === eq.id;
      const ex = eq.position_x / scaleFactor;
      const ey = eq.position_y / scaleFactor;
      const ew = Math.max(eq.width / scaleFactor, 16 / zoom);
      const el = Math.max(eq.length / scaleFactor, 16 / zoom);

      const eqType = equipmentTypes.find(t => t.id === eq.equipment_type_id);
      const discipline = eq.discipline || eqType?.discipline || 'mechanical';
      const has3DModel = Boolean(eq.model_url || eqType?.model_url);

      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(eq.rotation_z || 0);

      // Selection Glow / Halo
      if (isSelected) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.fillRect(-ew / 2 - 4 / zoom, -el / 2 - 4 / zoom, ew + 8 / zoom, el + 8 / zoom);
      }

      // Discipline-Specific Color Scheme & Architectural Symbols
      let bodyFill = '#1d4ed8'; // Default mechanical blue
      const strokeColor = isSelected ? '#38bdf8' : '#ffffff';

      if (has3DModel) {
        bodyFill = '#0284c7'; // 3D Vendor Sky Blue
      } else if (discipline === 'electrical') {
        bodyFill = '#b45309'; // Electrical Amber/Ochre
      } else if (discipline === 'plumbing') {
        bodyFill = '#0d9488'; // Plumbing Teal
      } else if (discipline === 'fire_protection') {
        bodyFill = '#dc2626'; // Fire Protection Crimson
      } else if (eq.equipment_type_id === 'DIFFUSER' || eq.equipment_type_id === 'RETURN_GRILLE') {
        bodyFill = '#059669'; // Air Terminal Emerald
      }

      ctx.fillStyle = bodyFill;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = (isSelected ? 2.5 : 1.5) / zoom;

      if (discipline === 'fire_protection' && (eq.equipment_type_id === 'SPRINKLER_PENDANT' || eq.equipment_type_id === 'SPRINKLER_UPRIGHT')) {
        // Sprinkler circle with target crosshairs
        const radius = Math.max(ew, el) / 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        ctx.moveTo(-radius * 1.3, 0);
        ctx.lineTo(radius * 1.3, 0);
        ctx.moveTo(0, -radius * 1.3);
        ctx.lineTo(0, radius * 1.3);
        ctx.stroke();
      } else if (eq.equipment_type_id === 'CHW_PUMP') {
        // Base rectangular skid + inscribed ISO pump circle & directional triangle
        ctx.fillRect(-ew / 2, -el / 2, ew, el);
        ctx.strokeRect(-ew / 2, -el / 2, ew, el);

        const pr = Math.min(ew, el) * 0.38;
        ctx.beginPath();
        ctx.arc(0, 0, pr, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Directional arrow / triangle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(pr * 0.8, 0);
        ctx.lineTo(-pr * 0.4, -pr * 0.5);
        ctx.lineTo(-pr * 0.4, pr * 0.5);
        ctx.closePath();
        ctx.fill();
      } else {
        // Rectangular CAD body
        ctx.fillRect(-ew / 2, -el / 2, ew, el);
        ctx.strokeRect(-ew / 2, -el / 2, ew, el);

        // Architectural cross / diagonal for air terminals / panels
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        if (discipline === 'electrical') {
          // Lightning or cross-hatch corner indicator
          ctx.moveTo(-ew / 2, -el / 2);
          ctx.lineTo(ew / 2, el / 2);
          ctx.moveTo(-ew / 2, el / 2);
          ctx.lineTo(ew / 2, -el / 2);
        } else {
          ctx.moveTo(-ew / 2, -el / 2);
          ctx.lineTo(ew / 2, el / 2);
        }
        ctx.stroke();
      }

      // 3D Vendor Badge indicator
      if (has3DModel) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = `bold ${Math.max(8 / zoom, 7)}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText('3D', ew / 2 - 2 / zoom, -el / 2 + 8 / zoom);
      }

      // Equipment Tag Label
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(10 / zoom, 9)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(eq.tag, 0, 0);

      ctx.restore();
    });

    // 6. Active Wall Drawing Tool Preview
    if (activeTool === 'DRAW_WALL' && wallStart && wallCurrent) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 4 / zoom;
      ctx.setLineDash([6 / zoom, 4 / zoom]);
      ctx.beginPath();
      ctx.moveTo(wallStart.x, wallStart.y);
      ctx.lineTo(wallCurrent.x, wallCurrent.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Wall length callout
      const dx = wallCurrent.x - wallStart.x;
      const dy = wallCurrent.y - wallStart.y;
      const lenFeet = Math.hypot(dx, dy) * scaleFactor;
      ctx.fillStyle = '#22c55e';
      ctx.font = `bold ${12 / zoom}px monospace`;
      ctx.fillText(formatFeetToImperial(lenFeet), (wallStart.x + wallCurrent.x) / 2, (wallStart.y + wallCurrent.y) / 2 - 10 / zoom);
    }

    // 7. Active Scale Calibration Tool Preview
    if (activeTool === 'CALIBRATE_SCALE' && scaleStart && scaleCurrent) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5 / zoom;
      ctx.setLineDash([4 / zoom, 3 / zoom]);
      ctx.beginPath();
      ctx.moveTo(scaleStart.x, scaleStart.y);
      ctx.lineTo(scaleCurrent.x, scaleCurrent.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tick markers at ends
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(scaleStart.x, scaleStart.y, 5 / zoom, 0, Math.PI * 2);
      ctx.arc(scaleCurrent.x, scaleCurrent.y, 5 / zoom, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }, [
    pan, zoom, bgImage, walls, rooms, equipment, selectedType, selectedId,
    activeTool, wallStart, wallCurrent, scaleStart, scaleCurrent, activeProject
  ]);

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const { drawX, drawY, feetX, feetY } = screenToWorld(clientX, clientY);

    // Pan with middle mouse button or Space key
    if (e.button === 1 || e.buttons === 4 || e.altKey) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button === 0) {
      // 1. Scale Calibration Tool
      if (activeTool === 'CALIBRATE_SCALE') {
        if (!scaleStart) {
          setScaleStart({ x: drawX, y: drawY });
          setScaleCurrent({ x: drawX, y: drawY });
        } else {
          // Finished calibration line
          setModalOpen(m => ({ ...m, scaleCalibration: true }));
          setScaleStart(null);
          setScaleCurrent(null);
          setActiveTool('SELECT');
        }
        return;
      }

      // 2. Wall Drawing Tool
      if (activeTool === 'DRAW_WALL') {
        if (!wallStart) {
          setWallStart({ x: drawX, y: drawY });
          setWallCurrent({ x: drawX, y: drawY });
        } else {
          // Angle snap (horizontal or vertical)
          let endX = drawX;
          let endY = drawY;
          const dx = Math.abs(endX - wallStart.x);
          const dy = Math.abs(endY - wallStart.y);
          if (dx > dy * 2) endY = wallStart.y;
          else if (dy > dx * 2) endX = wallStart.x;

          const scaleFactor = activeProject?.settings?.scale_factor || 0.1;
          addWall({
            draw_start_x: wallStart.x,
            draw_start_y: wallStart.y,
            draw_end_x: endX,
            draw_end_y: endY,
            start_x: wallStart.x * scaleFactor,
            start_y: wallStart.y * scaleFactor,
            end_x: endX * scaleFactor,
            end_y: endY * scaleFactor,
            wall_type: 'interior',
            thickness: 0.38,
            height: 9.0
          });

          setWallStart(null);
          setWallCurrent(null);
        }
        return;
      }

      // 3. Place Equipment Tool
      if (activeTool === 'PLACE_EQUIPMENT' && pendingEquipmentTypeId) {
        const et = equipmentTypes.find(t => t.id === pendingEquipmentTypeId);
        if (et) {
          // Generate unique tag
          const count = equipment.filter(eq => eq.equipment_type_id === et.id).length + 1;
          const tag = `${et.id}-${count + 100}`;
          addEquipment({
            equipment_type_id: et.id,
            type_name: et.name,
            name: `${et.name} ${count}`,
            tag: tag,
            width: et.default_width,
            length: et.default_length,
            height: et.default_height,
            elevation: et.default_elevation,
            position_x: feetX,
            position_y: feetY,
            position_z: et.default_elevation,
          });
        }
        setPendingEquipmentTypeId(null);
        setActiveTool('SELECT');
        return;
      }

      // 4. Selection
      if (activeTool === 'SELECT') {
        const scaleFactor = activeProject?.settings?.scale_factor || 0.1;

        // Check equipment click
        for (const eq of equipment) {
          const ex = eq.position_x / scaleFactor;
          const ey = eq.position_y / scaleFactor;
          const ew = Math.max(eq.width / scaleFactor, 16 / zoom);
          const el = Math.max(eq.length / scaleFactor, 16 / zoom);

          if (Math.abs(drawX - ex) < ew / 2 && Math.abs(drawY - ey) < el / 2) {
            selectItem('equipment', eq.id);
            setDraggingEquipmentId(eq.id);
            return;
          }
        }

        // Check wall click (distance to segment)
        for (const w of walls) {
          const x1 = w.draw_start_x ?? (w.start_x / scaleFactor);
          const y1 = w.draw_start_y ?? (w.start_y / scaleFactor);
          const x2 = w.draw_end_x ?? (w.end_x / scaleFactor);
          const y2 = w.draw_end_y ?? (w.end_y / scaleFactor);

          const dist = distToSegment(drawX, drawY, x1, y1, x2, y2);
          if (dist < 8 / zoom) {
            selectItem('wall', w.id);
            return;
          }
        }

        // Check room click
        for (const r of rooms) {
          const rx = r.center_x / scaleFactor;
          const ry = r.center_y / scaleFactor;
          if (Math.hypot(drawX - rx, drawY - ry) < 28 / zoom) {
            selectItem('room', r.id);
            return;
          }
        }

        // Click on empty space -> start canvas pan or deselect
        selectItem(null, null);
        setIsPanning(true);
        setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const { drawX, drawY, feetX, feetY } = screenToWorld(clientX, clientY);
    setCursorCoords({ x: feetX, y: feetY });

    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
      return;
    }

    if (draggingEquipmentId) {
      updateEquipment(draggingEquipmentId, {
        position_x: feetX,
        position_y: feetY
      });
      return;
    }

    if (activeTool === 'DRAW_WALL' && wallStart) {
      setWallCurrent({ x: drawX, y: drawY });
    }

    if (activeTool === 'CALIBRATE_SCALE' && scaleStart) {
      setScaleCurrent({ x: drawX, y: drawY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingEquipmentId(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.2), 8.0);

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom centered on cursor
    setPan({
      x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
      y: mouseY - (mouseY - pan.y) * (newZoom / zoom)
    });
    setZoom(newZoom);
  };

  // Distance from point to line segment
  function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  const handleDetectGeometry = async () => {
    if (!activeProject) return;
    setIsProcessing(true);
    try {
      const res = await api.processFloorplan(activeProject.id);
      setDetectedGeometryData(res);
      setModalOpen(m => ({ ...m, geometryConfirm: true }));
    } catch (e) {
      console.error('Failed to detect geometry', e);
      alert('Floorplan processing error. Ensure a valid PDF floorplan is uploaded.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="floorplan-workspace-container">
      {/* 2D Canvas Toolbar */}
      <div className="canvas-toolbar">
        <div className="toolbar-group">
          <button
            className={`toolbar-btn ${activeTool === 'SELECT' ? 'active' : ''}`}
            onClick={() => { setActiveTool('SELECT'); setPendingEquipmentTypeId(null); }}
            title="Select & Move Objects"
          >
            <MousePointer size={16} />
            <span>Select</span>
          </button>

          <button
            className={`toolbar-btn ${activeTool === 'DRAW_WALL' ? 'active' : ''}`}
            onClick={() => { setActiveTool('DRAW_WALL'); setPendingEquipmentTypeId(null); }}
            title="Click two points to draw a wall"
          >
            <Edit3 size={16} />
            <span>Draw Wall</span>
          </button>

          <button
            className={`toolbar-btn ${activeTool === 'CALIBRATE_SCALE' ? 'active' : ''}`}
            onClick={() => { 
              setActiveTool('CALIBRATE_SCALE'); 
              setScaleStart(null);
              setPendingEquipmentTypeId(null); 
            }}
            title="Click two points on the floorplan to set real-world dimension"
          >
            <Ruler size={16} />
            <span>Calibrate Scale</span>
          </button>
        </div>

        <div className="toolbar-group">
          {activeDrawing && (
            <button
              className="toolbar-btn btn-ai"
              onClick={handleDetectGeometry}
              disabled={isProcessing}
              title="Automatically detect walls, doors, windows, and room labels from PDF"
            >
              {isProcessing ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
              <span>{isProcessing ? 'Detecting...' : 'Detect Walls & Rooms'}</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.[0]) handleUploadFile(e.target.files[0]);
            }}
          />

          <button
            className="toolbar-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Upload Floorplan PDF"
          >
            <Upload size={15} />
            <span>Upload PDF</span>
          </button>
        </div>

        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={() => setZoom(z => Math.min(z * 1.25, 8))} title="Zoom In">
            <ZoomIn size={15} />
          </button>
          <span className="zoom-text">{(zoom * 100).toFixed(0)}%</span>
          <button className="toolbar-btn" onClick={() => setZoom(z => Math.max(z * 0.8, 0.2))} title="Zoom Out">
            <ZoomOut size={15} />
          </button>
          <button 
            className="toolbar-btn" 
            onClick={() => { setZoom(1.0); setPan({ x: 50, y: 50 }); }} 
            title="Reset View"
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>

      {/* Main Interactive HTML5 Canvas with Drag & Drop */}
      <div 
        className={`canvas-drop-wrapper ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files?.[0]) handleUploadFile(e.dataTransfer.files[0]);
        }}
      >
        <canvas
          ref={canvasRef}
          className="floorplan-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* Empty State: Blank Architectural Modelspace */}
        {!activeDrawing && walls.length === 0 && (
          <div className="blank-modelspace-card">
            <div className="blank-icon-bubble">
              <FileText size={32} className="text-blue-400" />
            </div>
            <h2 className="text-base font-bold text-slate-100">Blank Architectural Modelspace</h2>
            <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
              Upload an architectural floorplan PDF to calibrate real-world scale, detect walls and rooms, and extrude into a 3D building with HVAC equipment.
            </p>

            <div className="blank-card-actions">
              <button
                className="btn-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                <Upload size={16} className="mr-2" />
                {isProcessing ? 'Processing PDF...' : 'Upload Floorplan PDF'}
              </button>

              <button
                className="btn-secondary"
                onClick={handleLoadSampleFloorplan}
                disabled={isProcessing}
                title="Loads a vector architectural test drawing"
              >
                <Sparkles size={15} className="mr-1.5 text-amber-400" />
                Load Test Vector PDF
              </button>

              <button
                className="btn-secondary"
                onClick={() => setActiveTool('DRAW_WALL')}
              >
                <Edit3 size={15} className="mr-1.5 text-emerald-400" />
                Draw Walls Manually
              </button>
            </div>

            <div className="text-xs text-slate-500 mt-2">
              (or drag & drop any floorplan PDF file directly onto this grid)
            </div>
          </div>
        )}

        {/* Drag Overlay Feedback */}
        {isDragOver && (
          <div className="drag-active-overlay">
            <Upload size={48} className="text-blue-400 animate-bounce mb-2" />
            <div className="text-base font-bold text-slate-100">Drop Floorplan PDF Here</div>
            <div className="text-xs text-slate-300">Will automatically import and process drawing geometry</div>
          </div>
        )}
      </div>

      {/* Floorplan loaded scale notification */}
      {activeDrawing && !activeProject?.settings?.scale_calibrated && (
        <div className="scale-reminder-banner">
          <Ruler size={15} className="text-amber-400 mr-2 shrink-0" />
          <span className="text-xs text-slate-200">
            Floorplan loaded. Establish real-world scale before placing equipment:
          </span>
          <button
            className="btn-link-action ml-2"
            onClick={() => {
              setActiveTool('CALIBRATE_SCALE');
              setScaleStart(null);
            }}
          >
            Calibrate Scale Now
          </button>
        </div>
      )}

      {/* Floating Instructions Banner when tool is active */}
      {activeTool === 'CALIBRATE_SCALE' && (
        <div className="tool-instruction-banner">
          <Ruler size={16} className="text-amber-400 mr-2" />
          <span>Click two points on the floorplan (e.g. across a known dimension or grid line) to establish drawing scale.</span>
        </div>
      )}

      {activeTool === 'DRAW_WALL' && (
        <div className="tool-instruction-banner">
          <Edit3 size={16} className="text-green-400 mr-2" />
          <span>Click start point, then click end point to place a wall segment.</span>
        </div>
      )}

      {activeTool === 'PLACE_EQUIPMENT' && (
        <div className="tool-instruction-banner">
          <Sparkles size={16} className="text-blue-400 mr-2" />
          <span>Click anywhere on the floorplan to place {pendingEquipmentTypeId}.</span>
        </div>
      )}
    </div>
  );
};
