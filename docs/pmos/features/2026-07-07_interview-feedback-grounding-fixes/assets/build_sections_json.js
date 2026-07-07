#!/usr/bin/env node
// build_sections_json.js — emit conventions.md §10 sections.json from a live HTML artifact.
// Zero npm deps; node built-ins only. Mirrors chrome-strip.js's balanced-tag pattern.
//
// Usage:
//   node build_sections_json.js <input.html>        # reads file, writes JSON to stdout
//   cat input.html | node build_sections_json.js    # reads stdin
//
// Output schema (per conventions.md §10):
//   [{ "id": "...", "level": 2|3, "title": "...", "parent_id": "..."|null }, ...]
//
// Behaviour:
//   - Walks <h2 id="..."> and <h3 id="..."> in document order.
//   - Level-2 headings are document-level — parent_id is always null (the <h2> IS
//     the section anchor, even when wrapped in <section id="..."> with a matching id).
//   - Level-3 headings attach to the nearest enclosing <section id="..."> (if any);
//     null when h3 sits outside any section wrapper.
//   - title = inner text of the heading, with tags stripped + entities decoded
//     (minimal: &amp; &lt; &gt; &quot; &#39; &nbsp; &mdash; &ndash; &rarr;).

'use strict';
const fs = require('fs');

function readInput() {
  const arg = process.argv[2];
  if (arg) return fs.readFileSync(arg, 'utf8');
  return fs.readFileSync(0, 'utf8');
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&rarr;/g, '→')
    .replace(/&hellip;/g, '…');
}

function stripTags(s) {
  return decodeEntities(s.replace(/<[^>]+>/g, '')).trim();
}

function extractIdAttr(tagText) {
  const m = tagText.match(/\bid\s*=\s*"([^"]+)"/);
  return m ? m[1] : null;
}

// Walk the HTML scanning for three tag classes:
//   <section id="...">  / </section>  -> push/pop on a stack (latest section is parent_id)
//   <h2 id="..."> ... </h2>
//   <h3 id="..."> ... </h3>
function buildSections(html) {
  const out = [];
  const sectionStack = [];
  // Regex matches an opening section tag, a closing section tag, or an h2/h3 element with body.
  const re = /<section\b([^>]*)>|<\/section>|<(h[23])\b([^>]*)>([\s\S]*?)<\/\2>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[0].startsWith('</section>')) {
      sectionStack.pop();
      continue;
    }
    if (m[0].startsWith('<section')) {
      const id = extractIdAttr(m[1] || '');
      sectionStack.push(id);
      continue;
    }
    // heading match
    const level = m[2].toLowerCase() === 'h2' ? 2 : 3;
    const attrs = m[3] || '';
    const inner = m[4] || '';
    const id = extractIdAttr(attrs);
    if (!id) continue; // skip unidentified headings; FR-2 asserts elsewhere
    const title = stripTags(inner);
    let parent_id = null;
    if (level === 3 && sectionStack.length > 0) {
      parent_id = sectionStack[sectionStack.length - 1];
    }
    out.push({ id, level, title, parent_id });
  }
  return out;
}

const html = readInput();
const sections = buildSections(html);
process.stdout.write(JSON.stringify(sections, null, 2) + '\n');
