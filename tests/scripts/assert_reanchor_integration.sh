#!/usr/bin/env bash
# T26 inline verification — re-anchor integration test (FR-23 quote-fallback / orphan paths).
# Exercises 3 sub-cases: id-first-still-works, quote-fallback-on-id-removal, orphan-on-total-rewrite.
# Refs: FR-23, §14.1, §14.6.
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

TEST="$REPO/plugins/pmos-toolkit/skills/comments/tests/reanchor.integration.test.js"
if [ ! -f "$TEST" ]; then
  echo "FAIL: test file missing at $TEST" >&2
  exit 2
fi

cd "$REPO"
node "$TEST"
