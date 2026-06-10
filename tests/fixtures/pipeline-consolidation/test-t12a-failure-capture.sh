#!/bin/bash
# T12a fixture: folded-phase failure capture documented in 3 parent skills.
# State.yaml.phases.<parent>.folded_phase_failures[] append + chat-emit at append.
#
# Since the 2026-06-10 design-review P1, the capture mechanics (including the
# verbatim "advisory continue per D11" log-line contract) live canonically in
# _shared/folded-phase.md; a host SKILL.md may either document them inline
# (legacy) or delegate by citing the substrate and stating its state key.
set -e
cd "$(git rev-parse --show-toplevel)"

# The substrate carries the canonical log-line contract.
/usr/bin/grep -q "advisory continue per D11" \
  plugins/pmos-toolkit/skills/_shared/folded-phase.md \
  || { echo "MISS: advisory-continue log line in _shared/folded-phase.md"; exit 1; }

for s in requirements wireframes spec; do
  f=plugins/pmos-toolkit/skills/$s/SKILL.md
  /usr/bin/grep -q "folded_phase_failures" "$f" || { echo "MISS: folded_phase_failures in $s"; exit 1; }
  if /usr/bin/grep -q "folded-phase\.md" "$f"; then
    : # delegated to the substrate — capture + advisory-continue contract covered above
  else
    /usr/bin/grep -q "advisory continue per D11" "$f" || { echo "MISS: advisory continue in $s"; exit 1; }
    /usr/bin/grep -q "FR-50\|M1" "$f" || { echo "MISS: FR-50/M1 in $s"; exit 1; }
  fi
done

echo OK
