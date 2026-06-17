#!/usr/bin/env node
// mode.js — deterministic `--mode` output-dimension dispatch for /summary-tldr (story 260617-xn4).
//
// The model never decides mode validity, style-applicability, or which modes are live this
// release — that is deterministic routing and belongs in a script (skill-patterns.md §H).
//
// Modes (design 260617-jy8 #frs-scaffold, D1/D10/D11):
//   narrative — default; today's grounded text TL;DR (back-compat). `--style` applies HERE only.
//   mindmap   — tree/radial diagram via /diagram --mode mindmap (implemented in this story, deps 1aq).
//   video     — narrated .mp4 via /explainer-video (ships in story gfx) — DEFERRED here.
//   shorts    — swipeable ≤140-char card carousel + relevant-media pairing (implemented; story wf6).
//
// `--mode` is ORTHOGONAL to `--style` (INV2): style shapes only the narrative text; with a
// non-narrative mode it is recorded ignored-with-warn. Single mode per run (v1, D10).
//
// CLI:
//   node mode.js --mode <m> [--style <s>]   → prints JSON {mode, styleApplies, status, warn?}; invalid → exit 64
//   node mode.js --selftest                 → runs fixtures, exit 0 (pass) / 1 (fail)

'use strict';

const MODES = ['narrative', 'mindmap', 'video', 'shorts'];
// Modes fully implemented in THIS story (260617-xn4). The rest are accepted values that route to a
// graceful "not yet available" note here and ship in a later story (gfx=video, wf6=shorts).
const IMPLEMENTED = new Set(['narrative', 'mindmap', 'shorts']);
const SHIPS_IN = { video: '260617-gfx' };

const DEFAULT_MODE = 'narrative';

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

  // shorts implemented (story wf6); style does not apply
  d = dispatch('shorts', true);
  assert('shorts resolves', d.mode === 'shorts');
  assert('shorts implemented', d.status === 'implemented');
  assert('shorts style not applied', d.styleApplies === false);
  assert('shorts+style warns', typeof d.warn === 'string' && d.warn.includes('ignored'));

  // video still deferred with note
  for (const m of ['video']) {
    d = dispatch(m, false);
    assert(`${m} resolves`, d.mode === m);
    assert(`${m} deferred`, d.status === 'deferred');
    assert(`${m} note names ship story`, d.note && d.note.includes(SHIPS_IN[m]));
    assert(`${m} note promises canonical text`, d.note.includes('canonical text'));
  }

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

module.exports = { MODES, IMPLEMENTED, DEFAULT_MODE, resolveMode, styleApplies, modeStatus, dispatch };
