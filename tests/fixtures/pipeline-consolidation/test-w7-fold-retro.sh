#!/bin/bash
# W7 fixture: /feature-sdlc retro gate (formerly Phase 13, now {#retro-gate}).
# Updated 2026-06-11 (design-review P1/P2 Wave 3): slug-form heading grep
# (renumber-proof), matching the test-w1/w2/w3 conversion.
set -e
cd "$(git rev-parse --show-toplevel)"

f=plugins/pmos-toolkit/skills/feature-sdlc/SKILL.md

/usr/bin/grep -q '^## Phase .*reflect gate.*{#retro-gate}' "$f"
/usr/bin/grep -q 'Skip (Recommended)' "$f"
/usr/bin/grep -q 'Run /reflect --last 5' "$f"
/usr/bin/grep -q 'phase_minimal_skip: retro' "$f"

# state-schema retro entry documented (T2 prerequisite still holds)
/usr/bin/grep -q "retro" plugins/pmos-toolkit/skills/feature-sdlc/reference/state-schema.md

echo OK
