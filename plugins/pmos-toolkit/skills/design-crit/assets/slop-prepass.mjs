#!/usr/bin/env node
/**
 * design-crit deterministic slop pre-pass
 *
 * Injects the vendored slop-engine browser bundle (_shared/slop-engine/browser.js)
 * into a Playwright page, runs window.pmosDesignScan(), and reads the resulting
 * .pmos-slop-* findings from the LIVE DOM **programmatically** — never from a
 * screenshot. Emits {out}/slop-findings.json: [{ id, category, severity, snippet,
 * selector, section }]. This is the deterministic, offline engine lane that runs
 * BEFORE design-crit's LLM Nielsen/WCAG/PSYCH critique (D-STACK); it complements,
 * never replaces, that critique (non-duplication).
 *
 * Usage:
 *   node slop-prepass.mjs --source <file-or-url> --out <dir> [--engine <browser.js>] [--viewport 1440x900]
 *
 * Inv-5 (graceful degradation): if the engine bundle is missing/unreadable, or
 * window.pmosDesignScan is undefined / throws, the helper logs a single stderr
 * skip note, writes an empty slop-findings.json, and exits 0 — so /design-crit
 * proceeds EXACTLY as today. Inv-4: no LLM/network call. Inv-3: the engine is
 * referenced only by its pmos-native path + window.pmosDesignScan + .pmos-slop-*.
 *
 * Exit codes: 0 ok (incl. graceful engine-absent skip), 1 args/usage, 3 playwright missing.
 */

import { mkdir, writeFile, access } from 'node:fs/promises';
import { constants as FS } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
if (!args.source) usage('missing --source');
if (!args.out) usage('missing --out');

const outDir = resolve(args.out);
const outFile = join(outDir, 'slop-findings.json');
// The claim-time-merged engine resolves relative to this skill dir (epic Inv-1: one engine).
const enginePath = resolve(args.engine || join(HERE, '..', '..', '_shared', 'slop-engine', 'browser.js'));
const viewport = parseViewport(args.viewport ?? '1440x900');

await mkdir(outDir, { recursive: true });

// playwright is a hard design-crit dependency (Phase 3 capture already needs it);
// its absence is a dependency error (exit 3), distinct from the Inv-5 engine-absent skip.
// Check it FIRST so a missing Playwright always surfaces as exit 3 even when the
// engine bundle is also absent — the dependency error must win over the soft skip.
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('[slop-prepass] playwright is not installed. Install with:\n  npm i -g playwright && npx playwright install chromium');
  process.exit(3);
}

// ── Inv-5 guard #1: engine bundle must exist + be readable ───────────────────
try {
  await access(enginePath, FS.R_OK);
} catch {
  await skip(`engine bundle unreadable at ${enginePath}`);
}

// Map rule id -> skillSection from the single registry (Inv-1) for the report's section column.
const sectionById = await loadSectionMap(enginePath);

const browser = await chromium.launch({ headless: true });
let findings = [];
let overlaysRendered = 0;
try {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const target = /^https?:\/\//i.test(args.source) ? args.source : pathToFileURL(resolve(args.source)).href;
  await page.goto(target, { waitUntil: 'networkidle', timeout: 30000 });

  // ── Wireframe exemption (epic 260710-grd A9), detected BEFORE the scan ────────
  // The slop tells are HTML/CSS heuristics (background-clip:text, gradient text,
  // spacing rhythm, easing curves). A monochrome-SVG /wireframes artifact renders
  // its payload as SVG primitives — there is no HTML/CSS surface for those tells
  // to read, so scanning it produces noise, not signal. Record an EARNED skip via
  // the SAME graceful-degradation machinery (skipped:true + reason + empty findings,
  // exit 0, the contracted stderr skip-note) rather than a silent cap — the run
  // says it skipped and why.
  const isWireframe = await page.evaluate(() =>
    !!document.querySelector('meta[name="pmos:skill"][content="wireframes"]')
  );
  if (isWireframe) {
    await context.close();
    await browser.close().catch(() => {});
    await skip('wireframe SVG artifact — slop tells are HTML/CSS heuristics; the monochrome SVG payload has no surface to scan (epic 260710-grd A9)');
  }

  // Suppress autoScan so we drive the scan explicitly and read its structured
  // return (the live findings) rather than racing the auto-pass.
  await page.addInitScript(() => { window.__PMOS_SLOP_CONFIG__ = { autoScan: false }; });
  // Inject the engine via addScriptTag (CDP-injected — bypasses any page CSP that
  // would block eval), then immediately REMOVE the injected <script> node. The
  // engine's globals (window.pmosDesignScan) persist on window, but its 200KB
  // source no longer sits in the DOM: the engine's own page-level regex checks
  // scan document.outerHTML, and that source literally contains CSS tells
  // (background-clip:text, gradient) and rule-description copy (e.g. "…theater…")
  // — so leaving the source node makes the engine flag itself. Removing it makes
  // the scan see only the inspected page, exactly as in a real /design-crit run
  // where the engine is never part of the page under test.
  const scriptHandle = await page.addScriptTag({ path: enginePath });
  await scriptHandle.evaluate((node) => node.remove());

  // Inv-5 guard #2: the bundle must have defined the scan entry point.
  const scanDefined = await page.evaluate(() => typeof window.pmosDesignScan === 'function');
  if (!scanDefined) {
    await browser.close();
    await skip('window.pmosDesignScan is undefined after injecting the engine bundle');
  }

  // Read findings from the live page programmatically (the scan over the DOM) — NOT a screenshot.
  const scanned = await page.evaluate(() => window.pmosDesignScan());
  // Corroborate the visual lane rendered: count .pmos-slop-* overlays in the DOM.
  overlaysRendered = await page.$$eval('.pmos-slop-overlay, .pmos-slop-label', (els) => els.length);

  findings = flatten(scanned, sectionById);
  await context.close();
} catch (err) {
  await browser.close().catch(() => {});
  await skip(`engine scan failed: ${err.message}`);
}
await browser.close().catch(() => {});

await writeFile(outFile, JSON.stringify({ generated: nowStamp(), source: args.source, engine: enginePath, overlaysRendered, findings }, null, 2));
console.log(`[slop-prepass] ${findings.length} deterministic finding(s), ${overlaysRendered} overlay node(s) → ${outFile}`);
process.exit(0);

// ── helpers ──────────────────────────────────────────────────────────────────

// Flatten pmosDesignScan()'s [{selector, findings:[{type,category,severity,detail,...}]}]
// into [{ id, category, severity, snippet, selector, section }]. Snippets keep the engine's
// straight-double-quote convention for identifying text.
function flatten(scanned, sectionMap) {
  const out = [];
  for (const node of scanned ?? []) {
    for (const f of node.findings ?? []) {
      const id = f.type || f.id;
      out.push({
        id,
        category: f.category || 'quality',
        severity: f.severity || 'warning',
        snippet: f.detail || f.snippet || f.name || '',
        selector: node.selector || '',
        section: sectionMap.get(id) || '',
      });
    }
  }
  return out;
}

// Load id -> skillSection from the engine's sibling registry.mjs (best-effort; section is cosmetic).
async function loadSectionMap(engineFile) {
  const map = new Map();
  try {
    const registry = pathToFileURL(join(dirname(engineFile), 'registry.mjs')).href;
    const { SLOP_RULES } = await import(registry);
    for (const r of SLOP_RULES ?? []) if (r.id) map.set(r.id, r.skillSection || '');
  } catch { /* section column simply stays empty — non-fatal */ }
  return map;
}

// Inv-5 skip: log a single stderr note, write an empty findings file, exit 0.
async function skip(reason) {
  console.error(`[slop-prepass] slop-engine unavailable — skipping deterministic pre-pass: ${reason}`);
  try {
    await mkdir(outDir, { recursive: true });
    await writeFile(outFile, JSON.stringify({ generated: nowStamp(), source: args.source, engine: enginePath, skipped: true, reason, findings: [] }, null, 2));
  } catch { /* even the skip-file write is best-effort */ }
  process.exit(0);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    }
  }
  return out;
}

function parseViewport(s) {
  const [w, h] = String(s).split('x').map(Number);
  return { width: w || 1440, height: h || 900 };
}

function nowStamp() {
  // Avoid Date.now() determinism concerns in tests by reading the env override when present.
  return process.env.SLOP_PREPASS_STAMP || new Date().toISOString();
}

function usage(msg) {
  if (msg) console.error(`[slop-prepass] ${msg}`);
  console.error('Usage: node slop-prepass.mjs --source <file-or-url> --out <dir> [--engine <browser.js>] [--viewport 1440x900]');
  process.exit(1);
}
