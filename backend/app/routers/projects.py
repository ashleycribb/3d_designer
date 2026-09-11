from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.models import Project, ProjectSettings, VerticalConfig, Wall, Room, Door, Window, Equipment, Drawing
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectDetailResponse

router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("", response_model=List[ProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Project)
        .options(
            selectinload(Project.settings),
            selectinload(Project.vertical_config),
            selectinload(Project.drawings)
        )
        .order_by(Project.updated_at.desc())
    )
    projects = result.scalars().all()
    
    response = []
    for p in projects:
        # Count associated objects
        w_cnt = await db.scalar(select(func.count(Wall.id)).where(Wall.project_id == p.id)) or 0
        r_cnt = await db.scalar(select(func.count(Room.id)).where(Room.project_id == p.id)) or 0
        e_cnt = await db.scalar(select(func.count(Equipment.id)).where(Equipment.project_id == p.id)) or 0
        
        p_dict = {
            "id": p.id,
            "name": p.name,
            "building_name": p.building_name,
            "campus": p.campus,
            "building_number": p.building_number,
            "floor_name": p.floor_name,
            "description": p.description,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "settings": p.settings,
            "vertical_config": p.vertical_config,
            "drawings": p.drawings,
            "walls_count": w_cnt,
            "rooms_count": r_cnt,
            "equipment_count": e_cnt
        }
        response.append(p_dict)
        
    return response

@router.post("", response_model=ProjectResponse)
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = Project(**data.model_dump())
    db.add(project)
    await db.flush()

    # Create default settings
    settings = ProjectSettings(project_id=project.id)
    db.add(settings)

    # Create default vertical configuration
    vertical_config = VerticalConfig(project_id=project.id)
    db.add(vertical_config)

    await db.commit()
    await db.refresh(project)
    
    # Reload with relationships
    result = await db.execute(
        select(Project)
        .options(
            selectinload(Project.settings),
            selectinload(Project.vertical_config),
            selectinload(Project.drawings)
        )
        .where(Project.id == project.id)
    )
    proj = result.scalar_one()
    return proj

@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Project)
        .options(
            selectinload(Project.settings),
            selectinload(Project.vertical_config),
            selectinload(Project.drawings),
            selectinload(Project.walls),
            selectinload(Project.rooms),
            selectinload(Project.doors),
            selectinload(Project.windows)
        )
        .where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    w_cnt = len(project.walls)
    r_cnt = len(project.rooms)
    e_cnt = await db.scalar(select(func.count(Equipment.id)).where(Equipment.project_id == project.id)) or 0

    p_dict = {
        "id": project.id,
        "name": project.name,
        "building_name": project.building_name,
        "campus": project.campus,
        "building_number": project.building_number,
        "floor_name": project.floor_name,
        "description": project.description,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "settings": project.settings,
        "vertical_config": project.vertical_config,
        "drawings": project.drawings,
        "walls": project.walls,
        "rooms": project.rooms,
        "doors": project.doors,
        "windows": project.windows,
        "walls_count": w_cnt,
        "rooms_count": r_cnt,
        "equipment_count": e_cnt
    }
    return p_dict

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, data: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(project, k, v)

    await db.commit()
    await db.refresh(project)
    return project

@router.delete("/{project_id}")
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.delete(project)
    await db.commit()
    return {"status": "deleted", "id": project_id}
