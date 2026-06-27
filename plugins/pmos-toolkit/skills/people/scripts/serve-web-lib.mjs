// serve-web-lib.mjs — pure derivation for the /people web viewer (story 260626-nq0).
//
// Single home for the read-only derivation the web server exposes: it parses
// ~/.pmos/people/*.md and derives the same handle/name/designation/role/relationship/
// team/email index view the terminal verbs specify (schema.md "Index view format";
// SKILL.md #show-index — derived on read, no committed INDEX, _shared/tracker-crudl.md §5
// INV-1/2/3). The viewer renders this model; it never re-derives people semantics.
//
// PII discipline (AC4): buildModel emits ONLY the whitelisted index-view fields — it
// constructs each person object by explicitly picking from the whitelist, never by
// spreading the parsed frontmatter. aliases, workstreams, the `## Notes` body, and the
// created/updated/schema_version housekeeping fields are deliberately NOT surfaced, so an
// added record field can never leak through the API by accident.
//
// Node stdlib only. No mutation — nothing here opens a write handle to ~/.pmos/people/.

import fs from 'node:fs';
import path from 'node:path';

// The viewer's field whitelist — byte-for-byte the schema.md "Index view format" columns,
// in column order. Web payload === inline derived render (so the two surfaces agree).
export const PERSON_WHITELIST = [
  'handle',
  'name',
  'designation',
  'role',
  'working_relationship',
  'team',
  'email',
];

// --- minimal frontmatter reader (flat key: value + inline arrays) -----------------------
// Mirrors /backlog's serve-web-lib parser shape. Skips malformed files, never throws.

function parseScalar(raw) {
  let v = raw.trim();
  if (v === '') return '';
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1); // quoted — a literal "null" string survives, it is a real value
  }
  if (v === 'null' || v === '~') return ''; // bare YAML null literal → empty for every field
  return v;
}

function parseValue(raw) {
  const v = raw.trim();
  if (v.startsWith('[') && v.endsWith(']')) {
    return v
      .slice(1, -1)
      .split(',')
      .map((s) => parseScalar(s))
      .filter((s) => s !== '');
  }
  return parseScalar(v);
}

export function parseFrontmatter(text) {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  const block = text.slice(text.indexOf('\n') + 1, end);
  const fm = {};
  for (const line of block.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const m = line.match(/^([A-Za-z0-9_]+):\s?(.*)$/);
    if (!m) continue;
    fm[m[1]] = parseValue(m[2]);
  }
  const body = text.slice(end + 4);
  return { fm, body };
}

// --- parsePeople -----------------------------------------------------------------------
// Reads peopleDir/*.md; returns { people, skipped }. A record is good iff it parses and has
// a `handle` (the handle-keyed store's required key — schema.md). Malformed files are
// skipped with a reason, never fatal.

export function parsePeople(peopleDir) {
  let files = [];
  try {
    files = fs.readdirSync(peopleDir).filter((f) => f.endsWith('.md') && f !== '.gitkeep');
  } catch (_e) {
    return { people: [], skipped: [] };
  }
  const people = [];
  const skipped = [];
  for (const f of files.sort()) {
    let raw;
    try {
      raw = fs.readFileSync(path.join(peopleDir, f), 'utf8');
    } catch (_e) {
      skipped.push({ file: f, reason: 'unreadable' });
      continue;
    }
    const parsed = parseFrontmatter(raw);
    if (!parsed || !parsed.fm.handle) {
      skipped.push({ file: f, reason: 'no-frontmatter-or-handle' });
      continue;
    }
    // PII discipline: pick only the whitelisted fields — never carry the raw frontmatter
    // (which holds aliases/workstreams/timestamps) into the model.
    const rec = {};
    for (const k of PERSON_WHITELIST) rec[k] = parsed.fm[k] || '';
    people.push(rec);
  }
  return { people, skipped };
}

// --- buildModel ------------------------------------------------------------------------

export function buildModel(people, opts = {}) {
  const now = opts.now || Date.now();
  const generatedAt = opts.generated_at || new Date(now).toISOString();

  // Sort by name ascending, case-insensitive (schema.md "Index view format"); fall back to
  // handle when name is empty so the order stays deterministic.
  const sorted = people.slice().sort((a, b) => {
    const an = (a.name || a.handle || '').toLowerCase();
    const bn = (b.name || b.handle || '').toLowerCase();
    if (an < bn) return -1;
    if (an > bn) return 1;
    return a.handle < b.handle ? -1 : a.handle > b.handle ? 1 : 0;
  });

  const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort();
  const facets = {
    teams: uniq(sorted.map((p) => p.team)),
    relationships: uniq(sorted.map((p) => p.working_relationship)),
  };

  return {
    generated_at: generatedAt,
    repo: opts.repo || '',
    count: sorted.length,
    people: sorted,
    facets,
  };
}

export default { parsePeople, buildModel, parseFrontmatter, PERSON_WHITELIST };
