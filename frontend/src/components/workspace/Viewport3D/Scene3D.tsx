import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Scissors, X, Layers, Sliders } from 'lucide-react';
import { useProject } from '../../../context/ProjectContext';
import { formatFeetToImperial } from '../../../utils/imperial';

export const Scene3D: React.FC = () => {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const {
    walls,
    rooms,
    equipment,
    equipmentTypes,
    verticalConfig,
    visibilityMode,
    cameraPreset,
    setCameraPreset,
    selectedType,
    selectedId,
    selectItem,
    activeTool,
    setActiveTool,
    updateEquipment,
    setMeasuredDistance,
    setViewMode,
    isClippingActive,
    setIsClippingActive,
    clippingHeight,
    setClippingHeight
  } = useProject();

  const ceilingHeight = verticalConfig?.ceiling_height || 9.0;
  const plenumHeight = verticalConfig?.plenum_height || 3.0;
  const deckHeight = ceilingHeight + plenumHeight;

  // Internal Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | THREE.OrthographicCamera | null>(null);
  const animFrameId = useRef<number | null>(null);

  // 3D Vendor GLTF Model Loader & Cache
  const gltfLoaderRef = useRef<GLTFLoader | null>(null);
  const gltfCacheRef = useRef<Map<string, THREE.Group>>(new Map());
  const loadingModelsRef = useRef<Set<string>>(new Set());
  const [modelLoadCounter, setModelLoadCounter] = useState(0);

  if (!gltfLoaderRef.current) {
    gltfLoaderRef.current = new GLTFLoader();
  }

  // Interaction refs
  const isDraggingRef = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const cameraTarget = useRef(new THREE.Vector3(30, 0, 20)); // Center of typical 60x40 building

  // Measurement tool points
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([]);

  // Map to store mesh associations with equipment/wall IDs
  const objectMapRef = useRef<Map<THREE.Object3D, { type: 'wall' | 'equipment' | 'room', id: string }>>(new Map());

  // Initialize Three.js Scene
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : (window.innerWidth - 650);
    const height = rect.height > 0 ? rect.height : (window.innerHeight - 90);

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1120'); // Dark slate drafting background
    sceneRef.current = scene;

    // 2. Camera (default Perspective)
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1000);
    camera.position.set(30, 50, 75);
    camera.lookAt(cameraTarget.current);
    cameraRef.current = camera;

    // 3. Renderer with local clipping enabled (inspired by web-ifc-viewer & bim-viewer)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(60, 100, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 250;
    dirLight.shadow.camera.left = -60;
    dirLight.shadow.camera.right = 60;
    dirLight.shadow.camera.top = 60;
    dirLight.shadow.camera.bottom = -60;
    scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0x94a3b8, 0x1e293b, 0.4);
    scene.add(hemiLight);

    // 5. Spline-style Ground Grid & Axes Lines
    const gridHelper = new THREE.GridHelper(200, 100, 0x52525b, 0x27272a);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Colored Infinite Axis Lines (Red = X, Blue = Z) like Spline
    const axisMatX = new THREE.LineBasicMaterial({ color: 0xef4444, opacity: 0.6, transparent: true });
    const axisGeoX = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-150, 0.01, 0),
      new THREE.Vector3(150, 0.01, 0)
    ]);
    scene.add(new THREE.Line(axisGeoX, axisMatX));

    const axisMatZ = new THREE.LineBasicMaterial({ color: 0x3b82f6, opacity: 0.6, transparent: true });
    const axisGeoZ = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.01, -150),
      new THREE.Vector3(0, 0.01, 150)
    ]);
    scene.add(new THREE.Line(axisGeoZ, axisMatZ));

    // 6. Resize Observer
    const handleResize = () => {
      const el = canvasContainerRef.current;
      if (!el || !rendererRef.current || !cameraRef.current) return;
      const r = el.getBoundingClientRect();
      const w = r.width;
      const h = r.height;
      if (w <= 0 || h <= 0) return;
      if (cameraRef.current instanceof THREE.PerspectiveCamera) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
      }
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // Initial sizing passes to capture full flex layout settling
    handleResize();
    const rafId = requestAnimationFrame(handleResize);
    const t1 = setTimeout(handleResize, 50);
    const t2 = setTimeout(handleResize, 200);

    // Render loop
    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      renderer.dispose();
    };
  }, []);

  // Update Camera Presets
  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;

    const target = cameraTarget.current;
    if (cameraPreset === 'TOP') {
      camera.position.set(target.x, 90, target.z + 0.001);
      camera.lookAt(target);
    } else if (cameraPreset === 'FRONT') {
      camera.position.set(target.x, 15, target.z + 80);
      camera.lookAt(target.x, 6, target.z);
    } else if (cameraPreset === 'SIDE') {
      camera.position.set(target.x + 80, 15, target.z);
      camera.lookAt(target.x, 6, target.z);
    } else {
      // Perspective default
      camera.position.set(target.x + 25, 45, target.z + 55);
      camera.lookAt(target);
    }
  }, [cameraPreset]);

  // Build / Rebuild Parametric 3D Model Geometry
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear dynamic building group
    const existingGroup = scene.getObjectByName('BUILDING_MODEL_GROUP');
    if (existingGroup) {
      scene.remove(existingGroup);
    }

    objectMapRef.current.clear();

    const buildingGroup = new THREE.Group();
    buildingGroup.name = 'BUILDING_MODEL_GROUP';

    const ceilingHeight = verticalConfig?.ceiling_height || 9.0;
    const plenumHeight = verticalConfig?.plenum_height || 3.0;
    const deckHeight = ceilingHeight + plenumHeight;
    const floorThickness = verticalConfig?.floor_thickness || 0.5;

    const isCeilingVisible = visibilityMode === 'NORMAL' || visibilityMode === 'PLENUM';
    const isArchitectureVisible = visibilityMode !== 'HVAC_ONLY';
    const isXRay = visibilityMode === 'XRAY';
    const isPlenumFocus = visibilityMode === 'PLENUM';

    // Horizontal section clipping plane (derived from web-ifc-viewer & bim-viewer)
    const clipPlanes: THREE.Plane[] = [];
    if (isClippingActive) {
      const sectionPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), clippingHeight);
      clipPlanes.push(sectionPlane);
    }

    // 1. Floor Slab
    if (isArchitectureVisible) {
      // Compute building bounding box from walls
      let minX = 0, maxX = 60, minY = 0, maxY = 40;
      if (walls.length > 0) {
        minX = Math.min(...walls.map(w => Math.min(w.start_x, w.end_x))) - 4;
        maxX = Math.max(...walls.map(w => Math.max(w.start_x, w.end_x))) + 4;
        minY = Math.min(...walls.map(w => Math.min(w.start_y, w.end_y))) - 4;
        maxY = Math.max(...walls.map(w => Math.max(w.start_y, w.end_y))) + 4;
      }
      const floorWidth = maxX - minX;
      const floorDepth = maxY - minY;
      const floorCenterX = (minX + maxX) / 2;
      const floorCenterZ = (minY + maxY) / 2;
      cameraTarget.current.set(floorCenterX, ceilingHeight / 2, floorCenterZ);

      const slabGeo = new THREE.BoxGeometry(floorWidth, floorThickness, floorDepth);
      const slabMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.8,
        metalness: 0.1,
        clippingPlanes: clipPlanes,
        clipShadows: true
      });
      const slabMesh = new THREE.Mesh(slabGeo, slabMat);
      slabMesh.position.set(floorCenterX, -floorThickness / 2, floorCenterZ);
      slabMesh.receiveShadow = true;
      buildingGroup.add(slabMesh);

      // Floor surface grid lines
      const floorEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(slabGeo),
        new THREE.LineBasicMaterial({ color: 0x475569 })
      );
      floorEdges.position.copy(slabMesh.position);
      buildingGroup.add(floorEdges);
    }

    // 2. Extruded Walls
    if (isArchitectureVisible) {
      walls.forEach(wall => {
        const dx = wall.end_x - wall.start_x;
        const dy = wall.end_y - wall.start_y;
        const length = Math.hypot(dx, dy);
        if (length < 0.1) return;

        const wallHeight = wall.height || (wall.wall_type === 'exterior' ? deckHeight : ceilingHeight);
        const wallThickness = wall.thickness || 0.5;

        const centerX = (wall.start_x + wall.end_x) / 2;
        const centerZ = (wall.start_y + wall.end_y) / 2;
        const angle = -Math.atan2(dy, dx);

        const isSelected = selectedType === 'wall' && selectedId === wall.id;

        const wallGeo = new THREE.BoxGeometry(length, wallHeight, wallThickness);
        
        let wallColor = wall.wall_type === 'exterior' ? 0x64748b : 0x94a3b8;
        let opacity = 1.0;
        let transparent = false;

        if (isXRay) {
          opacity = 0.25;
          transparent = true;
        } else if (isPlenumFocus || visibilityMode === 'AIR_BALANCE') {
          opacity = 0.4;
          transparent = true;
        }

        if (isSelected) {
          wallColor = 0x38bdf8;
          opacity = 0.85;
          transparent = true;
        }

        const wallMat = new THREE.MeshStandardMaterial({
          color: wallColor,
          roughness: 0.6,
          metalness: 0.1,
          opacity: opacity,
          transparent: transparent,
          clippingPlanes: clipPlanes,
          clipShadows: true
        });

        const wallMesh = new THREE.Mesh(wallGeo, wallMat);
        wallMesh.position.set(centerX, wallHeight / 2, centerZ);
        wallMesh.rotation.y = angle;
        wallMesh.castShadow = !transparent;
        wallMesh.receiveShadow = true;

        // Wall edge wireframe for architectural clarity
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(wallGeo),
          new THREE.LineBasicMaterial({ color: isSelected ? 0x0284c7 : (wall.wall_type === 'exterior' ? 0x334155 : 0x64748b) })
        );
        wallMesh.add(edges);

        buildingGroup.add(wallMesh);
        objectMapRef.current.set(wallMesh, { type: 'wall', id: wall.id });
      });
    }

    // 3. Drop Ceiling & Plenum Zone
    if (isArchitectureVisible && isCeilingVisible && walls.length > 0) {
      let minX = Math.min(...walls.map(w => Math.min(w.start_x, w.end_x)));
      let maxX = Math.max(...walls.map(w => Math.max(w.start_x, w.end_x)));
      let minY = Math.min(...walls.map(w => Math.min(w.start_y, w.end_y)));
      let maxY = Math.max(...walls.map(w => Math.max(w.start_y, w.end_y)));
      const ceilW = maxX - minX;
      const ceilD = maxY - minY;
      const ceilX = (minX + maxX) / 2;
      const ceilZ = (minY + maxY) / 2;

      // Drop Ceiling Grid Plane (Acoustical tile semi-transparent plane)
      const ceilGeo = new THREE.PlaneGeometry(ceilW, ceilD);
      const ceilMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.9,
        metalness: 0.0,
        opacity: isPlenumFocus ? 0.35 : 0.65,
        transparent: true,
        side: THREE.DoubleSide,
        clippingPlanes: clipPlanes,
        clipShadows: true
      });
      const ceilMesh = new THREE.Mesh(ceilGeo, ceilMat);
      ceilMesh.position.set(ceilX, ceilingHeight, ceilZ);
      ceilMesh.rotation.x = Math.PI / 2;
      buildingGroup.add(ceilMesh);

      // Ceiling tile grid overlay (2ft x 2ft or 2ft x 4ft tiles)
      if (!isClippingActive || clippingHeight >= ceilingHeight) {
        const ceilGrid = new THREE.GridHelper(Math.max(ceilW, ceilD), Math.round(Math.max(ceilW, ceilD) / 2), 0x94a3b8, 0xcfd8dc);
        ceilGrid.position.set(ceilX, ceilingHeight + 0.02, ceilZ);
        buildingGroup.add(ceilGrid);
      }

      // Deck Plane (Structural Roof / Floor Above)
      const deckGeo = new THREE.PlaneGeometry(ceilW, ceilD);
      const deckMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.8,
        metalness: 0.4,
        opacity: isPlenumFocus ? 0.4 : 0.2,
        transparent: true,
        side: THREE.DoubleSide,
        clippingPlanes: clipPlanes,
        clipShadows: true
      });
      const deckMesh = new THREE.Mesh(deckGeo, deckMat);
      deckMesh.position.set(ceilX, deckHeight, ceilZ);
      deckMesh.rotation.x = Math.PI / 2;
      buildingGroup.add(deckMesh);
    }

    // 4. Standardized MEP & Custom 3D Vendor Equipment Solids
    equipment.forEach(eq => {
      const isSelected = selectedType === 'equipment' && selectedId === eq.id;
      const eqGroup = new THREE.Group();
      eqGroup.position.set(eq.position_x, eq.elevation || eq.position_z || 9.5, eq.position_y);
      eqGroup.rotation.y = -(eq.rotation_z || 0);

      const w = eq.width || 2.0;
      const l = eq.length || 3.0;
      const h = eq.height || 1.5;

      const eqType = equipmentTypes.find(t => t.id === eq.equipment_type_id);
      const modelUrl = eq.model_url || eqType?.model_url;

      // Check if this equipment has an uploaded 3D GLB/GLTF model
      if (modelUrl) {
        const cachedModel = gltfCacheRef.current.get(modelUrl);
        if (cachedModel) {
          const modelClone = cachedModel.clone(true);
          const bbox = new THREE.Box3().setFromObject(modelClone);
          const size = new THREE.Vector3();
          bbox.getSize(size);

          const scaleX = size.x > 0.01 ? w / size.x : 1;
          const scaleY = size.y > 0.01 ? h / size.y : 1;
          const scaleZ = size.z > 0.01 ? l / size.z : 1;
          modelClone.scale.set(scaleX, scaleY, scaleZ);

          const center = new THREE.Vector3();
          bbox.getCenter(center);
          modelClone.position.set(-center.x * scaleX, -center.y * scaleY, -center.z * scaleZ);

          modelClone.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              objectMapRef.current.set(child, { type: 'equipment', id: eq.id });
            }
          });
          eqGroup.add(modelClone);
        } else {
          // Asynchronously load the 3D vendor model
          if (!loadingModelsRef.current.has(modelUrl)) {
            loadingModelsRef.current.add(modelUrl);
            if (gltfLoaderRef.current) {
              gltfLoaderRef.current.load(
                modelUrl,
                (gltf) => {
                  gltfCacheRef.current.set(modelUrl, gltf.scene);
                  setModelLoadCounter(c => c + 1);
                },
                undefined,
                (err) => {
                  console.error(`Error loading 3D model from ${modelUrl}:`, err);
                }
              );
            }
          }

          // Translucent bounding wireframe placeholder while loading
          const pGeo = new THREE.BoxGeometry(w, h, l);
          const pMat = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            wireframe: true,
            transparent: true,
            opacity: 0.45
          });
          const pMesh = new THREE.Mesh(pGeo, pMat);
          eqGroup.add(pMesh);
          objectMapRef.current.set(pMesh, { type: 'equipment', id: eq.id });
        }
      } else {
        // Multi-Discipline MEP Parametric Geometries
        let primaryColor = 0x3b82f6;
        if (eqType?.color_hex) {
          primaryColor = parseInt(eqType.color_hex.replace('#', '0x'), 16);
        } else {
          if (eq.equipment_type_id === 'AHU') primaryColor = 0x1d4ed8;
          if (eq.equipment_type_id === 'RTU') primaryColor = 0x2563eb;
          if (eq.equipment_type_id === 'DIFFUSER') primaryColor = 0x10b981;
          if (eq.equipment_type_id === 'RETURN_GRILLE') primaryColor = 0x84cc16;
          if (eq.equipment_type_id === 'THERMOSTAT') primaryColor = 0xf59e0b;
          if (eq.equipment_type_id === 'CONTROL_PANEL') primaryColor = 0xef4444;
          if (eq.equipment_type_id === 'CHW_PUMP') primaryColor = 0x0d9488;
          if (eq.equipment_type_id === 'TRANSFORMER') primaryColor = 0xf59e0b;
          if (eq.equipment_type_id === 'SWITCHBOARD') primaryColor = 0xd97706;
          if (eq.equipment_type_id === 'BOILER') primaryColor = 0x059669;
          if (eq.equipment_type_id === 'SPRINKLER_PENDANT') primaryColor = 0xe11d48;
        }

        if (isSelected) primaryColor = 0x38bdf8;

        if (eq.equipment_type_id === 'VAV') {
          // VAV Box: Rectangular casing + round inlet collar + actuator
          const bodyGeo = new THREE.BoxGeometry(w, h, l);
          const bodyMat = new THREE.MeshStandardMaterial({ color: primaryColor, metalness: 0.6, roughness: 0.3 });
          const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
          bodyMesh.castShadow = true;
          eqGroup.add(bodyMesh);

          const bodyEdges = new THREE.LineSegments(
            new THREE.EdgesGeometry(bodyGeo),
            new THREE.LineBasicMaterial({ color: isSelected ? 0x0284c7 : 0x0f172a })
          );
          bodyMesh.add(bodyEdges);

          const inletGeo = new THREE.CylinderGeometry(h * 0.35, h * 0.35, 0.8, 16);
          const collarMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
          const inletMesh = new THREE.Mesh(inletGeo, collarMat);
          inletMesh.rotation.x = Math.PI / 2;
          inletMesh.position.set(0, 0, -l / 2 - 0.4);
          eqGroup.add(inletMesh);

          const actGeo = new THREE.BoxGeometry(0.5, 0.6, 0.6);
          const actMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.4 });
          const actMesh = new THREE.Mesh(actGeo, actMat);
          actMesh.position.set(w / 2 + 0.25, 0, 0);
          eqGroup.add(actMesh);

          objectMapRef.current.set(bodyMesh, { type: 'equipment', id: eq.id });
        } else if (eq.equipment_type_id === 'DIFFUSER' || eq.equipment_type_id === 'RETURN_GRILLE') {
          // Ceiling diffuser faceplate (flush to ceiling)
          const plateGeo = new THREE.BoxGeometry(w, 0.15, l);
          const plateMat = new THREE.MeshStandardMaterial({ color: primaryColor, metalness: 0.2, roughness: 0.5 });
          const plateMesh = new THREE.Mesh(plateGeo, plateMat);
          const plateEdges = new THREE.LineSegments(
            new THREE.EdgesGeometry(plateGeo),
            new THREE.LineBasicMaterial({ color: isSelected ? 0x0284c7 : 0x064e3b })
          );
          plateMesh.add(plateEdges);
          eqGroup.add(plateMesh);

          const collarGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 16);
          const collarMesh = new THREE.Mesh(collarGeo, new THREE.MeshStandardMaterial({ color: 0x64748b }));
          collarMesh.position.y = 0.3;
          eqGroup.add(collarMesh);

          objectMapRef.current.set(plateMesh, { type: 'equipment', id: eq.id });
        } else if (eq.equipment_type_id === 'THERMOSTAT') {
          // Wall-mounted thermostat faceplate
          const tstatGeo = new THREE.BoxGeometry(w, h, 0.25);
          const tstatMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.3 });
          const tstatMesh = new THREE.Mesh(tstatGeo, tstatMat);
          eqGroup.add(tstatMesh);

          const screenGeo = new THREE.BoxGeometry(w * 0.7, h * 0.5, 0.05);
          const screenMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
          const screenMesh = new THREE.Mesh(screenGeo, screenMat);
          screenMesh.position.set(0, 0, 0.13);
          eqGroup.add(screenMesh);

          objectMapRef.current.set(tstatMesh, { type: 'equipment', id: eq.id });
        } else if (eq.equipment_type_id === 'CHW_PUMP') {
          // Chilled Water Centrifugal Pump: Skid base + volute casing + flanges + motor
          const skidGeo = new THREE.BoxGeometry(w, 0.2, l);
          const skidMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 });
          const skidMesh = new THREE.Mesh(skidGeo, skidMat);
          skidMesh.position.y = -h / 2 + 0.1;
          eqGroup.add(skidMesh);

          // Volute Casing (teal / green)
          const voluteGeo = new THREE.CylinderGeometry(h * 0.38, h * 0.38, w * 0.45, 24);
          const voluteMat = new THREE.MeshStandardMaterial({ color: primaryColor, metalness: 0.5, roughness: 0.3 });
          const voluteMesh = new THREE.Mesh(voluteGeo, voluteMat);
          voluteMesh.rotation.z = Math.PI / 2;
          voluteMesh.position.set(0, 0, -l * 0.2);
          eqGroup.add(voluteMesh);

          // Electric Motor Cylinder
          const motorGeo = new THREE.CylinderGeometry(h * 0.3, h * 0.3, l * 0.45, 20);
          const motorMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.4 });
          const motorMesh = new THREE.Mesh(motorGeo, motorMat);
          motorMesh.rotation.x = Math.PI / 2;
          motorMesh.position.set(0, 0, l * 0.22);
          eqGroup.add(motorMesh);

          // Top discharge flange
          const flangeGeo = new THREE.CylinderGeometry(h * 0.18, h * 0.22, 0.4, 16);
          const flangeMesh = new THREE.Mesh(flangeGeo, new THREE.MeshStandardMaterial({ color: 0x64748b }));
          flangeMesh.position.set(0, h * 0.38, -l * 0.2);
          eqGroup.add(flangeMesh);

          objectMapMapSet:
          objectMapRef.current.set(voluteMesh, { type: 'equipment', id: eq.id });
        } else if (eq.equipment_type_id === 'TRANSFORMER') {
          // Dry-Type Transformer: Main enclosure + radiator cooling fins + HV caution plate
          const bodyGeo = new THREE.BoxGeometry(w, h, l);
          const bodyMat = new THREE.MeshStandardMaterial({ color: primaryColor, metalness: 0.4, roughness: 0.4 });
          const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
          bodyMesh.castShadow = true;
          eqGroup.add(bodyMesh);

          // Radiator cooling ribs on sides
          for (let side = -1; side <= 1; side += 2) {
            for (let i = -1; i <= 1; i++) {
              const finGeo = new THREE.BoxGeometry(0.08, h * 0.8, l * 0.22);
              const finMesh = new THREE.Mesh(finGeo, new THREE.MeshStandardMaterial({ color: 0x78350f }));
              finMesh.position.set(side * (w / 2 + 0.05), 0, i * (l * 0.28));
              eqGroup.add(finMesh);
            }
          }

          // High Voltage Caution Plate
          const badgeGeo = new THREE.BoxGeometry(w * 0.4, h * 0.3, 0.04);
          const badgeMesh = new THREE.Mesh(badgeGeo, new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2 }));
          badgeMesh.position.set(0, h * 0.15, l / 2 + 0.03);
          eqGroup.add(badgeMesh);

          objectMapRef.current.set(bodyMesh, { type: 'equipment', id: eq.id });
        } else if (eq.equipment_type_id === 'SWITCHBOARD' || eq.equipment_type_id === 'PANELBOARD') {
          // Switchboard / Panelboard: Tall cabinet + breaker compartment grooves + digital LCD
          const bodyGeo = new THREE.BoxGeometry(w, h, l);
          const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.3 });
          const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
          bodyMesh.castShadow = true;
          eqGroup.add(bodyMesh);

          // Door edge CAD lines
          const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(bodyGeo),
            new THREE.LineBasicMaterial({ color: 0x94a3b8 })
          );
          bodyMesh.add(edges);

          // Digital meter / LCD
          const meterGeo = new THREE.BoxGeometry(w * 0.3, h * 0.12, 0.04);
          const meterMesh = new THREE.Mesh(meterGeo, new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
          meterMesh.position.set(0, h * 0.32, l / 2 + 0.03);
          eqGroup.add(meterMesh);

          // Breaker doors indicator
          const breakerGeo = new THREE.BoxGeometry(w * 0.8, h * 0.4, 0.02);
          const breakerMesh = new THREE.Mesh(breakerGeo, new THREE.MeshStandardMaterial({ color: 0x1e293b }));
          breakerMesh.position.set(0, -h * 0.1, l / 2 + 0.02);
          eqGroup.add(breakerMesh);

          objectMapRef.current.set(bodyMesh, { type: 'equipment', id: eq.id });
        } else if (eq.equipment_type_id === 'VFD') {
          // Variable Frequency Drive: Wall chassis + heat sink fins + operator display
          const bodyGeo = new THREE.BoxGeometry(w, h, l);
          const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.3 });
          const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
          eqGroup.add(bodyMesh);

          // Aluminum heatsink on back
          const sinkGeo = new THREE.BoxGeometry(w * 0.95, h * 0.9, 0.15);
          const sinkMesh = new THREE.Mesh(sinkGeo, new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 }));
          sinkMesh.position.set(0, 0, -l / 2 - 0.08);
          eqGroup.add(sinkMesh);

          // Front Keypad & Display
          const dispGeo = new THREE.BoxGeometry(w * 0.5, h * 0.25, 0.04);
          const dispMesh = new THREE.Mesh(dispGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
          dispMesh.position.set(0, h * 0.2, l / 2 + 0.03);
          eqGroup.add(dispMesh);

          objectMapRef.current.set(bodyMesh, { type: 'equipment', id: eq.id });
        } else if (eq.equipment_type_id === 'CABLE_TRAY') {
          // Open Ladder Cable Tray: Dual rails + cross rungs
          const railGeo = new THREE.BoxGeometry(w, h, 0.12);
          const railMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, metalness: 0.6 });
          const rail1 = new THREE.Mesh(railGeo, railMat);
          rail1.position.z = -l / 2 + 0.06;
          const rail2 = new THREE.Mesh(railGeo, railMat);
          rail2.position.z = l / 2 - 0.06;
          eqGroup.add(rail1);
          eqGroup.add(rail2);

          // Ladder cross rungs
          const rungCount = Math.max(3, Math.floor(w / 1.5));
          for (let i = 0; i < rungCount; i++) {
            const rx = -w / 2 + ((i + 0.5) / rungCount) * w;
            const rungGeo = new THREE.BoxGeometry(0.1, 0.06, l - 0.15);
            const rungMesh = new THREE.Mesh(rungGeo, railMat);
            rungMesh.position.set(rx, -h / 2 + 0.03, 0);
            eqGroup.add(rungMesh);
          }

          objectMapRef.current.set(rail1, { type: 'equipment', id: eq.id });
        } else if (eq.equipment_type_id === 'EXPANSION_TANK' || eq.equipment_type_id === 'WATER_HEATER') {
          // Vertical ASME Tank: Cylinder with dome top & support stand
          const tankGeo = new THREE.CylinderGeometry(w * 0.45, w * 0.45, h * 0.75, 24);
          const tankMat = new THREE.MeshStandardMaterial({ color: primaryColor, metalness: 0.5, roughness: 0.3 });
          const tankMesh = new THREE.Mesh(tankGeo, tankMat);
          tankMesh.position.y = 0.1;
          tankMesh.castShadow = true;
          eqGroup.add(tankMesh);

          // Top Dome
          const domeGeo = new THREE.SphereGeometry(w * 0.45, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
          const domeMesh = new THREE.Mesh(domeGeo, tankMat);
          domeMesh.position.y = 0.1 + (h * 0.75) / 2;
          eqGroup.add(domeMesh);

          // Stand base
          const standGeo = new THREE.CylinderGeometry(w * 0.38, w * 0.48, h * 0.25, 16);
          const standMesh = new THREE.Mesh(standGeo, new THREE.MeshStandardMaterial({ color: 0x334155 }));
          standMesh.position.y = -h / 2 + 0.15;
          eqGroup.add(standMesh);

          objectMapRef.current.set(tankMesh, { type: 'equipment', id: eq.id });
        } else if (eq.equipment_type_id === 'BOILER') {
          // Commercial Hydronic Boiler: Insulated body + burner box + top flue
          const bodyGeo = new THREE.BoxGeometry(w, h * 0.85, l);
          const bodyMat = new THREE.MeshStandardMaterial({ color: primaryColor, metalness: 0.4, roughness: 0.4 });
          const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
          bodyMesh.position.y = -h * 0.05;
          bodyMesh.castShadow = true;
          eqGroup.add(bodyMesh);

          // Front Burner Assembly
          const burnerGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.6, 16);
          const burnerMesh = new THREE.Mesh(burnerGeo, new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 }));
          burnerMesh.rotation.x = Math.PI / 2;
          burnerMesh.position.set(0, -h * 0.1, l / 2 + 0.3);
          eqGroup.add(burnerMesh);

          // Top Flue Collar
          const flueGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.6, 16);
          const flueMesh = new THREE.Mesh(flueGeo, new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
          flueMesh.position.set(0, h * 0.45, -l * 0.25);
          eqGroup.add(flueMesh);

          objectMapRef.current.set(bodyMesh, { type: 'equipment', id: eq.id });
        } else if (eq.equipment_type_id === 'SPRINKLER_PENDANT' || eq.equipment_type_id === 'SPRINKLER_UPRIGHT') {
          // Fire Sprinkler Head: Brass frame + red thermal bulb + deflector disc
          const isUpright = eq.equipment_type_id === 'SPRINKLER_UPRIGHT';
          const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.2 });

          // Nipple adapter
          const adaptGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 12);
          const adaptMesh = new THREE.Mesh(adaptGeo, brassMat);
          eqGroup.add(adaptMesh);

          // Red Glass Thermal Bulb
          const bulbGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8);
          const bulbMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
          const bulbMesh = new THREE.Mesh(bulbGeo, bulbMat);
          bulbMesh.position.y = isUpright ? 0.2 : -0.2;
          eqGroup.add(bulbMesh);

          // Deflector Disc
          const deflGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.03, 16);
          const deflMesh = new THREE.Mesh(deflGeo, brassMat);
          deflMesh.position.y = isUpright ? 0.32 : -0.32;
          eqGroup.add(deflMesh);

          objectMapRef.current.set(deflMesh, { type: 'equipment', id: eq.id });
        } else if (eq.equipment_type_id === 'FIRE_RISER') {
          // Fire Riser: Red vertical pipe manifold + valve handwheel
          const pipeGeo = new THREE.CylinderGeometry(w * 0.2, w * 0.2, h, 16);
          const pipeMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.5 });
          const pipeMesh = new THREE.Mesh(pipeGeo, pipeMat);
          pipeMesh.castShadow = true;
          eqGroup.add(pipeMesh);

          // Valve Handwheel
          const wheelGeo = new THREE.TorusGeometry(0.35, 0.06, 8, 16);
          const wheelMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });
          const wheelMesh = new THREE.Mesh(wheelGeo, wheelMat);
          wheelMesh.rotation.x = Math.PI / 2;
          wheelMesh.position.set(0, 0, w * 0.3);
          eqGroup.add(wheelMesh);

          objectMapRef.current.set(pipeMesh, { type: 'equipment', id: eq.id });
        } else {
          // Standard industrial casing (AHU, RTU, Fans, Dampers, Panels)
          const stdGeo = new THREE.BoxGeometry(w, h, l);
          const stdMat = new THREE.MeshStandardMaterial({
            color: primaryColor,
            metalness: 0.4,
            roughness: 0.4
          });
          const stdMesh = new THREE.Mesh(stdGeo, stdMat);
          stdMesh.castShadow = true;
          eqGroup.add(stdMesh);

          const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(stdGeo),
            new THREE.LineBasicMaterial({ color: isSelected ? 0xffffff : 0x1e293b })
          );
          stdMesh.add(edges);

          objectMapRef.current.set(stdMesh, { type: 'equipment', id: eq.id });
        }
      }

      // Selection Halo / Bounding box
      if (isSelected) {
        const box = new THREE.BoxHelper(eqGroup, 0x38bdf8);
        eqGroup.add(box);
      }

      buildingGroup.add(eqGroup);
    });

    scene.add(buildingGroup);
  }, [walls, rooms, equipment, equipmentTypes, modelLoadCounter, verticalConfig, visibilityMode, selectedType, selectedId, isClippingActive, clippingHeight]);

  // Mouse Interaction: Orbit, Pan, Select, Measurement Tool
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };

    // Raycast on left click (button 0)
    if (e.button === 0) {
      const container = canvasContainerRef.current;
      const camera = cameraRef.current;
      const scene = sceneRef.current;
      if (!container || !camera || !scene) return;

      const rect = container.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

      const buildingGroup = scene.getObjectByName('BUILDING_MODEL_GROUP');
      if (!buildingGroup) return;

      const intersects = raycaster.intersectObjects(buildingGroup.children, true);

      // Measurement Tool mode
      if (activeTool === 'MEASURE_3D') {
        if (intersects.length > 0) {
          const pt = intersects[0].point;
          if (measurePoints.length === 0) {
            setMeasurePoints([pt]);
          } else {
            const ptA = measurePoints[0];
            const dist = ptA.distanceTo(pt);
            setMeasuredDistance(dist);
            setMeasurePoints([ptA, pt]);
            setActiveTool('SELECT');
          }
        }
        return;
      }

      // Select object
      if (intersects.length > 0) {
        // Find mapped object
        for (const hit of intersects) {
          let current: THREE.Object3D | null = hit.object;
          while (current) {
            if (objectMapRef.current.has(current)) {
              const info = objectMapRef.current.get(current)!;
              selectItem(info.type, info.id);
              return;
            }
            current = current.parent;
          }
        }
      } else {
        selectItem(null, null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !cameraRef.current) return;

    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;

    const camera = cameraRef.current;
    const target = cameraTarget.current;

    // Right-click or Shift+Left Click: Pan
    if (e.buttons === 2 || e.shiftKey) {
      const panSpeed = 0.05;
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

      camera.position.addScaledVector(right, -deltaX * panSpeed);
      camera.position.addScaledVector(up, deltaY * panSpeed);
      target.addScaledVector(right, -deltaX * panSpeed);
      target.addScaledVector(up, deltaY * panSpeed);
    } else if (e.buttons === 1) {
      // Left-click: Orbit around target
      const orbitSpeed = 0.005;
      const offset = camera.position.clone().sub(target);

      // Spherical coordinates
      const radius = offset.length();
      let theta = Math.atan2(offset.x, offset.z);
      let phi = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)));

      theta -= deltaX * orbitSpeed;
      phi -= deltaY * orbitSpeed;
      phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.01, phi)); // Restrict looking under ground

      offset.x = radius * Math.sin(phi) * Math.sin(theta);
      offset.y = radius * Math.cos(phi);
      offset.z = radius * Math.sin(phi) * Math.cos(theta);

      camera.position.copy(target).add(offset);
      camera.lookAt(target);
    }

    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const camera = cameraRef.current;
    if (!camera) return;

    const zoomSpeed = 0.05;
    const offset = camera.position.clone().sub(cameraTarget.current);
    const zoomFactor = e.deltaY > 0 ? (1 + zoomSpeed) : (1 - zoomSpeed);

    if (offset.length() * zoomFactor > 2 && offset.length() * zoomFactor < 500) {
      offset.multiplyScalar(zoomFactor);
      camera.position.copy(cameraTarget.current).add(offset);
    }
  };

  return (
    <div 
      className="scene3d-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Three.js Viewport Canvas Wrapper */}
      <div className="scene3d-canvas-wrapper" ref={canvasContainerRef} />

      {/* Overlay controls helper */}
      <div className="scene-overlay-badge">
        <span>Orbit: Left Click Drag • Pan: Right Click Drag • Zoom: Wheel</span>
      </div>

      {/* Blank 3D Modelspace Overlay */}
      {walls.length === 0 && equipment.length === 0 && (
        <div className="blank-3d-banner">
          <div className="text-sm font-bold text-slate-100">Blank 3D Modelspace</div>
          <div className="text-xs text-slate-400 mt-1 max-w-xs text-center">
            No walls or equipment generated yet. Switch to the 2D floorplan to upload a PDF drawing or draw walls.
          </div>
          <button 
            className="btn-primary mt-3"
            onClick={() => setViewMode('FLOORPLAN_2D')}
          >
            Go to 2D Floorplan & Upload PDF
          </button>
        </div>
      )}

      {/* Spline-style Viewport Orientation Gizmo (Bottom-Right) */}
      <div className="spline-nav-gizmo" title="Click axes to snap view">
        <button 
          className={`gizmo-axis-btn gizmo-top ${cameraPreset === 'TOP' ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); setCameraPreset('TOP'); }}
          title="Top View (Y)"
        >
          Y
        </button>
        <div className="gizmo-mid-row">
          <button 
            className={`gizmo-axis-btn gizmo-side ${cameraPreset === 'SIDE' ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setCameraPreset('SIDE'); }}
            title="Side View (X)"
          >
            X
          </button>
          <button 
            className={`gizmo-axis-btn gizmo-persp ${cameraPreset === 'PERSPECTIVE' ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setCameraPreset('PERSPECTIVE'); }}
            title="Perspective View"
          >
            3D
          </button>
          <button 
            className={`gizmo-axis-btn gizmo-front ${cameraPreset === 'FRONT' ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setCameraPreset('FRONT'); }}
            title="Front View (Z)"
          >
            Z
          </button>
        </div>
      </div>

      {/* BIM-style Section Cut Floating Widget (inspired by web-ifc-viewer & bim-viewer) */}
      {isClippingActive && (
        <div className="section-cut-widget" onMouseDown={(e) => e.stopPropagation()}>
          <div className="section-widget-header">
            <div className="flex items-center gap-1.5 font-bold text-xs text-sky-400">
              <Scissors size={14} />
              <span>Plenum / Floor Section Cut</span>
            </div>
            <button
              className="section-widget-close"
              onClick={() => setIsClippingActive(false)}
              title="Close Section Cut"
            >
              <X size={13} />
            </button>
          </div>

          <div className="section-widget-body">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-slate-400">Cutting Elevation</span>
              <span className="font-mono font-bold text-sky-300">
                {formatFeetToImperial(clippingHeight)} ({clippingHeight.toFixed(1)}')
              </span>
            </div>

            <input
              type="range"
              className="section-range-slider"
              min={0.5}
              max={Math.max(16, Math.ceil(deckHeight + 4))}
              step={0.25}
              value={clippingHeight}
              onChange={(e) => setClippingHeight(parseFloat(e.target.value))}
            />

            <div className="section-presets-row">
              <button
                type="button"
                className={`preset-btn ${Math.abs(clippingHeight - deckHeight) < 0.2 ? 'active' : ''}`}
                onClick={() => setClippingHeight(deckHeight)}
                title="Top of Deck"
              >
                Deck ({deckHeight.toFixed(0)}')
              </button>
              <button
                type="button"
                className={`preset-btn ${Math.abs(clippingHeight - (ceilingHeight + plenumHeight / 2)) < 0.2 ? 'active' : ''}`}
                onClick={() => setClippingHeight(ceilingHeight + plenumHeight / 2)}
                title="Plenum Mid-Section"
              >
                Mid-Plenum
              </button>
              <button
                type="button"
                className={`preset-btn ${Math.abs(clippingHeight - ceilingHeight) < 0.2 ? 'active' : ''}`}
                onClick={() => setClippingHeight(ceilingHeight)}
                title="Ceiling Grid Level"
              >
                Ceiling ({ceilingHeight.toFixed(0)}')
              </button>
              <button
                type="button"
                className={`preset-btn ${Math.abs(clippingHeight - 4.5) < 0.2 ? 'active' : ''}`}
                onClick={() => setClippingHeight(4.5)}
                title="Eye Level (4.5')"
              >
                Eye Level
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTool === 'MEASURE_3D' && (
        <div className="tool-instruction-banner">
          <span>Click two 3D points on building walls or equipment to measure distance.</span>
        </div>
      )}
    </div>
  );
};
