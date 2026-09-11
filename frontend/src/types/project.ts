export interface ProjectSettings {
  id: string;
  project_id: string;
  unit_system: string;
  scale_factor: number; // feet per pixel
  scale_calibrated: boolean;
  scale_point_a?: { x: number; y: number } | null;
  scale_point_b?: { x: number; y: number } | null;
  scale_known_distance_feet?: number | null;
  scale_known_distance_str?: string | null;
}

export interface VerticalConfig {
  id: string;
  project_id: string;
  exterior_wall_height: number;
  interior_wall_height: number;
  exterior_wall_thickness: number;
  interior_wall_thickness: number;
  floor_thickness: number;
  ceiling_height: number;
  ceiling_thickness: number;
  plenum_height: number;
  detected_from_section?: boolean;
  source_document?: string | null;
}

export interface Drawing {
  id: string;
  project_id: string;
  filename: string;
  file_type: 'floorplan' | 'wall_section' | 'ceiling_section';
  width_px?: number;
  height_px?: number;
  is_vector: number;
  preview_url?: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  building_name?: string;
  campus?: string;
  building_number?: string;
  floor_name?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  settings?: ProjectSettings;
  vertical_config?: VerticalConfig;
  drawings?: Drawing[];
  walls_count?: number;
  rooms_count?: number;
  equipment_count?: number;
}
