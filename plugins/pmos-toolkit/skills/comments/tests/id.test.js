'use strict';
// T3 nanoid uniqueness check — 1000 generations must yield 1000 distinct ids.
// Refs: FR-14, S4.
// Run via: bash tests/scripts/assert_comments_id.sh

const path = require('path');
const assert = require('assert');

const COMMENTS_PATH = path.resolve(
  __dirname, '..', '..', '_shared', 'html-authoring', 'assets', 'comments.js'
);

const { nanoid8 } = require(COMMENTS_PATH);

const N = 1000;
const ids = new Set();
for (let i = 0; i < N; i++) {
  const id = nanoid8();
  assert.strictEqual(id.length, 8, `id length must be 8, got "${id}"`);
  assert.ok(/^[A-Za-z0-9_-]{8}$/.test(id), `id "${id}" must be URL-safe`);
  ids.add(id);
}
assert.strictEqual(ids.size, N, `expected ${N} unique ids, got ${ids.size}`);
console.log(`  ok  ${N} unique nanoid8 ids`);
