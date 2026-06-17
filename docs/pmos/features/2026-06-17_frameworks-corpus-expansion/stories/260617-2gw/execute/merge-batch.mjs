#!/usr/bin/env node
// One-shot deterministic merge: splice the 74 candidate embedded-JSON records into the bundled
// frameworks corpus (272 → 346). Verbatim splice — commentary stays null, no field rewriting.
// Re-serializes with the file's exact 2-space-indent + trailing-newline shape. Idempotent-safe:
// refuses if any candidate id already exists in the corpus (collision guard). --selftest extracts
// from a tiny fixture to prove the fence parser. Usage:
//   node merge-batch.mjs <candidates-dir> <frameworks.json> [--write]
import fs from 'node:fs';
import path from 'node:path';

// Extract the FIRST ```json fenced block from a markdown string. Returns the raw JSON text or null.
function extractJsonFence(md) {
  const m = md.match(/```json\s*\n([\s\S]*?)\n```/);
  return m ? m[1] : null;
}

function loadCandidates(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'INDEX.md').sort();
  const recs = [];
  for (const f of files) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    const fence = extractJsonFence(raw);
    if (fence == null) { console.error(`SKIP (no json fence): ${f}`); continue; }
    let rec;
    try { rec = JSON.parse(fence); } catch (e) { throw new Error(`bad JSON in ${f}: ${e.message}`); }
    if (!rec.id) throw new Error(`record in ${f} has no id`);
    recs.push({ file: f, rec });
  }
  return recs;
}

function selftest() {
  const fix = '# T\n```json\n{"id":"x/y","name":"Y"}\n```\nmore';
  const out = extractJsonFence(fix);
  const ok = out && JSON.parse(out).id === 'x/y';
  // also: a no-fence doc returns null (the INDEX.md case)
  const none = extractJsonFence('# no fence here') === null;
  if (!ok || !none) { console.error('SELFTEST FAIL'); process.exit(1); }
  console.log('SELFTEST PASS: fence parser holds (2 checks).');
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) return selftest();
  const [dir, corpusPath] = args;
  const write = args.includes('--write');
  if (!dir || !corpusPath) { console.error('usage: merge-batch.mjs <candidates-dir> <frameworks.json> [--write]'); process.exit(64); }

  const raw = fs.readFileSync(corpusPath, 'utf8');
  const corpus = JSON.parse(raw);
  const existingIds = new Set(corpus.map((r) => r.id));

  const cands = loadCandidates(dir);
  console.log(`candidates with embedded json: ${cands.length}`);

  // collision guards: against corpus AND within the batch
  const seen = new Set();
  const collisions = [];
  for (const { file, rec } of cands) {
    if (existingIds.has(rec.id)) collisions.push(`${rec.id} (already in corpus, from ${file})`);
    if (seen.has(rec.id)) collisions.push(`${rec.id} (duplicate within batch, from ${file})`);
    seen.add(rec.id);
  }
  if (collisions.length) { console.error('COLLISION:\n  ' + collisions.join('\n  ')); process.exit(3); }

  // deterministic order: append the new records sorted by id after the existing corpus
  const newRecs = cands.map((c) => c.rec).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const merged = corpus.concat(newRecs);

  console.log(`corpus: ${corpus.length} + ${newRecs.length} = ${merged.length}`);
  if (merged.length !== corpus.length + cands.length) { console.error('count mismatch'); process.exit(1); }
  // assert 0 dup ids overall
  const allIds = new Set(merged.map((r) => r.id));
  if (allIds.size !== merged.length) { console.error('duplicate ids in merged corpus'); process.exit(1); }

  if (write) {
    const tmp = corpusPath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(merged, null, 2) + '\n');
    fs.renameSync(tmp, corpusPath);
    console.log(`WROTE ${corpusPath} (${merged.length} records)`);
  } else {
    console.log('(dry run — pass --write to persist)');
  }
}

main();
