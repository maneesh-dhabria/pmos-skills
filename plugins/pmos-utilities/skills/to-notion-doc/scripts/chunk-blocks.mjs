#!/usr/bin/env node
// chunk-blocks.mjs — REST-faithful block model → an ordered, resumable write plan.
//
// Zero-dependency, pure arithmetic + ordering (no network). The limits this plans against live in
// ../reference/notion-blocks.md §6: ≤100 blocks per request, ≤2 nesting levels per request, tables created
// with ≥1 row then extra rows appended in ≤100-row batches. Deeper-than-2 nesting becomes create-then-append
// keyed on the parent block's source-index placeholder (the skill swaps in the real Notion id after create).
//
// The first batch that targets the page is the `notion-create-pages` content; every later batch is a
// `notion-update-page insert_content` (append). Each batch records the source-index list it covers so the
// skill can persist a resume cursor (last source-index written) and skip already-written batches on re-run.
//
// Usage: node chunk-blocks.mjs <map-to-notion.json>   (reads {blocks:[...]} or a bare array)
//        node chunk-blocks.mjs --selftest
'use strict';
import fs from 'node:fs';

const MAX_BLOCKS = 100; // blocks per request (counts nested children too)
const MAX_ROWS = 100; // table rows per append request

// All source-indices in a block subtree (table rows carry no own si — the table's single si covers them).
function subtreeSi(b) {
  const out = [];
  const walk = (n) => {
    if (n._si !== undefined) out.push(n._si);
    if (n.type !== 'table' && n.children) n.children.forEach(walk);
  };
  walk(b);
  return out;
}

// Total blocks a node contributes to a request (itself + nested children; table rows count as blocks).
function countBlocks(b) {
  if (b.type === 'table') return 1 + (b.rows ? b.rows.length : 0);
  let n = 1;
  if (b.children) for (const c of b.children) n += countBlocks(c);
  return n;
}

// Trim a node so the request carries at most 2 levels (the node + its direct children). Any grandchildren
// (a child's own children) are pushed to `deferred` as a create-then-append op keyed on the child's si.
// A nested table whose rows exceed the per-request budget also defers its overflow rows.
function trimToDepth2(b, deferred) {
  if (b.type === 'table') return { ...b };
  if (!b.children || !b.children.length) return { ...b };
  const newChildren = b.children.map((c) => {
    if (c.type === 'table' && c.rows && c.rows.length + 1 > MAX_BLOCKS) {
      deferred.push({ parentRef: c._si, kind: 'table-rows', table: c, fromRow: MAX_ROWS - 1 });
      return { ...c, rows: c.rows.slice(0, MAX_ROWS - 1) };
    }
    if (c.type !== 'table' && c.children && c.children.length) {
      deferred.push({ parentRef: c._si, kind: 'blocks', children: c.children });
      return { ...c, children: undefined };
    }
    return { ...c };
  });
  return { ...b, children: newChildren };
}

// Emit ≤100-row append batches for a table's rows starting at `fromRow`.
function emitTableRows(table, parentRef, fromRow, batches) {
  for (let i = fromRow; i < table.rows.length; i += MAX_ROWS) {
    const slice = table.rows.slice(i, i + MAX_ROWS);
    batches.push({
      kind: 'append', parentRef, blockType: 'table_row',
      rows: slice, count: slice.length, si: [table._si], rowRange: [i, i + slice.length - 1],
    });
  }
}

// Plan a list of blocks as top-level children of `parentRef`, batching by the 100-block budget.
function emitGroup(blockList, parentRef, batches) {
  let cur = null;
  const flush = () => { if (cur && cur.blocks.length) batches.push(cur); cur = null; };
  const deferred = [];

  for (const b of blockList) {
    // A standalone table larger than the per-request budget: create with header + first rows, append the rest.
    if (b.type === 'table' && b.rows && b.rows.length + 1 > MAX_BLOCKS) {
      flush();
      const head = { ...b, rows: b.rows.slice(0, MAX_ROWS - 1) };
      batches.push({ kind: 'append', parentRef, blocks: [head], count: countBlocks(head), si: [b._si], rowRange: [0, MAX_ROWS - 2] });
      emitTableRows(b, b._si, MAX_ROWS - 1, batches);
      continue;
    }

    const localDeferred = [];
    const root = trimToDepth2(b, localDeferred);
    const count = countBlocks(root);

    // A single node whose direct children alone blow the budget (e.g. a list with >99 items): write the node
    // head, then append its children as their own ≤100 batches.
    if (count > MAX_BLOCKS) {
      flush();
      const head = { ...root, children: undefined };
      batches.push({ kind: 'append', parentRef, blocks: [head], count: 1, si: [root._si] });
      emitGroup(root.children || [], root._si, batches);
      for (const d of localDeferred) deferred.push(d);
      continue;
    }

    if (!cur) cur = { kind: 'append', parentRef, blocks: [], count: 0, si: [] };
    if (cur.count + count > MAX_BLOCKS && cur.blocks.length) { flush(); cur = { kind: 'append', parentRef, blocks: [], count: 0, si: [] }; }
    cur.blocks.push(root);
    cur.count += count;
    cur.si.push(...subtreeSi(root));
    for (const d of localDeferred) deferred.push(d);
  }
  flush();

  // Create-then-append: process deferred work after its parent batch exists.
  for (const d of deferred) {
    if (d.kind === 'table-rows') emitTableRows(d.table, d.parentRef, d.fromRow, batches);
    else emitGroup(d.children, d.parentRef, batches);
  }
}

export function planWrite(blocks, opts = {}) {
  const batches = [];
  emitGroup(blocks, 'PAGE', batches);
  // The first page-targeted batch is the create (notion-create-pages content); the rest are appends.
  const firstPage = batches.findIndex((b) => b.parentRef === 'PAGE');
  if (firstPage >= 0) batches[firstPage].kind = 'create';
  batches.forEach((b, i) => {
    b.seq = i;
    b.lastSi = b.si.length ? Math.max(...b.si) : null; // resume cursor: skip batches whose lastSi already written
  });
  return { batches, total_batches: batches.length };
}

// ---------------------------------------------------------------------------
// Selftest
// ---------------------------------------------------------------------------

function selftest() {
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };

  // 250 flat blocks → 3 batches of 100/100/50; contiguous si 0..249, no gaps/overlaps.
  const flat = Array.from({ length: 250 }, (_, i) => ({ _si: i, type: 'paragraph', rich: [] }));
  const fp = planWrite(flat);
  ok(fp.batches.length === 3, `250 flat → 3 batches (got ${fp.batches.length})`);
  ok(fp.batches.map((b) => b.count).join(',') === '100,100,50', 'batch counts 100,100,50');
  ok(fp.batches[0].kind === 'create' && fp.batches[1].kind === 'append', 'first batch create, rest append');
  const allSi = fp.batches.flatMap((b) => b.si);
  ok(allSi.length === 250 && new Set(allSi).size === 250, 'no overlaps: 250 unique si');
  ok(allSi.slice().sort((a, b) => a - b).every((v, i) => v === i), 'no gaps: si form 0..249');
  ok(fp.batches[1].lastSi === 199, 'resume cursor lastSi on batch 2 = 199');

  // 3-level nesting → a create-then-append step (an append batch targeting a non-PAGE parent).
  const nested = [{
    _si: 0, type: 'bulleted_list_item', rich: [], children: [
      { _si: 1, type: 'bulleted_list_item', rich: [], children: [
        { _si: 2, type: 'bulleted_list_item', rich: [] },
      ] },
    ],
  }];
  const np = planWrite(nested);
  const cta = np.batches.find((b) => b.kind === 'append' && b.parentRef !== 'PAGE');
  ok(!!cta, '3-level nesting yields a create-then-append step');
  ok(cta && cta.parentRef === 1 && cta.si.includes(2), 'grandchild appended under its parent si=1');
  const nSi = np.batches.flatMap((b) => b.si);
  ok(new Set(nSi).size === 3 && [0, 1, 2].every((s) => nSi.includes(s)), 'all 3 source blocks covered once');

  // 150-row table → header/create batch (≤100 incl. rows) + ≤100-row append batches; no row dropped.
  const rows150 = Array.from({ length: 150 }, (_, i) => ({ cells: [[{ content: String(i) }]] }));
  const bigTable = [{ _si: 0, type: 'table', table_width: 1, has_column_header: true, rows: rows150 }];
  const tp = planWrite(bigTable);
  ok(tp.batches.length >= 2, `150-row table splits into ≥2 batches (got ${tp.batches.length})`);
  ok(tp.batches[0].kind === 'create', 'table head is the create batch');
  ok(tp.batches[0].blocks[0].rows.length === MAX_ROWS - 1, `head carries ${MAX_ROWS - 1} rows`);
  const appendedRows = tp.batches.slice(1).reduce((n, b) => n + (b.rows ? b.rows.length : 0), 0);
  ok((MAX_ROWS - 1) + appendedRows === 150, 'every row accounted for (none dropped)');
  ok(tp.batches.slice(1).every((b) => b.count <= MAX_ROWS), 'append row-batches ≤100 rows');

  // mixed small doc → single create batch covering all top-level si exactly once.
  const mixed = [
    { _si: 0, type: 'heading_1', rich: [] },
    { _si: 1, type: 'paragraph', rich: [] },
    { _si: 2, type: 'divider' },
  ];
  const mp = planWrite(mixed);
  ok(mp.batches.length === 1 && mp.batches[0].kind === 'create', 'small doc → one create batch');
  ok(mp.batches[0].si.join(',') === '0,1,2', 'create batch covers si 0,1,2');

  // depth-2 nesting stays in one request (heading + children, no create-then-append).
  const d2 = [{ _si: 0, type: 'heading_1', rich: [], children: [{ _si: 1, type: 'paragraph', rich: [] }] }];
  const d2p = planWrite(d2);
  ok(d2p.batches.length === 1 && d2p.batches[0].count === 2, 'depth-2 stays in one request');
  ok(!d2p.batches.some((b) => b.parentRef !== 'PAGE'), 'depth-2 needs no create-then-append');

  console.log(`chunk-blocks selftest: ${pass} passed, ${fail} failed`);
  return fail === 0;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) process.exit(selftest() ? 0 : 1);
  if (!args.length) { console.error('usage: chunk-blocks.mjs <map-to-notion.json> | --selftest'); process.exit(64); }
  const j = JSON.parse(fs.readFileSync(args[0], 'utf8'));
  process.stdout.write(JSON.stringify(planWrite(j.blocks || j), null, 2) + '\n');
}
