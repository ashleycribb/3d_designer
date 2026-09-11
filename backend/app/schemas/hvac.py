from typing import Optional, List, Any
from pydantic import BaseModel

class EquipmentTypeResponse(BaseModel):
    id: str
    name: str
    category: str
    default_width: float
    default_length: float
    default_height: float
    default_elevation: float
    elevation_target: str
    symbol_shape: str
    color_hex: str
    discipline: str = "mechanical"
    model_url: Optional[str] = None

    class Config:
        from_attributes = True

class HVACSystemBase(BaseModel):
    name: str
    system_type: str = "VAV_SYSTEM"
    description: Optional[str] = None

class HVACSystemCreate(HVACSystemBase):
    pass

class HVACSystemResponse(HVACSystemBase):
    id: str
    project_id: str

    class Config:
        from_attributes = True

class EquipmentBase(BaseModel):
    equipment_type_id: str
    type_name: str
    name: str
    tag: str
    manufacturer: str = "Standard"
    model: str = "Standard"
    width: float = 2.0
    length: float = 3.0
    height: float = 1.5
    elevation: float = 9.5
    position_x: float = 0.0
    position_y: float = 0.0
    position_z: float = 9.5
    rotation_x: float = 0.0
    rotation_y: float = 0.0
    rotation_z: float = 0.0
    airflow_min: Optional[float] = None
    airflow_max: Optional[float] = None
    discipline: str = "mechanical"
    model_url: Optional[str] = None
    room_id: Optional[str] = None
    floor_name: str = "Floor 1"
    hvac_system_id: Optional[str] = None
    metadata_json: Optional[Any] = None

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    tag: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    width: Optional[float] = None
    length: Optional[float] = None
    height: Optional[float] = None
    elevation: Optional[float] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    position_z: Optional[float] = None
    rotation_x: Optional[float] = None
    rotation_y: Optional[float] = None
    rotation_z: Optional[float] = None
    airflow_min: Optional[float] = None
    airflow_max: Optional[float] = None
    discipline: Optional[str] = None
    model_url: Optional[str] = None
    room_id: Optional[str] = None
    floor_name: Optional[str] = None
    hvac_system_id: Optional[str] = None
    metadata_json: Optional[Any] = None

class EquipmentResponse(EquipmentBase):
    id: str
    project_id: str

    class Config:
        from_attributes = True

class ControlAssociationBase(BaseModel):
    primary_equipment_id: str
    associated_equipment_id: str
    relationship_type: str = "CONTROLS"
    description: Optional[str] = None

class ControlAssociationCreate(ControlAssociationBase):
    pass

class ControlAssociationResponse(ControlAssociationBase):
    id: str
    project_id: str

    class Config:
        from_attributes = True
