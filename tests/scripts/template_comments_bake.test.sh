#!/usr/bin/env bash
# T8 — verify that template.html bakes the inline comments substrate and
# that plugins/pmos-toolkit/skills/spec/SKILL.md documents the comments asset-copy
# block (including the launcher trio) and the {{pmos_skill}} meta emit instruction.
#
# v2.58.0/T1: css+js are INLINED into the artifact (render.js concatenates
# style.css+comments.css into <style> and viewer.js+comments.js into <script>);
# there are no linked `comments.css?v=` assets to grep for anymore. Part A now
# renders via render.js (the real renderer) and asserts the substrate is inlined.
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

# --- Part A: template.html inline-bake check (rendered via render.js) ---
RENDER="$REPO_ROOT/plugins/pmos-toolkit/skills/_shared/html-authoring/render.js"
[[ -f "$RENDER" ]] || fail "render.js missing at $RENDER"

TMP="$(mktemp -t pmos_template_bake.XXXXXX)"
trap 'rm -f "$TMP"' EXIT

# Render the template through the real renderer (inlines css/js + seed block).
node -e '
  const fs = require("fs");
  const { renderArtifact } = require(process.argv[1]);
  const template = fs.readFileSync(process.argv[2], "utf8");
  process.stdout.write(renderArtifact({
    template: template, title: "test", content: "<p>x</p>",
    pmosSkill: "spec", pluginVersion: "2.53.1", assetPrefix: "assets/"
  }));
' "$RENDER" "$TEMPLATE" > "$TMP" || fail "render.js failed to render template.html"

grep -q '/\* --- comments.css --- \*/' "$TMP" \
  || fail "render did not inline comments.css into the <style> block"
grep -q '/\* --- comments.js --- \*/' "$TMP" \
  || fail "render did not inline comments.js into the <script> block"
grep -q '<script id="pmos-comments" type="application/json">' "$TMP" \
  || fail "render did not bake the inline pmos-comments seed block"
grep -q '<meta name="pmos:skill" content="spec"' "$TMP" \
  || fail "render did not bake <meta name=\"pmos:skill\" content=\"spec\"> tag"

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
