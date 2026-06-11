#!/bin/bash
# T19 fixture: /verify legacy slug fallback + folded-phase awareness + advisory.
# Updated 2026-06-11 (design-review P1/P2 Wave 3): the folded-phase mechanics
# moved from verify/SKILL.md to verify/reference/folded-phases.md (loaded on
# that branch); SKILL.md keeps the Phase 4a entry point. FR-tags were stripped
# per the spec-lineage policy; "advisory per D11" stays — it is an emitted
# log-line contract, kept verbatim.
set -e
cd "$(git rev-parse --show-toplevel)"

f=plugins/pmos-toolkit/skills/verify/SKILL.md
r=plugins/pmos-toolkit/skills/verify/reference/folded-phases.md

# Entry point still in SKILL.md, pointing at the reference
/usr/bin/grep -q "Folded-phase awareness" "$f"
/usr/bin/grep -q "folded-phases.md" "$f"

# Mechanics intact in the reference file
/usr/bin/grep -q "msf-req-findings.md" "$r"
/usr/bin/grep -q "msf-findings.md" "$r"
/usr/bin/grep -q "legacy slug detected" "$r"
/usr/bin/grep -q "folded phases skipped per documented flags" "$r"
/usr/bin/grep -q "advisory per D11" "$r"

# Setup E (F4): advisory for Tier-3 with no folded artifacts/skips
/usr/bin/grep -q "may have been bypassed silently" "$r"

echo OK
