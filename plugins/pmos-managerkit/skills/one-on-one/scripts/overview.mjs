#!/usr/bin/env node
// overview.mjs — the bare `/one-on-one` verb (FR7): a who's-due roster across every report. The due
// status (cadence vs. last session) and the flags are computed by record-lib (§H, deterministic).
// Read-only; prints a table, sorted most-overdue first. Offline.
//
//   node overview.mjs [--today 2026-07-05]

import { listHandles, readRecord, storeDir, dueStatus, statusCreepFlag, staleActionFlags, careerDueFlag } from './record-lib.mjs';
import { parseArgs, today } from './cli-lib.mjs';
import { existsSync } from 'node:fs';

const f = parseArgs(process.argv.slice(2));
if (f.selftest) { console.log('overview.mjs: ok'); process.exit(0); }
const date = today(f);

const handles = listHandles();
if (!handles.length) {
  console.log(existsSync(storeDir())
    ? 'No 1:1 records yet. Add a report with /one-on-one add <name>.'
    : `No 1:1 store yet (${storeDir()}). Add your first report with /one-on-one add <name>.`);
  process.exit(0);
}

const rows = handles.map((h) => {
  const rec = readRecord(h);
  const due = dueStatus(rec, date);
  const flags = [];
  if (statusCreepFlag(rec)) flags.push('status-creep');
  if (staleActionFlags(rec, date).length) flags.push('stale-action');
  if (careerDueFlag(rec, date)) flags.push('career-due');
  return { h, name: rec.fm.name || h, cadence: rec.fm.cadence || 'weekly', due, flags };
});
// Most overdue first (unknown last-session → treat as most due); then by name.
rows.sort((a, b) => (b.due.daysSince ?? 1e9) - (a.due.daysSince ?? 1e9) || a.name.localeCompare(b.name));

console.log(`\n1:1 roster — ${date} (${rows.length} report${rows.length === 1 ? '' : 's'})\n`);
console.log('  STATUS  REPORT                 CADENCE   LAST         FLAGS');
for (const r of rows) {
  const status = r.due.due ? 'DUE ' : ' ok ';
  const last = r.due.lastSession || '—';
  const since = r.due.daysSince != null ? `${r.due.daysSince}d` : '';
  console.log(`  [${status}]  ${pad(r.name, 22)} ${pad(r.cadence, 9)} ${pad(`${last} ${since}`.trim(), 12)} ${r.flags.join(', ')}`);
}
const dueCount = rows.filter((r) => r.due.due).length;
console.log(`\n${dueCount} due now. Run /one-on-one plan <report> to prep.`);

function pad(s, n) { s = String(s); return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length); }
