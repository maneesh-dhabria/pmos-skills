---
schema_version: 1
id: 260710-xrh
title: "/wireframes — inline house-style table citing the single home, wireframe.css collapsed to monochrome with .wf-anno re-coloured to #d33, chrome→canvas mapping, --fidelity parsed as nl-sugar (never a contract flag), and the stale 'mid-fi, Tailwind' prose retired"
type: feature
kind: story
status: in-progress
route: skill
priority: should
labels: [pmos-toolkit, wireframes, skill]
created: 2026-07-10
updated: 2026-07-11
parent: 260710-grd
claimed_by: build:0d5e385f-c675-46f6-a126-345344fa277d
driver_holder: build:0d5e385f-c675-46f6-a126-345344fa277d
worktree: .claude/worktrees/feat-260710-xrh
feature_folder: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/
design_doc: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/02_design.html
plan_doc: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/stories/260710-xrh/03_plan.html
tasks_file: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/stories/260710-xrh/tasks.yaml
dependencies: [260710-p5x]
---

## Context

The skill's own stylesheet contains the defect the reference names as a composition mistake. At
`assets/wireframe.css:102`, `.wf-anno { outline: 1px dashed var(--wf-accent); … }` draws reviewer annotations in
`#2563eb` — **the same blue as `.mock-button--primary`**. Annotation colour is bleeding into the UI. This story
fixes it by collapsing the screen palette to monochrome and quarantining `#d33` to the annotation layer.

Depends on 260710-p5x (amendment A3): the house-style table inlined in SKILL.md is a *citation* of
`reference/grid-system.md`, not a second home for the palette. The seed listed this story as dependency-free while
simultaneously calling grid-system.md its authoritative source — an inverted arrow, now corrected.

Two corrections from the grill ride along:

- **`--fidelity` is NL-sugar, not a contract flag (A4).** Applying §I's 4-test honestly, it passes **zero**: nothing
  machine-couples to it; it is not a destructive opt-in; a two-value enum with plain-English forms ("brand it") is
  prose-expressible, not a typed value; and with a hard default it pins no prompt, so headless needs nothing from
  it. It is parsed as a silent alias and kept **out** of `argument-hint`.
- **The skill's own description is now false (A5).** The frontmatter says "single-file, mid-fi, Tailwind" and the
  Phase-0 prose says "Output is mid-fidelity (Tailwind via CDN, neutral palette…)". No story updated them.

Coherence contract: `02_design.html` — D1, D2; amendments A3, A4, A5, A8, A9.

## Change surface

- `plugins/pmos-toolkit/skills/wireframes/assets/wireframe.css`
- `plugins/pmos-toolkit/skills/wireframes/SKILL.md` (frontmatter `description`, Phase-0 prose, house-style table,
  flags section, `#resolve-design-md`, `#component-breakdown`)
- `plugins/pmos-toolkit/README.md` (line 25 — "Static mid-fi HTML wireframes")

## Acceptance Criteria

- [ ] A ~15-line house-style token table is inlined in SKILL.md as the non-negotiable drawing contract, and it
  **cites `reference/grid-system.md` as the authoritative copy** rather than restating it as a second home (§K, A3).
- [ ] `assets/wireframe.css` is collapsed: the screen payload has **no** accent, success, error, gradient, shadow,
  or dark-mode colour. Chrome (state tabs, frame, footer) retains colour. `--wf-accent` no longer participates in
  any rule a screen renders.
- [ ] **`.wf-anno` is re-coloured to `#d33`** and its `::after` callout uses the same. The annotation layer is the
  only place `#d33` appears. `/prototype`'s eval-rubric `V4` continues to pass — but **note the real reason**, since
  the design brief stated it wrongly: `V4` (`prototype/reference/eval-rubric.md:77`) is a *colour-agnostic
  class-presence* check ("Zero `.annotation`, `.state-tab`, `.wireframe-frame` artifacts"), so a CSS colour change
  cannot affect it. Separately, those three class names do not match our live output (`.wf-anno`, `.wf-tab`,
  `.wf-frame`) — a pre-existing defect in `/prototype`'s rubric, out of scope here, not to be silently "fixed" as a
  side effect of this story.
- [ ] A chrome→canvas mapping table is added: `desktop-web` + `desktop-app` → 1280×800; `mobile-web` + `ios-app` +
  `android-app` → 375×812; `tablet` → 768×1024; `wide` → 1440×900. The canvas dimensions are **cited from**
  `grid-system.md`, not restated.
- [ ] `tablet` and `wide` are **canvas targets, not devices** (A8). `#component-breakdown` step 4 keeps its five
  chrome variants; no tablet or wide chrome frame is added to `wireframe.css`.
- [ ] `--fidelity lo|mid` is parsed as a **silent alias**, marked `<!-- nl-sugar -->` in the flags section, and does
  **not** appear in `argument-hint` (A4). Natural-language forms ("brand it", "match the app's look") resolve to
  `mid`. `lint-flags-vs-hints.sh` stays green *because* the flag is nl-sugar-marked, not because it is hinted.
- [ ] Under `mid`, `design-overlay.css` is linked so the **chrome** takes the host brand. **The SVG payload stays
  strictly monochrome in every mode** — `mid` never re-enables Tailwind for screen content (A9).
- [ ] `#resolve-design-md` still runs and still generates `design-overlay.css` every run (D2) — only the *link* into
  per-screen HTML becomes conditional. `--bootstrap-design-only` is unaffected. `/prototype`'s
  `design-artifact-resolver.md` mtime-reuse path continues to work (A10).
- [ ] The SKILL.md frontmatter `description` and the Phase-0 intro prose no longer describe the output as "mid-fi"
  or "Tailwind"; `plugins/pmos-toolkit/README.md:25` likewise (A5). The `description` stays a single-line quoted
  scalar (a folded `>-` scalar fails `grep '^description:'`).
- [ ] Conforms to `skill-patterns.md §A–§L` + repo `CLAUDE.md`; `skill-eval.md` and all four hygiene lints stay
  green; the frozen non-interactive block stays byte-identical.
