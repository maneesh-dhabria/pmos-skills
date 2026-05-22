#!/usr/bin/env bash
set -e
SKILL=plugins/pmos-toolkit/skills/complete-dev/SKILL.md
filtered=$(awk '
  /<!-- allow-hardcoded/ { allow=1; next }
  /<!-- \/allow-hardcoded -->/ { allow=0; next }
  !allow { print }
' "$SKILL")
hits=$(echo "$filtered" | grep -nE 'plugins/pmos-toolkit/' | grep -vE 'plugins/\$\{plugin_name\}' || true)
n=$(echo "$hits" | grep -c . || echo 0)
n_markers=$(grep -c '<!-- allow-hardcoded' "$SKILL" || echo 0)
if [ "$n_markers" -gt 1 ]; then echo "FAIL: $n_markers allow-hardcoded markers in $SKILL; cap is 1"; exit 1; fi
if [ "$n" -gt 0 ]; then
  echo "FAIL: $n hardcoded plugins/pmos-toolkit/ matches remain"
  echo "$hits"; exit 1
fi
echo "PASS: assert_no_hardcoded_pmos_toolkit_path_in_complete_dev.sh"
