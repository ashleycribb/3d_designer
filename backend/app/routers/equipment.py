import uuid
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Equipment, EquipmentType, Room
from app.schemas.hvac import EquipmentCreate, EquipmentUpdate, EquipmentResponse, EquipmentTypeResponse, RoomAirBalanceResponse
from app.services.demo_service import seed_equipment_types
from app.services.storage_service import storage_service

router = APIRouter(prefix="", tags=["equipment"])

@router.get("/equipment-types", response_model=List[EquipmentTypeResponse])
async def list_equipment_types(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EquipmentType))
    types = result.scalars().all()
    if not types:
        await seed_equipment_types(db)
        result = await db.execute(select(EquipmentType))
        types = result.scalars().all()
    return types

@router.get("/projects/{project_id}/equipment", response_model=List[EquipmentResponse])
async def list_project_equipment(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Equipment).where(Equipment.project_id == project_id))
    return result.scalars().all()

@router.post("/projects/{project_id}/equipment", response_model=EquipmentResponse)
async def place_equipment(project_id: str, data: EquipmentCreate, db: AsyncSession = Depends(get_db)):
    # Verify equipment type exists
    et_res = await db.execute(select(EquipmentType).where(EquipmentType.id == data.equipment_type_id))
    et = et_res.scalar_one_or_none()
    if not et:
        raise HTTPException(status_code=400, detail=f"Invalid equipment_type_id '{data.equipment_type_id}'")

    # If room_id is not specified, attempt spatial room association by X, Y
    room_id = data.room_id
    if not room_id:
        # Check nearest room by center or bounding
        rooms_res = await db.execute(select(Room).where(Room.project_id == project_id))
        rooms = rooms_res.scalars().all()
        # Simple proximity heuristic: room within 15ft
        for r in rooms:
            if abs(r.center_x - data.position_x) < 12 and abs(r.center_y - data.position_y) < 12:
                room_id = r.id
                break

    eq_dict = data.model_dump()
    eq_dict["room_id"] = room_id

    equipment = Equipment(project_id=project_id, **eq_dict)
    db.add(equipment)
    await db.commit()
    await db.refresh(equipment)
    return equipment

@router.put("/equipment/{equipment_id}", response_model=EquipmentResponse)
async def update_equipment(equipment_id: str, data: EquipmentUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Equipment).where(Equipment.id == equipment_id))
    equipment = result.scalar_one_or_none()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(equipment, k, v)

    await db.commit()
    await db.refresh(equipment)
    return equipment

@router.delete("/equipment/{equipment_id}")
async def delete_equipment(equipment_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Equipment).where(Equipment.id == equipment_id))
    equipment = result.scalar_one_or_none()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")

    await db.delete(equipment)
    await db.commit()
    return {"status": "deleted", "id": equipment_id}

@router.post("/projects/{project_id}/equipment-types/import-3d", response_model=EquipmentTypeResponse)
async def import_3d_equipment_type(
    project_id: str,
    file: UploadFile = File(...),
    name: str = Form(...),
    category: str = Form("custom_3d"),
    discipline: str = Form("custom"),
    default_width: float = Form(3.0),
    default_length: float = Form(3.0),
    default_height: float = Form(2.0),
    default_elevation: float = Form(9.5),
    elevation_target: str = Form("plenum"),
    color_hex: str = Form("#38bdf8"),
    db: AsyncSession = Depends(get_db)
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in [".glb", ".gltf"]:
        raise HTTPException(status_code=400, detail="Only .glb and .gltf 3D files are supported")

    dest_path, _ = await storage_service.save_uploaded_file(project_id, file, subfolder="models")
    type_id = f"CUSTOM_{uuid.uuid4().hex[:8].upper()}"
    model_url = f"/api/projects/{project_id}/models/{dest_path.name}"

    et = EquipmentType(
        id=type_id,
        name=name,
        category=category,
        discipline=discipline,
        default_width=default_width,
        default_length=default_length,
        default_height=default_height,
        default_elevation=default_elevation,
        elevation_target=elevation_target,
        symbol_shape="box",
        color_hex=color_hex,
        model_url=model_url
    )
    db.add(et)
    await db.commit()
    await db.refresh(et)
    return et

@router.get("/projects/{project_id}/models/{filename}")
async def get_3d_model(project_id: str, filename: str):
    file_path = storage_service.get_project_dir(project_id) / "models" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="3D model file not found")
    media_type = "model/gltf-binary" if filename.endswith(".glb") else "model/gltf+json"
    return FileResponse(file_path, media_type=media_type)

@router.get("/projects/{project_id}/air-balance", response_model=List[RoomAirBalanceResponse])
async def calculate_air_balance(project_id: str, db: AsyncSession = Depends(get_db)):
    rooms_res = await db.execute(select(Room).where(Room.project_id == project_id))
    rooms = rooms_res.scalars().all()

    eq_res = await db.execute(select(Equipment).where(Equipment.project_id == project_id))
    equipment = eq_res.scalars().all()

    balances = []
    for room in rooms:
        # Sum supply diffusers and return grilles
        room_eq = [e for e in equipment if e.room_id == room.id]
        supply_cfm = sum(e.airflow_max or 150.0 for e in room_eq if "diffuser" in e.type_name.lower() or "supply" in e.type_name.lower())
        return_cfm = sum(e.airflow_max or 150.0 for e in room_eq if "return" in e.type_name.lower() or "grille" in e.type_name.lower())

        volume = room.area_sq_ft * room.ceiling_height
        required_cfm = round((volume * 6.0) / 60.0, 1) # 6 ACH standard

        net = supply_cfm - return_cfm
        status = "BALANCED"
        if supply_cfm > required_cfm * 1.1:
            status = "OVER_SUPPLIED"
        elif supply_cfm < required_cfm * 0.9:
            status = "UNDER_SUPPLIED"

        ach = round((supply_cfm * 60.0) / max(volume, 1.0), 1)

        balances.append(RoomAirBalanceResponse(
            room_id=room.id,
            room_name=f"{room.name} {room.room_number or ''}".strip(),
            area_sq_ft=room.area_sq_ft,
            volume_cu_ft=volume,
            required_cfm=required_cfm,
            actual_supply_cfm=supply_cfm,
            actual_return_cfm=return_cfm,
            net_pressure_cfm=net,
            air_changes_per_hour=ach,
            balance_status=status
        ))

    return balances
