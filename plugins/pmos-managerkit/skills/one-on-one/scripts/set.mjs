#!/usr/bin/env node
// set.mjs — set/update a persistent-header field (AC6): goals, standing themes, operating manual,
// performance feedback, coaching feedback. Manager-entered only (this skill never fabricates feedback).
// Append is the default (feedback accretes, dated); --replace swaps the whole section.
//
//   node set.mjs --handle sarah-chen --field perf --text "2026-Q2: strong delivery" [--date 2026-07-05] [--replace]
//   fields: goal | theme | manual | perf | coaching

import { readRecord, writeRecord, appendLine, recordExists } from './record-lib.mjs';
import { parseArgs, today, die } from './cli-lib.mjs';

const FIELD_MAP = {
  goal: 'Goals & growth focus',
  theme: 'Standing themes',
  manual: 'Operating manual',
  perf: 'Performance feedback',
  coaching: 'Coaching feedback',
};
// Feedback fields get a date stamp (they're a running dated log); header fields are plain bullets.
const DATED = new Set(['perf', 'coaching']);

const f = parseArgs(process.argv.slice(2));
if (f.selftest) { console.log('set.mjs: ok'); process.exit(0); }
if (!f.handle || !f.field || !f.text) die('usage: set.mjs --handle <h> --field goal|theme|manual|perf|coaching --text "<text>" [--date][--replace]', 64);
const section = FIELD_MAP[String(f.field)];
if (!section) die(`invalid --field '${f.field}'; allowed: ${Object.keys(FIELD_MAP).join(', ')}`, 64);
if (!recordExists(f.handle)) die(`no 1:1 record for '${f.handle}' — run /one-on-one add ${f.handle} first`, 65);

const rec = readRecord(f.handle);
const date = f.date || today(f);
const line = DATED.has(String(f.field)) ? `- ${date}: ${f.text}` : `- ${f.text}`;
if (f.replace) rec.sections[section] = [line];
else appendLine(rec, section, line);
writeRecord(f.handle, rec);
console.log(`${f.replace ? 'Replaced' : 'Updated'} ${section} for ${f.handle}: ${line}`);
