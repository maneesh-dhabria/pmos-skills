# Folded MSF-wf — /wireframes-side mechanics

Loaded by `/wireframes` `#folded-msf-wf`. Shared folding mechanics — escape flag, tier
gating, auto-apply threshold, per-finding commits, failure capture + advisory continue,
output slugs — live in `_shared/folded-phase.md`; the reviewer input/validation contract
lives in `_shared/reviewer-protocol.md`. This file carries only what is specific to
folding `/msf-wf` over a *folder of N wireframe HTML files* instead of a single artifact.

## Reviewer dispatch (per wireframe)

`/msf-wf` reviews each wireframe HTML in the folder. Before passing each wireframe to a
reviewer subagent, chrome-strip it — loop over every `*.html` in the wireframes folder:

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/chrome-strip.js \
  {feature_folder}/wireframes/<NN>_<slug>.html > /tmp/msf-wf-<NN>-stripped.html
```

Each reviewer invocation (`model: sonnet` — rubric-guided review behind the parent's
deterministic quote validation) receives the stripped HTML inline with the canonical
template from `_shared/reviewer-protocol.md`: enumerate `sections_found` first, then
return findings shaped `{section_id, severity, message, quote: "<≥40-char verbatim>"}`.

## Parent-side validation — wireframes deltas

Validate per `_shared/reviewer-protocol.md` with two deltas:

1. **No `sections.json` set-equality check.** `/wireframes` does not emit per-wireframe
   `sections.json` companions (the html-artifacts migration excluded wireframes).
   `sections_found` is grounding evidence that the reviewer read the document — require
   it non-empty before accepting "no findings" — but it is not file-validated.
2. **Quote grounding stays hard.** Substring-grep every `quote` against the un-stripped
   source HTML. Any miss → hard-fail with
   `[/wireframes] reviewer msf-wf returned a quote not found in <NN>_<slug>.html`.

On any hard-fail, abort that wireframe's iteration and surface the failure to the user —
do NOT silently continue to the next wireframe.

## Per-wireframe pre-apply clobber guard

The substrate's guard (`_shared/folded-phase.md` § "Pre-apply clobber guard") runs once
per wireframe, not once per folder:

```bash
git status --porcelain {feature_folder}/wireframes/<NN>_<slug>.html
```

If non-empty, emit the substrate's WARNING (host = `/wireframes`, escape flag =
`--skip-folded-msf-wf`) and skip auto-apply **for that wireframe only** — fall through
to manual disposition, still run the critique and emit its findings doc. Clean sibling
wireframes proceed normally.

## Post-delegation verification

After `/msf-wf` returns:

1. Spot-check any wireframes it modified against `reference/eval-rubric.md` — do NOT
   trigger another `#review` loop.
2. Confirm `{feature_folder}/wireframes/msf-wf-findings/` exists and contains one
   `<wireframe-id>.md` per reviewed wireframe.

---

*Spec lineage: `2026-05-10_pipeline-consolidation` (folding contract, per-wireframe guard), `2026-05-09_html-artifacts` (chrome-strip input; wireframes excluded from `sections.json` emit), `2026-05-08_msf-skill-split` (findings slug). Mechanics extracted from the host SKILL.md per the 2026-06-10 skill-design review.*
