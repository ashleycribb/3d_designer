from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class DetectedGeometrySummary(BaseModel):
    walls_count: int
    doors_count: int
    windows_count: int
    rooms_count: int
    dimensions_count: int
    is_vector: bool

class DetectedGeometryResponse(BaseModel):
    summary: DetectedGeometrySummary
    walls: List[Dict[str, Any]]
    rooms: List[Dict[str, Any]]
    doors: List[Dict[str, Any]]
    windows: List[Dict[str, Any]]
    dimensions: List[Dict[str, Any]]
    raw_text: List[Dict[str, Any]]

class CrossSectionValue(BaseModel):
    value_feet: float
    formatted: str
    confidence: float
    source_snippet: str

class CrossSectionAnalysisResponse(BaseModel):
    exterior_wall_height: Optional[CrossSectionValue] = None
    interior_wall_height: Optional[CrossSectionValue] = None
    exterior_wall_thickness: Optional[CrossSectionValue] = None
    interior_wall_thickness: Optional[CrossSectionValue] = None
    floor_thickness: Optional[CrossSectionValue] = None
    ceiling_height: Optional[CrossSectionValue] = None
    plenum_height: Optional[CrossSectionValue] = None
    deck_height: Optional[CrossSectionValue] = None
    extracted_notes: List[str] = []
