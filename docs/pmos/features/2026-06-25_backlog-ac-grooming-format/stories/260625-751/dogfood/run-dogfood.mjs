// Live dogfood for story 260625-751 — /backlog grooming AC-format detection.
//
// Proves the before/after on REAL define-authored AC bodies: copies the actual
// numbered-AC and dash-AC story bodies out of the repo's backlog/items/, forces
// them to `status: planned` in a throwaway fixture (NOT committed to backlog),
// and contrasts the OLD checkbox-only detector against the NEW format-robust one
// now shipping in serve-web-lib.mjs. A genuinely AC-less draft and a heading-only
// section must still flag under both.
//
// Run: node run-dogfood.mjs   (exit 0 = pass, 1 = fail). Node stdlib only.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseItems, buildModel } from '../../../../../../../plugins/pmos-toolkit/skills/backlog/scripts/serve-web-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../../../../../..');
const REAL_ITEMS = path.join(REPO, 'backlog', 'items');

// --- the OLD detector, reconstructed verbatim, to compute the pre-fix queue --------------
function sectionBody(body, heading) {
  const re = new RegExp(`^##\\s+${heading}\\s*$`, 'im');
  const m = body.match(re);
  if (!m) return null;
  const rest = body.slice(m.index + m[0].length);
  const next = rest.search(/^##\s+/m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}
const OLD_hasAc = (body) => {
  const ac = sectionBody(body, 'Acceptance Criteria');
  return !!ac && /-\s*\[[ xX]\]/.test(ac);
};

// --- pull a real numbered-AC + dash-AC body out of the repo backlog ----------------------
function realBodyWithAcStyle(test) {
  for (const f of fs.readdirSync(REAL_ITEMS).filter((x) => x.endsWith('.md'))) {
    const t = fs.readFileSync(path.join(REAL_ITEMS, f), 'utf8');
    const m = t.match(/^##\s+Acceptance Criteria\s*$/im);
    if (!m) continue;
    const sec = t.slice(m.index + m[0].length).split(/^##\s+/m)[0];
    if (/-\s*\[[ xX]\]/.test(sec)) continue; // skip checkbox bodies
    if (test(sec)) return { file: f, body: t.slice(t.indexOf('---', 3) + 3).trim() };
  }
  throw new Error('no real story body found for requested AC style');
}

const numbered = realBodyWithAcStyle((sec) => /^\s*\d+[.)]\s+/m.test(sec));
const dash = realBodyWithAcStyle((sec) => /^\s*[-*]\s+/m.test(sec) && !/-\s*\[[ xX]\]/.test(sec));

// --- build a throwaway fixture with those real bodies as PLANNED stories -----------------
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'groom-dogfood-'));
const itemsDir = path.join(root, 'backlog', 'items');
fs.mkdirSync(itemsDir, { recursive: true });
const w = (name, fm, body) => {
  const head = ['---', ...Object.entries(fm).map(([k, v]) => `${k}: ${Array.isArray(v) ? `[${v.join(', ')}]` : v}`), '---'];
  fs.writeFileSync(path.join(itemsDir, name), head.join('\n') + '\n\n' + body + '\n');
};

w('ep.md', { id: 'DOG', kind: 'epic', title: 'Dogfood epic', status: 'defined', route: 'skill', labels: ['pmos-toolkit'], created: '2026-06-25' }, '## Context\nx');
w('num.md', { id: 'NUM', kind: 'story', title: 'real numbered AC', status: 'planned', route: 'skill', priority: 'should', parent: 'DOG', dependencies: [] }, numbered.body);
w('dash.md', { id: 'DASH', kind: 'story', title: 'real dash AC', status: 'planned', route: 'skill', priority: 'should', parent: 'DOG', dependencies: [] }, dash.body);
// a genuinely AC-less draft — must flag in both old and new
w('draft.md', { id: 'DRAFT', kind: 'story', title: 'no AC at all', status: 'draft', route: 'skill', priority: 'should', parent: 'DOG', dependencies: [] }, '## Context\nNo acceptance criteria section here.');
// a planned story whose AC section is heading-only (prose, no list) — must flag in both
w('empty.md', { id: 'EMPTY', kind: 'story', title: 'heading-only AC', status: 'planned', route: 'skill', priority: 'should', parent: 'DOG', dependencies: [] }, '## Acceptance Criteria\n\nProse describing intent but no enumerated list.');

// --- derive both queues ------------------------------------------------------------------
const { items } = parseItems(itemsDir);
const model = buildModel(items, { now: Date.parse('2026-06-25T00:00:00Z') });
const NEW_groom = new Set(model.queues.groom.needs_grooming);

// OLD queue: replicate the needs_grooming filter with the old detector
const rawById = {};
for (const f of fs.readdirSync(itemsDir)) rawById[f] = fs.readFileSync(path.join(itemsDir, f), 'utf8');
const OLD_groom = new Set();
for (const s of items) {
  if (s.kind === 'epic') continue;
  const raw = Object.values(rawById).find((t) => new RegExp(`^id:\\s*${s.id}\\b`, 'm').test(t)) || '';
  const body = raw.slice(raw.indexOf('---', 3) + 3);
  const oldHas = OLD_hasAc(body);
  if (s.status === 'draft' || ((s.status === 'ready' || s.status === 'planned') && !oldHas)) OLD_groom.add(s.id);
}

// --- assertions --------------------------------------------------------------------------
let pass = 0, fail = 0;
const chk = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('  FAIL:', msg); } };

console.log(`real numbered-AC body sourced from: ${numbered.file}`);
console.log(`real dash-AC body sourced from:     ${dash.file}`);
console.log(`OLD needs_grooming: [${[...OLD_groom].sort().join(', ')}]`);
console.log(`NEW needs_grooming: [${[...NEW_groom].sort().join(', ')}]`);

// before: old detector false-flags the real numbered + dash planned stories
chk(OLD_groom.has('NUM'), 'OLD detector FALSE-flags real numbered-AC story (the bug)');
chk(OLD_groom.has('DASH'), 'OLD detector FALSE-flags real dash-AC story (the bug)');
// after: new detector excludes them
chk(!NEW_groom.has('NUM'), 'NEW detector excludes real numbered-AC story');
chk(!NEW_groom.has('DASH'), 'NEW detector excludes real dash-AC story');
// genuinely ungroomed stories still flag under both
chk(OLD_groom.has('DRAFT') && NEW_groom.has('DRAFT'), 'AC-less draft still flags (old+new)');
chk(OLD_groom.has('EMPTY') && NEW_groom.has('EMPTY'), 'heading-only AC still flags (old+new)');

fs.rmSync(root, { recursive: true, force: true });
console.log(`\nrun-dogfood: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
