---
task_number: 7
task_name: "CLAUDE.md generalized + ## Release policy + 2 grep tests"
task_goal_hash: t7-claude-md-generalize-release-policy
plan_path: docs/pmos/features/2026-05-20_multi-plugin-marketplace/03_plan.html
branch: feat/multi-plugin-marketplace
worktree_path: /Users/maneeshdhabria/Desktop/Projects/agent-skills-multi-plugin-marketplace
status: done
started_at: 2026-05-22T11:05:00Z
completed_at: 2026-05-22T11:20:00Z
files_touched:
  - CLAUDE.md
  - tests/scripts/assert_claude_md_generalized.sh
  - tests/scripts/assert_release_policy_section.sh
---

## T7 — CLAUDE.md generalized + ## Release policy + 2 grep tests

**Decisions:**
- Generalized 4 existing sections (FR-70/71/72/73): renamed `## Canonical skill path (pmos-toolkit)` → `## Canonical skill path`; templated `plugins/pmos-toolkit/` → `plugins/<plugin>/` throughout; expanded `## Plugin manifest version sync` to the 4-file-per-release contract (2× plugin.json + 2× marketplace.json mirrors); added `--plugin` sub-bullet under `## Release entry point`.
- Appended new `## Release policy` section (FR-74) with all 6 required subsections: Plugins list, Tag convention, /complete-dev invocation, Drift hook contract, Tri-remote topology, Old repo posture.
- Wrapped the "Example bump targets" block in a single `<!-- allow-hardcoded -->` … `<!-- /allow-hardcoded -->` marker pair — the only intentional hardcoded `plugins/pmos-toolkit/` block in CLAUDE.md (marker-count cap = 1, enforced by the generalized test).
- Also generalized the `## Bash portability` body example path (`plugins/pmos-toolkit/skills/*/scripts/` → `plugins/<plugin>/skills/*/scripts/`) since it's the same generalizable pattern; doesn't add a marker.

**Verification (red → green):**
- Red phase: `assert_claude_md_generalized.sh` FAIL (10 hardcoded refs + 5 per-section assertion failures); `assert_release_policy_section.sh` FAIL (missing `## Release policy` heading).
- Green phase: `PASS: assert_claude_md_generalized.sh (10 templated refs, 0 unauthorized hardcoded, 1 marker block)` + `PASS: assert_release_policy_section.sh` (exit 0).
- Benign stderr `[: 0\n0: integer expression expected` on `grep -c` fallbacks is per-spec verbatim, doesn't affect exit code; not fixed (test logic intact).

**Deviations:** none.
