/**
 * T28 — Chrome FSA E2E test scaffold.
 *
 * ENV-VAR CONTRACT
 * ─────────────────
 * CHROME_DEVTOOLS_MCP_AVAILABLE
 *   (unset or "skip-this")  → SKIP: test exits 0 with a SKIP log line. Default in CI.
 *   "run"                   → LIVE: full orchestration runs against a real Chrome session
 *                             driven by chrome-devtools-mcp. Requires the MCP server to be
 *                             wired and available in the current Claude Code session.
 *
 * MAINTAINER INVOCATION (live run)
 * ─────────────────────────────────
 *   CHROME_DEVTOOLS_MCP_AVAILABLE=run node fsa-write.e2e.test.js
 *   — or via the wrapper —
 *   CHROME_DEVTOOLS_MCP_AVAILABLE=run bash tests/scripts/assert_fsa_write_e2e.sh
 *
 * WHY SKIP BY DEFAULT
 * ────────────────────
 * chrome-devtools-mcp drives a real Chromium session; it cannot be invoked from a plain
 * node process outside a Claude Code agent context. CI does not have MCP configured, so
 * the default "skip-this" path ensures the test suite remains green without requiring
 * browser infrastructure. The live path is the maintainer's responsibility.
 *
 * TEST OVERVIEW (live path)
 * ──────────────────────────
 * 1. Resolve repo root (BASH_SOURCE-style sentinel walk).
 * 2. Start the T4 dev server (serve.js) on a free port.
 * 3. Navigate Chrome to the spec fixture HTML.
 * 4. Stub window.showDirectoryPicker + window.showSaveFilePicker on the page so the FSA
 *    layer resolves immediately with a virtual in-memory handle.
 * 5. Select a text range programmatically and click the "+ comment" button.
 * 6. Fill and submit the thread form.
 * 7. Read the sidecar JSON written to the tmp dir by the virtual handle.
 * 8. Assert the submitted thread is present.
 * 9. Teardown: stop server, close browser tab.
 */

'use strict';

const path = require('path');
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const net = require('net');

// ─── Skip gate ────────────────────────────────────────────────────────────────

const AVAIL = process.env.CHROME_DEVTOOLS_MCP_AVAILABLE || 'skip-this';

if (AVAIL !== 'run') {
  console.log('SKIP: chrome-devtools-mcp E2E not configured' +
    (AVAIL === 'skip-this' ? ' (CHROME_DEVTOOLS_MCP_AVAILABLE=skip-this)' : ''));
  process.exit(0);
}

// ─── Live path ────────────────────────────────────────────────────────────────

// chrome-devtools-mcp is only available inside a Claude Code agent session.
// When invoked as a plain node process the tools are injected via the harness
// before this file runs; if they are absent the test fails cleanly below.
async function main() {
  // Resolve repo root by walking up from __dirname until .git is found.
  let repoRoot = __dirname;
  while (repoRoot !== path.parse(repoRoot).root) {
    if (fs.existsSync(path.join(repoRoot, '.git'))) break;
    repoRoot = path.dirname(repoRoot);
  }
  if (!fs.existsSync(path.join(repoRoot, '.git'))) {
    throw new Error('Cannot resolve repo root (no .git found above ' + __dirname + ')');
  }

  const serveJs = path.join(repoRoot, 'plugins', 'pmos-toolkit', 'skills', '_shared',
    'html-authoring', 'assets', 'serve.js');
  if (!fs.existsSync(serveJs)) {
    throw new Error('serve.js not found at expected path: ' + serveJs);
  }

  // TODO(maintenance): hard-coded fixture path 02_spec_mini.html — update if the
  // /comments skill ever ships its own fixture, or refactor to read from a config.
  const fixtureRelPath = 'plugins/pmos-toolkit/skills/spec/tests/fixtures/02_spec_mini.html';
  const fixtureFull = path.join(repoRoot, fixtureRelPath);
  if (!fs.existsSync(fixtureFull)) {
    throw new Error('Fixture not found: ' + fixtureFull);
  }

  // ── 1. Find a free port ──────────────────────────────────────────────────
  const port = await findFreePort();

  // ── 2. Start the dev server ──────────────────────────────────────────────
  const server = spawn(process.execPath, [serveJs, '--port', String(port), '--root', repoRoot], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverReady = false;
  let receivedAnyOutput = false;
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server start timeout')), 10_000);

    function onReadyLine() {
      serverReady = true;
      clearTimeout(timeout);
      clearTimeout(fallbackTimer);
      resolve();
    }

    server.stdout.on('data', (chunk) => {
      receivedAnyOutput = true;
      if (!serverReady && /listening|started|port/i.test(chunk.toString())) {
        onReadyLine();
      }
    });
    server.stderr.on('data', (chunk) => {
      // Some serve.js variants print to stderr.
      receivedAnyOutput = true;
      if (!serverReady && /listening|started|port/i.test(chunk.toString())) {
        onReadyLine();
      }
    });
    server.on('exit', (code) => {
      if (!serverReady) {
        clearTimeout(timeout);
        clearTimeout(fallbackTimer);
        reject(new Error(`serve.js exited (code=${code}) before becoming ready`));
      }
    });
    // Fallback: fires after 2 s only if no ready-regex match yet.
    // - Silent server (no output at all): reject — assume hang or dead.
    // - Got some output but no ready line: warn and proceed optimistically.
    const fallbackTimer = setTimeout(() => {
      if (serverReady) return;
      clearTimeout(timeout);
      if (!receivedAnyOutput) {
        reject(new Error(
          'serve.js produced no output and did not log ready within 2s — assuming hang/dead'
        ));
        return;
      }
      // Received output but no ready line — optimistic proceed with a warn.
      console.warn('[fsa-write.e2e] server emitted output but no ready line within 2s; proceeding optimistically');
      serverReady = true;
      resolve();
    }, 2_000);
  });

  const artifactUrl = `http://localhost:${port}/${fixtureRelPath}`;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pmos-fsa-e2e-'));
  const sidecarPath = path.join(tmpDir, '02_spec_mini.comments.json');

  try {
    // ── 3. Navigate Chrome ─────────────────────────────────────────────────
    // These calls go through chrome-devtools-mcp. Outside a Claude Code session
    // the global __mcp__ object is undefined and the lines below will throw.
    await mcpNavigate(artifactUrl);
    await sleep(1_500); // allow page JS to boot

    // ── 4. Stub FSA layer so picker resolves immediately ───────────────────
    // The virtual handle writes JSON to a file in tmpDir so we can inspect it.
    await mcpEvaluate(`
      (function stubFSA() {
        const tmpDir = ${JSON.stringify(tmpDir)};
        const sidecarPath = ${JSON.stringify(sidecarPath)};

        // Minimal FileSystemFileHandle stub.
        const virtualHandle = {
          kind: 'file',
          name: '02_spec_mini.comments.json',
          createWritable: async () => ({
            _buf: '',
            write(chunk) { this._buf += typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk); return Promise.resolve(); },
            close() {
              // Post back to the test via a custom event so the page can signal completion.
              window.__pmos_fsa_written__ = this._buf;
              window.dispatchEvent(new CustomEvent('pmos:fsa-written', { detail: this._buf }));
              return Promise.resolve();
            },
          }),
        };

        // Minimal FileSystemDirectoryHandle stub.
        const virtualDir = {
          kind: 'directory',
          name: tmpDir,
          getFileHandle: async (name, opts) => virtualHandle,
        };

        window.showDirectoryPicker = async () => virtualDir;
        window.showSaveFilePicker  = async () => virtualHandle;
        window.__pmos_fsa_stubbed__ = true;
      })();
    `);

    // ── 5. Select text and trigger comment capture ─────────────────────────
    // Select the first paragraph text programmatically.
    await mcpEvaluate(`
      (function selectText() {
        const el = document.querySelector('p, h1, h2, [data-testid]') || document.body.firstElementChild;
        if (!el) return;
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 100, clientY: 100 }));
      })();
    `);
    await sleep(600);

    // ── 6. Click "+ comment" button ────────────────────────────────────────
    const snapshot = await mcpSnapshot();
    const commentButtonSelector = findCommentButtonSelector(snapshot);
    if (commentButtonSelector) {
      await mcpClick(commentButtonSelector);
    } else {
      // Fall back to evaluate-based click on first matching element.
      await mcpEvaluate(`
        const btn = document.querySelector('[data-action="add-comment"], .pmos-add-comment, button');
        if (btn) btn.click();
      `);
    }
    await sleep(800);

    // ── 7. Fill and submit the thread form ────────────────────────────────
    await mcpEvaluate(`
      const textarea = document.querySelector('textarea, [contenteditable="true"]');
      if (textarea) {
        textarea.value = 'T28 automated smoke thread';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);
    await sleep(300);

    await mcpEvaluate(`
      const form = document.querySelector('form[data-comments], form.pmos-comment-form, form');
      if (form) {
        const submit = form.querySelector('[type="submit"], button');
        if (submit) submit.click();
      }
    `);
    await sleep(1_500);

    // ── 8. Read sidecar from in-page stub ─────────────────────────────────
    const writtenJson = await mcpEvaluate(`window.__pmos_fsa_written__ || null`);

    if (!writtenJson) {
      throw new Error('FAIL: FSA write stub was never called — sidecar JSON not captured');
    }

    let sidecar;
    try {
      sidecar = JSON.parse(writtenJson);
    } catch (e) {
      throw new Error('FAIL: sidecar JSON is malformed: ' + e.message + '\nRaw: ' + writtenJson.slice(0, 200));
    }

    // Assert at least one thread with our submitted text.
    const threads = sidecar.threads || sidecar.comments || Object.values(sidecar);
    const found = JSON.stringify(threads).includes('T28 automated smoke thread');
    if (!found) {
      throw new Error('FAIL: submitted thread text not found in sidecar.\nSidecar keys: ' +
        Object.keys(sidecar).join(', '));
    }

    // Write the sidecar to disk for archive.
    fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2));

    console.log('PASS: fsa-write.e2e — thread captured and FSA write stub resolved');
    console.log('  sidecar written to:', sidecarPath);

  } finally {
    server.kill('SIGTERM');
    // tmpDir intentionally kept for post-mortem if needed; CI can rm -rf on its own.
  }
}

// ─── MCP adapter stubs ────────────────────────────────────────────────────────
// In a live Claude Code agent session these are replaced by the harness with
// actual chrome-devtools-mcp calls. Outside the harness they throw descriptively.

async function mcpNavigate(url) {
  if (typeof globalThis.__mcp_navigate === 'function') {
    return globalThis.__mcp_navigate(url);
  }
  // Attempt dynamic require of a local MCP bridge if present.
  try {
    const bridge = require('./_mcp_bridge');
    return bridge.navigate(url);
  } catch (_) {}
  throw new Error(
    'chrome-devtools-mcp not available. ' +
    'Run inside Claude Code with chrome-devtools-mcp configured, ' +
    'or set CHROME_DEVTOOLS_MCP_AVAILABLE=skip-this to skip.'
  );
}

async function mcpEvaluate(js) {
  if (typeof globalThis.__mcp_evaluate === 'function') return globalThis.__mcp_evaluate(js);
  try { return require('./_mcp_bridge').evaluate(js); } catch (_) {}
  throw new Error('chrome-devtools-mcp not available for evaluate()');
}

async function mcpSnapshot() {
  if (typeof globalThis.__mcp_snapshot === 'function') return globalThis.__mcp_snapshot();
  try { return require('./_mcp_bridge').snapshot(); } catch (_) {}
  return null; // Non-fatal; fall back to evaluate-based click.
}

async function mcpClick(selector) {
  if (typeof globalThis.__mcp_click === 'function') return globalThis.__mcp_click(selector);
  try { return require('./_mcp_bridge').click(selector); } catch (_) {}
  throw new Error('chrome-devtools-mcp not available for click()');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Attempt to derive a CSS selector for the "+ comment" button from a snapshot
 * object. Snapshot format is chrome-devtools-mcp specific; we do best-effort.
 * Returns null if the snapshot is unavailable or the button isn't identifiable.
 */
function findCommentButtonSelector(snapshot) {
  if (!snapshot) return null;
  try {
    const str = JSON.stringify(snapshot);
    if (/add.comment|pmos-add-comment/i.test(str)) {
      return '[data-action="add-comment"], .pmos-add-comment';
    }
  } catch (_) {}
  return null;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('FAIL: fsa-write.e2e —', err.message);
  process.exit(1);
});
