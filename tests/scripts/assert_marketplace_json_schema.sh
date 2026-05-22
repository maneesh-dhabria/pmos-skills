#!/usr/bin/env bash
# Assert: both marketplace.json manifests parse and cross-match plugin.json.
# FR-04, FR-10, FR-11, FR-12, FR-14; spec §14.1.
# Note: asserts cross-manifest version equality, NOT a hardcoded literal — T1
# anchors the marketplace entries at plugin.json's value (2.49.0 pre-cutover),
# T11's /complete-dev bumps all four to 2.50.0 atomically.
set -e
fail=0
anchor_v=$(jq -r '.version' plugins/pmos-toolkit/.claude-plugin/plugin.json)
for m in .claude-plugin/marketplace.json .codex-plugin/marketplace.json; do
  if ! jq empty "$m" 2>/dev/null; then
    echo "FAIL: $m does not parse"; fail=1; continue
  fi
  name=$(jq -r '.name' "$m")
  if [ "$name" != "pmos-skills" ]; then
    echo "FAIL: $m top-level name expected 'pmos-skills', got '$name'"; fail=1
  fi
  count=$(jq -r '.plugins | length' "$m")
  if [ "$count" -lt 1 ]; then
    echo "FAIL: $m plugins[] is empty"; fail=1
  fi
  for k in name description source version category; do
    v=$(jq -r ".plugins[0].$k // empty" "$m")
    if [ -z "$v" ]; then
      echo "FAIL: $m plugins[0] missing key '$k'"; fail=1
    fi
  done
  pmos_v=$(jq -r '.plugins[] | select(.name=="pmos-toolkit") | .version' "$m")
  if [ "$pmos_v" != "$anchor_v" ]; then
    echo "FAIL: $m plugins[pmos-toolkit].version='$pmos_v' != plugin.json version='$anchor_v' (3-way invariant)"; fail=1
  fi
done
[ $fail -eq 0 ] || exit 1
echo "PASS: assert_marketplace_json_schema.sh (anchor=$anchor_v)"
