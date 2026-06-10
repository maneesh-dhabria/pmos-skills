#!/usr/bin/env bash
# audit-recommended.sh
#
# Audit AskUserQuestion call sites in given SKILL.md files.
# Pass: every call has a (Recommended) option OR an adjacent <!-- defer-only: <reason> --> tag.
# Fail: at least one call is "unmarked" (neither).
#
# Reuses the awk extractor from skills/_shared/non-interactive.md (PD6).
#
# Usage: audit-recommended.sh [--strict-keywords] [--] [<SKILL.md>...]
#        audit-recommended.sh                      # uses default glob
#
# Exit codes:
#   0 — all calls in all given skills are marked
#   1 — at least one unmarked call (drift); per-line report on stderr
#   2 — invocation error (no SKILL.md, missing canonical file, bad args)

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PLUGIN_ROOT="$(cd -- "${SCRIPT_DIR}/.." &>/dev/null && pwd)"
CANONICAL="${PLUGIN_ROOT}/skills/_shared/non-interactive.md"

[[ -f "$CANONICAL" ]] || { echo "ERROR: canonical not found: $CANONICAL" >&2; exit 2; }

# Extract the awk extractor body from the canonical file's <!-- awk-extractor:... --> markers.
EXTRACTOR_AWK="$(awk '/<!-- awk-extractor:start -->/,/<!-- awk-extractor:end -->/' "$CANONICAL" \
  | awk '/^```awk$/{flag=1;next}/^```$/{flag=0}flag')"

[[ -n "$EXTRACTOR_AWK" ]] || { echo "ERROR: awk extractor empty in $CANONICAL" >&2; exit 2; }

# Parse args.
STRICT_KEYWORDS=0
TARGETS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --strict-keywords) STRICT_KEYWORDS=1; shift;;
    --) shift; TARGETS+=("$@"); break;;
    -*) echo "ERROR: unknown flag $1" >&2; exit 2;;
    *) TARGETS+=("$1"); shift;;
  esac
done

# Default glob if no targets.
if [[ ${#TARGETS[@]} -eq 0 ]]; then
  for d in "${PLUGIN_ROOT}"/skills/*/; do
    name=$(basename "$d")
    [[ "$name" == "_shared" || "$name" == "learnings" ]] && continue
    [[ -f "$d/SKILL.md" ]] && TARGETS+=("$d/SKILL.md")
  done
fi

[[ ${#TARGETS[@]} -gt 0 ]] || { echo "ERROR: no SKILL.md files to audit" >&2; exit 2; }

DESTRUCTIVE_KEYWORDS='overwrite|restart|discard|drift|delete|force|reset|wipe'

# --- Extractor false-positive filters (post-extraction, line-content based) ---
# The canonical awk extractor (PD6) over-approximates "call site" to any line
# mentioning AskUserQuestion. Two line shapes are provably never a prompt and
# are skipped here (the shared extractor stays untouched):
#
#   1. Platform-adaptation degradation bullets — the canonical
#      "- **No `AskUserQuestion` tool:**" bullet (and its
#      "- **Codex / no `AskUserQuestion`:**" variant) describes how the skill
#      degrades when the tool is ABSENT; it cannot issue a prompt.
#   2. Negative prose — "Do NOT … AskUserQuestion" (negation before the tool
#      name, same sentence) or "no AskUserQuestion" explicitly asserts that no
#      prompt fires at that point.
#
# Keep these tight: anything not matching exactly stays flagged (conservative).
SKIP_DEGRADATION_RE='^[[:space:]]*-[[:space:]]+\*\*(No `AskUserQuestion` tool|Codex / no `AskUserQuestion`):\*\*'
SKIP_NEGATIVE_RE='(Do NOT[^.]*|(^|[[:space:]])no )`?AskUserQuestion'

# Inline defer-only tags: a markdown table row cannot host the standalone tag
# line the extractor recognizes (a non-pipe line terminates the table), so a
# valid tag placed on the call line itself also satisfies "adjacent".
INLINE_TAG_RE='<!--[[:space:]]*defer-only:[[:space:]]*(destructive|free-form|ambiguous)[[:space:]]*-->'

TOTAL_FAIL=0

for skill_file in "${TARGETS[@]}"; do
  if [[ ! -f "$skill_file" ]]; then
    echo "MISSING: $skill_file" >&2
    TOTAL_FAIL=$((TOTAL_FAIL+1))
    continue
  fi

  if grep -qE '^[[:space:]]*<!-- non-interactive: refused' "$skill_file"; then
    echo "REFUSED: $(basename "$(dirname "$skill_file")")/SKILL.md (exempt)" >&2
    continue
  fi

  rows="$(awk "$EXTRACTOR_AWK" "$skill_file" || true)"
  n_calls=0; n_recc=0; n_defer=0; n_unmarked=0

  if [[ -n "$rows" ]]; then
    while IFS=$'\t' read -r line has_recc tag; do
      [[ -z "${line:-}" ]] && continue
      src="$(sed -n "${line}p" "$skill_file")"
      # Skip known never-a-prompt line shapes (see filter rationale above).
      if printf '%s\n' "$src" | grep -qE "$SKIP_DEGRADATION_RE"; then continue; fi
      if printf '%s\n' "$src" | grep -qE "$SKIP_NEGATIVE_RE"; then continue; fi
      n_calls=$((n_calls+1))
      # Honor a valid defer-only tag inlined on the call line itself
      # (table-row-safe form of "adjacent").
      if [[ "$tag" == "-" ]]; then
        inline_tag="$(printf '%s\n' "$src" | grep -oE "$INLINE_TAG_RE" | head -1 || true)"
        if [[ -n "$inline_tag" ]]; then
          tag="$(printf '%s\n' "$inline_tag" | sed -E 's/.*defer-only:[[:space:]]*([a-z-]+).*/\1/')"
        fi
      fi
      if [[ "$tag" != "-" ]]; then
        if [[ ! "$tag" =~ ^(destructive|free-form|ambiguous)$ ]]; then
          n_unmarked=$((n_unmarked+1))
          echo "UNMARKED: $skill_file:$line — defer-only tag has invalid reason '$tag' (expected: destructive|free-form|ambiguous)" >&2
        else
          n_defer=$((n_defer+1))
        fi
      elif [[ "$has_recc" == "1" ]]; then
        n_recc=$((n_recc+1))
      else
        n_unmarked=$((n_unmarked+1))
        echo "UNMARKED: $skill_file:$line — AskUserQuestion call has no (Recommended) option and no adjacent defer-only tag" >&2
      fi

      if [[ $STRICT_KEYWORDS -eq 1 ]]; then
        # Inspect the next 5 lines after the call site for a destructive keyword
        # in the question prose. Only warn when not already tagged destructive
        # and no Recommended option is present.
        if [[ "$tag" != "destructive" ]]; then
          window="$(awk -v start="$line" -v end="$((line+5))" 'NR>=start && NR<=end' "$skill_file")"
          kw="$(printf '%s' "$window" | grep -oE "$DESTRUCTIVE_KEYWORDS" | head -1 || true)"
          if [[ -n "$kw" ]]; then
            echo "WARN: $skill_file:$line — likely-destructive call without defer-only:destructive tag (matched keyword: $kw)" >&2
          fi
        fi
      fi
    done <<< "$rows"
  fi

  rel="${skill_file#"${PLUGIN_ROOT}"/}"
  echo "${rel}: ${n_calls} calls, ${n_recc} Recommended, ${n_defer} defer-only, ${n_unmarked} unmarked" >&2
  TOTAL_FAIL=$((TOTAL_FAIL + n_unmarked))
done

if [[ $TOTAL_FAIL -eq 0 ]]; then
  echo "PASS: all calls in ${#TARGETS[@]} skill(s) are marked." >&2
  exit 0
else
  echo "FAIL: ${TOTAL_FAIL} unmarked call(s) across ${#TARGETS[@]} skill(s)." >&2
  exit 1
fi
