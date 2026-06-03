#!/usr/bin/env node
// extract-article.js — crawl one item's <link> and readability-extract the body
// (Stage A, deterministic, no LLM). Zero npm dependencies. Requires: node >= 18.
//
// Extraction ladder (FR-C2):
//   1. Direct fetch + heuristic strip (<script>/<style>/<nav>/<header>/<footer>
//      removed; prefer <article>/<main> when present; collapse tags to text).
//   2. Fallback to https://r.jina.ai/<url> — the zero-dependency reader endpoint
//      already used by the learnkit sourcing ladder — when the heuristic yields
//      thin text.
//
// Output: extracted plain text on stdout. Exit codes:
//   0 = usable text   2 = thin/paywalled (caller flags the card preview-only)
//   1 = hard fetch failure (caller falls back to the RSS body)
//
// Usage:
//   node extract-article.js <url> [--min-chars 400] [--no-fallback]
//   node extract-article.js --file <path.html>
//   node extract-article.js --selftest
'use strict';

const fs = require('fs');
const path = require('path');

const THIN_DEFAULT = 400;

function stripToText(html) {
  let s = html;
  // Drop non-content regions entirely.
  s = s.replace(/<(script|style|nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi, ' ');
  // Prefer the main article region when the page marks one.
  const main = s.match(/<(article|main)\b[\s\S]*?<\/\1>/i);
  if (main) s = main[0];
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/<[^>]+>/g, ' '); // tags -> space
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function looksPaywalled(text) {
  return /subscribe to (continue|read)|this post is for paid subscribers|members only/i.test(text);
}

async function fetchText(url, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'pmos-magazine/1.0' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
}

function selftest() {
  const fixture = path.join(__dirname, '..', 'tests', 'fixtures', 'sample-article.html');
  const html = fs.readFileSync(fixture, 'utf8');
  const text = stripToText(html);
  let ok = true;
  const assert = (c, m) => { if (!c) { ok = false; console.error('FAIL:', m); } };

  assert(text.includes('single biggest pricing mistake'), 'article body extracted');
  assert(!text.includes('Site banner'), 'header stripped');
  assert(!text.includes('Subscribe'), 'nav stripped');
  assert(!/var x=1/.test(text), 'script stripped');
  assert(text.length >= THIN_DEFAULT, 'extracted text clears thin threshold');
  assert(looksPaywalled('Subscribe to continue reading') === true, 'paywall heuristic positive');
  assert(looksPaywalled(text) === false, 'clean article not flagged paywalled');

  // Regression (FR-P1): a large body must survive a pipe-captured run without
  // truncation. Drive this very script as a child with stdout captured (the
  // exact pattern that lost the tail before the flush-before-exit fix).
  const { execFileSync } = require('child_process');
  const os = require('os');
  const big = '<article>' + ('word '.repeat(20000)) + '</article>'; // ~100 KB
  const bigFile = path.join(os.tmpdir(), 'mag-extract-big-' + process.pid + '.html');
  fs.writeFileSync(bigFile, big);
  try {
    const captured = execFileSync(process.execPath, [__filename, '--file', bigFile], {
      maxBuffer: 64 * 1024 * 1024,
    }).toString();
    const expected = stripToText(big).length;
    assert(captured.trim().length === expected,
      'piped run not truncated (got ' + captured.trim().length + ' want ' + expected + ')');
    assert(expected > 64 * 1024, 'regression body exceeds the pipe buffer it used to truncate at');
  } finally {
    fs.unlinkSync(bigFile);
  }

  console.log(ok ? 'extract-article.js --selftest: PASS' : 'extract-article.js --selftest: FAIL');
  process.exit(ok ? 0 : 1);
}

module.exports = { stripToText, looksPaywalled };

if (require.main === module) {
  (async () => {
    const argv = process.argv.slice(2);
    if (argv.includes('--selftest')) return selftest();

    const minChars = parseInt(arg('--min-chars', String(THIN_DEFAULT)), 10);
    const noFallback = argv.includes('--no-fallback');
    const file = arg('--file', null);
    const url = argv.find((a) => !a.startsWith('--') && a !== file && a !== String(minChars));

    try {
      let html = file ? fs.readFileSync(file, 'utf8') : await fetchText(url, 20000);
      let text = stripToText(html);

      if (text.length < minChars && url && !noFallback) {
        // Reader-endpoint fallback for sites the heuristic can't handle.
        try {
          const readerText = await fetchText('https://r.jina.ai/' + url, 30000);
          if (readerText && readerText.length > text.length) text = readerText.replace(/\s+/g, ' ').trim();
        } catch (_e) { /* keep heuristic result */ }
      }

      // Flush before exit: stdout to a pipe is async, so process.exit() right
      // after write() drops the unflushed tail (truncates at the pipe buffer,
      // ~8-64 KB). Exit from the write callback, after the buffer has drained.
      const code = (looksPaywalled(text) || text.length < minChars) ? 2 : 0;
      process.stdout.write(text + '\n', () => process.exit(code));
    } catch (e) {
      process.stderr.write('extract-article: ' + (file || url) + ': ' + e.message + '\n');
      process.exit(1);
    }
  })();
}
