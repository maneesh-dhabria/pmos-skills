#!/usr/bin/env node
/*
 * ingest.mjs — deterministic figure-inventory extraction for /explainer-video.
 *
 * TEXT IS NOT EXTRACTED HERE. Per the epic design (grill 2026-06-13: "no bundled
 * PDF parser"), the skill's in-session distiller subagent reads source TEXT via
 * the host's native Read (incl. PDF `pages`) / WebFetch. This script does only
 * the deterministic, side-effect-free half: pull the figure inventory out of an
 * HTML / Markdown / pmos-artifact source (or a fetched web page), resolve
 * relative asset URLs against the page base, and filter out nav/tracking/spacer/
 * decorative images by size + role. Reference: ../reference/figure-inventory.md.
 *
 * PDF sources: a PDF cannot be parsed for embedded images without a PDF library
 * (which the design forbids bundling). For a `.pdf` source this script emits an
 * empty inventory annotated `{ pdf: true }` to stderr — the skill's Phase 2 then
 * sources PDF figures from the in-session visual reader (native Read renders the
 * pages), never from a bundled parser.
 *
 * Usage:
 *   node ingest.mjs <source>            # source = .md/.html/.txt/.pdf path OR http(s) URL OR pmos .html
 *        [--base <url>]                 # base URL for resolving relative srcs (default: derived)
 *        [--figures-out <path.json>]    # write inventory JSON here (default: stdout)
 *        [--html <path>]                # treat <source> label as the id base but read HTML from this file
 *                                       #   (used when WebFetch already saved the page locally)
 *   node ingest.mjs --selftest
 *
 * Output: a JSON array of { id, source_ref, kind:'svg'|'img', alt, width, height }.
 * Exit codes: 0 ok / 0 selftest pass · 1 selftest fail · 64 usage error.
 * Dependencies: node >= 18 built-ins only (fs, path, url). No network: a URL
 * source whose HTML was not pre-fetched (no --html) is reported usage-style so
 * the caller fetches via WebFetch first.
 */
'use strict';

import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve as pathResolve, dirname, extname } from 'node:path';

const DROP_RE = /(?:^|[^a-z])(nav|logo|icon|sprite|avatar|tracking|pixel|spacer|beacon|ad[-_]|banner)(?:[^a-z]|$)/i;

// Resolve a possibly-relative asset reference against a base (file dir or URL).
function resolveRef(ref, base) {
  if (!ref) return ref;
  if (/^(https?:|data:|file:)/i.test(ref)) return ref;
  if (!base) return ref;
  try {
    // URL base
    if (/^https?:\/\//i.test(base)) return new URL(ref, base).href;
  } catch { /* fall through */ }
  // filesystem base (a directory)
  if (ref.startsWith('/')) return ref;
  return pathResolve(base, ref);
}

// Decide whether an <img> is decorative/chrome and should be dropped.
// Conservative: unknown size is KEPT unless path/role matches the drop list.
function isDecorative({ src, cls, id, alt, role, width, height }) {
  const hay = [src, cls, id, alt].filter(Boolean).join(' ');
  if (DROP_RE.test(hay)) return true;
  if (role && role.toLowerCase() === 'presentation' && (!alt || (width && width < 200))) return true;
  if (width && height && (width < 200 || height < 100)) return true;
  if (/^data:/.test(src || '') && (src.length < 2048)) return true; // tiny inline spacer
  return false;
}

function attr(tag, name) {
  const m = tag.match(new RegExp(name + '\\s*=\\s*"([^"]*)"', 'i'))
        || tag.match(new RegExp(name + "\\s*=\\s*'([^']*)'", 'i'));
  return m ? m[1] : '';
}
function intAttr(tag, name) {
  const v = attr(tag, name);
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

// Parse <img> tags from an HTML string into raw figure candidates.
function imgsFromHtml(html, base) {
  const out = [];
  const re = /<img\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    out.push({
      kind: 'img',
      src: resolveRef(attr(tag, 'src'), base),
      alt: attr(tag, 'alt'),
      cls: attr(tag, 'class'),
      id: attr(tag, 'id'),
      role: attr(tag, 'role'),
      width: intAttr(tag, 'width'),
      height: intAttr(tag, 'height'),
    });
  }
  return out;
}

// Parse inline <svg> blocks (pmos owned figures) — keep an anchor reference.
function svgsFromHtml(html) {
  const out = [];
  const re = /<svg\b[^>]*>[\s\S]*?<\/svg>/gi;
  let m;
  let i = 0;
  while ((m = re.exec(html))) {
    const block = m[0];
    const open = block.match(/<svg\b[^>]*>/i)[0];
    const anchor = attr(open, 'data-anchor') || attr(open, 'id') || `svg-${i}`;
    out.push({ kind: 'svg', src: anchor, alt: attr(open, 'aria-label'),
               cls: attr(open, 'class'), id: attr(open, 'id'), role: '',
               width: 0, height: 0 });
    i++;
  }
  return out;
}

// Markdown ![alt](src) images.
function imgsFromMarkdown(md, base) {
  const out = [];
  const re = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let m;
  while ((m = re.exec(md))) {
    out.push({ kind: 'img', alt: m[1], src: resolveRef(m[2], base),
               cls: '', id: '', role: '', width: 0, height: 0 });
  }
  return out;
}

// Build the final inventory: filter, assign stable ids, project to the schema.
function buildInventory(candidates) {
  const kept = candidates.filter((c) => !isDecorative(c));
  return kept.map((c, i) => ({
    id: `fig_${i + 1}`,
    source_ref: c.src,
    kind: c.kind,
    alt: c.alt || '',
    width: c.width || 0,
    height: c.height || 0,
  }));
}

function inventoryFromSource(source, content, base) {
  const ext = extname(source).toLowerCase();
  if (ext === '.md' || ext === '.markdown') return buildInventory(imgsFromMarkdown(content, base));
  // html / pmos-artifact / fetched web page
  return buildInventory([...svgsFromHtml(content), ...imgsFromHtml(content, base)]);
}

function selftest() {
  const fails = [];
  const ok = (c, m) => { if (!c) fails.push(m); };

  // Relative URL resolution against a page base.
  ok(resolveRef('img/a.png', 'https://x.com/posts/') === 'https://x.com/posts/img/a.png', 'url base resolve');
  ok(resolveRef('https://y.com/b.png', 'https://x.com/') === 'https://y.com/b.png', 'absolute url untouched');

  // Decorative filter: drops a tracking pixel, a nav logo; keeps a real figure.
  ok(isDecorative({ src: 'px.gif', width: 1, height: 1 }) === true, 'drop 1x1 pixel');
  ok(isDecorative({ src: '/assets/logo.svg', alt: 'logo' }) === true, 'drop logo by path');
  ok(isDecorative({ src: 'tracking-beacon.png' }) === true, 'drop beacon by name');
  ok(isDecorative({ src: 'figure2.png', width: 1200, height: 740, alt: 'Architecture' }) === false, 'keep real figure');
  ok(isDecorative({ src: 'chart.png' }) === false, 'keep unknown-size content image');

  // HTML <img> extraction + id assignment + filter.
  const html = `<p><img src="hero.png" width="1200" height="600" alt="System overview"></p>
                <img src="spacer.gif" width="1" height="1">
                <img src="ad-banner.jpg" alt="ad-banner">`;
  const inv = inventoryFromSource('page.html', html, 'https://ex.com/');
  ok(inv.length === 1, `html: exactly 1 kept (got ${inv.length})`);
  ok(inv[0].id === 'fig_1' && inv[0].source_ref === 'https://ex.com/hero.png', 'html: id + resolved src');

  // Markdown extraction. `icon.svg` is dropped (path matches the decorative
  // drop list); the real diagram survives with a filesystem-resolved src.
  const md = `Intro\n\n![A real diagram](diagrams/flow.png)\n\n![](icon.svg)`;
  const minv = inventoryFromSource('doc.md', md, '/tmp/docs');
  ok(minv.length === 1, `md: 1 img kept, icon dropped (got ${minv.length})`);
  ok(minv[0].source_ref === '/tmp/docs/diagrams/flow.png', 'md: filesystem base resolve');

  // Inline SVG (pmos figure) → anchor source_ref.
  const psvg = `<figure><svg data-anchor="arch-diagram" aria-label="Arch"><rect/></svg></figure>`;
  const sinv = inventoryFromSource('artifact.html', psvg, null);
  ok(sinv.length === 1 && sinv[0].kind === 'svg' && sinv[0].source_ref === 'arch-diagram', 'svg anchor');

  if (fails.length) { process.stderr.write('SELFTEST FAIL:\n  ' + fails.join('\n  ') + '\n'); process.exit(1); }
  process.stderr.write('SELFTEST PASS: ingest.mjs figure extraction + filter + resolve hold.\n');
  process.exit(0);
}

function main(argv) {
  const args = argv.slice(2);
  if (args.includes('--selftest')) return selftest();

  let source = null, base = null, figuresOut = null, htmlFile = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--base') base = args[++i];
    else if (a === '--figures-out') figuresOut = args[++i];
    else if (a === '--html') htmlFile = args[++i];
    else if (a.startsWith('--')) { process.stderr.write(`unknown flag: ${a}\n`); process.exit(64); }
    else if (!source) source = a;
  }
  if (!source) { process.stderr.write('usage: ingest.mjs <source> [--base <url>] [--figures-out <path>] [--html <file>] | --selftest\n'); process.exit(64); }

  const ext = extname(source).toLowerCase();
  if (ext === '.pdf') {
    process.stderr.write('ingest: PDF source — figures come from the in-session visual reader, not a bundled parser. Empty inventory.\n');
    const empty = [];
    if (figuresOut) { writeJson(figuresOut, empty); } else { process.stdout.write(JSON.stringify(empty) + '\n'); }
    return;
  }

  let content, resolvedBase = base;
  if (/^https?:\/\//i.test(source)) {
    if (!htmlFile) {
      process.stderr.write(`ingest: URL source needs the fetched HTML. Re-run with --html <file> after WebFetch saves the page (text is read in-session, not fetched here).\n`);
      process.exit(64);
    }
    content = readFileSync(htmlFile, 'utf8');
    resolvedBase = base || source;
  } else {
    content = readFileSync(source, 'utf8');
    resolvedBase = base || (ext === '.md' || ext === '.markdown' || ext === '.html' || ext === '.txt' ? dirname(pathResolve(source)) : null);
  }

  const inventory = inventoryFromSource(source, content, resolvedBase);
  if (figuresOut) { writeJson(figuresOut, inventory); process.stderr.write(`ingest: ${inventory.length} figure(s) → ${figuresOut}\n`); }
  else process.stdout.write(JSON.stringify(inventory, null, 2) + '\n');
}

function writeJson(p, obj) {
  // atomic-ish: write temp then rename
  const tmp = p + '.tmp';
  writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n');
  renameSync(tmp, p);
}

main(process.argv);
