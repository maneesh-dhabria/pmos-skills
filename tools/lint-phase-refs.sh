#!/usr/bin/env bash
# lint-phase-refs.sh
#
# Repo-wide hygiene lint: every textual "Phase <label>" reference in a skill's
# markdown must resolve to a phase that actually exists. Catches the ghost-ref
# disease documented in docs/pmos/reviews/2026-06-10_skill-design-review/
# cross-cutting/flags-phases.md §B (e.g. a reference to "Phase 7.6" that no
# heading defines, or "/feature-sdlc Phase 11" when feature-sdlc tops out at 10).
#
# Resolution model (Part B §B4.4 resolver sketch, hardened):
#   - DEFINITIONS: per skill directory, every non-fenced heading of the form
#     `## Phase <label>` (optionally bold) defines <label>; subsection headings
#     of the form `### 2c. Title` define their leading label; explicit `{#slug}`
#     anchors define `#slug`. The defined-label scope is the UNION of all .md
#     files in the skill directory (SKILL.md + reference/ + templates + tests),
#     so reference files referencing SKILL.md's phases resolve.
#   - IN-FILE REFS: any `Phase <label>` / `phase <label>` token resolves against
#     the current skill's scope. Slash-continued enumerations ("Phase 0/0.4/0.5")
#     also check each continuation label, but only non-pure-integer ones — pure
#     integers after a slash are progress notation ("Phase 3/8" = 3 of 8).
#   - CROSS-SKILL REFS: when the token is immediately preceded by a `/skill`
#     qualifier (optionally backticked/quoted, optional plugin prefix, optional
#     "SKILL.md"), the label resolves against the NAMED skill's scope instead.
#     A qualifier naming no known skill falls back to in-file resolution
#     (under-reporting by design — but retired-skill ghosts like "/push Phase 1a"
#     still surface when the label doesn't exist in the current skill either).
#   - PATH#ANCHOR REFS: `<skill>/SKILL.md#<slug>` resolves slug against the named
#     skill's explicit `{#slug}` anchors.
#
# Tuned to under-report (near-zero false positives beats completeness):
#   - "Phases 3–7" plurals, "Phase <N>" placeholders, "step 2.5c" sub-step
#     addressing, and bare enumerations without the Phase keyword are ignored.
#   - Definitions are never read from fenced code blocks (emitted-artifact
#     templates don't pollute the namespace); references inside fences ARE
#     checked (log-line string contracts are exactly where ghosts hide).
#
# Usage: tools/lint-phase-refs.sh [skill-dir ...]
#        default scope = every plugins/*/skills/<skill>/ (excl. _shared, learnings)
#        Definitions are always collected repo-wide so scoped runs still resolve
#        cross-skill references.
#
# Exit codes:
#   0 — every reference resolves
#   1 — at least one ghost reference (per-file report on stdout)
#   2 — invocation error
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
    REPO_ROOT="$PWD"
    while [[ "$REPO_ROOT" != "/" && ! -f "$REPO_ROOT/.claude-plugin/marketplace.json" ]]; do
        REPO_ROOT="$(dirname "$REPO_ROOT")"
    done
    if [[ ! -f "$REPO_ROOT/.claude-plugin/marketplace.json" ]]; then
        echo "ERROR: cannot locate repo root (no .claude-plugin/marketplace.json found)" >&2
        exit 2
    fi
fi

# --- All skill dirs (for definitions) + scan targets (args or all) ---
ALL_DIRS=()
for d in "$REPO_ROOT"/plugins/*/skills/*/; do
    name="$(basename "$d")"
    [[ "$name" == "_shared" || "$name" == "learnings" ]] && continue
    [[ -d "$d" ]] && ALL_DIRS+=("${d%/}")
done

TARGETS=()
if [[ $# -gt 0 ]]; then
    for arg in "$@"; do
        d="${arg%/}"
        if [[ ! -d "$d" ]]; then
            echo "ERROR: not a directory: $arg" >&2
            exit 2
        fi
        TARGETS+=("$d")
    done
else
    TARGETS=("${ALL_DIRS[@]}")
fi

if [[ ${#TARGETS[@]} -eq 0 ]]; then
    echo "ERROR: no skill directories to lint" >&2
    exit 2
fi

DEFS_FILE="$(mktemp -t lint-phase-defs)"
DEFS_AWK="$(mktemp -t lint-phase-defs-awk)"
REFS_AWK="$(mktemp -t lint-phase-refs-awk)"
trap 'rm -f "$DEFS_FILE" "$DEFS_AWK" "$REFS_AWK"' EXIT

# --- Pass 1: collect definitions (skill <TAB> label, skill <TAB> #anchor) ---
cat > "$DEFS_AWK" <<'AWK_EOF'
# Extract a phase label at the start of rest: 2, 11, 0a, 4b, 0.5, 2.5c, 2ac, U.1.
# Returns "" when no label or when the would-be label runs into more alnum text.
function labelat(rest,    lab, nxt) {
    if (match(rest, /^([0-9]+(\.[0-9]+)?[a-z]?[a-z]?|[A-Z]\.[0-9]+)/) > 0) {
        lab = substr(rest, 1, RLENGTH)
        nxt = substr(rest, RLENGTH + 1, 1)
        if (nxt ~ /[A-Za-z0-9]/) return ""
        return lab
    }
    return ""
}
FNR == 1 { fence = 0 }
{
    if ($0 ~ /^[ \t]*```/) { fence = 1 - fence; next }
    if (fence) next
    if ($0 ~ /^#+[ \t]/) {
        line = $0
        sub(/^#+[ \t]+/, "", line)
        sub(/^\*\*/, "", line)
        if (line ~ /^Phase[ \t]+/) {
            rest = line
            sub(/^Phase[ \t]+/, "", rest)
            lab = labelat(rest)
            if (lab != "") print SKILL "\t" lab
        } else {
            # Subsection-label heading: "### 2c. Title" / "### 4a) Title" / "### 2c: Title"
            lab = labelat(line)
            if (lab != "" && substr(line, length(lab) + 1, 1) ~ /[.):]/)
                print SKILL "\t" lab
        }
    }
    # Explicit {#slug} anchors (anywhere in the line).
    rest = $0
    while (match(rest, /\{#[A-Za-z0-9_-]+\}/) > 0) {
        print SKILL "\t#" substr(rest, RSTART + 2, RLENGTH - 3)
        rest = substr(rest, RSTART + RLENGTH)
    }
}
AWK_EOF

: > "$DEFS_FILE"
for dir in "${ALL_DIRS[@]}"; do
    skill="$(basename "$dir")"
    # shellcheck disable=SC2046 # md paths in this repo contain no whitespace
    files=$(find "$dir" -name '*.md' -type f | sort)
    [[ -z "$files" ]] && continue
    # shellcheck disable=SC2086
    awk -v SKILL="$skill" -f "$DEFS_AWK" $files >> "$DEFS_FILE"
done
sort -u "$DEFS_FILE" -o "$DEFS_FILE"

# --- Pass 2: scan references and resolve ---
cat > "$REFS_AWK" <<'AWK_EOF'
function labelat(rest,    lab, nxt) {
    if (match(rest, /^([0-9]+(\.[0-9]+)?[a-z]?[a-z]?|[A-Z]\.[0-9]+)/) > 0) {
        lab = substr(rest, 1, RLENGTH)
        nxt = substr(rest, RLENGTH + 1, 1)
        if (nxt ~ /[A-Za-z0-9]/) return ""
        return lab
    }
    return ""
}
# Path of the current file, relative to the repo root, for reporting.
function relname(    f) {
    f = FILENAME
    if (index(f, ROOT) == 1) f = substr(f, length(ROOT) + 1)
    return f
}
# Resolve one "Phase <lab>" reference whose "P" sits at absolute column mstart of line.
function check(line, lab, mstart,    pfx, tok, changed) {
    # Look immediately left of the token for a qualifier. Strip only glue chars
    # (quotes, backticks, commas, spaces, possessive 's) so the qualifier must be
    # truly adjacent — a closed-off "(via /skill)" earlier in the sentence never
    # claims the reference.
    pfx = substr(line, 1, mstart - 1)
    changed = 1
    while (changed) {
        changed = 0
        if (sub(/['\47"`,; \t]+$/, "", pfx)) changed = 1
        if (sub(/\47s$/, "", pfx))           changed = 1
    }
    # Possessive-pronoun reference ("…/requirements, which folds this in as its
    # Phase 5a"): the target skill is named in prose, not resolvable here — skip.
    if (pfx ~ /(^|[^A-Za-z])(its|their|whose)$/) return 0
    tok = ""
    if (match(pfx, /[a-z][a-z0-9-]*\/SKILL\.md$/) > 0) {
        # Path-form qualifier: `execute/SKILL.md` Phase 2a
        tok = substr(pfx, RSTART, RLENGTH)
        sub(/\/SKILL\.md$/, "", tok)
    } else if (match(pfx, /\/[a-z][a-z0-9:._-]*$/) > 0) {
        # Slash-form qualifier: /execute Phase 2a, /pmos-toolkit:grill Phase 3
        tok = substr(pfx, RSTART + 1, RLENGTH - 1)
    }
    sub(/^[a-z0-9-]+:/, "", tok)              # strip plugin prefix (pmos-toolkit:grill)
    if (tok != "" && tok !~ /\./ && (tok in isskill)) {
        if (!((tok "\t" lab) in defs)) {
            printf "FAIL %s:%d: CROSS-SKILL /%s Phase %s — no such phase heading in %s\n", relname(), FNR, tok, lab, tok
            return 1
        }
        return 0
    }
    # In-file (skill-scope) resolution.
    if (!((SKILL "\t" lab) in defs)) {
        printf "FAIL %s:%d: GHOST Phase %s — no heading defines it in %s/\n", relname(), FNR, lab, SKILL
        return 1
    }
    return 0
}
FNR == NR { defs[$1 "\t" $2] = 1; isskill[$1] = 1; next }
{
    # The canonical inline non-interactive block (byte-identical across every
    # prompting skill, enforced by lint-non-interactive-inline.sh) says "On
    # Phase 0 entry" as its OWN vocabulary (= skill entry). Skills without a
    # literal Phase 0 heading cannot fix that without breaking byte-identity,
    # so the frozen block is exempt from reference resolution.
    if (FNR == 1) niblock = 0
    if ($0 ~ /<!-- non-interactive-block:start -->/) { niblock = 1; next }
    if ($0 ~ /<!-- non-interactive-block:end -->/)   { niblock = 0; next }
    if (niblock) next
    line = $0
    if (line ~ /^[ \t]*```/) next   # fence delimiters carry no refs; fenced CONTENT is scanned
    pos = 1
    while (pos <= length(line)) {
        rest = substr(line, pos)
        if (match(rest, /[Pp]hase[ \t]+/) == 0) break
        mstart = pos + RSTART - 1                 # absolute col of "P"
        after  = mstart + RLENGTH                  # absolute col after "Phase "
        pos = after
        # Boundary before the keyword (reject "SubPhase", "per-phase", "Phases" is
        # already rejected by the required trailing space).
        if (mstart > 1 && substr(line, mstart - 1, 1) ~ /[A-Za-z0-9-]/) continue
        lab = labelat(substr(line, after))
        if (lab == "") continue
        bad += check(line, lab, mstart)
        # Slash-continued enumeration: "Phase 0/0.4/0.5". Pure-integer continuations
        # are progress notation ("Phase 3/8") and are skipped.
        cpos = after + length(lab)
        while (substr(line, cpos, 1) == "/") {
            lab2 = labelat(substr(line, cpos + 1))
            if (lab2 == "") break
            if (lab2 ~ /[.a-z]/) bad += check(line, lab2, mstart)
            cpos = cpos + 1 + length(lab2)
        }
        pos = cpos
    }
    # Cross-skill path#anchor refs: <skill>/SKILL.md#<slug>
    rest = $0
    while (match(rest, /[a-z][a-z0-9-]*\/SKILL\.md#[A-Za-z0-9_-]+/) > 0) {
        ref = substr(rest, RSTART, RLENGTH)
        rest = substr(rest, RSTART + RLENGTH)
        split(ref, parts, /\/SKILL\.md#/)
        if ((parts[1] in isskill) && !((parts[1] "\t#" parts[2]) in defs)) {
            printf "FAIL %s:%d: ANCHOR %s — no {#%s} anchor in %s\n", relname(), FNR, ref, parts[2], parts[1]
            bad++
        }
    }
}
END { exit (bad > 0) ? 1 : 0 }
AWK_EOF

TOTAL_VIOLATIONS=0
FAILED_SKILLS=0
SCANNED=0

for dir in "${TARGETS[@]}"; do
    skill="$(basename "$dir")"
    files=$(find "$dir" -name '*.md' -type f | sort)
    [[ -z "$files" ]] && continue
    SCANNED=$((SCANNED + 1))
    rel="${dir#"$REPO_ROOT"/}"
    # shellcheck disable=SC2086
    if out="$(awk -v SKILL="$skill" -v ROOT="$REPO_ROOT/" -f "$REFS_AWK" "$DEFS_FILE" $files)"; then
        echo "OK:      $rel"
    else
        printf '%s\n' "$out"
        n="$(printf '%s\n' "$out" | grep -c '^FAIL ' || true)"
        TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + n))
        FAILED_SKILLS=$((FAILED_SKILLS + 1))
    fi
done

echo
if [[ $TOTAL_VIOLATIONS -eq 0 ]]; then
    echo "PASS: ${SCANNED} skill(s) scanned, every phase reference resolves."
    exit 0
else
    echo "FAIL: ${TOTAL_VIOLATIONS} ghost reference(s) in ${FAILED_SKILLS} of ${SCANNED} skill(s)."
    exit 1
fi
