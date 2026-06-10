#!/usr/bin/env bash
# lint-non-interactive-inline.sh
#
# Verify that the canonical non-interactive inline block (between
# `<!-- non-interactive-block:start -->` and `<!-- non-interactive-block:end -->`)
# is present and identical across all supported skills (every user-invokable
# skill except those that carry a `<!-- non-interactive: refused` marker).
#
# Scope: ALL plugins — plugins/*/skills/<name>/SKILL.md (extended from
# pmos-toolkit-only on 2026-06-10; the canonical source remains pmos-toolkit's).
#
# Canonical source: plugins/pmos-toolkit/skills/_shared/non-interactive.md (Section 0)
# Required in:      every plugins/<plugin>/skills/<name>/SKILL.md unless it carries a
#                   `<!-- non-interactive: refused` or `<!-- non-interactive: delegated`
#                   marker (refused = errors under --non-interactive; delegated = a thin
#                   alias that forwards to another skill which owns the contract).
#
# W14 posture (DECIDED 2026-06-05, master-plan T6.1): the contract is HAND-MAINTAINED,
# not auto-propagated. The block is ~27 lines, sentinel-guarded, and changes rarely; a
# body-rewriting "sync" tool would carry more corruption risk than the small re-paste tax
# it removes. This lint DETECTS drift; fixes are manual (copy the canonical block between
# the sentinels). Exemptions are explicit, self-documenting markers in the skill files
# (refused / delegated) — never a hidden allowlist in this script.
#
# Exit codes:
#   0 — all supported skills match canonical
#   1 — drift detected, missing markers, or block missing in a supported skill
#   2 — script invocation error (bad arguments, missing tools, missing canonical)

set -euo pipefail

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PLUGIN_ROOT="$( cd -- "${SCRIPT_DIR}/.." &> /dev/null && pwd )"
REPO_ROOT="$( cd -- "${PLUGIN_ROOT}/../.." &> /dev/null && pwd )"

CANONICAL_FILE="${PLUGIN_ROOT}/skills/_shared/non-interactive.md"

START_MARKER='<!-- non-interactive-block:start -->'
END_MARKER='<!-- non-interactive-block:end -->'

# Build the list of supported skills across ALL plugins: every
# plugins/<plugin>/skills/<dir>/SKILL.md except _shared, learnings, or any skill
# carrying a `<!-- non-interactive: refused` / `delegated` marker.
# Entries are "<plugin>/<skill>" relative names.
SUPPORTED_SKILLS=()
for d in "${REPO_ROOT}"/plugins/*/skills/*/; do
    name=$(basename "$d")
    plugin=$(basename "$(dirname "$(dirname "$d")")")
    [[ "$name" == "_shared" || "$name" == "learnings" ]] && continue
    [[ ! -f "$d/SKILL.md" ]] && continue
    # Exempt (self-documenting markers in the skill file): refused = errors under
    # --non-interactive; delegated = thin alias forwarding to a skill that owns the contract.
    grep -qE '^[[:space:]]*<!-- non-interactive: (refused|delegated)' "$d/SKILL.md" && continue
    SUPPORTED_SKILLS+=("${plugin}/${name}")
done

# Extract content between markers (exclusive of marker lines).
extract_block() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        return 1
    fi
    awk -v start="$START_MARKER" -v end="$END_MARKER" '
        $0 == start { in_block = 1; found_start = 1; next }
        $0 == end   { in_block = 0; found_end = 1; next }
        in_block    { print }
        END         { exit (found_start && found_end) ? 0 : 1 }
    ' "$file"
}

if [[ ! -f "$CANONICAL_FILE" ]]; then
    echo "ERROR: canonical file not found: $CANONICAL_FILE" >&2
    exit 2
fi

CANONICAL=$(extract_block "$CANONICAL_FILE") || {
    echo "ERROR: canonical file is missing non-interactive-block markers." >&2
    echo "       expected both ${START_MARKER} and ${END_MARKER} in:" >&2
    echo "       $CANONICAL_FILE" >&2
    exit 2
}

if [[ -z "${CANONICAL//[$' \t\n']/}" ]]; then
    echo "ERROR: canonical block is empty in $CANONICAL_FILE" >&2
    exit 2
fi

DRIFT_COUNT=0
MISSING_COUNT=0

for skill in "${SUPPORTED_SKILLS[@]}"; do
    skill_file="${REPO_ROOT}/plugins/${skill%%/*}/skills/${skill#*/}/SKILL.md"

    if [[ ! -f "$skill_file" ]]; then
        echo "MISSING: ${skill}/SKILL.md not found at ${skill_file}"
        MISSING_COUNT=$((MISSING_COUNT + 1))
        continue
    fi

    if ! actual=$(extract_block "$skill_file"); then
        echo "MISSING-BLOCK: ${skill}/SKILL.md is missing non-interactive-block markers."
        echo "  Expected both ${START_MARKER} and ${END_MARKER} in: ${skill_file}"
        DRIFT_COUNT=$((DRIFT_COUNT + 1))
        continue
    fi

    if [[ "$actual" == "$CANONICAL" ]]; then
        echo "OK:      ${skill}/SKILL.md"
    else
        echo "DRIFT:   ${skill}/SKILL.md"
        echo "  --- canonical (from ${CANONICAL_FILE#"${REPO_ROOT}"/}) ---"
        echo "  +++ ${skill}/SKILL.md +++"
        diff <(printf '%s\n' "$CANONICAL") <(printf '%s\n' "$actual") \
            | sed 's/^/  /' || true
        DRIFT_COUNT=$((DRIFT_COUNT + 1))
    fi
done

echo
TOTAL_FAIL=$((DRIFT_COUNT + MISSING_COUNT))
if [[ $TOTAL_FAIL -eq 0 ]]; then
    echo "PASS: all ${#SUPPORTED_SKILLS[@]} supported skills match canonical."
    exit 0
else
    echo "FAIL: ${TOTAL_FAIL} skill(s) failed (drift=${DRIFT_COUNT}, missing=${MISSING_COUNT}) of ${#SUPPORTED_SKILLS[@]} supported."
    exit 1
fi
