#!/usr/bin/env bash
# T13 inline verification — wave-planner unit tests (FR-25, §S14, Decision P6).
set -euo pipefail

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

TEST="$REPO/plugins/pmos-toolkit/skills/comments/tests/wave-planner.test.js"
if [ ! -f "$TEST" ]; then
  echo "FAIL: test file missing at $TEST" >&2
  exit 2
fi

cd "$REPO"
node "$TEST"
