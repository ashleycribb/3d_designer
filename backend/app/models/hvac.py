import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class EquipmentType(Base):
    __tablename__ = "equipment_types"

    id = Column(String(50), primary_key=True)  # e.g. "VAV", "AHU", "DIFFUSER", etc.
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False) # "air_handler", "distribution", "fan", "sensor", "damper", "panel"
    
    # Default dimensions in decimal feet
    default_width = Column(Float, default=2.0)
    default_length = Column(Float, default=3.0)
    default_height = Column(Float, default=1.5)
    default_elevation = Column(Float, default=9.5) # Placement height above finished floor (e.g. 9.5ft is plenum)
    elevation_target = Column(String(20), default="plenum") # "floor", "wall", "ceiling", "plenum", "roof"
    
    symbol_shape = Column(String(50), default="box") # "box", "cylinder", "flat_rect", "cone"
    color_hex = Column(String(20), default="#3b82f6")
    discipline = Column(String(50), default="mechanical") # "mechanical", "electrical", "plumbing", "fire_protection", "custom"
    model_url = Column(String(255), nullable=True)

class HVACSystem(Base):
    __tablename__ = "hvac_systems"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(100), nullable=False) # e.g. "AHU-1 System", "Chilled Water Loop A"
    system_type = Column(String(50), default="VAV_SYSTEM")
    description = Column(String(255), nullable=True)

    project = relationship("Project", back_populates="hvac_systems")
    equipment = relationship("Equipment", back_populates="hvac_system")

class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    equipment_type_id = Column(String(50), ForeignKey("equipment_types.id"), nullable=False)
    type_name = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    tag = Column(String(100), nullable=False) # e.g. "VAV-101", "TSTAT-101", "AHU-1"
    
    manufacturer = Column(String(100), default="Trane")
    model = Column(String(100), default="Standard")
    
    # Dimensions in decimal feet
    width = Column(Float, default=2.0)
    length = Column(Float, default=3.0)
    height = Column(Float, default=1.5)
    
    # 3D Coordinates in decimal feet
    position_x = Column(Float, default=0.0)
    position_y = Column(Float, default=0.0) # floorplan Y (depth)
    position_z = Column(Float, default=9.5) # Center height in 3D
    elevation = Column(Float, default=9.5)  # Mounting elevation AFF (above finished floor)
    
    rotation_x = Column(Float, default=0.0) # Radians or degrees
    rotation_y = Column(Float, default=0.0)
    rotation_z = Column(Float, default=0.0)
    
    # Engineering parameters
    airflow_min = Column(Float, nullable=True) # CFM
    airflow_max = Column(Float, nullable=True) # CFM
    discipline = Column(String(50), default="mechanical")
    model_url = Column(String(255), nullable=True)
    
    room_id = Column(String(36), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True)
    floor_name = Column(String(50), default="Floor 1")
    hvac_system_id = Column(String(36), ForeignKey("hvac_systems.id", ondelete="SET NULL"), nullable=True)
    
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="equipment")
    room = relationship("Room", back_populates="equipment")
    hvac_system = relationship("HVACSystem", back_populates="equipment")

class ControlAssociation(Base):
    __tablename__ = "control_associations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    primary_equipment_id = Column(String(36), ForeignKey("equipment.id", ondelete="CASCADE"), nullable=False)
    associated_equipment_id = Column(String(36), ForeignKey("equipment.id", ondelete="CASCADE"), nullable=False)
    relationship_type = Column(String(50), default="CONTROLS") # "CONTROLS", "MONITORS", "INTERLOCKED_WITH", "FEEDS"
    
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="controls")
    primary_equipment = relationship("Equipment", foreign_keys=[primary_equipment_id])
    associated_equipment = relationship("Equipment", foreign_keys=[associated_equipment_id])
