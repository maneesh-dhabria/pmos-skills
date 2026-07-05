#!/usr/bin/env node
// note.mjs — quick-capture one agenda item into a report's running Inbox (AC3). One command, no
// prompts → unattended-safe. Optional intent tag (blocker/growth/morale/feedback-up) is rendered as a
// `[tag]` prefix that plan.mjs keys questions off.
//
//   node note.mjs --handle sarah-chen --text "discuss the staff-eng ladder" [--tag growth]

import { readRecord, writeRecord, appendLine, recordExists } from './record-lib.mjs';
import { parseArgs, die } from './cli-lib.mjs';

const VALID_TAGS = new Set(['blocker', 'growth', 'morale', 'feedback-up']);
const f = parseArgs(process.argv.slice(2));

if (f.selftest) { console.log('note.mjs: ok'); process.exit(0); }
if (!f.handle || !f.text) die('usage: note.mjs --handle <handle> --text "<item>" [--tag blocker|growth|morale|feedback-up]', 64);
if (!recordExists(f.handle)) die(`no 1:1 record for '${f.handle}' — run /one-on-one add ${f.handle} first`, 65);
if (f.tag && !VALID_TAGS.has(String(f.tag))) die(`invalid --tag '${f.tag}'; allowed: blocker, growth, morale, feedback-up`, 64);

const rec = readRecord(f.handle);
const line = f.tag ? `- [${f.tag}] ${f.text}` : `- ${f.text}`;
appendLine(rec, 'Inbox', line);
writeRecord(f.handle, rec);
console.log(`Added to ${f.handle}'s inbox: ${line}`);
