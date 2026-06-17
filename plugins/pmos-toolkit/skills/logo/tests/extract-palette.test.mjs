// extract-palette.test.mjs — tests for extract-palette.mjs.
// Builds a tiny valid truecolor non-interlaced PNG in-memory (node:zlib deflate of
// raw RGB scanlines), runs the script, asserts a non-empty hex palette. Also asserts
// the graceful-degradation path on a bogus/non-PNG file.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, '..', 'scripts', 'extract-palette.mjs');

// --- hand-build a minimal 4x4 truecolor (color type 2, bit depth 8) PNG ----
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) {
      crc = (crc & 1) ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function buildPng() {
  const width = 4, height = 4;
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // color type 2 = truecolor RGB
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace = none

  // Two dominant colors: top half deep red, bottom half navy blue.
  const colorA = [200, 30, 30];
  const colorB = [30, 40, 160];
  const stride = width * 3;
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + stride);
    row[0] = 0; // filter type None
    const color = y < height / 2 ? colorA : colorB;
    for (let x = 0; x < width; x++) {
      row[1 + x * 3] = color[0];
      row[1 + x * 3 + 1] = color[1];
      row[1 + x * 3 + 2] = color[2];
    }
    rawRows.push(row);
  }
  const idatData = zlib.deflateSync(Buffer.concat(rawRows));

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function runScript(file) {
  const out = execFileSync('node', [SCRIPT, file], { encoding: 'utf8' });
  return JSON.parse(out.trim());
}

export function run(assert) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logos-palette-'));

  // --- valid PNG -> non-empty hex palette --------------------------------
  {
    const pngPath = path.join(tmpDir, 'swatch.png');
    fs.writeFileSync(pngPath, buildPng());
    const res = runScript(pngPath);
    assert.ok(Array.isArray(res.palette), 'palette is an array');
    assert.ok(res.palette.length >= 1, 'palette is non-empty for a valid PNG');
    for (const hex of res.palette) {
      assert.ok(/^#[0-9a-f]{6}$/.test(hex), `palette entry is a hex string: ${hex}`);
    }
    assert.ok(res.warning === undefined, 'no warning on a decodable PNG');
  }

  // --- bogus / non-PNG file -> graceful degradation ----------------------
  {
    const bogusPath = path.join(tmpDir, 'not-an-image.jpg');
    fs.writeFileSync(bogusPath, 'this is plainly not a PNG or JPEG payload');
    const res = runScript(bogusPath);
    assert.deepStrictEqual(res.palette, [], 'bogus file yields empty palette');
    assert.ok(typeof res.warning === 'string' && res.warning.length > 0, 'bogus file carries a warning');
  }

  // --- truncated PNG signature only -> graceful degradation --------------
  {
    const truncPath = path.join(tmpDir, 'trunc.png');
    fs.writeFileSync(truncPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const res = runScript(truncPath);
    assert.deepStrictEqual(res.palette, [], 'truncated PNG yields empty palette');
    assert.ok(typeof res.warning === 'string', 'truncated PNG carries a warning');
  }

  // cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
