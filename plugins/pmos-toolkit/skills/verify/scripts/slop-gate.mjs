#!/usr/bin/env node
/**
 * /verify frontend slop gate — Node-path runner (story 260624-y9m, epic 260624-3jp).
 *
 * Runs the vendored deterministic design-slop detector
 * (_shared/slop-engine/detect.mjs) over a generated HTML artifact via the CHEAP
 * NODE PATH — no Playwright, no browser, no network, no LLM (Inv-4). It then
 * applies the deterministic category→severity map (§H: arithmetic/logic the model
 * must NOT do by hand) and reports two lanes:
 *
 *   • QUALITY  (contrast/a11y/rendering arithmetic faults) → [Blocker] | [Should-fix].
 *     A [Blocker] CAN GATE — it drops the /verify verdict below bare PASS.
 *   • SLOP     (taste / AI-tell)                            → [Should-fix] | [Nit].
 *     ADVISORY ONLY — surfaced loudly, NEVER hard-blocks (D-TIER, grill-confirmed).
 *
 * Inv-5 graceful degradation: if the engine is absent, detect.mjs throws, or the
 * vendored parser can't process the HTML, the gate prints a non-fatal skip note +
 * a `skipped:true` report and exits 0 — /verify continues with prior behaviour and
 * a correct PASS is NEVER flipped to FAIL on tooling absence.
 *
 * Output: a single JSON object on stdout (machine surface for the report); a human
 * one-line summary on stderr.
 *
 * Exit codes:
 *   0  ran clean (no [Blocker] quality fault)  OR  gracefully skipped (Inv-5)
 *   2  ran, ≥1 [Blocker] quality fault present (the gate fires — verdict must drop)
 *   64 usage error (missing/unreadable --source argument)
 *
 * Usage:
 *   node slop-gate.mjs --source <file.html> [--engine <detect.mjs>] [--quiet]
 */

import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
if (!args.source) usage('missing --source');

const source = resolve(args.source);
// The engine is the single vendored substrate (epic Inv-1). It is present in a
// build worktree via the cg6 claim-time merge; resolve it relative to this skill.
const enginePath = resolve(args.engine || join4(HERE, '..', '..', '_shared', 'slop-engine', 'detect.mjs'));

if (!existsSync(source)) usage(`--source not found: ${source}`);

// Quality faults that are unambiguous WCAG / a11y / rendering failures → [Blocker]
// (they gate). Every other quality rule is a softer [Should-fix]. Curated, frozen,
// and deterministic so the map is reproducible (§H) — never model judgement.
const BLOCKING_QUALITY = new Set([
  'low-contrast',                 // WCAG AA contrast arithmetic
  'gray-on-color',                // washed-out text on colored bg
  'broken-image',                 // missing/empty <img src>
  'text-overflow',                // clipped, unreadable text
  'clipped-overflow-container',   // content clipped out of its box
]);

// ── Inv-5 guard #1: the engine bundle must exist + be importable ─────────────
if (!existsSync(enginePath)) {
  skip(`slop-engine detector not found at ${enginePath}`);
}

let detectHtml, getAntipattern;
try {
  ({ detectHtml } = await import(pathToFileURL(enginePath).href));
  ({ getAntipattern } = await import(pathToFileURL(resolve(dirname(enginePath), 'registry.mjs')).href));
} catch (err) {
  skip(`slop-engine failed to load: ${err.message}`);
}

let raw;
try {
  // logDegraded:false — the browser-only-rule note is surfaced by /verify's body,
  // not re-emitted per gate run; this keeps the gate's stderr to one summary line.
  raw = await detectHtml(source, { logDegraded: false });
} catch (err) {
  // Inv-5: a parser/scan failure degrades — it never flips a correct PASS to FAIL.
  skip(`slop-engine could not process the HTML (${err.message})`);
}

const quality = [];
const slop = [];
for (const f of raw ?? []) {
  const id = f.antipattern;
  const rule = getAntipattern(id);
  const category = rule?.category === 'quality' ? 'quality' : 'slop';
  const severity = mapSeverity(category, id, f.severity);
  const row = { id, category, severity, snippet: f.snippet || '', file: f.file || source };
  (category === 'quality' ? quality : slop).push(row);
}
const blockers = quality.filter((q) => q.severity === 'Blocker');

const report = {
  ran: true,
  skipped: false,
  source,
  engine: enginePath,
  counts: { quality: quality.length, slop: slop.length, blockers: blockers.length },
  blockers,
  quality,
  slop,
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
if (!args.quiet) {
  console.error(
    `[slop-gate] ${blockers.length} blocking quality fault(s), `
    + `${quality.length} quality / ${slop.length} slop finding(s) — `
    + (blockers.length ? 'GATE FIRES (verdict drops below PASS)' : 'no quality blocker; slop advisory only'),
  );
}
process.exit(blockers.length ? 2 : 0);

// ── helpers ──────────────────────────────────────────────────────────────────

// Deterministic category→severity bracket. Quality blockers gate; everything
// else is surfaced but never gates.
function mapSeverity(category, id, engineSeverity) {
  if (category === 'quality') return BLOCKING_QUALITY.has(id) ? 'Blocker' : 'Should-fix';
  // slop: the 8 engine-`advisory` tells are the gentlest → [Nit]; the rest [Should-fix].
  return engineSeverity === 'advisory' ? 'Nit' : 'Should-fix';
}

// Inv-5 skip: non-fatal note + skipped report, exit 0 (the gate never hard-fails).
function skip(reason) {
  console.error(`[slop-gate] slop gate skipped — engine/parser unavailable: ${reason}`);
  const out = {
    ran: false,
    skipped: true,
    reason,
    source: typeof source === 'string' ? source : null,
    engine: typeof enginePath === 'string' ? enginePath : null,
    counts: { quality: 0, slop: 0, blockers: 0 },
    blockers: [],
    quality: [],
    slop: [],
  };
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  process.exit(0);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}

function join4(...parts) {
  return parts.join('/');
}

function usage(msg) {
  if (msg) console.error(`[slop-gate] ${msg}`);
  console.error('Usage: node slop-gate.mjs --source <file.html> [--engine <detect.mjs>] [--quiet]');
  process.exit(64);
}
