// T1 tracer: substrate inlining + JSON-escape end-to-end.
// Node built-in assert; no test framework.
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const SUBSTRATE = path.resolve(HERE, '..');
const TEMPLATE_PATH = path.join(SUBSTRATE, 'template.html');

const { renderArtifact } = require('../render.js');

const tmpl = fs.readFileSync(TEMPLATE_PATH, 'utf8');

const out = renderArtifact({
  template: tmpl,
  title: 'Test',
  content: '<section>hi</section>',
  sourcePath: 'tests/fixture.html',
  assetPrefix: 'assets/',
  pluginVersion: '2.58.0',
  pmosSkill: 'test',
});

// inline CSS present (style.css concatenated into <style>…</style>)
assert.match(out, /<style>[\s\S]*pmos-artifact-toolbar[\s\S]*<\/style>/,
  'inline <style> with pmos-artifact-toolbar selector not found');

// inline JS present (comments.js concatenated into <script>…</script>)
assert.match(out, /<script>[\s\S]*comments-overlay[\s\S]*<\/script>/,
  'inline <script> with comments-overlay token not found');

// inline JSON block sentinel-bracketed
assert.match(
  out,
  /<!-- pmos-comments:start -->[\s\S]*<script id="pmos-comments" type="application\/json">[\s\S]*"schema":1[\s\S]*"version":0[\s\S]*"threads":\[\][\s\S]*<\/script>[\s\S]*<!-- pmos-comments:end -->/,
  'sentinel-bracketed inline comments JSON block not found'
);

// outer style.css link absent
assert.doesNotMatch(out, /<link[^>]+style\.css/,
  'outer <link …style.css…> should have been removed');

// outer viewer.js script absent
assert.doesNotMatch(out, /<script[^>]+viewer\.js/,
  'outer <script …viewer.js…> should have been removed');

console.log('OK: freshEmit');

(function reEmit() {
  const existing = renderArtifact({
    template: tmpl, title: 'x', content: '', sourcePath: 'x', assetPrefix: 'assets/',
    pluginVersion: '2.58.0', pmosSkill: 'test',
  });
  // Surgically bump the freshly-emitted inline JSON to version:5 + a thread:
  const v5 = existing
    .replace(/("version":\s*)0/, '$15')
    .replace(/"threads":\[\]/, '"threads":[{"id":"t1","quote":"hi"}]');
  const out = renderArtifact({
    template: tmpl, title: 'x', content: '', sourcePath: 'x', assetPrefix: 'assets/',
    pluginVersion: '2.58.0', pmosSkill: 'test',
    existingHtml: v5,
  });
  const m = out.match(/<script id="pmos-comments" type="application\/json">([\s\S]*?)<\/script>/);
  // The inline JSON has < escaped to < per FR-04 — undo before parsing.
  const parsed = JSON.parse(m[1].trim().replace(/\\u003c/g, '<'));
  assert.equal(parsed.version, 6, 're-emit bumps version 5 -> 6');
  assert.deepEqual(parsed.threads, [{id:'t1', quote:'hi'}], 'threads preserved');
  assert.match(parsed.generated_at, /^\d{4}-\d{2}-\d{2}T/, 'fresh generated_at stamped');
  console.log('OK: reEmit');
})();

(function missingBlock() {
  // E13: pre-feature artifact with no inline block — fall back to fresh seed
  const out = renderArtifact({
    template: tmpl, title: 'x', content: '', sourcePath: 'x', assetPrefix: 'assets/',
    pluginVersion: '2.58.0', pmosSkill: 'test',
    existingHtml: '<html><body>ancient</body></html>',
  });
  const m = out.match(/<script id="pmos-comments" type="application\/json">([\s\S]*?)<\/script>/);
  const parsed = JSON.parse(m[1].trim().replace(/\\u003c/g, '<'));
  assert.equal(parsed.version, 0, 'missing block seeds version=0');
  assert.deepEqual(parsed.threads, [], 'missing block seeds empty threads');
  console.log('OK: missingBlock');
})();
