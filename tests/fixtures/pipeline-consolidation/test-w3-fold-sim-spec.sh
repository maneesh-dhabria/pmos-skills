#!/bin/bash
# W3 fixture: /spec folds simulate-spec as a pipeline phase (slug #folded-sim-spec)
# with --skip-folded-sim-spec escape, per-finding commit pattern, and substrate
# delegation. Mechanics (clobber guard, threshold, failure capture) live in
# _shared/folded-phase.md; the host SKILL.md states the folding's parameters
# (2026-06-10 design-review P1 — converted to slug-form greps like w1/w2).
set -e
cd "$(git rev-parse --show-toplevel)"

f=plugins/pmos-toolkit/skills/spec/SKILL.md

# 1. Folded simulate-spec phase present, addressed by its stable slug anchor
/usr/bin/grep -q '^## Phase [0-9][0-9]*: Folded simulate-spec.*{#folded-sim-spec}' "$f"

# 2. --skip-folded-sim-spec flag handling (≥2: hint/NL form + parameter block)
n=$(/usr/bin/grep -c -- 'skip-folded-sim-spec' "$f")
test "$n" -ge 2

# 3. Per-finding commit pattern documented
/usr/bin/grep -q 'auto-apply simulate-spec patch P' "$f"

# 4. Folding mechanics delegated to the shared folded-phase substrate; the host
#    states the folding's host artifact (clobber-guard target) as the HTML it writes.
/usr/bin/grep -q 'folded-phase\.md' "$f"
/usr/bin/grep -q 'host artifact.*02_spec\.html' "$f"

# 5. Failure capture documented (state key stated at the call site)
/usr/bin/grep -q 'folded_phase_failures' "$f"

# 6. Heuristics substrate delegation
/usr/bin/grep -q '_shared/sim-spec-heuristics.md' "$f"

echo OK
