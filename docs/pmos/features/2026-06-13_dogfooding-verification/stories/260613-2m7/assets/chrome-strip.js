#!/usr/bin/env node
// chrome-strip.js — extract <h1> + first <main> from artifact HTML; strip surrounding chrome.
// Per FR-50 / chrome-strip.md algorithm. Operates on source bytes (no DOM parse).
'use strict';

const fs = require('fs');

function extractFirstH1(src) {
  const m = src.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i);
  return m ? m[0] : '';
}

function extractFirstMain(src) {
  // Balanced-tag tracker. Finds first `<main` open, then walks <main / </main>
  // tokens with a depth counter; returns the slice from the opening byte
  // through the close at depth 0. Differs from `<main[^>]*>(.*?)</main>` —
  // that regex truncates on the inner close when literal <main> appears
  // inside <pre><code> (R2 mitigation).
  const openRe = /<main\b/gi;
  const closeRe = /<\/main\s*>/gi;
  const first = openRe.exec(src);
  if (!first) return '';
  const start = first.index;
  let depth = 1;
  let cursor = openRe.lastIndex;
  while (depth > 0) {
    openRe.lastIndex = cursor;
    closeRe.lastIndex = cursor;
    const nextOpen = openRe.exec(src);
    const nextClose = closeRe.exec(src);
    if (!nextClose) return src.slice(start);
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++;
      cursor = openRe.lastIndex;
    } else {
      depth--;
      cursor = closeRe.lastIndex;
      if (depth === 0) return src.slice(start, cursor);
    }
  }
  return src.slice(start);
}

function stripChrome(slice) {
  return slice
    .replace(/<link\b[^>]*\/?>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
}

function main() {
  const path = process.argv[2];
  if (!path) {
    process.stderr.write('usage: chrome-strip.js <artifact.html>\n');
    process.exit(64);
  }
  const src = fs.readFileSync(path, 'utf8');
  const h1 = extractFirstH1(src);
  const mainEl = extractFirstMain(src);
  if (!mainEl) {
    process.stderr.write('chrome-strip: no <main> found in ' + path + '\n');
    process.exit(1);
  }
  process.stdout.write(stripChrome(h1) + '\n' + stripChrome(mainEl) + '\n');
}

main();
