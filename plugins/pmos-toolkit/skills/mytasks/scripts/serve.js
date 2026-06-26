#!/usr/bin/env node
// serve.js — zero-dep local server + JSON API for the /mytasks web UI (story 260613-yfr).
//
// Adapts the comments substrate serve.js (_shared/html-authoring/assets/serve.js):
// hard-binds 127.0.0.1, --port=0, --pid-file (atomic JSON), --idle auto-shutdown,
// port scan, signal cleanup, temp-then-rename atomic writes. Adds the task JSON API
// over ~/.pmos/tasks/items/*.md and serves the single-file web app from ./webapp/.
//
// STATELESS wrt task data — every request re-reads the files (design §3). NEVER
// deletes a task file (done/drop are status changes; archive is move-not-delete).
// Localhost-only; rejects non-loopback Origin on mutations (CSRF guard).

'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const lib = require('./lib.js');
const registry = require('./registry.js');
const people = require('./people.js');
const { spawnRecurrence } = require('./recur.js');

const BIND_HOST = '127.0.0.1';
const DEFAULT_BASE_PORT = 8780;
const PORT_SCAN_LIMIT = 12;
const DEFAULT_IDLE_SEC = 300;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const WEBAPP_DIR = path.join(__dirname, 'webapp');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ── id minting — prefer the sibling mint-id.mjs (the §K minter), fall back to an
// inline crypto mint so the server never hard-depends on the path resolving. ──
const crypto = require('crypto');
const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';
function inlineMint() {
  const d = new Date();
  const ymd = String(d.getFullYear() % 100).padStart(2, '0') +
    String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  const b = crypto.randomBytes(3);
  let r = ''; for (let i = 0; i < 3; i++) r += ALPHABET[b[i] % 32];
  return `${ymd}-${r}`;
}
let _mint = inlineMint;
async function loadMinter() {
  const p = path.join(__dirname, '..', '..', 'backlog', 'scripts', 'mint-id.mjs');
  try {
    const mod = await import('file://' + p);
    if (typeof mod.mintId === 'function') _mint = () => mod.mintId();
  } catch (_) { /* keep inline fallback */ }
}
function mintId() { return _mint(); }

function parseArgs(argv) {
  const out = { tasksDir: defaultTasksDir(), peopleDir: null, port: null, pidFile: null, idleSec: DEFAULT_IDLE_SEC };
  const take = (i, name) => {
    const a = argv[i];
    if (a === name) return [argv[i + 1], i + 1];
    if (a.startsWith(name + '=')) return [a.slice(name.length + 1), i];
    return [null, i];
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]; let v, ni;
    if (a === '--help' || a === '-h') { out.help = true; continue; }
    [v, ni] = take(i, '--tasks-dir'); if (v !== null) { out.tasksDir = path.resolve(v); i = ni; continue; }
    [v, ni] = take(i, '--people-dir'); if (v !== null) { out.peopleDir = path.resolve(v); i = ni; continue; }
    [v, ni] = take(i, '--port'); if (v !== null) { out.port = parseInt(v, 10); i = ni; continue; }
    [v, ni] = take(i, '--pid-file'); if (v !== null) { out.pidFile = v; i = ni; continue; }
    [v, ni] = take(i, '--idle'); if (v !== null) { out.idleSec = parseFloat(v); i = ni; continue; }
  }
  return out;
}
function defaultTasksDir() { return path.join(os.homedir(), '.pmos', 'tasks'); }

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function sendText(res, status, body, ctype) {
  res.writeHead(status, { 'Content-Type': ctype || 'text/plain; charset=utf-8' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let received = 0; const chunks = [];
    req.on('data', (c) => {
      received += c.length;
      if (received > MAX_BODY_BYTES) { reject(new Error('payload-too-large')); try { req.destroy(); } catch (_) {} return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw.trim()) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

// Reject a cross-origin write (the page is same-origin; a foreign Origin = CSRF).
function localOrigin(req) {
  const o = req.headers.origin;
  if (!o) return true; // same-origin fetches often omit Origin
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(o);
}

// ── Item → API JSON shape ──
function itemJson(it) {
  return {
    id: it.fm.id, version: it.version,
    title: it.fm.title || '', type: it.fm.type || '', importance: it.fm.importance || 'neutral',
    status: it.fm.status || 'pending', project: it.fm.project || '', parent: it.fm.parent || '',
    order: it.fm.order === '' || it.fm.order == null ? null : Number(it.fm.order),
    recur: it.fm.recur || '', people: it.fm.people || [], labels: it.fm.labels || [],
    links: it.fm.links || [], due: it.fm.due || '', start: it.fm.start || '',
    checkin: it.fm.checkin || '', next_checkin: it.fm.next_checkin || '',
    created: it.fm.created || '', updated: it.fm.updated || '', completed: it.fm.completed || '',
    body: it.body || '',
  };
}

// ── API ──
async function handleApi(tasksDir, peopleDir, req, res, pathname, query) {
  const today = lib.isoToday();
  const mutating = req.method !== 'GET';
  if (mutating && !localOrigin(req)) return sendJson(res, 403, { error: 'forbidden-origin' });

  // GET /api/meta — the sorted, deduped UNION of registry entries and values derived
  // from task frontmatter (design D5: a registry-only empty container still appears).
  if (pathname === '/api/meta' && req.method === 'GET') {
    const items = lib.loadAllItems(tasksDir);
    const reg = registry.readRegistry(tasksDir);
    const projects = new Set(reg.projects), labels = new Set(reg.labels);
    for (const it of items) {
      if (it.fm.project) projects.add(it.fm.project);
      for (const l of (it.fm.labels || [])) labels.add(l);
    }
    return sendJson(res, 200, { projects: [...projects].sort(), labels: [...labels].sort() });
  }

  // ── Registry: POST /api/projects, POST /api/labels (add empty container, design D5) ──
  if ((pathname === '/api/projects' || pathname === '/api/labels') && req.method === 'POST') {
    const kind = pathname === '/api/projects' ? 'projects' : 'labels';
    let body; try { body = await readBody(req); } catch (e) { return sendJson(res, 400, { error: 'bad-body' }); }
    const raw = (body.name || '').toString().trim();
    if (!raw) return sendJson(res, 400, { error: 'validation', detail: 'name is required.' });
    const slug = lib.slugify(raw);
    // A name already present (in registry OR derived from a task) is a no-op success —
    // the registry only adds visibility, never duplicates what tasks already surface.
    const reg = registry.readRegistry(tasksDir);
    const derived = new Set();
    for (const it of lib.loadAllItems(tasksDir)) {
      if (kind === 'projects') { if (it.fm.project) derived.add(it.fm.project); }
      else for (const l of (it.fm.labels || [])) derived.add(l);
    }
    if (reg[kind].includes(slug) || derived.has(slug)) return sendJson(res, 200, { [kind]: reg[kind] });
    const list = registry.addRegistryEntry(tasksDir, kind, raw);
    return sendJson(res, 200, { [kind]: list });
  }

  // ── People: shared ~/.pmos/people store (design D6) ──
  if (pathname === '/api/people' && req.method === 'GET') {
    return sendJson(res, 200, { people: people.listPeople(peopleDir) });
  }
  if (pathname === '/api/people' && req.method === 'POST') {
    let body; try { body = await readBody(req); } catch (e) { return sendJson(res, 400, { error: 'bad-body' }); }
    const r = people.createPerson(peopleDir, body || {});
    if (r.error === 'missing-name') return sendJson(res, 400, { error: 'validation', detail: 'name is required.' });
    if (r.error === 'duplicate-handle') return sendJson(res, 409, { error: 'duplicate-handle', person: r.existing });
    if (r.error) return sendJson(res, 400, { error: r.error });
    return sendJson(res, 201, { person: r.record });
  }
  const pm = pathname.match(/^\/api\/people\/([^/]+)$/);
  if (pm && req.method === 'PATCH') {
    const handle = decodeURIComponent(pm[1]);
    let body; try { body = await readBody(req); } catch (e) { return sendJson(res, 400, { error: 'bad-body' }); }
    const r = people.patchPerson(peopleDir, handle, body.fields || {});
    if (r.error === 'not-found') return sendJson(res, 404, { error: 'not-found', handle });
    if (r.error) return sendJson(res, 400, { error: r.error });
    return sendJson(res, 200, { person: r.record });
  }

  // GET /api/tasks  (+ filters)
  if (pathname === '/api/tasks' && req.method === 'GET') {
    let items = lib.loadAllItems(tasksDir);
    const includeDone = query.get('include_done') === '1';
    if (!includeDone) items = items.filter((it) => !['completed', 'dropped'].includes(it.fm.status));
    const f = (k) => query.get(k);
    if (f('status')) items = items.filter((it) => it.fm.status === f('status'));
    if (f('type')) items = items.filter((it) => it.fm.type === f('type'));
    if (f('importance')) items = items.filter((it) => (it.fm.importance || 'neutral') === f('importance'));
    if (f('project')) items = items.filter((it) => (it.fm.project || '') === f('project'));
    if (f('person')) items = items.filter((it) => (it.fm.people || []).includes(f('person')));
    if (f('label')) items = items.filter((it) => (it.fm.labels || []).includes(f('label')));
    if (f('parent')) items = items.filter((it) => (it.fm.parent || '') === f('parent'));
    if (query.get('recurring') === '1') items = items.filter((it) => !!it.fm.recur);
    const dw = f('due');
    if (dw) items = items.filter((it) => dueWindow(it.fm, dw, today));
    if (query.get('checkin_due') === '1') items = items.filter((it) => it.fm.next_checkin && it.fm.next_checkin <= today);
    items = lib.listSort(items, { byProject: f('project') !== null || f('parent') !== null });
    // include_children=1: when a parent survives the filter/view, attach its subtasks
    // even if a child would not have matched on its own (deduped; client nests via
    // each child's `parent`). No flag → behavior is byte-identical to before.
    if (query.get('include_children') === '1') {
      const all = lib.loadAllItems(tasksDir);
      const childrenOf = new Map();
      for (const c of all) {
        const p = c.fm.parent || '';
        if (!p) continue;
        if (!childrenOf.has(p)) childrenOf.set(p, []);
        childrenOf.get(p).push(c);
      }
      const included = new Set(items.map((it) => it.fm.id));
      const out = [];
      for (const it of items) {
        out.push(it);
        const kids = lib.listSort((childrenOf.get(it.fm.id) || []).filter((c) => !included.has(c.fm.id)), {});
        for (const k of kids) { included.add(k.fm.id); out.push(k); }
      }
      items = out;
    }
    return sendJson(res, 200, { tasks: items.map(itemJson) });
  }

  // POST /api/tasks  (create — quick-add text or explicit fields)
  if (pathname === '/api/tasks' && req.method === 'POST') {
    let body; try { body = await readBody(req); } catch (e) { return sendJson(res, 400, { error: 'bad-body', detail: String(e.message || e) }); }
    const id = mintId();
    let fm;
    if (typeof body.text === 'string' && body.text.trim()) {
      const p = lib.parseQuickAdd(body.text, today);
      fm = newItemFm(id, today, { title: p.title, type: p.type, due: p.due, project: p.project, people: p.people, labels: p.labels });
    } else {
      const flds = body.fields || {};
      const err = validateAll(flds);
      if (err) return sendJson(res, 400, { error: 'validation', detail: err });
      fm = newItemFm(id, today, flds);
    }
    if (fm.parent) {
      const pf = lib.findItemFile(tasksDir, fm.parent);
      if (!pf) return sendJson(res, 400, { error: 'validation', detail: `No item with id ${fm.parent} to set as parent.` });
    }
    const slug = lib.slugify(fm.title);
    const file = path.join(lib.itemsDir(tasksDir), `${id}-${slug}.md`);
    fs.mkdirSync(lib.itemsDir(tasksDir), { recursive: true });
    lib.writeItemAtomic(file, lib.serializeItem(fm, ''));
    lib.regenerateIndex(tasksDir, { today });
    return sendJson(res, 201, { task: itemJson(lib.readItem(file)) });
  }

  // POST /api/tasks/reorder  { project, order:[id,...] }
  if (pathname === '/api/tasks/reorder' && req.method === 'POST') {
    let body; try { body = await readBody(req); } catch (e) { return sendJson(res, 400, { error: 'bad-body' }); }
    const ids = Array.isArray(body.order) ? body.order : [];
    let n = 0;
    ids.forEach((id, idx) => {
      const file = lib.findItemFile(tasksDir, id);
      if (!file) return;
      const it = lib.readItem(file);
      it.fm.order = String(idx + 1); it.fm.updated = today;
      lib.writeItemAtomic(file, lib.serializeItem(it.fm, it.body)); n++;
    });
    lib.regenerateIndex(tasksDir, { today });
    return sendJson(res, 200, { reordered: n });
  }

  // /api/tasks/:id  and  /api/tasks/:id/{checkin,complete,drop}
  const m = pathname.match(/^\/api\/tasks\/([^/]+)(?:\/(checkin|complete|drop))?$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    const action = m[2];
    const file = lib.findItemFile(tasksDir, id);
    if (!file) return sendJson(res, 404, { error: 'not-found', id });
    const it = lib.readItem(file);

    if (!action && req.method === 'GET') {
      const json = itemJson(it);
      json.subtasks = lib.loadAllItems(tasksDir)
        .filter((c) => (c.fm.parent || '') === id)
        .sort((a, b) => ord(a.fm) - ord(b.fm) || String(a.fm.due || '~').localeCompare(String(b.fm.due || '~')))
        .map(itemJson);
      return sendJson(res, 200, { task: json });
    }

    let body; try { body = await readBody(req); } catch (e) { return sendJson(res, 400, { error: 'bad-body' }); }

    // Optimistic concurrency — every mutation carries expected_version.
    if (body.expected_version != null && body.expected_version !== it.version) {
      return sendJson(res, 409, { error: 'version-conflict', current_version: it.version, task: itemJson(it) });
    }

    if (!action && req.method === 'PATCH') {
      const flds = body.fields || {};
      const err = validateAll(flds);
      if (err) return sendJson(res, 400, { error: 'validation', detail: err });
      if (flds.parent) {
        if (flds.parent === id) return sendJson(res, 400, { error: 'validation', detail: 'A task cannot be its own parent.' });
        const pf = lib.findItemFile(tasksDir, flds.parent);
        if (!pf) return sendJson(res, 400, { error: 'validation', detail: `No item with id ${flds.parent} to set as parent.` });
        const parentItem = lib.readItem(pf);
        if ((parentItem.fm.parent || '') === id) return sendJson(res, 400, { error: 'validation', detail: 'That would create a parent/subtask cycle.' });
      }
      let renamed = file;
      for (const [k, v] of Object.entries(flds)) it.fm[k] = lib.LIST_FIELDS.has(k) ? toList(v) : v;
      it.fm.updated = today;
      if ('title' in flds) {
        renamed = path.join(lib.itemsDir(tasksDir), `${id}-${lib.slugify(it.fm.title)}.md`);
        if (renamed !== file) { lib.writeItemAtomic(renamed, lib.serializeItem(it.fm, it.body)); fs.unlinkSync(file); }
        else lib.writeItemAtomic(file, lib.serializeItem(it.fm, it.body));
      } else {
        lib.writeItemAtomic(file, lib.serializeItem(it.fm, it.body));
      }
      lib.regenerateIndex(tasksDir, { today });
      return sendJson(res, 200, { task: itemJson(lib.readItem(renamed)) });
    }

    if (action === 'checkin' && req.method === 'POST') {
      const note = (body.note || '').toString();
      it.body = lib.appendToSection(it.body, 'Check-ins', `- ${today}: ${note}`.trimEnd());
      it.fm.next_checkin = advanceCheckinField(it.fm.checkin, today);
      it.fm.updated = today;
      lib.writeItemAtomic(file, lib.serializeItem(it.fm, it.body));
      lib.regenerateIndex(tasksDir, { today });
      return sendJson(res, 200, { task: itemJson(lib.readItem(file)) });
    }

    if (action === 'complete' && req.method === 'POST') {
      it.fm.status = 'completed'; it.fm.completed = today; it.fm.updated = today;
      let spawned = null;
      if (it.fm.recur) {
        const r = spawnRecurrence({ fm: it.fm, body: it.body }, { mintId, today });
        if (r) {
          it.body = lib.appendToSection(it.body, 'Notes', r.logLine);
          const nf = path.join(lib.itemsDir(tasksDir), `${r.new_id}-${r.slug}.md`);
          lib.writeItemAtomic(nf, lib.serializeItem(r.newFm, r.newBody));
          spawned = { new_id: r.new_id, new_due: r.new_due };
        }
      }
      lib.writeItemAtomic(file, lib.serializeItem(it.fm, it.body));
      lib.regenerateIndex(tasksDir, { today });
      return sendJson(res, 200, { task: itemJson(lib.readItem(file)), spawned });
    }

    if (action === 'drop' && req.method === 'POST') {
      it.fm.status = 'dropped'; it.fm.completed = today; it.fm.updated = today;
      const reason = (body.reason || '').toString();
      if (reason) it.body = lib.appendToSection(it.body, 'Notes', `- ${today}: dropped — ${reason}`);
      lib.writeItemAtomic(file, lib.serializeItem(it.fm, it.body));
      lib.regenerateIndex(tasksDir, { today });
      return sendJson(res, 200, { task: itemJson(lib.readItem(file)) });
    }

    return sendJson(res, 405, { error: 'method-not-allowed' });
  }

  return sendJson(res, 404, { error: 'no-route', path: pathname });
}

function ord(fm) { return (fm.order === '' || fm.order == null) ? Number.MAX_SAFE_INTEGER : Number(fm.order); }
function toList(v) { return Array.isArray(v) ? v : (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : []); }
function advanceCheckinField(cadence, today) {
  switch (cadence) {
    case 'daily': return lib.addDays(today, 1);
    case 'weekly': return lib.addDays(today, 7);
    case 'biweekly': return lib.addDays(today, 14);
    case 'monthly': return lib.addMonthsClamp(today, 1);
    default: return '';
  }
}
function dueWindow(fm, win, today) {
  const d = fm.due; if (!d) return false;
  if (win === 'today') return d === today;
  if (win === 'overdue') return d < today && !['completed', 'dropped'].includes(fm.status);
  if (win === 'this-week') return d >= today && d <= lib.addDays(today, 7);
  if (win === 'next-30') return d >= today && d <= lib.addDays(today, 30);
  return true;
}
function newItemFm(id, today, flds) {
  return {
    schema_version: 2, id, title: flds.title || 'untitled',
    type: flds.type || 'execution', importance: flds.importance || 'neutral',
    status: flds.status || 'pending', project: flds.project || '', parent: flds.parent || '',
    order: flds.order || '', recur: flds.recur || '',
    people: toList(flds.people), labels: toList(flds.labels), links: toList(flds.links),
    due: flds.due || '', start: flds.start || '', checkin: flds.checkin || '', next_checkin: flds.next_checkin || '',
    created: today, updated: today, completed: '',
  };
}
function validateAll(flds) {
  for (const [k, v] of Object.entries(flds)) {
    const err = lib.validateField(k, v);
    if (err) return err;
  }
  return null;
}

// ── Static + request dispatch ──
function staticServe(res, reqPath) {
  let rel = reqPath.split('?')[0];
  if (rel === '/' || rel === '') rel = '/index.html';
  let decoded; try { decoded = decodeURIComponent(rel); } catch (_) { return sendText(res, 400, 'Bad Request\n'); }
  const joined = path.normalize(path.join(WEBAPP_DIR, decoded));
  if (joined !== WEBAPP_DIR && !joined.startsWith(WEBAPP_DIR + path.sep)) return sendText(res, 403, 'Forbidden\n');
  fs.readFile(joined, (err, data) => {
    if (err) return sendText(res, 404, 'Not Found\n');
    const ext = path.extname(joined).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}

function handler(tasksDir, peopleDir) {
  return (req, res) => {
    let u; try { u = new URL(req.url || '/', 'http://x'); } catch (_) { return sendText(res, 400, 'Bad Request\n'); }
    if (u.pathname.startsWith('/api/')) {
      handleApi(tasksDir, peopleDir, req, res, u.pathname, u.searchParams).catch((e) => {
        sendJson(res, 500, { error: 'internal', detail: String(e && e.message || e) });
      });
      return;
    }
    return staticServe(res, req.url || '/');
  };
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    const onErr = (e) => { server.removeListener('listening', onOk); reject(e); };
    const onOk = () => {
      server.removeListener('error', onErr);
      const addr = server.address();
      if (addr && addr.address && addr.address !== BIND_HOST && addr.address !== '::1') {
        return reject(new Error(`serve.js bound to ${addr.address}, expected ${BIND_HOST}`));
      }
      resolve(addr && typeof addr.port === 'number' ? addr.port : port);
    };
    server.once('error', onErr); server.once('listening', onOk);
    server.listen(port, BIND_HOST);
  });
}
function writePidFileAtomic(pidFile, payload) {
  const tmp = pidFile + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2) + '\n');
  fs.renameSync(tmp, pidFile);
}

async function start(opts) {
  await loadMinter();
  const tasksDir = path.resolve(opts.tasksDir);
  const peopleDir = opts.peopleDir ? path.resolve(opts.peopleDir) : people.defaultPeopleDir(tasksDir);
  const server = http.createServer(handler(tasksDir, peopleDir));

  let bound = null;
  if (Number.isFinite(opts.port) && opts.port === 0) {
    bound = await listen(server, 0);
  } else {
    const startPort = Number.isFinite(opts.port) ? opts.port : DEFAULT_BASE_PORT;
    for (let i = 0; i < PORT_SCAN_LIMIT; i++) {
      try { bound = await listen(server, startPort + i); break; }
      catch (e) { if (e.code !== 'EADDRINUSE') throw e; }
    }
    if (!bound) throw new Error(`No free port in ${startPort}..${startPort + PORT_SCAN_LIMIT - 1}`);
  }

  // Idle auto-shutdown (default 300s; --idle=0 disables).
  let idleTimer = null;
  const idleMs = Number.isFinite(opts.idleSec) ? Math.max(0, opts.idleSec * 1000) : DEFAULT_IDLE_SEC * 1000;
  const cleanup = () => {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    if (opts.pidFile) { try { fs.unlinkSync(opts.pidFile); } catch (_) {} }
  };
  const armIdle = () => {
    if (!idleMs) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { try { server.close(); } catch (_) {} cleanup(); process.exit(0); }, idleMs);
    if (typeof idleTimer.unref === 'function') idleTimer.unref();
  };
  server.on('request', armIdle); armIdle();

  if (opts.pidFile) writePidFileAtomic(opts.pidFile, { pid: process.pid, port: bound, started_at: new Date().toISOString() });

  const onSignal = (sig) => { cleanup(); try { server.close(); } catch (_) {} process.exit(sig === 'SIGINT' ? 130 : 0); };
  process.once('SIGTERM', () => onSignal('SIGTERM'));
  process.once('SIGINT', () => onSignal('SIGINT'));
  process.on('exit', cleanup);

  const url = `http://${BIND_HOST}:${bound}/`;
  process.stdout.write(`mytasks serving ${tasksDir}\n`);
  process.stdout.write(`Open ${url}\n`);
  return { server, port: bound, url };
}

if (require.main === module) {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write('Usage: node serve.js [--tasks-dir DIR] [--people-dir DIR] [--port N] [--pid-file FILE] [--idle SEC]\n');
    process.exit(0);
  }
  start(args).catch((e) => { process.stderr.write(`serve.js: ${e.message}\n`); process.exit(1); });
}

module.exports = { start, handler, mintId, loadMinter, MIME };
