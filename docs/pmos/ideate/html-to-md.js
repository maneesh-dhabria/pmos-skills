#!/usr/bin/env node
// html-to-md.js — CLI shim using vendored turndown + GFM plugin (FR-12.1).
// Reads HTML from argv[2] (or /dev/stdin), runs turndown, emits MD to stdout.
// No npm install. Uses vm to evaluate the vendored UMD/IIFE bundles.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HERE = __dirname;
const TURNDOWN_PATH = path.join(HERE, 'turndown.umd.js');
const GFM_PATH      = path.join(HERE, 'turndown-plugin-gfm.umd.js');

function loadBundles() {
  // The vendored bundles are browser-targeted (rely on global `document`/`DOMParser`).
  // Provide a DOM via `jsdom` so the same bundles run unchanged in Node.
  // jsdom is not vendored (5MB+ multi-file). Probe NODE_PATH first, then walk
  // upwards looking for a node_modules/jsdom checkout — keeps this CLI useful
  // both inside repos that already depend on jsdom and via a one-off install.
  let JSDOM;
  try { JSDOM = require('jsdom').JSDOM; }
  catch (_) {
    throw new Error([
      'jsdom is required to convert HTML→MD in Node.',
      'Install once (no project change needed): `npm install --no-save jsdom@^24` and re-run',
      'with NODE_PATH=$(npm root) html-to-md.js <input.html>.',
      'Or set HTML_TO_MD_JSDOM_PATH=/abs/path/to/jsdom to point at an existing install.',
    ].join('\n  '));
  }

  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const ctx = vm.createContext({
    window: dom.window,
    document: dom.window.document,
    DOMParser: dom.window.DOMParser,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    NodeList: dom.window.NodeList,
    XMLSerializer: dom.window.XMLSerializer,
  });
  for (const file of [TURNDOWN_PATH, GFM_PATH]) {
    const src = fs.readFileSync(file, 'utf8');
    vm.runInContext(src, ctx, { filename: path.basename(file) });
  }
  if (!ctx.TurndownService) throw new Error('TurndownService global not exposed by turndown.umd.js');
  if (!ctx.turndownPluginGfm) throw new Error('turndownPluginGfm global not exposed by turndown-plugin-gfm.umd.js');
  return { TurndownService: ctx.TurndownService, gfm: ctx.turndownPluginGfm };
}

// Honor HTML_TO_MD_JSDOM_PATH for an existing checkout (test runner sets this
// to a /tmp bootstrap; users can point it at a global install).
if (process.env.HTML_TO_MD_JSDOM_PATH) {
  module.paths.unshift(process.env.HTML_TO_MD_JSDOM_PATH);
}

function readInput(arg) {
  if (!arg || arg === '/dev/stdin' || arg === '-') return fs.readFileSync(0, 'utf8');
  return fs.readFileSync(arg, 'utf8');
}

function htmlToMd(html, { TurndownService, gfm }) {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    fence: '```',
  });
  if (gfm && typeof gfm.gfm === 'function') td.use(gfm.gfm);
  return td.turndown(html);
}

function main() {
  const arg = process.argv[2];
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    process.stderr.write('Usage: html-to-md.js <input.html|->\n');
    process.exit(0);
  }
  let bundles;
  try { bundles = loadBundles(); }
  catch (e) { process.stderr.write(`html-to-md: failed to load vendored bundles: ${e.message}\n`); process.exit(70); }

  let html;
  try { html = readInput(arg); }
  catch (e) { process.stderr.write(`html-to-md: failed to read input: ${e.message}\n`); process.exit(66); }

  let md;
  try { md = htmlToMd(html, bundles); }
  catch (e) { process.stderr.write(`html-to-md: turndown conversion failed: ${e.message}\n`); process.exit(70); }

  process.stdout.write(md.endsWith('\n') ? md : md + '\n');
}

if (require.main === module) main();
