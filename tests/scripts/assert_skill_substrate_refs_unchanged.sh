#!/usr/bin/env bash
set -e
n_token=$(grep -rE '\$\{CLAUDE_PLUGIN_ROOT\}/skills/_shared' plugins/pmos-toolkit/skills/ | wc -l | tr -d ' ')
n_hard=$(grep -rE 'plugins/pmos-toolkit/skills/_shared' plugins/pmos-toolkit/skills/ | wc -l | tr -d ' ')
if [ "$n_token" -lt 28 ]; then echo "FAIL: token-ref count $n_token below floor 28"; exit 1; fi
if [ "$n_hard" -ne 0 ]; then echo "FAIL: $n_hard hardcoded plugins/pmos-toolkit/skills/_shared/ refs introduced"; exit 1; fi
echo "PASS: assert_skill_substrate_refs_unchanged.sh ($n_token token refs, 0 hardcoded)"
