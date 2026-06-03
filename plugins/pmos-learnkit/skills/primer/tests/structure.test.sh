#!/usr/bin/env bash
# structure.test.sh — invariants for the /primer skill (front-half unification).
# Asserts the shared topic-research substrate is inlined and the removed
# four-strand / short-circuit machinery is gone. Run from anywhere.
# Dependencies: bash >= 3.2, coreutils. No Node.
#
#   bash structure.test.sh            # assertions against the sibling SKILL.md
#   bash structure.test.sh --selftest # confirm the harness is wired
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]:-$0}")" &>/dev/null && pwd)"
SKILL_DIR="$(cd -- "$SCRIPT_DIR/.." &>/dev/null && pwd)"
SKILL_MD="$SKILL_DIR/SKILL.md"
SHARED_TR="$SKILL_DIR/../_shared/topic-research"

fails=0
ok()  { printf 'PASS  %s\n' "$1"; }
bad() { printf 'FAIL  %s\n' "$1"; fails=$((fails+1)); }

if [[ "${1:-}" == "--selftest" ]]; then
  [[ -f "$SKILL_MD" ]] && echo "SELFTEST PASS: found $SKILL_MD" && exit 0
  echo "SELFTEST FAIL: no SKILL.md at $SKILL_MD" >&2; exit 1
fi
[[ -f "$SKILL_MD" ]] || { echo "ERROR: no SKILL.md at $SKILL_MD" >&2; exit 2; }

fm_end="$(awk 'NR==1&&/^---/{next} /^---[[:space:]]*$/{print NR;exit}' "$SKILL_MD")"
# Materialize once — avoids `cmd | grep -q` SIGPIPE flakiness under pipefail.
FM="$(sed -n "1,${fm_end}p" "$SKILL_MD")"
BODY="$(sed -n "$((fm_end+1)),\$p" "$SKILL_MD")"
has()  { grep -qiE "$1" <<<"$BODY"; }

# name == dir
name="$(grep -m1 '^name:' <<<"$FM" | sed -E 's/^name:[[:space:]]*//')"
[[ "$name" == "$(basename "$SKILL_DIR")" ]] && ok "name == dir ($name)" || bad "name '$name' != dir"

# unified dials retained
arg_hint="$(grep -m1 '^argument-hint:' <<<"$FM")"
grep -q -- '--depth'    <<<"$arg_hint" && ok "argument-hint has --depth"    || bad "missing --depth"
grep -q -- '--audience' <<<"$arg_hint" && ok "argument-hint has --audience" || bad "missing --audience"

# inlines the shared substrate front half
for doc in intake canon-discovery outline sourcing; do
  grep -qF "_shared/topic-research/$doc.md" <<<"$BODY" \
    && ok "inlines _shared/topic-research/$doc.md" || bad "does not inline $doc.md"
done

# substrate docs exist
for f in intake canon-discovery outline sourcing source-tiers sourcing-ladder; do
  [[ -f "$SHARED_TR/$f.md" ]] && ok "substrate $f.md exists" || bad "missing substrate $f.md"
done

# removed machinery: no four-strand, no practitioner_index
has 'four-strand'        && bad "stale 'four-strand' remains" || ok "no four-strand remnant"
has 'practitioner_index' && bad "stale 'practitioner_index' remains" || ok "no practitioner_index remnant"
# the ≥3-source short-circuit must be gone; the only allowed 'short-circuit' mentions
# are negations stating it does NOT short-circuit.
sc_live="$(grep -i 'short-circuit' <<<"$BODY" | grep -viE 'not? short-circuit|never short-circuit|no short-circuit' || true)"
[[ -z "$sc_live" ]] && ok "no live short-circuit" || bad "a non-negated 'short-circuit' mention remains"

# adjacency pointer section present (FR-16)
has '[Ww]here this connects|adjacency pointer' \
  && ok "adjacency pointer section/directive present" || bad "no adjacency pointer section"

# source-floor framed as eval-time signal (FR-13)
has 'eval-time coverage signal' && ok "floor = eval-time coverage signal" || bad "floor not reframed as eval-time signal"

echo "----"
if [[ $fails -eq 0 ]]; then echo "ALL PRIMER STRUCTURE CHECKS PASS"; exit 0; else echo "$fails FAILURE(S)"; exit 1; fi
