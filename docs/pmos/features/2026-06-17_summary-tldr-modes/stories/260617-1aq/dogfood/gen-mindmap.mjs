// Dogfood: author a themed (technical) mindmap SVG from mindmap-layout.mjs computed coords,
// proving the /diagram --mode mindmap path end-to-end (layout → themed SVG → sidecar).
// Run: node gen-mindmap.mjs > pm-skills-mindmap.svg   (sidecar written alongside)
import { layout } from '../../../../../../../plugins/pmos-toolkit/skills/diagram/scripts/mindmap-layout.mjs';
import { writeFileSync } from 'node:fs';

// ~15-node hierarchy: a PM-skills mind map.
const tree = {
  id: 'pm', label: 'PM Craft',
  children: [
    { id: 'disc', label: 'Discovery', children: [
      { id: 'res', label: 'User research' },
      { id: 'jtbd', label: 'JTBD' },
      { id: 'mkt', label: 'Market sizing' },
    ]},
    { id: 'deliv', label: 'Delivery', children: [
      { id: 'spec', label: 'Specs' },
      { id: 'plan', label: 'Planning' },
      { id: 'ship', label: 'Shipping' },
    ]},
    { id: 'growth', label: 'Growth', children: [
      { id: 'exp', label: 'Experiments' },
      { id: 'metrics', label: 'Metrics' },
    ]},
    { id: 'lead', label: 'Leadership', children: [
      { id: 'comm', label: 'Comms' },
      { id: 'stake', label: 'Stakeholders' },
    ]},
  ],
};

const NW = 132, NH = 40;
const res = layout(tree, { layout: 'tree', orientation: 'horizontal', nodeWidth: NW, nodeHeight: NH, hGap: 56, vGap: 30 });

// technical theme tokens
const INK = '#1C1917', INK_MUTED = '#57534E', SURFACE_MUTED = '#F6F5F3', ACCENT = '#C2410C';
const snap = (v) => Math.round(v / 4) * 4;
const pos = {};
for (const [id, p] of Object.entries(res.positions)) pos[id] = { x: snap(p.x), y: snap(p.y) };

const W = snap(res.bounds.width), H = snap(res.bounds.height);
const labelOf = {};
(function walk(t) { labelOf[t.id] = t.label; (t.children || []).forEach(walk); })(tree);

const parts = [];
parts.push('<?xml version="1.0" encoding="UTF-8"?>');
parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Inter, ui-sans-serif, system-ui, sans-serif">`);
parts.push('<title>PM Craft — mindmap (dogfood for /diagram --mode mindmap)</title>');
parts.push(`<rect class="bg" x="0" y="0" width="${W}" height="${H}" fill="#FFFFFF"/>`);

// curved connectors (all bare — no arrowheads, so no arrowhead-mix)
for (const e of res.edges) {
  const a = pos[e.from], b = pos[e.to];
  const x1 = a.x + NW / 2, y1 = a.y;
  const x2 = b.x - NW / 2, y2 = b.y;
  const mx = snap((x1 + x2) / 2);
  parts.push(`<path d="M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" fill="none" stroke="${INK_MUTED}" stroke-width="1.5"/>`);
}

// node boxes + labels
for (const id of Object.keys(pos)) {
  const p = pos[id];
  const isRoot = id === 'pm';
  const x = p.x - NW / 2, y = p.y - NH / 2;
  parts.push(`<g data-anchor="${id}">`);
  parts.push(`<rect x="${x}" y="${y}" width="${NW}" height="${NH}" rx="8" fill="${SURFACE_MUTED}" stroke="${isRoot ? ACCENT : INK}" stroke-width="${isRoot ? 2.5 : 1.5}"/>`);
  parts.push(`<text x="${p.x}" y="${p.y + 4}" font-size="13" text-anchor="middle" fill="${INK}">${labelOf[id]}</text>`);
  parts.push('</g>');
}
parts.push('</svg>');
const svg = parts.join('\n');

writeFileSync(new URL('./pm-skills-mindmap.svg', import.meta.url), svg);
const sidecar = {
  schemaVersion: 2, theme: 'technical', mode: 'mindmap',
  concept: 'PM Craft skills mind map', approach: 'tree',
  layoutEngine: res.layoutEngine, alternativesConsidered: ['radial'],
  canvas: { width: W, height: H },
  positions: pos,
  entities: Object.keys(pos).map((id) => ({ id, label: labelOf[id], category: 'node' })),
  relationships: res.edges.map((e) => ({ from: e.from, to: e.to, kind: 'directed' })),
  createdBy: 'pmos-toolkit:diagram@v2 (260617-1aq dogfood)',
};
writeFileSync(new URL('./pm-skills-mindmap.diagram.json', import.meta.url), JSON.stringify(sidecar, null, 2));
process.stderr.write(`wrote ${Object.keys(pos).length}-node mindmap (${W}x${H}, ${res.layoutEngine})\n`);
