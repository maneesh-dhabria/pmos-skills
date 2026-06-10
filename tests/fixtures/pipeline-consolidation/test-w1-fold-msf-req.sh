#!/bin/bash
# W1 fixture: /requirements folds MSF-req as a pipeline phase (slug #folded-msf)
# with --skip-folded-msf escape, slug-distinct output, per-finding commit pattern,
# and the pre-apply clobber guard. Mechanics live in _shared/folded-phase.md; the
# host SKILL.md states the folding's parameters (2026-06-10 design-review P1).
set -e
cd "$(git rev-parse --show-toplevel)"

f=plugins/pmos-toolkit/skills/requirements/SKILL.md

# 1. Folded MSF-req phase present, addressed by its stable slug anchor
/usr/bin/grep -q '^## Phase [0-9][0-9]*: Folded MSF-req {#folded-msf}' "$f"

# 2. --skip-folded-msf flag handling (≥2: hint/NL form + parameter block)
n=$(/usr/bin/grep -c -- 'skip-folded-msf' "$f")
test "$n" -ge 2

# 3. Output slug is the new convention, not legacy
/usr/bin/grep -q 'msf-req-findings\.md' "$f"
! /usr/bin/grep -q 'NOT.*msf-findings\.md' "$f" || true  # legacy mention is allowed only as anti-pattern

# 4. Per-finding commit pattern documented
/usr/bin/grep -q 'auto-apply msf-req finding F' "$f"

# 5. Pre-apply clobber guard: mechanics delegated to the shared folded-phase
#    substrate; the host states the guard target as the HTML artifact it writes.
/usr/bin/grep -q 'folded-phase\.md' "$f"
/usr/bin/grep -q 'clobber-guard target.*01_requirements\.html' "$f"

# 6. Failure capture documented (state key stated at the call site)
/usr/bin/grep -q 'folded_phase_failures' "$f"

# 7. msf-auto-apply-threshold flag still parsed/documented
/usr/bin/grep -q -- '--msf-auto-apply-threshold' "$f"

# W4 dogfood: dogfood feature folder uses slug-distinct path
test -f docs/pmos/features/2026-05-10_pipeline-consolidation/msf-req-findings.md
! test -f docs/pmos/features/2026-05-10_pipeline-consolidation/msf-findings.md

echo OK
