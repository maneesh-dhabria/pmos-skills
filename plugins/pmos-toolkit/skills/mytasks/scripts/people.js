#!/usr/bin/env node
// people.js — web CRUD over the SHARED ~/.pmos/people/ store (story 260626-71x).
//
// The /mytasks web layer and the /people CLI write ONE source of truth (design D6):
// a record created here is byte-shape-compatible with /people and editable from it
// (and vice-versa). The field order, INDEX columns, and handle-derivation rule are
// owned by ../../people/schema.md + ../../people/lookup.md (the §K homes); this file
// implements them. Zero-dep, stateless, atomic writes; reuses lib.js primitives.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const lib = require('./lib.js');

// Canonical /people frontmatter order (people/schema.md). Unlike task files, people
// OMIT absent optionals (no bare keys) — only present fields are written.
const PEOPLE_FIELD_ORDER = [
  'schema_version', 'handle', 'name', 'designation', 'role', 'working_relationship',
  'team', 'email', 'workstreams', 'aliases', 'created', 'updated',
];
const PEOPLE_LIST_FIELDS = new Set(['workstreams', 'aliases']);
// Fields a PATCH may edit (handle/schema_version/created immutable; updated auto-bumped).
const PEOPLE_EDITABLE = new Set(['name', 'designation', 'role', 'working_relationship', 'team', 'email', 'workstreams', 'aliases']);

// The shared people store: ~/.pmos/people in the normal case; a sibling of an
// overridden tasks dir otherwise (keeps test/dogfood roots isolated).
function defaultPeopleDir(tasksDir) {
  if (!tasksDir) return path.join(os.homedir(), '.pmos', 'people');
  return path.join(path.dirname(path.resolve(tasksDir)), 'people');
}

// ── Frontmatter parse / serialize (people-list-aware; mirrors lib.js shape) ──
function parsePerson(text) {
  const norm = String(text).replace(/\r\n/g, '\n');
  if (!norm.startsWith('---\n')) return { fm: {}, body: norm };
  const end = norm.indexOf('\n---', 3);
  if (end === -1) return { fm: {}, body: norm };
  const fmBlock = norm.slice(4, end + 1);
  const afterClose = norm.slice(end + 4);
  const body = afterClose.startsWith('\n') ? afterClose.slice(1) : afterClose;
  const fm = {};
  for (const rawLine of fmBlock.split('\n')) {
    if (!rawLine.trim()) continue;
    const m = rawLine.match(/^([A-Za-z0-9_]+):\s?(.*)$/);
    if (!m) continue;
    fm[m[1]] = parseScalarOrList(m[2], PEOPLE_LIST_FIELDS.has(m[1]));
  }
  return { fm, body };
}
function parseScalarOrList(raw, isList) {
  const v = String(raw).trim();
  if (isList) {
    if (v === '' || v === '[]') return [];
    const inner = v.replace(/^\[/, '').replace(/\]$/, '').trim();
    return inner === '' ? [] : inner.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return v;
}

function serializePerson(fm, body) {
  const lines = [];
  for (const k of PEOPLE_FIELD_ORDER) {
    if (!(k in fm)) continue;
    if (PEOPLE_LIST_FIELDS.has(k)) {
      const arr = Array.isArray(fm[k]) ? fm[k] : (fm[k] ? [fm[k]] : []);
      if (arr.length === 0) continue; // omit empty optional lists (people omit bare keys)
      lines.push(`${k}: [${arr.join(', ')}]`);
    } else {
      const v = fm[k];
      if (v === '' || v == null) continue; // omit absent optionals
      lines.push(`${k}: ${v}`);
    }
  }
  const b = body == null ? '' : String(body);
  const bodyPart = b.trim() === '' ? '' : '\n' + (b.startsWith('\n') ? b.slice(1) : b);
  return `---\n${lines.join('\n')}\n---\n${bodyPart}`;
}

// ── Handle derivation (people/lookup.md "Handle derivation") — collision-aware ──
function deriveHandle(name, peopleDir) {
  const exists = (h) => { try { return fs.existsSync(path.join(peopleDir, h + '.md')); } catch (_) { return false; } };
  const uniquify = (b) => { if (!exists(b)) return b; let n = 2; while (exists(`${b}-${n}`)) n++; return `${b}-${n}`; };
  const tokens = String(name || '').trim().split(/\s+/).map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean);
  if (tokens.length === 0) return uniquify('person');
  if (tokens.length === 1) return uniquify(tokens[0]);
  const first = tokens[0], last = tokens[tokens.length - 1];
  const li = `${first}-${last[0]}`;
  if (!exists(li)) return li;
  const fl = `${first}-${last}`;
  if (!exists(fl)) return fl;
  let n = 2; while (exists(`${fl}-${n}`)) n++;
  return `${fl}-${n}`;
}
function normalizeHandle(h) { return String(h).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

// ── Store I/O ──
function personFile(peopleDir, handle) { return path.join(peopleDir, `${handle}.md`); }

function listPeople(peopleDir) {
  let names;
  try { names = fs.readdirSync(peopleDir); } catch (_) { return []; }
  const out = [];
  for (const n of names) {
    if (!n.endsWith('.md') || n === 'INDEX.md') continue;
    try {
      const { fm } = parsePerson(fs.readFileSync(path.join(peopleDir, n), 'utf8'));
      if (fm.handle || fm.name) out.push({ handle: fm.handle || n.replace(/\.md$/, ''), name: fm.name || '' });
    } catch (_) { /* skip malformed */ }
  }
  out.sort((a, b) => String(a.name).localeCompare(String(b.name)) || String(a.handle).localeCompare(String(b.handle)));
  return out;
}

function readPerson(peopleDir, handle) {
  const file = personFile(peopleDir, handle);
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch (_) { return null; }
  const { fm, body } = parsePerson(raw);
  return { file, fm, body };
}

// Create a person; returns { record } or { error, status, existing? }.
function createPerson(peopleDir, input) {
  const name = (input.name || '').toString().trim();
  if (!name) return { error: 'missing-name', status: 400 };
  const handle = input.handle ? normalizeHandle(input.handle) : deriveHandle(name, peopleDir);
  if (!handle) return { error: 'bad-handle', status: 400 };
  if (fs.existsSync(personFile(peopleDir, handle))) {
    const existing = readPerson(peopleDir, handle);
    return { error: 'duplicate-handle', status: 409, existing: existing ? recordJson(existing.fm) : { handle } };
  }
  const today = lib.isoToday();
  const fm = { schema_version: 1, handle, name };
  for (const k of ['designation', 'role', 'working_relationship', 'team', 'email']) {
    if (input[k] != null && String(input[k]).trim() !== '') fm[k] = String(input[k]).trim();
  }
  for (const k of ['workstreams', 'aliases']) {
    const arr = toList(input[k]);
    if (arr.length) fm[k] = arr;
  }
  fm.created = today; fm.updated = today;
  fs.mkdirSync(peopleDir, { recursive: true });
  lib.writeItemAtomic(personFile(peopleDir, handle), serializePerson(fm, ''));
  // No committed INDEX.md: the people store is derived on read (people/schema.md §5 INV-1).
  return { record: recordJson(fm) };
}

// Patch an existing person; returns { record } or { error, status }.
function patchPerson(peopleDir, handle, fields) {
  const cur = readPerson(peopleDir, handle);
  if (!cur) return { error: 'not-found', status: 404 };
  const fm = cur.fm;
  for (const [k, v] of Object.entries(fields || {})) {
    if (!PEOPLE_EDITABLE.has(k)) continue;
    if (PEOPLE_LIST_FIELDS.has(k)) {
      const arr = toList(v);
      if (arr.length) fm[k] = arr; else delete fm[k];
    } else if (v == null || String(v).trim() === '') {
      delete fm[k];
    } else {
      fm[k] = String(v).trim();
    }
  }
  if (fm.schema_version == null) fm.schema_version = 1;
  fm.updated = lib.isoToday();
  lib.writeItemAtomic(cur.file, serializePerson(fm, cur.body));
  // No committed INDEX.md: the people store is derived on read (people/schema.md §5 INV-1).
  return { record: recordJson(fm) };
}

function recordJson(fm) {
  return {
    handle: fm.handle || '', name: fm.name || '',
    designation: fm.designation || '', role: fm.role || '',
    working_relationship: fm.working_relationship || '', team: fm.team || '',
    email: fm.email || '', workstreams: fm.workstreams || [], aliases: fm.aliases || [],
    created: fm.created || '', updated: fm.updated || '',
  };
}
function toList(v) {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

module.exports = {
  PEOPLE_FIELD_ORDER, PEOPLE_LIST_FIELDS, PEOPLE_EDITABLE,
  defaultPeopleDir, parsePerson, serializePerson, deriveHandle, normalizeHandle,
  listPeople, readPerson, createPerson, patchPerson, recordJson,
};
