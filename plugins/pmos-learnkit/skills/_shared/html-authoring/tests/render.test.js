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
