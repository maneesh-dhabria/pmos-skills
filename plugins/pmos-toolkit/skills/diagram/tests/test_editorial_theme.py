"""Editorial theme — schema validation + AA contrast + atoms."""
import pathlib
import sys

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))
import run  # noqa: E402


def test_editorial_theme_validates():
    theme = run.load_theme("editorial")
    assert theme["name"] == "editorial"
    assert theme["surface"]["background"].upper() == "#F4EFE6"
    assert theme["connectors"]["mixingPermitted"] is True
    assert theme["infographic"]["supported"] is True
    assert theme["infographic"]["layout"] == "editorial-v1"


def test_editorial_pinned_accents():
    theme = run.load_theme("editorial")
    roles = {a["pinnedRole"]: a["hex"].upper() for a in theme["palette"]["accents"] if "pinnedRole" in a}
    assert roles["feedback"] == "#1E3A8A"
    # Spec used #D9421C; we darkened to #B8351A to pass WCAG AA on cream.
    assert roles["emphasis"] == "#B8351A"


def test_editorial_byrole_dispatch_complete():
    theme = run.load_theme("editorial")
    by_role = theme["connectors"]["byRole"]
    for r in ["contribution", "emphasis", "feedback", "default"]:
        assert r in by_role, f"missing role: {r}"


def test_editorial_palette_passes_aa_on_cream():
    theme = run.load_theme("editorial")
    cream = theme["surface"]["background"]
    for a in theme["palette"]["accents"]:
        ratio = run.contrast_ratio(a["hex"], cream)
        assert ratio >= 4.5, f"{a['hex']} on {cream} is {ratio:.2f}:1, fails AA"


def test_editorial_atoms_exist():
    atoms = pathlib.Path(__file__).parents[1] / "themes" / "editorial" / "atoms"
    for name in [
        "eyebrow-mono",
        "dashed-container",
        "pastel-chip-stack",
        "computation-block",
        "return-loop-arrow",
    ]:
        path = atoms / f"{name}.svg"
        assert path.exists(), f"Missing atom: {name}.svg"
        # Atoms must be parseable XML and use only theme-token colors
        import xml.etree.ElementTree as ET
        ET.parse(path)  # raises if malformed


def test_editorial_atoms_use_only_theme_palette():
    """Each atom's fill/stroke values must be in the editorial palette set
    (or recognized non-color keywords like 'none', 'context-stroke')."""
    import re
    theme = run.load_theme("editorial")
    palette = run.build_palette_set(theme)
    # Editorial-specific extras: chip-warm/cool hexes, dashed container stroke, ink chip
    for chip in theme["palette"].get("categoryChips", []):
        palette.add(chip["hex"].upper())
    palette.add(theme["surface"]["containerStrokeColor"].upper())

    atoms = pathlib.Path(__file__).parents[1] / "themes" / "editorial" / "atoms"
    hex_pat = re.compile(r"#[0-9A-Fa-f]{6}")
    for atom in atoms.glob("*.svg"):
        text = atom.read_text()
        for m in hex_pat.findall(text):
            assert m.upper() in palette, f"{atom.name}: color {m} not in editorial palette"


# --- 260614-d3g: contrast hard-fail legend-fallback diagnostic suffix ---

LEGEND_SUFFIX = (
    "(nearest ancestor excluded by class=legend — remove "
    "class=legend from the chip rect if it is the actual background source)"
)


def _write_svg(tmp_path, name, body):
    p = tmp_path / name
    p.write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" '
        'viewBox="0 0 640 400">\n'
        '<title>contrast diagnostic fixture</title>\n'
        f'{body}\n</svg>\n'
    )
    return p


def _contrast_fails(result):
    return [f for f in result["hard_fails"] if f.startswith("contrast:")]


def test_contrast_legend_fallback_appends_diagnostic_suffix(tmp_path):
    """Low-contrast text whose nearest enclosing rect is class='legend' (so the
    background resolves by falling back past it) gets the actionable suffix."""
    # cream (#F4EFE6, a palette token) text sitting inside a lilac legend chip;
    # the chip is excluded from background detection, so bg falls back to canvas.
    svg = _write_svg(
        tmp_path, "legend-fallback.svg",
        '<rect class="legend" x="100" y="100" width="240" height="48" fill="#DCE0F0"/>\n'
        '<text x="116" y="128" font-size="14" fill="#F4EFE6">DEFINED</text>',
    )
    result = run.evaluate(svg, theme="editorial")
    fails = _contrast_fails(result)
    assert fails, f"expected a contrast hard-fail, got: {result['hard_fails']}"
    assert any(f.endswith(LEGEND_SUFFIX) for f in fails), (
        f"expected a contrast fail ending with the legend suffix, got: {fails}"
    )


def test_contrast_non_legend_has_no_diagnostic_suffix(tmp_path):
    """An identical low-contrast fail on a normal (non-legend) background carries
    NO legend suffix — the diagnostic is scoped to the legend-fallback case."""
    svg = _write_svg(
        tmp_path, "non-legend.svg",
        '<rect x="100" y="100" width="240" height="48" fill="#DCE0F0"/>\n'
        '<text x="116" y="128" font-size="14" fill="#F4EFE6">DEFINED</text>',
    )
    result = run.evaluate(svg, theme="editorial")
    fails = _contrast_fails(result)
    assert fails, f"expected a contrast hard-fail, got: {result['hard_fails']}"
    assert all("class=legend" not in f for f in fails), (
        f"non-legend contrast fail must not carry the legend suffix, got: {fails}"
    )
