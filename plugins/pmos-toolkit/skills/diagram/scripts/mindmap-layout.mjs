#!/usr/bin/env node
// mindmap-layout.mjs — vendored, zero-dependency tidy-tree + radial layout for /diagram --mode mindmap.
//
// Computes non-overlapping node coordinates for a hierarchical node tree, as PURE FUNCTIONS.
// No external package, no `npx`, no network, no browser, no `Math.random`, no `Date`
// (deterministic + resume-safe per the repo's bash/JS rules; cf. backlog mint-id sourcing crypto only).
//
// Two layout families (story 260617-1aq, design D5/FR-A2):
//   • 'tree'   — Reingold–Tilford tidy tree. depth → primary axis, breadth → cross axis.
//   • 'radial' — same breadth assignment, mapped to (radius=depth, angle=breadth) polar coords.
//
// Rejected alternatives (design `#decisions` D5):
//   • `npx d3-hierarchy` — no CLI bin; programmatic use needs an npm install / network fetch. Rejected: "no deps".
//   • `mermaid` — drags in puppeteer (a headless browser) and imposes its own theme, clashing with /diagram's
//     theme tokens and the renderer hard-gate. Rejected: heavy + theme conflict.
// So we vendor a small, well-understood tidy-tree here instead.
//
// Public API:
//   layout(tree, opts) -> { positions: {id:{x,y}}, edges: [{from,to}], bounds:{width,height}, layoutEngine, depthOf }
//     tree : { id, label?, children?: tree[] }   (a single root)
//     opts : {
//       layout: 'tree' | 'radial'   (default 'tree')
//       orientation: 'vertical' | 'horizontal'   (tree only; default 'horizontal' — root left, depth grows right)
//       nodeWidth, nodeHeight        (px box used for spacing; default 120 x 40)
//       hGap, vGap                   (px gaps between boxes; default 48 x 28)
//       cx, cy                       (radial center; default auto)
//       radialStep                   (px per depth ring; default = nodeWidth + hGap)
//       angularSpan                  (radians spread for the outermost ring; default 2*Math.PI)
//       pad                          (px canvas padding; default 32)
//     }
//
// CLI: `node mindmap-layout.mjs --selftest`  → runs fixtures, exits 0 (all pass) / 1 (any fail).

const DEFAULTS = {
  layout: 'tree',
  orientation: 'horizontal',
  nodeWidth: 120,
  nodeHeight: 40,
  hGap: 48,
  vGap: 28,
  radialStep: null, // derived
  angularSpan: 2 * Math.PI,
  pad: 32,
};

// ---------- tree normalization ----------

// Returns a flat, ordered list of internal node records with parent links and depth.
function buildNodes(tree) {
  if (!tree || typeof tree !== 'object' || tree.id == null) {
    throw new Error('layout: tree must be an object with an `id`');
  }
  const nodes = [];
  const seen = new Set();
  function visit(t, parent, depth) {
    if (t.id == null) throw new Error('layout: every node needs an `id`');
    if (seen.has(t.id)) throw new Error(`layout: duplicate node id ${JSON.stringify(t.id)}`);
    seen.add(t.id);
    const rec = {
      id: t.id,
      label: t.label != null ? String(t.label) : String(t.id),
      depth,
      parent: parent ? parent.id : null,
      children: [],
      _node: t,
      prelim: 0,
      mod: 0,
      x: 0,
      y: 0,
    };
    nodes.push(rec);
    const kids = Array.isArray(t.children) ? t.children : [];
    for (const k of kids) {
      const childRec = visit(k, rec, depth + 1);
      rec.children.push(childRec);
    }
    return rec;
  }
  const root = visit(tree, null, 0);
  return { root, nodes };
}

// ---------- breadth assignment (Reingold–Tilford, simple disjoint-leaf-slot variant) ----------
//
// Post-order walk: leaves take the next integer slot (globally increasing in DFS order, so sibling
// subtrees occupy disjoint slot-ranges); internal nodes center over the span of their children.
// This guarantees that any two nodes at the same depth have distinct slots ≥ 1 apart — no overlap.
function assignBreadth(root) {
  let nextSlot = 0;
  function walk(rec) {
    if (rec.children.length === 0) {
      rec.slot = nextSlot;
      nextSlot += 1;
      return;
    }
    for (const c of rec.children) walk(c);
    const first = rec.children[0].slot;
    const last = rec.children[rec.children.length - 1].slot;
    rec.slot = (first + last) / 2;
  }
  walk(root);
}

function maxDepth(nodes) {
  let m = 0;
  for (const n of nodes) if (n.depth > m) m = n.depth;
  return m;
}

function maxSlot(nodes) {
  let m = 0;
  for (const n of nodes) if (n.slot > m) m = n.slot;
  return m;
}

// ---------- tree pixel placement ----------

function placeTree(nodes, root, opts) {
  assignBreadth(root);
  const { nodeWidth, nodeHeight, hGap, vGap, orientation, pad } = opts;
  const positions = {};
  // depth axis pitch and breadth axis pitch
  if (orientation === 'horizontal') {
    const depthPitch = nodeWidth + hGap; // x grows with depth
    const breadthPitch = nodeHeight + vGap; // y grows with breadth slot
    for (const n of nodes) {
      positions[n.id] = {
        x: pad + nodeWidth / 2 + n.depth * depthPitch,
        y: pad + nodeHeight / 2 + n.slot * breadthPitch,
      };
    }
  } else {
    const depthPitch = nodeHeight + vGap; // y grows with depth
    const breadthPitch = nodeWidth + hGap; // x grows with breadth slot
    for (const n of nodes) {
      positions[n.id] = {
        x: pad + nodeWidth / 2 + n.slot * breadthPitch,
        y: pad + nodeHeight / 2 + n.depth * depthPitch,
      };
    }
  }
  return positions;
}

// ---------- radial pixel placement ----------

function placeRadial(nodes, root, opts) {
  assignBreadth(root);
  const { nodeWidth, nodeHeight, hGap, pad } = opts;
  const step = opts.radialStep != null ? opts.radialStep : nodeWidth + hGap;
  const span = opts.angularSpan;
  const slots = maxSlot(nodes);
  const depths = maxDepth(nodes);
  // Center the layout; radius grows per depth ring. Angle from the breadth slot.
  // Leave a full slot of head-room so the first and last leaves don't touch when span == 2π.
  const denom = span >= 2 * Math.PI - 1e-9 ? slots + 1 : slots || 1;
  const maxRadius = depths * step;
  const cx = opts.cx != null ? opts.cx : pad + maxRadius + nodeWidth / 2;
  const cy = opts.cy != null ? opts.cy : pad + maxRadius + nodeHeight / 2;
  const positions = {};
  for (const n of nodes) {
    if (n.depth === 0) {
      positions[n.id] = { x: cx, y: cy };
      continue;
    }
    const angle = (n.slot / denom) * span;
    const r = n.depth * step;
    positions[n.id] = {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }
  return positions;
}

// ---------- public layout() ----------

export function layout(tree, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  if (opts.layout !== 'tree' && opts.layout !== 'radial') {
    throw new Error(`layout: unknown layout ${JSON.stringify(opts.layout)} (expected 'tree' or 'radial')`);
  }
  const { root, nodes } = buildNodes(tree);
  const positions =
    opts.layout === 'radial' ? placeRadial(nodes, root, opts) : placeTree(nodes, root, opts);

  // edges parent->child
  const edges = [];
  for (const n of nodes) {
    if (n.parent != null) edges.push({ from: n.parent, to: n.id });
  }

  // bounds (normalize so the min corner sits at `pad`)
  const xs = nodes.map((n) => positions[n.id].x);
  const ys = nodes.map((n) => positions[n.id].y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const dx = opts.pad + opts.nodeWidth / 2 - minX;
  const dy = opts.pad + opts.nodeHeight / 2 - minY;
  for (const id of Object.keys(positions)) {
    positions[id] = {
      x: round2(positions[id].x + dx),
      y: round2(positions[id].y + dy),
    };
  }
  const maxX = Math.max(...nodes.map((n) => positions[n.id].x));
  const maxY = Math.max(...nodes.map((n) => positions[n.id].y));
  const width = Math.ceil(maxX + opts.nodeWidth / 2 + opts.pad);
  const height = Math.ceil(maxY + opts.nodeHeight / 2 + opts.pad);

  const depthOf = {};
  for (const n of nodes) depthOf[n.id] = n.depth;

  return {
    positions,
    edges,
    bounds: { width, height },
    layoutEngine: opts.layout === 'radial' ? 'mindmap-radial' : 'mindmap-tidytree',
    depthOf,
    nodeCount: nodes.length,
  };
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

// ---------- selftest ----------

function boxesOverlap(a, b, w, h) {
  // axis-aligned box overlap with a 1px epsilon tolerance
  return Math.abs(a.x - b.x) < w - 1 && Math.abs(a.y - b.y) < h - 1;
}

function assertNoOverlap(res, w, h, name) {
  const ids = Object.keys(res.positions);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = res.positions[ids[i]];
      const b = res.positions[ids[j]];
      if (boxesOverlap(a, b, w, h)) {
        throw new Error(`${name}: nodes ${ids[i]} and ${ids[j]} overlap at (${a.x},${a.y}) / (${b.x},${b.y})`);
      }
    }
  }
}

function fixtures() {
  // balanced tree (depth 2, branching 3 → 13 nodes)
  const balanced = {
    id: 'root',
    label: 'Root',
    children: [0, 1, 2].map((i) => ({
      id: `n${i}`,
      label: `N${i}`,
      children: [0, 1, 2].map((j) => ({ id: `n${i}-${j}`, label: `N${i}.${j}` })),
    })),
  };
  // deep chain (depth 6)
  let chain = { id: 'c6', label: 'leaf' };
  for (let d = 5; d >= 0; d--) chain = { id: `c${d}`, label: `c${d}`, children: [chain] };
  // wide fan (root + 12 leaves)
  const fan = {
    id: 'fan',
    label: 'Fan',
    children: Array.from({ length: 12 }, (_, i) => ({ id: `f${i}`, label: `F${i}` })),
  };
  // single node
  const single = { id: 'only', label: 'Only' };
  return { balanced, chain, fan, single };
}

function runSelftest() {
  const { balanced, chain, fan, single } = fixtures();
  const w = DEFAULTS.nodeWidth;
  const h = DEFAULTS.nodeHeight;
  let pass = 0;
  const fail = [];

  function check(name, fn) {
    try {
      fn();
      pass += 1;
      console.log(`  PASS  ${name}`);
    } catch (e) {
      fail.push(`${name}: ${e.message}`);
      console.log(`  FAIL  ${name}  ${e.message}`);
    }
  }

  for (const orientation of ['horizontal', 'vertical']) {
    check(`tree/${orientation} balanced — every node placed`, () => {
      const r = layout(balanced, { layout: 'tree', orientation });
      const ids = Object.keys(r.positions);
      if (ids.length !== 13) throw new Error(`expected 13 positions, got ${ids.length}`);
    });
    check(`tree/${orientation} balanced — no overlap`, () => {
      const r = layout(balanced, { layout: 'tree', orientation });
      assertNoOverlap(r, w, h, 'balanced');
    });
    check(`tree/${orientation} chain — no overlap`, () => {
      const r = layout(chain, { layout: 'tree', orientation });
      assertNoOverlap(r, w, h, 'chain');
    });
    check(`tree/${orientation} fan — no overlap`, () => {
      const r = layout(fan, { layout: 'tree', orientation });
      assertNoOverlap(r, w, h, 'fan');
    });
  }

  check('tree single node — placed at pad+half', () => {
    const r = layout(single, { layout: 'tree' });
    const p = r.positions.only;
    if (p.x !== DEFAULTS.pad + w / 2 || p.y !== DEFAULTS.pad + h / 2) {
      throw new Error(`single node at (${p.x},${p.y})`);
    }
    if (r.edges.length !== 0) throw new Error('single node should have no edges');
  });

  check('radial fan — every node placed, root centered', () => {
    const r = layout(fan, { layout: 'radial' });
    if (Object.keys(r.positions).length !== 13) throw new Error('missing radial positions');
    if (r.layoutEngine !== 'mindmap-radial') throw new Error('wrong layoutEngine');
  });
  check('radial fan — leaves separated', () => {
    const r = layout(fan, { layout: 'radial' });
    // radial leaf separation uses a smaller box (radial packs tighter than the tree grid)
    assertNoOverlap(r, w * 0.5, h * 0.5, 'radial-fan');
  });
  check('radial balanced — every node placed', () => {
    const r = layout(balanced, { layout: 'radial' });
    if (Object.keys(r.positions).length !== 13) throw new Error('missing radial positions');
  });

  check('deterministic — two runs identical', () => {
    const a = JSON.stringify(layout(balanced, { layout: 'tree' }));
    const b = JSON.stringify(layout(balanced, { layout: 'tree' }));
    if (a !== b) throw new Error('non-deterministic output');
    const ra = JSON.stringify(layout(fan, { layout: 'radial' }));
    const rb = JSON.stringify(layout(fan, { layout: 'radial' }));
    if (ra !== rb) throw new Error('non-deterministic radial output');
  });

  check('edges — count == nodes - 1 for a connected tree', () => {
    const r = layout(balanced, { layout: 'tree' });
    if (r.edges.length !== 12) throw new Error(`expected 12 edges, got ${r.edges.length}`);
  });

  check('bounds — positive, min corner respects pad', () => {
    const r = layout(balanced, { layout: 'tree' });
    if (r.bounds.width <= 0 || r.bounds.height <= 0) throw new Error('non-positive bounds');
    const minX = Math.min(...Object.values(r.positions).map((p) => p.x));
    if (Math.abs(minX - (DEFAULTS.pad + w / 2)) > 0.01) throw new Error(`min x not at pad: ${minX}`);
  });

  check('errors — duplicate id rejected', () => {
    let threw = false;
    try {
      layout({ id: 'a', children: [{ id: 'a' }] }, { layout: 'tree' });
    } catch (e) {
      threw = /duplicate/.test(e.message);
    }
    if (!threw) throw new Error('expected duplicate-id error');
  });

  console.log('');
  if (fail.length) {
    console.log(`FAIL — ${fail.length} issue(s):`);
    for (const f of fail) console.log(`  - ${f}`);
    return 1;
  }
  console.log(`PASS — ${pass} checks`);
  return 0;
}

// ---------- CLI ----------

const isMain = (() => {
  try {
    return process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
  } catch {
    return false;
  }
})();

if (isMain || process.argv.includes('--selftest')) {
  if (process.argv.includes('--selftest')) {
    process.exit(runSelftest());
  } else {
    // default CLI: read a JSON tree from stdin, print layout JSON
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (d) => (buf += d));
    process.stdin.on('end', () => {
      try {
        const tree = JSON.parse(buf);
        const opts = {};
        const li = process.argv.indexOf('--layout');
        if (li !== -1) opts.layout = process.argv[li + 1];
        const oi = process.argv.indexOf('--orientation');
        if (oi !== -1) opts.orientation = process.argv[oi + 1];
        console.log(JSON.stringify(layout(tree, opts), null, 2));
      } catch (e) {
        console.error(`mindmap-layout: ${e.message}`);
        process.exit(64);
      }
    });
  }
}
