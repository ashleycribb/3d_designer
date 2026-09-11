from typing import Optional, List
from pydantic import BaseModel, Field

class WallBase(BaseModel):
    start_x: float
    start_y: float
    end_x: float
    end_y: float
    draw_start_x: Optional[float] = None
    draw_start_y: Optional[float] = None
    draw_end_x: Optional[float] = None
    draw_end_y: Optional[float] = None
    thickness: float = 0.5
    height: float = 10.0
    wall_type: str = "interior" # interior, exterior
    material: str = "Drywall"
    room_id: Optional[str] = None
    confidence: float = 1.0

class WallCreate(WallBase):
    pass

class WallUpdate(BaseModel):
    start_x: Optional[float] = None
    start_y: Optional[float] = None
    end_x: Optional[float] = None
    end_y: Optional[float] = None
    draw_start_x: Optional[float] = None
    draw_start_y: Optional[float] = None
    draw_end_x: Optional[float] = None
    draw_end_y: Optional[float] = None
    thickness: Optional[float] = None
    height: Optional[float] = None
    wall_type: Optional[str] = None
    material: Optional[str] = None
    room_id: Optional[str] = None

class WallResponse(WallBase):
    id: str
    project_id: str

    class Config:
        from_attributes = True

class RoomBase(BaseModel):
    name: str = "Room"
    room_number: Optional[str] = None
    polygon_coords: Optional[List[List[float]]] = None # [[x, y], ...] in feet
    center_x: float = 0.0
    center_y: float = 0.0
    area_sq_ft: float = 0.0
    ceiling_height: float = 9.0
    confidence: float = 1.0

class RoomCreate(RoomBase):
    pass

class RoomResponse(RoomBase):
    id: str
    project_id: str

    class Config:
        from_attributes = True

class DoorBase(BaseModel):
    wall_id: Optional[str] = None
    position_x: float
    position_y: float
    width: float = 3.0
    height: float = 7.0
    swing_direction: str = "inward_left"
    confidence: float = 1.0

class DoorResponse(DoorBase):
    id: str
    project_id: str

    class Config:
        from_attributes = True

class WindowBase(BaseModel):
    wall_id: Optional[str] = None
    position_x: float
    position_y: float
    width: float = 4.0
    height: float = 4.0
    sill_height: float = 3.0
    confidence: float = 1.0

class WindowResponse(WindowBase):
    id: str
    project_id: str

    class Config:
        from_attributes = True

class ScaleCalibrationRequest(BaseModel):
    point_a: dict = Field(..., description="{'x': float, 'y': float} in drawing pixel/point coords")
    point_b: dict = Field(..., description="{'x': float, 'y': float} in drawing pixel/point coords")
    known_distance: str = Field(..., description="Distance string like '24\\'-0\\\"' or '24.5'")

class ScaleCalibrationResponse(BaseModel):
    pixel_distance: float
    known_distance_feet: float
    feet_per_pixel: float
    formatted_scale: str
