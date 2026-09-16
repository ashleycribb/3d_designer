import math
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Project, ProjectSettings, VerticalConfig, Drawing
from app.schemas.project import DrawingResponse
from app.schemas.geometry import ScaleCalibrationRequest, ScaleCalibrationResponse
from app.schemas.pdf import DetectedGeometryResponse, CrossSectionAnalysisResponse
from app.services.storage_service import storage_service
from app.services.pdf_service import pdf_service
from app.services.geometry_service import geometry_service
from app.services.cross_section import cross_section_service
from app.services.ai_reconstruction_service import ai_reconstruction_service
from app.services.sample_pdf import sample_pdf_generator
from app.utils.unit_converter import parse_imperial_to_feet, format_feet_to_imperial
from app.config import settings

router = APIRouter(prefix="/projects/{project_id}", tags=["drawings"])

@router.post("/drawings", response_model=DrawingResponse)
async def upload_drawing(
    project_id: str,
    file: UploadFile = File(...),
    file_type: str = Form("floorplan"), # floorplan, wall_section, ceiling_section
    db: AsyncSession = Depends(get_db)
):
    # Verify project exists
    proj_res = await db.execute(select(Project).where(Project.id == project_id))
    if not proj_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    dest_path, filename = await storage_service.save_uploaded_file(project_id, file, subfolder="drawings")
    
    preview_path = dest_path.parent / f"{dest_path.stem}_preview.png"
    pdf_info = pdf_service.inspect_and_render_pdf(dest_path, preview_path)

    drawing = Drawing(
        project_id=project_id,
        filename=filename,
        file_type=file_type,
        stored_path=str(dest_path),
        preview_path=str(preview_path),
        width_pts=pdf_info["width_pts"],
        height_pts=pdf_info["height_pts"],
        dpi=pdf_info["dpi"],
        width_px=pdf_info["width_px"],
        height_px=pdf_info["height_px"],
        is_vector=1 if pdf_info["is_vector"] else 0
    )
    db.add(drawing)
    await db.commit()
    await db.refresh(drawing)

    return drawing

@router.get("/drawings/{drawing_id}/preview")
async def get_drawing_preview(project_id: str, drawing_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Drawing).where(Drawing.id == drawing_id, Drawing.project_id == project_id)
    )
    drawing = result.scalar_one_or_none()
    if not drawing or not drawing.preview_path:
        raise HTTPException(status_code=404, detail="Drawing preview not found")

    path = Path(drawing.preview_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Preview file missing on disk")

    return FileResponse(path, media_type="image/png")

@router.post("/process-floorplan", response_model=DetectedGeometryResponse)
async def process_floorplan(project_id: str, drawing_id: str = None, db: AsyncSession = Depends(get_db)):
    # Find drawing
    query = select(Drawing).where(Drawing.project_id == project_id)
    if drawing_id:
        query = query.where(Drawing.id == drawing_id)
    else:
        query = query.where(Drawing.file_type == "floorplan").order_by(Drawing.created_at.desc())
    
    res = await db.execute(query)
    drawing = res.scalar_one_or_none()
    if not drawing:
        raise HTTPException(status_code=404, detail="No floorplan drawing found for project")

    # Get project scale and vertical defaults
    set_res = await db.execute(select(ProjectSettings).where(ProjectSettings.project_id == project_id))
    settings_obj = set_res.scalar_one_or_none()
    scale_factor = settings_obj.scale_factor if settings_obj else 0.05

    vc_res = await db.execute(select(VerticalConfig).where(VerticalConfig.project_id == project_id))
    vc_obj = vc_res.scalar_one_or_none()
    def_height = vc_obj.exterior_wall_height if vc_obj else 10.0
    def_thick = vc_obj.exterior_wall_thickness if vc_obj else 0.5

    # Extract geometry
    raw_geom = pdf_service.extract_raw_geometry_and_text(Path(drawing.stored_path))
    processed = geometry_service.process_floorplan_geometry(
        raw_geom,
        scale_factor=scale_factor,
        default_wall_height=def_height,
        default_wall_thickness=def_thick
    )

    # Cache detected data
    drawing.detected_data = processed
    await db.commit()

    return processed

@router.post("/scale", response_model=ScaleCalibrationResponse)
async def set_drawing_scale(project_id: str, data: ScaleCalibrationRequest, db: AsyncSession = Depends(get_db)):
    # Validate known distance
    known_feet = parse_imperial_to_feet(data.known_distance)
    if not known_feet or known_feet <= 0:
        raise HTTPException(status_code=400, detail=f"Invalid distance value '{data.known_distance}'. Examples: '24\\'-0\\\"', '20', '15.5'")

    p1 = data.point_a
    p2 = data.point_b
    dx = float(p2["x"]) - float(p1["x"])
    dy = float(p2["y"]) - float(p1["y"])
    pixel_dist = math.hypot(dx, dy)

    if pixel_dist < 1.0:
        raise HTTPException(status_code=400, detail="Calibration points are too close together.")

    # Feet per pixel
    feet_per_pixel = known_feet / pixel_dist

    # Update project settings
    res = await db.execute(select(ProjectSettings).where(ProjectSettings.project_id == project_id))
    settings_obj = res.scalar_one_or_none()
    if not settings_obj:
        settings_obj = ProjectSettings(project_id=project_id)
        db.add(settings_obj)

    settings_obj.scale_factor = feet_per_pixel
    settings_obj.scale_calibrated = True
    settings_obj.scale_point_a = p1
    settings_obj.scale_point_b = p2
    settings_obj.scale_known_distance_feet = known_feet
    settings_obj.scale_known_distance_str = data.known_distance

    await db.commit()

    return {
        "pixel_distance": round(pixel_dist, 2),
        "known_distance_feet": round(known_feet, 2),
        "feet_per_pixel": round(feet_per_pixel, 6),
        "formatted_scale": f"1 px = {feet_per_pixel:.4f} ft ({format_feet_to_imperial(known_feet)} over {pixel_dist:.1f} px)"
    }

@router.post("/analyze-cross-section", response_model=CrossSectionAnalysisResponse)
async def analyze_cross_section(project_id: str, drawing_id: str = None, db: AsyncSession = Depends(get_db)):
    query = select(Drawing).where(Drawing.project_id == project_id)
    if drawing_id:
        query = query.where(Drawing.id == drawing_id)
    else:
        query = query.where(Drawing.file_type.in_(["wall_section", "ceiling_section"])).order_by(Drawing.created_at.desc())

    res = await db.execute(query)
    drawing = res.scalar_one_or_none()
    if not drawing:
        raise HTTPException(status_code=404, detail="No cross-section drawing found for this project.")

    analysis = cross_section_service.analyze_cross_section_document(Path(drawing.stored_path))
    return analysis

@router.post("/ai-reconstruct")
async def ai_reconstruct_floorplan(
    project_id: str,
    drawing_id: str = None,
    confidence_threshold: float = 0.8,
    db: AsyncSession = Depends(get_db)
):
    geom = await process_floorplan(project_id=project_id, drawing_id=drawing_id, db=db)
    raw_dict = geom.model_dump() if hasattr(geom, 'model_dump') else dict(geom)
    reconstructed = ai_reconstruction_service.reconstruct_floorplan_from_pdf(raw_dict, confidence_threshold)
    return reconstructed
