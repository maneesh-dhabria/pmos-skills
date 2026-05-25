#!/usr/bin/env bash
# T26 inline verification — calibration corpus scorer (§14.6 thresholds).
# Asserts: id-first ≥ 45/50, quote-fallback + orphan ≤ 5/50, orphan ≤ 3/50.
# Refs: §14.6, FR-23.
set -euo pipefail

# BASH_SOURCE may be empty when sourced via non-canonical path. Fall back to
# $0, then walk up from $PWD until we find the repo sentinel (.git/).
SRC="${BASH_SOURCE[0]:-$0}"
if [ -n "$SRC" ] && [ -e "$SRC" ]; then
  HERE="$(cd "$(dirname "$SRC")" && pwd)"
  REPO="$(cd "$HERE/../.." && pwd)"
else
  # Walk up from cwd.
  REPO="$PWD"
  while [ "$REPO" != "/" ] && [ ! -d "$REPO/.git" ]; do
    REPO="$(dirname "$REPO")"
  done
  if [ ! -d "$REPO/.git" ]; then
    echo "FAIL: cannot resolve repo root (BASH_SOURCE empty, walk-up failed)" >&2
    exit 2
  fi
fi

TEST="$REPO/plugins/pmos-toolkit/skills/comments/tests/scorer.test.js"
if [ ! -f "$TEST" ]; then
  echo "FAIL: test file missing at $TEST" >&2
  exit 2
fi

CORPUS="$REPO/plugins/pmos-toolkit/skills/comments/tests/fixtures/calibration-spans-2026.json"
if [ ! -f "$CORPUS" ]; then
  echo "FAIL: calibration corpus missing at $CORPUS" >&2
  exit 2
fi

cd "$REPO"
node "$TEST"
