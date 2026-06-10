#!/bin/bash
# W2 fixture: /wireframes folds MSF-wf as a pipeline phase (slug #folded-msf-wf)
# with --skip-folded-msf-wf escape, slug-distinct per-wireframe output
# (msf-wf-findings/<id>.md), per-finding commit pattern, and the per-wireframe
# pre-apply clobber guard. Mechanics live in _shared/folded-phase.md +
# reference/folded-msf-wf.md; the host SKILL.md states the folding's
# parameters (2026-06-10 design-review P1).
set -e
cd "$(git rev-parse --show-toplevel)"

f=plugins/pmos-toolkit/skills/wireframes/SKILL.md

# 1. Folded MSF-wf phase present, addressed by its stable slug anchor
/usr/bin/grep -q '^## Phase [0-9][0-9]*: Folded MSF-wf {#folded-msf-wf}' "$f"

# 2. --skip-folded-msf-wf flag handling (≥2: hint/NL form + parameter block)
n=$(/usr/bin/grep -c -- 'skip-folded-msf-wf' "$f")
test "$n" -ge 2

# 3. Output slug is the per-wireframe directory convention, not legacy
/usr/bin/grep -q 'msf-wf-findings/<wireframe-id>\.md' "$f"

# 4. Per-finding commit pattern documented
/usr/bin/grep -q 'auto-apply msf-wf finding F' "$f"

# 5. Pre-apply clobber guard: mechanics delegated to the shared folded-phase
#    substrate; the host states the guard target as the per-wireframe HTML.
/usr/bin/grep -q 'folded-phase\.md' "$f"
/usr/bin/grep -q 'clobber-guard target.*<NN>_<slug>\.html' "$f"

# 6. Failure capture documented (state key stated at the call site)
/usr/bin/grep -q 'folded_phase_failures' "$f"

# 7. msf-auto-apply-threshold flag still parsed/documented
/usr/bin/grep -q -- '--msf-auto-apply-threshold' "$f"

echo OK
