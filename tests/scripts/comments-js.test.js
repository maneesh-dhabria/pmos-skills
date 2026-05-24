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
function test(name, fn) {
  try { fn(); console.log(`  ok  ${name}`); passed++; }
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

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
