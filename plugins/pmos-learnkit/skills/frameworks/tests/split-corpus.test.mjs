#!/usr/bin/env node
// split-corpus.test.mjs — runs the parser against the real Decision-Making fixture.
import { parseCategory, slugify, superCategory } from '../scripts/split-corpus.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
let failures = 0;
function check(cond, msg) {
  if (!cond) { console.error(`  FAIL: ${msg}`); failures++; }
}

const md = readFileSync(join(here, 'fixtures', 'decision-making.md'), 'utf8');
const recs = parseCategory(md, {
  category: 'Decision Making',
  categoryCode: '2.4.4',
  sourceUrl: 'https://app.notion.com/p/dbf6df14e37141878b6d0c63a1c753f1',
  date: '2026-06-07',
});

check(recs.length === 3, `expected 3 frameworks, got ${recs.length}`);

const byId = Object.fromEntries(recs.map((r) => [r.id, r]));
check(!!byId['decision-making/six-thinking-hats'], 'six-thinking-hats id present');
check(!!byId['decision-making/one-way-vs-two-way-doors'], 'one-way id present');
check(!!byId['decision-making/lindy-effect'], 'lindy-effect id present');

const hats = byId['decision-making/six-thinking-hats'];
check(hats && hats.author === 'Edward De-bono', `hats author: ${hats && hats.author}`);
check(hats && hats.commentary === null, 'hats has no commentary');
check(hats && hats.references.length === 1, `hats refs: ${hats && hats.references.length}`);
check(hats && !hats.body_md.includes('amazonaws.com'), 'hats body S3 stripped');
check(hats && hats.body_md.includes('White Hat'), 'hats body kept nested bullets');
check(hats && hats.super_category === 'People, Personal & Career', 'hats supercat');

const oneway = byId['decision-making/one-way-vs-two-way-doors'];
check(oneway && oneway.author === 'Jeff Bezos', `oneway author: ${oneway && oneway.author}`);
check(oneway && /two-way door just choose one/.test(oneway.commentary || ''), 'oneway commentary captured');
check(oneway && !oneway.body_md.includes('most important decision making lens'), 'oneway commentary not in body');

const lindy = byId['decision-making/lindy-effect'];
check(lindy && lindy.author === null, 'lindy author null');
check(lindy && lindy.references.length === 2, `lindy refs: ${lindy && lindy.references.length}`);
check(lindy && /barometer to find quality content/.test(lindy.commentary || ''), 'lindy commentary captured');

// helper unit checks
check(slugify('One-Way Vs. Two-Way Doors') === 'one-way-vs-two-way-doors', 'slugify');
check(superCategory('2.1.3') === 'Strategy & Business', 'supercat 2.1');
check(superCategory('2.2.4') === 'Product', 'supercat 2.2');
check(superCategory(null) === null, 'supercat null');

if (failures) { console.error(`split-corpus.test: ${failures} FAILED`); process.exit(1); }
console.log('split-corpus.test: PASS (real Decision-Making fixture, 3 frameworks)');
