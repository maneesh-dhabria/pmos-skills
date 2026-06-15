#!/usr/bin/env bash
# Dogfood harness for story 260613-2m7 — exercises the deterministic core of the new
# /verify Phase-7 "Dogfood verdict" hard gate + Phase-8 verdict mapping against a fixture
# feature folder, exactly as authored in verify/SKILL.md. NOT shipped with the skill — it is
# this story's load-bearing dogfood evidence (AC7). The gate is deterministic on the
# `**Verdict:**` line, so its outcome is reproducible here without a live /verify run.
#
# Usage: gate-check.sh <fixture-feature-folder>
# Prints the resolved verdict (PASS | PASS-WITH-GAPS | FAIL) + enumerated gaps + any loud
# KNOWN/accepted residual lines, mirroring the Phase-8 verdict block. Exit 0 always (it reports).
set -u
FF="${1:?usage: gate-check.sh <fixture-feature-folder>}"

# Phase-7 gate: read the verdict line the dogfood task wrote for /verify (anatomy item 6).
VLINE=$(grep -rhoE '\*\*Verdict:\*\*.*' "$FF" 2>/dev/null | head -1)

# A TN−1 dogfood task is present iff a dogfood-run / verdict line exists in the folder (T2/3 by
# construction — /plan only emits TN−1 there). No line at all = MISSING for a T2/3 fixture.
if [ -z "$VLINE" ]; then
  echo "VERDICT: PASS-WITH-GAPS"
  echo "  - dogfood-verdict-missing: no TN−1 dogfood verdict found under $FF (Tier 2/3 non-skippable gate)."
  exit 0
fi

STATE=$(printf '%s' "$VLINE" | sed -E 's/.*\*\*Verdict:\*\*[[:space:]]*([a-z-]+).*/\1/')
RESID=$(printf '%s' "$VLINE" | sed -E 's/.*accepted_residuals:[[:space:]]*\[([^]]*)\].*/\1/')

if [ "$STATE" = "satisfied" ]; then
  # Gate green. (Other Phase-7 gates assumed green for the fixture — bare PASS available.)
  echo "VERDICT: PASS"
  echo "  dogfood-verdict gate: green (satisfied · objective green AND judge overall_satisfied)"
  exit 0
fi

# not-satisfied → cap at PASS-WITH-GAPS (FAIL only if a *critical* objective gate failed; the
# fixtures declare none critical). Enumerate each gap one-per-line; surface each still-failing
# accepted residual as a loud KNOWN/accepted line (non-blocking, carried to /complete-dev).
echo "VERDICT: PASS-WITH-GAPS"
echo "  dogfood-verdict gate: NOT satisfied → capped (no critical objective gate failed)"
# enumerate gaps from a `gaps:` block
awk '/^gaps:/{f=1;next} f&&/^- /{sub(/^- /,"");print "  - gap: "$0} f&&!/^- /{f=0}' \
  $(grep -rl '\*\*Verdict:\*\*' "$FF" | head -1)
# loud KNOWN/accepted line per accepted residual
if [ -n "${RESID// /}" ]; then
  IFS=',' read -ra RS <<< "$RESID"
  for r in "${RS[@]}"; do
    r_trimmed=$(printf '%s' "$r" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')
    [ -n "$r_trimmed" ] && echo "  - KNOWN / accepted: ${r_trimmed} (non-blocking; re-checked by /verify, surfaced in /complete-dev summary)"
  done
fi
exit 0
