#!/usr/bin/env node
// serve.js — zero-deps static server for a feature folder. FR-06.
// Usage: cd <feature-folder> && node assets/serve.js
//        node assets/serve.js [--port N] [--port-file FILE] [--root DIR]

'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm':  'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.md':   'text/plain; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
  '.woff': 'font-woff',
  '.woff2':'font-woff2',
};

const DEFAULT_BASE_PORT = 8765;
const PORT_SCAN_LIMIT   = 10;

function parseArgs(argv) {
  const out = { root: process.cwd(), port: null, portFile: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port' && argv[i+1]) { out.port = parseInt(argv[++i], 10); }
    else if (a === '--port-file' && argv[i+1]) { out.portFile = argv[++i]; }
    else if (a === '--root' && argv[i+1]) { out.root = path.resolve(argv[++i]); }
    else if (a === '--help' || a === '-h') { out.help = true; }
  }
  return out;
}

function safeJoin(root, reqPath) {
  // Decode + strip query/hash before path-join; reject traversal.
  // Boundary check requires path.sep — bare startsWith() lets `/tmp/feat`
  // match `/tmp/feat-evil/...` after `%2E%2E/feat-evil/...` decodes through.
  let decoded;
  try { decoded = decodeURIComponent(reqPath.split('?')[0].split('#')[0]); }
  catch (_) { return null; }
  const joined  = path.normalize(path.join(root, decoded));
  const rootSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (joined !== root && !joined.startsWith(rootSep)) return null;
  return joined;
}

function send(res, code, body, headers = {}) {
  res.writeHead(code, headers);
  res.end(body);
}

function handler(root) {
  return function (req, res) {
    let target = safeJoin(root, req.url || '/');
    if (!target) return send(res, 403, 'Forbidden\n', { 'Content-Type': 'text/plain; charset=utf-8' });

    fs.stat(target, (err, st) => {
      if (err) return send(res, 404, 'Not Found\n', { 'Content-Type': 'text/plain; charset=utf-8' });
      if (st.isDirectory()) {
        const idx = path.join(target, 'index.html');
        return fs.stat(idx, (e2) => {
          if (e2) return send(res, 404, 'Not Found\n', { 'Content-Type': 'text/plain; charset=utf-8' });
          stream(idx, res);
        });
      }
      stream(target, res);
    });
  };
}

function stream(file, res) {
  const ext = path.extname(file).toLowerCase();
  const ctype = MIME[ext] || 'text/plain; charset=utf-8';
  res.writeHead(200, { 'Content-Type': ctype, 'Cache-Control': 'no-store' });
  fs.createReadStream(file)
    .on('error', () => { try { res.end(); } catch (_) {} })
    .pipe(res);
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    const onErr = (err) => { server.removeListener('listening', onOk); reject(err); };
    const onOk  = () => { server.removeListener('error', onErr); resolve(port); };
    server.once('error', onErr);
    server.once('listening', onOk);
    server.listen(port, '127.0.0.1');
  });
}

async function start({ root, port, portFile }) {
  const server = http.createServer(handler(path.resolve(root)));
  const startPort = Number.isFinite(port) ? port : DEFAULT_BASE_PORT;
  let bound = null;
  for (let i = 0; i < PORT_SCAN_LIMIT; i++) {
    const p = startPort + i;
    try { bound = await listen(server, p); break; }
    catch (e) {
      if (e.code !== 'EADDRINUSE') throw e;
      // try next port
    }
  }
  if (!bound) throw new Error(`No free port in range ${startPort}..${startPort + PORT_SCAN_LIMIT - 1}`);

  if (portFile) fs.writeFileSync(portFile, String(bound));
  const u = `http://127.0.0.1:${bound}/index.html`;
  process.stdout.write(`Serving ${path.resolve(root)}\n`);
  process.stdout.write(`Open ${u}\n`);
  return server;
}

if (require.main === module) {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write('Usage: node serve.js [--port N] [--port-file FILE] [--root DIR]\n');
    process.exit(0);
  }
  start(args).catch((e) => { process.stderr.write(`serve.js: ${e.message}\n`); process.exit(1); });
}

module.exports = { start, MIME };
