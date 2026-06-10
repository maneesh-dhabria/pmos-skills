#!/usr/bin/env bash
# lint-flags-vs-hints.sh
#
# Repo-wide hygiene lint: keep each skill's `argument-hint:` frontmatter and its
# body's flag documentation in sync. Catches the two dead-flag disease classes
# documented in docs/pmos/reviews/2026-06-10_skill-design-review/cross-cutting/flags-phases.md:
#
#   (a) HINT-DEAD  — a `--flag` advertised in the argument-hint line that the body
#       never mentions (the "promise the skill doesn't keep" class, §A2).
#   (b) BODY-ONLY  — a `--flag` the body *defines* (bullet starting with the
#       backticked flag, table row whose first cell is the flag, or a heading that
#       starts with the backticked flag) that is absent from the argument-hint and
#       has no adjacent `<!-- nl-sugar -->` marker within 2 lines (the
#       undiscoverable-contract class, §A1 "❌ body only", ~25 instances at audit).
#
# Deliberately heuristic, tuned to under-report:
#   - Check (a) counts ANY literal body mention of the flag (incl. code fences) as
#     alive — only fully unmentioned hint flags fail.
#   - Check (b) counts only *definition sites*, never prose mentions ("other skills
#     pass `--backlog`" does not trigger), and skips fenced code blocks, so embedded
#     git/jq/script argv (`--porcelain`, `--arg`, …) never registers.
#   - A flag deliberately kept as natural-language sugar is exempted by placing
#     `<!-- nl-sugar -->` within 2 lines of (any of) its definition site(s).
#
# Usage: tools/lint-flags-vs-hints.sh [skill-dir ...]
#        default scope = every plugins/*/skills/<skill>/SKILL.md (excl. _shared, learnings)
#
# Exit codes:
#   0 — no violations
#   1 — at least one violation (per-file report on stdout)
#   2 — invocation error (bad arguments, missing files)
#
# Bash-3.2-safe: no associative arrays, no mapfile; awk does the bookkeeping.

set -euo pipefail

# Byte semantics for awk/grep: some skill files contain bytes that are invalid in
# UTF-8 locales, which makes BSD awk abort mid-file ("towc: multibyte conversion
# failure") and silently truncate the scan. C locale processes every byte.
export LC_ALL=C

# --- Resolve repo root (BASH_SOURCE may be empty when sourced oddly; see CLAUDE.md "Bash portability") ---
SRC="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd -- "$(dirname -- "$SRC")" 2>/dev/null && pwd || true)"
if [[ -n "$SCRIPT_DIR" && -d "$SCRIPT_DIR/../plugins" ]]; then
    REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
else
    # Fallback: walk up from $PWD until the marketplace manifest sentinel is found.
    REPO_ROOT="$PWD"
    while [[ "$REPO_ROOT" != "/" && ! -f "$REPO_ROOT/.claude-plugin/marketplace.json" ]]; do
        REPO_ROOT="$(dirname "$REPO_ROOT")"
    done
    if [[ ! -f "$REPO_ROOT/.claude-plugin/marketplace.json" ]]; then
        echo "ERROR: cannot locate repo root (no .claude-plugin/marketplace.json found)" >&2
        exit 2
    fi
fi

# --- Build target list ---
TARGETS=()
if [[ $# -gt 0 ]]; then
    for arg in "$@"; do
        d="${arg%/}"
        if [[ ! -d "$d" ]]; then
            echo "ERROR: not a directory: $arg" >&2
            exit 2
        fi
        if [[ ! -f "$d/SKILL.md" ]]; then
            echo "ERROR: no SKILL.md in: $arg" >&2
            exit 2
        fi
        TARGETS+=("$d")
    done
else
    for d in "$REPO_ROOT"/plugins/*/skills/*/; do
        name="$(basename "$d")"
        [[ "$name" == "_shared" || "$name" == "learnings" ]] && continue
        [[ -f "$d/SKILL.md" ]] && TARGETS+=("${d%/}")
    done
fi

if [[ ${#TARGETS[@]} -eq 0 ]]; then
    echo "ERROR: no skill directories with SKILL.md to lint" >&2
    exit 2
fi

# --- awk program (in a temp file to avoid shell-quoting hazards; bash-3.2-safe) ---
AWK_PROG="$(mktemp -t lint-flags-awk)"
trap 'rm -f "$AWK_PROG"' EXIT
cat > "$AWK_PROG" <<'AWK_EOF'
# Boundary check: char before a --flag match must not be alnum or another dash
# (rejects `a--b` em-dash typos and `---flag` rule fragments).
function bound_before(s, pos) {
    if (pos <= 1) return 1
    return (substr(s, pos - 1, 1) ~ /[A-Za-z0-9-]/) ? 0 : 1
}
# Collect every boundary-clean --flag token in s into arr (set semantics).
function collect_flags(s, arr,    rest, f) {
    rest = s
    while (match(rest, /--[a-z][a-z0-9-]*/) > 0) {
        f = substr(rest, RSTART, RLENGTH)
        if (bound_before(rest, RSTART)) arr[f] = 1
        rest = substr(rest, RSTART + RLENGTH)
    }
}
function first_flag(s) {
    if (match(s, /--[a-z][a-z0-9-]*/) > 0) return substr(s, RSTART, RLENGTH)
    return ""
}
BEGIN { fm = 0; fence = 0; nmark = 0; ndef = 0; hintfound = 0 }
NR == 1 && $0 ~ /^---[ \t]*$/ { fm = 1; next }
fm == 1 && $0 ~ /^---[ \t]*$/ { fm = 2; next }
fm == 1 {
    if ($0 ~ /^argument-hint:/) { hintfound = 1; collect_flags($0, HINT) }
    next
}
# Body (fm==2; fm==0 means the file has no frontmatter — treat everything as body).
{
    if ($0 ~ /^[ \t]*```/) { fence = 1 - fence; collect_flags($0, MENTION); next }
    collect_flags($0, MENTION)          # any literal mention keeps a hint flag alive
    if (fence) next                     # definition sites only outside code fences
    if ($0 ~ /<!--[ \t]*nl-sugar/) { nmark++; marks[nmark] = NR }
    isdef = 0
    if ($0 ~ /^[ \t]*[-*][ \t]+(\*\*)?`--[a-z]/)      isdef = 1   # bullet definition
    else if ($0 ~ /^[ \t]*\|[ \t]*`?--[a-z]/)          isdef = 1   # table row, flag-first cell
    else if ($0 ~ /^#+[ \t]+(\*\*)?`--[a-z]/)          isdef = 1   # heading starting with the flag
    if ($0 ~ /\?[ \t]*$/) isdef = 0   # checklist questions ("- `--help` complete?") are not definitions
    if (isdef) {
        f = first_flag($0)
        if (f == "--help" || f == "--version") f = ""   # universal CLI conventions, never skill contract
        if (f != "") {
            if (!(f in DEFFIRST)) DEFFIRST[f] = NR
            ndef++; defflag[ndef] = f; defline[ndef] = NR
        }
    }
}
END {
    bad = 0
    for (f in HINT) {
        if (!(f in MENTION)) {
            printf "FAIL %s: HINT-DEAD %s — advertised in argument-hint but never mentioned in the body\n", FILE, f
            bad++
        }
    }
    for (i = 1; i <= ndef; i++) {
        f = defflag[i]
        if (f in HINT) continue
        if (f in REPORTED) continue
        REPORTED[f] = 1
        exempt = 0
        for (j = 1; j <= ndef && !exempt; j++) {
            if (defflag[j] != f) continue
            for (k = 1; k <= nmark; k++) {
                d = defline[j] - marks[k]; if (d < 0) d = -d
                if (d <= 2) { exempt = 1; break }
            }
        }
        if (!exempt) {
            printf "FAIL %s: BODY-ONLY %s (line %d) — defined in body but absent from argument-hint and no <!-- nl-sugar --> marker\n", FILE, f, DEFFIRST[f]
            bad++
        }
    }
    if (!hintfound && bad > 0)
        printf "NOTE %s: no argument-hint line found in frontmatter\n", FILE
    exit (bad > 0) ? 1 : 0
}
AWK_EOF

# --- Run ---
TOTAL_VIOLATIONS=0
FAILED_FILES=0
SCANNED=0

for dir in "${TARGETS[@]}"; do
    file="$dir/SKILL.md"
    rel="${file#"$REPO_ROOT"/}"
    SCANNED=$((SCANNED + 1))
    if out="$(awk -v FILE="$rel" -f "$AWK_PROG" "$file")"; then
        echo "OK:      $rel"
    else
        printf '%s\n' "$out"
        n="$(printf '%s\n' "$out" | grep -c '^FAIL ' || true)"
        TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + n))
        FAILED_FILES=$((FAILED_FILES + 1))
    fi
done

echo
if [[ $TOTAL_VIOLATIONS -eq 0 ]]; then
    echo "PASS: ${SCANNED} skill(s) scanned, argument-hint and body flag docs are in sync."
    exit 0
else
    echo "FAIL: ${TOTAL_VIOLATIONS} violation(s) in ${FAILED_FILES} of ${SCANNED} skill(s)."
    exit 1
fi
