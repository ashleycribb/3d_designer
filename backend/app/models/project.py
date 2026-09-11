import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    building_name = Column(String(255), nullable=True, default="")
    campus = Column(String(255), nullable=True, default="")
    building_number = Column(String(100), nullable=True, default="")
    floor_name = Column(String(100), nullable=True, default="Floor 1")
    description = Column(Text, nullable=True, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    settings = relationship("ProjectSettings", back_populates="project", uselist=False, cascade="all, delete-orphan")
    vertical_config = relationship("VerticalConfig", back_populates="project", uselist=False, cascade="all, delete-orphan")
    drawings = relationship("Drawing", back_populates="project", cascade="all, delete-orphan")
    walls = relationship("Wall", back_populates="project", cascade="all, delete-orphan")
    rooms = relationship("Room", back_populates="project", cascade="all, delete-orphan")
    doors = relationship("Door", back_populates="project", cascade="all, delete-orphan")
    windows = relationship("Window", back_populates="project", cascade="all, delete-orphan")
    equipment = relationship("Equipment", back_populates="project", cascade="all, delete-orphan")
    hvac_systems = relationship("HVACSystem", back_populates="project", cascade="all, delete-orphan")
    controls = relationship("ControlAssociation", back_populates="project", cascade="all, delete-orphan")

class ProjectSettings(Base):
    __tablename__ = "project_settings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, unique=True)
    unit_system = Column(String(50), default="imperial")  # imperial, metric
    
    # Scale calibration data: feet per pixel in drawing coordinates
    scale_factor = Column(Float, default=0.05)  # e.g. 0.05 feet per pixel (20px = 1ft)
    scale_calibrated = Column(Boolean, default=False)
    scale_point_a = Column(JSON, nullable=True)  # {"x": 100, "y": 200}
    scale_point_b = Column(JSON, nullable=True)  # {"x": 500, "y": 200}
    scale_known_distance_feet = Column(Float, nullable=True)
    scale_known_distance_str = Column(String(50), nullable=True)  # "20'-0\""

    project = relationship("Project", back_populates="settings")

class VerticalConfig(Base):
    __tablename__ = "vertical_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # All dimensions stored in decimal feet
    exterior_wall_height = Column(Float, default=10.0)      # 10'-0"
    interior_wall_height = Column(Float, default=9.0)       # 9'-0"
    exterior_wall_thickness = Column(Float, default=0.6667) # 8"
    interior_wall_thickness = Column(Float, default=0.375)  # 4 1/2"
    floor_thickness = Column(Float, default=0.5)            # 6"
    ceiling_height = Column(Float, default=9.0)             # 9'-0"
    ceiling_thickness = Column(Float, default=0.0833)       # 1"
    plenum_height = Column(Float, default=3.0)              # 3'-0"
    
    # Auto-detected or manual review flags
    detected_from_section = Column(Boolean, default=False)
    source_document = Column(String(255), nullable=True)

    project = relationship("Project", back_populates="vertical_config")
