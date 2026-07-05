#!/usr/bin/env node
// career.mjs — record a Laraway three-part career conversation (AC7): Life Story → Dreams → Career
// Action Plan (a long-term VISION + a short-term PLAN toward it — NOT an "18-month" or "15-month" plan;
// see reference/coaching-corpus.md caveat 2). Writes a dated career-plan block into the header's
// "Goals & growth focus", stamps `career_last_reviewed` in the frontmatter (clears the career-due
// flag), and drops a Sessions marker so it reads as distinct from weekly prep.
//
//   node career.mjs --handle sarah-chen --date 2026-07-05 \
//     --vision "Staff PM leading platform strategy" --short-term "own the Q3 migration end-to-end" \
//     [--life-story "…"] [--dreams "…"]
//
// The SKILL.md runs the conversation and DEFERs an empty plan under --non-interactive — this script
// requires the two plan parts (vision + short-term) and never fabricates them.

import { readRecord, writeRecord, appendLine, prependLine, recordExists } from './record-lib.mjs';
import { parseArgs, today, die } from './cli-lib.mjs';

const f = parseArgs(process.argv.slice(2));
if (f.selftest) { console.log('career.mjs: ok'); process.exit(0); }
if (!f.handle) die('usage: career.mjs --handle <h> [--date] --vision "<long-term>" --short-term "<near-term step>" [--life-story][--dreams]', 64);
if (!recordExists(f.handle)) die(`no 1:1 record for '${f.handle}' — run /one-on-one add ${f.handle} first`, 65);
if (!f.vision || !f['short-term']) die('a career action plan needs both --vision (long-term) and --short-term (near-term step) — the two parts of the Laraway plan (never fabricated)', 64);

const date = f.date || today(f);
const rec = readRecord(f.handle);

const block = [`### Career plan — ${date}`];
if (f['life-story']) block.push(`- Life story: ${f['life-story']}`);
if (f.dreams) block.push(`- Dreams: ${f.dreams}`);
block.push(`- Long-term vision: ${f.vision}`);
block.push(`- Short-term plan: ${f['short-term']}`);
for (const line of block) appendLine(rec, 'Goals & growth focus', line);

// Stamp the review date (clears career-due) and mark the session as a career conversation.
rec.fm.career_last_reviewed = date;
for (const line of [`### ${date} (career conversation)`, `**Topics:** Laraway career conversation — vision + short-term plan recorded in the header.`].reverse()) {
  prependLine(rec, 'Sessions', line);
}

writeRecord(f.handle, rec);
console.log(`Recorded career conversation for ${f.handle} (${date}); career_last_reviewed stamped. Career plan written to the header.`);
