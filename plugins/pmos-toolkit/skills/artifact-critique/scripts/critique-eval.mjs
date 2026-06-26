#!/usr/bin/env node
// critique-eval — deterministic hard gate for /artifact-critique (story 260624-aa8).
//
// skill-patterns §H: a script does the counting, the model never does. Run before any
// critique is finalized (SKILL.md Phase 7). Validates a pmos-critique-findings/v1 object
// against the live source it claims to critique:
//
//   E-schema                — parses + conforms to pmos-critique-findings/v1.
//   E-axes-complete         — all 10 axes, fixed enum order; verdict ∈ the ordinal set.
//   E-applicable-consistency— applicable===false ⇔ verdict==="N/A".
//   E-quote-len             — every non-null quote (axes + weakest_claims) ≥40 chars.
//   E-quote-in-source       — every non-null quote, whitespace-normalized, is a verbatim
//                             substring of the whitespace-normalized source (Inv-3).
//   E-gap-named             — every ABSENT / WEAK axis has a non-empty reason.
//   E-weakest-ranked        — weakest_claims length 0–3; ranks unique 1..n; quotes ≥40.
//   E-opening               — opening.pushing_hardest_on has 1–3 entries.
//
// The axis enum and verdict scale are READ FROM doc-types.md (Inv-1, one home) — never
// re-declared here. Drift between this gate and the substrate schema is therefore impossible.
//
// Usage:  node critique-eval.mjs --source <source-file> --findings <findings.json>
//         (--findings may instead be inline JSON via --findings-json '<…>')
// Exit 0 (all pass) / 1 (≥1 fail, listed on stderr) / 2 (script/usage error). Never silently passes.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
// HERE = <root>/plugins/pmos-toolkit/skills/artifact-critique/scripts → 5 up = repo root.
const ROOT = resolve(HERE, '../../../../../');
const DOC_TYPES = join(ROOT, 'plugins/pmos-toolkit/skills/_shared/critique-rubric/doc-types.md');

// ── arg parse ──
function parseArgs(argv) {
  const a = { source: null, findings: null, findingsJson: null };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--source') a.source = argv[++i];
    else if (t === '--findings') a.findings = argv[++i];
    else if (t === '--findings-json') a.findingsJson = argv[++i];
    else { console.error(`critique-eval: unknown argument '${t}'`); process.exit(2); }
  }
  return a;
}

function die(msg) { console.error(`critique-eval: ${msg}`); process.exit(2); }

// ── Inv-1: pull the axis enum from doc-types.md §3 (the `**Axis enum**` marker block) ──
function loadAxisEnum() {
  if (!existsSync(DOC_TYPES)) die(`substrate doc-types.md not found at ${DOC_TYPES} (Inv-1 source missing)`);
  const md = readFileSync(DOC_TYPES, 'utf8');
  const lines = md.split('\n');
  const idx = lines.findIndex(l => /^\*\*Axis enum\*\*/.test(l));
  if (idx < 0) die('doc-types.md has no "**Axis enum**" marker — cannot resolve canonical axes (Inv-1)');
  let block = '';
  for (let i = idx; i < lines.length; i++) { if (i > idx && lines[i].trim() === '') break; block += lines[i] + '\n'; }
  const axes = [...block.matchAll(/`([A-Za-z/]+)`/g)].map(x => x[1]);
  if (axes.length !== 10) die(`doc-types.md axis enum resolved to ${axes.length} axes, expected 10 (Inv-1)`);
  return axes;
}

const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

const failures = [];
const fail = (check, msg) => failures.push(`[${check}] ${msg}`);

function validate(obj, sourceText, AXES) {
  const VERDICTS = new Set(['STRONG', 'MIXED', 'WEAK', 'ABSENT', 'N/A']);
  const src = norm(sourceText);

  // E-schema
  if (obj?.schema !== 'pmos-critique-findings/v1') { fail('E-schema', `schema field is not pmos-critique-findings/v1 (got ${JSON.stringify(obj?.schema)})`); return; }
  if (obj.skill !== 'artifact-critique') fail('E-schema', `skill field should be "artifact-critique" (got ${JSON.stringify(obj.skill)})`);
  if (!obj.doc || typeof obj.doc.title !== 'string' || !['prd', 'strategy', 'pov', 'roadmap'].includes(obj.doc.type))
    fail('E-schema', `doc.title/doc.type malformed`);
  if (!obj.bottom_line || !Array.isArray(obj.bottom_line.must_dos)) fail('E-schema', `bottom_line.must_dos missing`);

  // E-opening
  const ph = obj.opening?.pushing_hardest_on;
  if (!Array.isArray(ph) || ph.length < 1 || ph.length > 3) fail('E-opening', `opening.pushing_hardest_on must have 1–3 entries`);

  // E-axes-complete + per-axis checks
  if (!Array.isArray(obj.axes) || obj.axes.length !== 10) { fail('E-axes-complete', `axes must have all 10 entries`); }
  else obj.axes.forEach((a, i) => {
    if (a.axis !== AXES[i]) fail('E-axes-complete', `axis[${i}] is "${a.axis}", expected "${AXES[i]}" (fixed order)`);
    if (!VERDICTS.has(a.verdict)) fail('E-axes-complete', `axis ${a.axis}: invalid verdict "${a.verdict}"`);
    if (typeof a.applicable !== 'boolean') fail('E-applicable-consistency', `axis ${a.axis}: applicable must be boolean`);
    if ((a.applicable === false) !== (a.verdict === 'N/A'))
      fail('E-applicable-consistency', `axis ${a.axis}: applicable=${a.applicable} but verdict=${a.verdict} (must be N/A iff not applicable)`);
    if ((a.verdict === 'ABSENT' || a.verdict === 'WEAK') && !(a.reason && a.reason.trim()))
      fail('E-gap-named', `axis ${a.axis}: ${a.verdict} requires a non-empty reason`);
    if (a.quote != null) {
      if (String(a.quote).length < 40) fail('E-quote-len', `axis ${a.axis}: non-null quote shorter than 40 chars`);
      if (!src.includes(norm(a.quote))) fail('E-quote-in-source', `axis ${a.axis}: quote is not a verbatim substring of the source`);
    }
  });

  // E-weakest-ranked + weakest-claim quotes
  const wc = obj.weakest_claims;
  if (!Array.isArray(wc) || wc.length > 3) fail('E-weakest-ranked', `weakest_claims must be an array of length 0–3`);
  else {
    const ranks = wc.map(w => w.rank).sort((a, b) => a - b);
    ranks.forEach((r, i) => { if (r !== i + 1) fail('E-weakest-ranked', `weakest_claims ranks must be unique 1..n (got ${JSON.stringify(ranks)})`); });
    wc.forEach((w, i) => {
      if (!(w.quote && String(w.quote).length >= 40)) fail('E-quote-len', `weakest_claims[${i}]: quote must be ≥40 chars`);
      else if (!src.includes(norm(w.quote))) fail('E-quote-in-source', `weakest_claims[${i}]: quote is not a verbatim substring of the source`);
    });
  }
}

// ─────────────────────────── run ───────────────────────────
const args = parseArgs(process.argv.slice(2));
if (!args.source) die('missing --source <source-file>');
if (!args.findings && !args.findingsJson) die('missing --findings <findings.json> (or --findings-json <inline>)');
if (!existsSync(args.source)) die(`source file not found: ${args.source}`);
const sourceText = readFileSync(args.source, 'utf8');

let obj;
try {
  obj = JSON.parse(args.findingsJson != null ? args.findingsJson : readFileSync(args.findings, 'utf8'));
} catch (e) { die(`findings JSON did not parse — ${e.message}`); }

const AXES = loadAxisEnum();
validate(obj, sourceText, AXES);

if (failures.length) {
  console.error(`critique-eval: FAIL — ${failures.length} check(s):`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('critique-eval: PASS — schema conforms; 10 axes complete; applicable⇔N/A; every quote ≥40 chars and verbatim in source; gaps named; weakest-claims ranked.');
process.exit(0);
