#!/usr/bin/env node
// fetch-feed.js — discover one feed's items (Stage A, deterministic, no LLM).
// Zero npm dependencies (node built-ins only). Requires: node >= 18 (global fetch).
//
// Fetches a feed URL (or reads a local file with --file), parses RSS 2.0 / Atom,
// and emits a JSON array of windowed items on stdout:
//   [{ guid, link, title, published (ISO), enclosure?, description, body? }]
//
// A single feed failing (timeout, malformed XML, network) exits non-zero with a
// one-line reason on stderr and emits "[]" — the caller skips + reports it and
// never aborts the whole issue (FR-7).
//
// Usage:
//   node fetch-feed.js <url> [--since <ISO>] [--max <N>] [--timeout-ms <N>]
//   node fetch-feed.js --file <path.xml> [--since <ISO>] [--max <N>]
//   node fetch-feed.js --selftest
'use strict';

const fs = require('fs');
const path = require('path');

// Minimal, dependency-free tag extractor. Good enough for well-formed RSS/Atom
// item blocks; not a general XML parser. CDATA is unwrapped.
function tagText(block, tag) {
  const re = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  const m = block.match(re);
  if (!m) return null;
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

function tagAttr(block, tag, attr) {
  const re = new RegExp('<' + tag + '\\b[^>]*\\b' + attr + '="([^"]*)"', 'i');
  const m = block.match(re);
  return m ? m[1] : null;
}

function toISO(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Decode the XML entities feeds commonly leave in URLs (especially `&amp;` in
// query strings). Without this, a link/enclosure like `…?a=1&amp;b=2` reaches
// curl as a literal `&amp;` and corrupts the query params (FR-P5).
function decodeEntities(s) {
  if (s == null) return s;
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => String.fromCodePoint(parseInt(h, 16)));
}

function parseItems(xml) {
  const blocks = [];
  const itemRe = /<(item|entry)\b[\s\S]*?<\/\1>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) blocks.push(m[0]);

  return blocks.map((b) => {
    const isAtom = /^<entry\b/i.test(b);
    const link = decodeEntities(isAtom ? tagAttr(b, 'link', 'href') || tagText(b, 'link') : tagText(b, 'link'));
    const guid = decodeEntities(tagText(b, 'guid') || tagText(b, 'id') || link);
    const published = toISO(tagText(b, 'pubDate') || tagText(b, 'published') || tagText(b, 'updated'));
    const enclosure = decodeEntities(tagAttr(b, 'enclosure', 'url'));
    const body = tagText(b, 'content:encoded') || tagText(b, 'content');
    return {
      guid,
      link,
      title: tagText(b, 'title'),
      published,
      enclosure: enclosure || undefined,
      description: tagText(b, 'description') || tagText(b, 'summary') || '',
      body: body || undefined,
    };
  });
}

function windowItems(items, sinceISO, max) {
  let out = items.filter((it) => it.guid && it.link);
  if (sinceISO) out = out.filter((it) => !it.published || it.published > sinceISO);
  out.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
  if (max && out.length > max) out = out.slice(0, max);
  return out;
}

async function fetchXml(url, timeoutMs) {
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
  const fixture = path.join(__dirname, '..', 'tests', 'fixtures', 'sample-feed.xml');
  const xml = fs.readFileSync(fixture, 'utf8');
  const items = parseItems(xml);
  let ok = true;
  const assert = (c, m) => { if (!c) { ok = false; console.error('FAIL:', m); } };

  assert(items.length === 4, 'parsed 4 raw items, got ' + items.length);
  const windowed = windowItems(items, '2026-05-01T00:00:00.000Z', 10);
  assert(windowed.length === 3, 'windowing dropped the 2019 item, got ' + windowed.length);
  assert(windowed[0].guid === 'post-0001', 'newest first');
  assert(windowed[0].body && windowed[0].body.includes('full body'), 'content:encoded body captured');
  const capped = windowItems(items, null, 1);
  assert(capped.length === 1, '--max caps the set');

  // Regression (FR-P5): XML entities in URLs are decoded, not passed through.
  const pod = items.find((it) => it.guid === 'substack:post:198591907');
  assert(pod, 'podcast fixture item present');
  assert(pod.link === 'https://example.com/ep?id=42&utm=rss', 'link &amp; decoded: ' + pod.link);
  assert(pod.enclosure && pod.enclosure.includes('&awCollectionId=') && !pod.enclosure.includes('&amp;'),
    'enclosure &amp; decoded: ' + pod.enclosure);

  console.log(ok ? 'fetch-feed.js --selftest: PASS' : 'fetch-feed.js --selftest: FAIL');
  process.exit(ok ? 0 : 1);
}

module.exports = { parseItems, windowItems };

if (require.main === module) {
  (async () => {
    const argv = process.argv.slice(2);
    if (argv.includes('--selftest')) return selftest();

    const since = arg('--since', null);
    const max = parseInt(arg('--max', '0'), 10) || 0;
    const timeoutMs = parseInt(arg('--timeout-ms', '15000'), 10);
    const file = arg('--file', null);
    const url = argv.find((a) => !a.startsWith('--') && a !== since && a !== file && String(max) !== a);

    try {
      const xml = file ? fs.readFileSync(file, 'utf8') : await fetchXml(url, timeoutMs);
      const items = windowItems(parseItems(xml), since, max);
      process.stdout.write(JSON.stringify(items, null, 2) + '\n');
    } catch (e) {
      process.stderr.write('fetch-feed: ' + (file || url) + ': ' + e.message + '\n');
      process.stdout.write('[]\n');
      process.exit(1);
    }
  })();
}
