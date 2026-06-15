#!/usr/bin/env bash
# Verify the parameterized template, with defaults applied, renders the two-token
# wordmark contract (FR-1/2/3): the header brand-mark wordmark → {{repo_url}} (repo
# root), the footer wordmark + both attribution links → {{plugin_url}} (per-plugin
# README). Exits non-zero on any unexpected drift.
set -euo pipefail
TPL="plugins/pmos-toolkit/skills/_shared/html-authoring/template.html"
PLUGIN_NAME="pmos-toolkit"
PLUGIN_NAME_NBSP="pmos&#8209;toolkit"
REPO_URL="https://github.com/maneesh-dhabria/pmos-skills"
PLUGIN_URL="https://github.com/maneesh-dhabria/pmos-skills/blob/main/plugins/pmos-toolkit/README.md"
# Escape sed-replacement special chars (& and |) in the values before substitution.
sed_esc() { printf '%s' "$1" | sed -e 's/[&|]/\\&/g'; }
NAME_ESC=$(sed_esc "$PLUGIN_NAME")
NBSP_ESC=$(sed_esc "$PLUGIN_NAME_NBSP")
REPO_ESC=$(sed_esc "$REPO_URL")
URL_ESC=$(sed_esc "$PLUGIN_URL")
rendered=$(sed -e "s|{{plugin_name}}|$NAME_ESC|g" \
               -e "s|{{plugin_name_nbsp}}|$NBSP_ESC|g" \
               -e "s|{{repo_url}}|$REPO_ESC|g" \
               -e "s|{{plugin_url}}|$URL_ESC|g" "$TPL")
# No tokens left unsubstituted.
echo "$rendered" | grep -q '{{repo_url}}\|{{plugin_url}}' && { echo "FAIL: unsubstituted url token"; exit 1; }
# Header brand-mark wordmark → repo root (exactly once).
hc=$(echo "$rendered" | grep -c "<a class=\"pmos-wordmark\" href=\"$REPO_URL\"")
[[ "$hc" == "1" ]] || { echo "FAIL: header wordmark not repo_url exactly once (got $hc)"; exit 1; }
# Footer wordmark → per-plugin README.
echo "$rendered" | grep -q "<a class=\"pmos-wordmark pmos-wordmark--footer\" href=\"$PLUGIN_URL\"" \
  || { echo "FAIL: footer wordmark not plugin_url"; exit 1; }
# href to the plugin README appears 3× (footer wordmark + 2 attributions).
pc=$(echo "$rendered" | grep -c "href=\"$PLUGIN_URL\"")
[[ "$pc" == "3" ]] || { echo "FAIL: plugin_url href count != 3 (got $pc)"; exit 1; }
echo "$rendered" | grep -q "Created using $PLUGIN_NAME_NBSP" || { echo "FAIL: inner text drift"; exit 1; }
count=$(echo "$rendered" | grep -c 'data-pmos-plugin="pmos-toolkit"')
[[ "$count" == "2" ]] || { echo "FAIL: data-pmos-plugin not present exactly twice (got $count)"; exit 1; }
# No archived-repo reference survives anywhere in the render.
echo "$rendered" | grep -q 'maneesh-dhabria/pmos-toolkit' && { echo "FAIL: archived repo reference present"; exit 1; }
echo "PASS: template two-token wordmark contract for pmos-toolkit defaults"
