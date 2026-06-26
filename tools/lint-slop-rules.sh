#!/usr/bin/env bash
# lint-slop-rules.sh
#
# Drift-lint for the design-slop prevention floor (story 260624-aqb, epic 260624-3jp).
# The slop-engine's rule cross-validator: the prevention reference
# `_shared/slop-engine/design-slop-rules.md` is GENERATED from the registry's
# `SLOP_RULES[].skillGuideline` fields (gen-rules-doc.mjs). This lint asserts the
# link holds — every non-empty `skillGuideline` in registry.mjs appears VERBATIM in
# the floor — so detection (registry) and prevention (floor) can never silently
# drift apart (Inv-2: the registry is the single source of truth).
#
# The generator writes the floor from the same field, so a regenerated floor always
# passes by construction; this lint catches the MANUAL-EDIT drift case — someone
# hand-edits the floor, or lets it go stale against a changed registry — and fails
# LOUDLY, naming each offending rule. Never a silent pass on a parse miss.
#
# Registry parsing goes through `node` (a hard dependency of the slop-engine anyway)
# rather than brittle awk over JS object literals — the registry is an ES module.
#
# Usage: tools/lint-slop-rules.sh [registry.mjs] [floor.md]
#        defaults: the real _shared/slop-engine/{registry.mjs,design-slop-rules.md} pair.
#
# Exit codes:
#   0 — every skillGuideline substring is present in the floor (in sync)
#   1 — at least one skillGuideline is missing from the floor (drift; per-rule report)
#   2 — invocation error (missing registry/floor, or the registry can't be parsed)
#
# Bash-3.2-safe: no associative arrays, no mapfile; a while-read loop does the work.

set -euo pipefail
export LC_ALL=C

# --- Resolve repo root (BASH_SOURCE may be empty when sourced oddly; see CLAUDE.md "Bash portability") ---
SRC="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd -- "$(dirname -- "$SRC")" 2>/dev/null && pwd || true)"
if [[ -n "$SCRIPT_DIR" && -d "$SCRIPT_DIR/../plugins" ]]; then
    REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
else
    REPO_ROOT="$PWD"
    while [[ "$REPO_ROOT" != "/" && ! -f "$REPO_ROOT/.claude-plugin/marketplace.json" ]]; do
        REPO_ROOT="$(dirname "$REPO_ROOT")"
    done
    if [[ ! -f "$REPO_ROOT/.claude-plugin/marketplace.json" ]]; then
        echo "ERROR: cannot locate repo root (no .claude-plugin/marketplace.json found)" >&2
        exit 2
    fi
fi

ENGINE_DIR="$REPO_ROOT/plugins/pmos-toolkit/skills/_shared/slop-engine"
REGISTRY="${1:-$ENGINE_DIR/registry.mjs}"
FLOOR="${2:-$ENGINE_DIR/design-slop-rules.md}"

if [[ ! -f "$REGISTRY" ]]; then
    echo "ERROR: registry not found: $REGISTRY" >&2
    exit 2
fi
if [[ ! -f "$FLOOR" ]]; then
    echo "ERROR: prevention floor not found: $FLOOR (run gen-rules-doc.mjs to generate it)" >&2
    exit 2
fi

# --- Extract `id<TAB>skillGuideline` for every rule with a non-empty guideline ---
# node prints nothing + exits 3 if the registry can't be imported → invocation error.
PAIRS="$(node -e '
const { pathToFileURL } = require("url");
import(pathToFileURL(process.argv[1]).href)
  .then((m) => {
    const rules = m.SLOP_RULES;
    if (!Array.isArray(rules)) { console.error("registry has no SLOP_RULES array"); process.exit(3); }
    for (const r of rules) {
      const g = (r.skillGuideline || "").trim();
      if (g) process.stdout.write(r.id + "\t" + r.skillGuideline + "\n");
    }
  })
  .catch((e) => { console.error("registry import failed: " + e.message); process.exit(3); })
' "$REGISTRY")" || {
    echo "ERROR: could not parse $REGISTRY" >&2
    exit 2
}

if [[ -z "$PAIRS" ]]; then
    echo "ERROR: no skillGuideline entries found in $REGISTRY — registry parse smell" >&2
    exit 2
fi

# --- Assert each guideline appears verbatim in the floor ---
MISSING=0
CHECKED=0
while IFS=$'\t' read -r id guideline; do
    [[ -z "$id" ]] && continue
    CHECKED=$((CHECKED + 1))
    # grep -F: fixed string; -q: quiet; -e: guard against a leading dash in the guideline.
    if ! grep -Fq -e "$guideline" "$FLOOR"; then
        printf 'FAIL: rule `%s` — skillGuideline missing from the floor: "%s"\n' "$id" "$guideline"
        MISSING=$((MISSING + 1))
    fi
done <<< "$PAIRS"

echo
if [[ $MISSING -eq 0 ]]; then
    echo "PASS: ${CHECKED} skillGuideline(s) all present in $(basename "$FLOOR") — registry ↔ floor in sync."
    exit 0
else
    echo "FAIL: ${MISSING} of ${CHECKED} skillGuideline(s) absent from $(basename "$FLOOR") — DRIFT."
    echo "      Regenerate the floor:  node ${ENGINE_DIR#"$REPO_ROOT"/}/gen-rules-doc.mjs > ${FLOOR#"$REPO_ROOT"/}"
    exit 1
fi
