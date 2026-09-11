export interface EquipmentType {
  id: string;
  name: string;
  category: 'air_handler' | 'distribution' | 'fan' | 'sensor' | 'damper' | 'panel' | 'electrical' | 'plumbing' | 'fire_protection' | 'custom_3d' | string;
  default_width: number;
  default_length: number;
  default_height: number;
  default_elevation: number;
  elevation_target: 'floor' | 'wall' | 'ceiling' | 'plenum' | 'roof';
  symbol_shape: string;
  color_hex: string;
  discipline?: 'mechanical' | 'electrical' | 'plumbing' | 'fire_protection' | 'custom' | string;
  model_url?: string;
}

export interface HVACSystem {
  id: string;
  project_id: string;
  name: string;
  system_type: string;
  description?: string;
}

export interface Equipment {
  id: string;
  project_id: string;
  equipment_type_id: string;
  type_name: string;
  name: string;
  tag: string;
  manufacturer: string;
  model: string;
  width: number;
  length: number;
  height: number;
  elevation: number;
  position_x: number;
  position_y: number;
  position_z: number;
  rotation_x: number;
  rotation_y: number;
  rotation_z: number;
  airflow_min?: number | null;
  airflow_max?: number | null;
  room_id?: string | null;
  floor_name: string;
  hvac_system_id?: string | null;
  discipline?: string;
  model_url?: string;
  metadata_json?: any;
}

export interface ControlAssociation {
  id: string;
  project_id: string;
  primary_equipment_id: string;
  associated_equipment_id: string;
  relationship_type: string; // 'CONTROLS' | 'MONITORS' | 'INTERLOCKED_WITH' | 'FEEDS'
  description?: string;
}
