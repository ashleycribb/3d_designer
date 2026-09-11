from pathlib import Path
import pymupdf

class SamplePDFGenerator:
    @staticmethod
    def generate_sample_floorplan_pdf(output_path: Path) -> Path:
        """
        Generates a vector architectural floorplan PDF with realistic dimensions,
        rooms, wall geometry, doors, windows, and title block.
        """
        output_path.parent.mkdir(parents=True, exist_ok=True)
        doc = pymupdf.open()
        
        # 800 x 600 points standard landscape sheet
        page = doc.new_page(width=800, height=600)
        
        # Architectural Drawing coordinates
        # Let scale be ~10 points = 1 foot (80 ft x 60 ft sheet)
        # Perimeter: (100, 80) to (700, 480) -> 600pt x 400pt = 60' x 40'
        
        shape = page.new_shape()
        
        # 1. Outer perimeter exterior walls (thick line width = 4.0)
        shape.draw_rect(pymupdf.Rect(100, 80, 700, 480))
        shape.finish(width=4.0, color=(0.1, 0.1, 0.1), stroke_opacity=1.0)
        
        # 2. Main horizontal corridor wall at y = 280
        shape.draw_line(pymupdf.Point(100, 280), pymupdf.Point(700, 280))
        shape.finish(width=2.5, color=(0.2, 0.2, 0.2))
        
        # 3. North rooms dividing walls
        # Room 101: Office A (x: 100 to 280, y: 80 to 280)
        shape.draw_line(pymupdf.Point(280, 80), pymupdf.Point(280, 280))
        # Room 102: Office B (x: 280 to 460, y: 80 to 280)
        shape.draw_line(pymupdf.Point(460, 80), pymupdf.Point(460, 280))
        # Room 103: Conference (x: 460 to 700, y: 80 to 280)
        shape.finish(width=2.0, color=(0.25, 0.25, 0.25))
        
        # 4. South rooms dividing walls
        # Corridor runs from y: 280 to 330
        shape.draw_line(pymupdf.Point(100, 330), pymupdf.Point(700, 330))
        shape.finish(width=2.5, color=(0.2, 0.2, 0.2))
        
        # Room 104: Mechanical Room (x: 100 to 320, y: 330 to 480)
        shape.draw_line(pymupdf.Point(320, 330), pymupdf.Point(320, 480))
        # Room 105: Controls Lab (x: 320 to 700, y: 330 to 480)
        shape.finish(width=2.0, color=(0.25, 0.25, 0.25))
        
        # 5. Door openings & swings
        # Door to 101: opening at x: 180 to 210, y=280
        shape.draw_line(pymupdf.Point(180, 280), pymupdf.Point(180, 255)) # door leaf
        # Door to 102: opening at x: 360 to 390, y=280
        shape.draw_line(pymupdf.Point(360, 280), pymupdf.Point(360, 255))
        # Door to Mech 104: opening at x: 200 to 235, y=330
        shape.draw_line(pymupdf.Point(200, 330), pymupdf.Point(200, 355))
        # Door to Lab 105: opening at x: 480 to 515, y=330
        shape.draw_line(pymupdf.Point(480, 330), pymupdf.Point(480, 355))
        shape.finish(width=1.0, color=(0.4, 0.4, 0.4))
        
        # 6. Dimension lines
        # Dimension across top: 60'-0" (x: 100 to 700 at y = 55)
        shape.draw_line(pymupdf.Point(100, 55), pymupdf.Point(700, 55))
        shape.draw_line(pymupdf.Point(100, 45), pymupdf.Point(100, 65))
        shape.draw_line(pymupdf.Point(700, 45), pymupdf.Point(700, 65))
        # Dimension for Office A: 18'-0" (x: 100 to 280 at y = 65)
        shape.draw_line(pymupdf.Point(100, 68), pymupdf.Point(280, 68))
        shape.draw_line(pymupdf.Point(280, 62), pymupdf.Point(280, 74))
        # Dimension vertical: 40'-0" (y: 80 to 480 at x = 75)
        shape.draw_line(pymupdf.Point(75, 80), pymupdf.Point(75, 480))
        shape.draw_line(pymupdf.Point(65, 80), pymupdf.Point(85, 80))
        shape.draw_line(pymupdf.Point(65, 480), pymupdf.Point(85, 480))
        shape.finish(width=0.75, color=(0.2, 0.4, 0.8))
        
        shape.commit()
        
        # 7. Add architectural text annotations
        # Dimension text
        page.insert_text((370, 50), "60'-0\"", fontsize=11, color=(0.1, 0.3, 0.7))
        page.insert_text((170, 65), "18'-0\"", fontsize=9, color=(0.1, 0.3, 0.7))
        page.insert_text((35, 280), "40'-0\"", fontsize=11, rotate=90, color=(0.1, 0.3, 0.7))
        
        # Room Labels
        page.insert_text((150, 170), "ROOM 101\nOFFICE A\n180 SQ FT", fontsize=10, color=(0.1, 0.1, 0.1))
        page.insert_text((330, 170), "ROOM 102\nOFFICE B\n180 SQ FT", fontsize=10, color=(0.1, 0.1, 0.1))
        page.insert_text((530, 170), "ROOM 103\nCONFERENCE\n240 SQ FT", fontsize=10, color=(0.1, 0.1, 0.1))
        page.insert_text((170, 400), "ROOM 104\nMECH ROOM\n220 SQ FT", fontsize=10, color=(0.1, 0.1, 0.1))
        page.insert_text((470, 400), "ROOM 105\nCONTROLS LAB\n380 SQ FT", fontsize=10, color=(0.1, 0.1, 0.1))
        page.insert_text((360, 310), "CORRIDOR 100", fontsize=9, color=(0.3, 0.3, 0.3))
        
        # Title block
        page.insert_text((100, 530), "CAMPUS ENGINEERING HALL - LEVEL 1 FLOORPLAN", fontsize=12, color=(0.1, 0.1, 0.1))
        page.insert_text((100, 548), "SCALE: 1/8\" = 1'-0\"   |   HVAC CONTROLS LAYOUT   |   PROJECT #ENG-2026", fontsize=8, color=(0.4, 0.4, 0.4))
        
        doc.save(str(output_path))
        doc.close()
        return output_path

    @staticmethod
    def generate_sample_cross_section_pdf(output_path: Path) -> Path:
        """
        Generates a sample wall & ceiling cross-section PDF with typical vertical dimensions.
        """
        output_path.parent.mkdir(parents=True, exist_ok=True)
        doc = pymupdf.open()
        page = doc.new_page(width=600, height=500)
        
        shape = page.new_shape()
        
        # Slab line (bottom) at y = 400
        shape.draw_rect(pymupdf.Rect(80, 400, 520, 420))
        # Ceiling line at y = 220 (9ft above floor)
        shape.draw_line(pymupdf.Point(120, 220), pymupdf.Point(520, 220))
        # Deck / roof line at y = 160 (12ft above floor, plenum is 3ft)
        shape.draw_rect(pymupdf.Rect(80, 140, 520, 160))
        # Exterior wall at x = 80 to 110 (8" thickness)
        shape.draw_rect(pymupdf.Rect(80, 160, 115, 400))
        # Interior stud partition at x = 300 to 315
        shape.draw_rect(pymupdf.Rect(300, 220, 315, 400))
        
        shape.finish(width=1.5, color=(0.2, 0.2, 0.2), fill=(0.95, 0.95, 0.95))
        shape.commit()
        
        # Text callouts
        page.insert_text((80, 50), "TYPICAL WALL & CEILING CROSS SECTION - BLDG 4", fontsize=12, color=(0.1, 0.1, 0.1))
        page.insert_text((130, 215), "CEILING HT 9'-0\" AFF (ACOUSTICAL TILE)", fontsize=9, color=(0.1, 0.3, 0.7))
        page.insert_text((130, 185), "RETURN PLENUM SPACE 3'-0\" CLEAR", fontsize=9, color=(0.1, 0.3, 0.7))
        page.insert_text((130, 135), "T.O. DECK 12'-0\" (UNDERSIDE OF STEEL ROOF DECK)", fontsize=9, color=(0.1, 0.3, 0.7))
        page.insert_text((40, 290), "EXTERIOR WALL 8\" CMU", fontsize=8, rotate=90, color=(0.2, 0.2, 0.2))
        page.insert_text((320, 310), "INTERIOR PARTITION 4 1/2\" GWB STUD", fontsize=8, color=(0.2, 0.2, 0.2))
        page.insert_text((130, 435), "6\" CONC. SLAB ON GRADE", fontsize=9, color=(0.2, 0.2, 0.2))
        
        doc.save(str(output_path))
        doc.close()
        return output_path

sample_pdf_generator = SamplePDFGenerator()
