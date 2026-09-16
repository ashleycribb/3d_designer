from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import ControlAssociation, HVACSystem
from app.schemas.hvac import (
    ControlAssociationCreate, ControlAssociationResponse,
    HVACSystemCreate, HVACSystemResponse
)
from app.services.ddc_simulation_service import ddc_simulation_service

router = APIRouter(prefix="/projects/{project_id}", tags=["controls"])

@router.get("/systems", response_model=List[HVACSystemResponse])
async def list_hvac_systems(project_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(HVACSystem).where(HVACSystem.project_id == project_id))
    return res.scalars().all()

@router.post("/systems", response_model=HVACSystemResponse)
async def create_hvac_system(project_id: str, data: HVACSystemCreate, db: AsyncSession = Depends(get_db)):
    system = HVACSystem(project_id=project_id, **data.model_dump())
    db.add(system)
    await db.commit()
    await db.refresh(system)
    return system

@router.get("/controls", response_model=List[ControlAssociationResponse])
async def list_control_associations(project_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ControlAssociation).where(ControlAssociation.project_id == project_id))
    return res.scalars().all()

@router.post("/controls", response_model=ControlAssociationResponse)
async def create_control_association(project_id: str, data: ControlAssociationCreate, db: AsyncSession = Depends(get_db)):
    ctrl = ControlAssociation(project_id=project_id, **data.model_dump())
    db.add(ctrl)
    await db.commit()
    await db.refresh(ctrl)
    return ctrl

@router.delete("/controls/{control_id}")
async def delete_control_association(control_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ControlAssociation).where(ControlAssociation.id == control_id))
    ctrl = res.scalar_one_or_none()
    if not ctrl:
        raise HTTPException(status_code=404, detail="Control association not found")
    await db.delete(ctrl)
    await db.commit()
    return {"status": "deleted", "id": control_id}

@router.get("/simulate-ddc")
async def simulate_ddc_loop(
    project_id: str,
    room_temp: float = 74.5,
    setpoint: float = 72.0,
    damper_pct: float = 40.0
):
    return ddc_simulation_service.run_thermal_pid_step(
        room_temp=room_temp,
        setpoint=setpoint,
        current_damper_pct=damper_pct
    )
