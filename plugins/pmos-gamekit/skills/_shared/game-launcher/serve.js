#!/usr/bin/env node
// game-launcher/serve.js — zero-dependency static launcher for a single bundled game file.
//
// Contract (see game-launcher.md, the §K canonical home):
//   node serve.js <path-to-game.html>
//     - binds an ephemeral free port on 127.0.0.1 (loopback only — never 0.0.0.0)
//     - serves EXACTLY the one passed file at GET / (and HEAD /); 404 for any other path
//     - auto-opens the default browser at the URL (open/xdg-open/start by platform),
//       degrading to a printed "visit <URL>" line if the opener is unavailable
//     - prints the URL to stdout; runs until Ctrl-C (SIGINT/SIGTERM) then exits 0
//     - read-only: no writes, no /save, no persistence (D6)
//
// Node stdlib only (node:http, node:fs, node:path, node:child_process). No deps (D2/D7).
//
// Test seam: pass --no-open (or set GAME_LAUNCHER_NO_OPEN=1) to suppress the browser
// spawn so headless self-tests can drive the server without opening a window.

'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

function fail(msg, code) {
  process.stderr.write(`game-launcher: ${msg}\n`);
  process.exit(code == null ? 1 : code);
}

// --- args ---------------------------------------------------------------
const argv = process.argv.slice(2);
const noOpen = argv.includes('--no-open') || process.env.GAME_LAUNCHER_NO_OPEN === '1';
const fileArg = argv.find((a) => !a.startsWith('--'));

if (!fileArg) {
  fail('usage: node serve.js <path-to-game.html> [--no-open]', 64);
}

const gamePath = path.resolve(fileArg);
let gameStat;
try {
  gameStat = fs.statSync(gamePath);
} catch (e) {
  fail(`cannot read game file: ${gamePath} (${e.code || e.message})`, 66);
}
if (!gameStat.isFile()) {
  fail(`not a regular file: ${gamePath}`, 66);
}

// --- content type (the file is HTML by contract; keep a tiny map anyway) ---
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
};
const contentType = TYPES[path.extname(gamePath).toLowerCase()] || 'application/octet-stream';

// --- server: serve the one file at / (and HEAD /); 404 everywhere else ---
const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if ((req.method === 'GET' || req.method === 'HEAD') && (url === '/' || url === '/index.html')) {
    let body;
    try {
      body = fs.readFileSync(gamePath);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`failed to read game file: ${e.code || e.message}`);
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 — this launcher serves only the game at /');
});

server.on('error', (e) => fail(`server error: ${e.code || e.message}`, 1));

// listen on an ephemeral free port (0) bound to loopback
server.listen(0, '127.0.0.1', () => {
  const { port } = server.address();
  const fileUrl = `http://127.0.0.1:${port}/`;
  process.stdout.write(`Game ready at ${fileUrl}\n`);
  process.stdout.write('Press Ctrl-C to stop the server.\n');
  if (!noOpen) {
    openBrowser(fileUrl);
  }
});

// --- browser auto-open with graceful degrade -----------------------------
function openBrowser(targetUrl) {
  let cmd;
  let args;
  switch (process.platform) {
    case 'darwin':
      cmd = 'open';
      args = [targetUrl];
      break;
    case 'win32':
      cmd = 'cmd';
      args = ['/c', 'start', '', targetUrl];
      break;
    default: // linux, bsd, etc.
      cmd = 'xdg-open';
      args = [targetUrl];
      break;
  }
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => {
      process.stdout.write(`Could not auto-open a browser — visit ${targetUrl} manually.\n`);
    });
    child.unref();
  } catch (_e) {
    process.stdout.write(`Could not auto-open a browser — visit ${targetUrl} manually.\n`);
  }
}

// --- clean shutdown ------------------------------------------------------
function shutdown() {
  server.close(() => process.exit(0));
  // force-exit if close hangs on a lingering keep-alive socket
  setTimeout(() => process.exit(0), 500).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
