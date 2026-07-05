#!/usr/bin/env node
// add.mjs — scaffold a new 1:1 record for a report (AC2). Identity resolution against /people is done
// by the SKILL.md before this runs (offer-create; DEFER under --non-interactive; never fabricate a
// person) — this script only persists the record given the already-resolved handle + fields.
//
//   node add.mjs --handle sarah-chen --name "Sarah Chen" [--role "Senior PM"] [--cadence weekly]
//                [--started 2026-07-05] [--goal "…"]… [--theme "…"]… [--manual "…"]… [--force]
//
// Refuses to clobber an existing record unless --force. Store + INV-4 guard live in record-lib.

import { emptyRecord, writeRecord, recordExists, recordPath, appendLine } from './record-lib.mjs';
import { parseArgs, asArray, today, die } from './cli-lib.mjs';

const f = parseArgs(process.argv.slice(2), { multi: new Set(['goal', 'theme', 'manual']) });

if (f.selftest) { console.log('add.mjs: ok (persistence CLI; see tests/run-tests.sh)'); process.exit(0); }
if (!f.handle || !f.name) die('usage: add.mjs --handle <kebab> --name "<Full Name>" [--role][--cadence][--started][--goal…][--theme…][--manual…][--force]', 64);
if (recordExists(f.handle) && !f.force) die(`a 1:1 record already exists at ${recordPath(f.handle)} — use a different verb (note/set/log) or --force to re-scaffold`, 65);

const rec = emptyRecord({
  handle: f.handle,
  name: f.name,
  role: f.role || '',
  cadence: f.cadence || 'weekly',
  started: f.started || today(f),
});
for (const g of asArray(f.goal)) appendLine(rec, 'Goals & growth focus', `- ${g}`);
for (const t of asArray(f.theme)) appendLine(rec, 'Standing themes', `- ${t}`);
for (const m of asArray(f.manual)) appendLine(rec, 'Operating manual', `- ${m}`);

writeRecord(f.handle, rec);
console.log(`Scaffolded 1:1 record for ${f.name} (${f.handle}) at ${recordPath(f.handle)}.`);
console.log(`Next: /one-on-one note ${f.handle} "<agenda item>" to build the running inbox, or plan ${f.handle} to prep.`);
