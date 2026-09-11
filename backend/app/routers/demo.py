from pathlib import Path
from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.demo_service import seed_demonstration_project, seed_equipment_types
from app.services.sample_pdf import sample_pdf_generator
from app.schemas.project import ProjectResponse
from app.config import settings

router = APIRouter(prefix="", tags=["demo"])

@router.post("/demo/seed", response_model=ProjectResponse)
async def seed_demo(db: AsyncSession = Depends(get_db)):
    project = await seed_demonstration_project(db)
    return project

@router.get("/sample-files/floorplan")
async def get_sample_floorplan():
    sample_dir = settings.STORAGE_DIR / "sample_assets"
    file_path = sample_dir / "sample_floorplan.pdf"
    if not file_path.exists():
        sample_pdf_generator.generate_sample_floorplan_pdf(file_path)
    return FileResponse(file_path, filename="sample_floorplan.pdf", media_type="application/pdf")

@router.get("/sample-files/cross-section")
async def get_sample_cross_section():
    sample_dir = settings.STORAGE_DIR / "sample_assets"
    file_path = sample_dir / "sample_cross_section.pdf"
    if not file_path.exists():
        sample_pdf_generator.generate_sample_cross_section_pdf(file_path)
    return FileResponse(file_path, filename="sample_cross_section.pdf", media_type="application/pdf")
