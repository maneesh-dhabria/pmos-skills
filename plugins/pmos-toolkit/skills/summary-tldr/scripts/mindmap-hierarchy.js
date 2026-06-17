#!/usr/bin/env node
// mindmap-hierarchy.js — normalize + floor-gate the keyfact-derived mindmap hierarchy
// for /summary-tldr --mode mindmap (story 260617-xn4, design D3/D4/D11/D12).
//
// The MODEL derives the hierarchy's CONTENT from the grounded keyfact extraction (root = topic;
// branches = key arguments; leaves = takeaways/numbers — NOT the compressed prose). This script
// does the deterministic parts the model must not freelance (skill-patterns.md §H):
//   • normalize the derived structure into the exact `{id,label,children}` tree
//     /diagram --mode mindmap consumes (its Phase-1 hierarchy model + mindmap-layout.mjs input);
//   • assign stable, collision-free ids;
//   • enforce the graceful-degradation FLOOR (D11/D12): too few keyfacts for a useful mindmap →
//     emit a degrade decision so the skill ships the canonical text only, never a fabricated map.
//
// Input shape (stdin JSON or buildHierarchy arg):
//   { topic: "<root label>", branches: [ { label, leaves?: [string|{label}], children?: [...] } ] }
//   (branches may nest via `children`; `leaves` is sugar for leaf-only children.)
//
// Floor: a useful mindmap needs the root + >= MIN_BRANCHES branches + >= MIN_LEAVES total leaf
// keyfacts. Below floor → { degrade: true, reason }.
//
// CLI:
//   echo '<json>' | node mindmap-hierarchy.js     → prints the normalized tree JSON (stdout);
//                                                    below floor → reason on stderr, exit 3
//   node mindmap-hierarchy.js --selftest          → fixtures, exit 0 (pass) / 1 (fail)

'use strict';

const MIN_BRANCHES = 2;   // at least two branches, else it's a list not a map
const MIN_LEAVES = 3;     // at least three leaf keyfacts total

function slugify(s, fallback) {
  const base = String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return base || fallback;
}

// Recursively normalize a node into {id,label,children}, assigning collision-free ids.
function normalizeNode(node, used, idHint) {
  const label = typeof node === 'string' ? node : String(node.label || node.id || '').trim();
  let id = slugify(typeof node === 'object' ? (node.id || label) : label, idHint);
  let candidate = id;
  let n = 2;
  while (used.has(candidate)) candidate = `${id}-${n++}`;
  used.add(candidate);

  const out = { id: candidate, label };
  // children come from explicit `children` and/or `leaves` sugar.
  const kids = [];
  if (node && typeof node === 'object') {
    if (Array.isArray(node.children)) for (const c of node.children) kids.push(c);
    if (Array.isArray(node.leaves)) for (const l of node.leaves) kids.push(l);
  }
  if (kids.length) {
    out.children = kids.map((c, i) => normalizeNode(c, used, `n${used.size}-${i}`));
  }
  return out;
}

function countLeaves(node) {
  if (!node.children || !node.children.length) return 1;
  return node.children.reduce((acc, c) => acc + countLeaves(c), 0);
}

// Build + floor-gate the hierarchy. Pure. Returns {tree, leaves, branches} or {degrade, reason}.
function buildHierarchy(input) {
  if (!input || typeof input !== 'object') {
    return { degrade: true, reason: 'no hierarchy input (expected {topic, branches})' };
  }
  const topic = String(input.topic || input.label || '').trim();
  const branches = Array.isArray(input.branches) ? input.branches : [];
  if (!topic) return { degrade: true, reason: 'no root topic for the mindmap' };
  if (branches.length < MIN_BRANCHES) {
    return {
      degrade: true,
      reason: `too few key arguments for a useful mindmap (${branches.length} branch(es), need >= ${MIN_BRANCHES})`,
    };
  }
  const used = new Set();
  const tree = normalizeNode({ id: slugify(topic, 'root'), label: topic, children: branches }, used, 'root');
  const leaves = countLeaves(tree);
  if (leaves < MIN_LEAVES) {
    return {
      degrade: true,
      reason: `too few keyfacts for a useful mindmap (${leaves} leaf takeaway(s), need >= ${MIN_LEAVES})`,
    };
  }
  return { tree, leaves, branches: branches.length };
}

function readStdin() {
  try {
    return require('fs').readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function selftest() {
  const cases = [];
  const assert = (name, cond) => cases.push({ name, ok: !!cond });

  // A healthy hierarchy → tree with stable ids, no collisions.
  const good = buildHierarchy({
    topic: 'Remote Work Report',
    branches: [
      { label: 'Costs', leaves: ['Office cost down 40%', 'Real-estate cut'] },
      { label: 'Velocity', leaves: ['Review turnaround 4h→11h'] },
      { label: 'Recommendations', children: [{ label: 'Hybrid policy' }, { label: 'Async-first' }] },
    ],
  });
  assert('good builds a tree', good.tree && !good.degrade);
  assert('root label preserved', good.tree.label === 'Remote Work Report');
  assert('root has 3 branches', good.tree.children.length === 3);
  assert('leaf count counted', good.leaves === 5);
  // id uniqueness
  const ids = [];
  (function walk(n) { ids.push(n.id); (n.children || []).forEach(walk); })(good.tree);
  assert('ids are unique', new Set(ids).size === ids.length);
  assert('ids are non-empty slugs', ids.every((x) => /^[a-z0-9-]+$/.test(x)));

  // id collision handling: two branches with the same label get distinct ids.
  const collide = buildHierarchy({
    topic: 'T', branches: [
      { label: 'Same', leaves: ['a'] }, { label: 'Same', leaves: ['b'] }, { label: 'Other', leaves: ['c'] },
    ],
  });
  const cids = [];
  (function walk(n) { cids.push(n.id); (n.children || []).forEach(walk); })(collide.tree);
  assert('collision ids deduped', new Set(cids).size === cids.length);

  // Degrade: too few branches
  let d = buildHierarchy({ topic: 'Thin', branches: [{ label: 'Only', leaves: ['x', 'y', 'z'] }] });
  assert('degrade on <2 branches', d.degrade === true && /branch/.test(d.reason));

  // Degrade: too few leaves
  d = buildHierarchy({ topic: 'Sparse', branches: [{ label: 'A' }, { label: 'B' }] });
  assert('degrade on <3 leaves', d.degrade === true && /keyfact/.test(d.reason));

  // Degrade: no topic
  d = buildHierarchy({ branches: [{ label: 'A', leaves: ['1'] }, { label: 'B', leaves: ['2'] }] });
  assert('degrade on no topic', d.degrade === true && /root topic/.test(d.reason));

  // Degrade: garbage input
  d = buildHierarchy(null);
  assert('degrade on null input', d.degrade === true);

  // Output tree is shaped for mindmap-layout.mjs: {id,label,children?} only.
  const keys = new Set();
  (function walk(n) { Object.keys(n).forEach((k) => keys.add(k)); (n.children || []).forEach(walk); })(good.tree);
  assert('tree keys are id/label/children only', [...keys].every((k) => ['id', 'label', 'children'].includes(k)));

  const failed = cases.filter((c) => !c.ok);
  if (failed.length) {
    for (const f of failed) process.stderr.write(`FAIL: ${f.name}\n`);
    process.stderr.write(`SELFTEST FAIL: ${failed.length}/${cases.length} mindmap-hierarchy.js checks failed.\n`);
    process.exit(1);
  }
  process.stdout.write(`SELFTEST PASS: mindmap-hierarchy.js normalize + floor model holds (${cases.length} checks).\n`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) return selftest();

  let input;
  try {
    input = JSON.parse(readStdin() || 'null');
  } catch (e) {
    process.stderr.write(`error: hierarchy stdin is not valid JSON: ${e.message}\n`);
    process.exit(64);
  }
  const r = buildHierarchy(input);
  if (r.degrade) {
    process.stderr.write(`degrade: ${r.reason}\n`);
    process.exit(3);
  }
  process.stdout.write(JSON.stringify(r.tree) + '\n');
}

if (require.main === module) main();

module.exports = { MIN_BRANCHES, MIN_LEAVES, buildHierarchy, normalizeNode, countLeaves };
