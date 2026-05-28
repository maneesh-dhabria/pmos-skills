/* T3: comments.js inline-JSON read path + FR-14 mode detection + POST submit + 409 banner.
 *
 * Harness:
 *   - jsdom is staged at /tmp/pmos-jsdom/node_modules.
 *   - Run via: NODE_PATH=/tmp/pmos-jsdom/node_modules node <this-file>
 *   - We require jsdom via a NODE_PATH-aware fallback so the test runs
 *     whether NODE_PATH is set or not (resolves /tmp/pmos-jsdom directly).
 *
 * Refs: FR-13, FR-14, FR-15, FR-16, FR-17, E2, E3, E4, E5, E6, E11.
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

let JSDOM;
try {
  ({ JSDOM } = require('jsdom'));
} catch (_) {
  // Fallback: resolve staged jsdom by absolute path. /tmp/pmos-jsdom is the
  // /verify + CI canonical location; /tmp/pmos-jsdom22 is a node-20-compatible
  // alternative installed locally when 29.x requires node ≥20.19.
  let resolved = null;
  for (const p of ['/tmp/pmos-jsdom/node_modules/jsdom', '/tmp/pmos-jsdom22/node_modules/jsdom']) {
    try { resolved = require(p); break; } catch (_) { /* try next */ }
  }
  if (!resolved) throw new Error('jsdom not resolvable; tried /tmp/pmos-jsdom and /tmp/pmos-jsdom22');
  JSDOM = resolved.JSDOM;
}

const COMMENTS_JS_PATH = path.resolve(
  __dirname,
  '..',
  'assets',
  'comments.js'
);
const COMMENTS_JS_SRC = fs.readFileSync(COMMENTS_JS_PATH, 'utf8');

/* --- Fixture --------------------------------------------------------------
 * Sentinel-bracketed inline JSON at version:5 with 2 sample threads.
 * Mirrors what render.js bakes at emit time. */
const INLINE_PAYLOAD = {
  schema: 1,
  version: 5,
  generated_at: '2026-05-28T00:00:00.000Z',
  threads: [
    { id: 'aaaaaaaa', status: 'open', messages: [{ role: 'user', body: 'one', ts: '2026-05-28T00:00:00.000Z' }] },
    { id: 'bbbbbbbb', status: 'open', messages: [{ role: 'user', body: 'two', ts: '2026-05-28T00:00:00.000Z' }] },
  ],
};

function buildFixture() {
  return [
    '<!doctype html><html><head><meta charset="utf-8"><title>fx</title></head><body>',
    '<main><p>hello</p></main>',
    '<!-- pmos-comments:start -->',
    '<script id="pmos-comments" type="application/json">',
    JSON.stringify(INLINE_PAYLOAD),
    '</script>',
    '<!-- pmos-comments:end -->',
    '</body></html>',
  ].join('\n');
}

/* --- buildDom: jsdom with stub fetch ------------------------------------- */
function buildDom({ protocol = 'http:', fetchImpl }) {
  const url = `${protocol}//host/x.html`;
  const dom = new JSDOM(buildFixture(), { url, runScripts: 'outside-only' });
  const w = dom.window;
  w.__pmosTest = true;
  w.fetch = fetchImpl;
  // Provide AbortController if jsdom doesn't (modern versions do).
  if (typeof w.AbortController === 'undefined' && typeof AbortController !== 'undefined') {
    w.AbortController = AbortController;
  }
  // Eval comments.js inside the jsdom window context.
  w.eval(COMMENTS_JS_SRC);
  return dom;
}

/* --- runDetect: drives detectMode under a given fetch stub --------------- */
async function runDetect({ protocol, headStatus, timeoutMs }) {
  const fetchImpl = (url, opts) => {
    // Honor AbortController so the timeout case rejects on abort.
    if (timeoutMs != null) {
      return new Promise((_, rej) => {
        const sig = opts && opts.signal;
        if (sig) {
          sig.addEventListener('abort', () => {
            const e = new Error('aborted'); e.name = 'AbortError'; rej(e);
          });
        }
        // Never resolve on its own — only abort triggers rejection.
      });
    }
    return Promise.resolve({
      status: headStatus,
      ok: headStatus >= 200 && headStatus < 300,
    });
  };
  const dom = buildDom({ protocol, fetchImpl });
  const hook = dom.window.__pmosTestHook;
  assert.ok(hook, 'comments.js must expose __pmosTestHook when __pmosTest=true');
  return hook.detectMode();
}

/* --- Test 1: detection table -------------------------------------------- */
(async function () {
  const fileMode = await runDetect({ protocol: 'file:', headStatus: null, timeoutMs: null });
  assert.equal(fileMode, 'read-only', 'file:// short-circuits to read-only');

  const http204 = await runDetect({ protocol: 'http:', headStatus: 204, timeoutMs: null });
  assert.equal(http204, 'read-write', 'http://+HEAD 204 → read-write');

  const http404 = await runDetect({ protocol: 'http:', headStatus: 404, timeoutMs: null });
  assert.equal(http404, 'read-only', 'http://+HEAD 404 → read-only');

  const httpTimeout = await runDetect({ protocol: 'http:', headStatus: null, timeoutMs: 600 });
  assert.equal(httpTimeout, 'read-only', 'http://+timeout (>500ms abort) → read-only');

  console.log('OK: detect-table (4/4)');
})()
  /* --- Test 2: inline-JSON hydrate ------------------------------------- */
  .then(async () => {
    const dom = buildDom({
      protocol: 'http:',
      fetchImpl: () => Promise.resolve({ status: 404, ok: false }),
    });
    const hook = dom.window.__pmosTestHook;
    const s = hook._state();
    assert.equal(s.version, 5, 'hydrated _state.version from inline JSON');
    assert.equal(s.threads.length, 2, 'hydrated 2 threads from inline JSON');
    assert.equal(s.generated_at, '2026-05-28T00:00:00.000Z', 'hydrated generated_at');
    console.log('OK: inline-hydrate');
  })
  /* --- Test 3: POST submit (200) -------------------------------------- */
  .then(async () => {
    let posted = null;
    const fetchImpl = (url, opts) => {
      if (opts && opts.method === 'HEAD') {
        return Promise.resolve({ status: 204, ok: true });
      }
      if (opts && opts.method === 'POST') {
        posted = { url, body: JSON.parse(opts.body) };
        return Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ version: 6, generated_at: '2026-05-28T01:00:00.000Z' }),
        });
      }
      return Promise.resolve({ status: 404, ok: false });
    };
    const dom = buildDom({ protocol: 'http:', fetchImpl });
    const hook = dom.window.__pmosTestHook;
    // Wait one microtask tick for detectMode to settle (mount kicks it off).
    await new Promise((r) => setTimeout(r, 50));
    const result = await hook.postSubmit({ body: 'new thread', author: 'u' });
    assert.equal(result.ok, true, 'postSubmit ok=true on 200');
    assert.ok(posted, 'POST was issued');
    assert.equal(posted.body.expected_version, 5, 'expected_version sent as current version');
    assert.equal(posted.body.payload.schema, 1, 'payload.schema is 1');
    assert.equal(posted.body.payload.threads.length, 3, 'payload.threads grew by 1');
    const s = hook._state();
    assert.equal(s.version, 6, '_state.version bumped to server response');
    console.log('OK: post-submit-200');
  })
  /* --- Test 4: 409 banner --------------------------------------------- */
  .then(async () => {
    const fetchImpl = (url, opts) => {
      if (opts && opts.method === 'HEAD') {
        return Promise.resolve({ status: 204, ok: true });
      }
      if (opts && opts.method === 'POST') {
        return Promise.resolve({
          status: 409,
          ok: false,
          json: () => Promise.resolve({ error: 'version-conflict', current_version: 8 }),
        });
      }
      return Promise.resolve({ status: 404, ok: false });
    };
    const dom = buildDom({ protocol: 'http:', fetchImpl });
    const hook = dom.window.__pmosTestHook;
    await new Promise((r) => setTimeout(r, 50));
    const result = await hook.postSubmit({ body: 'conflicting', author: 'u' });
    assert.equal(result.ok, false, 'postSubmit ok=false on 409');
    assert.equal(result.conflict_version, 8, 'conflict_version surfaces');
    const banner = dom.window.document.querySelector('.pmos-conflict-banner');
    assert.ok(banner, '.pmos-conflict-banner mounted');
    assert.ok(/current version:\s*8/.test(banner.textContent),
      'banner text mentions current version: 8 (got: ' + JSON.stringify(banner.textContent) + ')');
    console.log('OK: 409-banner');
    console.log('');
    console.log('ALL PASS');
  })
  .catch((err) => {
    console.error('FAIL:', err && err.stack || err);
    process.exit(1);
  });
