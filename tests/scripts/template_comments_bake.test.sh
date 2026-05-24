#!/usr/bin/env bash
# T8 — verify that template.html bakes comments substrate references and
# that plugins/pmos-toolkit/skills/spec/SKILL.md documents the comments asset-copy
# block (including the launcher trio) and the {{pmos_skill}} meta emit instruction.
#
# Spec refs: FR-01, FR-40.
#
# Exits 0 on success; 1 (with a clear failure message) otherwise.

set -u

# Resolve repo root from this script's location, with a fallback walk-up
# (per CLAUDE.md bash-portability invariant).
_script="${BASH_SOURCE[0]:-$0}"
if [[ -n "$_script" && -e "$_script" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "$_script")" && pwd)"
else
  SCRIPT_DIR=""
  _walk="$PWD"
  while [[ "$_walk" != "/" ]]; do
    if [[ -f "$_walk/CLAUDE.md" && -d "$_walk/plugins/pmos-toolkit" ]]; then
      SCRIPT_DIR="$_walk/tests/scripts"
      break
    fi
    _walk="$(dirname "$_walk")"
  done
  if [[ -z "$SCRIPT_DIR" ]]; then
    echo "FAIL: unable to resolve script directory or repo root" >&2
    exit 1
  fi
fi

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMPLATE="$REPO_ROOT/plugins/pmos-toolkit/skills/_shared/html-authoring/template.html"
SPEC_SKILL="$REPO_ROOT/plugins/pmos-toolkit/skills/spec/SKILL.md"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

[[ -f "$TEMPLATE" ]] || fail "template.html missing at $TEMPLATE"
[[ -f "$SPEC_SKILL" ]] || fail "spec SKILL.md missing at $SPEC_SKILL"

# --- Part A: template.html bake check ---
TMP="$(mktemp -t pmos_template_bake.XXXXXX)"
trap 'rm -f "$TMP"' EXIT

# Substitute placeholders. Use sed (BSD-compatible: no -E needed, plain s///).
sed \
  -e 's|{{asset_prefix}}|assets/|g' \
  -e 's|{{plugin_version}}|2.53.1|g' \
  -e 's|{{title}}|test|g' \
  -e 's|{{content}}|<p>x</p>|g' \
  "$TEMPLATE" > "$TMP"

grep -q 'comments\.css?v=2\.53\.1' "$TMP" \
  || fail "template.html did not bake comments.css?v=<plugin_version> (asset_prefix=assets/, plugin_version=2.53.1)"
grep -q 'comments\.js?v=2\.53\.1' "$TMP" \
  || fail "template.html did not bake comments.js?v=<plugin_version> (asset_prefix=assets/, plugin_version=2.53.1)"
grep -q '<meta name="pmos:skill"' "$TMP" \
  || fail "template.html missing <meta name=\"pmos:skill\" ...> tag"

# --- Part B: spec/SKILL.md asset-copy + meta-emit documentation ---
grep -q 'comments-open\.command' "$SPEC_SKILL" \
  || fail "spec/SKILL.md does not mention comments-open.command in the asset-copy list"
grep -q 'comments-open\.sh' "$SPEC_SKILL" \
  || fail "spec/SKILL.md does not mention comments-open.sh in the asset-copy list"
grep -q 'comments-open\.bat' "$SPEC_SKILL" \
  || fail "spec/SKILL.md does not mention comments-open.bat in the asset-copy list"
grep -q 'pmos:skill' "$SPEC_SKILL" \
  || fail "spec/SKILL.md missing emit-instruction note for <meta name=\"pmos:skill\" content=\"spec\">"

echo "PASS: template.html bakes comments substrate and spec/SKILL.md documents launcher trio + pmos:skill meta"
exit 0
