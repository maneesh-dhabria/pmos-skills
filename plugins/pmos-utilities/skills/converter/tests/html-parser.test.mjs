#!/usr/bin/env node
// html-parser.test.mjs — tolerant HTML parser (T2 / AC2). node html-parser.test.mjs [--selftest]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const { parse } = require(path.join(here, '..', 'lib', 'html-parser.js'));
const EXPECTED_CHECKS = 14;
const selftest = process.argv.includes('--selftest');
let passed = 0; const failures = [];
function check(name, cond) { if (cond) { passed += 1; process.stdout.write(`  ok   ${name}\n`); } else { failures.push(name); process.stdout.write(`  FAIL ${name}\n`); } }

// Well-formed single element with a text child.
{
  const t = parse('<h1>Hi</h1>');
  check('h1 single element', t.length === 1 && t[0].type === 'element' && t[0].tag === 'h1');
  check('h1 text child', t[0].children.length === 1 && t[0].children[0].type === 'text' && t[0].children[0].value === 'Hi');
}

// Attribute parsing.
{
  const t = parse('<a href="x">y</a>');
  check('attr href parses', t[0].tag === 'a' && t[0].attrs.href === 'x');
  check('attr element text', t[0].children[0].value === 'y');
}

// Attribute variants: single-quote, bare, unquoted.
{
  const t = parse("<input type='text' disabled value=42>");
  check('attr quoted/bare/unquoted', t[0].attrs.type === 'text' && t[0].attrs.disabled === '' && t[0].attrs.value === '42');
}

// Void element has no children and doesn't swallow siblings.
{
  const t = parse('before<br>after');
  check('br void no children', t.length === 3 && t[1].tag === 'br' && t[1].children.length === 0);
  check('br siblings preserved', t[0].value === 'before' && t[2].value === 'after');
}

// img void with attrs, sibling after.
{
  const t = parse('<img src="a.png">tail');
  check('img void + sibling', t[0].tag === 'img' && t[0].children.length === 0 && t[0].attrs.src === 'a.png' && t[1].value === 'tail');
}

// Malformed: unclosed tags do not throw; tree returned.
{
  let threw = false; let t = null;
  try { t = parse('<p>unclosed <b>bold'); } catch (e) { threw = true; }
  check('unclosed no throw + tree', !threw && Array.isArray(t) && t[0].tag === 'p');
}

// Malformed: stray close tag does not throw; tree returned.
{
  let threw = false; let t = null;
  try { t = parse('</div>stray<p>'); } catch (e) { threw = true; }
  check('stray close no throw + tree', !threw && Array.isArray(t) && t.length >= 1);
}

// Nested ul/li.
{
  const t = parse('<ul><li>a</li><li>b</li></ul>');
  const ul = t[0];
  check('ul nesting', ul.tag === 'ul' && ul.children.length === 2 && ul.children[0].tag === 'li' && ul.children[0].children[0].value === 'a');
}

// table/tr/td nesting.
{
  const t = parse('<table><tr><td>c</td></tr></table>');
  const td = t[0].children[0].children[0];
  check('table nesting', t[0].tag === 'table' && td.tag === 'td' && td.children[0].value === 'c');
}

// Entity decoding in text.
{
  const t = parse('<p>a &amp; b &lt;c&gt; &#39;q&#39;</p>');
  check('entity decode text', t[0].children[0].value === "a & b <c> 'q'");
}

// script raw text: a<b stays raw, no phantom element.
{
  const t = parse('<script>if(a<b){}</script>');
  const s = t[0];
  check('script raw text', s.tag === 'script' && s.children.length === 1 && s.children[0].type === 'text' && s.children[0].value === 'if(a<b){}');
}

process.stdout.write(`\n${passed}/${EXPECTED_CHECKS} checks passed\n`);
if (selftest && passed !== EXPECTED_CHECKS) { process.stderr.write(`selftest: expected ${EXPECTED_CHECKS}, got ${passed} (failures: ${failures.join(', ')})\n`); process.exit(1); }
process.exit(failures.length === 0 ? 0 : 1);
