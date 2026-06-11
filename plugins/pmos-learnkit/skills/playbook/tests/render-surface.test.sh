#!/usr/bin/env bash
# render-surface.test.sh — /playbook emit-surface assertion.
#
# /playbook renders articles through the learnkit html-authoring substrate
# (skills/_shared/html-authoring/template.html + render.js), the same contract
# the toolkit fanout test (plugins/pmos-toolkit/skills/_shared/html-authoring/
# tests/fanout.test.sh) enforces for its 14 toolkit surfaces. That matrix is
# toolkit-only, and the _shared copies are kept byte-identical across plugins
# by scripts/sync-shared.sh, so playbook registers its surface HERE (a
# skill-local test) rather than by diverging the synced fanout list.
#
# Asserts a rendered article carries:
#   (1) an inline <style> block            (CSS baked in),
#   (2) the inline pmos-comments sentinel  (annotatable; /comments can route),
#   (3) <meta name="pmos:skill" content="playbook">  (self-identifies),
#   (4) the article body EXACTLY once — regression for the render gotcha:
#       template.html's leading doc-comment contains literal {{content}}
#       tokens; rendering without stripping it duplicates the body.
#
# Zero-dependency beyond node >=18 (the skill's existing floor).
set -uo pipefail

# Resolve skill dir with the repo's BASH_SOURCE fallback invariant.
SRC="${BASH_SOURCE[0]:-$0}"
TESTS_DIR="$(cd "$(dirname "$SRC")" 2>/dev/null && pwd)"
if [ -z "$TESTS_DIR" ] || [ ! -f "$TESTS_DIR/render-surface.test.sh" ]; then
  d="$PWD"; while [ "$d" != "/" ]; do [ -f "$d/SKILL.md" ] && break; d="$(dirname "$d")"; done
  TESTS_DIR="$d/tests"
fi
SKILL_DIR="$(cd "$TESTS_DIR/.." && pwd)"
SUBSTRATE="$(cd "$SKILL_DIR/../_shared/html-authoring" 2>/dev/null && pwd)"

fail=0
ok()  { printf 'ok   - %s\n' "$1"; }
bad() { printf 'FAIL - %s\n' "$1"; fail=1; }

command -v node >/dev/null 2>&1 || { bad "node not available (skill requires node >=18)"; exit 1; }
[ -n "$SUBSTRATE" ] && [ -f "$SUBSTRATE/render.js" ] && [ -f "$SUBSTRATE/template.html" ] \
  || { bad "learnkit html-authoring substrate not found at ../_shared/html-authoring"; exit 1; }
[ -f "$SKILL_DIR/reference/artifact-template.html" ] \
  || { bad "reference/artifact-template.html missing"; exit 1; }

OUT="$(node -e '
  const fs = require("fs");
  const path = require("path");
  const substrate = process.argv[1];
  const { renderArtifact } = require(path.join(substrate, "render.js"));
  let tmpl = fs.readFileSync(path.join(substrate, "template.html"), "utf8");
  // The documented render procedure: strip the leading doc-comment so its
  // literal {{content}}/{{inline_css}} tokens are not re-substituted.
  tmpl = tmpl.replace(/^<!--[\s\S]*?-->\s*/, "");
  const content = "<section><h2 id=\"tldr\">PLAYBOOK_RENDER_PROBE</h2></section>";
  process.stdout.write(renderArtifact({
    template: tmpl,
    title: "sample playbook article",
    content,
    sourcePath: "index.html",
    assetPrefix: "assets/",
    pluginVersion: "0.0.0-test",
    pmosSkill: "playbook",
    pluginName: "pmos-learnkit",
    pluginNameNbsp: "pmos&#8209;learnkit",
    pluginUrl: "https://github.com/maneesh-dhabria/pmos-skills#readme",
  }));
' "$SUBSTRATE")" || { bad "renderArtifact() threw"; exit 1; }

grep -q '<style' <<<"$OUT" \
  && ok "inline <style> block present" \
  || bad "missing inline <style> block"
grep -q 'pmos-comments:start' <<<"$OUT" \
  && ok "inline pmos-comments sentinel present (article is annotatable)" \
  || bad "missing inline pmos-comments sentinel"
grep -q 'content="playbook"' <<<"$OUT" \
  && ok 'meta pmos:skill content="playbook" present' \
  || bad 'missing <meta name="pmos:skill" content="playbook">'
PROBES="$(grep -o 'PLAYBOOK_RENDER_PROBE' <<<"$OUT" | wc -l | tr -d ' ')"
[ "$PROBES" -eq 1 ] \
  && ok "article body appears exactly once (doc-comment gotcha regression)" \
  || bad "article body appears $PROBES times (expected 1 — leading doc-comment not stripped?)"

[ "$fail" -eq 0 ] && { echo "ALL RENDER-SURFACE CHECKS PASSED"; exit 0; } \
  || { echo "RENDER-SURFACE CHECKS FAILED"; exit 1; }
