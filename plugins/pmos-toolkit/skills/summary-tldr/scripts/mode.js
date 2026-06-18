#!/usr/bin/env node
// mode.js — deterministic `--mode` output-dimension dispatch for /summary-tldr (story 260617-xn4).
//
// The model never decides mode validity, style-applicability, or which modes are live this
// release — that is deterministic routing and belongs in a script (skill-patterns.md §H).
//
// Modes (design 260617-jy8 #frs-scaffold, D1/D10/D11):
//   narrative — default; today's grounded text TL;DR (back-compat). `--style` applies HERE only.
//   mindmap   — tree/radial diagram via /diagram --mode mindmap (story 1aq).
//   video     — narrated .mp4 via /explainer-video on the ORIGINAL source (story gfx, D9).
//   shorts    — swipeable ≤140-char card carousel + relevant-media pairing (story wf6).
//
// `--mode` is ORTHOGONAL to `--style` (INV2): style shapes only the narrative text; with a
// non-narrative mode it is recorded ignored-with-warn. Single mode per run (v1, D10).
//
// CLI:
//   node mode.js --mode <m> [--style <s>]   → prints JSON {mode, styleApplies, status, warn?}; invalid → exit 64
//   node mode.js --video-length-resolve --compression <c> [--video-length <v>]
//                                           → prints JSON {length, source}; invalid override → exit 64
//   node mode.js --selftest                 → runs fixtures, exit 0 (pass) / 1 (fail)

'use strict';

const MODES = ['narrative', 'mindmap', 'video', 'shorts'];
// All four modes are fully implemented across epic 260617-jy8: narrative + mindmap (xn4/1aq),
// video (gfx), shorts (wf6). No modes are deferred, so SHIPS_IN is empty.
const IMPLEMENTED = new Set(['narrative', 'mindmap', 'video', 'shorts']);
const SHIPS_IN = {};

const DEFAULT_MODE = 'narrative';

// --- Video length mapping (story gfx, FR-C1/D9, §I) ------------------------------------------
// `--mode video` delegates to /explainer-video, whose length dial is quick|standard|deep. The
// length is DERIVED from /summary-tldr's --compression band, with an explicit --video-length
// override. This is deterministic routing (§H) — the model never picks the length.
const VIDEO_LENGTHS = ['quick', 'standard', 'deep'];
const COMPRESSION_TO_VIDEO_LENGTH = { tight: 'quick', standard: 'standard', detailed: 'deep' };

// Resolve the /explainer-video --length for video mode. `overrideLength` (the --video-length
// contract flag) wins when present + valid; otherwise map the compression band. Returns
// {length, source} (source ∈ override|compression|default) or {error} (caller → exit 64).
function resolveVideoLength(compression, overrideLength) {
  if (overrideLength !== undefined && overrideLength !== null && overrideLength !== '') {
    const v = String(overrideLength).trim().toLowerCase();
    if (!VIDEO_LENGTHS.includes(v)) {
      return { error: `error: --video-length must be one of ${VIDEO_LENGTHS.join('|')} (got '${overrideLength}')` };
    }
    return { length: v, source: 'override' };
  }
  const raw = compression === undefined || compression === null || compression === '' ? 'standard' : compression;
  const c = String(raw).trim().toLowerCase();
  const length = COMPRESSION_TO_VIDEO_LENGTH[c];
  // An unvalidated/unknown band shouldn't reach here (Phase 1 validates --compression), but be
  // safe rather than emit an undefined length to the handoff.
  if (!length) return { length: 'standard', source: 'default' };
  return { length, source: 'compression' };
}

// Resolve + validate a mode value. Returns {mode} or {error} (caller maps error → exit 64).
function resolveMode(raw) {
  if (raw === undefined || raw === null || raw === '') return { mode: DEFAULT_MODE };
  const m = String(raw).trim().toLowerCase();
  if (!MODES.includes(m)) {
    return {
      error: `error: --mode must be one of ${MODES.join('|')} (got '${raw}')`,
    };
  }
  return { mode: m };
}

// `--style` is meaningful only in narrative mode (D1/INV2).
function styleApplies(mode) {
  return mode === 'narrative';
}

// Routing for a resolved mode: implemented vs deferred-with-graceful-note.
function modeStatus(mode) {
  if (IMPLEMENTED.has(mode)) return { status: 'implemented' };
  return {
    status: 'deferred',
    note: `mode '${mode}' is not yet available — it ships in a later release (story ${SHIPS_IN[mode]}). `
      + `The canonical text summary is still produced.`,
  };
}

// Full dispatch decision for a (mode, styleProvided) pair. Pure.
function dispatch(rawMode, styleProvided) {
  const r = resolveMode(rawMode);
  if (r.error) return r;
  const mode = r.mode;
  const out = { mode, styleApplies: styleApplies(mode), ...modeStatus(mode) };
  if (styleProvided && !out.styleApplies) {
    out.warn = `--style is ignored in --mode ${mode} (it shapes only the narrative text); `
      + `the canonical text summary still emits at the resolved narrative style.`;
  }
  return out;
}

function getFlag(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args[i + 1];
}

function selftest() {
  const cases = [];
  const assert = (name, cond) => cases.push({ name, ok: !!cond });

  // default
  let d = dispatch(undefined, false);
  assert('default mode is narrative', d.mode === 'narrative');
  assert('narrative style applies', d.styleApplies === true);
  assert('narrative implemented', d.status === 'implemented');

  // explicit narrative + style → no warn
  d = dispatch('narrative', true);
  assert('narrative+style no warn', !d.warn);

  // mindmap implemented, style does not apply, warn when style provided
  d = dispatch('mindmap', true);
  assert('mindmap resolves', d.mode === 'mindmap');
  assert('mindmap implemented', d.status === 'implemented');
  assert('mindmap style not applied', d.styleApplies === false);
  assert('mindmap+style warns', typeof d.warn === 'string' && d.warn.includes('ignored'));

  // mindmap without style → no warn
  d = dispatch('mindmap', false);
  assert('mindmap no-style no warn', !d.warn);

  // video implemented (story gfx), style does not apply, warns when style provided
  d = dispatch('video', true);
  assert('video resolves', d.mode === 'video');
  assert('video implemented', d.status === 'implemented');
  assert('video style not applied', d.styleApplies === false);
  assert('video+style warns', typeof d.warn === 'string' && d.warn.includes('ignored'));

  // shorts implemented (story wf6); style does not apply
  d = dispatch('shorts', true);
  assert('shorts resolves', d.mode === 'shorts');
  assert('shorts implemented', d.status === 'implemented');
  assert('shorts style not applied', d.styleApplies === false);
  assert('shorts+style warns', typeof d.warn === 'string' && d.warn.includes('ignored'));

  // video length mapping (FR-C1/D9): compression band → /explainer-video --length
  let v = resolveVideoLength('tight', undefined);
  assert('tight → quick', v.length === 'quick' && v.source === 'compression');
  v = resolveVideoLength('standard', undefined);
  assert('standard → standard', v.length === 'standard' && v.source === 'compression');
  v = resolveVideoLength('detailed', undefined);
  assert('detailed → deep', v.length === 'deep' && v.source === 'compression');
  v = resolveVideoLength(undefined, undefined);
  assert('no compression → standard', v.length === 'standard');
  // --video-length override wins over the band
  v = resolveVideoLength('tight', 'deep');
  assert('override beats band', v.length === 'deep' && v.source === 'override');
  v = resolveVideoLength('detailed', '  Quick ');
  assert('override case-insensitive + trimmed', v.length === 'quick' && v.source === 'override');
  // invalid override → error naming the set
  v = resolveVideoLength('standard', 'epic');
  assert('invalid override errors', !!v.error);
  assert('override error names set', v.error.includes(VIDEO_LENGTHS.join('|')));

  // case-insensitive + trims
  d = dispatch('  MindMap ', false);
  assert('mode is case-insensitive + trimmed', d.mode === 'mindmap');

  // invalid → error naming the set
  d = dispatch('graph', false);
  assert('invalid mode errors', !!d.error);
  assert('error names full set', d.error.includes(MODES.join('|')));

  const failed = cases.filter((c) => !c.ok);
  if (failed.length) {
    for (const f of failed) process.stderr.write(`FAIL: ${f.name}\n`);
    process.stderr.write(`SELFTEST FAIL: ${failed.length}/${cases.length} mode.js checks failed.\n`);
    process.exit(1);
  }
  process.stdout.write(`SELFTEST PASS: mode.js dispatch model holds (${cases.length} checks).\n`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) return selftest();

  // Video length resolution subcommand (story gfx) — deterministic --compression → --length map.
  if (args.includes('--video-length-resolve')) {
    const out = resolveVideoLength(getFlag(args, '--compression'), getFlag(args, '--video-length'));
    if (out.error) {
      process.stderr.write(out.error + '\n');
      process.exit(64);
    }
    process.stdout.write(JSON.stringify(out) + '\n');
    return;
  }

  const rawMode = getFlag(args, '--mode');
  const styleProvided = args.includes('--style');
  const out = dispatch(rawMode, styleProvided);
  if (out.error) {
    process.stderr.write(out.error + '\n');
    process.exit(64);
  }
  process.stdout.write(JSON.stringify(out) + '\n');
}

if (require.main === module) main();

module.exports = {
  MODES, IMPLEMENTED, DEFAULT_MODE, VIDEO_LENGTHS, COMPRESSION_TO_VIDEO_LENGTH,
  resolveMode, styleApplies, modeStatus, dispatch, resolveVideoLength,
};
