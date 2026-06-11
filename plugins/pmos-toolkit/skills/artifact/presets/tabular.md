---
name: tabular
description: Tables-by-default for any list-of-objects; short prose for narrative sections; honors per-section tabular_schema in templates
---

# Rendering rules

- **Honor `tabular_schema` from template.md.** When a section's guidance comment includes a `tabular_schema:` block, render the section as a table with EXACTLY those columns in that order. One row per the `row_per:` value. Never invent additional columns; never drop schema columns (use "—" for unknown values).
- For sections WITHOUT a `tabular_schema`, default behavior:
  - Lists of objects → table with inferred columns.
  - Narrative sections (Problem, User Journey, FAQ answers, TL;DR) → prose, no bullets.
  - Procedural lists (rollout phases, journey steps) → numbered bullets.
- Diagrams: text/ASCII preferred; Mermaid block when relationships matter.
- When a section has ≤2 items AND no schema, prose is fine — don't make a 2-row table.

# Voice

Baseline: `_shared/writing-principles.md`; the rules below override on conflict.

- Concise; same baseline as the Concise preset.
- Table cell content ≤8 words where possible.
- Use status emojis sparingly: ✅ ⚠️ ❌ — and only in dedicated status columns.
