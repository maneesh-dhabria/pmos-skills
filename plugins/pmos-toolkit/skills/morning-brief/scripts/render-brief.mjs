#!/usr/bin/env node
// Render a morning-brief run-model (JSON) into a self-contained static HTML brief
// (design 02_design.html#brief-artifact, §8). Inline CSS, zero external requests,
// no repo substrate payload — the artifact lives outside any repo (INV-4), so the
// pmos-comments overlay contract does NOT apply here.
//
// Counts are script-computed via lib.assembleManifest (§7/§H) — never LLM-estimated.
// INV-2: EVERY in-window item is rendered at least as an FYI row.
//
//   node render-brief.mjs <model.json> [--out <dir>]   -> writes briefs/YYYY-MM-DD[-N].html, prints abs path
//   node render-brief.mjs --selftest

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { assembleManifest, isoDate, resolveStoreDir, ensureStoreDir } from './lib.mjs';

const TIER_LABEL = { today: 'Needs you today', knowing: 'Worth knowing', fyi: 'FYI' };

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// First non-colliding brief path for a date (D7 — same-day reruns suffix -2, -3…).
export function briefPath(storeDir, date) {
  const dir = path.join(storeDir, 'briefs');
  const base = path.join(dir, `${date}.html`);
  if (!fs.existsSync(base)) return base;
  for (let n = 2; ; n++) {
    const p = path.join(dir, `${date}-${n}.html`);
    if (!fs.existsSync(p)) return p;
  }
}

function coverageLine(man) {
  const parts = [`${man.totals.swept} source${man.totals.swept === 1 ? '' : 's'} swept`];
  if (man.totals.failed) parts.push(`${man.totals.failed} failed`);
  parts.push(`${man.totals.items} item${man.totals.items === 1 ? '' : 's'}`);
  if (man.totals.no_rule_matched) parts.push(`${man.totals.no_rule_matched} unmatched`);
  if (man.totals.beyond_horizon) parts.push(`${man.totals.beyond_horizon} beyond horizon`);
  return parts.join(' · ');
}

function itemRow(it) {
  const why = it.no_rule_matched ? '<span class="no-rule">no rule matched</span>' : esc(it.why || '');
  const link = it.link ? ` <a class="lnk" href="${esc(it.link)}">open ↗</a>` : '';
  return `<div class="item" data-tier="${esc(it.tier)}" data-source="${esc(it.source)}">
    <span class="badge">${esc(it.source)}</span>
    <div class="body"><div class="one-line">${esc(it.summary)}${link}</div>
      <div class="meta"><span class="cat">${esc(it.category || 'uncategorized')}</span> · <span class="why">${why}</span>${it.who ? ` · <span class="who">${esc(it.who)}</span>` : ''}</div>
    </div>
  </div>`;
}

function tierBlock(items, tier) {
  const rows = items.filter((i) => i.tier === tier);
  if (!rows.length) return `<section class="tier tier-${tier}"><h2>${TIER_LABEL[tier]}</h2><p class="empty">Nothing here.</p></section>`;
  return `<section class="tier tier-${tier}"><h2>${TIER_LABEL[tier]} <span class="n">${rows.length}</span></h2>${rows.map(itemRow).join('\n')}</section>`;
}

function fyiBlock(model, man) {
  // FYI collapsed to per-source <details> (§8). Every FYI item is still present.
  const fyi = (model.items || []).filter((i) => i.tier === 'fyi');
  if (!fyi.length) return '<section class="tier tier-fyi"><h2>FYI</h2><p class="empty">Nothing here.</p></section>';
  const bySource = {};
  for (const it of fyi) (bySource[it.source] ||= []).push(it);
  const groups = Object.keys(bySource).sort().map((sid) => {
    const rows = bySource[sid];
    return `<details><summary>${esc(sid)} <span class="n">${rows.length}</span></summary>${rows.map(itemRow).join('\n')}</details>`;
  });
  return `<section class="tier tier-fyi"><h2>FYI <span class="n">${fyi.length}</span></h2>${groups.join('\n')}</section>`;
}

function laneBlock(lane) {
  if (!lane || lane.absent) {
    return `<section class="lane"><h2>/mytasks</h2><p class="empty">No /mytasks store found — lane omitted. <span class="note">(read-only; run /mytasks to create one)</span></p></section>`;
  }
  const bucket = (name, rows) => {
    if (!rows || !rows.length) return '';
    const lis = rows.map((r) => `<li>${esc(r.title)}${r.when ? ` <span class="when">${esc(r.when)}</span>` : ''} <span class="tid">#${esc(r.id)}</span></li>`).join('');
    return `<div class="bkt"><h3>${name} <span class="n">${rows.length}</span></h3><ul>${lis}</ul></div>`;
  };
  const blocks = [bucket('Overdue', lane.overdue), bucket('Due today', lane.due), bucket('Check-ins', lane.checkins), bucket('Waiting on', lane.waiting)].filter(Boolean);
  const inner = blocks.length ? blocks.join('\n') : '<p class="empty">Nothing due, waiting, or checking in.</p>';
  return `<section class="lane"><h2>/mytasks <span class="ro">read-only</span></h2>${inner}</section>`;
}

function manifestBlock(man) {
  const rows = man.sources.map((s) => {
    const state = s.status === 'failed'
      ? `<span class="fail">✗ failed</span> <span class="reason">${esc(s.reason || 'unknown')}</span>`
      : '<span class="ok">✓ swept</span>';
    const shown = `${s.shown.today}/${s.shown.knowing}/${s.shown.fyi}`;
    const beyond = s.beyond_horizon ? `<span class="beyond">${s.beyond_horizon} beyond horizon</span>` : '';
    return `<tr><td>${esc(s.id)}</td><td>${esc(s.kind)}</td><td>${state}</td><td>${s.new}</td><td>${s.carryover}</td><td>${shown}</td><td>${beyond}</td></tr>`;
  }).join('\n');
  const w = man.window || {};
  const win = w.from ? `${isoDate(w.from)} → ${isoDate(w.to)}${w.first_run ? ` (first run · ${w.first_window_days}d)` : ''}` : '—';
  const noRule = man.no_rule_matched.length
    ? `<div class="norule"><strong>No rule matched (${man.no_rule_matched.length}):</strong> ${man.no_rule_matched.map((n) => `${esc(n.summary)} <span class="badge">${esc(n.source)}</span>`).join(' · ')}</div>`
    : '';
  return `<section class="manifest"><h2>Coverage manifest</h2>
    <table><thead><tr><th>source</th><th>kind</th><th>status</th><th>new</th><th>carryover</th><th>shown t/k/f</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p class="window"><strong>Window:</strong> ${esc(win)}</p>
    ${noRule}</section>`;
}

function proposalBlock(model) {
  const props = model.proposals || [];
  if (!props.length) return '';
  const lis = props.map((p) => `<li><span class="act">${esc(p.action)}</span> ${esc(p.summary)}</li>`).join('');
  return `<section class="proposals"><h2>Proposed actions <span class="info">printed for reference — reviewed &amp; confirmed in chat (D4)</span></h2><ul>${lis}</ul></section>`;
}

const CSS = `
:root{--bg:#f8f5ef;--surface:#fff;--border:#e2dac9;--rule:#d9cfbd;--text:#201e1a;--muted:#655e54;--accent:#b8431a;--green:#16a34a;--red:#b91c1c;
--serif:Georgia,"Iowan Old Style",serif;--sans:-apple-system,Segoe UI,Roboto,sans-serif;--mono:"JetBrains Mono",ui-monospace,Menlo,monospace;}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--serif);line-height:1.5;font-size:16px}
main{max-width:860px;margin:0 auto;padding:2rem 1.3rem 4rem}
h1{font-family:var(--sans);font-size:1.5rem;margin:0 0 .15rem}
.sub{color:var(--muted);font-family:var(--sans);font-size:.9rem;margin:0 0 1.5rem}
.sub .flagged{color:var(--red);font-weight:600}
h2{font-family:var(--sans);font-size:1.05rem;margin:1.7rem 0 .6rem;border-bottom:1px solid var(--rule);padding-bottom:.25rem}
h2 .n{font-family:var(--mono);font-size:.72rem;color:var(--muted)}
h2 .info,h2 .ro{font-family:var(--sans);font-size:.72rem;color:var(--muted);font-weight:400}
.manifest table{width:100%;border-collapse:collapse;font-family:var(--sans);font-size:.82rem}
.manifest th{text-align:left;color:var(--muted);font-weight:600;border-bottom:1px solid var(--border);padding:.3rem .4rem}
.manifest td{padding:.3rem .4rem;border-bottom:1px solid var(--border)}
.ok{color:var(--green)}.fail{color:var(--red);font-weight:600}.reason{color:var(--muted);font-size:.9em}
.beyond{color:var(--muted);font-size:.85em}
.window{font-family:var(--sans);font-size:.82rem;color:var(--muted);margin:.5rem 0 0}
.norule{font-family:var(--sans);font-size:.82rem;margin:.5rem 0 0}
.item{display:flex;gap:.6rem;background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:.6rem .75rem;margin:.4rem 0}
.badge{font-family:var(--mono);font-size:.66rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:.1rem .35rem;height:fit-content;white-space:nowrap;color:var(--muted)}
.one-line{font-size:.98rem}
.meta{font-family:var(--sans);font-size:.78rem;color:var(--muted);margin-top:.2rem}
.cat{color:var(--accent)}
.no-rule{color:var(--red)}
.lnk{color:var(--accent);text-decoration:none;font-family:var(--sans);font-size:.78rem}
.empty{color:var(--muted);font-style:italic}
.lane .bkt{margin:.5rem 0}
.lane h3{font-family:var(--sans);font-size:.9rem;margin:.4rem 0 .2rem}
.lane ul{margin:.2rem 0;padding-left:1.1rem;font-size:.92rem}
.lane .when{font-family:var(--mono);font-size:.72rem;color:var(--muted)}
.lane .tid{font-family:var(--mono);font-size:.7rem;color:var(--muted)}
.ro{color:var(--muted)}
details{background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:.4rem .6rem;margin:.4rem 0}
summary{cursor:pointer;font-family:var(--sans);font-size:.9rem}
.proposals .act{font-family:var(--mono);font-size:.72rem;color:var(--accent)}
`;

export function renderBrief(model) {
  const man = assembleManifest(model);
  const date = model.date || (model.window && isoDate(model.window.to)) || '';
  const coverage = coverageLine(man);
  const w = model.window || {};
  const winStr = w.from ? `${isoDate(w.from)} → ${isoDate(w.to)}${w.first_run ? ` · first run (${w.first_window_days}d back)` : ''}` : '';
  const failNote = man.any_failed ? ` · <span class="flagged">⚠ ${man.totals.failed} source(s) failed — see manifest</span>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="pmos:skill" content="morning-brief">
<title>Morning brief — ${esc(date)}</title>
<style>${CSS}</style>
</head>
<body>
<main data-brief="${esc(date)}">
  <h1>Morning brief — ${esc(date)}</h1>
  <p class="sub">${esc(winStr)} · ${esc(coverage)}${failNote}</p>
  ${manifestBlock(man)}
  ${tierBlock(model.items || [], 'today')}
  ${tierBlock(model.items || [], 'knowing')}
  ${laneBlock(model.lane)}
  ${fyiBlock(model, man)}
  ${proposalBlock(model)}
</main>
</body>
</html>
`;
}

// Count of item rows actually present in the HTML (INV-2 self-check).
function renderedItemCount(html) {
  return (html.match(/class="item"/g) || []).length;
}

function writeBrief(modelPath, outDir) {
  const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
  const storeDir = outDir ? path.resolve(outDir) : resolveStoreDir();
  ensureStoreDir(storeDir);
  const date = model.date || (model.window && isoDate(model.window.to));
  const html = renderBrief(model);
  const total = (model.items || []).length;
  if (renderedItemCount(html) !== total) {
    console.error(`INV-2 violation: ${total} items in model but ${renderedItemCount(html)} rendered`);
    process.exit(1);
  }
  const out = briefPath(storeDir, date);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(out);
  return out;
}

function selftest() {
  let pass = 0, fail = 0;
  const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`  FAIL: ${name}`); } };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mb-brief-'));

  const model = {
    date: '2026-07-05',
    window: { from: '2026-06-28T00:00:00.000Z', to: '2026-07-05T09:00:00.000Z', first_run: true, first_window_days: 7, carryover_horizon_days: 14 },
    sources: [
      { id: 'gmail', kind: 'email', priority: 1, status: 'swept', counts: { new: 4, carryover: 2, beyond_horizon: 3 } },
      { id: 'gcal', kind: 'calendar', priority: 2, status: 'swept', counts: { new: 2, carryover: 0, beyond_horizon: 0 } },
      { id: 'notion', kind: 'doc-comments', priority: 3, status: 'failed', reason: 'connector unauthed' },
    ],
    items: [
      { id: 'i1', source: 'gmail', ts: '2026-07-05T07:00:00Z', who: 'Alice', summary: 'Contract needs your sign-off today', link: 'https://mail/x1', category: 'do', tier: 'today', why: 'rule: sign-off = do', no_rule_matched: false },
      { id: 'i2', source: 'gcal', ts: '2026-07-05T09:00:00Z', who: '', summary: 'Standup 9:30', link: '', category: 'defer-track', tier: 'knowing', why: 'calendar today', no_rule_matched: false },
      { id: 'i3', source: 'gmail', ts: '2026-07-04T18:00:00Z', who: 'Newsletter', summary: 'Weekly digest', link: 'https://mail/x3', category: 'drop-FYI', tier: 'fyi', why: '', no_rule_matched: true },
      { id: 'i4', source: 'gmail', ts: '2026-07-04T12:00:00Z', who: 'Bob', summary: 'FYI: office closed Friday', link: '', category: 'drop-FYI', tier: 'fyi', why: 'rule: announcements = FYI', no_rule_matched: false },
    ],
    lane: {
      overdue: [{ id: 't1', title: 'Send Q3 deck', when: '2026-07-02' }],
      due: [{ id: 't2', title: 'Review PR', when: '2026-07-05' }],
      checkins: [], waiting: [{ id: 't3', title: 'Legal review', when: null }],
    },
    proposals: [{ action: 'create-task', summary: 'Sign off contract (from Alice)' }],
  };
  fs.writeFileSync(path.join(tmp, 'model.json'), JSON.stringify(model));

  const html = renderBrief(model);
  ok('renders DOCTYPE', html.startsWith('<!DOCTYPE html>'));
  ok('no external requests (no http src/link href to net)', !/<link[^>]+href="https?:/.test(html) && !/<script[^>]+src=/.test(html));
  ok('INV-2 every item rendered', renderedItemCount(html) === model.items.length);
  ok('failed source flagged in header', html.includes('source(s) failed'));
  ok('manifest has failed reason', html.includes('connector unauthed'));
  ok('manifest shown-by-tier for gmail (1/0/2)', html.includes('1/0/2'));
  ok('no-rule-matched surfaced', html.toLowerCase().includes('no rule matched'));
  ok('beyond-horizon shown', html.includes('3 beyond horizon'));
  ok('today tier present', html.includes('Needs you today'));
  ok('knowing tier present', html.includes('Worth knowing'));
  ok('fyi collapsed <details>', html.includes('<details>') && html.includes('<summary>gmail'));
  ok('lane overdue + waiting rendered', html.includes('Send Q3 deck') && html.includes('Legal review'));
  ok('lane read-only marker', html.includes('read-only'));
  ok('proposals reference + confirmed-in-chat marker', html.includes('confirmed in chat'));

  // suffixing (D7)
  const store = path.join(tmp, 'store');
  fs.mkdirSync(path.join(store, 'briefs'), { recursive: true });
  const p1 = briefPath(store, '2026-07-05');
  fs.writeFileSync(p1, 'x');
  const p2 = briefPath(store, '2026-07-05');
  fs.writeFileSync(p2, 'x');
  const p3 = briefPath(store, '2026-07-05');
  ok('suffixing p1 base', p1.endsWith('2026-07-05.html'));
  ok('suffixing p2 -2', p2.endsWith('2026-07-05-2.html'));
  ok('suffixing p3 -3', p3.endsWith('2026-07-05-3.html'));

  // full write path into a scratch (non-repo) dir
  const out = writeBriefCapture(path.join(tmp, 'model.json'), store);
  ok('write path emits an html file that exists', fs.existsSync(out) && out.endsWith('.html'));

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`render-brief.mjs selftest: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}
// writeBrief but returns path without process.exit noise (selftest helper)
function writeBriefCapture(modelPath, outDir) {
  const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
  const storeDir = path.resolve(outDir);
  ensureStoreDir(storeDir);
  const date = model.date;
  const out = briefPath(storeDir, date);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, renderBrief(model));
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv.includes('--selftest')) { selftest(); }
  else {
    const outIdx = argv.indexOf('--out');
    const outDir = outIdx >= 0 ? argv[outIdx + 1] : null;
    const modelPath = argv.find((a) => !a.startsWith('--') && a !== outDir);
    if (!modelPath) { console.error('usage: node render-brief.mjs <model.json> [--out <dir>] | --selftest'); process.exit(64); }
    writeBrief(modelPath, outDir);
  }
}
