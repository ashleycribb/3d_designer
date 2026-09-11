from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Wall, Room
from app.schemas.geometry import WallCreate, WallUpdate, WallResponse, RoomResponse

router = APIRouter(prefix="", tags=["walls"])

@router.get("/projects/{project_id}/walls", response_model=List[WallResponse])
async def list_project_walls(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Wall).where(Wall.project_id == project_id))
    return result.scalars().all()

@router.post("/projects/{project_id}/walls", response_model=WallResponse)
async def create_wall(project_id: str, data: WallCreate, db: AsyncSession = Depends(get_db)):
    wall = Wall(project_id=project_id, **data.model_dump())
    db.add(wall)
    await db.commit()
    await db.refresh(wall)
    return wall

@router.post("/projects/{project_id}/walls/batch", response_model=List[WallResponse])
async def batch_create_walls(project_id: str, walls_data: List[WallCreate], replace_existing: bool = False, db: AsyncSession = Depends(get_db)):
    if replace_existing:
        existing = await db.execute(select(Wall).where(Wall.project_id == project_id))
        for w in existing.scalars().all():
            await db.delete(w)
        await db.flush()

    created = []
    for w_data in walls_data:
        wall = Wall(project_id=project_id, **w_data.model_dump())
        db.add(wall)
        created.append(wall)

    await db.commit()
    for w in created:
        await db.refresh(w)
    return created

@router.put("/walls/{wall_id}", response_model=WallResponse)
async def update_wall(wall_id: str, data: WallUpdate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Wall).where(Wall.id == wall_id))
    wall = res.scalar_one_or_none()
    if not wall:
        raise HTTPException(status_code=404, detail="Wall not found")

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(wall, k, v)

    await db.commit()
    await db.refresh(wall)
    return wall

@router.delete("/walls/{wall_id}")
async def delete_wall(wall_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Wall).where(Wall.id == wall_id))
    wall = res.scalar_one_or_none()
    if not wall:
        raise HTTPException(status_code=404, detail="Wall not found")

    await db.delete(wall)
    await db.commit()
    return {"status": "deleted", "id": wall_id}

@router.get("/projects/{project_id}/rooms", response_model=List[RoomResponse])
async def list_project_rooms(project_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Room).where(Room.project_id == project_id))
    return res.scalars().all()
