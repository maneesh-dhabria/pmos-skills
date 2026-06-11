#!/bin/bash
# T12b fixture: final-summary + resume both re-emit folded-phase failures.
# Updated 2026-06-11 (design-review P1/P2 Wave 3): the resume-panel format
# moved to reference/compact-checkpoint.md + reference/pipeline-status-template.md;
# FR-tags were stripped per the spec-lineage policy — greps are semantic-form now.
set -e
cd "$(git rev-parse --show-toplevel)"

d=plugins/pmos-toolkit/skills/feature-sdlc
f=$d/SKILL.md

# Final summary reads and emits folded-phase failures
n=$(/usr/bin/grep -c "folded_phase_failures\|Folded-phase failures" "$f")
test "$n" -ge 2
/usr/bin/grep -q "Folded-phase failures (N)" "$f"

# Resume Status panel re-emits the same subsection (Phase 0b → compact-checkpoint.md)
/usr/bin/grep -q "Resume Status panel" "$f"
/usr/bin/grep -q "Resume Status panel" "$d/reference/compact-checkpoint.md"
/usr/bin/grep -q "folded_phase_failures" "$d/reference/compact-checkpoint.md"

# Status template documents the failures block placement
/usr/bin/grep -q "folded_phase_failures" "$d/reference/pipeline-status-template.md"

echo OK
