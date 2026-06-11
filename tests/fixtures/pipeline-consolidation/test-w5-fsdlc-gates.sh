#!/bin/bash
# W5 fixture (T9 + extensions for T10/T11):
# Asserts /feature-sdlc/SKILL.md has no msf-req / simulate-spec orchestrator
# gates (folded into /requirements + /spec) and the 4 soft gates remain.
# Updated 2026-06-11 (design-review P1/P2 Wave 3): phases were renumbered with
# stable {#kebab-slug} anchors — greps are slug-form now (renumber-proof),
# matching the test-w1/w2/w3 conversion.
set -e
cd "$(git rev-parse --show-toplevel)"

f=plugins/pmos-toolkit/skills/feature-sdlc/SKILL.md
g=plugins/pmos-toolkit/skills/feature-sdlc/reference/state-schema.md

# T9: no orchestrator gate sections for the folded skills
test "$(/usr/bin/grep -c '^## Phase.*msf-req' "$f")" = 0
test "$(/usr/bin/grep -c '^## Phase.*simulate-spec' "$f")" = 0

# T9: the fold is documented (resume elision cites the folded slugs)
/usr/bin/grep -q '#folded-msf' "$f"
/usr/bin/grep -q '#folded-sim-spec' "$f"

# T9: pre-2.34.0 phase-id elision on read survives
/usr/bin/grep -q 'pre-2.34.0' "$f"
/usr/bin/grep -q 'elide' "$f"
/usr/bin/grep -q 'pre-2.34.0' "$g"

# 4 soft gate sections present, by slug (creativity, wireframes, prototype, retro)
for slug in creativity-gate wireframes-gate prototype-gate retro-gate; do
  test "$(/usr/bin/grep -c "{#$slug}" "$f")" = 1
done

# T11: --minimal flag + _minimal_active sentinel
n=$(/usr/bin/grep -c -- '_minimal_active\|--minimal' "$f")
test "$n" -ge 6
/usr/bin/grep -q 'phase_minimal_skip' "$f"
/usr/bin/grep -q 'orchestrator-level short-circuit' "$f"

# T11: argument-hint frontmatter contains --minimal
/usr/bin/grep -q -- '--minimal' "$f"

echo OK
