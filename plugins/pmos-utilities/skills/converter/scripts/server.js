#!/usr/bin/env node
'use strict';
// server.js — zero-dependency Node server for /converter (D2).
//
// Routes:
//   GET  /             → the single-file UI (ui/converter.html)
//   GET  /conversions  → JSON list of registry descriptors (the UI builds its selector from this — Inv-1)
//   POST /convert      → runs the chosen converter; returns text (preview) or a binary download (Inv-6)
//
// Node built-ins ONLY: http, fs, path, url, os, crypto, child_process (browser open). No npm deps (Inv-3).
// Loopback only (127.0.0.1), ephemeral port (0), Ctrl-C stops. Node-missing is a hard launch error
// handled by SKILL.md before this runs (Inv-5 — no silent file:// fallback).

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const SKILL_DIR = path.join(__dirname, '..');
const UI_FILE = path.join(SKILL_DIR, 'ui', 'converter.html');
const CONVERTERS_DIR = path.join(SKILL_DIR, 'lib', 'converters');
const registry = require(path.join(SKILL_DIR, 'lib', 'registry.js'));

// --- args ---------------------------------------------------------------
const argv = process.argv.slice(2);
const noOpen = argv.includes('--no-open') || process.env.CONVERTER_NO_OPEN === '1';

// --- discover the registry ----------------------------------------------
try {
  registry.discover(CONVERTERS_DIR);
} catch (e) {
  process.stderr.write(`converter: failed to load converters: ${e.message}\n`);
  process.exit(1);
}

// --- helpers ------------------------------------------------------------
const EXT = { yaml: 'yaml', json: 'json', csv: 'csv', md: 'md', html: 'html', pdf: 'pdf', text: 'txt' };

function sendJson(res, status, obj) {
  const body = Buffer.from(JSON.stringify(obj), 'utf8');
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': body.length, 'Cache-Control': 'no-store' });
  res.end(body);
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const LIMIT = 64 * 1024 * 1024; // 64 MiB guard
    req.on('data', (c) => {
      size += c.length;
      if (size > LIMIT) {
        reject(new Error('request body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function handleConvert(req, res, query) {
  const raw = await readBody(req);
  const ctype = (req.headers['content-type'] || '').toLowerCase();

  let id = query.get('id');
  let input;
  if (ctype.includes('application/json')) {
    let payload;
    try {
      payload = JSON.parse(raw.toString('utf8') || '{}');
    } catch (e) {
      return sendError(res, 400, `invalid JSON request body: ${e.message}`);
    }
    if (payload.id) id = payload.id;
    input = payload.input;
  }

  if (!id) return sendError(res, 400, 'missing conversion id (send {id, input} as JSON, or ?id=…)');
  const descriptor = registry.get(id);
  if (!descriptor) return sendError(res, 404, `unknown conversion id: ${id}`);

  // Resolve the input per the descriptor's input mode.
  let convertInput;
  if (descriptor.inputMode === 'binary') {
    convertInput = raw; // raw bytes
  } else {
    convertInput = input != null ? String(input) : raw.toString('utf8');
  }

  const ctx = { log: (m) => process.stderr.write(`[convert ${id}] ${m}\n`), tmpdir: os.tmpdir() };

  let output;
  try {
    output = await descriptor.convert(convertInput, ctx);
  } catch (e) {
    return sendError(res, 422, e.message || String(e));
  }

  if (descriptor.outputMode === 'binary') {
    const buf = Buffer.isBuffer(output) ? output : Buffer.from(output);
    const ext = EXT[descriptor.to] || 'bin';
    const ctypeOut = descriptor.contentType || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': ctypeOut,
      'Content-Length': buf.length,
      'Content-Disposition': `attachment; filename="converted.${ext}"`,
      'X-Output-Mode': 'binary',
      'X-Output-Ext': ext,
      'Cache-Control': 'no-store',
    });
    res.end(buf);
    return;
  }

  const body = Buffer.from(String(output), 'utf8');
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': body.length,
    'X-Output-Mode': 'text',
    'X-Output-Ext': EXT[descriptor.to] || 'txt',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

// --- server -------------------------------------------------------------
const server = http.createServer((req, res) => {
  let parsed;
  try {
    parsed = new URL(req.url, 'http://127.0.0.1');
  } catch (_e) {
    return sendError(res, 400, 'bad request url');
  }
  const pathname = parsed.pathname;

  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    let body;
    try {
      body = fs.readFileSync(UI_FILE);
    } catch (e) {
      return sendError(res, 500, `cannot read UI file: ${e.code || e.message}`);
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': body.length, 'Cache-Control': 'no-store' });
    res.end(body);
    return;
  }

  if (req.method === 'GET' && pathname === '/conversions') {
    return sendJson(res, 200, { conversions: registry.list() });
  }

  if (req.method === 'POST' && pathname === '/convert') {
    handleConvert(req, res, parsed.searchParams).catch((e) => {
      if (!res.headersSent) sendError(res, 500, e.message || String(e));
    });
    return;
  }

  sendError(res, 404, `no route for ${req.method} ${pathname}`);
});

server.on('error', (e) => {
  process.stderr.write(`converter: server error: ${e.code || e.message}\n`);
  process.exit(1);
});

server.listen(0, '127.0.0.1', () => {
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/`;
  const ids = registry.list().map((d) => d.id).join(', ');
  process.stdout.write(`Converter ready at ${url}\n`);
  process.stdout.write(`Conversions: ${ids}\n`);
  process.stdout.write('Press Ctrl-C to stop the server.\n');
  if (!noOpen) openBrowser(url);
});

function openBrowser(targetUrl) {
  let cmd;
  let args;
  switch (process.platform) {
    case 'darwin': cmd = 'open'; args = [targetUrl]; break;
    case 'win32': cmd = 'cmd'; args = ['/c', 'start', '', targetUrl]; break;
    default: cmd = 'xdg-open'; args = [targetUrl]; break;
  }
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => process.stdout.write(`Could not auto-open a browser — visit ${targetUrl} manually.\n`));
    child.unref();
  } catch (_e) {
    process.stdout.write(`Could not auto-open a browser — visit ${targetUrl} manually.\n`);
  }
}

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 500).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// crypto is reserved for future request-id tagging; reference it so linters see the import used.
void crypto;
