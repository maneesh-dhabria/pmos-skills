#!/usr/bin/env node
// validate-findings.js — T9 FR-06 orchestrator-side judge-output validator.
//
// Reads JSON array of findings from stdin. Drops any finding failing one of
// the five FR-06 checks (unknown rule_id, confidence out of range, missing
// quote, quote <40 chars, quote not verbatim-substring of source). Logs one
// `dropped finding:` line per drop to stderr. Emits the kept array to stdout.
//
// Args:
//   --rule-id-set <csv>   CSV of permitted rule IDs (e.g. "U001,U002").
//   --source <path>       Path to the source artifact for substring grep.

'use strict';

const fs = require('fs');

function parseArgs(argv) {
  const out = { ruleIds: null, source: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--rule-id-set') out.ruleIds = argv[++i];
    else if (a === '--source') out.source = argv[++i];
  }
  if (!out.ruleIds || !out.source) {
    process.stderr.write('usage: validate-findings.js --rule-id-set <csv> --source <path>\n');
    process.exit(64);
  }
  return out;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (buf += c));
    process.stdin.on('end', () => resolve(buf));
    process.stdin.on('error', reject);
  });
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const allowed = new Set(args.ruleIds.split(',').map((s) => s.trim()).filter(Boolean));

  let source;
  try {
    source = fs.readFileSync(args.source, 'utf8');
  } catch (e) {
    process.stderr.write(`source not readable: ${args.source} (${e.message})\n`);
    process.exit(1);
  }

  const raw = await readStdin();
  let findings;
  try {
    findings = JSON.parse(raw);
  } catch (e) {
    process.stderr.write(`stdin not valid JSON: ${e.message}\n`);
    process.exit(1);
  }
  if (!Array.isArray(findings)) {
    process.stderr.write('stdin JSON is not an array\n');
    process.exit(1);
  }

  const kept = [];
  for (const f of findings) {
    const id = f && f.rule_id;

    // (a) unknown rule_id
    if (!id || !allowed.has(id)) {
      process.stderr.write(`dropped finding: unknown rule_id "${id}"\n`);
      continue;
    }

    // (b) confidence out of range / non-integer
    const c = f.confidence;
    if (!Number.isInteger(c) || c < 0 || c > 100) {
      process.stderr.write(`dropped finding: confidence out of range (rule_id ${id}, value ${c})\n`);
      continue;
    }

    // (c) missing quote
    if (typeof f.quote !== 'string' || f.quote.length === 0) {
      process.stderr.write(`dropped finding: missing quote (rule_id ${id})\n`);
      continue;
    }

    // (d) quote <40 chars
    if (f.quote.length < 40) {
      process.stderr.write(`dropped finding: quote <40 chars (rule_id ${id})\n`);
      continue;
    }

    // (e) quote not verbatim substring of source
    if (!source.includes(f.quote)) {
      process.stderr.write(`dropped finding: quote not in source (rule_id ${id})\n`);
      continue;
    }

    kept.push(f);
  }

  process.stdout.write(JSON.stringify(kept, null, 2) + '\n');
})();
