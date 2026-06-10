"""build_rubric_prompt(theme) — stable IDs + waive/add semantics."""
import copy
import pathlib
import sys

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))
import run  # noqa: E402


CORE_IDS = [
    "legibility",
    "primary-emphasis",
    "clear-entry",
    "legend-coverage",
    "style-atom-match",
    "visual-balance",
]


def test_technical_theme_includes_all_core_items():
    theme = run.load_theme("technical")
    prompt = run.build_rubric_prompt(theme)
    for sid in CORE_IDS:
        assert sid in prompt, f"Missing item: {sid}"


def test_arrowhead_consistency_moved_to_code_metric():
    """2026-06-10 rebalance: arrowhead checks are deterministic (arrowhead-mix
    hard-fail in evaluate()), not vision items."""
    theme = run.load_theme("technical")
    prompt = run.build_rubric_prompt(theme)
    assert "arrowhead-consistency" not in prompt


def test_only_legibility_gates_among_core_items():
    gating = [i["id"] for i in run.RUBRIC_CORE_ITEMS if i["gating"] == "true"]
    assert gating == ["legibility"]


def test_waive_drops_item_from_prompt():
    theme = copy.deepcopy(run.load_theme("technical"))
    theme["rubricOverrides"]["waive"] = ["legend-coverage"]
    prompt = run.build_rubric_prompt(theme)
    assert "legend-coverage" not in prompt
    assert "primary-emphasis" in prompt


def test_add_appends_item_to_prompt():
    theme = copy.deepcopy(run.load_theme("technical"))
    theme["rubricOverrides"]["add"] = [
        {"id": "custom-x", "prompt": "is X true?", "evidenceHint": "look at center"}
    ]
    prompt = run.build_rubric_prompt(theme)
    assert "custom-x" in prompt
    assert "is X true?" in prompt
    assert "look at center" in prompt
