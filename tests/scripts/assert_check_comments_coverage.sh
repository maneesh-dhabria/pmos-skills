#!/usr/bin/env bash
# T27 meta-test — scripts/check-comments-coverage.sh (FR-62, §14.4).
# Four sub-cases:
#   A  Golden case — real repo passes with exit 0 + PASS line.
#   B  Missing skill contract test — exit 1 + stderr names the missing skill.
#   C  Missing emit reference — exit 1 + stderr mentions "missing comments.js".
#   D  Missing integration test — exit 1 + stderr mentions resolver.integration.test.js.
set -euo pipefail

# ---------------------------------------------------------------------------
# Repo-root resolution (BASH_SOURCE fallback + walk-up sentinel pattern)
# ---------------------------------------------------------------------------
SRC="${BASH_SOURCE[0]:-$0}"
if [ -n "$SRC" ] && [ -e "$SRC" ]; then
  HERE="$(cd "$(dirname "$SRC")" && pwd)"
  REPO="$(cd "$HERE/../.." && pwd)"
else
  REPO="$PWD"
  while [ "$REPO" != "/" ] && [ ! -d "$REPO/.git" ]; do
    REPO="$(dirname "$REPO")"
  done
  if [ ! -d "$REPO/.git" ]; then
    echo "FAIL: cannot resolve repo root (BASH_SOURCE empty, walk-up failed)" >&2
    exit 2
  fi
fi

SCRIPT="$REPO/scripts/check-comments-coverage.sh"
if [ ! -f "$SCRIPT" ]; then
  echo "FAIL: check-comments-coverage.sh missing at $SCRIPT" >&2
  exit 2
fi

# ---------------------------------------------------------------------------
# Helper: build a minimal golden fixture from the real skills tree.
# Each sub-case calls this and then mutates one thing.
#
# The fixture tree only needs the files the script actually stat()/grep()s:
#   skills/<name>/tests/apply-edit-at-anchor.test.js  (for each of 14 skills)
#   skills/<name>/SKILL.md (or any file with comments.js)         (13 skills)
#   skills/feature-sdlc/SKILL.md                                  (orchestrator)
#   skills/comments/tests/resolver.integration.test.js
#   skills/comments/tests/scorer.test.js
#   skills/comments/tests/reanchor.integration.test.js
# ---------------------------------------------------------------------------
SKILLS_SRC="$REPO/plugins/pmos-toolkit/skills"

ORIGINATING=(
  requirements spec plan wireframes prototype artifact diagram
  ideate survey-design survey-analyse polish architecture readme
)
ORCHESTRATOR="feature-sdlc"

build_fixture() {
  local root="$1"
  local skills_dir="$root/skills"

  # Contract tests — one per originating skill + orchestrator
  for s in "${ORIGINATING[@]}" "$ORCHESTRATOR"; do
    mkdir -p "$skills_dir/$s/tests"
    touch "$skills_dir/$s/tests/apply-edit-at-anchor.test.js"
  done

  # Emit references — copy real SKILL.md for each originating skill (contains
  # 'comments.js' in the asset-substrate section by the time T27 ships).
  # For safety, if the real file is missing a reference, we inline a stub.
  for s in "${ORIGINATING[@]}"; do
    mkdir -p "$skills_dir/$s"
    local real_md="$SKILLS_SRC/$s/SKILL.md"
    if [ -f "$real_md" ] && grep -q 'comments\.js' "$real_md"; then
      cp "$real_md" "$skills_dir/$s/SKILL.md"
    else
      # Stub that satisfies the grep
      printf '# stub\n\ncomments.js asset baked in.\n' \
        > "$skills_dir/$s/SKILL.md"
    fi
  done

  # Orchestrator SKILL.md — must have comments.js + both surface names
  mkdir -p "$skills_dir/$ORCHESTRATOR"
  local real_sdlc="$SKILLS_SRC/$ORCHESTRATOR/SKILL.md"
  if [ -f "$real_sdlc" ] \
      && grep -q 'comments\.js' "$real_sdlc" \
      && grep -q '00_pipeline\.html' "$real_sdlc" \
      && grep -q '00_open_questions_index\.html' "$real_sdlc"; then
    cp "$real_sdlc" "$skills_dir/$ORCHESTRATOR/SKILL.md"
  else
    printf '# stub\n\ncomments.js\n00_pipeline.html\n00_open_questions_index.html\n' \
      > "$skills_dir/$ORCHESTRATOR/SKILL.md"
  fi

  # Integration / calibration tests
  mkdir -p "$skills_dir/comments/tests"
  touch "$skills_dir/comments/tests/resolver.integration.test.js"
  touch "$skills_dir/comments/tests/scorer.test.js"
  touch "$skills_dir/comments/tests/reanchor.integration.test.js"
}

PASS_COUNT=0
FAIL_COUNT=0

pass() { echo "  PASS sub-case $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "  FAIL sub-case $1: $2" >&2; FAIL_COUNT=$((FAIL_COUNT + 1)); }

# ---------------------------------------------------------------------------
# Sub-case A: Golden case — real repo exits 0 with PASS line
# ---------------------------------------------------------------------------
echo "Sub-case A: golden (real repo)"
output="$(bash "$SCRIPT" "$SKILLS_SRC" 2>&1)"
rc=$?
if [[ $rc -ne 0 ]]; then
  fail A "expected exit 0, got $rc. Output: $output"
elif echo "$output" | grep -q "comments-coverage: PASS"; then
  pass A
else
  fail A "PASS line not found in output: $output"
fi

# ---------------------------------------------------------------------------
# Sub-case B: Missing skill contract test (requirements)
# ---------------------------------------------------------------------------
echo "Sub-case B: missing contract test for requirements"
TMP_B="$(mktemp -d)"
trap 'rm -rf "$TMP_B"' EXIT
build_fixture "$TMP_B"
# Remove the test file for requirements
rm "$TMP_B/skills/requirements/tests/apply-edit-at-anchor.test.js"

set +e
err_b="$(bash "$SCRIPT" "$TMP_B/skills" 2>&1)"
rc_b=$?
set -e
if [[ $rc_b -eq 0 ]]; then
  fail B "expected exit 1, got 0. Output: $err_b"
elif echo "$err_b" | grep -qE "missing contract tests for:.*requirements"; then
  pass B
else
  fail B "stderr did not name 'requirements'. Got: $err_b"
fi
trap - EXIT; rm -rf "$TMP_B"

# ---------------------------------------------------------------------------
# Sub-case C: Missing emit reference (ideate SKILL.md lacks comments.js)
# ---------------------------------------------------------------------------
echo "Sub-case C: missing comments.js emit reference (ideate)"
TMP_C="$(mktemp -d)"
trap 'rm -rf "$TMP_C"' EXIT
build_fixture "$TMP_C"
# Overwrite ideate's SKILL.md with content that does NOT mention comments.js
printf '# ideate stub\n\nNo comments reference here.\n' \
  > "$TMP_C/skills/ideate/SKILL.md"

set +e
err_c="$(bash "$SCRIPT" "$TMP_C/skills" 2>&1)"
rc_c=$?
set -e
if [[ $rc_c -eq 0 ]]; then
  fail C "expected exit 1, got 0. Output: $err_c"
elif echo "$err_c" | grep -qE "missing comments\.js|missing comments.js"; then
  pass C
else
  fail C "stderr did not mention 'missing comments.js'. Got: $err_c"
fi
trap - EXIT; rm -rf "$TMP_C"

# ---------------------------------------------------------------------------
# Sub-case D: Missing integration test (resolver.integration.test.js absent)
# ---------------------------------------------------------------------------
echo "Sub-case D: missing resolver.integration.test.js"
TMP_D="$(mktemp -d)"
trap 'rm -rf "$TMP_D"' EXIT
build_fixture "$TMP_D"
rm "$TMP_D/skills/comments/tests/resolver.integration.test.js"

set +e
err_d="$(bash "$SCRIPT" "$TMP_D/skills" 2>&1)"
rc_d=$?
set -e
if [[ $rc_d -eq 0 ]]; then
  fail D "expected exit 1, got 0. Output: $err_d"
elif echo "$err_d" | grep -q "missing resolver.integration.test.js"; then
  pass D
else
  fail D "stderr did not mention 'missing resolver.integration.test.js'. Got: $err_d"
fi
trap - EXIT; rm -rf "$TMP_D"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "assert_check_comments_coverage: $PASS_COUNT passed, $FAIL_COUNT failed"
if [[ $FAIL_COUNT -gt 0 ]]; then
  exit 1
fi
