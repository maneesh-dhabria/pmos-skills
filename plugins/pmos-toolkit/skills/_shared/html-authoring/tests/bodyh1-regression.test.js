// bodyh1-regression.test.js — story 260614-tcx AC11 / FR-11.
// The template now emits a real <h1> as the first body child. Guard that the two
// chrome scripts behave correctly with it: build_sections_json keys off h2/h3 ONLY
// (the body h1 must NOT appear and the [NN] counter set is unchanged), and chrome-strip
// retains the body h1 + content while stripping toolbar/footer chrome.
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SUBSTRATE = path.resolve(__dirname, '..');
const { renderArtifact } = require('../render.js');
// Production skills strip template.html's leading doc-comment before renderArtifact, else
// its "{{title}}, {{content}}" token list gets re-substituted and the body is duplicated
// (the html-authoring render-token gotcha). Mirror that here so build_sections_json sees
// the body exactly once.
const tmpl = fs.readFileSync(path.join(SUBSTRATE, 'template.html'), 'utf8')
  .replace(/^<!--[\s\S]*?-->\s*/, '');

const content = [
  '<section id="overview"><h2 id="overview-h">Overview</h2><p>Intro paragraph.</p>',
  '<h3 id="detail">Detail</h3><p>more</p></section>',
  '<section id="data"><h2 id="data-h">Data</h2>',
  '<table><thead><tr><th>K</th><th>V</th></tr></thead><tbody><tr><td>a</td><td>b</td></tr></tbody></table>',
  '</section>',
].join('');

const html = renderArtifact({
  template: tmpl, title: 'Body H1 Doc', content,
  sourcePath: 'tests/fixture.html', assetPrefix: 'assets/', pluginVersion: '0', pmosSkill: 'test',
});

const tmp = path.join(os.tmpdir(), 'pmos-tcx-bodyh1-' + process.pid + '.html');
fs.writeFileSync(tmp, html);

try {
  // ---- build_sections_json: body h1 excluded, only the two h2 + one h3 present ----
  const sectionsRaw = execFileSync('node', [path.join(SUBSTRATE, 'assets', 'build_sections_json.js'), tmp], { encoding: 'utf8' });
  const sections = JSON.parse(sectionsRaw);
  const ids = sections.map((s) => s.id).sort();
  assert.deepStrictEqual(ids, ['data-h', 'detail', 'overview-h'], `sections must be h2/h3 only, got ${ids.join(',')}`);
  assert.ok(!sections.some((s) => s.title === 'Body H1 Doc'), 'body h1 must NOT appear in sections.json');
  const levels = sections.reduce((a, s) => (a[s.level] = (a[s.level] || 0) + 1, a), {});
  assert.strictEqual(levels[2], 2, 'two h2 (the [NN]-counted sections)');
  assert.strictEqual(levels[3], 1, 'one h3');
  console.log('OK: sections-exclude-body-h1');

  // ---- chrome-strip: retains the body h1 + content, drops toolbar/footer chrome ----
  const stripped = execFileSync('node', [path.join(SUBSTRATE, 'assets', 'chrome-strip.js'), tmp], { encoding: 'utf8' });
  assert.match(stripped, /<h1 class="pmos-doc-title">Body H1 Doc<\/h1>/, 'chrome-strip must retain the body h1');
  assert.match(stripped, /Overview/, 'chrome-strip must retain body content');
  assert.doesNotMatch(stripped, /pmos-crumb/, 'chrome-strip must drop the toolbar breadcrumb');
  assert.doesNotMatch(stripped, /Created using/, 'chrome-strip must drop the footer attribution');
  console.log('OK: chrome-strip-retains-body-h1');
} finally {
  try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
}

console.log('ALL OK: bodyh1-regression');
