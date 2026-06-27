#!/usr/bin/env node
// verify-page.mjs — the post-write verification pass (../reference/notion-blocks.md §7).
//
// Zero-dependency. Two reconciliations after the page is (re-)fetched:
//   • Completeness — every source block (by its stable source-index) must reach a terminal disposition
//     ∈ {mapped, stubbed, user-skipped}. Anything still pending, or a mapped block missing from the fetched
//     page, is reported unaccounted-for (fail loudly).
//   • Integrity — no orphaned block (a create-then-append child whose parent was never written); every table
//     row's cell count == the table's table_width; no accidentally-empty block where the source had content;
//     all code languages in-enum; all colors in-enum (§4 enums imported from map-to-notion, one home).
//
// Usage: node verify-page.mjs --selftest
'use strict';
import { LANGUAGES, COLORS } from './map-to-notion.mjs';

const TERMINAL = new Set(['mapped', 'stubbed', 'user-skipped']);

// Completeness: fold the build plan with the skill's runtime resolutions (ambiguity/image decisions), then
// confirm every terminal-mapped block actually landed in the fetched page (if a fetched si-set is supplied).
export function checkCompleteness(plan = [], resolutions = {}, fetchedSi = null) {
  const accounted = [];
  const unaccounted = [];
  const fetched = fetchedSi ? new Set(fetchedSi) : null;
  for (const e of plan) {
    const d = resolutions[e.si] !== undefined ? resolutions[e.si] : e.disposition;
    if (!TERMINAL.has(d)) { unaccounted.push({ si: e.si, sourceType: e.sourceType, reason: `unresolved disposition: ${d}` }); continue; }
    if (d === 'mapped' && fetched && !fetched.has(e.si)) { unaccounted.push({ si: e.si, sourceType: e.sourceType, reason: 'mapped but absent from fetched page (dropped)' }); continue; }
    accounted.push({ si: e.si, disposition: d });
  }
  return { accounted, unaccounted, ok: unaccounted.length === 0 };
}

// Integrity: walk the REST-faithful model. Optional `writtenSi` (the set of si that were created) lets the
// append-parent (orphan) check fire; `sourceNonEmpty` flags si whose source carried text.
export function checkIntegrity(blocks = [], opts = {}) {
  const findings = [];
  const writtenSi = opts.writtenSi ? new Set(opts.writtenSi) : null;
  const sourceNonEmpty = opts.sourceNonEmpty || {};
  const TEXT_TYPES = new Set(['paragraph', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 'numbered_list_item', 'to_do', 'quote', 'callout']);

  const walk = (b, parentSi) => {
    if (writtenSi && parentSi !== null && b._si !== undefined && !writtenSi.has(parentSi)) {
      findings.push({ kind: 'orphan', si: b._si, detail: `parent si ${parentSi} was never written` });
    }
    if (b.type === 'table') {
      for (let r = 0; r < (b.rows || []).length; r++) {
        if (b.rows[r].cells.length !== b.table_width) {
          findings.push({ kind: 'ragged-row', si: b._si, detail: `row ${r} has ${b.rows[r].cells.length} cells, table_width=${b.table_width}` });
        }
      }
    }
    if (b.type === 'code' && b.language && !LANGUAGES.has(b.language)) {
      findings.push({ kind: 'bad-language', si: b._si, detail: `language '${b.language}' not in enum` });
    }
    if (b.color && !COLORS.has(b.color)) findings.push({ kind: 'bad-color', si: b._si, detail: `color '${b.color}' not in enum` });
    if (TEXT_TYPES.has(b.type) && (!b.rich || b.rich.length === 0) && sourceNonEmpty[b._si]) {
      findings.push({ kind: 'empty-block', si: b._si, detail: `${b.type} is empty but source had content` });
    }
    if (b.children) for (const c of b.children) walk(c, b._si);
  };
  for (const b of blocks) walk(b, null);
  return { findings, ok: findings.length === 0 };
}

export function verifyPage({ plan = [], resolutions = {}, blocks = [], fetchedSi = null, writtenSi = null, sourceNonEmpty = {} } = {}) {
  const completeness = checkCompleteness(plan, resolutions, fetchedSi);
  const integrity = checkIntegrity(blocks, { writtenSi, sourceNonEmpty });
  return { completeness, integrity, ok: completeness.ok && integrity.ok };
}

// ---------------------------------------------------------------------------
// Selftest
// ---------------------------------------------------------------------------

function selftest() {
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };

  // A fully-mapped fixture passes with zero findings.
  const plan = [
    { si: 0, sourceType: 'heading', disposition: 'mapped' },
    { si: 1, sourceType: 'paragraph', disposition: 'mapped' },
    { si: 2, sourceType: 'image', disposition: 'stubbed' },
    { si: 3, sourceType: 'svg', disposition: 'ambiguous-pending' }, // resolved at runtime below
  ];
  const blocks = [
    { _si: 0, type: 'heading_1', rich: [{ content: 'H' }] },
    { _si: 1, type: 'paragraph', rich: [{ content: 'p' }] },
    { _si: 2, type: 'table', table_width: 2, rows: [{ cells: [[], []] }, { cells: [[], []] }] },
    { _si: 4, type: 'code', language: 'python', code: 'x=1' },
  ];
  const good = verifyPage({ plan, resolutions: { 3: 'user-skipped' }, blocks, fetchedSi: [0, 1, 2] });
  ok(good.completeness.ok, 'all source blocks accounted (ambiguous resolved to user-skipped)');
  ok(good.integrity.ok, 'clean model → zero integrity findings');
  ok(good.ok, 'overall ok');

  // An unresolved ambiguity → unaccounted-for.
  const unresolved = checkCompleteness(plan, {}); // si=3 still ambiguous-pending
  ok(!unresolved.ok && unresolved.unaccounted.some((u) => u.si === 3), 'unresolved ambiguity flagged unaccounted');

  // A dropped (mapped-but-absent) source block → unaccounted-for.
  const dropped = checkCompleteness([{ si: 5, sourceType: 'paragraph', disposition: 'mapped' }], {}, [/* not 5 */ 0]);
  ok(!dropped.ok && /dropped/.test(dropped.unaccounted[0].reason), 'mapped block absent from fetch → dropped');

  // A ragged fetched table fails integrity.
  const ragged = checkIntegrity([{ _si: 0, type: 'table', table_width: 3, rows: [{ cells: [[], [], []] }, { cells: [[], []] }] }]);
  ok(!ragged.ok && ragged.findings.some((f) => f.kind === 'ragged-row'), 'ragged table row fails integrity');

  // Bad language + bad color caught.
  const enums = checkIntegrity([
    { _si: 0, type: 'code', language: 'klingon', code: '' },
    { _si: 1, type: 'callout', rich: [{ content: 'x' }], color: 'chartreuse' },
  ]);
  ok(enums.findings.some((f) => f.kind === 'bad-language') && enums.findings.some((f) => f.kind === 'bad-color'), 'bad language + color flagged');

  // Accidentally-empty block where source had content.
  const empty = checkIntegrity([{ _si: 7, type: 'paragraph', rich: [] }], { sourceNonEmpty: { 7: true } });
  ok(empty.findings.some((f) => f.kind === 'empty-block'), 'empty-but-source-had-content flagged');
  const emptyOk = checkIntegrity([{ _si: 7, type: 'divider' }], { sourceNonEmpty: {} });
  ok(emptyOk.ok, 'legitimately content-free block (divider) not flagged');

  // Orphan: an appended child whose parent si was never written.
  const orphan = checkIntegrity([{ _si: 0, type: 'bulleted_list_item', rich: [{ content: 'p' }], children: [{ _si: 1, type: 'paragraph', rich: [{ content: 'c' }] }] }], { writtenSi: [/* 0 missing */ 9] });
  ok(orphan.findings.some((f) => f.kind === 'orphan' && f.si === 1), 'child under unwritten parent → orphan');

  console.log(`verify-page selftest: ${pass} passed, ${fail} failed`);
  return fail === 0;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) process.exit(selftest() ? 0 : 1);
  console.error('usage: verify-page.mjs --selftest  (library module; the skill imports verifyPage/checkCompleteness/checkIntegrity)');
  process.exit(64);
}
