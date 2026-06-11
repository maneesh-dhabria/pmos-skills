#!/bin/bash
# T13 fixture: started_at write contract + resume idempotency.
# Updated 2026-06-11 (design-review P1/P2 Wave 3): the write contract stayed in
# SKILL.md; the field tables moved to reference/state-schema.md; FR-tags were
# stripped per the spec-lineage policy — greps are slug/semantic-form now.
set -e
cd "$(git rev-parse --show-toplevel)"

f=plugins/pmos-toolkit/skills/feature-sdlc/SKILL.md
g=plugins/pmos-toolkit/skills/feature-sdlc/reference/state-schema.md

# Write contract present in SKILL.md, idempotency semantics intact
/usr/bin/grep -q "Phase status-transition write contract" "$f"
/usr/bin/grep -q "only if currently null" "$f"
/usr/bin/grep -q "original timestamp" "$f"

# started_at defined in the schema reference (field tables moved there)
/usr/bin/grep -q "started_at" "$f"
n=$(/usr/bin/grep -c "started_at" "$g")
test "$n" -ge 3

# Schema doc keeps the explicit write contract (only set if currently null)
/usr/bin/grep -q "only set if currently null" "$g"

# Atomic write contract documented (temp-then-rename / rename(2))
/usr/bin/grep -q "rename(2)" "$f"

echo OK
