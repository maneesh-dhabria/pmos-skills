'use strict';
// app.js — /mytasks web client. Talks to the localhost JSON API in serve.js.
// The markdown files are the source of truth; this is a thin, stateless-ish view.

const SMART_VIEWS = [
  { key: 'today', label: 'Today', q: 'due=today' },
  { key: 'upcoming', label: 'Upcoming', q: 'due=next-30' },
  { key: 'overdue', label: 'Overdue', q: 'due=overdue' },
  { key: 'waiting', label: 'Waiting', q: 'status=waiting' },
  { key: 'checkins', label: 'Check-ins due', q: 'checkin_due=1' },
];
const LNO = { leverage: '#e5484d', neutral: '#8b8d98', overhead: '#9aa0a6' };

const state = { view: { kind: 'smart', key: 'today', q: 'due=today', label: 'Today' }, selected: null, tasks: [], meta: { projects: [], labels: [] } };

const $ = (s) => document.querySelector(s);
function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

async function api(path, opts) {
  const r = await fetch('/api' + path, opts);
  if (r.status === 409) { const j = await r.json().catch(() => ({})); showReloadBanner(); const e = new Error('conflict'); e.conflict = j; throw e; }
  if (!r.ok) { const j = await r.json().catch(() => ({})); const e = new Error(j.detail || j.error || ('HTTP ' + r.status)); e.status = r.status; throw e; }
  return r.json();
}

function showServerModal(show) { $('#server-modal').classList.toggle('hidden', !show); }
function showReloadBanner() { $('#reload-banner').classList.remove('hidden'); }

// ── Sidebar ──
function renderSidebar() {
  const sv = $('#smart-views'); sv.innerHTML = '';
  for (const v of SMART_VIEWS) {
    const a = el('a', 'side-item' + (state.view.kind === 'smart' && state.view.key === v.key ? ' active' : ''), v.label);
    a.onclick = () => { state.view = { kind: 'smart', key: v.key, q: v.q, label: v.label }; refresh(); };
    sv.appendChild(a);
  }
  const pj = $('#projects'); pj.innerHTML = '';
  const inbox = el('a', 'side-item' + (isProj('') ? ' active' : ''), 'Inbox');
  inbox.onclick = () => { state.view = { kind: 'project', key: '', label: 'Inbox' }; refresh(); };
  pj.appendChild(inbox);
  for (const p of state.meta.projects) {
    const a = el('a', 'side-item' + (isProj(p) ? ' active' : ''), p);
    a.onclick = () => { state.view = { kind: 'project', key: p, label: p }; refresh(); };
    pj.appendChild(a);
  }
  const lb = $('#labels'); lb.innerHTML = '';
  for (const l of state.meta.labels) {
    const a = el('a', 'side-item' + (state.view.kind === 'label' && state.view.key === l ? ' active' : ''), '#' + l);
    a.onclick = () => { state.view = { kind: 'label', key: l, label: '#' + l }; refresh(); };
    lb.appendChild(a);
  }
}
function isProj(p) { return state.view.kind === 'project' && state.view.key === p; }

function viewQuery() {
  const v = state.view;
  if (v.kind === 'smart') return v.q || '';
  if (v.kind === 'project') return 'project=' + encodeURIComponent(v.key);
  if (v.kind === 'label') return 'label=' + encodeURIComponent(v.key);
  return '';
}
function isReorderable() { return state.view.kind === 'project'; }

// ── Task list ──
async function refresh() {
  try {
    const meta = await api('/meta'); state.meta = meta;
    showServerModal(false);
  } catch (e) { showServerModal(true); return; }
  try {
    const r = await api('/tasks?' + viewQuery());
    state.tasks = r.tasks;
    renderSidebar();
    renderList();
    if (state.selected) openDetail(state.selected, true);
  } catch (e) { /* transient */ }
}

function renderList() {
  $('#view-title').textContent = state.view.label || 'Tasks';
  const ul = $('#task-list'); ul.innerHTML = '';
  let tasks = state.tasks.slice();
  if (isReorderable()) tasks.sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9));
  if (tasks.length === 0) { ul.appendChild(el('li', 'empty-row', 'Nothing here.')); return; }
  for (const t of tasks) ul.appendChild(taskRow(t));
}

function taskRow(t) {
  const li = el('li', 'task-row' + (state.selected === t.id ? ' selected' : ''));
  li.dataset.id = t.id;
  if (isReorderable()) {
    li.draggable = true;
    li.addEventListener('dragstart', (e) => { li.classList.add('dragging'); e.dataTransfer.setData('text/plain', t.id); });
    li.addEventListener('dragend', () => li.classList.remove('dragging'));
    li.addEventListener('dragover', (e) => e.preventDefault());
    li.addEventListener('drop', (e) => { e.preventDefault(); onDrop(t.id); });
  }
  const flag = el('span', 'lno-flag'); flag.style.background = LNO[t.importance] || LNO.neutral;
  flag.title = t.importance; flag.onclick = (e) => { e.stopPropagation(); cycleImportance(t); };
  li.appendChild(flag);
  const cb = el('span', 'row-check' + (t.status === 'completed' ? ' done' : '')); cb.textContent = t.status === 'completed' ? '☑' : '☐';
  cb.onclick = (e) => { e.stopPropagation(); completeTask(t); };
  li.appendChild(cb);
  const title = el('span', 'row-title', t.title); li.appendChild(title);
  if (t.due) li.appendChild(el('span', 'row-due', t.due));
  if (t.parent) li.appendChild(el('span', 'row-badge', '↳ subtask'));
  if (t.recur) li.appendChild(el('span', 'row-badge', '⟳ ' + t.recur));
  li.onclick = () => openDetail(t.id);
  return li;
}

async function onDrop(targetId) {
  const dragging = $('#task-list .dragging'); if (!dragging) return;
  const draggedId = dragging.dataset.id; if (draggedId === targetId) return;
  const ids = [...$('#task-list').children].map((c) => c.dataset.id).filter(Boolean);
  const from = ids.indexOf(draggedId), to = ids.indexOf(targetId);
  ids.splice(to, 0, ids.splice(from, 1)[0]);
  await api('/tasks/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project: state.view.key, order: ids }) });
  refresh();
}

const IMP_CYCLE = ['leverage', 'neutral', 'overhead'];
async function cycleImportance(t) {
  const next = IMP_CYCLE[(IMP_CYCLE.indexOf(t.importance) + 1) % 3];
  await patch(t.id, { importance: next }, t.version); refresh();
}
async function completeTask(t) {
  if (t.status === 'completed') return;
  try { const r = await api('/tasks/' + t.id + '/complete', body({ expected_version: t.version })); if (r.spawned) toast('Spawned next instance due ' + (r.spawned.new_due || '—')); }
  catch (e) { if (!e.conflict) toast(e.message); }
  if (state.selected === t.id) state.selected = null;
  refresh();
}

// ── Detail panel ──
async function openDetail(id, keepScroll) {
  state.selected = id;
  let r; try { r = await api('/tasks/' + id); } catch (e) { return; }
  const t = r.task;
  $('#detail-empty').classList.add('hidden');
  const d = $('#detail-body'); d.classList.remove('hidden'); d.innerHTML = '';
  $('#detail-pane').classList.remove('empty');

  d.appendChild(editableTitle(t));
  d.appendChild(metaRow(t));
  d.appendChild(fieldRow('Project', t.project || 'Inbox', (v) => patch(id, { project: v === 'Inbox' ? '' : v }, t.version)));
  d.appendChild(fieldRow('Labels', (t.labels || []).join(', '), (v) => patch(id, { labels: v }, t.version)));
  d.appendChild(fieldRow('Due', t.due, (v) => patch(id, { due: v }, t.version)));
  d.appendChild(fieldRow('Start', t.start, (v) => patch(id, { start: v }, t.version)));
  d.appendChild(fieldRow('People', (t.people || []).join(', '), (v) => patch(id, { people: v }, t.version)));
  d.appendChild(fieldRow('Recur', t.recur, (v) => patch(id, { recur: v }, t.version)));

  // Check-in action
  const ci = el('div', 'detail-actions');
  const ciBtn = el('button', 'btn', 'Check in'); ciBtn.onclick = async () => { await api('/tasks/' + id + '/checkin', body({ expected_version: t.version, note: '' })); openDetail(id); refresh(); };
  ci.appendChild(ciBtn);
  const dropBtn = el('button', 'btn danger', 'Drop'); dropBtn.onclick = async () => { await api('/tasks/' + id + '/drop', body({ expected_version: t.version })); state.selected = null; $('#detail-body').classList.add('hidden'); $('#detail-empty').classList.remove('hidden'); refresh(); };
  ci.appendChild(dropBtn);
  d.appendChild(ci);

  // Subtasks
  const sub = el('div', 'subtasks');
  sub.appendChild(el('div', 'detail-head', 'Subtasks'));
  const subUl = el('ul', 'subtask-list');
  for (const c of (t.subtasks || [])) {
    const li = el('li', 'subtask');
    const cb = el('span', 'row-check' + (c.status === 'completed' ? ' done' : '')); cb.textContent = c.status === 'completed' ? '☑' : '☐';
    cb.onclick = async () => { if (c.status !== 'completed') { await api('/tasks/' + c.id + '/complete', body({ expected_version: c.version })); openDetail(id); refresh(); } };
    li.appendChild(cb); li.appendChild(el('span', null, c.title)); subUl.appendChild(li);
  }
  sub.appendChild(subUl);
  const subForm = document.createElement('form'); subForm.className = 'subtask-add';
  const subIn = el('input'); subIn.placeholder = '+ Add subtask'; subForm.appendChild(subIn);
  subForm.onsubmit = async (e) => { e.preventDefault(); if (!subIn.value.trim()) return; await api('/tasks', body({ fields: { title: subIn.value.trim(), parent: id } })); subIn.value = ''; openDetail(id); refresh(); };
  sub.appendChild(subForm);
  d.appendChild(sub);

  // Check-ins log (from body)
  if (t.body && /##\s+Check-ins/.test(t.body)) {
    const log = el('div', 'checkins'); log.appendChild(el('div', 'detail-head', 'Check-ins'));
    const pre = el('pre', 'checkin-log', t.body.split(/##\s+Check-ins/)[1].split(/\n##\s/)[0].trim());
    log.appendChild(pre); d.appendChild(log);
  }
  renderList();
}

function editableTitle(t) {
  const h = el('input', 'detail-title'); h.value = t.title;
  h.onchange = () => patch(t.id, { title: h.value }, t.version).then(() => refresh());
  return h;
}
function metaRow(t) {
  const row = el('div', 'detail-meta');
  row.appendChild(badge('type', t.type));
  row.appendChild(badge('status', t.status));
  row.appendChild(badge('importance', t.importance));
  return row;
}
function badge(k, v) { const b = el('span', 'meta-badge'); b.textContent = v; b.title = k; return b; }
function fieldRow(label, value, onSave) {
  const row = el('div', 'field-row');
  row.appendChild(el('label', 'field-label', label));
  const inp = el('input', 'field-input'); inp.value = value || '';
  inp.onchange = async () => { try { await onSave(inp.value.trim()); refresh(); } catch (e) { if (!e.conflict) toast(e.message); } };
  row.appendChild(inp); return row;
}

function patch(id, fields, version) {
  return api('/tasks/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expected_version: version, fields }) });
}
function body(obj) { return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }; }

let toastTimer = null;
function toast(msg) {
  let t = $('#toast'); if (!t) { t = el('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ── Quick-add ──
$('#quick-add').addEventListener('submit', async (e) => {
  e.preventDefault();
  const inp = $('#quick-input'); const text = inp.value.trim(); if (!text) return;
  try { await api('/tasks', body({ text })); inp.value = ''; refresh(); }
  catch (err) { toast(err.message); }
});

$('#reload-btn').addEventListener('click', () => { $('#reload-banner').classList.add('hidden'); if (state.selected) openDetail(state.selected); refresh(); });

// ── Freshness: refetch on focus + light poll while visible ──
window.addEventListener('focus', refresh);
setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 15000);

refresh();
