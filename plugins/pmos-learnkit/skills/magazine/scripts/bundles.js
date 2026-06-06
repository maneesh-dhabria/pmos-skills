#!/usr/bin/env node
'use strict';
// magazine bundles — list / resolve / validate-data.
// Zero external deps. Reads the shipped catalog + bundle data under ../data/.
//
//   node bundles.js list [--json]
//   node bundles.js resolve <id> [--medium newsletter|podcast]
//   node bundles.js validate-data
//
// Exit codes: 0 ok · 1 data invalid (validate-data) · 2 usage · 3 unknown id ·
//             4 ambiguous id (needs --medium).

const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const BUNDLES_DIR = path.join(DATA, 'bundles');
const MANIFEST = path.join(BUNDLES_DIR, 'bundles.yaml');
const CATALOG = path.join(DATA, 'catalog');

function die(code, msg) { process.stderr.write(msg + '\n'); process.exit(code); }
function mediumDir(medium) { return medium === 'newsletter' ? 'newsletters' : 'podcasts'; }

// --- tiny YAML reader for the flat bundles.yaml shape (no external dep) ---
function parseManifest() {
  if (!fs.existsSync(MANIFEST)) die(1, `bundles.yaml not found at ${MANIFEST}`);
  const lines = fs.readFileSync(MANIFEST, 'utf8').split(/\r?\n/);
  const out = { version: null, generated_at: null, bundles: [] };
  let cur = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    let m;
    if ((m = line.match(/^version:\s*(.+)$/))) { out.version = coerce(unq(m[1])); continue; }
    if ((m = line.match(/^generated_at:\s*(.+)$/))) { out.generated_at = unq(m[1]); continue; }
    if (/^bundles:\s*$/.test(line)) continue;
    if ((m = line.match(/^\s*-\s*id:\s*(.+)$/))) { cur = { id: unq(m[1]) }; out.bundles.push(cur); continue; }
    if (cur && (m = line.match(/^\s+([a-z_]+):\s*(.+)$/))) { cur[m[1]] = coerce(unq(m[2])); }
  }
  return out;
}
function unq(s) {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).replace(/\\"/g, '"');
  }
  return s;
}
function coerce(s) { return /^-?\d+$/.test(s) ? parseInt(s, 10) : s; }

// --- OPML leaf parse (regex; matches the shipped writer's format) ---
function parseOpml(file) {
  const xml = fs.readFileSync(file, 'utf8');
  const feeds = [];
  const re = /<outline\b([^>]*?)\/>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const attrs = m[1];
    const url = attr(attrs, 'xmlUrl');
    if (!url) continue; // folder outlines have no xmlUrl
    feeds.push({ name: xunesc(attr(attrs, 'title') || ''), url: xunesc(url),
                 text: xunesc(attr(attrs, 'text') || '') });
  }
  return feeds;
}
function attr(s, name) {
  const m = s.match(new RegExp(name + '="([^"]*)"'));
  return m ? m[1] : null;
}
function xunesc(s) {
  return s.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
}

function findBundle(man, id, medium) {
  const hits = man.bundles.filter(b => b.id === id && (!medium || b.medium === medium));
  if (hits.length === 0) {
    const ids = [...new Set(man.bundles.map(b => `${b.id} (${b.medium})`))];
    die(3, `unknown bundle id: "${id}"\nvalid bundles:\n  ${ids.join('\n  ')}`);
  }
  if (hits.length > 1) {
    die(4, `ambiguous bundle id "${id}" — present in multiple media. Pass --medium newsletter|podcast.`);
  }
  return hits[0];
}

function cmdList(json) {
  const man = parseManifest();
  if (json) { process.stdout.write(JSON.stringify(man.bundles, null, 2) + '\n'); return; }
  for (const medium of ['newsletter', 'podcast']) {
    const group = man.bundles.filter(b => b.medium === medium);
    if (!group.length) continue;
    process.stdout.write(`\n${medium === 'newsletter' ? 'Newsletters' : 'Podcasts'}:\n`);
    for (const b of group) {
      process.stdout.write(`  ${b.id.padEnd(20)} ${String(b.count).padStart(3)} feeds  ${b.title}\n`);
      process.stdout.write(`  ${''.padEnd(20)}      ${b.description}\n`);
    }
  }
  process.stdout.write('\nImport one with:  /magazine add --bundle <id> [--medium newsletter|podcast]\n');
}

function cmdResolve(id, medium) {
  const man = parseManifest();
  const b = findBundle(man, id, medium);
  const file = path.join(BUNDLES_DIR, b.file);
  if (!fs.existsSync(file)) die(1, `bundle file missing: ${b.file}`);
  const feeds = parseOpml(file).map(f => ({
    name: f.name, host: f.text.includes(' — ') ? f.text.split(' — ').slice(1).join(' — ') : '',
    url: f.url, type: b.medium,
  }));
  process.stdout.write(JSON.stringify(feeds, null, 2) + '\n');
}

function catalogUrls(medium) {
  const file = path.join(CATALOG, medium === 'newsletter' ? 'pm-newsletters.tsv' : 'pm-podcasts.tsv');
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  const urls = new Set();
  for (let i = 1; i < lines.length; i++) { const f = lines[i].split('\t'); if (f[2]) urls.add(f[2]); }
  return urls;
}

function cmdValidate() {
  const man = parseManifest();
  const errs = [];
  if (man.version !== 1) errs.push(`bundles.yaml version is ${man.version}, expected 1`);
  const seen = new Set();
  const catUrls = { newsletter: catalogUrls('newsletter'), podcast: catalogUrls('podcast') };
  for (const b of man.bundles) {
    const key = `${b.medium}:${b.id}`;
    if (seen.has(key)) errs.push(`duplicate bundle id within medium: ${key}`);
    seen.add(key);
    if (!['newsletter', 'podcast'].includes(b.medium)) errs.push(`${key}: bad medium`);
    const file = path.join(BUNDLES_DIR, b.file);
    if (!fs.existsSync(file)) { errs.push(`${key}: file missing ${b.file}`); continue; }
    let feeds;
    try { feeds = parseOpml(file); } catch (e) { errs.push(`${key}: OPML parse error ${e.message}`); continue; }
    if (feeds.length !== b.count) errs.push(`${key}: count ${b.count} != ${feeds.length} outlines`);
    if (feeds.length === 0) errs.push(`${key}: zero feeds`);
    for (const f of feeds) {
      if (!catUrls[b.medium].has(f.url)) errs.push(`${key}: url not in ${b.medium} catalog: ${f.url}`);
    }
  }
  if (errs.length) die(1, 'validate-data FAILED:\n  ' + errs.join('\n  '));
  process.stdout.write(`validate-data OK — ${man.bundles.length} bundles, all feeds traced to catalog.\n`);
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const flag = (n) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : null; };
  switch (cmd) {
    case 'list': return cmdList(rest.includes('--json'));
    case 'resolve': {
      const id = rest.find(a => !a.startsWith('--') && a !== flag('--medium'));
      if (!id) die(2, 'usage: bundles.js resolve <id> [--medium newsletter|podcast]');
      return cmdResolve(id, flag('--medium'));
    }
    case 'validate-data': return cmdValidate();
    default:
      die(2, 'usage: bundles.js <list [--json] | resolve <id> [--medium m] | validate-data>');
  }
}
main();
