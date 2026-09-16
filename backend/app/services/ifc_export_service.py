from typing import List, Dict, Any

class IFCExportService:
    @staticmethod
    def generate_ifc_step_content(project_name: str, walls: List[Any], rooms: List[Any], equipment: List[Any]) -> str:
        """
        Generates openBIM IFC4 STEP physical file format string representing
        project building elements (walls, spaces, HVAC flow terminals).
        """
        lines = [
            "ISO-10303-21;",
            "HEADER;",
            "FILE_DESCRIPTION(('ViewDefinition [CoordinationView_V2.0]'), '2;1');",
            f"FILE_NAME('{project_name}.ifc', '2026-09-16T12:00:00', ('HVAC 3D Engineering Platform'), ('University Facilities'), 'PyMuPDF/FastAPI IFC Generator', 'HVAC 3D Platform', '');",
            "FILE_SCHEMA(('IFC4'));",
            "ENDSEC;",
            "DATA;",
            "#1=IFCPERSON($,$,'Engineer',$,$,$,$,$);",
            "#2=IFCORGANIZATION($,'HVAC 3D Engineering Platform',$,$,$);",
            "#3=IFCPERSONANDORGANIZATION(#1,#2,$);",
            "#4=IFCAPPLICATION(#2,'1.0','HVAC 3D Platform','HVAC3D');",
            f"#5=IFCPROJECT('0$a1B2c3D4e5F6',$,'{project_name}',$,$,$,$,$,#4);",
            "#6=IFCSITE('1$a1B2c3D4e5F6',$,'Main Campus',$,$,$,$,$,.ELEMENT.,$,$,$,$,$);",
            "#7=IFCBUILDING('2$a1B2c3D4e5F6',$,'Engineering Hall',$,$,$,$,$,.ELEMENT.,$,$,$);",
            "#8=IFCBUILDINGSTOREY('3$a1B2c3D4e5F6',$,'Level 1',$,$,$,$,$,.ELEMENT.,0.0);",
        ]

        entity_id = 9
        # Export Walls as IfcWallStandardCase
        for wall in walls:
            length = wall.get("length", 10.0) if isinstance(wall, dict) else getattr(wall, "length", 10.0)
            wall_type = wall.get("wall_type", "interior") if isinstance(wall, dict) else getattr(wall, "wall_type", "interior")
            lines.append(f"#{entity_id}=IFCWALLSTANDARDCASE('{entity_id}$a1B2',$,'Wall_{entity_id}','{wall_type}',$,$,$,$,$);")
            entity_id += 1

        # Export Rooms as IfcSpace
        for room in rooms:
            name = room.get("name", "Room") if isinstance(room, dict) else getattr(room, "name", "Room")
            area = room.get("area_sq_ft", 200.0) if isinstance(room, dict) else getattr(room, "area_sq_ft", 200.0)
            lines.append(f"#{entity_id}=IFCSPACE('{entity_id}$a1B2',$,'{name}',$,$,$,$,$,.ELEMENT.,$,$);")
            entity_id += 1

        # Export Equipment as IfcFlowTerminal / IfcEnergyConversionDevice
        for eq in equipment:
            tag = eq.get("tag", "EQ") if isinstance(eq, dict) else getattr(eq, "tag", "EQ")
            eq_type = eq.get("equipment_type_id", "VAV") if isinstance(eq, dict) else getattr(eq, "equipment_type_id", "VAV")
            lines.append(f"#{entity_id}=IFCFLOWTERMINAL('{entity_id}$a1B2',$,'{tag}','{eq_type}',$,$,$,$,$);")
            entity_id += 1

        lines.extend([
            "ENDSEC;",
            "END-ISO-10303-21;"
        ])

        return "\n".join(lines)

ifc_export_service = IFCExportService()
