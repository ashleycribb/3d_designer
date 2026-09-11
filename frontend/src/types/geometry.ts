export interface Wall {
  id: string;
  project_id: string;
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  draw_start_x?: number;
  draw_start_y?: number;
  draw_end_x?: number;
  draw_end_y?: number;
  thickness: number;
  height: number;
  wall_type: 'exterior' | 'interior';
  material: string;
  room_id?: string | null;
  confidence?: number;
}

export interface Room {
  id: string;
  project_id: string;
  name: string;
  room_number?: string;
  polygon_coords?: number[][];
  center_x: number;
  center_y: number;
  area_sq_ft: number;
  ceiling_height: number;
  confidence?: number;
}

export interface Door {
  id: string;
  project_id: string;
  wall_id?: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  swing_direction: string;
  confidence?: number;
}

export interface Window {
  id: string;
  project_id: string;
  wall_id?: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  sill_height: number;
  confidence?: number;
}

export interface ScaleCalibrationRequest {
  point_a: { x: number; y: number };
  point_b: { x: number; y: number };
  known_distance: string;
}

export interface ScaleCalibrationResponse {
  pixel_distance: number;
  known_distance_feet: number;
  feet_per_pixel: number;
  formatted_scale: string;
}

export interface DetectedGeometryResponse {
  summary: {
    walls_count: number;
    doors_count: number;
    windows_count: number;
    rooms_count: number;
    dimensions_count: number;
    is_vector: boolean;
  };
  walls: any[];
  rooms: any[];
  doors: any[];
  windows: any[];
  dimensions: any[];
  raw_text: any[];
}
