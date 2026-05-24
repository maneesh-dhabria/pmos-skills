#!/usr/bin/env bash
# T15 inline verification — /comments resolver clarification flow + re-dispatch cap.
# Refs: FR-24, FR-29, S10, E10.
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

TEST="$REPO/plugins/pmos-toolkit/skills/comments/tests/resolver-clarify-redispatch.test.js"
if [ ! -f "$TEST" ]; then
  echo "FAIL: test file missing at $TEST" >&2
  exit 2
fi

cd "$REPO"
node "$TEST"
