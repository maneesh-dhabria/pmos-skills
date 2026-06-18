# Dogfood evidence — story 260617-xn4 (/summary-tldr --mode scaffold + mindmap)

## Mindmap mode, end-to-end (FR-B4)

`gen-mindmap-mode.mjs` exercises the exact Phase-7 mindmap data path on a real source's
keyfacts (the public W3C "WCAG 2 at a Glance" page — root=topic, branches=the four POUR
principles, leaves=their named requirements):

```
grounded keyfacts
  → scripts/mindmap-hierarchy.js   (normalize + floor-gate; §H)   → {id,label,children} tree
  → diagram/scripts/mindmap-layout.mjs --layout radial            → non-overlapping coords
  → editorial-themed SVG at computed coords                        → <slug>-mindmap.svg
  → validate (XML parses, theme bg present) → rsvg render          → <slug>-mindmap.png
```

Artifacts:
- `2026-06-17-wcag2-at-a-glance-mindmap.svg` — 17-node radial mindmap, editorial theme, 856×776.
- `2026-06-17-wcag2-at-a-glance-mindmap.png` — rendered proof (clean radial, no overlaps, curved connectors).
- `2026-06-17-wcag2-at-a-glance-mindmap.diagram.json` — sidecar (mode/layoutEngine/positions).

**The validate gate earned its keep:** the first emit had a raw `&` in the label
"Captions & audio" → the XML-parse validation (FR-B4) rejected it before save; escaping fixed
it. That is exactly the "validate the returned SVG before saving" discipline the SKILL.md requires.

## Narrative back-compat (FR-B2/INV6)

`mode==narrative` wraps today's behavior unchanged. The full suite (`tests/run.sh`, 25 checks)
stays green, including the static back-compat assertions (the canonical-text-first invariant, the
preserved `#diagram` add-on anchor, `--style` scoped to narrative).

## Graceful degradation (FR-B5/D11/D12)

Live: a sub-floor hierarchy (`{"topic":"X","branches":[{"label":"only"}]}`) exits 3 with
`degrade: too few key arguments for a useful mindmap (1 branch(es), need >= 2)` — the skill ships
the canonical text alone, never a fabricated map.

## Gates

- skill-eval `[D]` (`--target claude-code`): **EXIT 0**, no residuals.
- 4 repo lints (non-interactive-inline, audit-recommended, flags-vs-hints, phase-refs): **PASS**.
- comments-coverage: **PASS**.
- `tests/run.sh`: **25 passed, 0 failed**.
