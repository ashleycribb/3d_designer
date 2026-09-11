import re
from pathlib import Path
from typing import Dict, Any, List
import pymupdf  # PyMuPDF
from app.utils.unit_converter import parse_imperial_to_feet

class PDFService:
    @staticmethod
    def inspect_and_render_pdf(file_path: Path, output_preview_path: Path, dpi: int = 150) -> Dict[str, Any]:
        """
        Inspects PDF for vector content and renders page 1 as high-res PNG for canvas background.
        """
        doc = pymupdf.open(str(file_path))
        if doc.page_count == 0:
            doc.close()
            raise ValueError("Empty PDF document.")

        page = doc[0]
        rect = page.rect
        width_pts, height_pts = rect.width, rect.height

        # Check vector geometry vs raster
        drawings = page.get_drawings()
        is_vector = len(drawings) > 0

        # Render preview PNG
        pix = page.get_pixmap(dpi=dpi)
        output_preview_path.parent.mkdir(parents=True, exist_ok=True)
        pix.save(str(output_preview_path))

        width_px = pix.width
        height_px = pix.height

        page_count = doc.page_count
        doc.close()

        return {
            "page_count": page_count,
            "width_pts": width_pts,
            "height_pts": height_pts,
            "width_px": width_px,
            "height_px": height_px,
            "dpi": dpi,
            "is_vector": is_vector,
            "vector_item_count": len(drawings)
        }

    @staticmethod
    def extract_raw_geometry_and_text(file_path: Path) -> Dict[str, Any]:
        """
        Extracts vector drawing paths (lines, rects) and text blocks with coordinates.
        """
        doc = pymupdf.open(str(file_path))
        if doc.page_count == 0:
            doc.close()
            return {"drawings": [], "text_blocks": []}

        page = doc[0]
        page_height = page.rect.height

        raw_drawings = page.get_drawings()
        extracted_paths = []

        for d in raw_drawings:
            rect = d.get("rect")
            items = d.get("items", [])
            width = d.get("width", 1.0)
            color = d.get("color", None)
            fill = d.get("fill", None)

            path_items = []
            for item in items:
                item_type = item[0]
                if item_type == "l":  # Line
                    p1 = item[1]
                    p2 = item[2]
                    path_items.append({
                        "type": "line",
                        "start": [p1.x, p1.y],
                        "end": [p2.x, p2.y]
                    })
                elif item_type == "re":  # Rectangle
                    r = item[1]
                    path_items.append({
                        "type": "rect",
                        "bounds": [r.x0, r.y0, r.x1, r.y1]
                    })
                elif item_type == "c":  # Curve
                    p1, p2, p3, p4 = item[1], item[2], item[3], item[4]
                    path_items.append({
                        "type": "curve",
                        "points": [[p1.x, p1.y], [p2.x, p2.y], [p3.x, p3.y], [p4.x, p4.y]]
                    })

            extracted_paths.append({
                "bbox": [rect.x0, rect.y0, rect.x1, rect.y1] if rect else None,
                "width": width,
                "color": color,
                "fill": fill,
                "items": path_items
            })

        # Extract text blocks
        text_blocks = []
        for b in page.get_text("blocks"):
            # b: (x0, y0, x1, y1, "text", block_no, block_type)
            if b[6] == 0:  # Text block
                text_content = b[4].strip()
                if text_content:
                    text_blocks.append({
                        "bbox": [b[0], b[1], b[2], b[3]],
                        "text": text_content
                    })

        doc.close()
        return {
            "drawings": extracted_paths,
            "text_blocks": text_blocks,
            "page_height": page_height
        }

pdf_service = PDFService()
