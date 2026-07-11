#!/usr/bin/env node
// validate-corpus.mjs — the corpus gate. Zero-dep Node ESM.
//
// Hard-gates data/case-studies.json against the frozen schema + the closed vocabularies in
// corpus-vocab.mjs: exit 1 on any failure, exit 0 (with a coverage report) when clean.
// The corpus path is resolved relative to THIS script's location, never CWD (INV-1).
//
// Usage:
//   node validate-corpus.mjs [--corpus <path>]   validate the corpus (default ../data/case-studies.json)
//   node validate-corpus.mjs --selftest          run the in-file green + broken fixtures

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argv, exit } from 'node:process';
import {
  isPillar, isRegion, isArtifactType, isLanguage, danglingTopics,
} from './corpus-vocab.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CORPUS = resolve(HERE, '..', 'data', 'case-studies.json');

const REQUIRED = ['id', 'title', 'url', 'company', 'pillar', 'topics'];

// Validate an array of records. Returns { errors: string[], report: {...} }.
export function validateRecords(records) {
  const errors = [];
  if (!Array.isArray(records)) return { errors: ['corpus is not a JSON array'], report: null };

  const idCounts = new Map();
  const urlCounts = new Map();
  const perPillar = {};
  let quantifiedCount = 0;

  records.forEach((r, idx) => {
    const where = `record[${idx}]${r && r.id ? ` (${r.id})` : ''}`;

    // required fields present + non-empty
    for (const f of REQUIRED) {
      const v = r ? r[f] : undefined;
      const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
      if (empty) errors.push(`${where}: missing required field '${f}'`);
    }
    if (!r || typeof r !== 'object') return;

    // uniqueness accounting
    if (r.id) idCounts.set(r.id, (idCounts.get(r.id) || 0) + 1);
    if (r.url) urlCounts.set(r.url, (urlCounts.get(r.url) || 0) + 1);

    // closed-vocab membership
    if (r.pillar !== undefined && !isPillar(r.pillar)) errors.push(`${where}: pillar '${r.pillar}' not in PILLARS`);
    if (r.region !== undefined && !isRegion(r.region)) errors.push(`${where}: region '${r.region}' not in REGIONS`);
    if (r.artifact_type !== undefined && !isArtifactType(r.artifact_type)) errors.push(`${where}: artifact_type '${r.artifact_type}' not in ARTIFACT_TYPES`);
    if (r.language !== undefined && !isLanguage(r.language)) errors.push(`${where}: language '${r.language}' not in LANGUAGES`);

    // topics: array, length 1..5, all ⊆ registry
    if (r.topics !== undefined) {
      if (!Array.isArray(r.topics)) {
        errors.push(`${where}: topics must be an array`);
      } else {
        if (r.topics.length < 1 || r.topics.length > 5) errors.push(`${where}: topics length ${r.topics.length} outside 1..5`);
        const dangling = danglingTopics(r.topics);
        if (dangling.length) errors.push(`${where}: topics not in registry: ${dangling.join(', ')}`);
      }
    }

    // derived fields
    if (r.year !== undefined && !(/^\d{4}$/.test(r.year) || r.year === 'unknown')) {
      errors.push(`${where}: year '${r.year}' is not 4 digits or 'unknown'`);
    }
    if (r.quantified !== undefined && typeof r.quantified !== 'boolean') {
      errors.push(`${where}: quantified must be boolean (got ${typeof r.quantified})`);
    }

    // report tallies
    if (r.pillar) perPillar[r.pillar] = (perPillar[r.pillar] || 0) + 1;
    if (r.quantified === true) quantifiedCount++;
  });

  for (const [id, n] of idCounts) if (n > 1) errors.push(`duplicate id '${id}' (${n}×)`);
  for (const [url, n] of urlCounts) if (n > 1) errors.push(`duplicate url '${url}' (${n}×)`);

  return {
    errors,
    report: {
      total: records.length,
      perPillar,
      quantified: quantifiedCount,
      quantifiedPct: records.length ? Math.round((quantifiedCount / records.length) * 100) : 0,
    },
  };
}

// ---- selftest -------------------------------------------------------------
function runSelftest() {
  const green = [
    {
      id: 'a-co-thing', title: 'T', url: 'https://a', company: 'A', pillar: 'platform',
      region: 'europe', language: 'en', topics: ['payments', 'security'],
      artifact_type: 'blog_post', year: '2021', quantified: true,
    },
    {
      id: 'b-co-thing', title: 'T2', url: 'https://b', company: 'B', pillar: 'core-pm-craft',
      region: 'india', language: 'en', topics: ['retention'],
      artifact_type: 'paper', year: 'unknown', quantified: false,
    },
  ];
  const g = validateRecords(green);
  if (g.errors.length) throw new Error(`green fixture should pass, got: ${g.errors.join('; ')}`);
  if (g.report.total !== 2 || g.report.quantified !== 1) throw new Error('green report tally wrong');

  // broken: dangling topic + dup id + bad pillar + non-boolean quantified + bad year
  const broken = [
    { id: 'dup', title: 'T', url: 'https://x', company: 'C', pillar: 'not-a-pillar', topics: ['made-up-topic'], year: '21', quantified: 'yes' },
    { id: 'dup', title: 'T', url: 'https://y', company: 'C', pillar: 'platform', topics: ['payments'] },
  ];
  const b = validateRecords(broken);
  const has = (re) => b.errors.some((e) => re.test(e));
  if (!has(/not in registry/)) throw new Error('should flag dangling topic');
  if (!has(/duplicate id/)) throw new Error('should flag duplicate id');
  if (!has(/not in PILLARS/)) throw new Error('should flag bad pillar');
  if (!has(/quantified must be boolean/)) throw new Error('should flag non-boolean quantified');
  if (!has(/year .* not 4 digits/)) throw new Error('should flag bad year');

  console.log('validate-corpus --selftest: PASS (green fixture clean; broken fixture flagged 5 classes)');
}

// ---- main -----------------------------------------------------------------
function main() {
  if (argv.includes('--selftest')) {
    try { runSelftest(); } catch (e) { console.error('validate-corpus --selftest: FAIL —', e.message); exit(1); }
    return;
  }

  let corpusPath = DEFAULT_CORPUS;
  const ci = argv.indexOf('--corpus');
  if (ci !== -1) corpusPath = argv[ci + 1];

  let records;
  try { records = JSON.parse(readFileSync(corpusPath, 'utf8')); } catch (e) {
    console.error(`validate-corpus: cannot read/parse ${corpusPath}: ${e.message}`);
    exit(1);
  }

  const { errors, report } = validateRecords(records);
  console.log(`validate-corpus: ${report.total} records`);
  console.log(`  per-pillar: ${JSON.stringify(report.perPillar)}`);
  console.log(`  quantified: ${report.quantified}/${report.total} (${report.quantifiedPct}%)`);

  if (errors.length) {
    console.error(`validate-corpus: FAIL — ${errors.length} error(s):`);
    for (const e of errors.slice(0, 50)) console.error(`  - ${e}`);
    if (errors.length > 50) console.error(`  … and ${errors.length - 50} more`);
    exit(1);
  }
  console.log('validate-corpus: PASS');
}

main();
