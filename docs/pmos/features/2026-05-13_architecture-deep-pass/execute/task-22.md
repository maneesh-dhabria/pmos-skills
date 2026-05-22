---
task_number: 22
task_name: "deepening-vocabulary.md + l1-rationales severity rename + gap-map updates"
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T13:30:00Z
completed_at: 2026-05-22T13:55:00Z
commit_sha: d0bba93
files_touched:
  - plugins/pmos-toolkit/skills/architecture/reference/deepening-vocabulary.md
  - plugins/pmos-toolkit/skills/architecture/reference/l1-rationales.md
  - plugins/pmos-toolkit/skills/architecture/reference/gap-map-rationale.md
---

## Key decisions

- **`deepening-vocabulary.md` written as the runtime SYSTEM prompt**, not
  as a repo-meta reference doc. `dispatch-deep-pass.sh:68` does
  `SYSTEM_PROMPT="$(cat "$VOCAB_PATH")"` and concatenates it into the
  Task-subagent payload, so every sentence in this file is read by the
  subagent at runtime. The file opens with a mission paragraph that
  states the subagent's job in the second person; the closing
  "Putting it together" section gives an explicit 5-step walkthrough that
  maps each vocabulary term to a JSON-return-shape field
  (`deletion_test.outcome`, `classification`, `cross_module_patterns[].evidence`,
  `proposed_reshape`). That walkthrough is not literally enumerated in
  the plan but earns its keep at runtime — the reviewer (code-quality)
  agreed.

- **Attribution to Matt Pocock** lives in an HTML comment on line 1, not
  in user-facing prose — the plan's wording said "with attribution in
  the header", and an HTML comment is invisible to the subagent (which
  reads markdown as plain text) while remaining authoritative for any
  human reading the file directly.

- **U007 → U011 cross-link removed in the Q-fix commit.** The original
  task brief asked for `See also U011 (duplicate signatures)` at the
  end of U007's section. Both reviewer + implementer flagged it as
  editorial dead weight (U007 is missing file-purpose comments; U011 is
  duplicate signatures across files — no shared mechanism, no shared
  remedy). U011 is already TOC-discoverable; the standalone cross-link
  gave a future maintainer no clarifying context. Deletion was the
  right call.

- **L1-rationales rename was clean.** Ten `**Severity:**` matches found
  by `grep -nF`, ten replaced. Final state: zero `**Severity:**`,
  eleven `**Disposition:**` (10 renamed + U011's new line). Value map
  applied per spec D5: warn→should_fix, block→must_fix, info→wont_fix.

- **gap-map-rationale arithmetic.** v1: 8/18 = 0.444. v2: 24 rules
  total (10 U + 4 TS + 8 PY ruff + 1 PY009 cycle + 1 U011 grep). Of
  those, 13 delegate to a third-party linter (4 dep-cruiser + 8 ruff +
  1 cycle-py). 13/24 = 0.542. The closing paragraph preserves the G2
  framing (still below 70% stretch, still not enforced).

- **Pre-existing BLOCK/ADR-promote prose scrubbed in the Q-fix.** Spec
  reviewer flagged that l1-rationales.md:147 + 161 still contained
  `BLOCK severity` and `ADR-promote` phrasing — pre-existing from
  41f6c181 (per blame), out of T22's literal scope. But leaving them
  in place after T21 deleted the ADR machinery would mean shipping
  internally-contradictory docs at the release boundary. Easier to
  scrub now (5-line edit) than leave for T23 cleanup. Also caught the
  U009/U010 `(BLOCK)` parentheticals in the TOC + headings, and the
  intro paragraph's "L3 may relax severity (to warn or info)" — all
  flipped to the disposition axis.

## Deviations

- **Two extra cleanups beyond the plan's literal step list:** the
  Q-fix commit (a) removed the U007 cross-link the brief had asked for
  but the reviewer + implementer both flagged as dead weight, and
  (b) scrubbed 5 lines of pre-existing stale BLOCK/ADR/severity prose
  the spec reviewer surfaced as follow-up-worthy. Justification above
  under "Pre-existing BLOCK/ADR-promote prose scrubbed". Net: T22's
  rename surface is now internally coherent across the entire file.

## Verification

- `bash plugins/pmos-toolkit/skills/architecture/tools/check-citations.sh`
  → `OK: all 24 rules cite a source.` exit 0.
- `bash plugins/pmos-toolkit/skills/architecture/tools/check-gap-map.sh`
  → `gap-map: 13/24 rules delegated to a third-party linter
  (delegated_pct = 0.542; G2 stretch target = 0.70, not enforced).`
  exit 0.
- `bash plugins/pmos-toolkit/skills/architecture/tests/run.sh` →
  **45 passed, 1 failed** (pre-existing `ts-circular` baseline; T22 is
  doc-only and did not change the test count).
- Inline plan checks:
  - `! grep -F -- '**Severity:**' .../l1-rationales.md` → exit 0
    (zero matches).
  - `test -f .../deepening-vocabulary.md` → exit 0.
  - `grep -c '^## ' .../deepening-vocabulary.md` → 10 (≥7 required).
  - `wc -l .../deepening-vocabulary.md` → 88 (in 80–200 band).
  - `grep -cF '**Disposition:**' .../l1-rationales.md` → 11.
- Post-Q-fix sweep: `grep -nE 'BLOCK|ADR-promote|relax severity|See also U011|^\*\*Severity'`
  → no matches anywhere in `l1-rationales.md`.

## Review log

- **Spec compliance reviewer:** `⚠️ Notes only` — all eleven hard gates
  (a-k) passed; the two notes about pre-existing ADR/BLOCK prose at
  lines 147/161 + the benign "severity" word at line 19 were
  follow-up-worthy. Applied in the Q-fix commit instead of deferring
  (the cleanup is small and keeps the rename surface coherent at
  release).
- **Code-quality reviewer:** `🛠 Changes required` — 1 Minor:
  - **Minor #1** U007 → U011 cross-link is editorial dead weight at
    l1-rationales.md:119 — applied (deleted; U011 is TOC-discoverable
    so no replacement pointer needed).
  - Accepted as-is: vocab file's "Putting it together" section earns
    its keep as runtime SYSTEM prompt instruction (reviewer agreed it
    is not padding); the `proposed_reshape` closing paragraph correctly
    avoided ADR mentions ("follow-up design note from the user");
    disposition rename is clean (no legacy aliases); U007 `wont_fix`
    matches `principles.yaml`; return-shape field names in the vocab
    match `dispatch-deep-pass.sh:76` exactly; delegation-ratio
    arithmetic verified; no decorative banner comments; no backwards-
    compat hacks; style matches existing files.

## Open carry to later tasks

- **T23:** SKILL.md rewrite must cite `reference/deepening-vocabulary.md`
  (Phase 4.5 prose) and must not reintroduce `--no-adr` or `BLOCK`
  vocabulary. The frontmatter `description:` must drop any "Nygard
  ADR" wording (verified absent in T1's principles.yaml; T23 verifies
  the same in SKILL.md).
- **T24:** the `.assert` files across the remaining fixture suite
  still need `severity:` → `disposition:` renames where any pre-T22
  fixture's `.assert` script references the old key. T21 patched the
  two directly broken by deletions (schema-valid, selector-required);
  T24 covers the bulk sweep.
- **R8 same-day re-run race** (slug collision append `-2`, `-3`, ...)
  documented at T23 per plan — known limitation only, no plan task
  addresses it (spec-deferred at Loop 2).

## Commits

- `b50d280` — `docs(T22): add deepening-vocabulary.md + rename severity → disposition in l1-rationales + gap-map updates`
- `d0bba93` — `fix(T22): drop U007→U011 cross-link + scrub pre-existing ADR/BLOCK prose per reviewers`
