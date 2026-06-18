---
schema_version: 1
id: 260617-pbk
kind: epic
title: "/playbook → evolution-only mode (remove case-study mode; default-evolution + marketplace skill-picker; mine everything)"
type: feature
status: released
priority: should
labels: [pmos-learnkit, playbook, evolution-mode]
route: skill
created: 2026-06-17
updated: 2026-06-18
defined: 2026-06-17
source: docs/pmos/features/2026-06-17_playbook-evolution-mode/02_design.html
feature_folder: docs/pmos/features/2026-06-17_playbook-evolution-mode/
design_doc: docs/pmos/features/2026-06-17_playbook-evolution-mode/02_design.html
parent:
dependencies: []
released: v0.29.0
---

## Context

Rebuild `/playbook` around a single idea: **trace how a product (or one skill) evolved, and how
the AI-SDLC pipeline shaped the decisions** — structured by inflection points, not a release log.
The per-problem case-study mode (FR-50/51, session clustering, ranked propose/pick) is **removed
entirely** to keep the skill simple.

Triggered by a real run on `poker-coach` (plugin v0.27.0) whose per-problem case studies were
judged "not useful for PMs" (domain-entangled), plus three maintainer overrides that win over the
source feedback:

1. **Evolution is the default, always.** In a Claude Code / Codex skills-marketplace repo, prompt
   the user to choose a target — a specific skill **or** the whole repo (Recommended). Otherwise
   target the repo's own evolution with no prompt.
2. **Case-study mode removed** ("keep /playbook simple").
3. **No day/session window** — mine everything; the milestone spine comes from committed
   artifacts, not a user-supplied window.

Two interactive forks resolved at define: marketplace UX = **pick-skill-or-whole-repo**; single-skill
mining scope = **skill-scoped** (feature folders + sessions touching that skill's files only). One
grill residual resolved: **keep the tweet-thread emit** (the worked example used it well).

Worked target (the concrete example of the proposed shape):
`poker-coach/docs/pmos/playbooks/2026-06-17_poker-coach-evolution/index.html` — versioned-milestone
sections anchored on inflection points, a "Where the pipeline mattered" callout per milestone, a
verbatim opening-prompt quote per milestone, a cross-cutting process section, a plain title, a
cold-reader intro, and a subtle close.

Full design + decision log (D1–D13), FRs (FR-1..FR-11), the new evolution article schema, the
two-source mining strategy, the voice self-check, and the kept-vs-removed inventory live in the
`design_doc:` (02_design.html).

## Story split

One skill, fully interdependent changes (SKILL.md phases reference the new scout contract and the
new schema; the scout rewrite and schema rewrite are one vertical slice) → **singleton skill epic =
one story** (`260617-evo`), scored once against `skill-eval.md` at build.

## Stories
- 260617-evo — /playbook evolution-mode rewrite (route: skill) — ready
