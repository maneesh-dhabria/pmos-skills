#!/usr/bin/env bash
# assert_substrate_skill_agnostic.sh — D12 enforcement (FR-6, FR-21)
#
# The _shared/topic-research/ substrate MUST be skill-agnostic: it describes
# mechanism + emits typed outputs, and knows nothing about which skill inlines it.
# This test fails if any substrate doc names a consuming skill or branches on one.
#
# Dependencies: bash, grep. No other tooling.
# Self-test: run with --selftest to confirm the detector fires on an injected token.

set -euo pipefail

# Resolve the substrate dir relative to this script (portable; no absolute paths).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SUBSTRATE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Forbidden tokens: names of skills that consume this substrate.
# Case-insensitive. The substrate must reference neither.
PATTERN='primer|learn-list'

scan() {
  # Scan every *.md in the substrate dir (not the tests/ subdir).
  grep -rinE "$PATTERN" "$SUBSTRATE_DIR"/*.md 2>/dev/null || true
}

if [[ "${1:-}" == "--selftest" ]]; then
  tmp="$SUBSTRATE_DIR/__selftest_token.md"
  printf '%s\n' "this mentions /primer which must trip the detector" > "$tmp"
  hits="$(scan)"
  rm -f "$tmp"
  if echo "$hits" | grep -q "__selftest_token"; then
    echo "selftest PASS: detector fires on injected token"
    exit 0
  fi
  echo "selftest FAIL: detector did not fire on injected token" >&2
  exit 1
fi

hits="$(scan)"
if [[ -n "$hits" ]]; then
  echo "FAIL: substrate is not skill-agnostic (D12) — found skill-name references:" >&2
  echo "$hits" >&2
  echo "Fix: substrate docs describe mechanism + emit typed output; the consuming skill owns the reaction." >&2
  exit 1
fi

echo "PASS: _shared/topic-research/ is skill-agnostic (no primer/learn-list tokens)"
exit 0
