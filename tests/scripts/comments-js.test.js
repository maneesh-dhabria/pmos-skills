'use strict';
// T3 unit tests for assets/comments.js — pure-data helpers.
// Pure Node (no JSDOM); comments.js exposes module.exports when require()d.
// Refs: FR-01, FR-02, FR-10, FR-11, FR-14, FR-16, S3, S4, §10.1.
// Run via: bash tests/scripts/assert_comments_js_unit.sh

const path = require('path');
const fs = require('fs');
const assert = require('assert');

const REPO = path.resolve(__dirname, '..', '..');
const COMMENTS_PATH = path.join(
  REPO,
  'plugins/pmos-toolkit/skills/_shared/html-authoring/assets/comments.js'
);

const C = require(COMMENTS_PATH);

let passed = 0, failed = 0;
// Tests are QUEUED and run sequentially (see runner at end of file). Sequential
// execution is required: many cases mutate shared globals (document, window,
// fetch, location) and clean them up at the end — running async cases
// concurrently would interleave those mutations across tests.
const _tests = [];
function test(name, fn) { _tests.push({ name: name, fn: fn }); }

const V4_UUID = '11111111-1111-4111-8111-111111111111';

// ---------- (a) buildThread → schema-v1 ----------
test('(a) buildThread returns schema-v1 shape', () => {
  const t = C.buildThread({
    id_anchor: 'decision-log',
    quote_anchor: { quote_hash: 'deadbeef', context_before: 'foo', context_after: 'bar' },
    body: 'Why this choice?',
    author: 'maneesh'
  });
  assert.strictEqual(typeof t.id, 'string', 'thread.id missing');
  assert.strictEqual(t.id.length, 8, 'thread.id must be 8 chars');
  assert.ok(/^[A-Za-z0-9_-]{8}$/.test(t.id), 'thread.id must be URL-safe nanoid8');
  assert.ok(t.anchor && t.anchor.id_anchor === 'decision-log', 'anchor.id_anchor missing');
  assert.deepStrictEqual(t.anchor.quote_anchor.quote_hash, 'deadbeef');
  assert.strictEqual(t.status, 'open', 'status must default to open');
  assert.ok(Array.isArray(t.messages) && t.messages.length === 1, 'messages must be a 1-element array');
  const m = t.messages[0];
  assert.strictEqual(m.role, 'user');
  assert.strictEqual(m.body, 'Why this choice?');
  assert.strictEqual(m.author, 'maneesh');
  assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(m.ts), 'm.ts must be ISO-8601 UTC');
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(t.created_at), 'created_at ISO');
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(t.updated_at), 'updated_at ISO');
});

// ---------- (b) derive_kebab_id ----------
test('(b) derive_kebab_id basic + em-dash + parens', () => {
  assert.strictEqual(C.derive_kebab_id('Decision Log — D7'), 'decision-log-d7');
  assert.strictEqual(C.derive_kebab_id('Decision Log — D7 (proposed)'), 'decision-log-d7-proposed');
  assert.strictEqual(C.derive_kebab_id('Overview'), 'overview');
  assert.strictEqual(C.derive_kebab_id('### FR-03.1'), 'fr-03-1');
});

test('(b) derive_kebab_id dedupe via seen Set', () => {
  const seen = new Set();
  const a = C.derive_kebab_id('Decision Log', seen);
  assert.strictEqual(a, 'decision-log');
  seen.add(a);
  const b = C.derive_kebab_id('Decision Log', seen);
  assert.strictEqual(b, 'decision-log-2');
  seen.add(b);
  const c = C.derive_kebab_id('Decision Log', seen);
  assert.strictEqual(c, 'decision-log-3');
});

// ---------- (c) nanoid8 quick sanity ----------
test('(c) nanoid8 returns 8 URL-safe chars, unique across 1000', () => {
  const set = new Set();
  for (let i = 0; i < 1000; i++) {
    const id = C.nanoid8();
    assert.strictEqual(id.length, 8, 'length must be 8');
    assert.ok(/^[A-Za-z0-9_-]{8}$/.test(id), `id "${id}" not URL-safe`);
    set.add(id);
  }
  assert.strictEqual(set.size, 1000, 'expected 1000 unique ids');
});

// ---------- (d) validate_sidecar — schema-v1 PASS ----------
test('(d) validate_sidecar passes for schema_version:1 + v4 uuid + empty threads', () => {
  const ok = C.validate_sidecar({ schema_version: 1, lineage: V4_UUID, threads: [] });
  assert.strictEqual(ok, true, 'expected true');
});

// ---------- (e) validate_sidecar — refuse-newer ----------
test('(e) validate_sidecar refuses schema_version:99', () => {
  const ok = C.validate_sidecar({ schema_version: 99, lineage: V4_UUID, threads: [] });
  assert.strictEqual(ok, false, 'expected false');
});

// ---------- (e2) SidecarCorruptedError ----------
test('(e2) load_sidecar throws SidecarCorruptedError on truncated JSON', () => {
  let threw = null;
  try {
    C.load_sidecar('{"threads":[1,2');
  } catch (e) {
    threw = e;
  }
  assert.ok(threw, 'expected throw');
  assert.ok(threw instanceof C.SidecarCorruptedError, 'expected SidecarCorruptedError');
  assert.ok(threw.message && threw.message.length > 0, 'should have a message');
});

// ---------- (f) serialize_sidecar — 2-space + LF + trailing newline ----------
test('(f) serialize_sidecar emits 2-space indent + LF + trailing newline (byte-exact)', () => {
  const obj = { schema_version: 1, lineage: V4_UUID, threads: [] };
  const out = C.serialize_sidecar(obj);
  const buf = Buffer.from(out, 'utf8');
  // Last byte LF
  assert.strictEqual(buf[buf.length - 1], 0x0a, 'last byte must be LF (0x0a)');
  // No CR anywhere
  assert.strictEqual(buf.indexOf(0x0d), -1, 'must not contain CR (0x0d)');
  // Indent: find line "  \"schema_version\"" → exactly 2 spaces
  const lines = out.split('\n');
  const indented = lines.find(l => /^\s+"schema_version"/.test(l));
  assert.ok(indented, 'expected an indented line for schema_version');
  const leading = indented.match(/^( +)/)[1];
  assert.strictEqual(leading.length, 2, 'indent must be 2 spaces');
});

// ---------- (g) preserve_unknown round-trip ----------
test('(g) preserve_unknown round-trip (extra top-level + thread-level keys)', () => {
  const original = {
    schema_version: 1,
    lineage: V4_UUID,
    foo: 'bar',
    threads: [
      {
        id: 'abcd1234',
        anchor: { id_anchor: 'x', quote_anchor: { quote_hash: 'h' } },
        status: 'open',
        messages: [],
        created_at: '2026-05-24T00:00:00Z',
        updated_at: '2026-05-24T00:00:00Z',
        baz: 'qux'
      }
    ]
  };
  const s = C.serialize_sidecar(original);
  const parsed = C.parse_sidecar(s);
  assert.strictEqual(parsed.foo, 'bar', 'top-level extra key must survive');
  assert.strictEqual(parsed.threads[0].baz, 'qux', 'thread-level extra key must survive');
  // Re-serialize and reparse — still preserved.
  const s2 = C.serialize_sidecar(parsed);
  const parsed2 = C.parse_sidecar(s2);
  assert.strictEqual(parsed2.foo, 'bar');
  assert.strictEqual(parsed2.threads[0].baz, 'qux');
});

// ---------- exported surface sanity ----------
test('exports SCHEMA_VERSION = 1', () => {
  assert.strictEqual(C.SCHEMA_VERSION, 1);
});

// ============================================================
// T7 — browser-side UI + FSA write path (DOM stub in-file).
// ============================================================

// ---- Minimal DOM stub (just enough for T7 assertions) ----
class StubClassList {
  constructor() { this._set = new Set(); }
  add(c) { this._set.add(c); }
  remove(c) { this._set.delete(c); }
  contains(c) { return this._set.has(c); }
  toggle(c) { if (this._set.has(c)) this._set.delete(c); else this._set.add(c); }
}
class StubNode {
  constructor(tag) {
    this.tagName = (tag || '').toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.classList = new StubClassList();
    this._listeners = {};
    this._textContent = '';
    this.style = {};
    this.attributes = {};
    this.dataset = {};
    this.value = '';
  }
  // Mirror the real DOM: assigning .className syncs classList (and vice-versa),
  // so `.pmos-foo` selectors find nodes created via `el.className = 'pmos-foo'`.
  get className() { return Array.from(this.classList._set).join(' '); }
  set className(v) { this.classList._set = new Set(String(v == null ? '' : v).split(/\s+/).filter(Boolean)); }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  insertBefore(newNode, refNode) {
    if (refNode == null) { return this.appendChild(newNode); }
    const i = this.children.indexOf(refNode);
    if (i < 0) { return this.appendChild(newNode); }
    newNode.parentNode = this;
    this.children.splice(i, 0, newNode);
    return newNode;
  }
  click() { (this._listeners['click'] || []).forEach(fn => fn({})); }
  removeChild(c) {
    const i = this.children.indexOf(c);
    if (i >= 0) { this.children.splice(i, 1); c.parentNode = null; }
    return c;
  }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  addEventListener(ev, fn) { (this._listeners[ev] = this._listeners[ev] || []).push(fn); }
  removeEventListener(ev, fn) {
    const a = this._listeners[ev] || [];
    const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1);
  }
  dispatch(ev, payload) { (this._listeners[ev] || []).forEach(fn => fn(payload || {})); }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k]; }
  get textContent() { return this._textContent + this.children.map(c => c.textContent).join(''); }
  set textContent(v) { this._textContent = String(v); this.children = []; }
  querySelector(sel) {
    // Supports ".class" and "[attr]" selectors (sufficient for T7+T22 tests).
    const attrMatch = sel.match(/^\[([^\]]+)\]$/);
    if (attrMatch) {
      const attr = attrMatch[1];
      const walk = (n) => {
        for (const c of n.children) {
          if (c.attributes && Object.prototype.hasOwnProperty.call(c.attributes, attr)) return c;
          const r = walk(c); if (r) return r;
        }
        return null;
      };
      return walk(this);
    }
    if (!sel.startsWith('.')) return null;
    const cls = sel.slice(1);
    const walk = (n) => {
      for (const c of n.children) {
        if (c.classList.contains(cls)) return c;
        const r = walk(c); if (r) return r;
      }
      return null;
    };
    return walk(this);
  }
  querySelectorAll(sel) {
    const attrMatch = sel.match(/^\[([^\]]+)\]$/);
    if (attrMatch) {
      const attr = attrMatch[1];
      const out = [];
      const walk = (n) => {
        for (const c of n.children) {
          if (c.attributes && Object.prototype.hasOwnProperty.call(c.attributes, attr)) out.push(c);
          walk(c);
        }
      };
      walk(this);
      return out;
    }
    if (!sel.startsWith('.')) return [];
    const cls = sel.slice(1);
    const out = [];
    const walk = (n) => {
      for (const c of n.children) {
        if (c.classList.contains(cls)) out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  }
}
function makeStubDom() {
  const body = new StubNode('body');
  const doc = {
    body,
    createElement: (t) => new StubNode(t),
    querySelector: (s) => body.querySelector(s),
    querySelectorAll: (s) => body.querySelectorAll(s),
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  return doc;
}

// Minimal in-memory localStorage stub (Node has none by default).
function makeStubLocalStorage() {
  const store = {};
  return {
    getItem: (k) => Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    _store: store
  };
}

// Fresh module instance per T7 test (re-requires comments.js after wiring globals).
function freshC() {
  delete require.cache[require.resolve(COMMENTS_PATH)];
  return require(COMMENTS_PATH);
}

// ---------- (T7-a) captureSelection builds anchor with 3 fields ----------
test('(T7-a) captureSelection populates quote_hash + context_before/after', () => {
  const Cx = freshC();
  const anchor = Cx.captureSelection({
    start: 10,
    end: 20,
    text: 'hello world stuff',
    prefix: 'a'.repeat(50) + 'PREFIX_TAIL_30CHARS_XXXXXXXXXX',
    suffix: 'SUFFIX_HEAD_30CHARS_YYYYYYYYYY' + 'b'.repeat(50)
  });
  assert.ok(anchor.quote_hash && typeof anchor.quote_hash === 'string', 'quote_hash present');
  assert.strictEqual(anchor.quote_hash.length, 16, 'quote_hash is 16 hex chars');
  assert.ok(/^[0-9a-f]{16}$/.test(anchor.quote_hash), 'quote_hash is lowercase hex');
  assert.strictEqual(anchor.context_before.length, 30, 'context_before is last 30 chars');
  assert.strictEqual(anchor.context_after.length, 30, 'context_after is first 30 chars');
  assert.strictEqual(anchor.context_before, 'PREFIX_TAIL_30CHARS_XXXXXXXXXX');
  assert.strictEqual(anchor.context_after, 'SUFFIX_HEAD_30CHARS_YYYYYYYYYY');
});

// ---------- (T7-b) onFloatingButtonClick opens side panel ----------
test('(T7-b) onFloatingButtonClick opens .pmos-side-panel', () => {
  const doc = makeStubDom();
  global.document = doc;
  global.window = { document: doc, getSelection: () => null };
  const Cx = freshC();
  Cx.mount({ artifactPath: '/foo.html' });
  const anchor = { quote_hash: '0123456789abcdef', context_before: 'x', context_after: 'y' };
  Cx.onFloatingButtonClick(anchor);
  const panel = doc.querySelector('.pmos-side-panel');
  assert.ok(panel, 'side panel mounted');
  assert.ok(panel.classList.contains('open'), 'side panel has .open');
  delete global.document; delete global.window;
});

// ---------- (T7-c) postSubmit POSTs the appended thread to /save ----------
// v2.58.0: the FSA writeSidecar path was removed — persistence is exclusively
// the optimistic-concurrency POST /save flow (FR-16/FR-17).
test('(T7-c) postSubmit POSTs appended thread to /save with expected_version', async () => {
  const doc = makeStubDom();
  global.document = doc;
  global.window = { document: doc, getSelection: () => null };
  let captured = null;
  global.fetch = (url, opts) => {
    captured = { url, opts };
    return Promise.resolve({
      status: 200, ok: true,
      json: () => Promise.resolve({ version: 1, generated_at: '2026-01-02T00:00:00Z' })
    });
  };
  const Cx = freshC();
  const res = await Cx.postSubmit({
    anchor: { id_anchor: 'overview', quote_anchor: { quote_hash: 'deadbeefdeadbeef', context_before: 'p', context_after: 's' } },
    body: 'New comment',
    author: 'tester'
  });
  assert.ok(captured, 'fetch invoked');
  assert.strictEqual(captured.url, '/save', 'POSTs to /save');
  assert.strictEqual(captured.opts.method, 'POST', 'method is POST');
  const sent = JSON.parse(captured.opts.body);
  assert.strictEqual(sent.expected_version, 0, 'expected_version = current version (0)');
  assert.ok(Array.isArray(sent.payload.threads), 'payload carries threads');
  assert.strictEqual(sent.payload.threads.length, 1, 'one thread appended');
  assert.strictEqual(sent.payload.threads[0].messages[0].body, 'New comment');
  assert.strictEqual(sent.payload.schema, 1, 'payload schema = 1');
  assert.ok(res.ok, 'postSubmit resolves ok on 200');
  assert.strictEqual(res.version, 1, 'version advances to the server value');
  delete global.document; delete global.window; delete global.fetch;
});

// ---------- (T7-d) postSubmit 409 → optimistic-concurrency conflict banner ----------
// v2.58.0: replaces the FSA writeSidecar call-order test. The write path now
// surfaces a stale-version conflict (FR-17) via the conflict banner.
test('(T7-d) postSubmit 409 renders the conflict banner and returns ok:false', async () => {
  const doc = makeStubDom();
  global.document = doc;
  global.window = { document: doc, getSelection: () => null };
  global.fetch = () => Promise.resolve({
    status: 409, ok: false,
    json: () => Promise.resolve({ current_version: 7 })
  });
  const Cx = freshC();
  // Pin the doc reference so _doc() renders the banner into our stub.
  Cx._state._docRef = doc;
  const res = await Cx.postSubmit({
    anchor: { id_anchor: 'overview' },
    body: 'stale write',
    author: 'tester'
  });
  assert.strictEqual(res.ok, false, 'postSubmit not ok on 409');
  assert.strictEqual(res.status, 409, 'status surfaced');
  assert.strictEqual(res.conflict_version, 7, 'server current_version surfaced');
  const banner = doc.querySelector('.pmos-conflict-banner');
  assert.ok(banner, 'conflict banner rendered');
  assert.ok(/current version: 7/.test(banner.textContent), 'banner names the current server version');
  delete global.document; delete global.window; delete global.fetch;
});

// ---------- (T7-e) detectMode FR-14 — read-write iff /save HEAD is 2xx ----------
// v2.58.0: replaces the FSA permission-denied test. Whether comments are
// writable is decided by a HEAD probe to /save (the launcher's serve.js), not
// by a File System Access permission grant.
test('(T7-e) detectMode → read-write on 2xx /save HEAD, read-only otherwise', async () => {
  const Cx = freshC();

  global.fetch = () => Promise.resolve({ status: 204, ok: true });
  assert.strictEqual(await Cx.detectMode(), 'read-write', '2xx HEAD /save → read-write');

  global.fetch = () => Promise.resolve({ status: 404, ok: false });
  assert.strictEqual(await Cx.detectMode(), 'read-only', 'non-2xx HEAD /save → read-only');

  global.fetch = () => Promise.reject(new Error('connection refused'));
  assert.strictEqual(await Cx.detectMode(), 'read-only', 'no server (fetch rejects) → read-only');

  delete global.fetch;
});

// ============================================================
// T22 — write-path mode + the v2.58.0 retirement of the FSA/localStorage
//        fallback. (Persistence is now exclusively POST /save; review/file
//        gating decides read-only vs read-write.)
// ============================================================

// ---------- (T22-a) detectMode read-only under file:// protocol ----------
// v2.58.0: the Safari/Firefox localStorage-draft fallback was removed. Without
// an HTTP server (e.g. opened from disk) the overlay is simply read-only.
test('(T22-a) detectMode returns read-only under file:// protocol', async () => {
  global.location = { protocol: 'file:' };
  const Cx = freshC();
  const mode = await Cx.detectMode();
  assert.strictEqual(mode, 'read-only', 'file:// → read-only (no server to POST /save)');
  delete global.location;
});

// ---------- (T22-b/c/e) the FSA + localStorage fallback surface is gone ----------
// One honest contract test replacing the retired triggerSidecarDownload / FSA
// writeSidecar / localStorage-draft cases. Their behaviour was removed in
// v2.58.0 (see comments.js mount() banner); this pins that they stay gone.
test('(T22-b/c/e) retired FSA/localStorage write surface is absent; postSubmit is the sole write path', () => {
  const Cx = freshC();
  ['writeSidecar', 'triggerSidecarDownload', 'submitThread', '_lsKey', '_lsDraftSave', '_writeSidecar']
    .forEach((fn) => {
      assert.strictEqual(typeof Cx[fn], 'undefined', fn + ' must be removed (persistence is POST /save only)');
    });
  assert.strictEqual(typeof Cx.postSubmit, 'function', 'postSubmit is the sole write path');
  assert.strictEqual(typeof Cx.detectMode, 'function', 'detectMode gates read-only vs read-write');
});

// ---------- (T22-d) Workflow file exists + two-bucket split shape ----------
test('(T22-d) .github/workflows/comments-bundle-size.yml exists with split AUTH/VEND buckets', () => {
  const wfPath = path.join(REPO, '.github/workflows/comments-bundle-size.yml');
  assert.ok(fs.existsSync(wfPath), 'comments-bundle-size.yml must exist at .github/workflows/');
  const content = fs.readFileSync(wfPath, 'utf8');
  assert.ok(content.includes('pull_request'), 'workflow must trigger on pull_request');
  assert.ok(content.includes('push'), 'workflow must trigger on push');
  assert.ok(content.includes('ubuntu-latest'), 'workflow must use ubuntu-latest');
  // Two-bucket split shape (NFR-02 amended 2026-05-25)
  assert.ok(content.includes('AUTH_SIZE'), 'workflow must define AUTH_SIZE bucket variable');
  assert.ok(content.includes('VEND_SIZE'), 'workflow must define VEND_SIZE bucket variable');
  assert.ok(content.includes('20480'), 'workflow must reference authoring soft threshold (20480)');
  assert.ok(content.includes('40960'), 'workflow must reference authoring hard threshold (40960)');
  assert.ok(content.includes('102400'), 'workflow must reference vendored ceiling (102400)');
  assert.ok(content.includes('exit 1') || content.includes('exit(1)'), 'workflow must exit 1 on size violation');
});

// (T22-e) removed in v2.58.0 — there is no localStorage draft to rehydrate or
// schema-validate on mount anymore. Schema validation remains covered by the
// validate_sidecar unit case (e) and the retired-surface case above.

// ============================================================
// T24 — Overlay UX surfaces: orphan banner, diagram markers,
//        review-mode gate, file:// E1 modal, FR-52 foreign-SVG bbox.
// ============================================================

// ---- extend StubNode: querySelector by #id, [attr=val], and bare tagname ----
// Extend the class prototype so all StubNode instances (existing + new) support
// the additional selectors required by T24 tests.
{
  const _origQS = StubNode.prototype.querySelector;
  StubNode.prototype.querySelector = function (sel) {
    // #id selector
    const idMatch = sel.match(/^#([^.\[]+)$/);
    if (idMatch) {
      const id = idMatch[1];
      const walk = (n) => {
        for (const c of n.children) {
          if (c.attributes && c.attributes['id'] === id) return c;
          const r = walk(c); if (r) return r;
        }
        return null;
      };
      return walk(this);
    }
    // [attr=val] selector
    const attrValMatch = sel.match(/^\[([^\]=]+)=["']?([^"'\]]+)["']?\]$/);
    if (attrValMatch) {
      const [, attr, val] = attrValMatch;
      const walk = (n) => {
        for (const c of n.children) {
          if (c.attributes && c.attributes[attr] === val) return c;
          const r = walk(c); if (r) return r;
        }
        return null;
      };
      return walk(this);
    }
    // bare tagname selector (e.g. "textarea", "input", "button")
    if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(sel)) {
      const tag = sel.toUpperCase();
      const walk = (n) => {
        for (const c of n.children) {
          if (c.tagName && c.tagName.toUpperCase() === tag) return c;
          const r = walk(c); if (r) return r;
        }
        return null;
      };
      return walk(this);
    }
    return _origQS.call(this, sel);
  };

  const _origQSA = StubNode.prototype.querySelectorAll;
  StubNode.prototype.querySelectorAll = function (sel) {
    // [attr=val] selector
    const attrValMatch = sel.match(/^\[([^\]=]+)=["']?([^"'\]]+)["']?\]$/);
    if (attrValMatch) {
      const [, attr, val] = attrValMatch;
      const out = [];
      const walk = (n) => {
        for (const c of n.children) {
          if (c.attributes && c.attributes[attr] === val) out.push(c);
          walk(c);
        }
      };
      walk(this);
      return out;
    }
    return _origQSA.call(this, sel);
  };
}

// ---- (T24-a) Orphan banner: 1 orphaned thread → banner with count ----
test('(T24-a) orphan banner shows "1 orphaned thread" when one thread has orphan:true', () => {
  const doc = makeStubDom();
  const ls = makeStubLocalStorage();
  global.document = doc;
  global.window = { document: doc, getSelection: () => null };
  global.localStorage = ls;

  const Cx = freshC();
  const sidecar = {
    schema_version: 1,
    lineage: '11111111-1111-4111-8111-111111111111',
    threads: [
      {
        id: 'orphan01',
        orphan: true,
        anchor: { id_anchor: null, quote_anchor: null },
        status: 'open',
        messages: [{ role: 'user', body: 'Lost comment body', author: 'alice', ts: '2026-01-01T00:00:00Z' }],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
      },
      {
        id: 'normal01',
        orphan: false,
        anchor: { id_anchor: 'sec-1', quote_anchor: null },
        status: 'open',
        messages: [{ role: 'user', body: 'Normal comment', author: 'bob', ts: '2026-01-01T00:00:00Z' }],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
      }
    ]
  };

  Cx.mount({ artifactPath: '/foo.html', sidecar, _fsaFallbackMode: true });

  // The orphan banner should be mounted in the side panel.
  const banner = doc.querySelector('[data-pmos-orphan-banner]');
  assert.ok(banner, 'orphan banner must be in DOM');
  assert.ok(/1 orphaned thread/.test(banner.textContent), `banner text should contain "1 orphaned thread", got: ${banner.textContent}`);

  delete global.document; delete global.window; delete global.localStorage;
});

// ---- (T24-a2) Orphan banner is positioned at index 1 (after panel header) ----
test('(T24-a2) orphan banner is inserted at index 1 in panel children (after header)', () => {
  const doc = makeStubDom();
  const ls = makeStubLocalStorage();
  global.document = doc;
  global.window = { document: doc, getSelection: () => null };
  global.localStorage = ls;

  const Cx = freshC();
  const sidecar = {
    schema_version: 1,
    lineage: '22222222-2222-4222-8222-222222222222',
    threads: [
      {
        id: 'orphan-pos01',
        orphan: true,
        anchor: { id_anchor: null, quote_anchor: null },
        status: 'open',
        messages: [{ role: 'user', body: 'Orphan for position test', author: 'alice', ts: '2026-01-01T00:00:00Z' }],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
      }
    ]
  };

  Cx.mount({ artifactPath: '/foo.html', sidecar, _fsaFallbackMode: true });

  // Find the side panel and verify header is at [0], banner at [1].
  const panel = doc.querySelector('.pmos-side-panel');
  assert.ok(panel, 'side panel must be in DOM');
  const banner = doc.querySelector('[data-pmos-orphan-banner]');
  assert.ok(banner, 'orphan banner must be in DOM');
  const bannerIdx = panel.children.indexOf(banner);
  assert.ok(bannerIdx >= 0, 'banner must be a direct child of the panel');
  assert.strictEqual(bannerIdx, 1, `banner must be at index 1 (after header), found at index ${bannerIdx}`);

  delete global.document; delete global.window; delete global.localStorage;
});

// ---- (T24-b) Reattach button prefills compose form ----
test('(T24-b) reattach action prefills compose with orphan body + quote_anchor input', () => {
  const doc = makeStubDom();
  const ls = makeStubLocalStorage();
  global.document = doc;
  global.window = { document: doc, getSelection: () => null };
  global.localStorage = ls;

  const Cx = freshC();
  const sidecar = {
    schema_version: 1,
    lineage: '11111111-1111-4111-8111-111111111111',
    threads: [
      {
        id: 'orphan02',
        orphan: true,
        anchor: { id_anchor: null, quote_anchor: null },
        status: 'open',
        messages: [{ role: 'user', body: 'Orphaned comment to reattach', author: 'alice', ts: '2026-01-01T00:00:00Z' }],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
      }
    ]
  };

  Cx.mount({ artifactPath: '/foo.html', sidecar, _fsaFallbackMode: true });
  // Simulate clicking reattach button for orphan02.
  Cx.openReattachForm('orphan02');

  // The compose form textarea should be pre-filled with the last user body.
  // Use two-step query: find compose div first, then textarea inside it.
  const composeDiv = doc.querySelector('.pmos-thread-compose');
  assert.ok(composeDiv, 'compose div must be present');
  const ta = composeDiv.querySelector('textarea');
  assert.ok(ta, 'compose textarea must be present');
  assert.ok(ta.value === 'Orphaned comment to reattach' || ta.textContent === 'Orphaned comment to reattach',
    `textarea must be prefilled with orphan body, got value="${ta.value}" textContent="${ta.textContent}"`);

  // A quote_anchor input must be rendered in the compose form.
  const qaInput = doc.querySelector('[data-pmos-reattach-anchor]');
  assert.ok(qaInput, 'quote_anchor reattach input must be in compose form');

  delete global.document; delete global.window; delete global.localStorage;
});

// ---- (T24-c) Diagram marker positioned at data-anchor element centroid ----
test('(T24-c) diagram marker positioned at data-anchor element centroid', () => {
  const doc = makeStubDom();
  const ls = makeStubLocalStorage();
  global.document = doc;
  global.window = { document: doc, getSelection: () => null };
  global.localStorage = ls;

  // Stub SVG element tree: <svg id="diag-1"> <rect data-anchor="shape-a"> </svg>
  const svgEl = new StubNode('svg');
  svgEl.setAttribute('id', 'diag-1');
  const rectEl = new StubNode('rect');
  rectEl.setAttribute('data-anchor', 'shape-a');
  // Mock getBBox to return a known bbox; mock getBoundingClientRect on both.
  rectEl.getBBox = () => ({ x: 40, y: 30, width: 60, height: 40 });
  rectEl.getBoundingClientRect = () => ({ left: 40, top: 30, width: 60, height: 40, right: 100, bottom: 70 });
  svgEl.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 200, right: 300, bottom: 200 });
  svgEl.appendChild(rectEl);
  doc.body.appendChild(svgEl);

  // Extend doc.querySelector to handle nested SVG by delegating to body.
  const origQS = doc.querySelector.bind(doc);
  doc.querySelector = (sel) => {
    // data-anchor attribute selector with value
    const m = sel.match(/^\[data-anchor=["']?([^"'\]]+)["']?\]$/);
    if (m) {
      if (rectEl.getAttribute('data-anchor') === m[1]) return rectEl;
    }
    return origQS(sel);
  };

  const Cx = freshC();
  const sidecar = {
    schema_version: 1,
    lineage: '11111111-1111-4111-8111-111111111111',
    threads: [
      {
        id: 'diag-thread-1',
        diagram_anchor: { svg_id: 'diag-1', shape_id: 'shape-a' },
        anchor: { id_anchor: null, quote_anchor: null },
        status: 'open',
        messages: [{ role: 'user', body: 'Diagram comment', author: 'alice', ts: '2026-01-01T00:00:00Z' }],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
      }
    ]
  };

  Cx.mount({ artifactPath: '/foo.html', sidecar, _fsaFallbackMode: true });

  // Find marker in DOM.
  const marker = doc.querySelector('[data-pmos-diagram-marker]');
  assert.ok(marker, 'diagram marker must be rendered in DOM');

  // Centroid = rectEl bbox: x=40 w=60 → cx=70; y=30 h=40 → cy=50.
  // SVG origin at page (0,0) → marker should be at left≈70px, top≈50px.
  const leftVal = parseFloat(marker.style.left);
  const topVal = parseFloat(marker.style.top);
  assert.ok(Math.abs(leftVal - 70) <= 5, `marker.style.left should be ~70px, got ${leftVal}`);
  assert.ok(Math.abs(topVal - 50) <= 5, `marker.style.top should be ~50px, got ${topVal}`);

  delete global.document; delete global.window; delete global.localStorage;
});

// ---- (T24-c2 / FR-52) Foreign-SVG bbox capture ----
test('(T24-c2 / FR-52) foreign-SVG bbox capture: click at (100,50) produces bbox [80,30,40,40], shape_id null', () => {
  const doc = makeStubDom();
  const ls = makeStubLocalStorage();
  global.document = doc;
  global.window = { document: doc, getSelection: () => null };
  global.localStorage = ls;

  // Stub SVG with NO data-anchor descendants (foreign-embed scenario).
  const svgEl = new StubNode('svg');
  svgEl.setAttribute('id', 'foreign-svg-1');
  // A <g> without data-anchor.
  const gEl = new StubNode('g');
  svgEl.appendChild(gEl);
  // A <path> inside g (also no data-anchor).
  const pathEl = new StubNode('path');
  gEl.appendChild(pathEl);
  doc.body.appendChild(svgEl);

  const Cx = freshC();
  Cx.mount({ artifactPath: '/foo.html', _fsaFallbackMode: true });

  // Simulate a click on pathEl at point (100, 50).
  // pathEl has no data-anchor, so the bbox-fallback should fire.
  // The captured anchor should be:
  //   { svg_id: 'foreign-svg-1', shape_id: null, bbox: [80, 30, 40, 40] }
  const captured = Cx.captureSvgBboxAnchor(pathEl, svgEl, 100, 50);
  assert.ok(captured, 'captureSvgBboxAnchor must return an object');
  assert.strictEqual(captured.shape_id, null, 'shape_id must be null for foreign-SVG');
  assert.strictEqual(captured.svg_id, 'foreign-svg-1', 'svg_id must be the SVG element id');
  assert.deepStrictEqual(captured.bbox, [80, 30, 40, 40], `bbox must be [click.x-20, click.y-20, 40, 40] = [80,30,40,40], got ${JSON.stringify(captured.bbox)}`);

  delete global.document; delete global.window; delete global.localStorage;
});

// ---- (T24-d) review-mode off (via toggle) removes overlay + gates re-mount ----
// D14: review-mode is in-memory (no localStorage persistence). Default is 'on';
// Ctrl/Cmd+Alt+R toggles it for the session only.
test('(T24-d) review-mode toggled off removes overlay and gates re-mount', () => {
  const doc = makeStubDom();
  const docListeners = {};
  doc.addEventListener = (ev, fn) => { (docListeners[ev] = docListeners[ev] || []).push(fn); };
  doc.removeEventListener = () => {};
  global.document = doc;
  global.window = { document: doc, getSelection: () => null };
  global.fetch = () => Promise.resolve({ status: 200, ok: true }); // detectMode resolves fast

  const Cx = freshC();
  Cx.mount({ artifactPath: '/foo.html' }); // review-mode defaults 'on' → overlay mounts
  assert.ok(doc.querySelector('#pmos-comments-overlay'), 'overlay present after mount (review-mode on)');

  // Ctrl+Alt+R → review-mode off → overlay unmounts.
  (docListeners['keydown'] || []).forEach(fn => fn({ ctrlKey: true, altKey: true, key: 'r', metaKey: false, preventDefault: () => {} }));
  assert.strictEqual(doc.querySelector('#pmos-comments-overlay'), null, 'overlay removed when review-mode toggled off');

  // A subsequent mount() while off must stay gated (no overlay).
  Cx.mount({ artifactPath: '/foo.html' });
  assert.strictEqual(doc.querySelector('#pmos-comments-overlay'), null, 'mount() is a no-op while review-mode off');

  delete global.document; delete global.window; delete global.fetch;
});

// ---- (T24-e) Ctrl+Alt+R toggles the overlay off then back on ----
test('(T24-e) Ctrl+Alt+R toggles #pmos-comments-overlay off then on', () => {
  const doc = makeStubDom();
  const docListeners = {};
  doc.addEventListener = (ev, fn) => { (docListeners[ev] = docListeners[ev] || []).push(fn); };
  doc.removeEventListener = () => {};
  global.document = doc;
  global.window = { document: doc, getSelection: () => null };
  global.fetch = () => Promise.resolve({ status: 200, ok: true });

  const Cx = freshC();
  Cx.mount({ artifactPath: '/foo.html' });
  assert.ok(doc.querySelector('#pmos-comments-overlay'), 'overlay mounted initially (review-mode on)');

  const kb = docListeners['keydown'] || [];
  assert.ok(kb.length > 0, 'mount() must attach a keydown listener');
  const fire = () => kb.forEach(fn => fn({ ctrlKey: true, altKey: true, key: 'r', metaKey: false, preventDefault: () => {} }));

  fire(); // → off
  assert.strictEqual(doc.querySelector('#pmos-comments-overlay'), null, 'overlay removed after first toggle (off)');
  fire(); // → on
  assert.ok(doc.querySelector('#pmos-comments-overlay'), 'overlay re-mounted after second toggle (on)');

  delete global.document; delete global.window; delete global.fetch;
});

// ---- (T24-f) file:// protocol → blocking modal, no #pmos-comments-overlay ----
test('(T24-f) file:// protocol → blocking modal [data-pmos-file-warning] present, no #pmos-comments-overlay', () => {
  const doc = makeStubDom();
  const ls = makeStubLocalStorage();
  global.document = doc;
  global.window = { document: doc, getSelection: () => null, location: { protocol: 'file:' } };
  global.localStorage = ls;
  global.location = { protocol: 'file:' };

  const Cx = freshC();
  Cx.mount({ artifactPath: '/foo.html', _fsaFallbackMode: true });

  // Blocking modal must be present.
  const modal = doc.querySelector('[data-pmos-file-warning]');
  assert.ok(modal, '[data-pmos-file-warning] blocking modal must be mounted under file:// protocol');

  // Copy serve button must be present.
  const serveBtn = doc.querySelector('[data-pmos-copy-serve]');
  assert.ok(serveBtn, '[data-pmos-copy-serve] button must be present in file:// modal');

  // Copy launcher button must be present.
  const launchBtn = doc.querySelector('[data-pmos-copy-launcher]');
  assert.ok(launchBtn, '[data-pmos-copy-launcher] button must be present in file:// modal');

  // Main overlay must NOT be mounted.
  const overlay = doc.querySelector('#pmos-comments-overlay');
  assert.strictEqual(overlay, null, '#pmos-comments-overlay must NOT be mounted under file:// protocol');

  delete global.document; delete global.window; delete global.localStorage;
  delete global.location;
});

(async () => {
  for (const t of _tests) {
    try {
      await t.fn();
      console.log(`  ok  ${t.name}`); passed++;
    } catch (e) {
      console.log(`  FAIL ${t.name}\n       ${e && e.stack ? e.stack : (e && e.message) || e}`); failed++;
    }
  }
  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
