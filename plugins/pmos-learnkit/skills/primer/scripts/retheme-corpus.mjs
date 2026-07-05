#!/usr/bin/env node
// retheme-corpus.mjs — refresh the bundled primer corpus files' INLINED html-authoring substrate
// CSS to the CURRENT _shared/html-authoring/assets/style.css (+ comments.css). Marker-scoped so
// only the substrate <style> block is touched and the primer body <main>…</main> stays byte-for-byte
// identical (INV-5). Idempotent: re-running is a byte-for-byte no-op (D7). Zero external deps; Node ESM.
// Story 260704-v4a, epic 260704-vde (see docs/pmos/features/2026-07-04_library-viewer-substrate-theme/).
//
// Usage:
//   node retheme-corpus.mjs [file ...]     # default file set: ../data/primers/*.html (all bundled primers)
//   node retheme-corpus.mjs --check [file ...]   # dry-run: report changed/unchanged, write nothing
//   node retheme-corpus.mjs --selftest     # in-memory fixture round-trip (the four AC5 cases)
//
// Why marker-scoped, not "first <style>": a bundled primer inlines the substrate CSS as a single
// <style> block whose FIRST bytes are the substrate header comment. We locate THAT block by the
// marker (SUBSTRATE_MARKER below) and rebuild it with the exact assembly the live renderer uses
// (_shared/html-authoring/render.js line 38):
//     <style>\n{style.css}\n/* --- comments.css --- */\n{comments.css}\n</style>
// so a re-themed corpus file is byte-identical to a freshly-generated primer, and a file already on
// the current theme round-trips to itself (idempotence). Everything outside the matched <style> span
// — crucially the primer body — is preserved verbatim. On a file that has NO substrate-marked <style>
// block the CLI fails LOUD (non-zero exit naming the file); it never silently skips (AC4).

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SUBSTRATE_MARKER = '/* pmos-toolkit html-authoring substrate';

function readAsset(name) {
  const url = new URL(`../../_shared/html-authoring/assets/${name}`, import.meta.url);
  try {
    return readFileSync(url, 'utf8');
  } catch (err) {
    throw new Error(
      `retheme-corpus: cannot read canonical asset at ${fileURLToPath(url)} — the html-authoring ` +
      `substrate must be present beside the primer skill. Underlying error: ${err.message}`,
    );
  }
}

// Build the substrate <style> block EXACTLY as _shared/html-authoring/render.js assembles it, so a
// re-themed file matches a freshly-generated one byte-for-byte (and re-running is idempotent).
export function buildSubstrateStyleBlock() {
  const style = readAsset('style.css');
  const comments = readAsset('comments.css');
  return '<style>\n' + style + '\n/* --- comments.css --- */\n' + comments + '\n</style>';
}

// Find the substrate <style>…</style> span (the block whose content carries SUBSTRATE_MARKER).
// Returns { start, end } byte offsets of the whole span (inclusive of the tags), or null if absent.
export function findSubstrateStyleSpan(html) {
  const re = /<style\b[^>]*>[\s\S]*?<\/style>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[0].includes(SUBSTRATE_MARKER)) return { start: m.index, end: m.index + m[0].length };
  }
  return null;
}

// Pure transform: swap a file's substrate <style> span for `block`. Returns { ok, next, changed }.
// ok=false ⇒ no substrate-marked <style> block was found (caller fails loud). Everything outside the
// matched span — including <main> — is preserved verbatim, so the body is byte-unchanged by construction.
export function rethemeHtml(html, block) {
  const span = findSubstrateStyleSpan(html);
  if (!span) return { ok: false };
  const next = html.slice(0, span.start) + block + html.slice(span.end);
  return { ok: true, next, changed: next !== html };
}

function defaultCorpusFiles() {
  const dirUrl = new URL('../data/primers/', import.meta.url);
  const dir = fileURLToPath(dirUrl);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.html'))
    .sort()
    .map((f) => dir + f);
}

// --- in-memory selftest (the four AC5 cases, no disk fixtures needed) -------------------------------
function selftest() {
  const block = buildSubstrateStyleBlock();
  const body = '\n<main class="pmos-artifact-body">\n<h1>Fixture — © 2026 & <em>x</em></h1>\n</main>\n';
  const stale =
    '<!doctype html><head>\n  <style>\n' +
    '/* pmos-toolkit html-authoring substrate — STALE Mono Minimal */\n' +
    ':root{--pmos-bg:#fafafa;--pmos-accent:#c2410c}\n' +
    '/* --- comments.css --- */\n/* old comments.css */\n</style>\n</head>' + body;
  const noMarker = '<!doctype html><head><style>/* some unrelated inline style */body{}</style></head>' + body;

  const bodyOf = (h) => h.slice(h.indexOf('<main'), h.indexOf('</main>') + '</main>'.length);
  let pass = 0, fail = 0;
  const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('  SELFTEST FAIL: ' + msg); } };

  // (a) marker-matched block is replaced with the CURRENT style.css (Editorial Technical tokens land).
  const r1 = rethemeHtml(stale, block);
  ok(r1.ok && r1.changed, 'stale file should be rethemed (ok+changed)');
  ok(r1.next.includes('--pmos-bg:') && r1.next.includes('#f8f5ef'), 'rethemed :root carries current --pmos-bg #f8f5ef');
  ok(!r1.next.includes('STALE Mono Minimal'), 'stale substrate marker text is gone');
  // (b) body <main>…</main> is byte-for-byte unchanged.
  ok(bodyOf(r1.next) === bodyOf(stale), 'body <main> bytes unchanged after retheme');
  // (c) second run is byte-idempotent.
  const r2 = rethemeHtml(r1.next, block);
  ok(r2.ok && !r2.changed && r2.next === r1.next, 'second run is a byte-identical no-op (idempotent)');
  // (d) a file with no substrate marker triggers a loud failure (ok=false).
  ok(rethemeHtml(noMarker, block).ok === false, 'missing-marker file reports ok=false (fail loud)');

  if (fail === 0) { console.log(`SELFTEST PASS: ${pass} assertions`); process.exit(0); }
  console.error(`SELFTEST FAIL: ${fail} of ${pass + fail} assertions failed`); process.exit(1);
}

// --- CLI -------------------------------------------------------------------------------------------
function main(argv) {
  const args = argv.slice(2);
  if (args.includes('--selftest')) return selftest();
  const check = args.includes('--check');
  const files = args.filter((a) => !a.startsWith('--'));
  const targets = files.length ? files : defaultCorpusFiles();
  if (!targets.length) { console.error('retheme-corpus: no corpus files found (expected ../data/primers/*.html)'); process.exit(2); }

  const block = buildSubstrateStyleBlock();
  const missing = [];
  let changed = 0, unchanged = 0;
  for (const file of targets) {
    const html = readFileSync(file, 'utf8');
    const r = rethemeHtml(html, block);
    if (!r.ok) { missing.push(file); console.error(`  MISSING-MARKER: ${file}`); continue; }
    if (r.changed) {
      if (!check) writeFileSync(file, r.next);
      changed++;
      console.log(`  ${check ? 'WOULD-CHANGE' : 'CHANGED'}: ${file}`);
    } else {
      unchanged++;
      console.log(`  unchanged: ${file}`);
    }
  }
  console.log(`retheme-corpus: ${changed} ${check ? 'would change' : 'changed'}, ${unchanged} unchanged, ${missing.length} missing-marker (of ${targets.length}).`);
  if (missing.length) {
    console.error(`retheme-corpus: FAIL — ${missing.length} file(s) lack the substrate marker '${SUBSTRATE_MARKER}…'; refusing to silently skip.`);
    process.exit(1);
  }
}

// Only run the CLI when invoked directly (allows importing the pure helpers from tests).
if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv);
}
