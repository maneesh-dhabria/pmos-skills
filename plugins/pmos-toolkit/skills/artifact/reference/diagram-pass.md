# diagram-pass.md — the inline-diagram stage

The diagram stage that runs in `/artifact`'s create flow at **Phase 3.7**, gated on `{depth} == deep` (or the saved `artifact.diagram_pass` project preference). It proposes diagrams, generates them via `/diagram`, validates each, and inserts them inline — never blind-inserting. Cited by `SKILL.md` Phase 3.7; single source for the contract.

## Contents

- [When this runs](#when-this-runs)
- [Step A — Propose](#step-a--propose)
- [Step B — Generate](#step-b--generate)
- [Step C — Validate before insert](#step-c--validate-before-insert)
- [Step D — Insert + remember preference](#step-d--insert--remember-preference)
- [Non-interactive degradation](#non-interactive-degradation)

## When this runs

When `{depth} == deep`, OR `.pmos/settings.yaml :: artifact.diagram_pass == true` (the remembered preference, which also enables it at `standard`). After the persona panel (Phase 3.5), before `/polish` (3.8). Skipped at `brief`, and on `refine`/`update`.

## Step A — Propose

Scan the draft for concepts a diagram would clarify (a flow, an architecture, a state machine, a hierarchy). Propose **1–3** candidates, each: `{type, what-it-clarifies, target section id}`. Present via `AskUserQuestion` (multiSelect):

```
question: "Add any of these diagrams? (each is generated, validated, then inlined)"
options:                      # multiSelect: true
  - <diagram 1 — type @ section> (Recommended)   # the single highest-value one
  - <diagram 2 — type @ section>
  - <diagram 3 — type @ section>
```

The single highest-value diagram carries `(Recommended)`. Zero selected → skip the stage, log `diagram: none selected`.

## Step B — Generate

The **main agent** (not a subagent — skills can't be invoked by subagents) invokes `/diagram` once per selected diagram, sequentially:

```
/pmos-toolkit:diagram "<concept description>" \
  --source <draft excerpt for that section> \
  --out <feature_folder>/assets/diagrams/<n>.svg \
  --non-interactive --on-failure drop --theme technical
```

The description **must mandate a full-viewBox background `<rect fill="#fbfaf6">` as the first drawn child** (dark-mode safety, per the 2026-05-28 /primer learning) — inline SVGs without it render unreadable on dark-mode pages.

## Step C — Validate before insert

For each generated SVG, BEFORE inserting it into the artifact:

1. The file exists and parses as SVG (`/diagram --on-failure drop` already drops invalid output — a missing file means it dropped; log and skip).
2. It contains the background `<rect>`.
3. **Dry-run the insertion**: splice the `<svg>` (with a `data-anchor` slug) into a copy of `{slug}.html` at the target section, then run the smoke gate — `build_sections_json.js` still parses, every `<h2>/<h3>` keeps its id, and `check-comments-coverage.sh` (if present) stays green.

Any failure → **drop that diagram**, log `diagram: dropped <n> (<reason>)`, leave the artifact unchanged. Never insert an unvalidated SVG.

## Step D — Insert + remember preference

Insert each validated SVG inline at its target section (wrapped in a `<figure>` with a caption), then re-emit `{slug}.sections.json`. After a successful pass with ≥1 diagram inserted, if the preference isn't already set, offer:

```
question: "Always run the diagram pass for this project?"
options:
  - Not now (Recommended)
  - Yes, remember it          # writes .pmos/settings.yaml :: artifact.diagram_pass: true
```

`(Recommended)` = Not now (don't silently opt the project into a heavier default).

## Non-interactive degradation

In `--non-interactive` (main-agent): Step A AUTO-PICKs the single Recommended diagram; `/diagram --non-interactive --on-failure drop` already runs headless; Step D's preference prompt AUTO-PICKs "Not now". Skipped entirely when `/artifact` runs as a subagent — see `SKILL.md` `## Platform Adaptation`. If inline insertion proves fragile in practice, the documented fallback is to leave diagrams in `assets/diagrams/` and link them from the section rather than inlining (per `02_spec.html` §9).
