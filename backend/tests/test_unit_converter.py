import pytest
from app.utils.unit_converter import parse_imperial_to_feet, format_feet_to_imperial, format_inches_to_imperial

def test_parse_imperial_to_feet():
    assert parse_imperial_to_feet("24'-0\"") == 24.0
    assert parse_imperial_to_feet("24'-6\"") == 24.5
    assert parse_imperial_to_feet("9'-0\"") == 9.0
    assert parse_imperial_to_feet("10'") == 10.0
    assert parse_imperial_to_feet("8\"") == pytest.approx(0.66666, rel=1e-3)
    assert parse_imperial_to_feet("4 1/2\"") == pytest.approx(0.375, rel=1e-3)
    assert parse_imperial_to_feet("20") == 20.0
    assert parse_imperial_to_feet("15.5") == 15.5

def test_format_feet_to_imperial():
    assert format_feet_to_imperial(24.0) == "24'-0\""
    assert format_feet_to_imperial(24.5) == "24'-6\""
    assert format_feet_to_imperial(9.0) == "9'-0\""
    assert format_feet_to_imperial(0.375) == "0'-4 1/2\""
