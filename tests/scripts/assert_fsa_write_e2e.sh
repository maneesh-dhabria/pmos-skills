#!/usr/bin/env bash
# T28 — Chrome FSA E2E test wrapper.
#
# By default, sets CHROME_DEVTOOLS_MCP_AVAILABLE=skip-this so the test skips
# gracefully in CI. Maintainers can manually invoke:
#
#   CHROME_DEVTOOLS_MCP_AVAILABLE=run bash tests/scripts/assert_fsa_write_e2e.sh
#
# for a live run after configuring chrome-devtools-mcp inside a Claude Code
# agent session with the MCP server wired up.
#
# EXIT CODES
#   0  — PASS (test passed) or SKIP (MCP not configured; expected in CI)
#   1  — FAIL (test ran and asserted failure)
#   2  — SETUP FAIL (test file missing or node not found)
#
# LIVE RUN NOTES
#   The live path (CHROME_DEVTOOLS_MCP_AVAILABLE=run) requires:
#     1. A Chrome / Chromium instance reachable via chrome-devtools-mcp.
#     2. The MCP server registered and connected in the current Claude Code session.
#     3. The test fixture at plugins/pmos-toolkit/skills/spec/tests/fixtures/02_spec_mini.html.
#   Without these prerequisites the test will exit 1 with a descriptive error.
#   This is expected and is the maintainer's responsibility to set up.

set -euo pipefail

# ── Resolve script location + repo root ──────────────────────────────────────

SRC="${BASH_SOURCE[0]:-$0}"
if [ -n "$SRC" ] && [ -e "$SRC" ]; then
  HERE="$(cd "$(dirname "$SRC")" && pwd)"
  REPO="$(cd "$HERE/../.." && pwd)"
else
  # Fallback: walk up from CWD until .git is found.
  REPO="$PWD"
  while [ "$REPO" != "/" ] && [ ! -d "$REPO/.git" ]; do
    REPO="$(dirname "$REPO")"
  done
  if [ ! -d "$REPO/.git" ]; then
    echo "FAIL: cannot resolve repo root (no .git found above $PWD)" >&2
    exit 2
  fi
fi

# ── Verify prerequisites ─────────────────────────────────────────────────────

TEST="$REPO/plugins/pmos-toolkit/skills/comments/tests/fsa-write.e2e.test.js"

if [ ! -f "$TEST" ]; then
  echo "FAIL: test file missing at $TEST" >&2
  exit 2
fi

if ! command -v node >/dev/null 2>&1; then
  echo "FAIL: node not found in PATH — cannot run E2E test" >&2
  exit 2
fi

# ── Run ──────────────────────────────────────────────────────────────────────

CHROME_DEVTOOLS_MCP_AVAILABLE="${CHROME_DEVTOOLS_MCP_AVAILABLE:-skip-this}" \
  node "$TEST"
