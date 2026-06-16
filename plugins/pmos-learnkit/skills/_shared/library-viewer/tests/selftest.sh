#!/usr/bin/env bash
# selftest.sh — library-viewer substrate gate.
#   (a) runs the frozen-API node --test suite (lib.test.mjs), and
#   (b) asserts the engine source stays skill-agnostic (D12): lib.mjs contains NO occurrence of
#       `frameworks` / `primer` / `learn-list` (mirrors the epic's assert_substrate_skill_agnostic.sh).
# bash-3.2-safe; resilient to a non-canonical BASH_SOURCE per the repo portability rule.
set -eu

# --- resolve this script's directory (BASH_SOURCE may be empty under `bash -c "source …"`) ---
SELF="${BASH_SOURCE[0]:-$0}"
if [ -n "$SELF" ] && [ -f "$SELF" ]; then
  HERE="$(cd "$(dirname "$SELF")" && pwd)"
else
  # walk up from $PWD until the substrate sentinel (lib.mjs) is found
  d="$PWD"
  while [ "$d" != "/" ] && [ ! -f "$d/lib.mjs" ] && [ ! -f "$d/tests/selftest.sh" ]; do d="$(dirname "$d")"; done
  if [ -f "$d/tests/selftest.sh" ]; then HERE="$d/tests"; elif [ -f "$d/lib.mjs" ]; then HERE="$d/tests"; else
    echo "selftest.sh: cannot resolve script directory" >&2; exit 2
  fi
fi
LIB="$HERE/../lib.mjs"

fail=0

echo "== library-viewer: node --test (frozen API) =="
if node --test "$HERE/"; then
  echo "  node --test: PASS"
else
  echo "  node --test: FAIL" >&2; fail=1
fi

echo "== library-viewer: skill-agnostic source grep (D12) =="
if grep -niE 'frameworks|primer|learn-list|learnlist' "$LIB" >/dev/null 2>&1; then
  echo "  FAIL: lib.mjs names a specific skill — substrate must stay skill-agnostic" >&2
  grep -niE 'frameworks|primer|learn-list|learnlist' "$LIB" >&2 || true
  fail=1
else
  echo "  skill-agnostic: PASS (no skill names in lib.mjs)"
fi

if [ "$fail" -eq 0 ]; then
  echo "selftest.sh: PASS"
else
  echo "selftest.sh: FAIL" >&2
fi
exit "$fail"
