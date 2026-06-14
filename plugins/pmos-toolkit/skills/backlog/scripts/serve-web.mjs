#!/usr/bin/env node
// serve-web.mjs — read-only live-read HTTP server for the /backlog web viewer (story 260613-14b).
//
// Borrows the game-launcher conventions (loopback bind, ephemeral free port, default-browser
// auto-open, run-until-Ctrl-C, --no-open test seam) but adds a data route that parses the
// backlog fresh on every request (D2 live read). Two routes only — no mutation endpoint exists
// (D3 read-only). Node stdlib only (node:http/fs/path/child_process). No write handle to backlog/.
//
//   node backlog/scripts/serve-web.mjs [--no-open] [--port N]
//
// Exit/error contract: node-absence is the /backlog web verb's concern, not the server's.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseItems, buildModel } from './serve-web-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIEWER = path.join(__dirname, '..', 'web', 'viewer.html');

function parseArgs(argv) {
  const a = { open: true, port: 0 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--no-open') a.open = false;
    else if (argv[i] === '--port') a.port = Number(argv[++i]) || 0;
    else if (argv[i].startsWith('--port=')) a.port = Number(argv[i].slice(7)) || 0;
  }
  return a;
}

function repoRoot() {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  } catch (_e) {
    return process.cwd();
  }
}

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  try {
    const child = spawn(cmd, [url], { stdio: 'ignore', detached: true, shell: process.platform === 'win32' });
    child.on('error', () => {}); // headless / no browser → silently degrade to the printed URL
    child.unref();
  } catch (_e) {
    /* ignore — URL is already printed */
  }
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}

function send404(res) {
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}

function buildBacklog(root) {
  const itemsDir = path.join(root, 'backlog', 'items');
  const claimsDir = path.join(root, 'backlog', 'claims');
  const { items, skipped } = parseItems(itemsDir);
  if (skipped.length) {
    for (const s of skipped) console.error(`serve-web: skipped ${s.file} (${s.reason})`);
  }
  const model = buildModel(items, { claimsDir, repo: path.basename(root) });
  return model;
}

function start(opts) {
  const root = repoRoot();

  const server = http.createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];

    // Read-only: only GET/HEAD are served; everything else (POST/PUT/DELETE) → 404 (D3).
    if (req.method !== 'GET' && req.method !== 'HEAD') return send404(res);

    // Browsers auto-request /favicon.ico; answer 204 so it isn't a console error (we ship none).
    if (url === '/favicon.ico') { res.writeHead(204); return res.end(); }

    if (url === '/' || url === '/index.html') {
      let html;
      try {
        html = fs.readFileSync(VIEWER);
      } catch (_e) {
        res.writeHead(500, { 'content-type': 'text/plain' });
        return res.end('viewer.html not found');
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-length': html.length });
      return res.end(req.method === 'HEAD' ? undefined : html);
    }

    if (url === '/api/backlog') {
      let model;
      try {
        model = buildBacklog(root); // fresh parse per request — live read (D2)
      } catch (e) {
        return sendJson(res, 500, { error: String(e && e.message) });
      }
      if (req.method === 'HEAD') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(); }
      return sendJson(res, 200, model);
    }

    return send404(res);
  });

  server.listen(opts.port, '127.0.0.1', () => {
    const port = server.address().port;
    const url = `http://127.0.0.1:${port}/`;
    console.log(`Backlog viewer ready at ${url}`);
    console.log('Read-only · live reads the backlog on every refresh · Ctrl-C to stop');
    if (opts.open) openBrowser(url);
  });

  server.on('error', (e) => {
    console.error(`serve-web: ${e.code === 'EADDRINUSE' ? `port ${opts.port} in use` : e.message}`);
    process.exit(1);
  });
}

start(parseArgs(process.argv.slice(2)));
