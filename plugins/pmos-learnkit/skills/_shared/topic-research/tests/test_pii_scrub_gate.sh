#!/usr/bin/env bash
# test_pii_scrub_gate.sh — deterministic PII scrub gate over curated-references.json
#
# Design anchor: 02_design.html#pii-gate. Asserts the shipped corpus carries ONLY the
# allowed field set, no notion-specific provenance, and content-derived ids.
#
# Dependencies: bash + node (zero npm deps). The gate logic lives in pii_scrub_gate.mjs;
# this wrapper runs it over the real shipped file and runs the planted-fail selftest.
#
#   ./test_pii_scrub_gate.sh            # gate the shipped corpus + run selftest
#   ./test_pii_scrub_gate.sh --selftest # selftest only (planted-fail + real-pass)
#
# Authored T1 (RED until T2 produces the corpus). bash-3.2 safe; BASH_SOURCE fallback.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SUBSTRATE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
GATE="$SCRIPT_DIR/pii_scrub_gate.mjs"
CORPUS="$SUBSTRATE_DIR/curated-references.json"

if [[ ! -f "$CORPUS" ]]; then
  echo "FAIL: shipped corpus not found at $CORPUS (run scripts/import-curated-references.mjs — T2)" >&2
  exit 1
fi

if [[ "${1:-}" == "--selftest" ]]; then
  node "$GATE" --selftest "$CORPUS"
  exit $?
fi

echo "== gate: shipped corpus =="
node "$GATE" "$CORPUS"

echo "== selftest: planted notion_page_id must FAIL, real file must PASS =="
node "$GATE" --selftest "$CORPUS"

echo "test_pii_scrub_gate.sh: PASS"
