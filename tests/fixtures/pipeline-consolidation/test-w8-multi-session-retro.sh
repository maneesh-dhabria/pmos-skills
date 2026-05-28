#!/bin/bash
# W8 fixture: /reflect multi-session — Phase 1 cap, Phase 2 dispatch, Phase 4
# aggregation with boilerplate-strip, Phase 5 two-tier output + per-wave progress.
set -e
cd "$(git rev-parse --show-toplevel)"

f=plugins/pmos-toolkit/skills/reflect/SKILL.md

# T15: Phase 1 cap + 0-candidate handling + most-recent-20 default
/usr/bin/grep -q "Phase 1 (multi-session prelude)" "$f"
/usr/bin/grep -q "most-recent-20" "$f"
/usr/bin/grep -q "no transcripts found" "$f"
/usr/bin/grep -q "D18\|D32\|FR-40" "$f"

# T16: 5-in-flight + 60s timeout + scanned-failed + per-wave progress
/usr/bin/grep -q "5 in-flight" "$f"
/usr/bin/grep -q "60s" "$f"
/usr/bin/grep -q "scanned-failed" "$f"
/usr/bin/grep -q "FR-42\|FR-44" "$f"

# T17: boilerplate-strip + nested constituents
/usr/bin/grep -q "Boilerplate-strip rules" "$f"
/usr/bin/grep -q "first-100-chars" "$f"
/usr/bin/grep -q "FR-45\|D10" "$f"

# T18: two-tier output + per-wave progress emit + seen across
/usr/bin/grep -q "## Recurring Patterns" "$f"
/usr/bin/grep -q "## Unique but Notable" "$f"
/usr/bin/grep -q "Wave i/N" "$f"
/usr/bin/grep -q "seen across" "$f"

echo OK
