#!/usr/bin/env node
// extract-palette.mjs — zero-dependency k-means palette extractor.
//
// CLI:  node extract-palette.mjs <path.png|.jpg>
//   stdout: { "palette": ["#RRGGBB", ...] }  (most-dominant first, up to 6 swatches)
//
// HONESTY / DEGRADATION POLICY:
//   Decoding arbitrary rasters without an image library is infeasible. This script
//   implements a *minimal* PNG decoder for the common case only:
//       - PNG signature present
//       - bit depth 8
//       - color type 2 (truecolor RGB) or 6 (truecolor + alpha)
//       - NO interlacing (interlace method 0)
//       - zlib/DEFLATE IDAT (inflated via node:zlib — a Node built-in)
//   It supports the 5 standard PNG scanline filters (None/Sub/Up/Average/Paeth).
//   On ANYTHING else — JPEG, interlaced PNG, palette/grayscale PNG, bit depth ≠ 8,
//   a corrupt/short file — it does NOT crash. It prints
//       { "palette": [], "warning": "could not decode <file>; pass colors explicitly" }
//   to stdout and exits 0, so the caller never breaks. Partial decoder, clean fallback.

import fs from 'node:fs';
import zlib from 'node:zlib';

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function degrade(file) {
  process.stdout.write(JSON.stringify({ palette: [], warning: `could not decode ${file}; pass colors explicitly` }) + '\n');
  process.exit(0);
}

// --- minimal PNG decode → array of [r,g,b] pixels (sampled) ----------------
function decodePngPixels(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIG)) return null;

  let off = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idatChunks = [];

  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const dataStart = off + 8;
    const dataEnd = dataStart + len;
    if (dataEnd + 4 > buf.length) break; // truncated chunk
    if (type === 'IHDR') {
      width = buf.readUInt32BE(dataStart);
      height = buf.readUInt32BE(dataStart + 4);
      bitDepth = buf[dataStart + 8];
      colorType = buf[dataStart + 9];
      interlace = buf[dataStart + 12];
    } else if (type === 'IDAT') {
      idatChunks.push(buf.subarray(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }
    off = dataEnd + 4; // skip CRC
  }

  // Only the common truecolor / 8-bit / non-interlaced case is supported.
  if (bitDepth !== 8 || interlace !== 0) return null;
  if (colorType !== 2 && colorType !== 6) return null;
  if (width <= 0 || height <= 0 || idatChunks.length === 0) return null;

  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;

  let raw;
  try {
    raw = zlib.inflateSync(Buffer.concat(idatChunks));
  } catch (e) {
    return null;
  }
  // expected size = height * (1 filter byte + stride)
  if (raw.length < height * (1 + stride)) return null;

  // Un-filter scanlines (RFC 2083). bpp = bytes per pixel.
  const bpp = channels;
  const out = Buffer.alloc(height * stride);
  let prevLine = Buffer.alloc(stride); // all zeros for first row's "up"

  let rpos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rpos++];
    const line = out.subarray(y * stride, y * stride + stride);
    raw.copy(line, 0, rpos, rpos + stride);
    rpos += stride;

    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0;        // left
      const b = prevLine[x];                          // up
      const c = x >= bpp ? prevLine[x - bpp] : 0;     // up-left
      let val = line[x];
      switch (filter) {
        case 0: break;                                // None
        case 1: val = (val + a) & 0xff; break;        // Sub
        case 2: val = (val + b) & 0xff; break;        // Up
        case 3: val = (val + ((a + b) >> 1)) & 0xff; break; // Average
        case 4: {                                      // Paeth
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          val = (val + pr) & 0xff;
          break;
        }
        default: return null;                          // unknown filter
      }
      line[x] = val;
    }
    prevLine = line;
  }

  // Sample pixels (cap the working set for k-means speed).
  const pixels = [];
  const total = width * height;
  const target = 4000;
  const step = Math.max(1, Math.floor(total / target));
  for (let i = 0; i < total; i += step) {
    const base = i * channels;
    if (channels === 4) {
      const alpha = out[base + 3];
      if (alpha < 16) continue; // skip near-transparent
    }
    pixels.push([out[base], out[base + 1], out[base + 2]]);
  }
  return pixels.length ? pixels : null;
}

// --- k-means (k clusters) over RGB -----------------------------------------
function kmeans(pixels, k, iterations = 12) {
  if (pixels.length === 0) return [];
  k = Math.min(k, pixels.length);

  // Deterministic seeding: evenly-spaced picks across the sample.
  const centroids = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.floor((i * pixels.length) / k);
    centroids.push(pixels[idx].slice());
  }

  let assignments = new Array(pixels.length).fill(0);
  for (let iter = 0; iter < iterations; iter++) {
    let changed = false;
    for (let i = 0; i < pixels.length; i++) {
      const px = pixels[i];
      let best = 0, bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const dr = px[0] - centroids[c][0];
        const dg = px[1] - centroids[c][1];
        const db = px[2] - centroids[c][2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bestD) { bestD = d; best = c; }
      }
      if (assignments[i] !== best) { assignments[i] = best; changed = true; }
    }
    // recompute centroids
    const sums = centroids.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < pixels.length; i++) {
      const a = assignments[i];
      sums[a][0] += pixels[i][0];
      sums[a][1] += pixels[i][1];
      sums[a][2] += pixels[i][2];
      sums[a][3] += 1;
    }
    for (let c = 0; c < centroids.length; c++) {
      if (sums[c][3] > 0) {
        centroids[c] = [
          Math.round(sums[c][0] / sums[c][3]),
          Math.round(sums[c][1] / sums[c][3]),
          Math.round(sums[c][2] / sums[c][3]),
        ];
      }
    }
    if (!changed) break;
  }

  // count cluster sizes for dominance ordering
  const counts = centroids.map(() => 0);
  for (const a of assignments) counts[a]++;

  return centroids
    .map((c, i) => ({ rgb: c, count: counts[i] }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((e) => e.rgb);
}

function toHex(rgb) {
  return '#' + rgb.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

function main(argv) {
  const file = argv.slice(2).find((a) => !a.startsWith('--'));
  if (!file) {
    process.stderr.write('usage: node extract-palette.mjs <path.png|.jpg>\n');
    process.exit(64);
  }

  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch (e) {
    // unreadable file: still degrade gracefully (never crash the caller)
    return degrade(file);
  }

  let pixels = null;
  try {
    pixels = decodePngPixels(buf);
  } catch (e) {
    pixels = null;
  }

  if (!pixels) return degrade(file);

  const centroids = kmeans(pixels, 5);
  const palette = centroids.slice(0, 6).map(toHex);
  if (palette.length === 0) return degrade(file);

  process.stdout.write(JSON.stringify({ palette }) + '\n');
  process.exit(0);
}

main(process.argv);
