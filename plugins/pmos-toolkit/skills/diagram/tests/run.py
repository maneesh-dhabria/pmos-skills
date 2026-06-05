#!/usr/bin/env python3
"""
/diagram --selftest runner.

Implements the deterministic eval from `eval/code-metrics.md`.
Runs golden + defect fixtures, diffs against snapshots, exits non-zero on any mismatch.

Usage:
    python3 run.py                    # run full corpus
    python3 run.py path/to/file.svg   # single-file eval (no diff)
    python3 run.py --update-snapshots # regenerate golden expected.json (USE CAUTIOUSLY)
"""
from __future__ import annotations

import json
import math
import pathlib
import re
import sys
import xml.etree.ElementTree as ET
from typing import Any

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML is required for theme-aware /diagram selftest.", file=sys.stderr)
    print("Install with: pip install pyyaml", file=sys.stderr)
    sys.exit(2)

try:
    from jsonschema import validate as _jsonschema_validate
except ImportError:
    print("ERROR: jsonschema is required for theme schema validation.", file=sys.stderr)
    print("Install with: pip install jsonschema", file=sys.stderr)
    sys.exit(2)

SVG_NS = "http://www.w3.org/2000/svg"
NSMAP = {"svg": SVG_NS}

PALETTE_KEYWORDS = {"none", "transparent", "context-stroke", "context-fill", "currentcolor"}

HERE = pathlib.Path(__file__).parent
GOLDEN_DIR = HERE / "golden"
DEFECTS_DIR = HERE / "defects"
THEMES_DIR = HERE.parent / "themes"
SCHEMA_PATH = THEMES_DIR / "_schema.json"


# ---------- Theme loading ----------

_THEME_CACHE: dict[str, dict] = {}


def load_theme(name: str) -> dict:
    """Load themes/<name>/theme.yaml, validate against _schema.json, return parsed dict.

    Raises FileNotFoundError if the theme directory or theme.yaml is missing.
    Raises jsonschema.ValidationError if the YAML fails schema validation.
    """
    if name in _THEME_CACHE:
        return _THEME_CACHE[name]
    theme_path = THEMES_DIR / name / "theme.yaml"
    if not theme_path.is_file():
        raise FileNotFoundError(f"theme not found: {theme_path}")
    theme = yaml.safe_load(theme_path.read_text())
    schema = json.loads(SCHEMA_PATH.read_text())
    _jsonschema_validate(theme, schema)
    _THEME_CACHE[name] = theme
    return theme


SIDECAR_SCHEMA_VERSION = 2


# ---------- Rubric prompt assembly ----------

# Stable IDs map to the 7 core rubric items. The mapping is fixed; theme files
# refer to these IDs by string. Kept in code (not config) because the IDs are
# part of the sidecar schema.
RUBRIC_CORE_ITEMS: list[dict[str, str]] = [
    {
        "id": "primary-emphasis",
        "title": "Primary node emphasis",
        "gating": "true",
        "prompt": "Is there exactly one visually-emphasized 'primary' node, distinguished by size OR weight OR position OR color (theme accent)?",
    },
    {
        "id": "clear-entry",
        "title": "Clear starting point",
        "gating": "true",
        "prompt": "Does the diagram have a clear starting point — top-left node for left-right flows, top-center for top-down hierarchies, an explicitly labeled start/input/user, or the primary node if it doubles as the entry?",
    },
    {
        "id": "legibility",
        "title": "Label legibility at 50% scale",
        "gating": "true",
        "prompt": "Is every text label fully legible at 50% raster scale (no clipping, no occlusion by other elements, no overlap with connectors)?",
    },
    {
        "id": "legend-coverage",
        "title": "Legend coverage",
        "gating": "true",
        "prompt": "Does each color used in the diagram appear in the legend with a clear meaning? Auto-pass when only ink plus at most one accent is used.",
    },
    {
        "id": "arrowhead-consistency",
        "title": "Arrowhead consistency",
        "gating": "true",
        "prompt": "Are arrowheads consistently directional? No mix of bidirectional and directional without a legend explanation; no connectors missing arrowheads where direction is implied.",
    },
    {
        "id": "style-atom-match",
        "title": "Style atoms match",
        "gating": "true",
        "prompt": "Does the diagram match the active theme's reference atoms (palette tokens, stroke weights, type scale, corner radii, edge label pill, legend block)?",
    },
    {
        "id": "visual-balance",
        "title": "Visual balance",
        "gating": "false",
        "prompt": "Advisory: is the largest empty quadrant ≤ 35% of canvas area AND the densest 25% region ≤ 60% of nodes?",
    },
]


WRAPPER_RUBRIC_ITEMS: list[dict[str, str]] = [
    {
        "id": "wrapper-typography-hierarchy",
        "title": "Typography hierarchy",
        "prompt": "Eyebrow, H1, lede, fig label, captions, and footer read in clear visual hierarchy with no two zones competing for the eye.",
    },
    {
        "id": "wrapper-text-fit",
        "title": "Text fit",
        "prompt": "No lede or caption text overflows its zone; line breaks fall on word boundaries; no clipped or truncated-without-ellipsis text.",
    },
    {
        "id": "wrapper-figure-proportion",
        "title": "Figure proportion",
        "prompt": "The diagram fills its zone without dominating the page or feeling lost; surrounding zones breathe.",
    },
    {
        "id": "wrapper-edge-padding",
        "title": "Edge padding",
        "prompt": "No element kisses the canvas edge or a zone boundary; margins are visually consistent top, bottom, left, right.",
    },
]


def build_wrapper_rubric_prompt() -> str:
    """Materialize the slim 4-item wrapper rubric prompt.

    Single pass, no refinement loop. Run inline regardless of --rigor.
    """
    lines: list[str] = []
    lines.append("# Wrapper rubric (Phase 6b — single pass, ship-with-warning on fail)")
    lines.append("")
    lines.append("Score each item pass|fail with one-sentence concrete evidence (zone names,")
    lines.append("pixel coords, label text). Do NOT speculate. Output JSON only:")
    lines.append("{")
    lines.append('  "wrapper_items": {')
    lines.append('    "wrapper-typography-hierarchy": {"verdict": "pass|fail", "evidence": "..."},')
    lines.append("    ...")
    lines.append("  },")
    lines.append('  "wrapper_blocker_count": <count of failing items>')
    lines.append("}")
    lines.append("")
    for item in WRAPPER_RUBRIC_ITEMS:
        lines.append(f"## `{item['id']}` — {item['title']}")
        lines.append(f"> {item['prompt']}")
        lines.append("")
    return "\n".join(lines)


def build_rubric_prompt(theme: dict) -> str:
    """Materialize the reviewer prompt for the given theme.

    Iterates RUBRIC_CORE_ITEMS, skipping any whose id is in
    theme.rubricOverrides.waive, and appends each entry from
    theme.rubricOverrides.add (each: {id, prompt, evidenceHint}).
    """
    overrides = theme.get("rubricOverrides", {}) or {}
    waive = set(overrides.get("waive") or [])
    add = list(overrides.get("add") or [])

    lines: list[str] = []
    lines.append(f"# Vision rubric for theme: {theme.get('displayName') or theme.get('name')}")
    lines.append("")
    lines.append("Return JSON keyed by stable item ID. For each item: pass|fail with one-")
    lines.append("sentence concrete evidence (coords, label text, named element, or quadrant).")
    lines.append("")

    for item in RUBRIC_CORE_ITEMS:
        if item["id"] in waive:
            continue
        gating = "GATING" if item["gating"] == "true" else "ADVISORY"
        lines.append(f"## `{item['id']}` — {item['title']} ({gating})")
        lines.append(f"> {item['prompt']}")
        lines.append("")

    if add:
        lines.append("## Theme add-items (gating)")
        lines.append("")
        for entry in add:
            lines.append(f"### `{entry['id']}`")
            lines.append(f"> {entry['prompt']}")
            hint = entry.get("evidenceHint")
            if hint:
                lines.append(f"_Evidence hint: {hint}_")
            lines.append("")

    return "\n".join(lines)


def read_sidecar(path: str | pathlib.Path) -> dict | None:
    """Read a v2 sidecar JSON. Returns None if missing or schemaVersion != 2.

    v1 sidecars are intentionally ignored (treated as absent) per the v2 policy.
    Newer-than-v2 sidecars raise ValueError so callers can surface the version mismatch.
    """
    p = pathlib.Path(path)
    if not p.is_file():
        return None
    try:
        data = json.loads(p.read_text())
    except json.JSONDecodeError:
        return None
    sv = data.get("schemaVersion")
    if sv == SIDECAR_SCHEMA_VERSION:
        return data
    if isinstance(sv, int) and sv > SIDECAR_SCHEMA_VERSION:
        raise ValueError(
            f"sidecar at {p} was written by a newer /diagram "
            f"(schemaVersion {sv}). Upgrade the skill or use a different --out path."
        )
    return None  # v1 or unknown — treat as absent


def write_sidecar(path: str | pathlib.Path, payload: dict) -> None:
    """Write a v2 sidecar to `path`. Stamps schemaVersion if absent."""
    p = pathlib.Path(path)
    payload = dict(payload)
    payload.setdefault("schemaVersion", SIDECAR_SCHEMA_VERSION)
    p.write_text(json.dumps(payload, indent=2) + "\n")


def build_palette_set(theme: dict) -> set[str]:
    """Build the union of allowed hex colors for the given theme.

    Includes ink, inkMuted, warn, surface, surfaceMuted, every accent hex, and
    every categoryChip hex. All values upper-cased for set comparison.
    """
    pal = theme["palette"]
    surf = theme.get("surface", {})
    out: set[str] = set()
    for key in ("ink", "inkMuted", "warn", "surface", "surfaceMuted"):
        v = pal.get(key)
        if v:
            out.add(v.upper())
    for key in ("background", "muted", "containerStrokeColor"):
        v = surf.get(key)
        if v:
            out.add(v.upper())
    for accent in pal.get("accents", []):
        out.add(accent["hex"].upper())
    for chip in pal.get("categoryChips", []):
        out.add(chip["hex"].upper())
    return out


# ---------- Affine matrix helpers ----------

def identity():
    return (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)  # a, b, c, d, e, f for (a c e / b d f / 0 0 1)

def matmul(m1, m2):
    a1, b1, c1, d1, e1, f1 = m1
    a2, b2, c2, d2, e2, f2 = m2
    return (
        a1 * a2 + c1 * b2,
        b1 * a2 + d1 * b2,
        a1 * c2 + c1 * d2,
        b1 * c2 + d1 * d2,
        a1 * e2 + c1 * f2 + e1,
        b1 * e2 + d1 * f2 + f1,
    )

def apply(m, x, y):
    a, b, c, d, e, f = m
    return (a * x + c * y + e, b * x + d * y + f)

_NUM = r"-?\d+(?:\.\d+)?"

def parse_transform(s: str | None):
    if not s:
        return identity()
    out = identity()
    for fn, args in re.findall(r"(\w+)\s*\(([^)]+)\)", s):
        nums = [float(n) for n in re.findall(_NUM, args)]
        if fn == "translate":
            tx = nums[0]
            ty = nums[1] if len(nums) > 1 else 0.0
            out = matmul(out, (1, 0, 0, 1, tx, ty))
        elif fn == "scale":
            sx = nums[0]
            sy = nums[1] if len(nums) > 1 else sx
            out = matmul(out, (sx, 0, 0, sy, 0, 0))
        elif fn == "rotate":
            deg = nums[0]
            cx = nums[1] if len(nums) > 2 else 0.0
            cy = nums[2] if len(nums) > 2 else 0.0
            r = math.radians(deg)
            cos, sin = math.cos(r), math.sin(r)
            if cx or cy:
                out = matmul(out, (1, 0, 0, 1, cx, cy))
                out = matmul(out, (cos, sin, -sin, cos, 0, 0))
                out = matmul(out, (1, 0, 0, 1, -cx, -cy))
            else:
                out = matmul(out, (cos, sin, -sin, cos, 0, 0))
        else:
            # matrix(...) and skew flagged by caller.
            return None
    return out


# ---------- CSS class lookup ----------

def parse_styles(root) -> dict[str, dict[str, str]]:
    styles: dict[str, dict[str, str]] = {}
    for style_el in root.iter(f"{{{SVG_NS}}}style"):
        text = style_el.text or ""
        for cls, body in re.findall(r"\.([\w-]+)\s*\{([^}]*)\}", text):
            attrs = {}
            for prop, val in re.findall(r"([\w-]+)\s*:\s*([^;]+)", body):
                attrs[prop.strip()] = val.strip()
            styles[cls] = attrs
    return styles


def resolve_attr(el, attr: str, styles: dict[str, dict[str, str]], inherited: dict[str, str]):
    """Inline > class > inherited."""
    inline = el.get(attr)
    if inline is not None:
        return inline
    cls = el.get("class")
    if cls:
        for c in cls.split():
            if c in styles and attr in styles[c]:
                return styles[c][attr]
    return inherited.get(attr)


# ---------- Walk with context ----------

def walk(root):
    """Yield (element, absolute_transform, inherited_attrs, path_classes)."""
    def _walk(el, m, inh, path_cls):
        local_t = parse_transform(el.get("transform"))
        if local_t is None:
            yield ("__unsupported_transform__", el, None, None, None)
            return
        cur_m = matmul(m, local_t)
        cur_inh = dict(inh)
        for k in ("font-size", "font-weight", "fill", "stroke", "stroke-width"):
            v = el.get(k)
            if v is not None:
                cur_inh[k] = v
        cur_path_cls = list(path_cls)
        cls = el.get("class")
        if cls:
            cur_path_cls.extend(cls.split())
        yield (el.tag, el, cur_m, cur_inh, cur_path_cls)
        for child in el:
            yield from _walk(child, cur_m, cur_inh, cur_path_cls)
    return _walk(root, identity(), {}, [])


# ---------- Geometry ----------

def rect_overlap(a, b, tol=0.0):
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    return not (ax + aw <= bx + tol or bx + bw <= ax + tol or ay + ah <= by + tol or by + bh <= ay + tol)

def segs_intersect(p1, p2, p3, p4):
    def ccw(a, b, c):
        return (c[1] - a[1]) * (b[0] - a[0]) - (b[1] - a[1]) * (c[0] - a[0])
    d1 = ccw(p3, p4, p1); d2 = ccw(p3, p4, p2)
    d3 = ccw(p1, p2, p3); d4 = ccw(p1, p2, p4)
    if ((d1 > 0 and d2 < 0) or (d1 < 0 and d2 > 0)) and ((d3 > 0 and d4 < 0) or (d3 < 0 and d4 > 0)):
        return True
    return False

def seg_rect_intersects(p1, p2, rect):
    x, y, w, h = rect
    corners = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
    edges = [(corners[i], corners[(i + 1) % 4]) for i in range(4)]
    for e1, e2 in edges:
        if segs_intersect(p1, p2, e1, e2):
            return True
    # Endpoint inside?
    for px, py in (p1, p2):
        if x <= px <= x + w and y <= py <= y + h:
            return True
    return False


def luminance(hex_color: str) -> float:
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    r, g, b = (int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))
    def lin(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

def contrast_ratio(c1: str, c2: str) -> float:
    l1, l2 = luminance(c1), luminance(c2)
    lo, hi = sorted((l1, l2))
    return (hi + 0.05) / (lo + 0.05)


# ---------- Element classification ----------

def has_legend_class(path_cls):
    return any(c in {"legend", "edge-label", "edge-pill"} for c in path_cls)


def is_chrome_class(path_cls):
    """Backdrop / outer container rects are not nodes — themes use them for theme-level
    chrome (e.g., editorial's dashed boundary or a cream surface backdrop). Mark with
    class='bg' or class='container' to opt out of node-occlusion checks."""
    return any(c in {"bg", "container", "backdrop", "chrome"} for c in path_cls)


def in_defs(el, defs_set):
    return el in defs_set


def collect_defs(root):
    out = set()
    for defs in root.iter(f"{{{SVG_NS}}}defs"):
        for descendant in defs.iter():
            out.add(descendant)
    return out


# ---------- Main evaluation ----------

def check_caption_colors_in_diagram(svg_text_or_path) -> tuple[bool, str]:
    """Verify every caption-rule stroke inside `<g id=zone-captions>` appears as
    a fill/stroke color inside `<g id=zone-diagram>`. Surface tokens and
    ink-muted are excluded from the requirement.

    Returns (ok, reason). Used by the infographic eval pipeline.
    """
    if isinstance(svg_text_or_path, (str, pathlib.Path)) and pathlib.Path(svg_text_or_path).is_file():
        svg_text = pathlib.Path(svg_text_or_path).read_text()
    else:
        svg_text = str(svg_text_or_path)

    # Extract the zone-diagram block
    diag_match = re.search(r'<g\s+id="zone-diagram"[^>]*>(.*?)</g>\s*<g\s+id="zone-(?:legend|captions|footer)"',
                           svg_text, flags=re.DOTALL)
    if not diag_match:
        # Fall back to anything between zone-diagram and end of svg
        diag_match = re.search(r'<g\s+id="zone-diagram"[^>]*>(.*?)</svg>', svg_text, flags=re.DOTALL)
    diag_block = diag_match.group(1) if diag_match else ""

    cap_match = re.search(r'<g\s+id="zone-captions"[^>]*>(.*?)</g>\s*<g\s+id="zone-footer"',
                          svg_text, flags=re.DOTALL)
    if not cap_match:
        cap_match = re.search(r'<g\s+id="zone-captions"[^>]*>(.*?)</svg>', svg_text, flags=re.DOTALL)
    cap_block = cap_match.group(1) if cap_match else ""

    if not cap_block:
        return True, ""  # no captions to validate

    diagram_colors = {h.upper() for h in re.findall(r"#[0-9A-Fa-f]{6}", diag_block)}

    # Captions: collect strokes from elements with class="caption-rule"
    caption_strokes: set[str] = set()
    for m in re.finditer(r'class="caption-rule"[^>]*stroke="(#[0-9A-Fa-f]{6})"', cap_block):
        caption_strokes.add(m.group(1).upper())
    # Also handle stroke before class
    for m in re.finditer(r'stroke="(#[0-9A-Fa-f]{6})"[^>]*class="caption-rule"', cap_block):
        caption_strokes.add(m.group(1).upper())

    # Tolerated absences: ink-muted + surface tokens (caption-rule may legitimately use these in ordinal mode)
    excluded = {"#475569", "#FFFFFF", "#F4F5F7", "#F4EFE6", "#9CA3AF"}
    bad = [c for c in caption_strokes if c not in diagram_colors and c not in excluded]
    if bad:
        return False, (
            f"caption-color-not-in-diagram: caption rule(s) use {sorted(bad)} "
            f"but those colors are absent from the diagram interior"
        )
    return True, ""


def check_role_style_consistency(
    svg_path: str | pathlib.Path,
    sidecar_path: str | pathlib.Path,
) -> tuple[bool, str]:
    """For each role with ≥ 2 edges, all edges' (stroke, dasharray, tag) tuples
    must be identical. Sidecar `relationships[]._svgId` keys are looked up in the
    SVG via element id. Returns (ok, reason).
    """
    svg_path = pathlib.Path(svg_path)
    sidecar_path = pathlib.Path(sidecar_path)
    if not sidecar_path.is_file():
        return True, ""
    sidecar = json.loads(sidecar_path.read_text())
    rels = sidecar.get("relationships") or []
    role_to_ids: dict[str, list[str]] = {}
    for rel in rels:
        role = rel.get("role")
        sid = rel.get("_svgId")
        if not role or not sid:
            continue
        role_to_ids.setdefault(role, []).append(sid)

    if not role_to_ids:
        return True, ""

    tree = ET.parse(svg_path)
    root = tree.getroot()
    by_id: dict[str, ET.Element] = {}
    for el in root.iter():
        eid = el.get("id")
        if eid:
            by_id[eid] = el

    def edge_signature(el: ET.Element) -> tuple[str, str, str]:
        tag = el.tag.split("}")[-1] if "}" in el.tag else el.tag
        stroke = (el.get("stroke") or "").upper()
        dash = el.get("stroke-dasharray") or ""
        return (tag, stroke, dash)

    for role, ids in role_to_ids.items():
        if len(ids) < 2:
            continue
        sigs: list[tuple[str, tuple[str, str, str]]] = []
        for sid in ids:
            el = by_id.get(sid)
            if el is None:
                return False, f"role-style-consistency: role '{role}' references missing svgId '{sid}'"
            sigs.append((sid, edge_signature(el)))
        first_sig = sigs[0][1]
        for sid, sig in sigs[1:]:
            if sig != first_sig:
                return False, (
                    f"role-style-consistency: role '{role}' edge {sigs[0][0]} "
                    f"uses {first_sig}, edge {sid} uses {sig}; expected one style per role"
                )
    return True, ""


def evaluate(svg_path: str | pathlib.Path, theme: str = "technical") -> dict[str, Any]:
    svg_path = pathlib.Path(svg_path)
    theme_dict = load_theme(theme)
    palette = build_palette_set(theme_dict)
    tree = ET.parse(svg_path)
    root = tree.getroot()
    styles = parse_styles(root)
    defs_set = collect_defs(root)
    hard_fails: list[str] = []
    diagnostics: dict[str, Any] = {"off_grid_coords": []}

    # Role-style-consistency hard-fail (themes with mixingPermitted: true only)
    sidecar_path = svg_path.with_suffix(".diagram.json")
    if theme_dict["connectors"].get("mixingPermitted"):
        ok, reason = check_role_style_consistency(svg_path, sidecar_path)
        if not ok:
            hard_fails.append(reason)

    # Caption-color-not-in-diagram hard-fail (infographic mode only)
    if sidecar_path.is_file():
        try:
            sidecar_data = json.loads(sidecar_path.read_text())
            if sidecar_data.get("mode") == "infographic":
                ok2, reason2 = check_caption_colors_in_diagram(svg_path)
                if not ok2:
                    hard_fails.append(reason2)
        except json.JSONDecodeError:
            pass

    # Collect title
    title_el = root.find(f"{{{SVG_NS}}}title")
    diagnostics["title"] = title_el.text if title_el is not None else None

    # Elements w/ context
    items = list(walk(root))
    for entry in items:
        if entry[0] == "__unsupported_transform__":
            hard_fails.append("transform: unsupported (e.g. matrix/skew) — use translate/scale/rotate only")

    nodes: list[dict[str, Any]] = []        # [{id, bbox, el}]
    connectors: list[dict[str, Any]] = []   # [{waypoints, el}]
    text_records: list[dict[str, Any]] = [] # [{x, y, text, font_size, fill, el}]
    coords_for_grid: list[tuple[str, float, float]] = []  # (label, x, y)
    palette_violations: list[str] = []

    canvas_height = float(root.get("height", "800"))
    canvas_width = float(root.get("width", "1280"))
    canvas_fill = "#FFFFFF"

    for tag, el, m, inh, path_cls in items:
        if tag == "__unsupported_transform__" or m is None:
            continue
        if in_defs(el, defs_set):
            continue
        local_tag = tag.split("}")[-1] if "}" in tag else tag

        # palette + stroke checks for any visual element
        for attr in ("fill", "stroke"):
            val = resolve_attr(el, attr, styles, inh)
            if val is None:
                continue
            v = val.strip()
            vl = v.lower()
            if vl in PALETTE_KEYWORDS:
                continue
            if v.startswith("url(") or v.startswith("var("):
                continue
            if not v.startswith("#"):
                # We don't allow named colors or rgb()
                palette_violations.append(f"{attr}={v} on <{local_tag}>")
                continue
            if v.upper() not in palette:
                palette_violations.append(f"{attr}={v} on <{local_tag}>")

        # Collect coords for grid-snap
        for k in ("x", "y", "x1", "y1", "x2", "y2", "cx", "cy"):
            raw = el.get(k)
            if raw is None:
                continue
            try:
                val = float(raw)
            except ValueError:
                continue
            # Apply transform's translation only for grid-snap accounting
            if k in ("x", "x1", "x2", "cx"):
                px, _ = apply(m, val, 0.0)
            else:
                _, px = apply(m, 0.0, val)
            coords_for_grid.append((f"<{local_tag}>@{k}={raw}", val, m[4 if k in ('x','x1','x2','cx') else 5]))

        # NODE detection
        if local_tag in ("rect", "circle", "ellipse") and not has_legend_class(path_cls) and not is_chrome_class(path_cls):
            try:
                if local_tag == "rect":
                    x = float(el.get("x", 0)); y = float(el.get("y", 0))
                    w = float(el.get("width", 0)); h = float(el.get("height", 0))
                    if w <= 0 or h <= 0:
                        continue
                elif local_tag == "circle":
                    cx = float(el.get("cx", 0)); cy = float(el.get("cy", 0))
                    r = float(el.get("r", 0))
                    if r <= 0:
                        continue
                    x, y, w, h = cx - r, cy - r, 2 * r, 2 * r
                else:  # ellipse
                    cx = float(el.get("cx", 0)); cy = float(el.get("cy", 0))
                    rx = float(el.get("rx", 0)); ry = float(el.get("ry", 0))
                    if rx <= 0 or ry <= 0:
                        continue
                    x, y, w, h = cx - rx, cy - ry, 2 * rx, 2 * ry
                # Apply translation portion of transform (we don't support scaled nodes here)
                x += m[4]; y += m[5]
                nodes.append({"bbox": (x, y, w, h), "el": el, "tag": local_tag,
                              "id": el.get("id", f"{local_tag}@{x},{y}")})
            except ValueError:
                continue

        # CONNECTOR detection
        marker_end = el.get("marker-end") or inh.get("marker-end")
        marker_start = el.get("marker-start") or inh.get("marker-start")
        is_connector = bool(marker_end or marker_start) and local_tag in ("line", "path", "polyline")
        if is_connector:
            waypoints: list[tuple[float, float]] = []
            if local_tag == "line":
                x1 = float(el.get("x1", 0)); y1 = float(el.get("y1", 0))
                x2 = float(el.get("x2", 0)); y2 = float(el.get("y2", 0))
                waypoints = [apply(m, x1, y1), apply(m, x2, y2)]
            elif local_tag == "polyline":
                pts = re.findall(_NUM, el.get("points", ""))
                pairs = list(zip(pts[0::2], pts[1::2]))
                waypoints = [apply(m, float(px), float(py)) for px, py in pairs]
            elif local_tag == "path":
                d = el.get("d", "")
                cur = (0.0, 0.0)
                cmds = re.findall(r"([MLHVZmlhvz])\s*([^MLHVZmlhvz]*)", d)
                for cmd, rest in cmds:
                    nums = [float(n) for n in re.findall(_NUM, rest)]
                    if cmd == "M":
                        if len(nums) < 2:
                            continue
                        cur = (nums[0], nums[1])
                        waypoints.append(apply(m, *cur))
                        for i in range(2, len(nums) - 1, 2):
                            cur = (nums[i], nums[i + 1])
                            waypoints.append(apply(m, *cur))
                    elif cmd == "L":
                        for i in range(0, len(nums) - 1, 2):
                            cur = (nums[i], nums[i + 1])
                            waypoints.append(apply(m, *cur))
                    elif cmd == "H":
                        for x in nums:
                            cur = (x, cur[1])
                            waypoints.append(apply(m, *cur))
                    elif cmd == "V":
                        for y in nums:
                            cur = (cur[0], y)
                            waypoints.append(apply(m, *cur))
                    elif cmd in ("Z", "z"):
                        pass
                    else:
                        # unsupported (curves) — sample endpoints only via diagnostic
                        diagnostics.setdefault("path_unsupported", []).append(cmd)
            if len(waypoints) >= 2:
                connectors.append({"waypoints": waypoints, "el": el})

        # TEXT records
        if local_tag == "text":
            x = float(el.get("x", 0)); y = float(el.get("y", 0))
            ax, ay = apply(m, x, y)
            fs_raw = resolve_attr(el, "font-size", styles, inh) or "16"
            try:
                fs = int(re.sub(r"[^\d.]", "", fs_raw).split(".")[0]) if fs_raw else 16
            except ValueError:
                fs = 16
            fill = resolve_attr(el, "fill", styles, inh) or "#0F172A"
            txt = "".join(el.itertext()).strip()
            text_records.append({"x": ax, "y": ay, "text": txt, "font_size": fs, "fill": fill, "el": el})

    # ---------- Hard fails ----------

    # palette
    for v in palette_violations:
        hard_fails.append(f"palette: {v}")

    # node-occlusion
    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            if rect_overlap(nodes[i]["bbox"], nodes[j]["bbox"], tol=-0.01):
                hard_fails.append(f"node-occlusion: {nodes[i]['id']} overlaps {nodes[j]['id']}")

    # edge tunnels
    SNAP = 8.0
    for c in connectors:
        wps = c["waypoints"]
        endpoints = (wps[0], wps[-1])
        endpoint_node_ids = set()
        for ep in endpoints:
            for n in nodes:
                x, y, w, h = n["bbox"]
                if (x - SNAP <= ep[0] <= x + w + SNAP) and (y - SNAP <= ep[1] <= y + h + SNAP):
                    endpoint_node_ids.add(n["id"])
        for i in range(len(wps) - 1):
            seg = (wps[i], wps[i + 1])
            for n in nodes:
                if n["id"] in endpoint_node_ids:
                    continue
                if seg_rect_intersects(seg[0], seg[1], n["bbox"]):
                    hard_fails.append(f"edge-tunnel: connector passes through {n['id']}")
                    break

    # min font
    if text_records:
        min_fs = min(t["font_size"] for t in text_records)
        diagnostics["min_font_size"] = min_fs
        if min_fs < 12:
            hard_fails.append(f"font: min size {min_fs}px below 12px floor")
    else:
        diagnostics["min_font_size"] = None

    # contrast
    for t in text_records:
        if not t["fill"].startswith("#"):
            continue
        fill = t["fill"].upper()
        if fill not in palette:
            continue  # already caught by palette check
        # Find smallest enclosing node bbox; default canvas
        bg = canvas_fill
        smallest_area = float("inf")
        for n in nodes:
            x, y, w, h = n["bbox"]
            if x <= t["x"] <= x + w and y <= t["y"] <= y + h and (w * h) < smallest_area:
                node_fill = n["el"].get("fill")
                if not node_fill:
                    cls = n["el"].get("class") or ""
                    for c in cls.split():
                        if c in styles and "fill" in styles[c]:
                            node_fill = styles[c]["fill"]
                            break
                if node_fill and node_fill.upper() in palette:
                    bg = node_fill.upper()
                    smallest_area = w * h
        ratio = contrast_ratio(fill, bg)
        floor = 4.5 if t["font_size"] < 16 else 3.0
        if ratio < floor:
            hard_fails.append(
                f"contrast: text '{t['text'][:24]}' fill={fill} on {bg} ratio={ratio:.2f}:1 < {floor}:1"
            )

    # node count hard-fail
    n_nodes = len(nodes)
    diagnostics["node_count"] = n_nodes
    if n_nodes > 30:
        hard_fails.append(f"node-count: {n_nodes} nodes exceeds maximum 30")

    # ---------- Soft metrics ----------

    # edge crossings
    crossings = 0
    n_conn = len(connectors)
    for i in range(n_conn):
        for j in range(i + 1, n_conn):
            wi = connectors[i]["waypoints"]
            wj = connectors[j]["waypoints"]
            for a in range(len(wi) - 1):
                for b in range(len(wj) - 1):
                    p1, p2 = wi[a], wi[a + 1]
                    p3, p4 = wj[b], wj[b + 1]
                    if {p1, p2} & {p3, p4}:
                        continue  # shared endpoint
                    if segs_intersect(p1, p2, p3, p4):
                        crossings += 1
    max_crossings = max(1, n_conn * (n_conn - 1) // 2)
    edge_crossings_score = max(0.0, 1.0 - crossings / max_crossings)
    diagnostics["edge_crossings_count"] = crossings

    # grid snap — check x,y,cx,cy,etc. (we already collected raw values; check post-translate)
    snapped = total = 0
    for label, val, translate_amt in coords_for_grid:
        absval = val + translate_amt
        total += 1
        if absval == int(absval) and int(absval) % 4 == 0:
            snapped += 1
        else:
            diagnostics["off_grid_coords"].append(f"{label} (abs={absval})")
    grid_snap_score = (snapped / total) if total else 1.0

    # node count soft
    if n_nodes <= 12:
        node_count_score = 1.0
    elif n_nodes <= 20:
        node_count_score = 0.7
    elif n_nodes <= 30:
        node_count_score = 0.4
    else:
        node_count_score = 0.0

    # angular resolution (only if any node has degree >=3)
    incident: dict[str, list[tuple[float, float]]] = {n["id"]: [] for n in nodes}
    for c in connectors:
        wps = c["waypoints"]
        for ep_idx, ep in ((0, wps[0]), (-1, wps[-1])):
            for n in nodes:
                x, y, w, h = n["bbox"]
                if (x - SNAP <= ep[0] <= x + w + SNAP) and (y - SNAP <= ep[1] <= y + h + SNAP):
                    nbr = wps[1] if ep_idx == 0 else wps[-2]
                    dx, dy = nbr[0] - ep[0], nbr[1] - ep[1]
                    if dx == 0 and dy == 0:
                        continue
                    incident[n["id"]].append((dx, dy))
                    break
    high_degree = {nid: dirs for nid, dirs in incident.items() if len(dirs) >= 3}
    if high_degree:
        per_node = []
        for nid, dirs in high_degree.items():
            angles = sorted(math.degrees(math.atan2(dy, dx)) % 360 for dx, dy in dirs)
            gaps = [(angles[(i + 1) % len(angles)] - angles[i]) % 360 for i in range(len(angles))]
            min_gap = min(g if g != 0 else 360 for g in gaps)
            ideal = 360.0 / len(dirs)
            per_node.append(min(1.0, min_gap / ideal))
        angular_score: float | None = sum(per_node) / len(per_node)
    else:
        angular_score = None

    soft_metrics = {
        "edge_crossings": round(edge_crossings_score, 4),
        "grid_snap": round(grid_snap_score, 4),
        "node_count": round(node_count_score, 4),
    }
    if angular_score is not None:
        soft_metrics["angular_resolution"] = round(angular_score, 4)

    code_score = round(sum(soft_metrics.values()) / len(soft_metrics), 4)

    return {
        "code_score": code_score,
        "hard_fails": hard_fails,
        "soft_metrics": soft_metrics,
        "diagnostics": diagnostics,
    }


# ---------- Selftest harness ----------

def _iter_corpus(base_dir: pathlib.Path) -> list[tuple[pathlib.Path, str]]:
    """Yield (svg_path, theme_name) for every fixture under base_dir.

    Top-level *.svg → theme=technical (default).
    base_dir/<theme>/*.svg → theme=<theme> (Phase 2+).
    """
    out: list[tuple[pathlib.Path, str]] = []
    for svg in sorted(base_dir.glob("*.svg")):
        out.append((svg, "technical"))
    for sub in sorted(base_dir.iterdir()) if base_dir.is_dir() else []:
        if sub.is_dir():
            for svg in sorted(sub.glob("*.svg")):
                out.append((svg, sub.name))
    return out


def run_corpus(update_snapshots: bool = False) -> int:
    failures: list[str] = []

    print("=" * 64)
    print("GOLDEN")
    print("=" * 64)
    for svg, theme_name in _iter_corpus(GOLDEN_DIR):
        result = evaluate(svg, theme=theme_name)
        snap = svg.with_suffix(".expected.json")
        actual = {
            "code_score": result["code_score"],
            "hard_fails": result["hard_fails"],
            "soft_metrics": result["soft_metrics"],
        }
        if update_snapshots:
            snap.write_text(json.dumps(actual, indent=2) + "\n")
            print(f"  WROTE  {svg.name}")
            continue
        if not snap.exists():
            failures.append(f"{svg.name}: missing snapshot {snap.name}")
            print(f"  MISS   {svg.name}")
            continue
        expected = json.loads(snap.read_text())
        if actual != expected:
            failures.append(f"{svg.name}: snapshot mismatch")
            print(f"  FAIL   {svg.name}")
            print(f"         expected: {json.dumps(expected)}")
            print(f"         actual:   {json.dumps(actual)}")
        elif result["hard_fails"]:
            failures.append(f"{svg.name}: golden has hard_fails: {result['hard_fails']}")
            print(f"  FAIL   {svg.name} (golden produced hard_fails)")
        else:
            print(f"  PASS   {svg.name}  score={result['code_score']}")

    print()
    print("=" * 64)
    print("DEFECTS")
    print("=" * 64)
    DEFECT_EXPECT = {
        "node-overlap":             ("hard", "node-occlusion"),
        "edge-tunnel":              ("hard", "edge-tunnel"),
        "font-too-small":           ("hard", "font:"),
        "low-contrast":             ("hard", "contrast:"),
        "palette-violation":        ("hard", "palette:"),
        "off-grid":                 ("soft", "grid_snap"),
        "over-30-nodes":            ("hard", "node-count:"),
        "mixed-reading-direction":  ("vision", None),  # not detectable by code; documented
        "crossing-storm":           ("soft", "edge_crossings"),
        "arrowhead-inconsistent":   ("vision", None),  # not detectable by code; documented
        "cream-but-mixed-connectors-within-one-role": ("hard", "role-style-consistency"),
        "eyebrow-not-uppercase":    ("vision", None),  # editorial-specific vision check
        "infographic-caption-color-not-in-diagram": ("hard", "caption-color-not-in-diagram"),
    }
    for svg, theme_name in _iter_corpus(DEFECTS_DIR):
        stem = svg.stem
        expectation = DEFECT_EXPECT.get(stem)
        result = evaluate(svg, theme=theme_name)
        if expectation is None:
            failures.append(f"{svg.name}: no expectation in DEFECT_EXPECT")
            print(f"  ?     {svg.name} (unmapped)")
            continue
        kind, needle = expectation
        if kind == "hard":
            ok = any(needle in hf for hf in result["hard_fails"])
            status = "PASS" if ok else "FAIL"
            if not ok:
                failures.append(f"{svg.name}: expected hard-fail containing '{needle}', got {result['hard_fails']}")
            print(f"  {status}  {svg.name}  hard_fails={result['hard_fails']}")
        elif kind == "soft":
            score = result["soft_metrics"].get(needle, 1.0)
            ok = score < 0.95
            status = "PASS" if ok else "FAIL"
            if not ok:
                failures.append(f"{svg.name}: expected soft metric '{needle}' < 0.95, got {score}")
            print(f"  {status}  {svg.name}  {needle}={score}")
        elif kind == "vision":
            print(f"  SKIP  {svg.name}  (vision-only defect; not gated by code metrics)")

    print()
    print("=" * 64)
    if failures:
        print(f"FAIL — {len(failures)} issue(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS — all fixtures match snapshots and defect expectations")
    return 0


# ---------- CLI ----------

def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(run_corpus())
    if args[0] == "--update-snapshots":
        sys.exit(run_corpus(update_snapshots=True))
    if args[0].startswith("-"):
        print(f"unknown flag: {args[0]}", file=sys.stderr)
        sys.exit(2)
    # Single-file mode
    print(json.dumps(evaluate(args[0]), indent=2))


if __name__ == "__main__":
    main()
