#!/usr/bin/env node
// markdown.test.mjs — vendored markdown lib (T1 / AC1). node markdown.test.mjs [--selftest]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const md = require(path.join(here, '..', 'lib', 'markdown.js'));
const EXPECTED_CHECKS = 23;
const selftest = process.argv.includes('--selftest');
let passed = 0; const failures = [];
function check(name, cond) { if (cond) { passed += 1; process.stdout.write(`  ok   ${name}\n`); } else { failures.push(name); process.stdout.write(`  FAIL ${name}\n`); } }

// Headings — each level.
for (let lvl = 1; lvl <= 6; lvl += 1) {
  const html = md.mdToHtml(`${'#'.repeat(lvl)} Title`);
  check(`heading level ${lvl} -> <h${lvl}>`, html === `<h${lvl}>Title</h${lvl}>`);
}

// Paragraph.
check('paragraph -> <p>', md.mdToHtml('Just a line.') === '<p>Just a line.</p>');

// Inline: strong.
check('strong **x** -> <strong>', md.mdToHtml('a **bold** b').includes('<strong>bold</strong>'));
// Inline: em.
check('em *x* -> <em>', md.mdToHtml('a *italic* b').includes('<em>italic</em>'));
// Inline: code.
check('inline `x` -> <code>', md.mdToHtml('a `x<y` b').includes('<code>x&lt;y</code>'));
// Inline: link.
check('link [t](h) -> <a>', md.mdToHtml('[go](http://e.com)').includes('<a href="http://e.com">go</a>'));
// Inline: image.
check('image ![a](s) -> <img>', md.mdToHtml('![alt](pic.png)').includes('<img src="pic.png" alt="alt">'));

// Unordered list.
{
  const html = md.mdToHtml('- one\n- two');
  check('unordered list -> <ul><li>', html.includes('<ul>') && html.includes('<li>one</li>') && html.includes('<li>two</li>'));
}
// Ordered list.
{
  const html = md.mdToHtml('1. first\n2. second');
  check('ordered list -> <ol><li>', html.includes('<ol>') && html.includes('<li>first</li>'));
}
// Nested list renders nested <ul>.
{
  const html = md.mdToHtml('- parent\n  - child');
  check('nested list -> nested <ul>', /<li>parent[\s\S]*<ul>[\s\S]*<li>child<\/li>[\s\S]*<\/ul>[\s\S]*<\/li>/.test(html));
}

// Blockquote.
check('blockquote -> <blockquote>', md.mdToHtml('> quoted').includes('<blockquote>') && md.mdToHtml('> quoted').includes('quoted'));

// Fenced code block: text verbatim and escaped.
{
  const html = md.mdToHtml('```js\nconst x = a < b && c;\n```');
  check('fenced code -> <pre><code class lang>', html.includes('<pre><code class="language-js">'));
  check('fenced code escaped + verbatim', html.includes('const x = a &lt; b &amp;&amp; c;'));
}

// Thematic break.
check('hr --- -> <hr>', md.mdToHtml('---') === '<hr>');

// Basic pipe table -> <table>.
{
  const html = md.mdToHtml('| A | B |\n| --- | --- |\n| 1 | 2 |');
  check('pipe table -> <table><th><td>', html.includes('<table>') && html.includes('<th>A</th>') && html.includes('<td>1</td>'));
}

// parseBlocks documented shape — heading.
{
  const blocks = md.parseBlocks('# Hello');
  check('parseBlocks heading shape', blocks[0].type === 'heading' && blocks[0].level === 1 && blocks[0].inlines[0].value === 'Hello');
}
// parseBlocks documented shape — list.
{
  const blocks = md.parseBlocks('- a\n- b');
  check('parseBlocks list shape', blocks[0].type === 'list' && blocks[0].ordered === false && blocks[0].items.length === 2 && Array.isArray(blocks[0].items[0].blocks));
}

// HTML-escaping.
{
  const html = md.mdToHtml('a < b & c');
  check('escapes < and &', html.includes('&lt;') && html.includes('&amp;'));
}

process.stdout.write(`\n${passed}/${EXPECTED_CHECKS} checks passed\n`);
if (selftest && passed !== EXPECTED_CHECKS) { process.stderr.write(`selftest: expected ${EXPECTED_CHECKS}, got ${passed} (failures: ${failures.join(', ')})\n`); process.exit(1); }
process.exit(failures.length === 0 ? 0 : 1);
