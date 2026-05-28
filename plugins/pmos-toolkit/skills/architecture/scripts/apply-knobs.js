#!/usr/bin/env node
// apply-knobs.js — apply the 3 D8 knobs to a validated findings array.
// Spec refs: FR-07, D8, §15.
//
// Input  : JSON array of validated findings on stdin.
// Output : JSON array (filtered + sorted + capped) on stdout.
// Args   :
//   --top-n N             (default 8)   cap to top N after filter+sort
//   --min-confidence N    (default 70)  drop entries with confidence < N
//   --evidence-required   (default ON)  drop entries with missing/short quote
//   --no-evidence-required             disable the evidence-required filter
//
// Pipeline order (per plan T7):
//   1. drop confidence < min
//   2. if evidence-required: drop where !quote || quote.length < 40
//   3. sort by severity rank asc (must_fix=0, should_fix=1, wont_fix=2), ties by confidence desc
//   4. slice top N

'use strict';

const SEVERITY_RANK = { must_fix: 0, should_fix: 1, wont_fix: 2 };
const QUOTE_MIN_LEN = 40;

function parseArgs(argv) {
  const opts = { topN: 8, minConfidence: 70, evidenceRequired: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--top-n') opts.topN = parseInt(argv[++i], 10);
    else if (a === '--min-confidence') opts.minConfidence = parseInt(argv[++i], 10);
    else if (a === '--evidence-required') opts.evidenceRequired = true;
    else if (a === '--no-evidence-required') opts.evidenceRequired = false;
    else if (a === '--help' || a === '-h') {
      process.stdout.write(
        'usage: apply-knobs.js [--top-n N] [--min-confidence N] [--evidence-required|--no-evidence-required]\n' +
        'reads JSON array of findings on stdin, writes filtered+sorted+capped JSON array to stdout.\n'
      );
      process.exit(0);
    } else {
      process.stderr.write(`apply-knobs: unknown arg: ${a}\n`);
      process.exit(2);
    }
  }
  if (!Number.isFinite(opts.topN) || opts.topN < 0) {
    process.stderr.write(`apply-knobs: invalid --top-n\n`);
    process.exit(2);
  }
  if (!Number.isFinite(opts.minConfidence)) {
    process.stderr.write(`apply-knobs: invalid --min-confidence\n`);
    process.exit(2);
  }
  return opts;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { buf += chunk; });
    process.stdin.on('end', () => resolve(buf));
    process.stdin.on('error', reject);
  });
}

function applyKnobs(findings, opts) {
  let out = findings.filter((f) => typeof f.confidence === 'number' && f.confidence >= opts.minConfidence);

  if (opts.evidenceRequired) {
    out = out.filter((f) => typeof f.quote === 'string' && f.quote.length >= QUOTE_MIN_LEN);
  }

  out.sort((a, b) => {
    const ra = SEVERITY_RANK[a.severity] ?? 99;
    const rb = SEVERITY_RANK[b.severity] ?? 99;
    if (ra !== rb) return ra - rb;
    return (b.confidence || 0) - (a.confidence || 0);
  });

  if (opts.topN >= 0) out = out.slice(0, opts.topN);
  return out;
}

(async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const raw = await readStdin();
  const trimmed = raw.trim();
  if (!trimmed) {
    process.stdout.write('[]');
    process.exit(0);
  }
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (e) {
    process.stderr.write(`apply-knobs: invalid JSON on stdin: ${e.message}\n`);
    process.exit(1);
  }
  if (!Array.isArray(parsed)) {
    process.stderr.write(`apply-knobs: stdin must be a JSON array\n`);
    process.exit(1);
  }
  const out = applyKnobs(parsed, opts);
  process.stdout.write(JSON.stringify(out));
})();
