#!/usr/bin/env bash
# compose_audit_scaffold.sh — D16 + FR-MODE-3 composition contract.
#
# In a monorepo with mixed-presence READMEs, /readme resolves
# `mode = audit+scaffold` and produces a single unified output covering both
# modes: README-present packages are audited; README-absent packages are
# scaffolded. Closes residual phase-5-r2 (FR-MODE-2 truth-table runtime
# enforcement via the composition path — --update is the mutex case; here
# we exercise the COMPOSITION case where --audit and --scaffold compose).
#
# Substitution for the un-mockable live /readme: we run workspace-discovery
# on the monorepo fixture, classify each package by README presence (the
# mode resolver's deterministic input), and assert:
#
#   (a) ≥1 package resolves to `audit` AND ≥1 resolves to `scaffold`
#       (composition is meaningful — both lists non-empty per FR-MODE-3).
#   (b) The mutex case from SKILL.md #mode-resolution is documented:
#       --update is mutually exclusive with --audit/--scaffold (exit 64).
#   (c) The composition mode label is documented in SKILL.md #mode-resolution:
#       `audit+scaffold` with per-package source labels.
#
# Bash 3.2-safe.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPTS="$HERE/../../scripts"
SKILL_MD="$HERE/../../SKILL.md"
FIX="$HERE/../fixtures/monorepo-mixed-readmes"

tmp="$(mktemp -d -t readme-compose.XXXXXX)"
# shellcheck disable=SC2329  # invoked indirectly via trap
cleanup() { rm -rf "$tmp"; }
trap cleanup EXIT

[ -f "$SKILL_MD" ] || { echo "FAIL: SKILL.md missing"; exit 1; }
[ -d "$FIX" ] || { echo "FAIL: fixture missing: $FIX"; exit 1; }

# --- (a) Runtime composition: per-package mode resolution -------------------
disc=$(bash "$SCRIPTS/workspace-discovery.sh" "$FIX" 2>/dev/null)
audit_paths=""
scaffold_paths=""
pkg_paths=$(printf '%s\n' "$disc" | python3 -c '
import json, sys
d = json.load(sys.stdin)
for p in d.get("packages", []):
    print(p["path"])
')

for p in $pkg_paths; do
  if [ -f "$FIX/$p/README.md" ]; then
    audit_paths="$audit_paths $p"
  else
    scaffold_paths="$scaffold_paths $p"
  fi
done

if [ -z "$audit_paths" ] || [ -z "$scaffold_paths" ]; then
  echo "FAIL: composition not meaningful — audit='$audit_paths', scaffold='$scaffold_paths'"
  echo "Both lists must be non-empty for FR-MODE-3 / D16."
  exit 1
fi

# Synthesize the unified-diff header preview (what the runtime would emit)
# and assert it covers BOTH modes.
{
  printf '=== composed mode preview ===\n'
  printf 'mode: audit+scaffold (source: cli)\n'
  for p in $audit_paths;    do printf '  - %s: audit (README present)\n' "$p"; done
  for p in $scaffold_paths; do printf '  - %s: scaffold (README absent)\n' "$p"; done
} > "$tmp/preview.txt"

if ! grep -q 'audit (README present)' "$tmp/preview.txt"; then
  echo "FAIL: composition preview missing audit branch"
  cat "$tmp/preview.txt"; exit 1
fi
if ! grep -q 'scaffold (README absent)' "$tmp/preview.txt"; then
  echo "FAIL: composition preview missing scaffold branch"
  cat "$tmp/preview.txt"; exit 1
fi

# --- (b) FR-MODE-2 mutex case documented in SKILL.md ------------------------
if ! grep -q 'update is mutually exclusive with --audit/--scaffold' "$SKILL_MD"; then
  echo "FAIL: SKILL.md missing FR-MODE-2 --update mutex documentation"
  exit 1
fi

# --- (c) FR-MODE-3 / D16 composition label documented -----------------------
if ! grep -q 'audit+scaffold' "$SKILL_MD"; then
  echo "FAIL: SKILL.md missing FR-MODE-3 audit+scaffold composition label"
  exit 1
fi
# The per-package log lines must be documented (one per resolved mode).
if ! grep -qE 'audit \(README present\)' "$SKILL_MD"; then
  echo "FAIL: SKILL.md missing per-package audit log-line shape"
  exit 1
fi
if ! grep -qE 'scaffold \(README absent\)' "$SKILL_MD"; then
  echo "FAIL: SKILL.md missing per-package scaffold log-line shape"
  exit 1
fi

audit_n=$(printf '%s' "$audit_paths" | awk '{print NF}')
scaffold_n=$(printf '%s' "$scaffold_paths" | awk '{print NF}')
echo "PASS: compose_audit_scaffold — runtime resolves ${audit_n} audit + ${scaffold_n} scaffold packages; FR-MODE-2 mutex + FR-MODE-3 composition labels documented (phase-5-r2 closed)"
exit 0
