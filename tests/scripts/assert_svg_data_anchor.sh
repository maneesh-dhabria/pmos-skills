#!/usr/bin/env bash
# T23 — SVG data-anchor retrofit unit tests.
# Runs plugins/pmos-toolkit/skills/diagram/tests/svg-data-anchor.test.js.
# Sub-cases (a)–(g) per FR-50, FR-51, S15.
# Exits 0 on success, 1 on failure.

set -u

# BASH_SOURCE may be empty when sourced via non-canonical path. Fall back to
# $0, then walk up from $PWD until we find the repo sentinel (CLAUDE.md + .git/).
_script="${BASH_SOURCE[0]:-$0}"
if [[ -n "$_script" && -e "$_script" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "$_script")" && pwd)"
else
  SCRIPT_DIR=""
  _walk="$PWD"
  while [[ "$_walk" != "/" ]]; do
    if [[ -f "$_walk/CLAUDE.md" && -d "$_walk/plugins/pmos-toolkit" ]]; then
      SCRIPT_DIR="$_walk/tests/scripts"
      break
    fi
    _walk="$(dirname "$_walk")"
  done
  if [[ -z "$SCRIPT_DIR" ]]; then
    echo "FAIL: unable to resolve script directory" >&2
    exit 1
  fi
fi

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

TEST="plugins/pmos-toolkit/skills/diagram/tests/svg-data-anchor.test.js"
if [[ ! -f "$TEST" ]]; then
  echo "FAIL: test file missing at $REPO_ROOT/$TEST" >&2
  exit 1
fi

exec node "$TEST"
