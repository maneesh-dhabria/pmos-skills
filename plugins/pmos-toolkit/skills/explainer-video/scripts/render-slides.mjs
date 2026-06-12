#!/usr/bin/env node
/*
 * render-slides.mjs — capture each slide of deck.html to a 1920x1080 PNG.
 *
 * Playwright headless Chromium screenshots every top-level slide <section> in
 * deck.html to frames/slide_NN.png, in document order. Patterned on
 * design-crit/assets/capture.mjs (same zero-config Chromium launch + the
 * exit-3-on-missing-Playwright contract), but slim and slide-specific — no
 * crawl/journey modes. Reference: ../reference/eval-rubric.md (frame/slide
 * parity is a self-check), ../SKILL.md Phase 4.
 *
 * Each <section> is isolated and shot at exactly 1920x1080 so frame count ==
 * slide count and every frame is the canonical 16:9 video size.
 *
 * Usage:
 *   node render-slides.mjs --deck <deck.html> --out <frames-dir>
 *   node render-slides.mjs --selftest        # no browser; asserts arg parsing + slide-count helper
 *
 * Exit codes: 0 ok · 1 args/usage · 2 runtime (no slides, capture error) · 3 Playwright missing.
 * Dependencies: node >= 18; playwright (global or local). Chromium via Playwright.
 */
'use strict';

import { mkdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

// Resolve Playwright whether it's installed LOCALLY or GLOBALLY (the documented
// `npm i -g playwright` path). ESM `import('playwright')` ignores NODE_PATH and
// won't see a global install, so on failure we `require` it from `npm root -g`.
async function loadChromium() {
  try {
    return (await import('playwright')).chromium;
  } catch { /* try global */ }
  try {
    const globalRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    const req = createRequire(join(globalRoot, 'noop.js'));
    return req('playwright').chromium;
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--deck') out.deck = argv[++i];
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--selftest') out.selftest = true;
    else if (a === '--viewport') out.viewport = argv[++i];
    else { process.stderr.write(`unknown arg: ${a}\n`); process.exit(1); }
  }
  return out;
}

function parseViewport(s) {
  const m = /^(\d+)x(\d+)$/.exec(s || '1920x1080');
  if (!m) { process.stderr.write(`bad --viewport: ${s}\n`); process.exit(1); }
  return { width: parseInt(m[1], 10), height: parseInt(m[2], 10) };
}

// Count top-level slide <section> elements in deck HTML (used by --selftest and
// as a sanity pre-check before launching the browser).
function countSlides(html) {
  const m = html.match(/<section\b/gi);
  return m ? m.length : 0;
}

function pad(n) { return String(n).padStart(2, '0'); }

async function selftest() {
  const fails = [];
  const ok = (c, m) => { if (!c) fails.push(m); };
  ok(parseViewport('1920x1080').width === 1920, 'viewport parse w');
  ok(parseViewport('1920x1080').height === 1080, 'viewport parse h');
  ok(countSlides('<section id="a">1</section><section id="b">2</section>') === 2, 'slide count 2');
  ok(countSlides('<div>none</div>') === 0, 'slide count 0');
  ok(pad(3) === '03' && pad(12) === '12', 'frame name padding');
  if (fails.length) { process.stderr.write('SELFTEST FAIL:\n  ' + fails.join('\n  ') + '\n'); process.exit(1); }
  process.stderr.write('SELFTEST PASS: render-slides.mjs arg + slide-count helpers hold.\n');
  process.exit(0);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selftest) return selftest();
  if (!args.deck) { process.stderr.write('usage: render-slides.mjs --deck <deck.html> --out <dir>\n'); process.exit(1); }
  if (!args.out) { process.stderr.write('usage: render-slides.mjs --deck <deck.html> --out <dir>\n'); process.exit(1); }

  const viewport = parseViewport(args.viewport);
  const deckPath = resolve(args.deck);
  const outDir = resolve(args.out);
  await mkdir(outDir, { recursive: true });

  const html = await readFile(deckPath, 'utf8');
  const nSlides = countSlides(html);
  if (nSlides === 0) { process.stderr.write(`render: no <section> slides found in ${deckPath}\n`); process.exit(2); }

  const chromium = await loadChromium();
  if (!chromium) {
    process.stderr.write('[render-slides] playwright is not installed. Install with:\n  npm i -g playwright && npx playwright install chromium\n');
    process.exit(3);
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(pathToFileURL(deckPath).href, { waitUntil: 'networkidle' });

    const count = await page.locator('section').count();
    if (count === 0) { process.stderr.write('render: page exposes no <section> at runtime\n'); process.exit(2); }

    for (let i = 0; i < count; i++) {
      // Isolate slide i: show only this <section>, force it to the exact viewport box.
      await page.evaluate((idx) => {
        const secs = Array.from(document.querySelectorAll('section'));
        secs.forEach((s, j) => {
          s.style.display = j === idx ? 'flex' : 'none';
          if (j === idx) {
            s.style.boxSizing = 'border-box';
            s.style.width = '100vw';
            s.style.height = '100vh';
            s.style.margin = '0';
          }
        });
        document.documentElement.style.margin = '0';
        document.body.style.margin = '0';
      }, i);
      const file = join(outDir, `slide_${pad(i + 1)}.png`);
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: viewport.width, height: viewport.height } });
      process.stderr.write(`render: slide_${pad(i + 1)}.png\n`);
    }
    process.stderr.write(`render: ${count} frame(s) → ${outDir}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => { process.stderr.write(`render: ${e?.stack || e}\n`); process.exit(2); });
