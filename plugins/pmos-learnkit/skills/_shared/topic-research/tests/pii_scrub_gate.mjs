// pii_scrub_gate.mjs — deterministic PII scrub gate for curated-references.json
//
// Design anchor: 02_design.html#pii-gate (Corpus ship policy & PII contract).
// Zero-dep Node ESM. No network, no Date, no Math.random. Pure + a thin CLI.
//
// The HARD contract this gate asserts over the shipped corpus:
//   (a) every record key is in the allowlist
//       {id,url,title,source_type,publication_date,tags,summary,summary_grounded}
//       and NOTHING else;
//   (b) NO key anywhere (record or meta) matches the forbidden regex
//       page_id | database_id | occurrence | snapshot | workspace | notion_*  (case-insensitive);
//   (c) meta has only {schema_version, source, counts:{total,grounded,weak}}
//       and meta.source is NOT "notion-reference-crawler";
//   (d) every id is content-derived: id === "ref_" + sha256(url).slice(0,12).
//
// Used by: tests/test_pii_scrub_gate.sh (real-file PASS + planted-fail selftest) and
// the T10 live dogfood. The importer (scripts/import-curated-references.mjs) is what
// makes the real file satisfy this gate.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const RECORD_ALLOWLIST = [
  'id', 'url', 'title', 'source_type', 'publication_date', 'tags', 'summary', 'summary_grounded',
];
const META_ALLOWLIST = ['schema_version', 'source', 'counts'];
const COUNTS_ALLOWLIST = ['total', 'grounded', 'weak'];

// Forbidden key fragments — notion-specific provenance that must never leak.
const FORBIDDEN_KEY_RE = /page_id|database_id|occurrence|snapshot|workspace|notion_/i;

export function refId(url) {
  return 'ref_' + createHash('sha256').update(String(url)).digest('hex').slice(0, 12);
}

// Deeply collect every object key in a value (records, nested objects, arrays of objects).
function allKeysDeep(value, out) {
  if (Array.isArray(value)) {
    for (const v of value) allKeysDeep(v, out);
  } else if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) {
      out.push(k);
      allKeysDeep(value[k], out);
    }
  }
  return out;
}

// Returns { pass: boolean, failures: string[] }. Pure — does no I/O.
export function checkCorpus(corpus) {
  const failures = [];

  if (!corpus || typeof corpus !== 'object') {
    return { pass: false, failures: ['corpus is not an object'] };
  }

  // (c) meta shape + provenance.
  const meta = corpus.meta;
  if (!meta || typeof meta !== 'object') {
    failures.push('meta missing or not an object');
  } else {
    for (const k of Object.keys(meta)) {
      if (!META_ALLOWLIST.includes(k)) failures.push(`meta has disallowed key: ${k}`);
    }
    if (meta.source === 'notion-reference-crawler') {
      failures.push('meta.source must be genericised (found "notion-reference-crawler")');
    }
    if (meta.counts && typeof meta.counts === 'object') {
      for (const k of Object.keys(meta.counts)) {
        if (!COUNTS_ALLOWLIST.includes(k)) failures.push(`meta.counts has disallowed key: ${k}`);
      }
    }
  }

  const refs = corpus.references;
  if (!Array.isArray(refs)) {
    failures.push('corpus.references is not an array');
    return { pass: failures.length === 0, failures };
  }

  // (b) forbidden key fragments anywhere in the whole document.
  const everyKey = allKeysDeep(corpus, []);
  for (const k of everyKey) {
    if (FORBIDDEN_KEY_RE.test(k)) failures.push(`forbidden key fragment present: ${k}`);
  }

  // (a) record-key allowlist + (d) content-derived id.
  refs.forEach((rec, i) => {
    if (!rec || typeof rec !== 'object') {
      failures.push(`references[${i}] is not an object`);
      return;
    }
    for (const k of Object.keys(rec)) {
      if (!RECORD_ALLOWLIST.includes(k)) {
        failures.push(`references[${i}] has disallowed key: ${k}`);
      }
    }
    if (typeof rec.url !== 'string' || !rec.url) {
      failures.push(`references[${i}] missing url; cannot verify content-derived id`);
    } else {
      const want = refId(rec.url);
      if (rec.id !== want) {
        failures.push(`references[${i}] id not content-derived: got ${rec.id}, want ${want}`);
      }
    }
  });

  return { pass: failures.length === 0, failures };
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// --selftest: prove the gate FAILS on a planted notion-specific field, then PASSES
// on the real shipped file. Exit 0 only if both hold.
function selftest(realPath) {
  const real = loadJson(realPath);

  // 1) Planted bad record — inject a notion_page_id key into an in-memory copy.
  const planted = JSON.parse(JSON.stringify(real));
  if (!Array.isArray(planted.references) || planted.references.length === 0) {
    console.error('selftest FAIL: real corpus has no references to plant into');
    process.exit(1);
  }
  planted.references[0].notion_page_id = 'deadbeef-cafe';
  const plantedResult = checkCorpus(planted);
  if (plantedResult.pass) {
    console.error('selftest FAIL: gate PASSED a corpus with a planted notion_page_id field');
    process.exit(1);
  }
  console.log('selftest: planted notion_page_id correctly FAILS the gate');
  console.log('  ->', plantedResult.failures.find((f) => /notion_page_id|disallowed key/.test(f)) || plantedResult.failures[0]);

  // 2) Real file must PASS.
  const realResult = checkCorpus(real);
  if (!realResult.pass) {
    console.error('selftest FAIL: real shipped corpus does NOT pass the gate:');
    realResult.failures.slice(0, 20).forEach((f) => console.error('  -', f));
    process.exit(1);
  }
  console.log(`selftest: real shipped corpus PASSES the gate (${real.references.length} records)`);
  console.log('selftest PASS');
  process.exit(0);
}

// CLI entrypoint.
const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  const args = process.argv.slice(2);
  if (args[0] === '--selftest') {
    const realPath = args[1] || new URL('../curated-references.json', import.meta.url).pathname;
    selftest(realPath);
  } else {
    const path = args[0] || new URL('../curated-references.json', import.meta.url).pathname;
    const result = checkCorpus(loadJson(path));
    if (result.pass) {
      console.log(`PASS: ${path} satisfies the PII scrub gate`);
      process.exit(0);
    }
    console.error(`FAIL: ${path} violates the PII scrub gate:`);
    result.failures.slice(0, 50).forEach((f) => console.error('  -', f));
    process.exit(1);
  }
}
