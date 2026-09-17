from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from app.schemas.geometry import WallResponse, RoomResponse, DoorResponse, WindowResponse

class ProjectSettingsResponse(BaseModel):
    id: str
    project_id: str
    unit_system: str
    scale_factor: float
    scale_calibrated: bool
    scale_point_a: Optional[dict] = None
    scale_point_b: Optional[dict] = None
    scale_known_distance_feet: Optional[float] = None
    scale_known_distance_str: Optional[str] = None

    class Config:
        from_attributes = True

class FloorBase(BaseModel):
    name: str
    floor_number: float = 1.0
    elevation_ft: float = 0.0
    height_ft: float = 12.0

class FloorCreate(FloorBase):
    pass

class FloorResponse(FloorBase):
    id: str
    project_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class VerticalConfigBase(BaseModel):
    exterior_wall_height: float = 10.0
    interior_wall_height: float = 9.0
    exterior_wall_thickness: float = 0.6667
    interior_wall_thickness: float = 0.375
    floor_thickness: float = 0.5
    ceiling_height: float = 9.0
    ceiling_thickness: float = 0.0833
    plenum_height: float = 3.0

class VerticalConfigUpdate(BaseModel):
    exterior_wall_height: Optional[float] = None
    interior_wall_height: Optional[float] = None
    exterior_wall_thickness: Optional[float] = None
    interior_wall_thickness: Optional[float] = None
    floor_thickness: Optional[float] = None
    ceiling_height: Optional[float] = None
    ceiling_thickness: Optional[float] = None
    plenum_height: Optional[float] = None

class VerticalConfigResponse(VerticalConfigBase):
    id: str
    project_id: str
    detected_from_section: bool = False
    source_document: Optional[str] = None

    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    name: str
    building_name: Optional[str] = ""
    campus: Optional[str] = ""
    building_number: Optional[str] = ""
    floor_name: Optional[str] = "Floor 1"
    description: Optional[str] = ""

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    building_name: Optional[str] = None
    campus: Optional[str] = None
    building_number: Optional[str] = None
    floor_name: Optional[str] = None
    description: Optional[str] = None

class DrawingResponse(BaseModel):
    id: str
    project_id: str
    filename: str
    file_type: str
    width_px: Optional[int] = None
    height_px: Optional[int] = None
    is_vector: int = 1
    preview_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ProjectResponse(ProjectBase):
    id: str
    created_at: datetime
    updated_at: datetime
    settings: Optional[ProjectSettingsResponse] = None
    vertical_config: Optional[VerticalConfigResponse] = None
    drawings: List[DrawingResponse] = []
    walls_count: int = 0
    rooms_count: int = 0
    equipment_count: int = 0

    class Config:
        from_attributes = True

class ProjectDetailResponse(ProjectResponse):
    walls: List[WallResponse] = []
    rooms: List[RoomResponse] = []
    doors: List[DoorResponse] = []
    windows: List[WindowResponse] = []
    # equipment will be in hvac schema
