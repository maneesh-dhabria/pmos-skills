#!/usr/bin/env bash
# lint-no-dot-shared — guard against the stale `.shared/` resolver directory.
#
# Context: prior to 2026-06, a `skills/.shared/resolve-input.md` held a legacy,
# .md-only resolver that predated the HTML-artifacts upgrade. The canonical,
# .html-aware resolver lives at `skills/_shared/resolve-input.md`. Several skills
# drifted to citing the stale `.shared/` path, silently running the old contract.
# That dir is deleted; this lint ensures it never reappears.
#
# Fails (exit 1) if any file under skills/ references a dot-prefixed `.shared/`
# path segment. `_shared/` (the real substrate) is never matched — the pattern
# requires a literal dot before `shared/`.
set -euo pipefail

# Resolve the plugin root robustly (BASH_SOURCE may be empty when sourced oddly).
SRC="${BASH_SOURCE[0]:-$0}"
ROOT="$(cd "$(dirname "$SRC")/.." 2>/dev/null && pwd || true)"
if [ -z "$ROOT" ] || [ ! -d "$ROOT/skills" ]; then
  # Fallback: walk up from PWD until skills/ is found.
  d="$PWD"
  while [ "$d" != "/" ] && [ ! -d "$d/skills" ]; do d="$(dirname "$d")"; done
  ROOT="$d"
fi
SKILLS="$ROOT/skills"
if [ ! -d "$SKILLS" ]; then
  echo "lint-no-dot-shared: could not locate skills/ from $SRC" >&2
  exit 2
fi

# A literal dot before `shared/`, not preceded by an alphanumeric/underscore
# (so `_shared/` and word-internal `…shared/` never match). Catches `../.shared/`
# and a backtick-prefixed `` `.shared/ ``.
hits="$(grep -rnE '(^|[^_[:alnum:]])\.shared/' "$SKILLS" 2>/dev/null || true)"

if [ -n "$hits" ]; then
  echo "lint-no-dot-shared: FAIL — forbidden '.shared/' reference(s) found; use '_shared/' instead:" >&2
  echo "$hits" >&2
  exit 1
fi

echo "lint-no-dot-shared: OK (no '.shared/' references under skills/)"
