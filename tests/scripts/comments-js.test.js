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
const _pending = [];
function test(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      _pending.push(r.then(
        () => { console.log(`  ok  ${name}`); passed++; },
        (e) => { console.log(`  FAIL ${name}\n       ${e.stack || e.message}`); failed++; }
      ));
    } else {
      console.log(`  ok  ${name}`); passed++;
    }
  }
  catch (e) { console.log(`  FAIL ${name}\n       ${e.stack || e.message}`); failed++; }
}

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
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
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
    // Supports ".class" only (sufficient for T7 tests).
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

// ---------- (T7-c) submitThread calls writeSidecar with new thread appended ----------
test('(T7-c) submitThread appends thread + invokes writeSidecar', () => {
  const doc = makeStubDom();
  global.document = doc;
  global.window = { document: doc, getSelection: () => null };
  const Cx = freshC();
  let captured = null;
  const fakeHandle = { __fake: true };
  Cx.mount({
    artifactPath: '/foo.html',
    lineage: '11111111-1111-4111-8111-111111111111',
    dirHandle: fakeHandle,
    _writeSidecar: (sidecar, handle) => { captured = { sidecar, handle }; return Promise.resolve(); }
  });
  const anchor = { quote_hash: 'deadbeefdeadbeef', context_before: 'p', context_after: 's' };
  Cx.submitThread({
    anchor: { id_anchor: 'overview', quote_anchor: anchor },
    body: 'New comment',
    author: 'tester'
  });
  assert.ok(captured, 'writeSidecar invoked');
  assert.strictEqual(captured.handle, fakeHandle, 'handle threaded through');
  assert.ok(Array.isArray(captured.sidecar.threads), 'sidecar has threads');
  assert.strictEqual(captured.sidecar.threads.length, 1, 'one thread appended');
  assert.strictEqual(captured.sidecar.threads[0].messages[0].body, 'New comment');
  assert.strictEqual(captured.sidecar.schema_version, 1);
  delete global.document; delete global.window;
});

// ---------- (T7-d) writeSidecar call-order against fake FSA ----------
test('(T7-d) writeSidecar invokes requestPermission → getFileHandle → createWritable → write → close in order', async () => {
  const doc = makeStubDom();
  global.document = doc;
  global.window = { document: doc, getSelection: () => null };
  const Cx = freshC();
  const calls = [];
  const writable = {
    write: (data) => { calls.push(['write', data]); return Promise.resolve(); },
    close: () => { calls.push(['close']); return Promise.resolve(); }
  };
  const fileHandle = {
    createWritable: (opts) => { calls.push(['createWritable', opts]); return Promise.resolve(writable); }
  };
  const dirHandle = {
    requestPermission: (opts) => { calls.push(['requestPermission', opts]); return Promise.resolve('granted'); },
    getFileHandle: (name, opts) => { calls.push(['getFileHandle', name, opts]); return Promise.resolve(fileHandle); }
  };
  Cx.mount({ artifactPath: '/spec.html' });
  const sidecar = {
    schema_version: 1,
    lineage: '11111111-1111-4111-8111-111111111111',
    threads: []
  };
  await Cx.writeSidecar(sidecar, dirHandle);
  const order = calls.map(c => c[0]);
  assert.deepStrictEqual(order, ['requestPermission', 'getFileHandle', 'createWritable', 'write', 'close']);
  assert.deepStrictEqual(calls[0][1], { mode: 'readwrite' }, 'requestPermission readwrite');
  assert.strictEqual(calls[1][1], 'spec.comments.json', 'sidecar filename');
  assert.deepStrictEqual(calls[1][2], { create: true });
  assert.deepStrictEqual(calls[2][1], { keepExistingData: false });
  assert.strictEqual(calls[3][1], Cx.serialize_sidecar(sidecar), 'write payload matches serialize_sidecar');
  delete global.document; delete global.window;
});

// ---------- (T7-e) revoked permission → banner + sidecar untouched ----------
test('(T7-e) revoked permission surfaces banner + does NOT write', async () => {
  const doc = makeStubDom();
  global.document = doc;
  global.window = { document: doc, getSelection: () => null };
  const Cx = freshC();
  let wrote = false;
  const dirHandle = {
    requestPermission: () => Promise.resolve('denied'),
    getFileHandle: () => { wrote = true; return Promise.reject(new Error('should not call')); }
  };
  Cx.mount({ artifactPath: '/spec.html' });
  await Cx.writeSidecar({ schema_version: 1, lineage: '11111111-1111-4111-8111-111111111111', threads: [] }, dirHandle);
  assert.strictEqual(wrote, false, 'must not attempt to write');
  const banner = doc.querySelector('.pmos-banner');
  assert.ok(banner, 'banner mounted on denial');
  assert.ok(/Click to grant write access/.test(banner.textContent), 'banner text');
  delete global.document; delete global.window;
});

Promise.all(_pending).then(() => {
  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
});
