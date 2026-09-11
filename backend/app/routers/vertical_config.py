from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import VerticalConfig
from app.schemas.project import VerticalConfigResponse, VerticalConfigUpdate

router = APIRouter(prefix="/projects/{project_id}/vertical-config", tags=["vertical-config"])

@router.get("", response_model=VerticalConfigResponse)
async def get_vertical_config(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(VerticalConfig).where(VerticalConfig.project_id == project_id))
    config = result.scalar_one_or_none()
    if not config:
        config = VerticalConfig(project_id=project_id)
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return config

@router.put("", response_model=VerticalConfigResponse)
async def update_vertical_config(project_id: str, data: VerticalConfigUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(VerticalConfig).where(VerticalConfig.project_id == project_id))
    config = result.scalar_one_or_none()
    if not config:
        config = VerticalConfig(project_id=project_id)
        db.add(config)

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(config, k, v)

    await db.commit()
    await db.refresh(config)
    return config
