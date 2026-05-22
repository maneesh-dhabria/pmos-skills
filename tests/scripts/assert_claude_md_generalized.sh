#!/usr/bin/env bash
# Filter out content inside <!-- allow-hardcoded --> ... <!-- /allow-hardcoded -->
# marker pairs (intentional example blocks). Marker is the contract, not the heading.
# Loop-2 hardening: adds per-section behavioral assertions + marker-count cap.
set -e
fail=0
filtered=$(awk '
  /<!-- allow-hardcoded/ { allow=1; next }
  /<!-- \/allow-hardcoded -->/ { allow=0; next }
  !allow { print }
' CLAUDE.md)
hits=$(echo "$filtered" | grep -nE 'plugins/pmos-toolkit/' || true)
n_hits=$(echo "$hits" | grep -c '^[0-9]' || echo 0)
n_templated=$(grep -cE 'plugins/<plugin>/|plugins/\$\{plugin\}/' CLAUDE.md || echo 0)
if [ "$n_hits" -gt 0 ]; then echo "FAIL: $n_hits hardcoded pmos-toolkit refs outside <!-- allow-hardcoded --> markers:"; echo "$hits"; fail=1; fi
# Marker-count cap: at most one allow-hardcoded block in CLAUDE.md.
n_markers=$(grep -c '<!-- allow-hardcoded' CLAUDE.md || echo 0)
if [ "$n_markers" -gt 1 ]; then echo "FAIL: $n_markers allow-hardcoded markers in CLAUDE.md; cap is 1"; fail=1; fi
# Per-section behavioral assertions
# FR-70: ## Canonical skill path must mention plugins/<plugin>/skills/
sed -n '/^## Canonical skill path/,/^## /p' CLAUDE.md | grep -q 'plugins/<plugin>/skills' || { echo "FAIL: ## Canonical skill path does not reference plugins/<plugin>/skills"; fail=1; }
# FR-71: ## Skill-authoring conventions must mention plugins/<plugin>/skills/
sed -n '/^## Skill-authoring conventions/,/^## /p' CLAUDE.md | grep -q 'plugins/<plugin>/skills' || { echo "FAIL: ## Skill-authoring conventions does not reference plugins/<plugin>/skills"; fail=1; }
# FR-72: ## Plugin manifest version sync must mention marketplace.json
sed -n '/^## Plugin manifest version sync/,/^## /p' CLAUDE.md | grep -q 'marketplace.json' || { echo "FAIL: ## Plugin manifest version sync does not reference marketplace.json"; fail=1; }
# FR-73: ## Release entry point must mention --plugin
sed -n '/^## Release entry point/,/^## /p' CLAUDE.md | grep -q -- '--plugin' || { echo "FAIL: ## Release entry point does not mention --plugin"; fail=1; }
if [ "$n_templated" -lt 4 ]; then echo "FAIL: only $n_templated templated <plugin> refs; expected ≥ 4"; fail=1; fi
[ $fail -eq 0 ] || exit 1
echo "PASS: assert_claude_md_generalized.sh ($n_templated templated refs, 0 unauthorized hardcoded, $n_markers marker block)"
