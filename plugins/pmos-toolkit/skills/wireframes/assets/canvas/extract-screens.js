// extract-screens.js — extract a screen descriptor from a per-device
// wireframe HTML file. Each file produced by /wireframes `#generate` is one
// (component × device) pair = one screen on the canvas.
//
// Two extraction strategies, tried in order:
//
//  1. File-level (default for /wireframes output): parse the filename
//     against the canonical pattern `{NN}_{component-slug}_{device}.html`.
//     The `<title>` tag (or first `<h1>` / `<h2>`) gives the screen title.
//
//  2. Section-level (advanced): if the file contains `<section data-screen>`,
//     extract each as a sub-screen. Useful for hand-authored multi-screen
//     wireframes that don't follow the file-per-screen convention.
//
// Zero deps. CommonJS module.

'use strict';
const fs = require('fs');
const path = require('path');

const KNOWN_DEVICES = ['desktop-web', 'mobile-web', 'tablet-web', 'desktop', 'mobile', 'tablet'];
const TITLE_TAG = /<title\b[^>]*>([\s\S]*?)<\/title>/i;
const H1_TAG = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i;
const H2_TAG = /<h2\b[^>]*>([\s\S]*?)<\/h2>/i;
const SECTION_OPEN = /<section\b([^>]*)>/gi;
const ATTR_DATA_SCREEN = /\bdata-screen\s*=\s*["']([^"']+)["']/i;
const ATTR_ID = /\bid\s*=\s*["']([^"']+)["']/i;

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function deviceAndIdFromFilename(filename) {
  // Strip .html and any leading numeric prefix.
  const stem = filename.replace(/\.html$/i, '');
  // Try each known device as a trailing suffix (delimited by `_` or `-`).
  for (const dev of KNOWN_DEVICES) {
    const re = new RegExp('(?:^|[_-])' + dev + '$');
    if (re.test(stem)) {
      let screenId = stem.replace(re, '');
      // Strip optional leading `NN_` numeric prefix for cleaner IDs.
      screenId = screenId.replace(/^\d+[_-]/, '');
      return { device: dev, screen_id: screenId || stem };
    }
  }
  // No device suffix recognised — use stem as screen_id, "unknown" device.
  return { device: 'unknown', screen_id: stem.replace(/^\d+[_-]/, '') || stem };
}

function titleFromHtml(html) {
  const t = html.match(TITLE_TAG);
  if (t) {
    const txt = stripTags(t[1]);
    // /wireframes convention: "Component (state) — device — Wireframe".
    // Strip trailing " — Wireframe" and the " — <device>" segment for brevity.
    return txt.replace(/\s+[—-]\s+Wireframe\s*$/i, '').replace(/\s+[—-]\s+[a-z-]+(?:\s+[—-]\s+)?$/i, '').trim();
  }
  const h1 = html.match(H1_TAG);
  if (h1) return stripTags(h1[1]);
  const h2 = html.match(H2_TAG);
  if (h2) return stripTags(h2[1]);
  return '';
}

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

function extractDataScreenSections(html) {
  // Returns array of { screen_id, anchor, title } for top-level
  // <section data-screen="..."> elements. Empty if none found.
  const out = [];
  const seen = new Set();
  SECTION_OPEN.lastIndex = 0;
  let m;
  while ((m = SECTION_OPEN.exec(html)) !== null) {
    const attrs = m[1] || '';
    const ds = attrs.match(ATTR_DATA_SCREEN);
    if (!ds) continue;
    const id = ds[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const closeIdx = findSectionClose(html, m.index + m[0].length);
    const inner = closeIdx > 0 ? html.slice(m.index + m[0].length, closeIdx) : '';
    const h = inner.match(H2_TAG) || inner.match(H1_TAG);
    out.push({
      screen_id: id,
      anchor: '#' + id,
      title: h ? stripTags(h[1]) : id,
    });
  }
  return out;
}

function extractScreens(html, sourceFile) {
  // Try section-level first (advanced); fall back to file-level (default).
  const sections = extractDataScreenSections(html);
  if (sections.length > 0) {
    const { device } = deviceAndIdFromFilename(sourceFile);
    return sections.map(s => ({
      ...s,
      device,
      source_file: sourceFile,
    }));
  }
  const { device, screen_id } = deviceAndIdFromFilename(sourceFile);
  const title = titleFromHtml(html) || screen_id;
  return [{
    screen_id,
    device,
    source_file: sourceFile,
    anchor: '',
    title,
  }];
}

module.exports = { extractScreens, deviceAndIdFromFilename, titleFromHtml };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node extract-screens.js <wireframe.html>');
    process.exit(64);
  }
  const html = fs.readFileSync(file, 'utf8');
  console.log(JSON.stringify(extractScreens(html, path.basename(file)), null, 2));
}
