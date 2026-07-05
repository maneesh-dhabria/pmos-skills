#!/usr/bin/env node
// morning-brief task creation (design 02_design.html#confirm §9, story 260702-ww7 T3, §H + INV-6).
// Confirmed creates from the action lane are minted THROUGH /mytasks' own contract so
// the files are byte-compatible with tasks the user makes any other way:
//   - id minted by the shared §K minter (backlog/scripts/mint-id.mjs), inline fallback
//   - frontmatter shaped exactly like /mytasks' newItemFm (schema_version 2, FIELD_ORDER)
//   - serialized with /mytasks' own lib.serializeItem (the byte-compat guarantee)
//   - the item's source deep link written into BOTH the `links` field and the body,
//     so the next run's dedupe (dedupe.mjs) sees it and never double-creates (INV-6).
//
// /mytasks stays the sole system of record — this never writes a parallel task store.
// Zero-dependency Node ESM. `node create-task.mjs --selftest` mints into a tmp dir.
// Runtime: `node create-task.mjs <tasksDir> <creates.json>` prints the created ids.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Resolve /mytasks' own lib — the byte-compat contract lives here (INV-6). If it can't
// be resolved we refuse rather than hand-serialize a divergent file.
function mytasksLib() {
  return require(path.join(__dirname, '..', '..', 'mytasks', 'scripts', 'lib.js'));
}

// id minting — prefer the shared §K minter, fall back to the same inline crypto mint
// /mytasks' serve.js uses, so ids stay <YYMMDD>-<rand3> either way.
const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';
function inlineMint(now = new Date()) {
  const ymd = String(now.getFullYear() % 100).padStart(2, '0') +
    String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
  const b = crypto.randomBytes(3);
  let r = ''; for (let i = 0; i < 3; i++) r += ALPHABET[b[i] % 32];
  return `${ymd}-${r}`;
}
async function resolveMinter() {
  const p = path.join(__dirname, '..', '..', 'backlog', 'scripts', 'mint-id.mjs');
  try {
    const mod = await import('file://' + p);
    if (typeof mod.mintId === 'function') return () => mod.mintId();
  } catch { /* keep inline fallback */ }
  return () => inlineMint();
}

// The /mytasks newItemFm shape, replicated field-for-field (serve.js#newItemFm) so the
// only serializer of record is /mytasks' lib.serializeItem. `link` is threaded into the
// links list; nothing else diverges from a hand-added task.
function buildFm(id, today, flds) {
  const toList = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  const links = toList(flds.links);
  if (flds.link && !links.includes(flds.link)) links.push(flds.link);
  return {
    schema_version: 2, id, title: flds.title || 'untitled',
    type: flds.type || 'execution', importance: flds.importance || 'neutral',
    status: flds.status || 'pending', project: flds.project || '', parent: flds.parent || '',
    order: flds.order || '', recur: flds.recur || '',
    people: toList(flds.people), labels: toList(flds.labels), links,
    due: flds.due || '', start: flds.start || '', checkin: flds.checkin || '', next_checkin: flds.next_checkin || '',
    created: today, updated: today, completed: '',
  };
}

// Mint one task file. `flds` may carry a quickAdd string (parsed via /mytasks' own
// grammar) OR explicit fields; `link` is the source deep link. Returns { id, file }.
export function createTask(tasksDir, flds, { lib = mytasksLib(), mintId = () => inlineMint(), today } = {}) {
  const day = today || lib.isoToday();
  let fields = { ...flds };
  if (flds.quickAdd) {
    const p = lib.parseQuickAdd(flds.quickAdd, day);
    fields = { ...p, link: flds.link, ...('title' in flds && flds.title ? {} : {}) };
    if (flds.title) fields.title = flds.title;
  }
  const id = mintId();
  const fm = buildFm(id, day, fields);
  const link = flds.link ? String(flds.link).trim() : '';
  const body = link ? `Source: ${link}\n` : '';
  const slug = lib.slugify(fm.title);
  const dir = path.join(tasksDir, 'items');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${id}-${slug}.md`);
  lib.writeItemAtomic(file, lib.serializeItem(fm, body));
  return { id, file };
}

// ── Selftest ──
function selftest() {
  let pass = 0, fail = 0;
  const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`  FAIL: ${name}`); } };
  const lib = mytasksLib();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mb-create-'));
  const today = '2026-07-05';
  let n = 0;
  const mintId = () => `260705-x0${n++}`;

  // 1. structured create with a source link
  const r1 = createTask(tmp, { title: 'Sign off contract', link: 'https://mail/x1', type: 'follow-up' }, { lib, mintId, today });
  const it1 = lib.readItem(r1.file);
  ok('created id minted', it1.fm.id === '260705-x00');
  ok('schema_version 2 (byte-compat)', String(it1.fm.schema_version) === '2');
  ok('title kept', it1.fm.title === 'Sign off contract');
  ok('type honored', it1.fm.type === 'follow-up');
  ok('status defaults pending', it1.fm.status === 'pending');
  ok('source link in links field', (it1.fm.links || []).includes('https://mail/x1'));
  ok('source link in body', it1.body.includes('https://mail/x1'));
  ok('created/updated stamped', it1.fm.created === today && it1.fm.updated === today);
  ok('filename is id-slug.md', path.basename(r1.file) === '260705-x00-sign-off-contract.md');

  // 2. round-trips through /mytasks' own loader (byte-compatible read)
  const loaded = lib.loadAllItems(tmp);
  ok('loadAllItems reads it back', loaded.some((x) => x.fm.id === '260705-x00'));

  // 3. quick-add grammar path (date/@/#/+ stripped by /mytasks' parser)
  const r2 = createTask(tmp, { quickAdd: 'reply to Alice tomorrow @alice #q3 +email', link: 'https://mail/x2' }, { lib, mintId, today });
  const it2 = lib.readItem(r2.file);
  ok('quickAdd due parsed', it2.fm.due === '2026-07-06');
  ok('quickAdd person parsed', (it2.fm.people || []).includes('alice'));
  ok('quickAdd project parsed', it2.fm.project === 'q3');
  ok('quickAdd label parsed', (it2.fm.labels || []).includes('email'));
  ok('quickAdd link still attached', (it2.fm.links || []).includes('https://mail/x2'));

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`create-task.mjs selftest: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--selftest')) { selftest(); }
  else {
    const [tasksDir, createsFile] = process.argv.slice(2);
    if (!tasksDir || !createsFile) { console.error('usage: node create-task.mjs <tasksDir> <creates.json> | --selftest'); process.exit(64); }
    const lib = mytasksLib();
    const mintId = await resolveMinter();
    const creates = JSON.parse(fs.readFileSync(createsFile, 'utf8'));
    const made = creates.map((c) => createTask(tasksDir, c, { lib, mintId }));
    console.log(JSON.stringify(made, null, 2));
  }
}
