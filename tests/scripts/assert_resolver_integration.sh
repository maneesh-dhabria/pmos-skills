#!/usr/bin/env bash
# T17 inline verification — /comments resolver end-to-end integration test (FR-61).
# Exercises all 4 modes (confirm-each, batch, auto, non-interactive) and all
# closed-set error_enum branches against a curated 8-thread fixture.
# Refs: FR-20, FR-22, FR-24, FR-25, FR-27, FR-28, FR-31, FR-61; §6.1, §9.1, §9.2, §9.3.
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

TEST="$REPO/plugins/pmos-toolkit/skills/comments/tests/resolver.integration.test.js"
if [ ! -f "$TEST" ]; then
  echo "FAIL: test file missing at $TEST" >&2
  exit 2
fi

FIXTURE_HTML="$REPO/plugins/pmos-toolkit/skills/comments/tests/fixtures/integration/artifact.html"
if [ ! -f "$FIXTURE_HTML" ]; then
  echo "FAIL: integration fixture missing at $FIXTURE_HTML" >&2
  exit 2
fi

FIXTURE_SIDECAR="$REPO/plugins/pmos-toolkit/skills/comments/tests/fixtures/integration/sidecar.template.json"
if [ ! -f "$FIXTURE_SIDECAR" ]; then
  echo "FAIL: sidecar template missing at $FIXTURE_SIDECAR" >&2
  exit 2
fi

cd "$REPO"
node "$TEST"
