#!/usr/bin/env bash
# T12 — 14-surface fanout assertion (FR-29, FR-30, §14.4).
#
# For each pmos-emitting skill, render a sample artifact through the
# substrate's renderArtifact() and assert that the output carries:
#   (1) an inline <style> block (FR-01 — CSS is baked in),
#   (2) the inline pmos-comments sentinel (FR-04 — comments block is baked in),
#   (3) a <meta name="pmos:skill" content="<slug>"> tag with the originating
#       skill's slug (FR-21 — every emit self-identifies).
#
# The matrix is the 13 originating emit skills + the /feature-sdlc orchestrator
# (= 14 surfaces). /diagram standalone-svg emits are out of scope per FR-30:
# the SVG path doesn't render through renderArtifact, it produces a raw .svg.

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
RENDER_JS="$HERE/../render.js"
TEMPLATE="$HERE/../template.html"

if [[ ! -f "$RENDER_JS" ]]; then
  echo "FAIL: render.js missing at $RENDER_JS" >&2
  exit 1
fi
if [[ ! -f "$TEMPLATE" ]]; then
  echo "FAIL: template.html missing at $TEMPLATE" >&2
  exit 1
fi

SKILLS=(
  architecture
  artifact
  diagram
  ideate
  plan
  polish
  prototype
  readme
  requirements
  spec
  survey-analyse
  survey-design
  wireframes
  feature-sdlc
)

FAIL=0
for s in "${SKILLS[@]}"; do
  OUT="$(
    node \
      --input-type=module \
      -e "
        import { readFileSync } from 'node:fs';
        const { renderArtifact } = await import(process.argv[1]);
        const tmpl = readFileSync(process.argv[2], 'utf8');
        const out = renderArtifact({
          template: tmpl,
          title: 'sample',
          content: '<section id=\"x\"><p>hi</p></section>',
          sourcePath: 'sample.html',
          assetPrefix: 'assets/',
          pluginVersion: '2.58.0',
          pmosSkill: process.argv[3],
        });
        process.stdout.write(out);
      " \
      "$RENDER_JS" "$TEMPLATE" "$s"
  )"
  if ! grep -q '<style' <<<"$OUT"; then
    echo "FAIL: $s — missing inline <style> block" >&2
    FAIL=$((FAIL + 1))
  fi
  if ! grep -q 'pmos-comments:start' <<<"$OUT"; then
    echo "FAIL: $s — missing inline pmos-comments sentinel" >&2
    FAIL=$((FAIL + 1))
  fi
  if ! grep -q "content=\"$s\"" <<<"$OUT"; then
    echo "FAIL: $s — missing <meta name=\"pmos:skill\" content=\"$s\">" >&2
    FAIL=$((FAIL + 1))
  fi
done

if [[ "$FAIL" -eq 0 ]]; then
  echo "OK: 14-surface fanout — ${#SKILLS[@]} surfaces, all carry inline <style> + comments sentinel + pmos:skill meta"
else
  echo "FAIL: $FAIL fanout assertion(s) failed across ${#SKILLS[@]} surfaces" >&2
  exit 1
fi
