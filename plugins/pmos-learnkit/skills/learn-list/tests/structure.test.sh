#!/usr/bin/env bash
# structure.test.sh — invariants for the /learn-list skill.
# Asserts the skill-specific structural contract that skill-eval.md's [D] checks
# assume. Run from anywhere: `bash tests/structure.test.sh`.
# Dependencies: bash >= 3.2, coreutils (grep, sed, awk, wc, head, basename). No Node.
#
#   bash structure.test.sh            # run the assertions against the sibling SKILL.md
#   bash structure.test.sh --selftest # confirm the harness itself is wired correctly
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]:-$0}")" &>/dev/null && pwd)"
SKILL_DIR="$(cd -- "$SCRIPT_DIR/.." &>/dev/null && pwd)"
SKILL_MD="$SKILL_DIR/SKILL.md"

fails=0
ok()   { printf 'PASS  %s\n' "$1"; }
bad()  { printf 'FAIL  %s\n' "$1"; fails=$((fails+1)); }

if [[ "${1:-}" == "--selftest" ]]; then
  [[ -f "$SKILL_MD" ]] && echo "SELFTEST PASS: found $SKILL_MD" && exit 0
  echo "SELFTEST FAIL: no SKILL.md at $SKILL_MD" >&2; exit 1
fi

[[ -f "$SKILL_MD" ]] || { echo "ERROR: no SKILL.md at $SKILL_MD" >&2; exit 2; }

# Frontmatter region (line 1 '---' to next '---').
fm_end="$(awk 'NR==1&&/^---/{next} /^---[[:space:]]*$/{print NR;exit}' "$SKILL_MD")"
fm() { sed -n "1,${fm_end}p" "$SKILL_MD"; }
body() { sed -n "$((fm_end+1)),\$p" "$SKILL_MD"; }

# 1. name == dir basename
name="$(fm | grep -m1 '^name:' | sed -E 's/^name:[[:space:]]*//')"
[[ "$name" == "$(basename "$SKILL_DIR")" ]] && ok "name == dir ($name)" || bad "name '$name' != dir '$(basename "$SKILL_DIR")'"

# 2. description is a single line (not a folded block scalar)
desc_line="$(fm | grep -m1 '^description:' | sed -E 's/^description:[[:space:]]*//')"
[[ -n "$desc_line" && "$desc_line" != ">"* && "$desc_line" != "|"* ]] && ok "description is single-line inline" || bad "description missing or a block scalar"

# 3. claude-code invocability
fm | grep -qE '^user-invocable:[[:space:]]*true' && ok "user-invocable: true" || bad "missing user-invocable: true"
fm | grep -qE '^argument-hint:' && ok "argument-hint present" || bad "missing argument-hint"

# 4. numbered Capture Learnings phase (literal heading the [D] check greps for)
body | grep -qE '^##+[[:space:]]+Phase[[:space:]]+[0-9N][^:]*:.*Capture Learnings' \
  && ok "numbered Capture Learnings phase" || bad "no numbered '## Phase N: ... Capture Learnings'"

# 5. required structural sections
for h in 'Platform Adaptation' 'Track Progress'; do
  body | grep -qE "^##+[[:space:]]+$h" && ok "## $h present" || bad "missing ## $h"
done
body | grep -qi 'learnings\.md' && ok "learnings.md load line" || bad "no learnings.md load instruction"

# 6. every reference/*.md over 100 lines opens with a ToC in its first 15 lines
if [[ -d "$SKILL_DIR/reference" ]]; then
  while IFS= read -r rf; do
    [[ -z "$rf" ]] && continue
    n="$(wc -l < "$rf")"
    if [[ "$n" -gt 100 ]]; then
      if head -15 "$rf" | grep -qiE '^##+[[:space:]]+(Contents|Table of contents|Index)'; then
        ok "ToC in $(basename "$rf") (${n} lines)"
      else
        bad "no ToC in >100-line $(basename "$rf")"
      fi
    fi
  done < <(find "$SKILL_DIR/reference" -type f -name '*.md')
fi

# 7. no hard-coded absolute bundle paths in SKILL.md or references
if grep -rnE '(/Users/|/home/)[A-Za-z0-9._-]+/' "$SKILL_MD" "$SKILL_DIR/reference" 2>/dev/null | grep -v '\${' >/dev/null; then
  bad "hard-coded absolute path found"
else
  ok "no hard-coded absolute bundle paths"
fi

echo "----"
if [[ $fails -eq 0 ]]; then echo "ALL STRUCTURE CHECKS PASS"; exit 0; else echo "$fails FAILURE(S)"; exit 1; fi
