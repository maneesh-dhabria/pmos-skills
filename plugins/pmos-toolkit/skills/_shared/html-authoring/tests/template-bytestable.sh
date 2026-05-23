#!/usr/bin/env bash
# Verify the parameterized template, with defaults applied, produces byte-identical
# user-visible attribution to the pre-T1 template. Exits non-zero on any unexpected diff.
set -euo pipefail
TPL="plugins/pmos-toolkit/skills/_shared/html-authoring/template.html"
PLUGIN_NAME="pmos-toolkit"
PLUGIN_NAME_NBSP="pmos&#8209;toolkit"
PLUGIN_URL="https://github.com/maneesh-dhabria/pmos-toolkit#readme"
# Escape sed-replacement special chars (& and |) in the values before substitution.
sed_esc() { printf '%s' "$1" | sed -e 's/[&|]/\\&/g'; }
NAME_ESC=$(sed_esc "$PLUGIN_NAME")
NBSP_ESC=$(sed_esc "$PLUGIN_NAME_NBSP")
URL_ESC=$(sed_esc "$PLUGIN_URL")
rendered=$(sed -e "s|{{plugin_name}}|$NAME_ESC|g" \
               -e "s|{{plugin_name_nbsp}}|$NBSP_ESC|g" \
               -e "s|{{plugin_url}}|$URL_ESC|g" "$TPL")
echo "$rendered" | grep -q "href=\"$PLUGIN_URL\"" || { echo "FAIL: href not rendered"; exit 1; }
echo "$rendered" | grep -q "Created using $PLUGIN_NAME_NBSP" || { echo "FAIL: inner text drift"; exit 1; }
count=$(echo "$rendered" | grep -c 'data-pmos-plugin="pmos-toolkit"')
[[ "$count" == "2" ]] || { echo "FAIL: data-pmos-plugin not present exactly twice (got $count)"; exit 1; }
echo "PASS: template byte-stable for pmos-toolkit defaults"
