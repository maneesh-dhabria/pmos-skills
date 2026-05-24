// build-canvas.js — aggregate per-device wireframe HTML files + DESIGN.md
// journeys into canvas.html + canvas.json.
//
// Usage:
//   node build-canvas.js <wireframes-dir> [<design-md-path>]
//
// - <wireframes-dir>: directory containing per-device *.html files (e.g.
//   docs/pmos/features/<date>_<slug>/wireframes/).
// - <design-md-path>: optional. If omitted or empty string, no arrows are
//   derived; canvas.html still emits with screens only.
//
// Outputs (written to <wireframes-dir>):
//   - canvas.html  (single-file viewer; inlines canvas.json as <script type="application/json">)
//   - canvas.json  (canonical layout + arrows; preserved across re-runs per FR-4)
//
// Zero npm deps. Pure regex parsing. Safe under file:// viewing.

'use strict';
const fs = require('fs');
const path = require('path');
const { extractScreens } = require('./extract-screens');

const SCREEN_WIDTH = { 'desktop-web': 1280, 'mobile-web': 390, 'tablet-web': 834 };
const SCREEN_HEIGHT = { 'desktop-web': 800, 'mobile-web': 844, 'tablet-web': 1112 };
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 800;
const GUTTER_X = 200;
const GUTTER_Y = 400;

// File names that are NOT per-device wireframes (skip during scan).
const EXCLUDE = new Set(['index.html', 'canvas.html']);

function deviceFromFilename(filename) {
  const base = filename.replace(/\.html$/i, '');
  // Try exact known device match.
  if (SCREEN_WIDTH[base]) return base;
  // Tolerate suffix patterns like "01_desktop-web.html" or "desktop-web_v2.html".
  for (const dev of Object.keys(SCREEN_WIDTH)) {
    if (base.includes(dev)) return dev;
  }
  return base; // fallback: treat the basename as the device label
}

function loadJourneys(designMdPath) {
  // Returns array of { journey_id, name, screen_ids: [<id>, ...] }.
  // Tolerant parser — accepts both `## Journey:` and `### Journey N — name`
  // headings under a "User journeys" h2 (per the existing /wireframes
  // convention). Screen references are extracted from bullet items by
  // matching the leading `#<screen-id>` link anchor or backticked `<id>`.
  if (!designMdPath) return [];
  let txt;
  try { txt = fs.readFileSync(designMdPath, 'utf8'); }
  catch (e) { return []; }
  const journeys = [];
  const lines = txt.split('\n');
  let current = null;
  const journeyHeading = /^#{2,3}\s+(?:Journey[:\s\-]+)?(.+?)\s*$/;
  const screenRef = /(?:\[[^\]]*\]\(#([a-z0-9_-]+)\))|(?:`([a-z0-9_-]+)`)/gi;
  let inJourneysSection = false;
  for (const line of lines) {
    if (/^##\s+User journeys/i.test(line)) { inJourneysSection = true; continue; }
    if (inJourneysSection && /^##\s+(?!#)/.test(line) && !/journey/i.test(line)) {
      inJourneysSection = false;
      if (current) journeys.push(current);
      current = null;
      continue;
    }
    if (!inJourneysSection) continue;
    const h = line.match(journeyHeading);
    if (h && /journey/i.test(line)) {
      if (current) journeys.push(current);
      const slug = h[1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      current = { journey_id: slug, name: h[1].trim(), screen_ids: [] };
      continue;
    }
    if (current) {
      let m;
      screenRef.lastIndex = 0;
      while ((m = screenRef.exec(line)) !== null) {
        const id = m[1] || m[2];
        if (id && !current.screen_ids.includes(id)) current.screen_ids.push(id);
      }
    }
  }
  if (current) journeys.push(current);
  return journeys;
}

function autoLayout(allScreens, journeys) {
  // Group screens by (journey, screen_id). Each journey row lays out
  // left-to-right. Devices for the same screen stack vertically within a
  // column. Orphan screens (no journey) land in a final row.
  const byScreenId = new Map();
  for (const s of allScreens) {
    if (!byScreenId.has(s.screen_id)) byScreenId.set(s.screen_id, []);
    byScreenId.get(s.screen_id).push(s);
  }
  const positioned = new Map(); // composite_id -> {x, y}
  let rowY = 0;
  const usedScreenIds = new Set();
  for (const j of journeys) {
    let colX = 0;
    let maxColH = 0;
    for (const screenId of j.screen_ids) {
      const variants = byScreenId.get(screenId) || [];
      if (variants.length === 0) continue;
      usedScreenIds.add(screenId);
      let stackY = rowY;
      let colW = 0;
      for (const v of variants) {
        const w = SCREEN_WIDTH[v.device] || DEFAULT_WIDTH;
        const h = SCREEN_HEIGHT[v.device] || DEFAULT_HEIGHT;
        positioned.set(compositeId(v), { x: colX, y: stackY, w, h });
        stackY += h + 80;
        colW = Math.max(colW, w);
      }
      colX += colW + GUTTER_X;
      maxColH = Math.max(maxColH, stackY - rowY);
    }
    rowY += maxColH + GUTTER_Y;
  }
  // Orphans row.
  let orphanX = 0;
  for (const [screenId, variants] of byScreenId.entries()) {
    if (usedScreenIds.has(screenId)) continue;
    let stackY = rowY;
    let colW = 0;
    for (const v of variants) {
      const w = SCREEN_WIDTH[v.device] || DEFAULT_WIDTH;
      const h = SCREEN_HEIGHT[v.device] || DEFAULT_HEIGHT;
      positioned.set(compositeId(v), { x: orphanX, y: stackY, w, h });
      stackY += h + 80;
      colW = Math.max(colW, w);
    }
    orphanX += colW + GUTTER_X;
  }
  return positioned;
}

function compositeId(s) { return s.screen_id + '-' + s.device; }

function deriveArrows(journeys, allScreens) {
  // For each journey, emit one arrow per consecutive screen pair, for each
  // device that has both screens.
  const byScreenAndDevice = new Map();
  for (const s of allScreens) byScreenAndDevice.set(s.screen_id + '|' + s.device, s);
  const devicesPresent = new Set(allScreens.map(s => s.device));
  const arrows = [];
  for (const j of journeys) {
    for (let i = 0; i < j.screen_ids.length - 1; i++) {
      const a = j.screen_ids[i];
      const b = j.screen_ids[i + 1];
      for (const device of devicesPresent) {
        if (byScreenAndDevice.has(a + '|' + device) && byScreenAndDevice.has(b + '|' + device)) {
          arrows.push({
            from: a + '-' + device,
            to: b + '-' + device,
            label: '',
            journey: j.journey_id,
          });
        }
      }
    }
  }
  return arrows;
}

function mergeWithExisting(newScreens, newArrows, layoutMap, existing) {
  // FR-4: preserve user-curated positions; add new screens at the bottom in
  // an "added" row; drop screens no longer present.
  const compositeToScreen = new Map();
  for (const s of newScreens) compositeToScreen.set(compositeId(s), s);
  const out = { screens: [], arrows: newArrows };
  const existingPositions = new Map();
  if (existing && Array.isArray(existing.screens)) {
    for (const s of existing.screens) existingPositions.set(s.id, s);
  }
  let maxY = 0;
  for (const s of newScreens) {
    const id = compositeId(s);
    const prior = existingPositions.get(id);
    const auto = layoutMap.get(id) || { x: 0, y: 0, w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT };
    const pos = prior
      ? { x: prior.x, y: prior.y, w: prior.w || auto.w, h: prior.h || auto.h }
      : auto;
    out.screens.push({
      id,
      screen_id: s.screen_id,
      device: s.device,
      source_file: s.source_file,
      anchor: s.anchor,
      title: s.title,
      journey: s.journey || null,
      x: pos.x, y: pos.y, w: pos.w, h: pos.h,
    });
    maxY = Math.max(maxY, pos.y + pos.h);
  }
  // No-op for arrows: always regenerated from DESIGN.md (canonical source).
  return out;
}

function emitCanvasHtml(canvasData, templatePath, pluginVersion) {
  let tpl = fs.readFileSync(templatePath, 'utf8');
  tpl = tpl.replace(/\{\{canvas_json\}\}/g, JSON.stringify(canvasData));
  tpl = tpl.replace(/\{\{plugin_version\}\}/g, pluginVersion);
  tpl = tpl.replace(/\{\{generated_at\}\}/g, canvasData.generated_at);
  return tpl;
}

function readPluginVersion() {
  try {
    const root = path.resolve(__dirname, '..', '..', '..', '..', '..');
    const pj = path.join(root, '.claude-plugin', 'plugin.json');
    return JSON.parse(fs.readFileSync(pj, 'utf8')).version || '0.0.0';
  } catch (e) { return '0.0.0'; }
}

function main() {
  const wfDir = process.argv[2];
  const designMd = process.argv[3] || '';
  if (!wfDir) {
    console.error('usage: node build-canvas.js <wireframes-dir> [<design-md-path>]');
    process.exit(64);
  }
  if (!fs.existsSync(wfDir) || !fs.statSync(wfDir).isDirectory()) {
    console.error('canvas-aggregator: ' + wfDir + ' is not a directory; skipping.');
    process.exit(0); // soft-fail: don't break /wireframes
  }

  // 1. Discover per-device files.
  const files = fs.readdirSync(wfDir)
    .filter(f => f.toLowerCase().endsWith('.html') && !EXCLUDE.has(f.toLowerCase()));
  if (files.length === 0) {
    console.error('canvas-aggregator: no per-device wireframe HTML found in ' + wfDir + '; skipping.');
    process.exit(0);
  }

  // 2. Extract screens from each file.
  const allScreens = [];
  for (const f of files) {
    const html = fs.readFileSync(path.join(wfDir, f), 'utf8');
    const device = deviceFromFilename(f);
    const screens = extractScreens(html, f).map(s => ({ ...s, device }));
    for (const s of screens) allScreens.push(s);
  }
  if (allScreens.length === 0) {
    console.error('canvas-aggregator: no <section data-screen> or <section id> elements found in any wireframe; skipping.');
    process.exit(0);
  }

  // 3. Load DESIGN.md journeys (best-effort).
  const journeys = loadJourneys(designMd);
  if (designMd && journeys.length === 0) {
    console.error('canvas-aggregator: DESIGN.md present at ' + designMd + ' but no journeys parsed; arrows will be empty.');
  }

  // 4. Assign journey labels to screens.
  const screenToJourney = new Map();
  for (const j of journeys) {
    for (const id of j.screen_ids) {
      if (!screenToJourney.has(id)) screenToJourney.set(id, j.journey_id);
    }
  }
  for (const s of allScreens) s.journey = screenToJourney.get(s.screen_id) || null;

  // 5. Auto-layout + arrows.
  const layoutMap = autoLayout(allScreens, journeys);
  const arrows = deriveArrows(journeys, allScreens);

  // 6. Merge with existing canvas.json if present.
  const canvasJsonPath = path.join(wfDir, 'canvas.json');
  let existing = null;
  if (fs.existsSync(canvasJsonPath)) {
    try { existing = JSON.parse(fs.readFileSync(canvasJsonPath, 'utf8')); }
    catch (e) { console.error('canvas-aggregator: existing canvas.json is malformed; regenerating from scratch.'); }
  }
  const merged = mergeWithExisting(allScreens, arrows, layoutMap, existing);

  // 7. Assemble canonical canvas.json.
  const pluginVersion = readPluginVersion();
  const canvasData = {
    version: 1,
    generated_at: new Date().toISOString(),
    generator: 'pmos-toolkit/wireframes canvas-aggregator v' + pluginVersion,
    viewport: { default_zoom: 0.3, default_x: 0, default_y: 0 },
    screens: merged.screens,
    arrows: merged.arrows,
  };

  // 8. Write canvas.json + canvas.html.
  fs.writeFileSync(canvasJsonPath, JSON.stringify(canvasData, null, 2) + '\n');
  const templatePath = path.join(__dirname, 'canvas-template.html');
  const html = emitCanvasHtml(canvasData, templatePath, pluginVersion);
  fs.writeFileSync(path.join(wfDir, 'canvas.html'), html);

  console.log('canvas-aggregator: wrote ' + path.join(wfDir, 'canvas.html') + ' (' + merged.screens.length + ' screens, ' + merged.arrows.length + ' arrows)');
}

if (require.main === module) main();

module.exports = {
  extractScreens, loadJourneys, autoLayout, deriveArrows, mergeWithExisting,
};
