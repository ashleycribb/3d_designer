export type ViewMode = 'FLOORPLAN_2D' | 'SPLIT_VIEW' | 'VIEW_3D' | 'CONTROLS';

export type VisibilityMode = 
  | 'NORMAL'       // Walls, ceiling, HVAC all visible
  | 'CEILING_OFF'  // Ceiling hidden, plenum area exposed
  | 'XRAY'         // Walls semi-transparent, HVAC emphasized
  | 'HVAC_ONLY'    // Hide architectural walls/ceiling, show only equipment
  | 'PLENUM'       // Focus and isolate plenum zone
  | 'AIR_BALANCE'; // CFM Airflow distribution heatmap & zone balance view

export type CameraPreset = 'PERSPECTIVE' | 'TOP' | 'FRONT' | 'SIDE';

export type ActiveTool = 
  | 'SELECT' 
  | 'DRAW_WALL' 
  | 'CALIBRATE_SCALE' 
  | 'MEASURE_3D' 
  | 'PLACE_EQUIPMENT';
