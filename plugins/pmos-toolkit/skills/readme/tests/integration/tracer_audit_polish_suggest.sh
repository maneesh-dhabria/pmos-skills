#!/usr/bin/env bash
# Tracer: assert SKILL.md #audit close-out wires the
# FR-V-2 Suggest:/polish line in the documented shape, and that the count
# of "Suggest: /polish" occurrences across SKILL.md is in [1, 3].
#
# Since SKILL.md is a markdown spec (not a runnable program), this test
# inspects the spec text directly. T9's audit_clean.sh exercises the
# rubric runtime path; this tracer locks the close-out template.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SKILL_MD="$HERE/../../SKILL.md"
[[ -f "$SKILL_MD" ]] || { echo "FAIL: SKILL.md missing"; exit 1; }

# 1. The Suggest:/polish template line must appear, matching the documented shape.
if ! grep -qE 'Suggest: /polish [^—]+ — tighten prose without changing meaning\.' "$SKILL_MD"; then
  echo "FAIL: SKILL.md missing or malformed Suggest:/polish template line"
  grep -n "Suggest: /polish" "$SKILL_MD" || true
  exit 1
fi

# 2. Occurrence count in [1, 3]. Multiple occurrences are allowed (one per
#    citation; the audit close-out paragraph is the authoritative wording).
COUNT="$(grep -c 'Suggest: /polish' "$SKILL_MD")"
if [[ "$COUNT" -lt 1 || "$COUNT" -gt 3 ]]; then
  echo "FAIL: unexpected Suggest:/polish occurrence count: $COUNT (expected 1-3)"
  exit 1
fi

# 3. Audit-mode close-out paragraph must declare the unconditional Suggest line
#    applies "Both modes" (not just scaffold/update).
if ! grep -qF 'Both modes additionally emit' "$SKILL_MD"; then
  echo "FAIL: SKILL.md audit-mode close-out missing 'Both modes additionally emit' clause"
  exit 1
fi

echo "PASS: Suggest:/polish line wired (occurrences=$COUNT; both-modes clause present)"
