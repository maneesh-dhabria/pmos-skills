#!/usr/bin/env bash
# scripts/check-comments-coverage.sh — invoked by /verify Phase 7 hard gates ({#final-compliance})
# Spec ref: FR-62, §14.4 (extended for /feature-sdlc orchestrator in T27).
#
# Checks (in order):
#   (1) 13 originating skills + 1 orchestrator each have a contract test
#       (apply-edit-at-anchor.test.js) — 14 contract tests total.
#   (2) Each of the 13 originating skills emits comments.js (grep their tree).
#       The orchestrator (feature-sdlc) has 2 additional surface checks:
#       SKILL.md must mention comments.js AND both orchestrator artifact names
#       (00_pipeline.html + 00_open_questions_index.html) — 15 emit references total.
#   (3) Resolver integration test exists (resolver.integration.test.js).
#   (4) Calibration scorer + reanchor integration tests exist (T26).
#
# Usage:
#   bash scripts/check-comments-coverage.sh [ROOT]
#
# ROOT defaults to plugins/pmos-toolkit/skills (relative to cwd, or pass an
# absolute path).  All checks are read-only; the script never writes files.
#
# Exit codes:
#   0  all checks pass — emits one PASS line to stdout.
#   1  one or more checks failed — emits FAIL lines to stderr.
set -euo pipefail

ROOT="${1:-plugins/pmos-toolkit/skills}"

# ---------------------------------------------------------------------------
# (1) 13 originating skills + 1 orchestrator each have a contract test
# ---------------------------------------------------------------------------
expected_skills=(
  requirements spec plan wireframes prototype artifact diagram
  ideate survey-design survey-analyse polish architecture readme
)
expected_orchestrator="feature-sdlc"

missing_tests=()
for s in "${expected_skills[@]}"; do
  [[ -f "$ROOT/$s/tests/apply-edit-at-anchor.test.js" ]] || missing_tests+=("$s")
done
[[ -f "$ROOT/$expected_orchestrator/tests/apply-edit-at-anchor.test.js" ]] \
  || missing_tests+=("$expected_orchestrator (orchestrator)")

if [[ ${#missing_tests[@]} -gt 0 ]]; then
  echo "comments-coverage: FAIL — missing contract tests for: ${missing_tests[*]}" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# (2) Each emitting skill bakes the comments.js reference into its emit.
#     Originating skills: grep recursively for any mention of 'comments.js'.
#     Orchestrator: SKILL.md must also reference both artifact surface names.
# ---------------------------------------------------------------------------
missing_refs=()
for s in "${expected_skills[@]}"; do
  grep -rIq 'comments\.js' "$ROOT/$s/" 2>/dev/null \
    || missing_refs+=("$s")
done

# Orchestrator: check SKILL.md exists and carries all three references.
sdlc_skill_md="$ROOT/$expected_orchestrator/SKILL.md"
if [[ ! -f "$sdlc_skill_md" ]]; then
  echo "comments-coverage: FAIL — orchestrator SKILL.md missing at $sdlc_skill_md" >&2
  exit 1
fi
if ! grep -q 'comments\.js' "$sdlc_skill_md"; then
  missing_refs+=("$expected_orchestrator (no comments.js reference)")
fi
if ! grep -q '00_pipeline\.html' "$sdlc_skill_md"; then
  missing_refs+=("$expected_orchestrator (no 00_pipeline.html emit instruction)")
fi
if ! grep -q '00_open_questions_index\.html' "$sdlc_skill_md"; then
  missing_refs+=("$expected_orchestrator (no 00_open_questions_index.html emit instruction)")
fi

if [[ ${#missing_refs[@]} -gt 0 ]]; then
  echo "comments-coverage: FAIL — missing comments.js / surface references in emit for: ${missing_refs[*]}" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# (3) Resolver integration test exists
# ---------------------------------------------------------------------------
if [[ ! -f "$ROOT/comments/tests/resolver.integration.test.js" ]]; then
  echo "comments-coverage: FAIL — missing resolver.integration.test.js" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# (4) Calibration scorer + reanchor integration tests exist (T26)
# ---------------------------------------------------------------------------
for f in "$ROOT/comments/tests/scorer.test.js" \
          "$ROOT/comments/tests/reanchor.integration.test.js"; do
  if [[ ! -f "$f" ]]; then
    echo "comments-coverage: FAIL — missing $f" >&2
    exit 1
  fi
done

# ---------------------------------------------------------------------------
# (5) NFR-03 soft-warn: inline JSON block size budget.
#     Warns (does NOT fail) when an artifact's inline pmos-comments block
#     exceeds the per-artifact size ceiling. Soft so the gate stays green for
#     legitimately large review backlogs; the WARN line is the operator's
#     cue to triage (resolve stale threads, archive the artifact).
# ---------------------------------------------------------------------------
NFR03_LIMIT=204800  # 200 KiB
if [[ -d docs/pmos ]]; then
  while IFS= read -r -d '' f; do
    size=$(awk '/pmos-comments:start/,/pmos-comments:end/' "$f" | wc -c | tr -d ' ')
    if [[ "$size" -gt "$NFR03_LIMIT" ]]; then
      echo "WARN: $f inline pmos-comments block ${size}B exceeds ${NFR03_LIMIT}B (NFR-03)" >&2
    fi
  done < <(find docs/pmos -type f -name '*.html' -print0)
fi

# ---------------------------------------------------------------------------
# All checks passed
# ---------------------------------------------------------------------------
echo "comments-coverage: PASS — 14 contract tests (13 skills + 1 orchestrator) + 15 emit references (13 skill + 2 orchestrator surfaces) + 1 resolver integration + 2 anchor calibration tests"
