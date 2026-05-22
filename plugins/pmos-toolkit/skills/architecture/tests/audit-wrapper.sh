#!/usr/bin/env bash
# tests/audit-wrapper.sh — test-only shim for v2 (T1).
#
# Why: production /architecture writes the HTML+MD+JSON triplet to
# {docs_path}/architecture/ and leaves stdout EMPTY (FR-66 / D17). Most
# existing fixtures' .assert scripts pre-date v2 and parse stdout via `jq`.
# To keep them green during the rename pass without rewriting every .assert
# in one go, this wrapper runs run-audit.sh, then cats the produced JSON
# sidecar to stdout. Tests that explicitly check the empty-stdout contract
# (e.g. output-triplet/) invoke run-audit.sh directly, bypassing this wrapper.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$HERE/.." && pwd)"
SCAN_ROOT="${1:-.}"
shift || true
# tests/run.sh bakes `.` into $AUDIT and many .assert scripts append `.`
# again — drop the duplicate so run-audit.sh sees one positional, not two.
if [ "${1:-}" = "." ]; then shift; fi
# Remove any prior triplet so cat picks up exactly this run's output.
rm -rf docs/pmos/architecture/ 2>/dev/null || true
bash "$SKILL_DIR/scripts/run-audit.sh" audit "$SCAN_ROOT" "$@" 2>/dev/null
rc=$?
json="$(ls -t docs/pmos/architecture/*.json 2>/dev/null | head -1 || true)"
if [ -n "$json" ] && [ -f "$json" ]; then
  cat "$json"
fi
exit "$rc"
