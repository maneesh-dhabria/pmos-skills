#!/usr/bin/env bats
# diagram-on-failure.bats — locks in the --on-failure contract in /diagram SKILL.md.
#
# Purpose: prevent silent regressions of the per-skill addendum that gates
# Phase 6a disposition on --on-failure when mode == non-interactive.
# See plugins/pmos-toolkit/skills/diagram/SKILL.md Phase 6a + Exit-Code contract.

SKILL="plugins/pmos-toolkit/skills/diagram/SKILL.md"

@test "argument-hint advertises --on-failure with all three values" {
  run grep -E 'argument-hint:.*--on-failure[[:space:]]+drop\|ship-with-warning\|exit-nonzero' "$SKILL"
  [ "$status" -eq 0 ]
}

@test "Phase 0 documents --on-failure default of exit-nonzero" {
  run grep -F 'Default when `mode == non-interactive` and flag absent: `exit-nonzero`' "$SKILL"
  [ "$status" -eq 0 ]
}

@test "Phase 6a documents Exit 3 for drop" {
  run grep -E '\| `drop` \|.*Exit 3' "$SKILL"
  [ "$status" -eq 0 ]
}

@test "Phase 6a documents Exit 0 for ship-with-warning" {
  run grep -E '\| `ship-with-warning` \|.*Exit 0' "$SKILL"
  [ "$status" -eq 0 ]
}

@test "Phase 6a documents Exit 4 for exit-nonzero" {
  run grep -E '\| `exit-nonzero` \|.*Exit 4' "$SKILL"
  [ "$status" -eq 0 ]
}

@test "Exit-Code contract table is present" {
  run grep -F 'Exit-Code contract' "$SKILL"
  [ "$status" -eq 0 ]
}

@test "Phase 6a AUQ tagged as interactive-only via explanatory comment" {
  run grep -F 'non-interactive: handled-via on-failure-flag' "$SKILL"
  [ "$status" -eq 0 ]
}
