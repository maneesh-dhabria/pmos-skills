---
schema_version: 1
id: 260629-bm9
title: "/interview-feedback robustness — URL-input detection + fallback, non-clobbering transcribe, scenario-aware written-submission assessment, visible citation gate"
type: enhancement
kind: epic
status: released
route: skill
priority: should
labels: [pmos-managerkit, interview-feedback, hiring, skill, from-feedback]
created: 2026-06-29
updated: 2026-07-01
released: 0.2.0
source: "from-feedback (/reflect on first production run, 2026-06-29): scored one candidate from a Google Drive recording + Google Docs transcript + local case-docs + a post-interview PDF. Core grounding contract held, but required two external-URL workarounds, a manual transcript-rescue, and two rounds of user-prompted correction to written-submission handling. Maintainer decision (define run): D3 written submission is assessed by scenario (post-live vs pre-live-then-present), never in isolation. /reflect's own nit (R1: add a phases: frontmatter key) was triaged and DROPPED — no pmos skill uses that key; skill-patterns §J anchors task-tracking to body phase headings."
design_doc: docs/pmos/features/2026-06-29_interview-feedback-robustness/02_design.html
parent:
dependencies: []
---

## Context

`/interview-feedback` (pmos-managerkit, built via epic 260616-9bt) had its first real production run: one
candidate scored from four inputs — a Google Drive video URL, a Google Docs transcript URL, a local case-docs
folder, and a post-interview PDF submission. The skill **eventually** delivered its core contract (two grounded
artifacts with verbatim-verified citations), but only after:

1. **Input robustness (blocker).** Both Google URLs 401'd with no detection and no fallback — the skill fell
   through silently to a phase that later failed, and the user had to notice and supply a local `.md` copy.
2. **Data safety (blocker).** `transcribe.sh` overwrote a speaker-attributed 1020-line Gemini transcript with a
   767-line timestamped-only whisper file — silent destruction of the better grounding source, needing a manual
   `mv` + restore.
3. **Analytical completeness (friction ×2).** The post-interview PDF was not factored into the initial reco at
   all; when added, it was scored in isolation (3.60/4.00) rather than against what the interview seeded —
   forcing two full rewrites of the written-submission section and the recommendation.

The full finding→fix map, decisions (D1–D5 — D3 resolved with the maintainer this run), FRs, and invariants are
in the `design_doc:` (`02_design.html`). This is a revision of the existing skill — no new charter.

The cross-plugin `/reflect` nit from the same retro (R1: add a `phases:` frontmatter key) was triaged and
**dropped** during this define run — no pmos skill uses a `phases:` frontmatter key, and `skill-patterns.md §J`
anchors task-tracking to body phase headings. The epic therefore stays single-plugin (pmos-managerkit).

## Acceptance Criteria

- [ ] Phase [Resolve] probes URL inputs at the top; known auth-walled hosts (drive/docs.google.com) and any
  401/403/404/timeout emit exactly `Can't access <url> — please provide a local file path or paste the content.`
  and stop that input — no silent fall-through (FR-1).
- [ ] `transcribe.sh` never overwrites an existing `transcript.refined.txt` by default — whisper output goes to
  `transcript.whisper.txt` and Phase [Ground] selects the better tier (speaker-attributed > timestamped-only);
  `--force-transcribe` restores overwrite (FR-2).
- [ ] When a written submission is present, Phase [Score] emits a mandatory assessment block referenced by the
  reco, gated by a checklist (present? → classified? → assessed in context? → referenced in reco?) (FR-3).
- [ ] The written submission is assessed by **scenario**, never in isolation: (A) post-live → 3-bucket
  cross-reference vs the transcript (discussed / interviewer-directed / independently reached), restate-only
  flagged as weak; (B) pre-live-then-present → intrinsic quality + clarity of thought AND live
  defend/probe-response/adjust-on-the-fly from the transcript (FR-4).
- [ ] The citation gate is visible: `check-citations.mjs` prints `✓ citations: N transcript, M notes[, K
  submission]` on pass + the skill appends a one-line `<!-- citations verified: … -->` comment; a new
  `submission` tier is verified verbatim against the submission file (FR-5, closing the grounding hole — INV-1).
- [ ] **No regression:** a run with a local transcript, no written submission, and no URL inputs converts
  byte-identically (INV-4); `check-citations.mjs` + `fill-scorecard.mjs` selftests and `tests/run-tests.sh`
  green with new assertions (INV-3); non-interactive block + tier-3 refusal marker byte-identical (INV-2);
  candidate content never committed (INV-5).
- [ ] Conforms to `skill-patterns.md §A–§L`; passes `skill-eval.md`; 4 hygiene lints + recommended-audit green
  (the three new contract flags `--force-transcribe`, `--submission-type`, `--written-submission` hinted +
  handled).

## Stories

- **260629-jfz** — `/interview-feedback` robustness (route: skill, plugin pmos-managerkit, no deps). All five
  findings in one `/execute` run. Status: planned (tasks.yaml authored at define).

## Notes

- Single-story epic (singleton wrap, D24 litmus). One skill, one `/execute` run; the findings are interdependent
  within `SKILL.md` + three scripts (transcribe.sh, check-citations.mjs, fill-scorecard.mjs), so splitting would
  create cross-story task deps.
- F3 + F4 fuse into one written-submission assessment feature (detection + scenario classification + contextual
  assessment + reco integration).
- Build via `/skill-sdlc build --next` (or `build --story 260629-jfz`) → Loop 3 `/complete-dev --epic 260629-bm9`.
