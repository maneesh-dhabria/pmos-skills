// extract-screens.js — extract <section data-screen> (or <section id>) blocks
// from a wireframe HTML file. Zero deps; regex + line-by-line state machine.
//
// Exported as a CommonJS module so build-canvas.js can require() it. Also
// runnable directly for ad-hoc inspection: `node extract-screens.js <file>`.

'use strict';
const fs = require('fs');
const path = require('path');

// Match <section> open tags. Captures attribute string (everything between
// `<section` and the closing `>`). Tolerant of multi-line attribute lists.
const SECTION_OPEN = /<section\b([^>]*)>/gi;
const ATTR_DATA_SCREEN = /\bdata-screen\s*=\s*["']([^"']+)["']/i;
const ATTR_ID = /\bid\s*=\s*["']([^"']+)["']/i;
const H2_INNER = /<h2\b[^>]*>([\s\S]*?)<\/h2>/i;

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// Find the end of the <section> opened at `startIdx` by tracking nested
// <section> depth. Returns the index just after the matching </section>, or
// -1 if no closer is found (malformed HTML — caller logs a warning).
function findSectionClose(html, startIdx) {
  const re = /<\/?section\b[^>]*>/gi;
  re.lastIndex = startIdx;
  let depth = 1;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[0].startsWith('</')) {
      depth--;
      if (depth === 0) return m.index + m[0].length;
    } else {
      depth++;
    }
  }
  return -1;
}

function extractScreens(html, sourceFile) {
  const screens = [];
  const seenIds = new Set();
  let m;
  SECTION_OPEN.lastIndex = 0;
  while ((m = SECTION_OPEN.exec(html)) !== null) {
    const attrs = m[1] || '';
    const dataScreenMatch = attrs.match(ATTR_DATA_SCREEN);
    const idMatch = attrs.match(ATTR_ID);
    const screenId = (dataScreenMatch && dataScreenMatch[1]) || (idMatch && idMatch[1]);
    if (!screenId) continue;
    if (seenIds.has(screenId)) continue; // ignore nested sections with same id
    seenIds.add(screenId);
    const closeIdx = findSectionClose(html, m.index + m[0].length);
    const inner = closeIdx > 0
      ? html.slice(m.index + m[0].length, closeIdx)
      : html.slice(m.index + m[0].length);
    const h2 = inner.match(H2_INNER);
    const title = h2 ? stripTags(h2[1]) : screenId;
    screens.push({
      screen_id: screenId,
      source_file: sourceFile,
      anchor: '#' + screenId,
      title,
    });
  }
  return screens;
}

module.exports = { extractScreens };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node extract-screens.js <wireframe.html>');
    process.exit(64);
  }
  const html = fs.readFileSync(file, 'utf8');
  const out = extractScreens(html, path.basename(file));
  console.log(JSON.stringify(out, null, 2));
}
