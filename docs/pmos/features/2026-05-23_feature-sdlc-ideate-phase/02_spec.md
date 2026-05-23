# 02 — Spec (streamlined-inline)

**Mode:** skill-feedback · **Tier:** 2 · **Target skill:** `/feature-sdlc` (v2.52.0)
**Standing acceptance:** `reference/skill-patterns.md §A–§F` translated into FRs in `01_requirements.md`.
**Execution mode:** inline (single-stream `/execute`; no subagent-driven dispatch — no inter-task parallelism worth claiming).

## Architecture (delta over current SKILL.md)

```
existing                          new
--------                          ---
Phase 0  dispatch                 (unchanged)
Phase 0a worktree                 (unchanged)
Phase 0b resume                   (unchanged)
Phase 0c feedback-triage          (unchanged; skill-feedback only)
Phase 0d skill-tier-resolve       (unchanged; skill modes only)
Phase 1  init-state               (unchanged)
                                  Phase 1.5  /ideate gate    ←── NEW (feature + skill-new only)
Phase 2  /requirements            (modified: accepts ideate brief seeds)
Phase 2a /grill                   (unchanged)
Phase 3a /creativity              (unchanged)
Phase 3b /wireframes              (unchanged)
Phase 3c /prototype               (unchanged)
Phase 4  /spec                    (unchanged)
Phase 5  /plan                    (unchanged)
Phase 6  /execute                 (unchanged)
Phase 6a /skill-eval              (unchanged)
Phase 7  /verify                  (unchanged)
Phase 8  /complete-dev            (unchanged)
Phase 8a /retro                   (unchanged)
Phase 9  final-summary            (modified: includes ideate brief in artifact-link list)
Phase 10 capture-learnings        (unchanged)
```

## API contracts

### `reference/fuzzy-idea-detection.md` (new)

Mirrors `reference/frontend-detection.md` shape — a small deterministic heuristic file callable by Phase 1.5.

**Inputs:**
- `seed_text` — the user's CLI argument string (with recognised flags stripped).
- `doc_attached` — boolean, true iff a `--doc <path>` was provided.

**Output:** `seed_shape ∈ {fuzzy, formed}`.

**Deterministic rules (apply in order; first hit wins):**

1. `doc_attached == true` → `formed`. (User supplied a structured document.)
2. `wordcount(seed_text) >= 80` → `formed`. (Substantive seed; assume user has thought it through.)
3. `seed_text` contains any of `\b(idea|maybe|explore|thinking about|not sure|might|could|wondering|brainstorm|half[-\s]formed|rough)\b` (case-insensitive, word-boundary via portable `($|[^A-Za-z])` pattern per learning 2026-05-15) → `fuzzy`.
4. `wordcount(seed_text) < 20` → `fuzzy`. (Sparse seed; user has a half-thought.)
5. Otherwise → `formed`.

**Worked examples:**
- `"add /ideate to /feature-sdlc before /requirements"` → wordcount=10, no vague markers, no doc → rule 4 → **fuzzy** (sparse).
- `"I have a half-formed idea about a Notion integration"` → vague marker `idea`, `half-formed` → rule 3 → **fuzzy**.
- `"Build a survey-analyse skill that reads CSV/XLSX/PDF exports, runs per-question-type Python helpers, dispatches a fresh open-end-coding subagent per text column..."` → wordcount=80+ → rule 2 → **formed**.

### SKILL.md edits — see Plan task table.

## Schema additions (`reference/state-schema.md`)

Additive over v4; **no `schema_version` bump** (back-compat preserved per FR-IDE-12).

```yaml
phases:
  ideate:                           # present only in `feature` + `skill-new` modes
    status: pending | in_progress | completed | skipped-formed | skipped-flag | skipped-non-interactive | failed | paused
    started_at: null | <ISO-8601>
    artifact_path: null | "<feature_folder>/00d_ideate.html"
    grill_deep_chained: false | true
    grill_deep_artifact_path: null | "<feature_folder>/00d-grill_ideate.html"
    seed_shape: fuzzy | formed | null              # null until classified
    ideate_tier_estimate: null | 1 | 2 | 3
    folded_phase_failures: []
```

Insertion order in `phases[]`: **immediately after `init-state`, before `requirements`** for the two modes that have it.

## Frontmatter edits

- `argument-hint`: append `--no-ideate`.
- `description`: append trigger phrases `"I have a half-formed idea"`, `"this is a rough idea"`, `"I want to brainstorm this end-to-end"`.

## Test strategy

The hard-bar gates are Phase 6a `/skill-eval` (binary rubric) and Phase 7 `/verify` (multi-agent code review + fresh skill-eval re-run). No new fixtures required — `tools/skill-eval-check.sh` is content-shape only and validates frontmatter + body structure.

Manual smoke (Phase 7 interactive QA):
1. Fuzzy-seed run → expect Phase 1.5 prompt → pick Run → expect 00d_ideate.html.
2. Formed-seed run → expect Phase 1.5 silent skip + log line.
3. `--no-ideate` flag run → expect skipped-flag status.
4. Tier-3-seed run (with --tier 3) → expect grill artifact present.
5. skill-feedback mode → expect Phase 1.5 not presented (mode-conditional).

## Verification plan

- All FRs FR-IDE-01 through FR-IDE-15 inspectable via SKILL.md diff + new `reference/fuzzy-idea-detection.md`.
- `tools/skill-eval-check.sh --target claude-code plugins/pmos-toolkit/skills/feature-sdlc` → all `[D]` checks pass.
- LLM-judge `[J]` checks pass (no body changes to existing phases that would break `d-platform-adaptation` or `d-learnings-load-line`).

## Decisions

- **D1.** Phase number = `1.5` (fractional, per 2026-05-13 learning — avoids renumbering).
- **D2.** Phase id = `ideate` in state.yaml `phases[]`.
- **D3.** Modes: feature + skill-new ONLY (skill-feedback excluded by-design — seed is already structured per-skill).
- **D4.** Tier-3 estimator: `--tier 3` explicit OR brief contains ≥3 user-journey sections OR ≥5 pressure-test findings. Pragmatic; if both heuristic flags miss, user can still re-grill manually.
- **D5.** Brief artifact name = `00d_ideate.html` (sort-order: after 0c, before 01_requirements; avoids extension collision with phase-0 substrate).
- **D6.** No `schema_version` bump — additive entry, pre-2.52.0 state files resume cleanly (no migration step).
- **D7.** No `/ideate` modification — orchestrator copies the artifact post-run rather than asking `/ideate` to write to feature folder.

## Risks

- **R1.** `/ideate` writes to `{docs_path}/ideate/{YYYY-MM-DD}_<slug>.html` by default; the copy step depends on the `_shared/resolve-input.md` `phase=ideate` resolver path existing or being added. **Mitigation:** if resolver lookup fails, fall back to `find {docs_path}/ideate -newer {state.yaml} -name '*.html' | head -1`.
- **R2.** Tier-3 heuristic (D4) may be wrong-side on borderline ideas. **Mitigation:** the user can pass `--tier 3` explicitly; chain decision logged for audit.
- **R3.** Pre-2.52.0 state files resumed with the new code don't have the `ideate` entry in `phases[]`. **Mitigation:** FR-IDE-12 — cursor scans whatever phases are present, ignores missing; back-compat preserved.
