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
  counts: { smart: {}, projects: {}, labels: {} }, // FR-4 sidebar badges
  todayOverdue: [], // FR-5 overdue items surfaced atop the Today view
  expanded: {}, // parentId -> true when its subtask block is open
};

const $ = (s) => document.querySelector(s);
function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

// One friendly date everywhere (FR-3/AC3) — delegates to format.js (loaded first).
function friendlyDate(iso) { return (typeof formatDueDate === 'function') ? formatDueDate(iso) : (iso || ''); }
function friendlyOrDash(iso) { return friendlyDate(iso) || '—'; }
function dueClass(iso) { return (typeof dueStatus === 'function') ? dueStatus(iso) : 'none'; }
// Handle → display name (falls back to the handle when the person isn't loaded).
function personName(handle) { const p = (state.people || []).find((x) => x.handle === handle); return p ? (p.name || p.handle) : handle; }

// One chip representation across row, sidebar, and editor (FR-7/FR-10/CC2).
// kind ∈ project|label|person; sigil is the user-facing prefix; onRemove (optional) renders an ✕.
function chip(kind, sigil, text, onRemove) {
  const c = el('span', 'chip chip-' + kind);
  if (sigil) c.appendChild(el('span', 'chip-sigil', sigil));
  c.appendChild(el('span', 'chip-text', text));
  if (onRemove) { const x = el('span', 'chip-x', '✕'); x.onclick = (e) => { e.stopPropagation(); onRemove(); }; c.appendChild(x); }
  return c;
}
// A due-date pill carrying the overdue/upcoming colour semantics (FR-8/AC7). Red only when overdue.
function dueChip(iso, cls) {
  const status = dueClass(iso);
  const span = el('span', (cls || 'row-due') + (status === 'overdue' ? ' overdue' : ''));
  span.appendChild(el('span', 'due-icon', status === 'overdue' ? '⚠' : '🗓'));
  span.appendChild(el('span', null, friendlyDate(iso)));
  span.title = iso;
  return span;
}

async function api(path, opts) {
  const r = await fetch('/api' + path, opts);
  if (r.status === 409) { const j = await r.json().catch(() => ({})); showReloadBanner(); const e = new Error('conflict'); e.conflict = j; throw e; }
  if (!r.ok) { const j = await r.json().catch(() => ({})); const e = new Error(j.detail || j.error || ('HTTP ' + r.status)); e.status = r.status; throw e; }
  return r.json();
}

function showServerModal(show) { $('#server-modal').classList.toggle('hidden', !show); }
function showReloadBanner() { $('#reload-banner').classList.remove('hidden'); }

// ── Sidebar ──
// A nav row with a label span + optional trailing count badge (FR-4). The badge turns
// red (.overdue) only for the Overdue view carrying work — colour-semantics (CC3/FR-8).
function sideItem(cls, label, count, overdue) {
  const a = el('a', cls);
  a.appendChild(el('span', 'side-label', label));
  if (count != null && count > 0) a.appendChild(el('span', 'side-count' + (overdue ? ' overdue' : ''), String(count)));
  return a;
}
function renderSidebar() {
  const sv = $('#smart-views'); sv.innerHTML = '';
  for (const v of SMART_VIEWS) {
    const cls = 'side-item' + (state.view.kind === 'smart' && state.view.key === v.key ? ' active' : '');
    const a = sideItem(cls, v.label, (state.counts.smart || {})[v.key], v.key === 'overdue');
    a.onclick = () => { state.view = { kind: 'smart', key: v.key, q: v.q, label: v.label }; refresh(); };
    sv.appendChild(a);
  }
  const pj = $('#projects'); pj.innerHTML = '';
  const inbox = sideItem('side-item' + (isProj('') ? ' active' : ''), 'Inbox', (state.counts.projects || {})['']);
  inbox.onclick = () => { state.view = { kind: 'project', key: '', label: 'Inbox' }; refresh(); };
  pj.appendChild(inbox);
  for (const p of state.meta.projects) {
    const a = sideItem('side-item' + (isProj(p) ? ' active' : ''), p, (state.counts.projects || {})[p]);
    a.onclick = () => { state.view = { kind: 'project', key: p, label: p }; refresh(); };
    pj.appendChild(a);
  }
  pj.appendChild(inlineAdd('+ Add project', async (name) => {
    await api('/projects', body({ name })); await loadMeta();
    state.view = { kind: 'project', key: lib_slug(name), label: lib_slug(name) }; refresh();
  }));

  const lb = $('#labels'); lb.innerHTML = '';
  for (const l of state.meta.labels) {
    const cls = 'side-item' + (state.view.kind === 'label' && state.view.key === l ? ' active' : '');
    const a = sideItem(cls, '#' + l, (state.counts.labels || {})[l]);
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
async function loadCounts() { try { state.counts = await api('/counts'); } catch (e) { state.counts = { smart: {}, projects: {}, labels: {} }; } }

// ── Task list ──
async function refresh() {
  try { await loadMeta(); await loadPeople(); await loadCounts(); showServerModal(false); }
  catch (e) { showServerModal(true); return; }
  try {
    const sep = viewQuery() ? '&' : '';
    const r = await api('/tasks?' + viewQuery() + sep + 'include_children=1');
    state.tasks = r.tasks;
    // FR-5: surface overdue work atop the Today view so a cold open is never an empty
    // "Nothing here" while tasks are past due (overdue is disjoint from due=today).
    if (isTodayView()) {
      try { const o = await api('/tasks?due=overdue'); state.todayOverdue = o.tasks; }
      catch (e) { state.todayOverdue = []; }
    } else { state.todayOverdue = []; }
    renderSidebar();
    renderList();
    if (state.selected) openDetail(state.selected, true);
  } catch (e) { /* transient */ }
}
function isTodayView() { return state.view.kind === 'smart' && state.view.key === 'today'; }

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

  // FR-5: on the Today view, overdue work leads under its own header.
  const overdue = isTodayView() ? (state.todayOverdue || []).filter((t) => !byId.has(t.id)) : [];
  if (overdue.length) {
    ul.appendChild(el('li', 'list-group-head', 'Overdue · ' + overdue.length));
    for (const t of overdue) ul.appendChild(taskRow(t, 0));
    if (tops.length) ul.appendChild(el('li', 'list-group-head muted-head', 'Today'));
  }

  if (tops.length === 0 && overdue.length === 0) { renderEmptyState(ul); renderListFooter(); return; }
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

// FR-5/AC4: an explanatory empty state with a working CTA (focuses quick-add) — never
// a bare "Nothing here." The copy is keyed to the active view.
function renderEmptyState(ul) {
  const v = state.view;
  let title = 'Nothing here yet', sub = '', cta = 'Add a task';
  if (v.kind === 'smart' && v.key === 'today') { title = 'Nothing due today'; sub = 'You\'re clear for today. Upcoming and Inbox are in the sidebar.'; cta = 'Add a task for today'; }
  else if (v.kind === 'smart' && v.key === 'overdue') { title = 'No overdue tasks'; sub = 'You\'re all caught up.'; }
  else if (v.kind === 'smart' && v.key === 'upcoming') { title = 'Nothing upcoming'; sub = 'No tasks due in the next 30 days.'; }
  else if (v.kind === 'smart' && v.key === 'waiting') { title = 'Nothing waiting'; sub = 'No tasks are blocked on someone else right now.'; }
  else if (v.kind === 'smart' && v.key === 'checkins') { title = 'No check-ins due'; sub = 'Recurring check-ins surface here when they come due.'; }
  else if (v.kind === 'project') { title = 'No tasks in ' + (v.label || 'this project'); sub = 'Add the first one to get started.'; cta = 'Add a task to ' + (v.label || 'project'); }
  else if (v.kind === 'label') { title = 'No tasks tagged ' + (v.label || 'this label'); sub = 'Tag a task with this label and it shows up here.'; }
  const wrap = el('li', 'empty-state');
  wrap.appendChild(el('div', 'empty-title', title));
  if (sub) wrap.appendChild(el('div', 'empty-sub', sub));
  const a = el('div', 'empty-cta', '+ ' + cta);
  a.onclick = () => { const qi = $('#quick-input'); if (qi) qi.focus(); };
  wrap.appendChild(a);
  ul.appendChild(wrap);
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
  // FR-12/AC5: a click anywhere on the row except an interactive control opens the
  // detail panel. The title (rename), check, badges, and pencil all stopPropagation.
  li.onclick = () => openDetail(t.id);
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
  // LNO letter badge (D2): green L / blue N / dashed for overhead, inside a ≥24px hit
  // area (FR-13). Click cycles importance.
  const lno = LNO_BADGE[t.importance || 'neutral'];
  const badge = el('span', 'lno-badge ' + (lno ? lno.cls : 'none'));
  badge.appendChild(el('span', 'lno-dot', lno ? lno.letter : ''));
  badge.title = (t.importance || 'neutral') + ' — click to cycle';
  badge.onclick = (e) => { e.stopPropagation(); cycleImportance(t); };
  li.appendChild(badge);
  const cb = el('span', 'row-check' + (t.status === 'completed' ? ' done' : '')); cb.textContent = t.status === 'completed' ? '☑' : '☐';
  cb.title = t.status === 'completed' ? 'completed' : 'complete';
  cb.onclick = (e) => { e.stopPropagation(); completeTask(t); };
  li.appendChild(cb);
  // Inline-editable title (AC A3): click the text → input; pencil → toolbar.
  const title = el('span', 'row-title', t.title);
  title.onclick = (e) => { e.stopPropagation(); startInlineTitle(li, title, t); };
  li.appendChild(title);
  // FR-7/AC6: inline chips for project / label / assignee when set — one chip
  // representation (CC2). Suppress the chip that just echoes the current view.
  const chips = el('span', 'row-chips');
  if (t.project && !(state.view.kind === 'project' && state.view.key === t.project)) chips.appendChild(chip('project', '#', t.project));
  for (const l of (t.labels || [])) { if (!(state.view.kind === 'label' && state.view.key === l)) chips.appendChild(chip('label', '+', l)); }
  for (const h of (t.people || [])) chips.appendChild(chip('person', '@', personName(h)));
  if (chips.childNodes.length) li.appendChild(chips);
  // FR-3/FR-8/AC7: one friendly date format; red reserved for overdue only.
  if (t.due) li.appendChild(dueChip(t.due));
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
  const prevStatus = t.status || 'pending';
  let r;
  try { r = await api('/tasks/' + t.id + '/complete', body({ expected_version: t.version })); }
  catch (e) { if (!e.conflict) toast(e.message); return; }
  // AC8: a stale "pending" task must not linger in the detail panel with live controls.
  if (state.selected === t.id) clearDetail();
  const spawnedNote = r.spawned ? ' · next due ' + friendlyOrDash(r.spawned.new_due) : '';
  // AC8/FR-11: toast-window Undo reverts the completion (and any spawned recurrence) while visible.
  toast('Completed “' + t.title + '”' + spawnedNote, {
    label: 'Undo',
    onClick: async () => {
      try {
        const ver = (r.task && r.task.version != null) ? r.task.version : (await api('/tasks/' + t.id)).task.version;
        await patch(t.id, { status: prevStatus, completed: '' }, ver);
        if (r.spawned && r.spawned.new_id) {
          try { const sp = await api('/tasks/' + r.spawned.new_id); await api('/tasks/' + r.spawned.new_id + '/drop', body({ expected_version: sp.task.version })); } catch (e) { /* spawned already gone */ }
        }
        refresh();
      } catch (e) { if (!e.conflict) toast('Could not undo: ' + e.message); }
    },
  });
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
  // A new @handle that matches no existing person still needs the dropdown — that is
  // where the "+ Add" rung lives. Only bail when there is genuinely nothing to show
  // (no matches AND not an add-eligible @prefix).
  const canAddPerson = tok.sigil === '@' && tok.prefix &&
    !candidatesFor('@').some((h) => h.toLowerCase() === tok.prefix.toLowerCase());
  if (!matches.length && !canAddPerson) return hideAutocomplete();
  showAutocomplete(input, tok, matches);
}
function showAutocomplete(input, tok, matches) {
  hideAutocomplete();
  acBox = el('div', 'ac-box'); acBox.dataset.active = '0';
  matches.forEach((mtext, i) => {
    const opt = el('div', 'ac-opt' + (i === 0 ? ' active' : ''), tok.sigil + mtext);
    opt._apply = () => applyAutocomplete(input, tok, mtext);
    opt.onmousedown = (e) => { e.preventDefault(); opt._apply(); };
    acBox.appendChild(opt);
  });
  // FR-2/AC2: explicit "+ Add" rung for a new @person — minting only happens on this
  // click, so a typo'd handle that's never clicked creates nothing.
  const exact = candidatesFor('@').some((h) => h.toLowerCase() === (tok.prefix || '').toLowerCase());
  if (tok.sigil === '@' && tok.prefix && !exact) {
    const add = el('div', 'ac-opt ac-add');
    add.appendChild(el('span', null, '+ Add “@' + tok.prefix + '”'));
    add.appendChild(el('span', 'ac-sub', 'new person'));
    add._apply = () => addPersonFromToken(input, tok);
    add.onmousedown = (e) => { e.preventDefault(); add._apply(); };
    acBox.appendChild(add);
  }
  document.body.appendChild(acBox);
  const r = input.getBoundingClientRect();
  acBox.style.left = r.left + 'px';
  acBox.style.top = (r.bottom + window.scrollY + 2) + 'px';
  acBox.style.minWidth = r.width + 'px';
  acBox._input = input; acBox._tok = tok;
}
// FR-2/AC2: mint a person via the existing POST /api/people, then reflect it in the
// PEOPLE sidebar and (via refresh) the editor People field — no page reload.
async function addPersonFromToken(input, tok) {
  let handle = tok.prefix;
  try {
    const r = await api('/people', body({ name: tok.prefix }));
    if (r.person && r.person.handle) handle = r.person.handle;
    await loadPeople(); renderSidebar();
    if (state.selected) openDetail(state.selected, true);
  } catch (e) { if (!e.conflict) toast(e.message); }
  applyAutocomplete(input, tok, handle);
}
function hideAutocomplete() { if (acBox) { acBox.remove(); acBox = null; } }
function onAutocompleteKey(e, input) {
  if (!acBox) return;
  const opts = [...acBox.querySelectorAll('.ac-opt')];
  let active = opts.findIndex((o) => o.classList.contains('active'));
  if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % opts.length; }
  else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + opts.length) % opts.length; }
  else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); const o = opts[active < 0 ? 0 : active]; if (o && o._apply) o._apply(); return; }
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
// FR-6/FR-12: the panel is collapsed (and the list reclaims its width) until a task
// is selected. These two helpers are the single source of the open/closed transition.
function syncDetailCollapse() { $('#app').classList.toggle('detail-collapsed', state.selected == null); }
function clearDetail() {
  state.selected = null;
  $('#detail-body').classList.add('hidden');
  $('#detail-empty').classList.remove('hidden');
  $('#detail-pane').classList.add('empty');
  syncDetailCollapse();
  renderList();
}

async function openDetail(id, keepScroll) {
  state.selected = id;
  let r; try { r = await api('/tasks/' + id); } catch (e) { return; }
  const t = r.task;
  $('#detail-empty').classList.add('hidden');
  const d = $('#detail-body'); d.classList.remove('hidden'); d.innerHTML = '';
  $('#detail-pane').classList.remove('empty');
  syncDetailCollapse();

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
  d.appendChild(labelsField(t));
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
  const dropBtn = el('button', 'btn danger', 'Drop'); dropBtn.onclick = async () => { try { await api('/tasks/' + id + '/drop', body({ expected_version: t.version })); } catch (e) { if (!e.conflict) toast(e.message); return; } clearDetail(); refresh(); };
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
  // FR-3/AC3: friendly due in the editor display (the date field below stays for editing).
  if (t.due) row.appendChild(dueChip(t.due, 'row-due'));
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
// FR-10/AC6 — Labels as a tokenized chip input (one chip representation, CC2) with
// autocomplete from existing labels via a native <datalist> (zero new deps, INV-3).
function labelsField(t) {
  const row = fieldShell('Labels');
  const boxWrap = el('div', 'chip-input');
  const labels = (t.labels || []).slice();
  const save = async (next) => { try { await patch(t.id, { labels: next.join(', ') }, t.version); refresh(); } catch (e) { if (!e.conflict) toast(e.message); } };
  for (const l of labels) boxWrap.appendChild(chip('label', '+', l, () => save(labels.filter((x) => x !== l))));
  const entry = el('input', 'chip-entry'); entry.placeholder = labels.length ? '' : 'add label…';
  const dl = ensureDatalist('labels-datalist', state.meta.labels);
  entry.setAttribute('list', dl);
  entry.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const raw = entry.value.trim().replace(/^\+/, '');
      if (raw && !labels.includes(raw)) save(labels.concat(raw)); else entry.value = '';
    } else if (e.key === 'Backspace' && !entry.value && labels.length) {
      e.preventDefault(); save(labels.slice(0, -1));
    }
  });
  boxWrap.onclick = () => entry.focus();
  boxWrap.appendChild(entry);
  row.appendChild(boxWrap); return row;
}
// Shared <datalist> host for chip-input autocomplete (created once, refreshed each render).
function ensureDatalist(id, values) {
  let dl = document.getElementById(id);
  if (!dl) { dl = el('datalist'); dl.id = id; document.body.appendChild(dl); }
  dl.innerHTML = '';
  for (const v of (values || [])) dl.appendChild(new Option(v));
  return id;
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
// AC A12 / FR-9 — Recurrence: preset <select> + a free field for "every N …".
// The row is full-width (.recur-row) and the free input only appears for a custom
// value — so it never clips and isn't shown when recurrence is none (AC7).
function recurField(t) {
  const row = fieldShell('Recur'); row.classList.add('recur-row');
  const wrap = el('div', 'recur-wrap');
  const sel = el('select', 'field-input recur-preset');
  for (const r of RECUR_PRESETS) sel.appendChild(new Option(r === '' ? 'none' : r, r));
  sel.appendChild(new Option('custom…', '__custom'));
  const free = el('input', 'field-input recur-free'); free.placeholder = 'every 2 weeks · every monday';
  const cur = (t.recur || '').toLowerCase();
  if (cur === '') sel.value = '';
  else if (RECUR_PRESETS.includes(cur)) sel.value = cur;
  else { sel.value = '__custom'; free.value = t.recur || ''; }
  const syncFree = () => free.classList.toggle('hidden', sel.value !== '__custom');
  const save = async (val) => { try { await patch(t.id, { recur: val }, t.version); refresh(); } catch (e) { if (!e.conflict) toast(e.message || 'Invalid recurrence'); } };
  sel.onchange = () => { if (sel.value === '__custom') { syncFree(); free.focus(); return; } free.value = ''; syncFree(); save(sel.value); };
  free.onchange = () => { const v = free.value.trim(); if (v) save(v); };
  syncFree();
  wrap.appendChild(sel); wrap.appendChild(free);
  row.appendChild(wrap); return row;
}

function patch(id, fields, version) {
  return api('/tasks/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expected_version: version, fields }) });
}
function body(obj) { return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }; }

let toastTimer = null;
// FR-11/CC1: a toast with an optional toast-window action (e.g. Undo). The action
// is live ONLY while the toast is visible — dismiss clears it, matching the window.
function toast(msg, action) {
  let t = $('#toast'); if (!t) { t = el('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.innerHTML = '';
  t.appendChild(el('span', 'toast-msg', msg));
  const hide = () => t.classList.remove('show');
  if (action && action.label && typeof action.onClick === 'function') {
    const btn = el('button', 'toast-undo', action.label);
    btn.onclick = () => { hide(); clearTimeout(toastTimer); action.onClick(); };
    t.appendChild(btn);
  }
  t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(hide, action ? 6000 : 2500);
}

// ── Quick-add ──
const quickInput = $('#quick-input');
attachAutocomplete(quickInput);
quickInput.addEventListener('input', renderQuickPreview);

// FR-1/AC1: a lightweight client parse drives the live token-chip preview. The server
// stays authoritative — the post-submit toast is built from the SERVER's parsed task.
const DATE_WORDS = ['today', 'tomorrow', 'yesterday', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'next week', 'this week'];
function parseQuickTokens(text) {
  const out = { people: [], projects: [], labels: [] };
  let m; const re = /([@#+])([A-Za-z0-9._-]+)/g;
  while ((m = re.exec(text))) {
    if (m[1] === '@') out.people.push(m[2]);
    else if (m[1] === '#') out.projects.push(m[2]);
    else out.labels.push(m[2]);
  }
  return out;
}
function detectDuePhrase(text) {
  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return { iso: iso[1], label: friendlyDate(iso[1]) };
  const low = ' ' + text.toLowerCase() + ' ';
  for (const w of DATE_WORDS) if (low.includes(' ' + w + ' ')) return { iso: null, label: w.charAt(0).toUpperCase() + w.slice(1) };
  return null;
}
function renderQuickPreview() {
  const host = $('#quick-preview'); if (!host) return;
  host.innerHTML = '';
  const text = quickInput.value;
  const tk = parseQuickTokens(text);
  for (const p of tk.projects) host.appendChild(chip('project', '#', p));
  for (const l of tk.labels) host.appendChild(chip('label', '+', l));
  for (const h of tk.people) host.appendChild(chip('person', '@', personName(h)));
  const due = detectDuePhrase(text);
  if (due) { const d = el('span', 'qa-due' + (due.iso && dueClass(due.iso) === 'overdue' ? ' overdue' : '')); d.appendChild(el('span', 'due-icon', '🗓')); d.appendChild(el('span', null, due.label)); host.appendChild(d); }
}
function quickAddSummary(t) {
  const dest = t.project ? '#' + t.project : 'Inbox';
  const bits = [];
  if (t.due) bits.push('due ' + friendlyDate(t.due));
  if ((t.people || []).length) bits.push('@' + t.people.map(personName).join(', @'));
  if ((t.labels || []).length) bits.push('+' + t.labels.join(' +'));
  return 'Added to ' + dest + (bits.length ? ' · ' + bits.join(' · ') : '');
}
$('#quick-add').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = quickInput.value.trim(); if (!text) return;
  try {
    const r = await api('/tasks', body({ text }));
    quickInput.value = ''; renderQuickPreview();
    toast(quickAddSummary(r.task));
    refresh();
  } catch (err) { toast(err.message); }
});

$('#reload-btn').addEventListener('click', () => { $('#reload-banner').classList.add('hidden'); if (state.selected) openDetail(state.selected); refresh(); });

// ── Freshness: refetch on focus + light poll while visible ──
window.addEventListener('focus', refresh);
setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 15000);

refresh();
