#!/bin/bash
# T14 fixture: /reflect multi-session flag parser.
set -e
cd "$(git rev-parse --show-toplevel)"

f=plugins/pmos-toolkit/skills/reflect/SKILL.md

# All 7 new flags documented
for flag in -- '--last' '--days' '--since' '--project' '--skill' '--scan-all' '--msf-auto-apply-threshold'; do
  /usr/bin/grep -q -- "\`$flag" "$f" || { echo "MISS: $flag"; exit 1; }
done

# Validation rules documented
/usr/bin/grep -q "Mutually exclusive\|Mutex with" "$f"
/usr/bin/grep -q "exit 64" "$f"
/usr/bin/grep -q "Future dates" "$f"

# Argument-hint frontmatter has the flags too (T1 already added)
n=$(/usr/bin/grep -c -- '--last\|--days\|--since\|--project\|--scan-all' "$f")
test "$n" -ge 7

echo OK
