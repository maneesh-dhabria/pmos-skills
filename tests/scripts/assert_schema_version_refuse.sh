#!/usr/bin/env bash
# T16 inline verification — /comments resolver schema_version refuse-load.
# Refs: E4, S3, T16.
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

TEST="$REPO/tests/scripts/schema-version-refuse.test.sh"
if [ ! -f "$TEST" ]; then
  echo "FAIL: test file missing at $TEST" >&2
  exit 2
fi

cd "$REPO"
bash "$TEST"
