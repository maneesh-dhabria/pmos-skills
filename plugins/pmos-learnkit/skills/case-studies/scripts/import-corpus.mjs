#!/usr/bin/env node
// import-corpus.mjs — one-shot, build-time transform of the source case-study YAMLs into the
// bundled data/case-studies.json snapshot. Zero-dep Node ESM.
//
// This is BUILD-TIME tooling, not a runtime path: the shipped skill reads only the committed
// JSON, so the vendored mini-YAML reader below never runs for an end user (INV-1 — the skill
// stays zero-dependency + offline; this importer is the maintainer's regeneration tool).
//
// Usage:
//   node import-corpus.mjs [--src <dir>] [--out <path>]
//     --src   source dir holding <pillar>/*.yaml   (default: the case-studies-scraping repo)
//     --out   output JSON path                     (default: ../data/case-studies.json)
//
// Behaviour:
//   - reads every *.yaml under --src (recursively), imports the 17 source fields 1:1,
//   - derives  year      = first 4 chars of `published` (the literal 'unknown' passes through),
//              quantified = /\d/.test(evidence),
//   - writes a single flat array sorted by id, atomically (temp + rename). Idempotent.

import { readdirSync, readFileSync, writeFileSync, renameSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argv, exit } from 'node:process';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SRC = join(process.env.HOME || '', 'Desktop/Projects/personal/case-studies-scraping/case-studies');
const DEFAULT_OUT = resolve(HERE, '..', 'data', 'case-studies.json');

// The 17 source fields imported 1:1 (discovered_via is optional — present on ~25/665).
const SOURCE_FIELDS = [
  'id', 'title', 'url', 'company', 'publisher', 'published', 'pillar', 'region', 'language',
  'topics', 'artifact_type', 'summary', 'what_they_built', 'evidence', 'why_it_matters',
  'verified_on', 'discovered_via',
];

// ---- minimal YAML reader (flat schema only) -------------------------------
// Handles exactly the shape these records use: top-level `key: value` scalars (optionally
// single/double quoted), `key:` + `- item` block lists, and `key: |` block scalars. It is
// deliberately NOT a general YAML parser — it asserts loudly on anything it does not expect.

function stripQuotes(s) {
  const t = s.trim();
  if (t.length >= 2 && t[0] === "'" && t[t.length - 1] === "'") return t.slice(1, -1).replace(/''/g, "'");
  if (t.length >= 2 && t[0] === '"' && t[t.length - 1] === '"') return t.slice(1, -1).replace(/\\"/g, '"');
  return t;
}

// Is `raw` a fully-closed quoted flow scalar for quote char `q`? (single quotes escape as '')
function isClosedQuote(raw, q) {
  if (q === "'") return /^'(?:[^']|'')*'$/.test(raw);
  return /^"(?:[^"\\]|\\.)*"$/.test(raw);
}

function parseYaml(text, file) {
  const lines = text.split('\n');
  const obj = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):(.*)$/);
    if (!m) throw new Error(`${file}: unexpected line ${i + 1}: ${JSON.stringify(line)}`);
    const key = m[1];
    const rest = m[2];
    if (rest.trim() === '|' || rest.trim() === '|-' || rest.trim() === '>' || rest.trim() === '>-') {
      // block scalar: collect indented following lines
      const body = [];
      i++;
      let indent = null;
      while (i < lines.length) {
        const l = lines[i];
        if (l.trim() === '') { body.push(''); i++; continue; }
        const lead = l.match(/^(\s+)/);
        if (!lead) break; // dedent to column 0 → next key
        if (indent === null) indent = lead[1].length;
        body.push(l.slice(indent));
        i++;
      }
      // trim trailing blank lines, join
      while (body.length && body[body.length - 1] === '') body.pop();
      obj[key] = body.join('\n').trim();
    } else if (rest.trim() === '') {
      // could be a block list (`key:` then `- item`) or an empty value
      const items = [];
      i++;
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(stripQuotes(lines[i].replace(/^\s*-\s+/, '')));
        i++;
      }
      obj[key] = items; // [] when the key had no value and no list items
    } else {
      // scalar — possibly a multi-line single/double-quoted flow scalar (YAML folds newline → space)
      let raw = rest.trim();
      const q = (raw[0] === "'" || raw[0] === '"') ? raw[0] : null;
      i++;
      if (q) {
        while (!isClosedQuote(raw, q) && i < lines.length) {
          raw += ' ' + lines[i].trim();
          i++;
        }
        if (!isClosedQuote(raw, q)) throw new Error(`${file}: unterminated quoted scalar for key ${key}`);
      } else {
        // plain (unquoted) multi-line scalar: fold indented continuation lines (newline → space)
        while (i < lines.length && /^\s+\S/.test(lines[i]) && !/^\s*-\s+/.test(lines[i])) {
          raw += ' ' + lines[i].trim();
          i++;
        }
      }
      obj[key] = stripQuotes(raw);
    }
  }
  return obj;
}

// ---- recursive *.yaml walk ------------------------------------------------
function walkYaml(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walkYaml(p));
    else if (entry.endsWith('.yaml') || entry.endsWith('.yml')) out.push(p);
  }
  return out;
}

// ---- transform ------------------------------------------------------------
function toRecord(raw, file) {
  const rec = {};
  for (const f of SOURCE_FIELDS) {
    if (raw[f] === undefined) continue; // optional fields (discovered_via) may be absent
    rec[f] = raw[f];
  }
  // derived: year — first 4 chars of `published` when they are a 4-digit year; anything else
  // (the literal 'unknown', a missing/blank/non-string value, or a non-date string) folds to
  // 'unknown'. This keeps every emitted `year` inside the validator's gate (/^\d{4}$/ | 'unknown')
  // and is a superset of the documented rule on all real inputs (YYYY-* and 'unknown').
  const published = typeof raw.published === 'string' ? raw.published.trim() : '';
  const y = published.slice(0, 4);
  rec.year = /^\d{4}$/.test(y) ? y : 'unknown';
  // derived: quantified — true iff evidence contains a digit
  rec.quantified = /\d/.test(typeof raw.evidence === 'string' ? raw.evidence : '');
  return rec;
}

function parseArgs() {
  const a = { src: DEFAULT_SRC, out: DEFAULT_OUT };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--src') a.src = argv[++i];
    else if (argv[i] === '--out') a.out = argv[++i];
    else throw new Error(`unknown arg: ${argv[i]}`);
  }
  return a;
}

function main() {
  const { src, out } = parseArgs();
  let files;
  try { files = walkYaml(src); } catch (e) {
    console.error(`import-corpus: cannot read --src ${src}: ${e.message}`);
    exit(1);
  }
  const records = files.map((f) => toRecord(parseYaml(readFileSync(f, 'utf8'), f), f));
  // stable sort by id
  records.sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));

  // integrity summary
  const ids = records.map((r) => r.id);
  const urls = records.map((r) => r.url);
  const dupIds = ids.filter((v, idx) => ids.indexOf(v) !== idx);
  const dupUrls = urls.filter((v, idx) => urls.indexOf(v) !== idx);
  const perPillar = {};
  for (const r of records) perPillar[r.pillar] = (perPillar[r.pillar] || 0) + 1;
  const quantified = records.filter((r) => r.quantified).length;

  // atomic write (temp + rename)
  mkdirSync(dirname(out), { recursive: true });
  const tmp = `${out}.tmp`;
  writeFileSync(tmp, JSON.stringify(records, null, 2) + '\n');
  renameSync(tmp, out);

  console.log(`import-corpus: wrote ${records.length} records → ${out}`);
  console.log(`  per-pillar: ${JSON.stringify(perPillar)}`);
  console.log(`  quantified: ${quantified}/${records.length}`);
  console.log(`  duplicate ids: ${dupIds.length}  duplicate urls: ${dupUrls.length}`);
  if (dupIds.length || dupUrls.length) {
    console.error(`import-corpus: FAIL — duplicates present (ids: ${[...new Set(dupIds)]}, urls: ${[...new Set(dupUrls)]})`);
    exit(1);
  }
}

main();
