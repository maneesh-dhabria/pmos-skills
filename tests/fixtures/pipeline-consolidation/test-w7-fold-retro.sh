#!/bin/bash
# W7 fixture: /feature-sdlc gains Phase 13 retro gate.
set -e
cd "$(git rev-parse --show-toplevel)"

f=plugins/pmos-toolkit/skills/feature-sdlc/SKILL.md

/usr/bin/grep -q '^## Phase 13: /reflect gate' "$f"
/usr/bin/grep -q 'Skip (Recommended)' "$f"
/usr/bin/grep -q 'Run /reflect --last 5' "$f"
/usr/bin/grep -q 'phase_minimal_skip: retro' "$f"

# state-schema retro entry documented (T2 prerequisite still holds)
/usr/bin/grep -q "retro" plugins/pmos-toolkit/skills/feature-sdlc/reference/state-schema.md

echo OK
