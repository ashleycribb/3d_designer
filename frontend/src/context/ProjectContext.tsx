import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Project, VerticalConfig, Drawing } from '../types/project';
import { Wall, Room, Door, Window } from '../types/geometry';
import { Equipment, EquipmentType, HVACSystem, ControlAssociation } from '../types/hvac';
import { ViewMode, VisibilityMode, CameraPreset, ActiveTool } from '../types/view';
import { api } from '../api/client';
import { parseImperialToFeet } from '../utils/imperial';

interface HistoryState {
  walls: Wall[];
  equipment: Equipment[];
}

interface ProjectContextType {
  // Projects
  projectsList: Project[];
  activeProject: Project | null;
  loadProjects: () => Promise<void>;
  selectProject: (id: string) => Promise<void>;
  saveProject: () => Promise<void>;
  createProject: (data: Partial<Project>) => Promise<Project>;
  createBlankProject: () => Promise<Project>;
  uploadFloorplanFile: (file: File) => Promise<void>;
  loadDemoProject: () => Promise<void>;

  // Building geometry & equipment
  walls: Wall[];
  rooms: Room[];
  doors: Door[];
  windows: Window[];
  equipment: Equipment[];
  equipmentTypes: EquipmentType[];
  hvacSystems: HVACSystem[];
  controls: ControlAssociation[];
  verticalConfig: VerticalConfig | null;
  activeDrawing: Drawing | null;

  // Selected item
  selectedType: 'wall' | 'equipment' | 'room' | null;
  selectedId: string | null;
  selectedWall: Wall | null;
  selectedEquipment: Equipment | null;
  selectedRoom: Room | null;
  selectItem: (type: 'wall' | 'equipment' | 'room' | null, id: string | null) => void;

  // Mutators
  addWall: (wall: Partial<Wall>) => Promise<void>;
  updateWall: (id: string, updates: Partial<Wall>) => Promise<void>;
  deleteWall: (id: string) => Promise<void>;
  batchSetWalls: (newWalls: Partial<Wall>[], replace?: boolean) => Promise<void>;

  addEquipment: (eq: Partial<Equipment>) => Promise<void>;
  updateEquipment: (id: string, updates: Partial<Equipment>) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;

  updateVerticalConfig: (updates: Partial<VerticalConfig>) => Promise<void>;
  refreshProjectData: () => Promise<void>;

  // View and tool state
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  visibilityMode: VisibilityMode;
  setVisibilityMode: (mode: VisibilityMode) => void;
  cameraPreset: CameraPreset;
  setCameraPreset: (preset: CameraPreset) => void;
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  pendingEquipmentTypeId: string | null;
  setPendingEquipmentTypeId: (id: string | null) => void;

  // Coordinates & measurement
  cursorCoords: { x: number; y: number } | null;
  setCursorCoords: (coords: { x: number; y: number } | null) => void;
  measuredDistance: number | null;
  setMeasuredDistance: (dist: number | null) => void;
  precisionInput: string;
  setPrecisionInput: (val: string) => void;
  activeModifierHint: string | null;
  setActiveModifierHint: (hint: string | null) => void;
  commitPrecisionInput: (val: string) => void;

  // Panel Drawers
  leftPanelOpen: boolean;
  setLeftPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  rightPanelOpen: boolean;
  setRightPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleFullCanvas: () => void;

  // 3D Plenum Section Clipping
  isClippingActive: boolean;
  setIsClippingActive: React.Dispatch<React.SetStateAction<boolean>>;
  clippingHeight: number;
  setClippingHeight: (h: number) => void;

  // Equipment Alignment Actions
  alignEquipment: (op: 'align-center-x' | 'align-center-y' | 'distribute-x' | 'distribute-y') => void;

  // Modals
  modalOpen: {
    newProject: boolean;
    scaleCalibration: boolean;
    verticalConfig: boolean;
    crossSection: boolean;
    geometryConfirm: boolean;
    import3D: boolean;
  };
  setModalOpen: React.Dispatch<React.SetStateAction<{
    newProject: boolean;
    scaleCalibration: boolean;
    verticalConfig: boolean;
    crossSection: boolean;
    geometryConfirm: boolean;
    import3D: boolean;
  }>>;
  detectedGeometryData: any | null;
  setDetectedGeometryData: (data: any) => void;
  import3DModel: (formData: FormData) => Promise<EquipmentType | null>;

  // Undo / Redo
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const [walls, setWalls] = useState<Wall[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [doors, setDoors] = useState<Door[]>([]);
  const [windows, setWindows] = useState<Window[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [hvacSystems, setHvacSystems] = useState<HVACSystem[]>([]);
  const [controls, setControls] = useState<ControlAssociation[]>([]);
  const [verticalConfig, setVerticalConfig] = useState<VerticalConfig | null>(null);
  const [activeDrawing, setActiveDrawing] = useState<Drawing | null>(null);

  // Selection
  const [selectedType, setSelectedType] = useState<'wall' | 'equipment' | 'room' | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('VIEW_3D');
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>('NORMAL');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('PERSPECTIVE');
  const [activeTool, setActiveTool] = useState<ActiveTool>('SELECT');
  const [pendingEquipmentTypeId, setPendingEquipmentTypeId] = useState<string | null>(null);

  // Coordinates
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number } | null>(null);
  const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);
  const [precisionInput, setPrecisionInput] = useState<string>('');
  const [activeModifierHint, setActiveModifierHint] = useState<string | null>(null);

  // Panel Drawers
  const [leftPanelOpen, setLeftPanelOpen] = useState<boolean>(true);
  const [rightPanelOpen, setRightPanelOpen] = useState<boolean>(true);

  // 3D Plenum Section Clipping (inspired by web-ifc-viewer & bim-viewer)
  const [isClippingActive, setIsClippingActive] = useState<boolean>(false);
  const [clippingHeight, setClippingHeight] = useState<number>(10.5);

  // Equipment Alignment & Distribution (inspired by openPlan3D alignment.ts)
  const alignEquipment = useCallback((op: 'align-center-x' | 'align-center-y' | 'distribute-x' | 'distribute-y') => {
    if (equipment.length < 2) return;

    let targets = equipment;
    if (selectedType === 'equipment' && selectedId) {
      const selected = equipment.find(e => e.id === selectedId);
      if (selected && selected.room_id) {
        targets = equipment.filter(e => e.room_id === selected.room_id);
      }
    }
    if (targets.length < 2) return;

    const updated = [...equipment];

    switch (op) {
      case 'align-center-x': {
        const avgX = targets.reduce((sum, e) => sum + e.position_x, 0) / targets.length;
        targets.forEach(t => {
          const idx = updated.findIndex(e => e.id === t.id);
          if (idx !== -1) updated[idx] = { ...updated[idx], position_x: avgX };
        });
        break;
      }
      case 'align-center-y': {
        const avgY = targets.reduce((sum, e) => sum + e.position_y, 0) / targets.length;
        targets.forEach(t => {
          const idx = updated.findIndex(e => e.id === t.id);
          if (idx !== -1) updated[idx] = { ...updated[idx], position_y: avgY };
        });
        break;
      }
      case 'distribute-x': {
        if (targets.length < 3) break;
        const sorted = [...targets].sort((a, b) => a.position_x - b.position_x);
        const minX = sorted[0].position_x;
        const maxX = sorted[sorted.length - 1].position_x;
        const step = (maxX - minX) / (sorted.length - 1);
        sorted.forEach((t, i) => {
          const idx = updated.findIndex(e => e.id === t.id);
          if (idx !== -1) updated[idx] = { ...updated[idx], position_x: minX + i * step };
        });
        break;
      }
      case 'distribute-y': {
        if (targets.length < 3) break;
        const sorted = [...targets].sort((a, b) => a.position_y - b.position_y);
        const minY = sorted[0].position_y;
        const maxY = sorted[sorted.length - 1].position_y;
        const step = (maxY - minY) / (sorted.length - 1);
        sorted.forEach((t, i) => {
          const idx = updated.findIndex(e => e.id === t.id);
          if (idx !== -1) updated[idx] = { ...updated[idx], position_y: minY + i * step };
        });
        break;
      }
    }

    setEquipment(updated);
  }, [equipment, selectedType, selectedId]);

  const toggleFullCanvas = useCallback(() => {
    if (leftPanelOpen || rightPanelOpen) {
      setLeftPanelOpen(false);
      setRightPanelOpen(false);
    } else {
      setLeftPanelOpen(true);
      setRightPanelOpen(true);
    }
  }, [leftPanelOpen, rightPanelOpen]);

  // Precision Input (SketchUp VCB Commit)
  const commitPrecisionInput = useCallback((val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;

    // 1. If a wall is selected, adjust wall length along its angle
    if (selectedType === 'wall' && selectedId) {
      const wall = walls.find(w => w.id === selectedId);
      if (wall) {
        const parsed = parseImperialToFeet(trimmed);
        if (parsed !== null && parsed > 0.1) {
          const dx = wall.end_x - wall.start_x;
          const dy = wall.end_y - wall.start_y;
          const currentLen = Math.hypot(dx, dy);
          if (currentLen > 0.001) {
            const angle = Math.atan2(dy, dx);
            const newEndX = wall.start_x + Math.cos(angle) * parsed;
            const newEndY = wall.start_y + Math.sin(angle) * parsed;
            updateWall(wall.id, { end_x: newEndX, end_y: newEndY });
          }
        }
      }
    } else if (selectedType === 'equipment' && selectedId) {
      // 2. If equipment is selected, check if user typed CFM or dimension
      const eq = equipment.find(e => e.id === selectedId);
      if (eq) {
        const num = parseFloat(trimmed);
        if (!isNaN(num) && num > 0) {
          updateEquipment(eq.id, { airflow_max: num, airflow_min: num * 0.25 });
        }
      }
    }

    // 3. Broadcast event for active tools (e.g. wall drawing, scale line)
    window.dispatchEvent(new CustomEvent('cad-precision-input', { detail: { value: trimmed } }));
  }, [selectedType, selectedId, walls, equipment]);

  // Undo / Redo stacks
  const [undoStack, setUndoStack] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);

  // Modals
  const [modalOpen, setModalOpen] = useState({
    newProject: false,
    scaleCalibration: false,
    verticalConfig: false,
    crossSection: false,
    geometryConfirm: false,
    import3D: false,
  });
  const [detectedGeometryData, setDetectedGeometryData] = useState<any | null>(null);

  const pushHistory = useCallback((currentWalls: Wall[], currentEquipment: Equipment[]) => {
    setUndoStack(prev => [...prev.slice(-25), { walls: [...currentWalls], equipment: [...currentEquipment] }]);
    setRedoStack([]);
  }, []);

  const undo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, { walls: [...walls], equipment: [...equipment] }]);
    setUndoStack(u => u.slice(0, -1));
    setWalls(prev.walls);
    setEquipment(prev.equipment);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, { walls: [...walls], equipment: [...equipment] }]);
    setRedoStack(r => r.slice(0, -1));
    setWalls(next.walls);
    setEquipment(next.equipment);
  };

  // Keyboard shortcut for Undo / Redo and Fullscreen Canvas (\)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input / textarea / select
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';

      if (!isInput && e.key === '\\') {
        e.preventDefault();
        toggleFullCanvas();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack, walls, equipment, toggleFullCanvas]);

  const loadProjects = async () => {
    try {
      const list = await api.getProjects();
      setProjectsList(list);
      if (list.length > 0 && !activeProject) {
        await selectProject(list[0].id);
      }
    } catch (e) {
      console.error('Error loading projects', e);
    }
  };

  const selectProject = async (id: string) => {
    try {
      const proj = await api.getProject(id);
      setActiveProject(proj);
      setWalls(proj.walls || []);
      setRooms(proj.rooms || []);
      setDoors(proj.doors || []);
      setWindows(proj.windows || []);
      setVerticalConfig(proj.vertical_config || null);

      if (proj.drawings && proj.drawings.length > 0) {
        setActiveDrawing(proj.drawings[0]);
      } else {
        setActiveDrawing(null);
      }

      // Load equipment, systems, controls, types
      const [eq, eqTypes, sys, ctrl] = await Promise.all([
        api.getEquipment(id),
        api.getEquipmentTypes(),
        api.getSystems(id),
        api.getControls(id)
      ]);
      setEquipment(eq);
      setEquipmentTypes(eqTypes);
      setHvacSystems(sys);
      setControls(ctrl);

      setSelectedId(null);
      setSelectedType(null);
      setUndoStack([]);
      setRedoStack([]);
    } catch (e) {
      console.error('Failed to load project details', e);
    }
  };

  const refreshProjectData = async () => {
    if (activeProject) {
      await selectProject(activeProject.id);
    }
  };

  const createProject = async (data: Partial<Project>): Promise<Project> => {
    const proj = await api.createProject(data);
    await loadProjects();
    await selectProject(proj.id);
    return proj;
  };

  const createBlankProject = async (): Promise<Project> => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const proj = await api.createProject({
      name: `Blank Engineering Facility (${timeStr})`,
      building_name: "Engineering Building",
      campus: "Main Campus",
      floor_name: "Floor 1",
      description: "Blank modelspace ready for floorplan PDF upload and wall reconstruction."
    });
    await loadProjects();
    await selectProject(proj.id);
    setViewMode('FLOORPLAN_2D');
    return proj;
  };

  const uploadFloorplanFile = async (file: File) => {
    let projId = activeProject?.id;
    if (!projId) {
      const p = await createBlankProject();
      projId = p.id;
    }
    const drawing = await api.uploadDrawing(projId, file, 'floorplan');
    setActiveDrawing(drawing);
    await selectProject(projId);
    setViewMode('FLOORPLAN_2D');
  };

  const saveProject = async () => {
    if (!activeProject) return;
    try {
      await api.updateProject(activeProject.id, {
        name: activeProject.name,
        building_name: activeProject.building_name,
        description: activeProject.description
      });
      alert('Project saved successfully.');
    } catch (e) {
      console.error('Failed to save project', e);
    }
  };

  const loadDemoProject = async () => {
    try {
      const demo = await api.seedDemo();
      await loadProjects();
      await selectProject(demo.id);
    } catch (e) {
      console.error('Failed to load demo project', e);
    }
  };

  // Wall operations
  const addWall = async (wallData: Partial<Wall>) => {
    if (!activeProject) return;
    pushHistory(walls, equipment);
    const created = await api.createWall(activeProject.id, wallData);
    setWalls(prev => [...prev, created]);
  };

  const updateWall = async (id: string, updates: Partial<Wall>) => {
    pushHistory(walls, equipment);
    const updated = await api.updateWall(id, updates);
    setWalls(prev => prev.map(w => w.id === id ? updated : w));
  };

  const deleteWall = async (id: string) => {
    pushHistory(walls, equipment);
    await api.deleteWall(id);
    setWalls(prev => prev.filter(w => w.id !== id));
    if (selectedType === 'wall' && selectedId === id) {
      setSelectedType(null);
      setSelectedId(null);
    }
  };

  const batchSetWalls = async (newWalls: Partial<Wall>[], replace: boolean = false) => {
    if (!activeProject) return;
    pushHistory(walls, equipment);
    const saved = await api.batchCreateWalls(activeProject.id, newWalls, replace);
    if (replace) {
      setWalls(saved);
    } else {
      setWalls(prev => [...prev, ...saved]);
    }
  };

  // Equipment operations
  const addEquipment = async (eqData: Partial<Equipment>) => {
    if (!activeProject) return;
    pushHistory(walls, equipment);
    const created = await api.placeEquipment(activeProject.id, eqData);
    setEquipment(prev => [...prev, created]);
    setSelectedType('equipment');
    setSelectedId(created.id);
  };

  const updateEquipment = async (id: string, updates: Partial<Equipment>) => {
    pushHistory(walls, equipment);
    const updated = await api.updateEquipment(id, updates);
    setEquipment(prev => prev.map(e => e.id === id ? updated : e));
  };

  const deleteEquipment = async (id: string) => {
    pushHistory(walls, equipment);
    await api.deleteEquipment(id);
    setEquipment(prev => prev.filter(e => e.id !== id));
    if (selectedType === 'equipment' && selectedId === id) {
      setSelectedType(null);
      setSelectedId(null);
    }
  };

  const updateVerticalConfig = async (updates: Partial<VerticalConfig>) => {
    if (!activeProject) return;
    const updated = await api.updateVerticalConfig(activeProject.id, updates);
    setVerticalConfig(updated);
  };

  const selectItem = (type: 'wall' | 'equipment' | 'room' | null, id: string | null) => {
    setSelectedType(type);
    setSelectedId(id);
  };

  const selectedWall = selectedType === 'wall' ? walls.find(w => w.id === selectedId) || null : null;
  const selectedEquipment = selectedType === 'equipment' ? equipment.find(e => e.id === selectedId) || null : null;
  const selectedRoom = selectedType === 'room' ? rooms.find(r => r.id === selectedId) || null : null;

  const import3DModel = async (formData: FormData): Promise<EquipmentType | null> => {
    if (!activeProject) return null;
    const created = await api.import3DEquipmentType(activeProject.id, formData);
    setEquipmentTypes(prev => [...prev, created]);
    setPendingEquipmentTypeId(created.id);
    setActiveTool('PLACE_EQUIPMENT');
    return created;
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <ProjectContext.Provider value={{
      projectsList,
      activeProject,
      loadProjects,
      selectProject,
      saveProject,
      createProject,
      createBlankProject,
      uploadFloorplanFile,
      loadDemoProject,
      walls,
      rooms,
      doors,
      windows,
      equipment,
      equipmentTypes,
      hvacSystems,
      controls,
      verticalConfig,
      activeDrawing,
      selectedType,
      selectedId,
      selectedWall,
      selectedEquipment,
      selectedRoom,
      selectItem,
      addWall,
      updateWall,
      deleteWall,
      batchSetWalls,
      addEquipment,
      updateEquipment,
      deleteEquipment,
      updateVerticalConfig,
      refreshProjectData,
      viewMode,
      setViewMode,
      visibilityMode,
      setVisibilityMode,
      cameraPreset,
      setCameraPreset,
      activeTool,
      setActiveTool,
      pendingEquipmentTypeId,
      setPendingEquipmentTypeId,
      cursorCoords,
      setCursorCoords,
      measuredDistance,
      setMeasuredDistance,
      precisionInput,
      setPrecisionInput,
      activeModifierHint,
      setActiveModifierHint,
      commitPrecisionInput,
      leftPanelOpen,
      setLeftPanelOpen,
      rightPanelOpen,
      setRightPanelOpen,
      toggleFullCanvas,
      isClippingActive,
      setIsClippingActive,
      clippingHeight,
      setClippingHeight,
      alignEquipment,
      import3DModel,
      modalOpen,
      setModalOpen,
      detectedGeometryData,
      setDetectedGeometryData,
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
      undo,
      redo,
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within a ProjectProvider');
  return context;
};
