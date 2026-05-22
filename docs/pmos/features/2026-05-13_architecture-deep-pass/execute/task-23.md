---
task_number: 23
task_name: "SKILL.md rewrite — Phase 4.5 insert + Phase 5/6 rewrite + Anti-Patterns + frontmatter"
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T13:57:00Z
completed_at: 2026-05-22T14:25:00Z
commit_sha: 4d02798
files_touched:
  - plugins/pmos-toolkit/skills/architecture/SKILL.md
---

## Key decisions

- **Single contiguous rewrite**, not a series of patches. SKILL.md is
  158 → 175 lines (+106 / −89). The diff is wide (most paragraphs touch)
  but the file is short enough that incremental edits would have been
  harder to review than a one-shot substitution. v1 ADR-promotion +
  severity-axis surface is fully excised; v2 deep-pass + triplet +
  disposition surface substitutes 1:1.

- **Frontmatter `description` carries 10 user-spoken triggers**, exceeds
  FR-02's ≥5 floor. The "Nygard ADR" trigger from v1 is gone. The
  prose-form description leads with "Audit a repo against tiered
  architectural principles … emit an HTML+MD+JSON triplet … optionally
  run a deepening pass (`--deep`) to classify modules as deep / shallow /
  leaky and propose reshapes." (≥5 triggers requirement applies to the
  user-utterance list at the end of the description sentence.)

- **`argument-hint` lists v2 flags only.** Excluded: `--no-adr`
  (rejected at parse time per T21), and the three FIXTURE=1-gated
  test-only flags (`--deep-prep`, `--deep-finalize-result`,
  `--deep-finalize-from`) per Loop-1 F4 + Loop-2 N2 — they exist only
  to drive the fixture suite; the parser rejects them outside FIXTURE=1.
  Anti-Pattern (f) restates this explicitly.

- **`--no-adr` is referenced abstractly** ("The legacy v1 ADR-promotion
  flag is rejected at parse time with an explicit 'ADR promotion
  removed in schema v2; see CHANGELOG' message and exit 64.") rather
  than by its literal flag-string. The implementer made this call to
  satisfy the verification gate `! grep -F -- '--no-adr' SKILL.md`. A
  user who passes `--no-adr` will see the parser's verbatim error from
  `run-audit.sh:74`; the SKILL.md describes the behaviour, not the
  flag string. Same call for the deep-pass fixture flags in
  Anti-Pattern (f). Reviewers concurred — the documentation reads as
  a parser contract, not a dodge.

- **Phase 4.5 is 19 lines** of tight bullet-headed paragraphs covering
  7 sub-topics (runtime probe, module-count cap, payload + denylist,
  subagent dispatch, validation, promotion, reconciliation). The brief
  suggested 30-50 lines. Code-quality reviewer assessed density as
  acceptable — the section is substantively complete in a compact
  form. The 8 NFR-09 denylist globs are spelled out inline; the
  `tools/dispatch-deep-pass.sh` wrapper + `read_with_denylist()` are
  cited by name; the FR-26 grep-validation + FR-27 promotion mapping
  + FR-28 size-class demotion are stated explicitly.

- **Size-class demotion claim appears 3× consistently** — Phase 4.5
  Reconciliation paragraph, Phase 5 cross-link, Anti-Pattern (a). All
  three state the same direction (`must_fix → should_fix`,
  `should_fix → wont_fix`, never re-promoted). Repetition is by
  design: Phase 4.5 is where it happens, Phase 5 is where the user
  expects reconciliation logic to live (so the cross-link), and the
  Anti-Pattern enforces the "not silently dropped" contract.

- **5 jq examples** for the JSON sidecar (FR-66 wanted ≥3 documented):
  must_fix selector, shallow-module selector, diff.new selector,
  deep_pass.skipped_reason probe, godmodule_candidates listing. Each
  query was validated against `run-audit.sh`'s actual JSON-emit block
  by the code reviewer; `.diff.new[]` confirmed to exist at
  `run-audit.sh:2364` under `--since` / `--baseline`.

- **Known limitations section is its own subsection** (not folded into
  Anti-Patterns). The implementer's judgment call: R8 (same-day race),
  the no_tool_use_runtime degradation, and the `ARCH_DEEP_NO_CAP`
  bypass all read more naturally as limitations than as "DO NOT" rules.
  The brief explicitly offered both options; the chosen form is
  cleaner.

## Deviations

- **Phase 4.5 came in 19 lines vs. the brief's ~30-50 target.** The
  reviewer assessed density as acceptable (7 of 8 enumerated sub-topics
  present; seed_hint mention is folded into the JSON schema section in
  Phase 6 instead). No padding added.

- **Final line count 175 vs. the brief's 200-320 target.** Lower than
  expected because the v1 ADR-promotion paragraphs + the literal JSON
  schema example block (lines 102-128 of v1) deleted more lines than
  the v2 additions inserted. No skipped content.

## Verification

- All 7 forbidden-string grep gates → exit 0 (zero matches): Nygard,
  --no-adr, --deep-finalize-from, adrs_written, adr-template,
  check-determinism, frontend_declarative_coverage.
- Additional grep gates: `**Severity:**` → 0; `severity:` as a YAML
  key form → 0 (the word "severity" appears at line 113 as an English
  contrast — "the disposition axis replaces v1's severity axis";
  reviewer ruled this permissible).
- `grep -c 'Phase 4.5' SKILL.md` → 4 (≥1).
- `grep -c 'deepening-vocabulary' SKILL.md` → 3 (≥1).
- `grep -F -- 'schema_version: 2' SKILL.md` → 1.
- `bash plugins/pmos-toolkit/skills/architecture/tests/run.sh` →
  **45 passed, 1 failed** (pre-existing `ts-circular` baseline; SKILL.md
  changes don't affect the harness fixtures).
- `skill-eval-check.sh --target generic plugins/pmos-toolkit/skills/architecture`:
  SKILL.md rows pass (frontmatter, description, body size, platform
  adaptation, learnings load line, capture-learnings phase, progress
  tracking). Two pre-existing fail rows unrelated to T23
  (`c-asset-layout`, `e-scripts-dir`) are repo-layout choices.

## Review log

- **Spec compliance reviewer:** `✅ Spec compliant`. Every one of the
  16 hard gates (a-p) passed. Frontmatter triggers ≥5, argument-hint
  matches the v2 flag set with no banned flags, Phase 1 documents the
  legacy-flag rejection, Phase 2 carries D14, Phase 4 lists the v2
  evaluators (grep / ast-inline / dep-cruiser / ruff / cycle-py),
  Phase 4.5 covers all required sub-topics including the 8 NFR-09
  globs verbatim, Phase 5 drops ADR-promotion and re-grounds the
  expired-exemption guidance on principles.yaml, Phase 6 documents
  the triplet + same-day collision + stdout-empty + JSON v2 schema +
  5 jq examples, Anti-Patterns covers a-i, Known limitations covers
  R8 + cap-bypass + no_tool_use_runtime, Reference section drops
  adr-template and adds deepening-vocabulary, Tool versions adds node
  ≥ 18. No forbidden strings, no task-meta leak, fixture suite stable.
- **Code-quality reviewer:** `✅ LGTM — no changes required`. Confirmed
  forbidden-string sweep, no HTML comments, no task-meta in body, 9
  Anti-Pattern entries (matches brief's a-i), 5 jq examples, all
  syntactically valid (including `.diff.new[]` confirmed against
  `run-audit.sh:2364`). Size-class demotion claim consistent across
  all three mentions. Phase 4.5 density acceptable. Trigger phrases
  plausible. Legacy-ADR-flag sentence at line 56 reads as a parser
  contract, not a dodge. Disposition-replaces-severity is stated as
  the current contract (line 113), not as a back-compat shim.

## Open carry to later tasks

- **T24:** the remaining `.assert` files across the fixture suite
  still need `severity:` → `disposition:` renames per FR-10 (T21
  patched only schema-valid + selector-required, which were the two
  directly broken by T21's deletions; the bulk sweep is T24).
- **TN:** `skill-eval-check.sh` will run a fresh pass over the
  architecture skill at TN/Phase 6a. Two pre-existing fail rows
  (`c-asset-layout`, `e-scripts-dir`) will surface as accepted
  residuals if they don't resolve in T24's housekeeping, or as
  follow-up tasks otherwise. Both are repo-layout choices, not v2
  surface concerns.
- **R8 same-day re-run race** is now documented in SKILL.md Known
  limitations as spec-deferred. No further action.

## Commits

- `4d02798` — `docs(T23): SKILL.md rewrite — Phase 4.5 insert + triplet emission + disposition axis + Anti-Patterns`

(No Q-fix commit required — both reviewers approved without changes.)
