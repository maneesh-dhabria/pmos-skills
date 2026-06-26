#!/usr/bin/env node
// serve-web.mjs — read-only live-read HTTP server for the /people web viewer (story 260626-nq0).
//
// Mirrors /backlog's serve-web.mjs conventions (loopback bind, ephemeral free port, default-
// browser auto-open, run-until-Ctrl-C, --no-open test seam) with a data route that derives the
// people listing fresh on every request directly from the person files — never reads or writes
// any INDEX (INV-3). Two routes only — no mutation endpoint exists (read-only). Node stdlib only.
//
//   node people/scripts/serve-web.mjs [--no-open] [--port N] [--people-dir PATH]
//
// Data source resolution (first wins): --people-dir flag → $PMOS_PEOPLE_DIR → ~/.pmos/people.
// The override exists so the test harness can point the server at a fixture store.

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parsePeople, buildModel } from './serve-web-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIEWER = path.join(__dirname, '..', 'web', 'viewer.html');

function parseArgs(argv) {
  const a = { open: true, port: 0, peopleDir: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--no-open') a.open = false;
    else if (argv[i] === '--port') a.port = Number(argv[++i]) || 0;
    else if (argv[i].startsWith('--port=')) a.port = Number(argv[i].slice(7)) || 0;
    else if (argv[i] === '--people-dir') a.peopleDir = argv[++i] || null;
    else if (argv[i].startsWith('--people-dir=')) a.peopleDir = argv[i].slice(13) || null;
  }
  return a;
}

function resolvePeopleDir(flagDir) {
  if (flagDir) return flagDir;
  if (process.env.PMOS_PEOPLE_DIR) return process.env.PMOS_PEOPLE_DIR;
  return path.join(os.homedir(), '.pmos', 'people');
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

function buildPeople(peopleDir) {
  const { people, skipped } = parsePeople(peopleDir);
  if (skipped.length) {
    for (const s of skipped) console.error(`serve-web: skipped ${s.file} (${s.reason})`);
  }
  return buildModel(people, { repo: path.basename(path.dirname(path.dirname(peopleDir))) || '' });
}

function start(opts) {
  const peopleDir = resolvePeopleDir(opts.peopleDir);

  const server = http.createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];

    // Read-only: only GET/HEAD are served; everything else (POST/PUT/DELETE) → 404.
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

    if (url === '/api/people') {
      let model;
      try {
        model = buildPeople(peopleDir); // fresh parse per request — live read, no INDEX (INV-3)
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
    console.log(`People viewer ready at ${url}`);
    console.log(`Read-only · derives ${peopleDir} on every refresh · Ctrl-C to stop`);
    if (opts.open) openBrowser(url);
  });

  server.on('error', (e) => {
    console.error(`serve-web: ${e.code === 'EADDRINUSE' ? `port ${opts.port} in use` : e.message}`);
    process.exit(1);
  });
}

start(parseArgs(process.argv.slice(2)));
