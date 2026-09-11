import re
from pathlib import Path
from typing import Dict, Any, List, Optional
import pymupdf
from app.utils.unit_converter import parse_imperial_to_feet, format_feet_to_imperial

class CrossSectionService:
    @staticmethod
    def analyze_cross_section_document(file_path: Path) -> Dict[str, Any]:
        """
        Parses architectural cross-section drawing / PDF to identify vertical parameters:
        - wall height / exterior wall height
        - wall thickness
        - ceiling height
        - plenum height
        - floor thickness
        - deck height
        Returns candidate values with confidence scores and source notes.
        """
        doc = pymupdf.open(str(file_path))
        extracted_text = ""
        for page in doc:
            extracted_text += "\n" + page.get_text("text")
        doc.close()

        results: Dict[str, Any] = {
            "exterior_wall_height": None,
            "interior_wall_height": None,
            "exterior_wall_thickness": None,
            "interior_wall_thickness": None,
            "floor_thickness": None,
            "ceiling_height": None,
            "plenum_height": None,
            "deck_height": None,
            "extracted_notes": []
        }

        # Regex patterns for dimensions like 9'-0", 8", 4 1/2", 10'-0", 3'-0"
        dim_re = r'(\d+\s*\'\s*[-]?\s*\d+(?:\s+\d+\/\d+)?\"?|\d+\s*[-]\s*\d+\"?|\d+(?:\s+\d+\/\d+)?\")'

        lines = [line.strip() for line in extracted_text.split('\n') if line.strip()]

        for line in lines:
            results["extracted_notes"].append(line)
            lower = line.lower()

            # Ceiling height check (e.g. "CEILING HT 9'-0\" AFF" or "CLG HT: 9'-0\"")
            if any(k in lower for k in ["ceiling", "clg", "a.f.f.", "aff"]):
                match = re.search(dim_re, line)
                if match and not results["ceiling_height"]:
                    val = parse_imperial_to_feet(match.group(1))
                    if val and 6.0 <= val <= 18.0:
                        results["ceiling_height"] = {
                            "value_feet": val,
                            "formatted": format_feet_to_imperial(val),
                            "confidence": 0.94,
                            "source_snippet": line
                        }

            # Plenum height check (e.g. "PLENUM SPACE 3'-0\"" or "RETURN PLENUM")
            if any(k in lower for k in ["plenum", "above ceiling", "ceiling cavity"]):
                match = re.search(dim_re, line)
                if match and not results["plenum_height"]:
                    val = parse_imperial_to_feet(match.group(1))
                    if val and 1.0 <= val <= 8.0:
                        results["plenum_height"] = {
                            "value_feet": val,
                            "formatted": format_feet_to_imperial(val),
                            "confidence": 0.91,
                            "source_snippet": line
                        }

            # Deck height check (e.g. "T.O. DECK 12'-0\"" or "SLAB TO DECK")
            if any(k in lower for k in ["deck", "t.o. deck", "underside of deck", "floor to floor"]):
                match = re.search(dim_re, line)
                if match and not results["deck_height"]:
                    val = parse_imperial_to_feet(match.group(1))
                    if val and 8.0 <= val <= 25.0:
                        results["deck_height"] = {
                            "value_feet": val,
                            "formatted": format_feet_to_imperial(val),
                            "confidence": 0.92,
                            "source_snippet": line
                        }

            # Wall thickness check (e.g. "8\" CMU", "4 1/2\" STUD WALL", "EXT WALL 8\"")
            if any(k in lower for k in ["wall", "stud", "cmu", "exterior wall", "interior partition"]):
                match = re.search(dim_re, line)
                if match:
                    val = parse_imperial_to_feet(match.group(1))
                    if val and 0.25 <= val <= 1.5:
                        if "ext" in lower and not results["exterior_wall_thickness"]:
                            results["exterior_wall_thickness"] = {
                                "value_feet": val,
                                "formatted": format_feet_to_imperial(val),
                                "confidence": 0.90,
                                "source_snippet": line
                            }
                        elif ("int" in lower or "part" in lower) and not results["interior_wall_thickness"]:
                            results["interior_wall_thickness"] = {
                                "value_feet": val,
                                "formatted": format_feet_to_imperial(val),
                                "confidence": 0.88,
                                "source_snippet": line
                            }

            # Floor slab thickness check (e.g. "6\" CONC. SLAB")
            if any(k in lower for k in ["slab", "floor thickness", "conc slab"]):
                match = re.search(dim_re, line)
                if match and not results["floor_thickness"]:
                    val = parse_imperial_to_feet(match.group(1))
                    if val and 0.25 <= val <= 2.0:
                        results["floor_thickness"] = {
                            "value_feet": val,
                            "formatted": format_feet_to_imperial(val),
                            "confidence": 0.89,
                            "source_snippet": line
                        }

        # If deck height and ceiling height were found, derive plenum if missing
        if results["deck_height"] and results["ceiling_height"] and not results["plenum_height"]:
            calc_plenum = round(results["deck_height"]["value_feet"] - results["ceiling_height"]["value_feet"], 2)
            if calc_plenum > 0:
                results["plenum_height"] = {
                    "value_feet": calc_plenum,
                    "formatted": format_feet_to_imperial(calc_plenum),
                    "confidence": 0.85,
                    "source_snippet": "Calculated: Deck Height - Ceiling Height"
                }

        # Exterior wall height defaults to deck height or ceiling+plenum
        if results["deck_height"] and not results["exterior_wall_height"]:
            results["exterior_wall_height"] = {
                "value_feet": results["deck_height"]["value_feet"],
                "formatted": results["deck_height"]["formatted"],
                "confidence": 0.90,
                "source_snippet": "Matched to Deck Height"
            }
        elif results["ceiling_height"] and results["plenum_height"] and not results["exterior_wall_height"]:
            tot = round(results["ceiling_height"]["value_feet"] + results["plenum_height"]["value_feet"], 2)
            results["exterior_wall_height"] = {
                "value_feet": tot,
                "formatted": format_feet_to_imperial(tot),
                "confidence": 0.85,
                "source_snippet": "Calculated: Ceiling Height + Plenum Height"
            }

        return results

cross_section_service = CrossSectionService()
