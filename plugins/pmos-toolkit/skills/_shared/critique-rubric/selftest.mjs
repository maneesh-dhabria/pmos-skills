#!/usr/bin/env node
// Internal-consistency self-check for _shared/critique-rubric/ (story 260624-fbd).
//
// Asserts the rubric substrate is mutually consistent — the single deterministic gate
// (skill-patterns §H: a script does the counting, never an LLM) that proves axes.md,
// heuristics.md, doc-types.md, and the vendored corpus-samples agree:
//
//   1. axes.md declares exactly the fixed 10 axes, in the canonical order.
//   2. every heuristic handle cited by an axes.md check exists in heuristics.md (no dangling ref).
//   3. the doc-types.md applicability map covers every axis; every cell is E / N/A / C.
//   4. the doc-types.md findings-schema axis enum equals the axes.md axis set + order
//      (axes ⊆ map ⊆ schema enum — Inv-1, one home, guarded against drift).
//   5. every corpus-samples/*.json parses against pmos-critique-findings/v1 and uses only
//      valid axes / verdicts (E-schema, E-axes-complete, E-applicable-consistency, E-quote-len,
//      E-weakest-ranked, E-opening — the design §4.4 deterministic checks, on the fixtures).
//   6. Inv-6 dangling-cite guard: nothing under plugins/ or docs/ references `critique-rubric`
//      except this substrate dir and this epic's feature folder (no /artifact cite ships).
//
// Exit 0 (all pass) / 1 (≥1 fail, listed) / 2 (script error). Never silently passes.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, basename } from 'node:path';
import { execSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
// HERE = <root>/plugins/pmos-toolkit/skills/_shared/critique-rubric → 5 up = repo root.
const ROOT = resolve(HERE, '../../../../../');
const CORPUS_DIR = join(ROOT, 'docs/pmos/features/2026-06-24_artifact-critique/corpus-samples');

const CANONICAL_AXES = ['Customer', 'Solution', 'Scope', 'Metrics', 'Pricing', 'Strategy', 'GTM', 'Stage', 'AI', 'Risks'];
const VERDICTS = new Set(['STRONG', 'MIXED', 'WEAK', 'ABSENT', 'N/A']);
const MAP_CELLS = new Set(['E', 'N/A', 'C']);

const failures = [];
const fail = (check, msg) => failures.push(`[${check}] ${msg}`);

function read(rel) {
  const p = join(HERE, rel);
  if (!existsSync(p)) { fail('files', `missing required file: ${rel}`); return null; }
  return readFileSync(p, 'utf8');
}

// ── parse axes.md: axis names from `## N. Name`, heuristic refs from `**Heuristics:**` lines ──
function parseAxes(md) {
  if (!md) return { axes: [], refs: [] };
  const axes = [];
  for (const m of md.matchAll(/^##\s+(\d+)\.\s+([A-Za-z/]+)\s*$/gm)) axes.push(m[2]);
  const refs = [];
  for (const line of md.split('\n')) {
    const lm = line.match(/^\s*\*\*Heuristics:\*\*\s*(.+)$/);
    if (!lm) continue;
    for (const h of lm[1].matchAll(/`([a-z0-9-]+)`/g)) refs.push(h[1]);
  }
  return { axes, refs };
}

// ── parse heuristics.md: handles from `### \`handle\` — Title` ──
function parseHeuristics(md) {
  if (!md) return [];
  const handles = [];
  for (const m of md.matchAll(/^###\s+`([a-z0-9-]+)`/gm)) handles.push(m[1]);
  return handles;
}

// ── parse doc-types.md: applicability map table + schema axis enum ──
function parseDocTypes(md) {
  if (!md) return { mapAxes: [], cells: [], enum: [] };
  const mapAxes = [];
  const cells = [];
  for (const line of md.split('\n')) {
    // map rows look like: | Customer | E | E | E | C |
    const m = line.match(/^\|\s*([A-Za-z/]+)\s*\|(.+)\|\s*$/);
    if (!m) continue;
    const axis = m[1].trim();
    if (!CANONICAL_AXES.includes(axis)) continue; // skip header / non-axis rows
    mapAxes.push(axis);
    for (const raw of m[2].split('|')) {
      const cell = raw.trim().replace(/[¹²³\d\[\]\*]/g, '').trim(); // strip footnote markers
      if (cell) cells.push({ axis, cell });
    }
  }
  let enumAxes = [];
  const lines = md.split('\n');
  const idx = lines.findIndex(l => /^\*\*Axis enum\*\*/.test(l));
  if (idx >= 0) {
    // collect backtick tokens from the marker line through to the next blank line
    let block = '';
    for (let i = idx; i < lines.length; i++) { if (i > idx && lines[i].trim() === '') break; block += lines[i] + '\n'; }
    enumAxes = [...block.matchAll(/`([A-Za-z/]+)`/g)].map(x => x[1]);
  }
  return { mapAxes, cells, enum: enumAxes };
}

// ── validate one findings object against pmos-critique-findings/v1 ──
function validateFindings(name, obj) {
  const f = (c, m) => fail(c, `${name}: ${m}`);
  if (obj?.schema !== 'pmos-critique-findings/v1') return f('E-schema', `schema field is not pmos-critique-findings/v1 (got ${JSON.stringify(obj?.schema)})`);
  if (obj.skill !== 'artifact-critique') f('E-schema', `skill field should be "artifact-critique"`);
  if (!obj.doc || typeof obj.doc.title !== 'string' || !['prd', 'strategy', 'pov', 'roadmap'].includes(obj.doc.type))
    f('E-schema', `doc.title/doc.type malformed`);
  // opening
  const ph = obj.opening?.pushing_hardest_on;
  if (!Array.isArray(ph) || ph.length < 1 || ph.length > 3) f('E-opening', `opening.pushing_hardest_on must have 1–3 entries`);
  // axes: all 10, fixed order
  if (!Array.isArray(obj.axes) || obj.axes.length !== 10) { f('E-axes-complete', `axes must have all 10 entries`); return; }
  obj.axes.forEach((a, i) => {
    if (a.axis !== CANONICAL_AXES[i]) f('E-axes-complete', `axis[${i}] is "${a.axis}", expected "${CANONICAL_AXES[i]}" (fixed order)`);
    if (!VERDICTS.has(a.verdict)) f('E-axes-complete', `axis ${a.axis}: invalid verdict "${a.verdict}"`);
    if (typeof a.applicable !== 'boolean') f('E-applicable-consistency', `axis ${a.axis}: applicable must be boolean`);
    // applicable=false ⇔ verdict=N/A
    if ((a.applicable === false) !== (a.verdict === 'N/A'))
      f('E-applicable-consistency', `axis ${a.axis}: applicable=${a.applicable} but verdict=${a.verdict} (must be N/A iff not applicable)`);
    if ((a.verdict === 'ABSENT' || a.verdict === 'WEAK') && !(a.reason && a.reason.trim()))
      f('E-gap-named', `axis ${a.axis}: ${a.verdict} requires a non-empty reason`);
    if (a.quote != null && String(a.quote).length < 40)
      f('E-quote-len', `axis ${a.axis}: non-null quote shorter than 40 chars`);
  });
  // weakest_claims 0–3, ranks unique 1..n, quotes ≥40
  const wc = obj.weakest_claims;
  if (!Array.isArray(wc) || wc.length > 3) f('E-weakest-ranked', `weakest_claims must be an array of length 0–3`);
  else {
    const ranks = wc.map(w => w.rank).sort((a, b) => a - b);
    ranks.forEach((r, i) => { if (r !== i + 1) f('E-weakest-ranked', `weakest_claims ranks must be unique 1..n (got ${JSON.stringify(ranks)})`); });
    wc.forEach((w, i) => { if (!(w.quote && String(w.quote).length >= 40)) f('E-quote-len', `weakest_claims[${i}]: quote must be ≥40 chars`); });
  }
  // bottom_line
  if (!obj.bottom_line || !Array.isArray(obj.bottom_line.must_dos)) f('E-schema', `bottom_line.must_dos missing`);
}

// ─────────────────────────── run the checks ───────────────────────────
const axesMd = read('axes.md');
const heuristicsMd = read('heuristics.md');
const docTypesMd = read('doc-types.md');

const { axes, refs } = parseAxes(axesMd);
const handles = parseHeuristics(heuristicsMd);
const { mapAxes, cells, enum: schemaEnum } = parseDocTypes(docTypesMd);

// C1 — axes.md declares exactly the canonical 10, in order
if (JSON.stringify(axes) !== JSON.stringify(CANONICAL_AXES))
  fail('C1-axes-order', `axes.md axis list ${JSON.stringify(axes)} != canonical ${JSON.stringify(CANONICAL_AXES)}`);

// C2 — every axis heuristic ref exists in heuristics.md
if (refs.length === 0) fail('C2-heuristic-refs', `axes.md declares no **Heuristics:** references`);
for (const r of refs) if (!handles.includes(r)) fail('C2-heuristic-refs', `axes.md cites heuristic \`${r}\` not defined in heuristics.md`);

// C3 — the map covers every axis
for (const a of CANONICAL_AXES) if (!mapAxes.includes(a)) fail('C3-map-coverage', `applicability map missing axis "${a}"`);

// C4 — every map cell is E / N/A / C
for (const { axis, cell } of cells) if (!MAP_CELLS.has(cell)) fail('C4-map-cells', `axis ${axis}: invalid map cell "${cell}" (expected E / N/A / C)`);

// C5 — schema axis enum equals axes.md set + order
if (JSON.stringify(schemaEnum) !== JSON.stringify(CANONICAL_AXES))
  fail('C5-schema-enum', `doc-types.md axis enum ${JSON.stringify(schemaEnum)} != axes ${JSON.stringify(CANONICAL_AXES)}`);

// C6 — corpus samples parse against v1
if (!existsSync(CORPUS_DIR)) {
  fail('C6-corpus', `corpus-samples dir missing: ${CORPUS_DIR}`);
} else {
  const jsons = readdirSync(CORPUS_DIR).filter(f => f.endsWith('.json'));
  if (jsons.length < 2) fail('C6-corpus', `expected ≥2 critique-output JSON samples, found ${jsons.length}`);
  let aiCovered = false;
  const typesSeen = new Set();
  for (const j of jsons) {
    let obj;
    try { obj = JSON.parse(readFileSync(join(CORPUS_DIR, j), 'utf8')); }
    catch (e) { fail('C6-corpus', `${j}: invalid JSON — ${e.message}`); continue; }
    validateFindings(j, obj);
    if (obj?.doc?.type) typesSeen.add(obj.doc.type);
    const aiAxis = Array.isArray(obj?.axes) ? obj.axes.find(a => a.axis === 'AI') : null;
    if (aiAxis && aiAxis.applicable === true) aiCovered = true;
    // every sample should have a paired excerpt .md
    const md = j.replace(/\.json$/, '.md');
    if (!existsSync(join(CORPUS_DIR, md))) fail('C6-corpus', `${j}: missing paired excerpt ${md}`);
  }
  if (typesSeen.size < 2) fail('C6-corpus', `samples must cover ≥2 doc-types (found ${[...typesSeen].join(', ') || 'none'})`);
  if (!aiCovered) fail('C6-corpus', `no sample exercises an applicable AI axis (need one AI-feature case)`);
}

// C7 — Inv-6 dangling-cite guard
try {
  let hits = [];
  try {
    hits = execSync('grep -rl critique-rubric plugins docs', { cwd: ROOT, encoding: 'utf8' })
      .split('\n').map(s => s.trim()).filter(Boolean);
  } catch (e) {
    if (e.status === 1) hits = []; // grep: no matches
    else throw e;
  }
  const allowed = (p) =>
    p.includes('plugins/pmos-toolkit/skills/_shared/critique-rubric/') ||
    p.includes('docs/pmos/features/2026-06-24_artifact-critique/') ||
    p.includes('docs/design-briefs/2026-06-24-artifact-critique-skill.md') || // this epic's own seed brief (lineage)
    p.includes('plugins/pmos-toolkit/skills/artifact-critique/'); // aa8 (built next) is allowed to cite
  for (const h of hits) if (!allowed(h)) fail('C7-dangling-cite', `unexpected reference to critique-rubric: ${h} (Inv-6 — only /artifact-critique may cite it)`);
} catch (e) {
  fail('C7-dangling-cite', `grep failed: ${e.message}`);
}

// ─────────────────────────── report ───────────────────────────
if (failures.length) {
  console.error(`critique-rubric selftest: FAIL — ${failures.length} issue(s):`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('critique-rubric selftest: PASS — axes ⊆ map ⊆ schema enum; heuristic refs resolve; samples conform to pmos-critique-findings/v1; Inv-6 clean.');
process.exit(0);
