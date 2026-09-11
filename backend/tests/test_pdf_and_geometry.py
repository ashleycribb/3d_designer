from pathlib import Path
import pytest
from app.services.sample_pdf import sample_pdf_generator
from app.services.pdf_service import pdf_service
from app.services.geometry_service import geometry_service
from app.services.cross_section import cross_section_service

def test_sample_floorplan_pdf_generation_and_extraction(tmp_path: Path):
    pdf_path = tmp_path / "test_floorplan.pdf"
    preview_path = tmp_path / "test_preview.png"

    # 1. Generate sample floorplan
    sample_pdf_generator.generate_sample_floorplan_pdf(pdf_path)
    assert pdf_path.exists()
    assert pdf_path.stat().st_size > 0

    # 2. Inspect and render preview
    info = pdf_service.inspect_and_render_pdf(pdf_path, preview_path)
    assert info["is_vector"] is True
    assert info["width_px"] > 0
    assert info["height_px"] > 0
    assert preview_path.exists()

    # 3. Extract raw geometry and text
    raw = pdf_service.extract_raw_geometry_and_text(pdf_path)
    assert len(raw["drawings"]) > 0
    assert len(raw["text_blocks"]) > 0

    # 4. Process geometry into walls, rooms, dimensions
    processed = geometry_service.process_floorplan_geometry(
        raw, scale_factor=0.1, default_wall_height=10.0, default_wall_thickness=0.5
    )
    assert processed["summary"]["walls_count"] > 0
    assert processed["summary"]["rooms_count"] > 0
    assert processed["summary"]["dimensions_count"] > 0

def test_cross_section_pdf_analysis(tmp_path: Path):
    cs_path = tmp_path / "test_cs.pdf"
    sample_pdf_generator.generate_sample_cross_section_pdf(cs_path)
    assert cs_path.exists()

    analysis = cross_section_service.analyze_cross_section_document(cs_path)
    assert analysis["ceiling_height"] is not None
    assert analysis["ceiling_height"]["value_feet"] == 9.0
    assert analysis["plenum_height"] is not None
    assert analysis["plenum_height"]["value_feet"] == 3.0
