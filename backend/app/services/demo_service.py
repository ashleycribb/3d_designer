import uuid
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import (
    EquipmentType, Project, ProjectSettings, VerticalConfig,
    Wall, Room, Door, Window, Equipment, HVACSystem, ControlAssociation, Drawing
)
from app.services.sample_pdf import sample_pdf_generator
from app.services.pdf_service import pdf_service
from app.config import settings

# 17 Standard Equipment Types as defined in Section 15
STANDARD_EQUIPMENT_TYPES = [
    {
        "id": "VAV",
        "name": "VAV Terminal Box",
        "category": "distribution",
        "default_width": 3.0,
        "default_length": 4.0,
        "default_height": 1.5,
        "default_elevation": 9.5,
        "elevation_target": "plenum",
        "symbol_shape": "box",
        "color_hex": "#3b82f6"
    },
    {
        "id": "AHU",
        "name": "Air Handling Unit",
        "category": "air_handler",
        "default_width": 8.0,
        "default_length": 14.0,
        "default_height": 6.0,
        "default_elevation": 0.0,
        "elevation_target": "floor",
        "symbol_shape": "box",
        "color_hex": "#2563eb"
    },
    {
        "id": "RTU",
        "name": "Rooftop Unit",
        "category": "air_handler",
        "default_width": 7.0,
        "default_length": 12.0,
        "default_height": 5.0,
        "default_elevation": 12.0,
        "elevation_target": "roof",
        "symbol_shape": "box",
        "color_hex": "#1d4ed8"
    },
    {
        "id": "FCU",
        "name": "Fan Coil Unit",
        "category": "air_handler",
        "default_width": 2.5,
        "default_length": 4.0,
        "default_height": 1.5,
        "default_elevation": 9.2,
        "elevation_target": "plenum",
        "symbol_shape": "box",
        "color_hex": "#0284c7"
    },
    {
        "id": "SUPPLY_FAN",
        "name": "Supply Fan",
        "category": "fan",
        "default_width": 2.5,
        "default_length": 3.0,
        "default_height": 2.5,
        "default_elevation": 9.5,
        "elevation_target": "plenum",
        "symbol_shape": "cylinder",
        "color_hex": "#06b6d4"
    },
    {
        "id": "RETURN_FAN",
        "name": "Return Fan",
        "category": "fan",
        "default_width": 2.5,
        "default_length": 3.0,
        "default_height": 2.5,
        "default_elevation": 9.5,
        "elevation_target": "plenum",
        "symbol_shape": "cylinder",
        "color_hex": "#0891b2"
    },
    {
        "id": "EXHAUST_FAN",
        "name": "Exhaust Fan",
        "category": "fan",
        "default_width": 2.0,
        "default_length": 2.5,
        "default_height": 2.0,
        "default_elevation": 11.0,
        "elevation_target": "roof",
        "symbol_shape": "cylinder",
        "color_hex": "#0e7490"
    },
    {
        "id": "DIFFUSER",
        "name": "Supply Diffuser (2x2)",
        "category": "distribution",
        "default_width": 2.0,
        "default_length": 2.0,
        "default_height": 0.3,
        "default_elevation": 9.0,
        "elevation_target": "ceiling",
        "symbol_shape": "flat_rect",
        "color_hex": "#10b981"
    },
    {
        "id": "SUPPLY_GRILLE",
        "name": "Supply Grille",
        "category": "distribution",
        "default_width": 2.0,
        "default_length": 1.0,
        "default_height": 0.2,
        "default_elevation": 8.0,
        "elevation_target": "wall",
        "symbol_shape": "flat_rect",
        "color_hex": "#059669"
    },
    {
        "id": "RETURN_GRILLE",
        "name": "Return Grille (2x2)",
        "category": "distribution",
        "default_width": 2.0,
        "default_length": 2.0,
        "default_height": 0.2,
        "default_elevation": 9.0,
        "elevation_target": "ceiling",
        "symbol_shape": "flat_rect",
        "color_hex": "#84cc16"
    },
    {
        "id": "THERMOSTAT",
        "name": "Wall Thermostat",
        "category": "sensor",
        "default_width": 0.5,
        "default_length": 0.4,
        "default_height": 0.5,
        "default_elevation": 4.5, # 4'-6" AFF ADA height
        "elevation_target": "wall",
        "symbol_shape": "box",
        "color_hex": "#f59e0b"
    },
    {
        "id": "TEMP_SENSOR",
        "name": "Temperature Sensor",
        "category": "sensor",
        "default_width": 0.4,
        "default_length": 0.4,
        "default_height": 0.4,
        "default_elevation": 4.5,
        "elevation_target": "wall",
        "symbol_shape": "cylinder",
        "color_hex": "#d97706"
    },
    {
        "id": "HUMIDITY_SENSOR",
        "name": "Humidity Sensor",
        "category": "sensor",
        "default_width": 0.4,
        "default_length": 0.4,
        "default_height": 0.4,
        "default_elevation": 4.5,
        "elevation_target": "wall",
        "symbol_shape": "cylinder",
        "color_hex": "#b45309"
    },
    {
        "id": "CO2_SENSOR",
        "name": "CO2 Sensor",
        "category": "sensor",
        "default_width": 0.5,
        "default_length": 0.5,
        "default_height": 0.5,
        "default_elevation": 4.5,
        "elevation_target": "wall",
        "symbol_shape": "box",
        "color_hex": "#ea580c"
    },
    {
        "id": "DAMPER",
        "name": "Control Damper",
        "category": "damper",
        "default_width": 1.5,
        "default_length": 1.5,
        "default_height": 1.0,
        "default_elevation": 9.5,
        "elevation_target": "plenum",
        "symbol_shape": "box",
        "color_hex": "#8b5cf6"
    },
    {
        "id": "ACTUATOR",
        "name": "Electronic Actuator",
        "category": "damper",
        "default_width": 0.8,
        "default_length": 0.8,
        "default_height": 0.6,
        "default_elevation": 9.5,
        "elevation_target": "plenum",
        "symbol_shape": "box",
        "color_hex": "#7c3aed",
        "discipline": "mechanical"
    },
    {
        "id": "CONTROL_PANEL",
        "name": "DDC Control Panel",
        "category": "panel",
        "default_width": 3.0,
        "default_length": 1.0,
        "default_height": 4.0,
        "default_elevation": 3.0,
        "elevation_target": "wall",
        "symbol_shape": "box",
        "color_hex": "#ef4444",
        "discipline": "mechanical"
    },
    # Electrical Systems
    {
        "id": "TRANSFORMER",
        "name": "Dry-Type Transformer",
        "category": "electrical",
        "default_width": 3.5,
        "default_length": 3.0,
        "default_height": 4.5,
        "default_elevation": 0.0,
        "elevation_target": "floor",
        "symbol_shape": "box",
        "color_hex": "#f59e0b",
        "discipline": "electrical"
    },
    {
        "id": "SWITCHBOARD",
        "name": "Main Switchboard",
        "category": "electrical",
        "default_width": 6.0,
        "default_length": 2.5,
        "default_height": 7.0,
        "default_elevation": 0.0,
        "elevation_target": "floor",
        "symbol_shape": "box",
        "color_hex": "#d97706",
        "discipline": "electrical"
    },
    {
        "id": "PANELBOARD",
        "name": "Branch Panelboard",
        "category": "electrical",
        "default_width": 1.8,
        "default_length": 0.6,
        "default_height": 3.5,
        "default_elevation": 3.5,
        "elevation_target": "wall",
        "symbol_shape": "box",
        "color_hex": "#b45309",
        "discipline": "electrical"
    },
    {
        "id": "VFD",
        "name": "Variable Frequency Drive",
        "category": "electrical",
        "default_width": 1.5,
        "default_length": 1.0,
        "default_height": 2.2,
        "default_elevation": 4.0,
        "elevation_target": "wall",
        "symbol_shape": "box",
        "color_hex": "#eab308",
        "discipline": "electrical"
    },
    {
        "id": "CABLE_TRAY",
        "name": "Overhead Cable Tray",
        "category": "electrical",
        "default_width": 8.0,
        "default_length": 1.5,
        "default_height": 0.5,
        "default_elevation": 10.5,
        "elevation_target": "plenum",
        "symbol_shape": "box",
        "color_hex": "#ca8a04",
        "discipline": "electrical"
    },
    {
        "id": "GENERATOR",
        "name": "Standby Diesel Generator",
        "category": "electrical",
        "default_width": 12.0,
        "default_length": 5.0,
        "default_height": 6.5,
        "default_elevation": 0.0,
        "elevation_target": "floor",
        "symbol_shape": "box",
        "color_hex": "#78350f",
        "discipline": "electrical"
    },
    # Plumbing & Hydronics
    {
        "id": "CHW_PUMP",
        "name": "Base-Mounted CHW Pump",
        "category": "plumbing",
        "default_width": 3.0,
        "default_length": 4.5,
        "default_height": 3.0,
        "default_elevation": 0.0,
        "elevation_target": "floor",
        "symbol_shape": "cylinder",
        "color_hex": "#0d9488",
        "discipline": "plumbing"
    },
    {
        "id": "EXPANSION_TANK",
        "name": "Hydronic Expansion Tank",
        "category": "plumbing",
        "default_width": 2.5,
        "default_length": 2.5,
        "default_height": 5.0,
        "default_elevation": 0.0,
        "elevation_target": "floor",
        "symbol_shape": "cylinder",
        "color_hex": "#0f766e",
        "discipline": "plumbing"
    },
    {
        "id": "WATER_HEATER",
        "name": "Commercial Water Heater",
        "category": "plumbing",
        "default_width": 3.0,
        "default_length": 3.0,
        "default_height": 6.0,
        "default_elevation": 0.0,
        "elevation_target": "floor",
        "symbol_shape": "cylinder",
        "color_hex": "#14b8a6",
        "discipline": "plumbing"
    },
    {
        "id": "BACKFLOW_PREVENTER",
        "name": "RPZ Backflow Preventer",
        "category": "plumbing",
        "default_width": 2.5,
        "default_length": 1.0,
        "default_height": 1.5,
        "default_elevation": 2.5,
        "elevation_target": "wall",
        "symbol_shape": "box",
        "color_hex": "#047857",
        "discipline": "plumbing"
    },
    {
        "id": "BOILER",
        "name": "Commercial Boiler",
        "category": "plumbing",
        "default_width": 4.0,
        "default_length": 3.5,
        "default_height": 5.5,
        "default_elevation": 0.0,
        "elevation_target": "floor",
        "symbol_shape": "box",
        "color_hex": "#059669",
        "discipline": "plumbing"
    },
    # Fire Protection
    {
        "id": "SPRINKLER_PENDANT",
        "name": "Pendant Sprinkler Head",
        "category": "fire_protection",
        "default_width": 0.6,
        "default_length": 0.6,
        "default_height": 0.5,
        "default_elevation": 9.0,
        "elevation_target": "ceiling",
        "symbol_shape": "cone",
        "color_hex": "#e11d48",
        "discipline": "fire_protection"
    },
    {
        "id": "SPRINKLER_UPRIGHT",
        "name": "Upright Sprinkler Head",
        "category": "fire_protection",
        "default_width": 0.6,
        "default_length": 0.6,
        "default_height": 0.5,
        "default_elevation": 11.5,
        "elevation_target": "plenum",
        "symbol_shape": "cone",
        "color_hex": "#be123c",
        "discipline": "fire_protection"
    },
    {
        "id": "FIRE_RISER",
        "name": "Alarm Check Fire Riser",
        "category": "fire_protection",
        "default_width": 2.0,
        "default_length": 1.5,
        "default_height": 8.0,
        "default_elevation": 0.0,
        "elevation_target": "floor",
        "symbol_shape": "cylinder",
        "color_hex": "#9f1239",
        "discipline": "fire_protection"
    },
    # Advanced Sensors
    {
        "id": "DIFF_PRESSURE",
        "name": "Diff Pressure Sensor",
        "category": "sensor",
        "default_width": 0.8,
        "default_length": 0.8,
        "default_height": 0.5,
        "default_elevation": 10.0,
        "elevation_target": "plenum",
        "symbol_shape": "box",
        "color_hex": "#6366f1",
        "discipline": "mechanical"
    },
    {
        "id": "BTU_METER",
        "name": "Hydronic BTU Meter",
        "category": "sensor",
        "default_width": 1.0,
        "default_length": 0.8,
        "default_height": 1.0,
        "default_elevation": 9.5,
        "elevation_target": "plenum",
        "symbol_shape": "box",
        "color_hex": "#8b5cf6",
        "discipline": "mechanical"
    }
]

async def seed_equipment_types(db: AsyncSession):
    for et_data in STANDARD_EQUIPMENT_TYPES:
        res = await db.execute(select(EquipmentType).where(EquipmentType.id == et_data["id"]))
        existing = res.scalar_one_or_none()
        if not existing:
            et = EquipmentType(**et_data)
            db.add(et)
        else:
            for k, v in et_data.items():
                setattr(existing, k, v)
    await db.commit()

async def seed_demonstration_project(db: AsyncSession) -> Project:
    """
    Creates or retrieves the demonstration engineering project.
    """
    demo_name = "Campus Engineering Hall - Level 1 HVAC"
    res = await db.execute(select(Project).where(Project.name == demo_name))
    existing_proj = res.scalar_one_or_none()
    if existing_proj:
        return existing_proj

    # Ensure equipment types are seeded
    await seed_equipment_types(db)

    # 1. Create Project
    project = Project(
        name=demo_name,
        building_name="Campus Engineering Hall",
        campus="North Quad",
        building_number="Bldg 104",
        floor_name="Floor 1",
        description="Demonstration model of Level 1 controls layout featuring multi-zone VAV systems, central AHU, plenum space, and DDC controllers."
    )
    db.add(project)
    await db.flush()

    # 2. Project Settings & Scale
    # 600px = 60 feet -> 0.1 feet per pixel
    settings_obj = ProjectSettings(
        project_id=project.id,
        unit_system="imperial",
        scale_factor=0.1,
        scale_calibrated=True,
        scale_point_a={"x": 100, "y": 55},
        scale_point_b={"x": 700, "y": 55},
        scale_known_distance_feet=60.0,
        scale_known_distance_str="60'-0\""
    )
    db.add(settings_obj)

    # 3. Vertical Configuration
    vert_config = VerticalConfig(
        project_id=project.id,
        exterior_wall_height=12.0,
        interior_wall_height=9.0,
        exterior_wall_thickness=0.6667, # 8"
        interior_wall_thickness=0.375,  # 4 1/2"
        floor_thickness=0.5,            # 6"
        ceiling_height=9.0,             # 9'-0"
        ceiling_thickness=0.0833,
        plenum_height=3.0,              # 3'-0"
        detected_from_section=True,
        source_document="sample_cross_section.pdf"
    )
    db.add(vert_config)

    # 4. Generate & register sample floorplan PDF
    demo_dir = settings.STORAGE_DIR / project.id / "drawings"
    demo_pdf_path = demo_dir / "sample_floorplan.pdf"
    sample_pdf_generator.generate_sample_floorplan_pdf(demo_pdf_path)
    
    preview_png_path = demo_dir / "sample_floorplan_preview.png"
    pdf_info = pdf_service.inspect_and_render_pdf(demo_pdf_path, preview_png_path)

    drawing = Drawing(
        project_id=project.id,
        filename="sample_floorplan.pdf",
        file_type="floorplan",
        stored_path=str(demo_pdf_path),
        preview_path=str(preview_png_path),
        width_pts=pdf_info["width_pts"],
        height_pts=pdf_info["height_pts"],
        dpi=150,
        width_px=pdf_info["width_px"],
        height_px=pdf_info["height_px"],
        is_vector=1
    )
    db.add(drawing)

    # 5. Create Rooms
    # Geometry in feet:
    # Outer bounds: X: 0 to 60, Y: 0 to 40
    # North rooms: Y: 0 to 20
    # Corridor: Y: 20 to 25
    # South rooms: Y: 25 to 40
    rooms_data = [
        {"name": "Room 101 - Office A", "room_number": "101", "center_x": 9.0, "center_y": 10.0, "area_sq_ft": 360.0},
        {"name": "Room 102 - Office B", "room_number": "102", "center_x": 27.0, "center_y": 10.0, "area_sq_ft": 360.0},
        {"name": "Room 103 - Conference", "room_number": "103", "center_x": 48.0, "center_y": 10.0, "area_sq_ft": 480.0},
        {"name": "Room 104 - Mech Room", "room_number": "104", "center_x": 11.0, "center_y": 32.5, "area_sq_ft": 330.0},
        {"name": "Room 105 - Controls Lab", "room_number": "105", "center_x": 41.0, "center_y": 32.5, "area_sq_ft": 570.0},
        {"name": "Corridor 100", "room_number": "100", "center_x": 30.0, "center_y": 22.5, "area_sq_ft": 300.0}
    ]
    created_rooms = {}
    for r in rooms_data:
        room_obj = Room(project_id=project.id, **r)
        db.add(room_obj)
        await db.flush()
        created_rooms[r["room_number"]] = room_obj

    # 6. Create Walls
    # Exterior perimeter walls (height = 12ft, thickness = 0.67ft)
    walls_data = [
        # North exterior
        {"start_x": 0.0, "start_y": 0.0, "end_x": 60.0, "end_y": 0.0, "thickness": 0.67, "height": 12.0, "wall_type": "exterior", "material": "Brick/Concrete"},
        # South exterior
        {"start_x": 0.0, "start_y": 40.0, "end_x": 60.0, "end_y": 40.0, "thickness": 0.67, "height": 12.0, "wall_type": "exterior", "material": "Brick/Concrete"},
        # West exterior
        {"start_x": 0.0, "start_y": 0.0, "end_x": 0.0, "end_y": 40.0, "thickness": 0.67, "height": 12.0, "wall_type": "exterior", "material": "Brick/Concrete"},
        # East exterior
        {"start_x": 60.0, "start_y": 0.0, "end_x": 60.0, "end_y": 40.0, "thickness": 0.67, "height": 12.0, "wall_type": "exterior", "material": "Brick/Concrete"},
        
        # Interior partitions (height = 9.0ft, thickness = 0.38ft)
        # North corridor wall: Y = 20.0, X: 0 to 60
        {"start_x": 0.0, "start_y": 20.0, "end_x": 60.0, "end_y": 20.0, "thickness": 0.38, "height": 9.0, "wall_type": "interior", "material": "Drywall"},
        # Office 101/102 partition: X = 18.0, Y: 0 to 20
        {"start_x": 18.0, "start_y": 0.0, "end_x": 18.0, "end_y": 20.0, "thickness": 0.38, "height": 9.0, "wall_type": "interior", "material": "Drywall"},
        # Office 102/103 partition: X = 36.0, Y: 0 to 20
        {"start_x": 36.0, "start_y": 0.0, "end_x": 36.0, "end_y": 20.0, "thickness": 0.38, "height": 9.0, "wall_type": "interior", "material": "Drywall"},
        
        # South corridor wall: Y = 25.0, X: 0 to 60
        {"start_x": 0.0, "start_y": 25.0, "end_x": 60.0, "end_y": 25.0, "thickness": 0.38, "height": 9.0, "wall_type": "interior", "material": "Drywall"},
        # Mech Room 104 / Controls Lab partition: X = 22.0, Y: 25 to 40
        {"start_x": 22.0, "start_y": 25.0, "end_x": 22.0, "end_y": 40.0, "thickness": 0.38, "height": 9.0, "wall_type": "interior", "material": "Drywall"}
    ]

    for w in walls_data:
        # Drawing pixel coordinates (scale 0.1 ft/px -> 10 px/ft offset by margin 100, 80)
        draw_x1 = 100.0 + (w["start_x"] * 10.0)
        draw_y1 = 80.0 + (w["start_y"] * 10.0)
        draw_x2 = 100.0 + (w["end_x"] * 10.0)
        draw_y2 = 80.0 + (w["end_y"] * 10.0)
        
        wall_obj = Wall(
            project_id=project.id,
            draw_start_x=draw_x1,
            draw_start_y=draw_y1,
            draw_end_x=draw_x2,
            draw_end_y=draw_y2,
            confidence=0.98,
            **w
        )
        db.add(wall_obj)

    # 7. HVAC System
    hvac_sys = HVACSystem(
        project_id=project.id,
        name="AHU-1 VAV System",
        system_type="VAV_SYSTEM",
        description="Central Variable Air Volume loop serving North offices and South lab"
    )
    db.add(hvac_sys)
    await db.flush()

    # 8. HVAC Equipment (AHU, VAVs, Diffusers, Thermostats, Control Panels)
    # AHU-1 in Mech Room (Room 104)
    ahu_1 = Equipment(
        project_id=project.id,
        equipment_type_id="AHU",
        type_name="Air Handling Unit",
        name="Central Station AHU-1",
        tag="AHU-1",
        manufacturer="Trane",
        model="ClimateChanger Series",
        width=7.0,
        length=12.0,
        height=6.0,
        elevation=0.0,
        position_x=11.0,
        position_y=32.5,
        position_z=3.0, # Center height
        room_id=created_rooms["104"].id,
        hvac_system_id=hvac_sys.id,
        airflow_min=2500.0,
        airflow_max=6000.0
    )
    db.add(ahu_1)
    await db.flush()

    # Main DDC Panel in Mech Room
    ddc_panel = Equipment(
        project_id=project.id,
        equipment_type_id="CONTROL_PANEL",
        type_name="DDC Control Panel",
        name="DDC Field Panel 1",
        tag="CP-1",
        manufacturer="Johnson Controls",
        model="Metasys FEC2611",
        width=3.0,
        length=0.8,
        height=4.0,
        elevation=3.0,
        position_x=1.0,
        position_y=30.0,
        position_z=3.0,
        room_id=created_rooms["104"].id
    )
    db.add(ddc_panel)

    # VAV-101 in Office A (Room 101 plenum)
    vav_101 = Equipment(
        project_id=project.id,
        equipment_type_id="VAV",
        type_name="VAV Terminal Box",
        name="VAV Terminal Box 101",
        tag="VAV-101",
        manufacturer="Price",
        model="SDV Single Duct",
        width=2.5,
        length=3.5,
        height=1.2,
        elevation=9.8,
        position_x=9.0,
        position_y=10.0,
        position_z=10.0,
        room_id=created_rooms["101"].id,
        hvac_system_id=hvac_sys.id,
        airflow_min=150.0,
        airflow_max=450.0
    )
    db.add(vav_101)

    # VAV-102 in Office B (Room 102 plenum)
    vav_102 = Equipment(
        project_id=project.id,
        equipment_type_id="VAV",
        type_name="VAV Terminal Box",
        name="VAV Terminal Box 102",
        tag="VAV-102",
        manufacturer="Price",
        model="SDV Single Duct",
        width=2.5,
        length=3.5,
        height=1.2,
        elevation=9.8,
        position_x=27.0,
        position_y=10.0,
        position_z=10.0,
        room_id=created_rooms["102"].id,
        hvac_system_id=hvac_sys.id,
        airflow_min=150.0,
        airflow_max=450.0
    )
    db.add(vav_102)

    # VAV-103 in Conference Room (Room 103 plenum)
    vav_103 = Equipment(
        project_id=project.id,
        equipment_type_id="VAV",
        type_name="VAV Terminal Box",
        name="VAV Terminal Box 103",
        tag="VAV-103",
        manufacturer="Price",
        model="SDV Single Duct",
        width=3.0,
        length=4.0,
        height=1.5,
        elevation=9.8,
        position_x=48.0,
        position_y=10.0,
        position_z=10.0,
        room_id=created_rooms["103"].id,
        hvac_system_id=hvac_sys.id,
        airflow_min=250.0,
        airflow_max=900.0
    )
    db.add(vav_103)
    await db.flush()

    # Thermostats
    tstat_101 = Equipment(
        project_id=project.id,
        equipment_type_id="THERMOSTAT",
        type_name="Wall Thermostat",
        name="Thermostat 101",
        tag="TSTAT-101",
        manufacturer="Honeywell",
        model="BACnet Communicating",
        width=0.4,
        length=0.4,
        height=0.4,
        elevation=4.5,
        position_x=17.5,
        position_y=10.0,
        position_z=4.5,
        room_id=created_rooms["101"].id
    )
    db.add(tstat_101)

    tstat_102 = Equipment(
        project_id=project.id,
        equipment_type_id="THERMOSTAT",
        type_name="Wall Thermostat",
        name="Thermostat 102",
        tag="TSTAT-102",
        manufacturer="Honeywell",
        model="BACnet Communicating",
        width=0.4,
        length=0.4,
        height=0.4,
        elevation=4.5,
        position_x=35.5,
        position_y=10.0,
        position_z=4.5,
        room_id=created_rooms["102"].id
    )
    db.add(tstat_102)

    # Diffusers in ceiling (elevation 9.0ft)
    diff_101a = Equipment(
        project_id=project.id,
        equipment_type_id="DIFFUSER",
        type_name="Supply Diffuser",
        name="Supply Diffuser 101-A",
        tag="DIFF-101A",
        manufacturer="Titus",
        model="TMS Cone Diffuser",
        width=2.0,
        length=2.0,
        height=0.2,
        elevation=9.0,
        position_x=6.0,
        position_y=7.0,
        position_z=9.0,
        room_id=created_rooms["101"].id
    )
    diff_101b = Equipment(
        project_id=project.id,
        equipment_type_id="DIFFUSER",
        type_name="Supply Diffuser",
        name="Supply Diffuser 101-B",
        tag="DIFF-101B",
        manufacturer="Titus",
        model="TMS Cone Diffuser",
        width=2.0,
        length=2.0,
        height=0.2,
        elevation=9.0,
        position_x=12.0,
        position_y=13.0,
        position_z=9.0,
        room_id=created_rooms["101"].id
    )
    ret_101 = Equipment(
        project_id=project.id,
        equipment_type_id="RETURN_GRILLE",
        type_name="Return Grille",
        name="Return Grille 101",
        tag="RG-101",
        manufacturer="Titus",
        model="PAR Perforated Return",
        width=2.0,
        length=2.0,
        height=0.2,
        elevation=9.0,
        position_x=9.0,
        position_y=16.0,
        position_z=9.0,
        room_id=created_rooms["101"].id
    )
    db.add_all([diff_101a, diff_101b, ret_101])
    await db.flush()

    # 9. Controls Layer Associations (Requirement 19)
    # TSTAT-101 controls VAV-101
    ctrl_1 = ControlAssociation(
        project_id=project.id,
        primary_equipment_id=tstat_101.id,
        associated_equipment_id=vav_101.id,
        relationship_type="CONTROLS",
        description="Room 101 temperature setpoint modulates VAV damper & reheat"
    )
    # AHU-1 feeds VAV-101, VAV-102, VAV-103
    ctrl_2 = ControlAssociation(
        project_id=project.id,
        primary_equipment_id=ahu_1.id,
        associated_equipment_id=vav_101.id,
        relationship_type="FEEDS",
        description="Supply duct static pressure loop"
    )
    ctrl_3 = ControlAssociation(
        project_id=project.id,
        primary_equipment_id=ahu_1.id,
        associated_equipment_id=vav_102.id,
        relationship_type="FEEDS",
        description="Supply duct static pressure loop"
    )
    db.add_all([ctrl_1, ctrl_2, ctrl_3])

    await db.commit()
    await db.refresh(project)
    return project
