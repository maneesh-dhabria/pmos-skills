// Dogfood: /summary-tldr --mode mindmap end-to-end, proving the FR-B4 data path:
//   grounded keyfacts → mindmap-hierarchy.js (normalize+floor) → /diagram mindmap-layout (coords)
//   → editorial-themed SVG → save sibling <slug>-mindmap.svg.
// Run: node gen-mindmap-mode.mjs   (writes <slug>-mindmap.svg + .diagram.json alongside)
//
// The hierarchy below is the keyfact extraction of a REAL sample source — the public W3C
// "Web Content Accessibility Guidelines (WCAG) 2 at a Glance" summary page — root=topic,
// branches=the four POUR principles, leaves=their named requirements. (Dogfood of the
// RENDERING path; the model's grounded-summary path is unchanged / back-compat.)
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '../../../../../../..'); // worktree root
const HIER = resolve(ROOT, 'plugins/pmos-toolkit/skills/summary-tldr/scripts/mindmap-hierarchy.js');
const LAYOUT = resolve(ROOT, 'plugins/pmos-toolkit/skills/diagram/scripts/mindmap-layout.mjs');

// Grounded keyfacts (root/branches/leaves) — the shape the SKILL.md Phase-7 mindmap path derives.
const keyfacts = {
  topic: 'WCAG 2 at a Glance',
  branches: [
    { label: 'Perceivable', leaves: ['Text alternatives', 'Captions & audio', 'Adaptable layout', 'Distinguishable contrast'] },
    { label: 'Operable', leaves: ['Keyboard accessible', 'Enough time', 'No seizures', 'Navigable'] },
    { label: 'Understandable', leaves: ['Readable', 'Predictable', 'Input assistance'] },
    { label: 'Robust', leaves: ['Compatible with assistive tech'] },
  ],
};

// 1) Normalize + floor-gate via the skill's deterministic script (the §H step).
const tree = JSON.parse(execFileSync('node', [HIER], { input: JSON.stringify(keyfacts) }).toString());

// 2) Compute coordinates via /diagram's vendored layout (editorial default = radial).
const res = JSON.parse(execFileSync('node', [LAYOUT, '--layout', 'radial'], { input: JSON.stringify(tree) }).toString());

// 3) Author editorial-themed SVG at the computed coords (editorial theme tokens; curved connectors).
const BG = '#F4EFE6', INK = '#0F172A', INK_MUTED = '#475569', ACCENT = '#B8351A', SURFACE = '#FBF7EF';
const snap = (v) => Math.round(v / 4) * 4;
const pos = {};
for (const [id, p] of Object.entries(res.positions)) pos[id] = { x: snap(p.x), y: snap(p.y) };
const W = snap(res.bounds.width), H = snap(res.bounds.height);
const labelOf = {};
(function walk(t) { labelOf[t.id] = t.label; (t.children || []).forEach(walk); })(tree);
const NW = 132, NH = 36;
// XML-escape label text — a raw & / < in a label (e.g. "Captions & audio") would break the SVG;
// the Phase-7 validate gate (parses as XML) is what catches an unescaped emit.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const parts = [];
parts.push('<?xml version="1.0" encoding="UTF-8"?>');
parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Inter, ui-sans-serif, system-ui, sans-serif">`);
parts.push('<title>WCAG 2 at a Glance — mindmap (/summary-tldr --mode mindmap dogfood)</title>');
// theme background rect (the validation gate checks for this).
parts.push(`<rect class="bg" x="0" y="0" width="${W}" height="${H}" fill="${BG}"/>`);
// curved connectors
for (const e of res.edges) {
  const a = pos[e.from], b = pos[e.to];
  const mx = snap((a.x + b.x) / 2), my = snap((a.y + b.y) / 2);
  parts.push(`<path d="M ${a.x} ${a.y} Q ${mx} ${a.y}, ${mx} ${my} T ${b.x} ${b.y}" fill="none" stroke="${INK_MUTED}" stroke-width="1.4"/>`);
}
// node boxes + labels
for (const id of Object.keys(pos)) {
  const p = pos[id];
  const isRoot = id === tree.id;
  const x = p.x - NW / 2, y = p.y - NH / 2;
  parts.push(`<g data-anchor="${id}">`);
  parts.push(`<rect x="${x}" y="${y}" width="${NW}" height="${NH}" rx="6" fill="${SURFACE}" stroke="${isRoot ? ACCENT : INK}" stroke-width="${isRoot ? 2.5 : 1.3}"/>`);
  parts.push(`<text x="${p.x}" y="${p.y + 4}" font-size="12" text-anchor="middle" fill="${INK}">${esc(labelOf[id])}</text>`);
  parts.push('</g>');
}
parts.push('</svg>');
const svg = parts.join('\n');

const slug = '2026-06-17-wcag2-at-a-glance';
writeFileSync(new URL(`./${slug}-mindmap.svg`, import.meta.url), svg);
writeFileSync(new URL(`./${slug}-mindmap.diagram.json`, import.meta.url), JSON.stringify({
  schemaVersion: 2, theme: 'editorial', mode: 'mindmap', approach: 'radial',
  layoutEngine: res.layoutEngine, canvas: { width: W, height: H }, positions: pos,
  createdBy: 'pmos-toolkit:summary-tldr@--mode mindmap (260617-xn4 dogfood)',
}, null, 2));
process.stderr.write(`wrote ${Object.keys(pos).length}-node mindmap (${W}x${H}, ${res.layoutEngine})\n`);
