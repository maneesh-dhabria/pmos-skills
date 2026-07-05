#!/usr/bin/env node
// coach-lib.mjs — reads the intent-tagged question bank out of reference/coaching-corpus.md (the single
// home, §K) so plan/career never inline their own copy. Zero deps (Node stdlib). Parses `- [intent] text`
// lines between the <!-- question-bank:start --> / :end sentinels.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const CORPUS_PATH = join(__dirname, '..', 'reference', 'coaching-corpus.md');

// Inbox intent tags → question-bank intents (the two vocabularies differ by design; §K note in corpus).
const INTENT_ALIAS = { growth: 'growth-career', blocker: 'blockers', 'feedback-up': 'feedback-up', morale: 'morale' };
export function normalizeIntent(tag) {
  const t = (tag || '').trim().toLowerCase();
  return INTENT_ALIAS[t] || t;
}

// Parse the question bank → { intent: [question, ...] }, order-preserving.
export function readQuestionBank(path = CORPUS_PATH) {
  const text = readFileSync(path, 'utf8');
  const m = text.match(/<!-- question-bank:start -->\n([\s\S]*?)\n<!-- question-bank:end -->/);
  if (!m) throw new Error(`coaching corpus at ${path} is missing the question-bank sentinels`);
  const bank = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^- \[([a-z-]+)\]\s+(.*\S)\s*$/i);
    if (!mm) continue;
    const intent = mm[1].toLowerCase();
    (bank[intent] ||= []).push(mm[2]);
  }
  return bank;
}

// Pull up to `n` questions for `intent` (already normalized). Empty array if the intent is unknown.
export function questionsFor(bank, intent, n = 2) {
  return (bank[intent] || []).slice(0, n);
}

function selftest() {
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) pass++; else { fail++; console.error('  FAIL: ' + m); } };
  const bank = readQuestionBank();
  ok(Array.isArray(bank.opener) && bank.opener.length >= 1, 'opener questions present');
  ok((bank['growth-career'] || []).length >= 2, 'growth-career has ≥2 questions');
  ok((bank.career || []).length >= 3, 'career set has ≥3 questions (Laraway 3-part)');
  ok((bank.blockers || []).length >= 1 && (bank.morale || []).length >= 1, 'blockers + morale present');
  ok((bank['feedback-up'] || []).length >= 1, 'feedback-up present');
  ok(normalizeIntent('growth') === 'growth-career' && normalizeIntent('blocker') === 'blockers', 'inbox-tag aliases map');
  ok(questionsFor(bank, 'opener', 1).length === 1, 'questionsFor caps at n');
  ok(questionsFor(bank, 'nope', 2).length === 0, 'unknown intent → empty');
  // No question line should carry an unverified attribution as fact (caveat 3 lives in prose, not the bank).
  const all = Object.values(bank).flat().join(' ');
  ok(!/15-month/.test(all), 'no invented "15-month plan" in the question bank (caveat 2)');
  if (fail === 0) { console.log(`coach-lib selftest PASS: ${pass} assertions`); process.exit(0); }
  console.error(`coach-lib selftest FAIL: ${fail}/${pass + fail}`); process.exit(1);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain && process.argv[2] === '--selftest') selftest();
