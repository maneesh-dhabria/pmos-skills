'use strict';
// app.js — /mytasks web client. Talks to the localhost JSON API in serve.js.
// The markdown files are the source of truth; this is a thin, stateless-ish view.
// tf4 overhaul (story 260626-a8a/tf4): inline-everything — sidebar projects/labels/
// people CRUD, inline title edit + @/#/+ autocomplete, nested collapsed subtasks,
// LNO letter-badge (green L / blue N / none — design D2), type/recur/checkin/
// datepicker controls. Zero new deps (I4); every mutation keeps expected_version (I3).

const SMART_VIEWS = [
  { key: 'today', label: 'Today', q: 'due=today' },
  { key: 'upcoming', label: 'Upcoming', q: 'due=next-30' },
  { key: 'overdue', label: 'Overdue', q: 'due=overdue' },
  { key: 'waiting', label: 'Waiting', q: 'status=waiting' },
  { key: 'checkins', label: 'Check-ins due', q: 'checkin_due=1' },
];
const TYPES = ['execution', 'follow-up', 'reminder', 'idea', 'read', 'call'];
const RECUR_PRESETS = ['', 'daily', 'weekly', 'biweekly', 'monthly'];
// LNO letter badge (D2): leverage → green "L", neutral → blue "N", overhead → nothing.
const LNO_BADGE = { leverage: { letter: 'L', cls: 'lev' }, neutral: { letter: 'N', cls: 'neu' }, overhead: null };

const state = {
  view: { kind: 'smart', key: 'today', q: 'due=today', label: 'Today' },
  selected: null, tasks: [], meta: { projects: [], labels: [] }, people: [],
  expanded: {}, // parentId -> true when its subtask block is open
};

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
  pj.appendChild(inlineAdd('+ Add project', async (name) => {
    await api('/projects', body({ name })); await loadMeta();
    state.view = { kind: 'project', key: lib_slug(name), label: lib_slug(name) }; refresh();
  }));

  const lb = $('#labels'); lb.innerHTML = '';
  for (const l of state.meta.labels) {
    const a = el('a', 'side-item' + (state.view.kind === 'label' && state.view.key === l ? ' active' : ''), '#' + l);
    a.onclick = () => { state.view = { kind: 'label', key: l, label: '#' + l }; refresh(); };
    lb.appendChild(a);
  }
  lb.appendChild(inlineAdd('+ Add label', async (name) => {
    await api('/labels', body({ name })); await loadMeta();
    state.view = { kind: 'label', key: lib_slug(name), label: '#' + lib_slug(name) }; refresh();
  }));

  renderPeopleNav();
}

// Mirrors lib.slugify enough for the sidebar's optimistic select-after-add.
function lib_slug(s) { return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

function renderPeopleNav() {
  const pn = $('#people'); if (!pn) return; pn.innerHTML = '';
  for (const p of state.people) {
    const a = el('a', 'side-item', p.name || p.handle);
    a.onclick = () => openPersonEdit(p.handle, a);
    pn.appendChild(a);
  }
  pn.appendChild(inlineAdd('+ Add person', async (name) => {
    await api('/people', body({ name })); await loadPeople(); renderSidebar();
  }));
}

// An inline "+ Add X" affordance: a link that turns into a text input on click
// (no modal / dialog — AC A1/A2). Enter commits via onCommit(value); Esc cancels.
function inlineAdd(label, onCommit) {
  const wrap = el('div', 'inline-add');
  const link = el('a', 'side-item add-link', label);
  const form = el('form', 'inline-add-form hidden');
  const input = el('input', 'inline-add-input'); input.placeholder = label.replace(/^\+\s*/, '');
  form.appendChild(input);
  link.onclick = () => { link.classList.add('hidden'); form.classList.remove('hidden'); input.focus(); };
  const close = () => { form.classList.add('hidden'); link.classList.remove('hidden'); input.value = ''; };
  form.onsubmit = async (e) => {
    e.preventDefault(); const v = input.value.trim(); if (!v) { close(); return; }
    try { await onCommit(v); } catch (err) { if (!err.conflict) toast(err.message); }
    close();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
  input.addEventListener('blur', () => setTimeout(close, 120));
  wrap.appendChild(link); wrap.appendChild(form);
  return wrap;
}

async function openPersonEdit(handle, anchorEl) {
  let r; try { r = await api('/people'); } catch (e) { return; }
  const p = (r.people || []).find((x) => x.handle === handle); if (!p) return;
  // Replace the nav link with an inline name editor (no dialog — AC A2).
  const form = el('form', 'inline-add-form');
  const input = el('input', 'inline-add-input'); input.value = p.name || ''; form.appendChild(input);
  anchorEl.replaceWith(form); input.focus(); input.select();
  const restore = () => renderPeopleNav();
  form.onsubmit = async (e) => {
    e.preventDefault(); const v = input.value.trim();
    if (v && v !== p.name) { try { await api('/people/' + encodeURIComponent(handle), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { name: v } }) }); await loadPeople(); } catch (err) { if (!err.conflict) toast(err.message); } }
    restore();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); restore(); } });
  input.addEventListener('blur', () => setTimeout(restore, 150));
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

// ── Data loads ──
async function loadMeta() { state.meta = await api('/meta'); }
async function loadPeople() { try { const r = await api('/people'); state.people = r.people || []; } catch (e) { state.people = []; } }

// ── Task list ──
async function refresh() {
  try { await loadMeta(); await loadPeople(); showServerModal(false); }
  catch (e) { showServerModal(true); return; }
  try {
    const sep = viewQuery() ? '&' : '';
    const r = await api('/tasks?' + viewQuery() + sep + 'include_children=1');
    state.tasks = r.tasks;
    renderSidebar();
    renderList();
    if (state.selected) openDetail(state.selected, true);
  } catch (e) { /* transient */ }
}

function renderList() {
  $('#view-title').textContent = state.view.label || 'Tasks';
  const ul = $('#task-list'); ul.innerHTML = '';
  const all = state.tasks.slice();
  const byId = new Map(all.map((t) => [t.id, t]));
  const childrenOf = new Map();
  for (const t of all) {
    const p = t.parent || '';
    if (p && byId.has(p)) { if (!childrenOf.has(p)) childrenOf.set(p, []); childrenOf.get(p).push(t); }
  }
  // Top-level = no parent, or a parent not present in this view (then it stands alone).
  let tops = all.filter((t) => !t.parent || !byId.has(t.parent));
  if (isReorderable()) tops.sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9));
  if (tops.length === 0) { ul.appendChild(el('li', 'empty-row', 'Nothing here.')); renderListFooter(); return; }
  for (const t of tops) {
    const kids = childrenOf.get(t.id) || [];
    ul.appendChild(taskRow(t, kids.length));
    if (kids.length) {
      const block = el('li', 'subtask-block' + (state.expanded[t.id] ? '' : ' hidden'));
      const inner = el('ul', 'nested-list');
      for (const c of kids) inner.appendChild(taskRow(c, 0, true));
      block.appendChild(inner);
      ul.appendChild(block);
    }
  }
  renderListFooter();
}

// AC A5 — a persistent "+ Add task" control below the last task row.
function renderListFooter() {
  const foot = $('#list-footer'); foot.innerHTML = '';
  const form = el('form', 'add-task-below'); form.autocomplete = 'off';
  const input = el('input', 'add-task-input'); input.placeholder = '+ Add task';
  form.appendChild(input);
  attachAutocomplete(input);
  form.onsubmit = async (e) => {
    e.preventDefault(); const text = input.value.trim(); if (!text) return;
    try {
      const r = await api('/tasks', body({ text }));
      const t = r.task;
      if (state.view.kind === 'project' && state.view.key && t.project !== state.view.key) await patch(t.id, { project: state.view.key }, t.version);
      if (state.view.kind === 'label' && state.view.key && !(t.labels || []).includes(state.view.key)) await patch(t.id, { labels: (t.labels || []).concat(state.view.key).join(', ') }, t.version);
      input.value = ''; refresh();
    } catch (err) { if (!err.conflict) toast(err.message); }
  };
  foot.appendChild(form);
}

function taskRow(t, childCount, isChild) {
  const li = el('li', 'task-row' + (state.selected === t.id ? ' selected' : '') + (isChild ? ' is-child' : '') + (t.status === 'completed' ? ' completed' : ''));
  li.dataset.id = t.id;
  if (isReorderable() && !isChild) {
    li.draggable = true;
    li.addEventListener('dragstart', (e) => { li.classList.add('dragging'); e.dataTransfer.setData('text/plain', t.id); });
    li.addEventListener('dragend', () => li.classList.remove('dragging'));
    li.addEventListener('dragover', (e) => e.preventDefault());
    li.addEventListener('drop', (e) => { e.preventDefault(); onDrop(t.id); });
  }
  // Expand/collapse chevron (AC A8) for a parent with children.
  if (childCount) {
    const chev = el('span', 'chevron', state.expanded[t.id] ? '▾' : '▸');
    chev.title = childCount + ' subtask' + (childCount === 1 ? '' : 's');
    chev.onclick = (e) => { e.stopPropagation(); state.expanded[t.id] = !state.expanded[t.id]; renderList(); };
    li.appendChild(chev);
  } else {
    li.appendChild(el('span', 'chevron-spacer'));
  }
  // LNO letter badge (D2): green L / blue N / nothing for overhead. Click cycles.
  const lno = LNO_BADGE[t.importance || 'neutral'];
  if (lno) {
    const badge = el('span', 'lno-badge ' + lno.cls, lno.letter);
    badge.title = (t.importance || 'neutral') + ' — click to cycle';
    badge.onclick = (e) => { e.stopPropagation(); cycleImportance(t); };
    li.appendChild(badge);
  } else {
    const slot = el('span', 'lno-badge none'); slot.title = 'overhead — click to cycle';
    slot.onclick = (e) => { e.stopPropagation(); cycleImportance(t); };
    li.appendChild(slot);
  }
  const cb = el('span', 'row-check' + (t.status === 'completed' ? ' done' : '')); cb.textContent = t.status === 'completed' ? '☑' : '☐';
  cb.title = t.status === 'completed' ? 'completed' : 'complete';
  cb.onclick = (e) => { e.stopPropagation(); completeTask(t); };
  li.appendChild(cb);
  // Inline-editable title (AC A3): click the text → input; pencil → toolbar.
  const title = el('span', 'row-title', t.title);
  title.onclick = (e) => { e.stopPropagation(); startInlineTitle(li, title, t); };
  li.appendChild(title);
  if (t.due) li.appendChild(el('span', 'row-due', t.due));
  if (childCount) li.appendChild(el('span', 'row-badge', '▸ ' + childCount + ' subtask' + (childCount === 1 ? '' : 's')));
  if (t.recur) li.appendChild(el('span', 'row-badge', '⟳ ' + t.recur));
  const pencil = el('span', 'row-pencil', '✎'); pencil.title = 'Open editor';
  pencil.onclick = (e) => { e.stopPropagation(); openDetail(t.id); };
  li.appendChild(pencil);
  return li;
}

// AC A3 — turn the title text into an inline input saved on blur/Enter (Esc cancels).
function startInlineTitle(li, titleSpan, t) {
  if (li.querySelector('.inline-title-input')) return;
  const inp = el('input', 'inline-title-input'); inp.value = t.title;
  titleSpan.replaceWith(inp); inp.focus(); inp.select();
  attachAutocomplete(inp);
  let done = false;
  const finish = async (save) => {
    if (done) return; done = true;
    const v = inp.value.trim();
    if (save && v && v !== t.title) { try { await patch(t.id, { title: v }, t.version); refresh(); return; } catch (e) { if (!e.conflict) toast(e.message); } }
    renderList();
  };
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
  });
  inp.addEventListener('blur', () => finish(true));
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

// ── @/#/+ autocomplete (AC A4) ──
// Attaches a token-triggered dropdown to an <input>: a trailing @ → people,
// # → projects, + → labels (keyboard-navigable; selection inserts the token).
let acBox = null;
function attachAutocomplete(input) {
  input.addEventListener('input', () => updateAutocomplete(input));
  input.addEventListener('keydown', (e) => onAutocompleteKey(e, input));
  input.addEventListener('blur', () => setTimeout(hideAutocomplete, 150));
}
function candidatesFor(sigil) {
  if (sigil === '@') return state.people.map((p) => p.handle);
  if (sigil === '#') return state.meta.projects;
  if (sigil === '+') return state.meta.labels;
  return [];
}
function trailingToken(input) {
  const upto = input.value.slice(0, input.selectionStart);
  const m = upto.match(/([@#+])([A-Za-z0-9._-]*)$/);
  if (!m) return null;
  return { sigil: m[1], prefix: m[2], start: m.index, end: input.selectionStart };
}
function updateAutocomplete(input) {
  const tok = trailingToken(input);
  if (!tok) return hideAutocomplete();
  const matches = candidatesFor(tok.sigil).filter((c) => c.toLowerCase().startsWith(tok.prefix.toLowerCase())).slice(0, 8);
  if (!matches.length) return hideAutocomplete();
  showAutocomplete(input, tok, matches);
}
function showAutocomplete(input, tok, matches) {
  hideAutocomplete();
  acBox = el('div', 'ac-box'); acBox.dataset.active = '0';
  matches.forEach((mtext, i) => {
    const opt = el('div', 'ac-opt' + (i === 0 ? ' active' : ''), tok.sigil + mtext);
    opt.onmousedown = (e) => { e.preventDefault(); applyAutocomplete(input, tok, mtext); };
    acBox.appendChild(opt);
  });
  document.body.appendChild(acBox);
  const r = input.getBoundingClientRect();
  acBox.style.left = r.left + 'px';
  acBox.style.top = (r.bottom + window.scrollY + 2) + 'px';
  acBox.style.minWidth = r.width + 'px';
  acBox._input = input; acBox._tok = tok;
}
function hideAutocomplete() { if (acBox) { acBox.remove(); acBox = null; } }
function onAutocompleteKey(e, input) {
  if (!acBox) return;
  const opts = [...acBox.querySelectorAll('.ac-opt')];
  let active = opts.findIndex((o) => o.classList.contains('active'));
  if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % opts.length; }
  else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + opts.length) % opts.length; }
  else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); applyAutocomplete(input, acBox._tok, opts[active].textContent.slice(1)); return; }
  else if (e.key === 'Escape') { e.preventDefault(); hideAutocomplete(); return; }
  else return;
  opts.forEach((o, i) => o.classList.toggle('active', i === active));
}
function applyAutocomplete(input, tok, value) {
  const before = input.value.slice(0, tok.start);
  const after = input.value.slice(tok.end);
  const insert = tok.sigil + value + ' ';
  input.value = before + insert + after;
  const caret = (before + insert).length;
  input.setSelectionRange(caret, caret);
  hideAutocomplete(); input.focus();
}

// ── Detail panel ──
async function openDetail(id, keepScroll) {
  state.selected = id;
  let r; try { r = await api('/tasks/' + id); } catch (e) { return; }
  const t = r.task;
  $('#detail-empty').classList.add('hidden');
  const d = $('#detail-body'); d.classList.remove('hidden'); d.innerHTML = '';
  $('#detail-pane').classList.remove('empty');

  // AC A9 — when this task is a subtask, show its parent + open affordance.
  if (t.parent) {
    const pr = el('div', 'parent-link');
    pr.appendChild(el('span', 'detail-head', 'Parent'));
    let pname = t.parent;
    try { const pj = await api('/tasks/' + t.parent); pname = pj.task.title; } catch (e) { /* keep id */ }
    const a = el('a', 'parent-open', '↰ ' + pname);
    a.onclick = () => openDetail(t.parent);
    pr.appendChild(a); d.appendChild(pr);
  }

  d.appendChild(editableTitle(t));
  d.appendChild(metaRow(t));
  d.appendChild(projectField(t));
  d.appendChild(fieldRow('Labels', (t.labels || []).join(', '), (v) => patch(id, { labels: v }, t.version)));
  d.appendChild(dateField('Due', t.due, (v) => patch(id, { due: v }, t.version)));
  d.appendChild(dateField('Start', t.start, (v) => patch(id, { start: v }, t.version)));
  d.appendChild(peopleField(t));
  d.appendChild(typeField(t));
  d.appendChild(recurField(t));

  // Check-in action with an optional note (AC A10).
  const ci = el('div', 'detail-actions checkin-row');
  const noteIn = el('input', 'checkin-note'); noteIn.placeholder = 'Check-in note (optional)';
  const ciBtn = el('button', 'btn', 'Check in');
  ciBtn.onclick = async () => { try { await api('/tasks/' + id + '/checkin', body({ expected_version: t.version, note: noteIn.value.trim() })); noteIn.value = ''; openDetail(id); refresh(); } catch (e) { if (!e.conflict) toast(e.message); } };
  ci.appendChild(noteIn); ci.appendChild(ciBtn);
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
    const link = el('span', 'subtask-title' + (c.status === 'completed' ? ' done' : ''), c.title); link.onclick = () => openDetail(c.id);
    li.appendChild(cb); li.appendChild(link); subUl.appendChild(li);
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
  row.appendChild(badge('status', t.status));
  row.appendChild(badge('importance', t.importance));
  return row;
}
function badge(k, v) { const b = el('span', 'meta-badge'); b.textContent = v; b.title = k; return b; }

function fieldShell(label) {
  const row = el('div', 'field-row');
  row.appendChild(el('label', 'field-label', label));
  return row;
}
function fieldRow(label, value, onSave) {
  const row = fieldShell(label);
  const inp = el('input', 'field-input'); inp.value = value || '';
  inp.onchange = async () => { try { await onSave(inp.value.trim()); refresh(); } catch (e) { if (!e.conflict) toast(e.message); } };
  row.appendChild(inp); return row;
}
// AC A13 — Project as a <select> ("Inbox" = clear).
function projectField(t) {
  const row = fieldShell('Project');
  const sel = el('select', 'field-input');
  sel.appendChild(new Option('Inbox', ''));
  for (const p of state.meta.projects) sel.appendChild(new Option(p, p));
  sel.value = t.project || '';
  sel.onchange = async () => { try { await patch(t.id, { project: sel.value }, t.version); refresh(); } catch (e) { if (!e.conflict) toast(e.message); } };
  row.appendChild(sel); return row;
}
// AC A13 — Due / Start as native datepickers.
function dateField(label, value, onSave) {
  const row = fieldShell(label);
  const inp = el('input', 'field-input'); inp.type = 'date'; inp.value = value || '';
  inp.onchange = async () => { try { await onSave(inp.value); refresh(); } catch (e) { if (!e.conflict) toast(e.message); } };
  row.appendChild(inp); return row;
}
// AC A13 — People as a multi-select sourced from /api/people (stores handles).
function peopleField(t) {
  const row = fieldShell('People');
  const sel = el('select', 'field-input'); sel.multiple = true; sel.size = Math.min(Math.max(state.people.length, 2), 5);
  const cur = new Set(t.people || []);
  for (const p of state.people) { const o = new Option(p.name || p.handle, p.handle, false, cur.has(p.handle)); sel.appendChild(o); }
  sel.onchange = async () => {
    const picked = [...sel.selectedOptions].map((o) => o.value);
    try { await patch(t.id, { people: picked.join(', ') }, t.version); refresh(); } catch (e) { if (!e.conflict) toast(e.message); }
  };
  row.appendChild(sel); return row;
}
// AC A11 — Type as a <select> of the 6 enum values (D1).
function typeField(t) {
  const row = fieldShell('Type');
  const sel = el('select', 'field-input');
  for (const ty of TYPES) sel.appendChild(new Option(ty, ty));
  sel.value = t.type || 'execution';
  sel.onchange = async () => { try { await patch(t.id, { type: sel.value }, t.version); refresh(); } catch (e) { if (!e.conflict) toast(e.message); } };
  row.appendChild(sel); return row;
}
// AC A12 — Recurrence: preset <select> + a free field for "every N …" / "every <weekday>".
function recurField(t) {
  const row = fieldShell('Recur');
  const wrap = el('div', 'recur-wrap');
  const sel = el('select', 'field-input recur-preset');
  for (const r of RECUR_PRESETS) sel.appendChild(new Option(r === '' ? 'none' : r, r));
  const cur = (t.recur || '').toLowerCase();
  const free = el('input', 'field-input recur-free'); free.placeholder = 'every 2 weeks · every monday';
  if (RECUR_PRESETS.includes(cur)) { sel.value = cur; }
  else { sel.value = ''; free.value = t.recur || ''; }
  const save = async (val) => { try { await patch(t.id, { recur: val }, t.version); refresh(); } catch (e) { if (!e.conflict) toast(e.message || 'Invalid recurrence'); } };
  sel.onchange = () => { free.value = ''; save(sel.value); };
  free.onchange = () => { const v = free.value.trim(); if (v) { sel.value = ''; save(v); } else save(''); };
  wrap.appendChild(sel); wrap.appendChild(free);
  row.appendChild(wrap); return row;
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
const quickInput = $('#quick-input');
attachAutocomplete(quickInput);
$('#quick-add').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = quickInput.value.trim(); if (!text) return;
  try { await api('/tasks', body({ text })); quickInput.value = ''; refresh(); }
  catch (err) { toast(err.message); }
});

$('#reload-btn').addEventListener('click', () => { $('#reload-banner').classList.add('hidden'); if (state.selected) openDetail(state.selected); refresh(); });

// ── Freshness: refetch on focus + light poll while visible ──
window.addEventListener('focus', refresh);
setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 15000);

refresh();
