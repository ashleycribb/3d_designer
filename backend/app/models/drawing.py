import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class Drawing(Base):
    __tablename__ = "drawings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), default="floorplan")  # floorplan, wall_section, ceiling_section
    stored_path = Column(String(512), nullable=False)
    preview_path = Column(String(512), nullable=True)     # Rendered PNG path
    
    # Dimensions of original drawing
    width_pts = Column(Float, nullable=True)              # PDF points
    height_pts = Column(Float, nullable=True)
    dpi = Column(Integer, default=150)
    width_px = Column(Integer, nullable=True)             # Rasterized preview dimensions
    height_px = Column(Integer, nullable=True)
    is_vector = Column(Integer, default=1)               # 1=vector, 0=scanned raster
    
    # Structured detected elements cached as JSON
    detected_data = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="drawings")
