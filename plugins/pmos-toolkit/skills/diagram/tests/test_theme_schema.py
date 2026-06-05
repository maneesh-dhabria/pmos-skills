"""Strict positive-list schema validation for theme.yaml files."""
import json
import pathlib
import pytest
from jsonschema import validate, ValidationError

SCHEMA_PATH = pathlib.Path(__file__).parents[1] / "themes" / "_schema.json"


def load_schema():
    return json.loads(SCHEMA_PATH.read_text())


MINIMAL = {
    "name": "x",
    "displayName": "X",
    "surface": {"background": "#FFFFFF"},
    "palette": {"ink": "#000000", "inkMuted": "#444444", "accents": []},
    "typography": {"body": {"stack": "sans-serif", "weights": [400], "sizes": [12]}},
    "connectors": {"mixingPermitted": False},
    "arrowheads": {"style": "filled-triangle", "sizes": {"default": "8x6"}},
    "rubricOverrides": {"waive": [], "add": []},
    "infographic": {"supported": False},
}


def test_minimal_theme_validates():
    validate(MINIMAL, load_schema())


def test_unknown_top_level_key_rejected():
    bad = {**MINIMAL, "direction": "top-down"}
    with pytest.raises(ValidationError):
        validate(bad, load_schema())


def test_layout_keys_explicitly_rejected():
    for key in ("direction", "canvas", "nodePositions", "readingOrder", "placement", "layout"):
        with pytest.raises(ValidationError):
            validate({**MINIMAL, key: "anything"}, load_schema())


def test_extends_rejected_in_v1():
    with pytest.raises(ValidationError):
        validate({**MINIMAL, "extends": "technical"}, load_schema())


def test_technical_theme_validates_against_schema():
    import yaml
    path = pathlib.Path(__file__).parents[1] / "themes" / "technical" / "theme.yaml"
    theme = yaml.safe_load(path.read_text())
    validate(theme, load_schema())
    assert theme["name"] == "technical"
    assert theme["connectors"]["mixingPermitted"] is False
    assert theme["infographic"]["supported"] is False
    assert theme["rubricOverrides"]["waive"] == []
    assert theme["rubricOverrides"]["add"] == []
    assert theme["palette"]["ink"].upper() == "#1C1917"
    assert theme["palette"]["inkMuted"].upper() == "#57534E"
    assert theme["palette"]["warn"].upper() == "#B91C1C"
    assert any(a["hex"].upper() == "#C2410C" for a in theme["palette"]["accents"])
