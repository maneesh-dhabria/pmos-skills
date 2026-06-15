// typography.test.js — Editorial Technical refresh (story 260614-tcx).
// TDD guard for the html-authoring type system, layout, tables, contrast, and
// the body-H1 / breadcrumb template change. Node built-in assert; no framework.
// Red-first: every assertion fails against the pre-refresh substrate.
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SUBSTRATE = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(SUBSTRATE, 'assets', 'style.css'), 'utf8');
const tmpl = fs.readFileSync(path.join(SUBSTRATE, 'template.html'), 'utf8');
const { renderArtifact } = require('../render.js');

// Pull the body of a CSS rule by selector header (first `{ … }` after it).
function ruleBody(source, selectorLiteral) {
  const at = source.indexOf(selectorLiteral);
  assert.notStrictEqual(at, -1, `selector not found: ${selectorLiteral}`);
  const open = source.indexOf('{', at);
  const close = source.indexOf('}', open);
  return source.slice(open + 1, close);
}

// ---- T1: faces, type scale, palette, measure ----
(function tokensAndFaces() {
  assert.match(css, /--pmos-font-serif:\s*["']/, 'token --pmos-font-serif missing');
  assert.match(css, /--pmos-font-sans:/, 'token --pmos-font-sans missing');
  assert.match(css, /--pmos-font-display:\s*"JetBrains Mono"/, '--pmos-font-display (mono) must be kept');
  assert.match(css, /--pmos-measure:\s*730px/, 'token --pmos-measure: 730px missing');
  assert.match(css, /--pmos-wide:\s*880px/, 'token --pmos-wide: 880px missing');
  assert.match(css, /--pmos-rule:\s*#/, 'token --pmos-rule missing');
  assert.match(css, /--pmos-code-bg:\s*#/, 'token --pmos-code-bg missing');
  assert.match(css, /--pmos-code-fg:\s*#/, 'token --pmos-code-fg missing');
  assert.match(css, /--pmos-bg:\s*#f8f5ef/i, 'warm canvas --pmos-bg:#f8f5ef missing');
  console.log('OK: tokensAndFaces');
})();

(function typeScale() {
  const body = ruleBody(css, 'html, body {');
  assert.match(body, /font-family:\s*var\(--pmos-font-serif\)/, 'body must use the serif face');
  assert.match(body, /font-size:\s*17px/, 'body must be 17px');
  assert.match(body, /line-height:\s*1\.66/, 'body line-height must be 1.66');

  assert.match(css, /h1, h2, h3 \{ font-family: var\(--pmos-font-sans\)/, 'headings must use the sans face');

  const h1 = ruleBody(css, '\nh1 {');
  assert.match(h1, /font-size:\s*34px/, 'h1 must be 34px');

  const h2 = ruleBody(css, '\nh2 {');
  assert.match(h2, /font-size:\s*21px/, 'h2 must be 21px');
  assert.match(h2, /text-transform:\s*none/, 'h2 must be sentence-case (text-transform:none)');

  const h3 = ruleBody(css, '\nh3 {');
  assert.match(h3, /font-size:\s*17px/, 'h3 must be 17px');
  assert.match(h3, /font-weight:\s*600/, 'h3 must be weight 600');
  console.log('OK: typeScale');
})();

(function counterAboveTitle() {
  const before = ruleBody(css, '.pmos-artifact-body h2::before {');
  assert.match(before, /display:\s*block/, 'h2 [NN] counter must sit ABOVE the title (display:block)');
  assert.match(before, /decimal-leading-zero/, '[NN] counter sequence must be preserved');
  assert.match(before, /font-family:\s*var\(--pmos-font-display\)/, '[NN] counter must stay mono');
  console.log('OK: counterAboveTitle');
})();

(function calmInlineCode() {
  const code = ruleBody(css, '\ncode {');
  assert.match(code, /background:\s*var\(--pmos-code-bg\)/, 'inline code must use calm --pmos-code-bg');
  assert.match(code, /color:\s*var\(--pmos-code-fg\)/, 'inline code must use calm --pmos-code-fg');
  assert.doesNotMatch(code, /accent-strong/, 'inline code must NOT use the loud accent-strong');
  console.log('OK: calmInlineCode');
})();

(function measureAndFullBleed() {
  const bodyEl = ruleBody(css, '.pmos-artifact-body {');
  assert.match(bodyEl, /max-width:\s*var\(--pmos-measure\)/, '.pmos-artifact-body must be ~730px (measure)');
  // toolbar/footer inner wrapper centered at the wide measure
  assert.match(css, /\.pmos-artifact-toolbar-inner|\.pmos-artifact-footer-inner/,
    'full-bleed toolbar/footer must use a centered inner wrapper');
  console.log('OK: measureAndFullBleed');
})();

// ---- T2: break-out tables/code + calmer tables + contrast ----
(function breakoutAndTables() {
  const breakout = ruleBody(css, '.pmos-artifact-body table,');
  assert.match(breakout, /width:\s*calc\(100% \+ 150px\)/, 'tables/pre must break out via calc(100% + 150px)');
  assert.match(breakout, /max-width:\s*var\(--pmos-wide\)/, 'break-out capped at --pmos-wide');
  assert.match(breakout, /margin-left:\s*0/, 'break-out extends RIGHT only (margin-left:0)');
  const th = ruleBody(css, '\nthead th {');
  assert.match(th, /font-family:\s*var\(--pmos-font-display\)/, 'thead th must be mono');
  assert.match(th, /text-transform:\s*uppercase/, 'thead th must be uppercase');
  const thtd = ruleBody(css, '\nth, td {');
  assert.match(thtd, /border-bottom:/, 'th,td must have a bottom border');
  assert.doesNotMatch(thtd, /border:\s*1px solid/, 'th,td must NOT have full (vertical) rules');
  console.log('OK: breakoutAndTables');
})();

(function noFaintText() {
  // --pmos-faint may decorate (section-anchor icon, borders) but never style body text.
  // Guard: no heading/paragraph/list/dd selector sets color:var(--pmos-faint).
  const faintHits = [...css.matchAll(/([^\n{}]+)\{[^}]*color:\s*var\(--pmos-faint\)/g)]
    .map((m) => m[1].trim())
    .filter((sel) => !/section-anchor/.test(sel));
  assert.deepStrictEqual(faintHits, [], `faint used on text selectors: ${faintHits.join(' | ')}`);
  console.log('OK: noFaintText');
})();

// ---- T3: body H1 + breadcrumb in template ----
(function bodyH1() {
  const h1count = (tmpl.match(/<h1\b/g) || []).length;
  assert.strictEqual(h1count, 1, `template must have exactly one <h1> (found ${h1count})`);
  assert.match(tmpl, /<h1 class="pmos-doc-title">\{\{title\}\}<\/h1>/, 'body must carry the doc h1');
  assert.match(tmpl, /class="pmos-crumb"[^>]*>\{\{title\}\}/, 'toolbar title must be a non-heading breadcrumb');
  // render still substitutes {{title}} everywhere
  const out = renderArtifact({
    template: tmpl, title: 'Hello Doc', content: '<section><h2 id="a">A</h2></section>',
    sourcePath: 't', assetPrefix: 'assets/', pluginVersion: '0', pmosSkill: 'test',
  });
  assert.match(out, /<h1 class="pmos-doc-title">Hello Doc<\/h1>/, 'rendered body h1 must carry the title');
  assert.doesNotMatch(out, /<h1 class="pmos-artifact-title"/, 'toolbar must no longer emit an <h1>');
  console.log('OK: bodyH1');
})();

console.log('ALL OK: typography');
