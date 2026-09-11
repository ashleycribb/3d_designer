import re
from fractions import Fraction
from typing import Optional

def parse_imperial_to_feet(val_str: str) -> Optional[float]:
    """
    Parses common imperial string representations to decimal feet.
    Examples:
      - "24'-0\"" -> 24.0
      - "24'-6\"" -> 24.5
      - "24' 6 1/2\"" -> 24.541666...
      - "9'-6\"" -> 9.5
      - "8\"" -> 0.66666...
      - "4 1/2\"" -> 0.375
      - "24" -> 24.0 (assumed feet if no units)
      - "24.5" -> 24.5
    """
    if not val_str:
        return None
    val = val_str.strip()
    
    # Try plain float
    try:
        return float(val)
    except ValueError:
        pass

    # Clean quotes and symbols if needed
    val = val.strip()

    # Format 1: Feet and inches like 24'-6", 24'-0", 24' 6", 24'-6 1/2", 24'
    ft_in_pattern = r'''^(?:(?P<feet>\d+)\s*(?:'|ft))?\s*[-]?\s*(?:(?P<inches>\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)\s*(?:"|in)?)?$'''
    match = re.match(ft_in_pattern, val)
    if match and (match.group("feet") is not None or match.group("inches") is not None):
        feet_part = match.group("feet")
        inches_part = match.group("inches")
        total_feet = 0.0
        if feet_part:
            total_feet += float(feet_part)
        if inches_part:
            total_feet += _parse_inches(inches_part) / 12.0
        return total_feet

    # Format 2: Inches only like 8", 4 1/2"
    in_match = re.match(r'''^(?P<inches>\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)\s*(?:"|in)$''', val)
    if in_match:
        inch_str = in_match.group("inches")
        return _parse_inches(inch_str) / 12.0

    return None

def _parse_inches(inch_str: str) -> float:
    """Parses inch values like '6', '6.5', '4 1/2', '3/4' to float inches."""
    inch_str = inch_str.strip()
    if ' ' in inch_str:
        whole, frac = inch_str.split(' ', 1)
        return float(whole) + float(Fraction(frac))
    elif '/' in inch_str:
        return float(Fraction(inch_str))
    else:
        return float(inch_str)

def format_feet_to_imperial(feet_val: float) -> str:
    """
    Converts decimal feet to standard architectural representation: 24'-6"
    """
    if feet_val is None:
        return "0'-0\""
    
    is_neg = feet_val < 0
    abs_feet = abs(feet_val)
    
    whole_feet = int(abs_feet)
    rem_inches = (abs_feet - whole_feet) * 12.0
    
    whole_inches = int(rem_inches)
    fraction_inch = rem_inches - whole_inches
    
    # Round to nearest 1/16th
    sixteenths = round(fraction_inch * 16)
    if sixteenths == 16:
        whole_inches += 1
        sixteenths = 0
    if whole_inches == 12:
        whole_feet += 1
        whole_inches = 0
        
    frac_str = ""
    if sixteenths > 0:
        frac = Fraction(sixteenths, 16)
        frac_str = f" {frac.numerator}/{frac.denominator}"
        
    sign = "-" if is_neg else ""
    return f"{sign}{whole_feet}'-{whole_inches}{frac_str}\""

def format_inches_to_imperial(inches_val: float) -> str:
    """Converts decimal inches to string, e.g. 4 1/2\" or 8\""""
    if inches_val is None:
        return "0\""
    whole = int(inches_val)
    frac_part = inches_val - whole
    sixteenths = round(frac_part * 16)
    if sixteenths == 16:
        whole += 1
        sixteenths = 0
    frac_str = ""
    if sixteenths > 0:
        frac = Fraction(sixteenths, 16)
        frac_str = f" {frac.numerator}/{frac.denominator}"
    return f"{whole}{frac_str}\""
