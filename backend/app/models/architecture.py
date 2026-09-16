import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class Wall(Base):
    __tablename__ = "walls"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    # Real-world feet coordinates
    start_x = Column(Float, nullable=False)
    start_y = Column(Float, nullable=False)
    end_x = Column(Float, nullable=False)
    end_y = Column(Float, nullable=False)
    
    # Drawing space coordinates (in original pixels/points) for 2D floorplan sync
    draw_start_x = Column(Float, nullable=True)
    draw_start_y = Column(Float, nullable=True)
    draw_end_x = Column(Float, nullable=True)
    draw_end_y = Column(Float, nullable=True)
    
    thickness = Column(Float, default=0.5)      # in feet (e.g. 6" = 0.5', 8" = 0.6667')
    height = Column(Float, default=10.0)        # in feet
    wall_type = Column(String(50), default="interior")  # interior, exterior
    material = Column(String(100), default="Drywall")
    
    room_id = Column(String(36), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True)
    confidence = Column(Float, default=1.0)     # AI/detection confidence score (0.0 to 1.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="walls")
    room = relationship("Room", back_populates="walls")
    doors = relationship("Door", back_populates="wall", cascade="all, delete-orphan")
    windows = relationship("Window", back_populates="wall", cascade="all, delete-orphan")

class Room(Base):
    __tablename__ = "rooms"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(255), default="Room")
    room_number = Column(String(50), nullable=True)
    
    # Polygon boundary vertices: [[x1, y1], [x2, y2], ...] in feet
    polygon_coords = Column(JSON, nullable=True)
    
    # Center position for label/room equipment grouping
    center_x = Column(Float, default=0.0)
    center_y = Column(Float, default=0.0)
    
    area_sq_ft = Column(Float, default=0.0)
    ceiling_height = Column(Float, default=9.0)
    confidence = Column(Float, default=1.0)

    project = relationship("Project", back_populates="rooms")
    walls = relationship("Wall", back_populates="room")
    equipment = relationship("Equipment", back_populates="room")

class Door(Base):
    __tablename__ = "doors"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    wall_id = Column(String(36), ForeignKey("walls.id", ondelete="CASCADE"), nullable=True)
    
    position_x = Column(Float, nullable=False)
    position_y = Column(Float, nullable=False)
    width = Column(Float, default=3.0)   # 3'-0" standard door
    height = Column(Float, default=7.0)  # 7'-0" standard door
    swing_direction = Column(String(20), default="inward_left")
    confidence = Column(Float, default=1.0)

    project = relationship("Project", back_populates="doors")
    wall = relationship("Wall", back_populates="doors")

class Window(Base):
    __tablename__ = "windows"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    wall_id = Column(String(36), ForeignKey("walls.id", ondelete="CASCADE"), nullable=True)
    
    position_x = Column(Float, nullable=False)
    position_y = Column(Float, nullable=False)
    width = Column(Float, default=4.0)       # 4'-0" standard window
    height = Column(Float, default=4.0)      # 4'-0"
    sill_height = Column(Float, default=3.0) # 3'-0" above floor
    confidence = Column(Float, default=1.0)

    project = relationship("Project", back_populates="windows")
    wall = relationship("Wall", back_populates="windows")

class Floor(Base):
    __tablename__ = "floors"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    floor_number = Column(Float, default=1.0)
    elevation_ft = Column(Float, default=0.0)
    height_ft = Column(Float, default=12.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="floors")
