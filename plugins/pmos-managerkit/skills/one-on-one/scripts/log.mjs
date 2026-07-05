#!/usr/bin/env node
// log.mjs — append a dated session entry (AC5), newest-first, and clear discussed inbox items. Also
// mirrors each still-open action into the header's "Open action items" (with `since <date>`) so
// stale-action tracking works across weeks. The SKILL.md gathers the session body interactively (or
// from NL args) and DEFERs an empty body under --non-interactive — this script refuses an empty log.
//
//   node log.mjs --handle sarah-chen --date 2026-07-05 \
//     --topic "roadmap Q3" --decision "Sarah leads the retro" \
//     --action "me|open|intro Sarah to Platform lead" --action "sarah|done|write the RFC" \
//     --question "how to staff the migration?" --clear "staff-eng ladder"

import { readRecord, writeRecord, prependLine, appendLine, recordExists } from './record-lib.mjs';
import { parseArgs, asArray, today, die } from './cli-lib.mjs';

const f = parseArgs(process.argv.slice(2), { multi: new Set(['topic', 'decision', 'action', 'question', 'clear']) });
if (f.selftest) { console.log('log.mjs: ok'); process.exit(0); }
if (!f.handle) die('usage: log.mjs --handle <h> [--date] --topic…/--decision…/--action "owner|open|done|text"…/--question… [--clear <substr>]…', 64);
if (!recordExists(f.handle)) die(`no 1:1 record for '${f.handle}' — run /one-on-one add ${f.handle} first`, 65);

const topics = asArray(f.topic), decisions = asArray(f.decision), actions = asArray(f.action), questions = asArray(f.question);
if (!topics.length && !decisions.length && !actions.length && !questions.length) {
  die('nothing to log — supply at least one --topic/--decision/--action/--question (an empty session DEFERs under --non-interactive)', 64);
}
const date = f.date || today(f);
const rec = readRecord(f.handle);

// Build the session block. `--action "owner|status|text"` (status open|done; default open).
const parseAction = (a) => {
  const [owner, status, ...rest] = String(a).split('|');
  const text = rest.join('|').trim() || status?.trim() || '';
  const st = /^(open|done)$/.test((status || '').trim()) ? status.trim() : 'open';
  return { owner: (owner || '').trim(), status: rest.length ? st : 'open', text: rest.length ? text : (status || '').trim() };
};
const acts = actions.map(parseAction);

const block = [`### ${date}`];
if (topics.length) block.push(`**Topics:** ${topics.join('; ')}`);
if (decisions.length) block.push(`**Decisions:** ${decisions.join('; ')}`);
if (acts.length) {
  block.push('**Actions:**');
  for (const a of acts) block.push(`- [${a.status === 'done' ? 'x' : ' '}]${a.owner ? ` (${a.owner})` : ''} ${a.text}`.trimEnd());
}
if (questions.length) block.push(`**Questions:** ${questions.join('; ')}`);

// Prepend the block newest-first (reverse-chron Sessions).
for (const line of block.slice().reverse()) prependLine(rec, 'Sessions', line);

// Mirror still-open actions into Open action items (dated for stale tracking).
for (const a of acts.filter((x) => x.status !== 'done')) {
  appendLine(rec, 'Open action items', `- [ ]${a.owner ? ` (${a.owner})` : ''} ${a.text} — since ${date}`.replace('  ', ' '));
}

// Clear discussed inbox items (substring match, case-insensitive).
const clears = asArray(f.clear).map((c) => String(c).toLowerCase());
let cleared = 0;
if (clears.length) {
  rec.sections['Inbox'] = (rec.sections['Inbox'] || []).filter((line) => {
    const hit = clears.some((c) => line.toLowerCase().includes(c));
    if (hit) cleared++;
    return !hit;
  });
}

writeRecord(f.handle, rec);
console.log(`Logged ${date} session for ${f.handle}: ${topics.length} topic(s), ${decisions.length} decision(s), ${acts.length} action(s), ${questions.length} question(s); cleared ${cleared} inbox item(s).`);
