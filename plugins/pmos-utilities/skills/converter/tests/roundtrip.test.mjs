#!/usr/bin/env node
// roundtrip.test.mjs — md→html→md stability over the canonical subset, plus the
// DOCUMENTED lossy / normalization edges asserted explicitly (not silently dropped),
// plus html→md parser-tolerance + element-degradation (T5 / AC5).
//   node roundtrip.test.mjs [--selftest]

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const md = require(path.join(here, '..', 'lib', 'markdown.js'));

const EXPECTED_CHECKS = 16;
const selftest = process.argv.includes('--selftest');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) { passed += 1; process.stdout.write(`  ok   ${name}\n`); }
  else { failures.push(name); process.stdout.write(`  FAIL ${name}\n`); }
}

// ── md→html→md exact stability over the canonical subset ──────────────────────────
// Each of these is a documented round-trippable shape: the recovered Markdown (trimmed)
// equals the source byte-for-byte.
const STABLE = [
  ['heading', '# Title'],
  ['inline mix', 'a **bold** and *em* and `code` text'],
  ['link', '[go](http://e.com)'],
  ['image', '![alt](pic.png)'],
  ['unordered list', '- one\n- two'],
  ['ordered list', '1. first\n2. second'],
  ['blockquote', '> quoted line'],
  ['fenced code', '```js\nconst x = a < b && c;\n```'],
  ['thematic break', '---'],
  ['pipe table', '| A | B |\n| --- | --- |\n| 1 | 2 |'],
];
for (const [name, src] of STABLE) {
  const back = md.htmlToMd(md.mdToHtml(src)).trim();
  check(`md→html→md exact: ${name}`, back === src);
}

// ── DOCUMENTED normalization edge: nested lists ───────────────────────────────────
// A nested list does NOT recover byte-for-byte (a blank line is inserted between the
// parent item and the nested list), but it is HTML-STABLE — re-rendering reaches a
// fixed point. We assert the edge explicitly so the loss is visible, not silent.
{
  const src = '- parent\n  - child';
  const html1 = md.mdToHtml(src);
  const back = md.htmlToMd(html1).trim();
  check('nested list normalizes (NOT byte-identical, documented)', back !== src);
  check('nested list is HTML-stable (md→html→md→html fixed point)',
    md.mdToHtml(back) === html1);
}

// ── DOCUMENTED lossy edge: raw inline HTML in Markdown is escaped as text ──────────
{
  const html = md.mdToHtml('a <div>x</div> b');
  check('raw inline HTML in MD is escaped, not passed through',
    html.includes('&lt;div&gt;') && !html.includes('<div>'));
}

// ── html→md tolerance + degradation ───────────────────────────────────────────────
// Malformed / unclosed HTML must not throw.
{
  let threw = false;
  let out = '';
  try { out = md.htmlToMd('<p>unclosed paragraph <strong>and bold'); }
  catch (e) { threw = true; }
  check('html→md tolerates malformed/unclosed HTML without throwing',
    !threw && out.includes('unclosed paragraph') && out.includes('**and bold**'));
}
// Unknown elements degrade to their text content (documented lossy edge).
check('html→md degrades unknown elements to text content',
  md.htmlToMd('<section><custom-x>kept text</custom-x></section>').trim() === 'kept text');
// script/style content is dropped, surrounding document content is kept.
check('html→md drops <script>/<style>, keeps document content',
  md.htmlToMd('<style>.a{color:red}</style><p>keep me</p><script>evil()</script>').trim() === 'keep me');

process.stdout.write(`\n${passed}/${EXPECTED_CHECKS} checks passed\n`);
if (selftest && passed !== EXPECTED_CHECKS) {
  process.stderr.write(`selftest: expected ${EXPECTED_CHECKS}, got ${passed} (failures: ${failures.join(', ')})\n`);
  process.exit(1);
}
process.exit(failures.length === 0 ? 0 : 1);
