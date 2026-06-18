'use strict';
// pdf-text.js — vendored zero-dependency PDF→text extractor (T3 / AC3).
//   The fallback used when the `claude` CLI is unavailable. Text-layer PDFs
//   only — no OCR. Node built-ins only (node:zlib for FlateDecode). Pure,
//   deterministic, best-effort, NEVER throws.

const zlib = require('node:zlib');

const FALLBACK_CAVEAT =
  'Extracted with the built-in fallback parser (Claude CLI unavailable); formatting may be approximate.';
const NO_TEXT_CAVEAT =
  'No extractable text layer found — this PDF may be scanned/image-only. ' +
  'Try the Claude-backed conversion (needs the CLI).';

// --- PDF string-literal escape decoding ---------------------------------
function decodePdfString(raw) {
  let out = '';
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch !== '\\') { out += ch; continue; }
    const next = raw[i + 1];
    if (next === undefined) break;
    if (next === 'n') { out += '\n'; i += 1; }
    else if (next === 'r') { out += '\r'; i += 1; }
    else if (next === 't') { out += '\t'; i += 1; }
    else if (next === 'b') { out += '\b'; i += 1; }
    else if (next === 'f') { out += '\f'; i += 1; }
    else if (next === '(') { out += '('; i += 1; }
    else if (next === ')') { out += ')'; i += 1; }
    else if (next === '\\') { out += '\\'; i += 1; }
    else if (next === '\n') { i += 1; } // line continuation
    else if (next === '\r') { i += (raw[i + 2] === '\n' ? 2 : 1); }
    else if (next >= '0' && next <= '7') {
      // up to 3 octal digits
      let oct = '';
      let j = i + 1;
      while (j < raw.length && oct.length < 3 && raw[j] >= '0' && raw[j] <= '7') {
        oct += raw[j];
        j += 1;
      }
      out += String.fromCharCode(parseInt(oct, 8) & 0xff);
      i = j - 1;
    } else { out += next; i += 1; }
  }
  return out;
}

// Read a balanced ( ... ) literal starting at index `open` (points at `(`).
// Returns { value, end } where end is the index of the closing `)`.
function readLiteral(s, open) {
  let depth = 0;
  let raw = '';
  for (let i = open; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === '\\') { raw += ch + (s[i + 1] || ''); i += 1; continue; }
    if (ch === '(') { depth += 1; if (depth === 1) continue; }
    else if (ch === ')') { depth -= 1; if (depth === 0) return { value: decodePdfString(raw), end: i }; }
    raw += ch;
  }
  return { value: decodePdfString(raw), end: s.length - 1 };
}

// --- content-stream operator extraction ---------------------------------
// Walks a decoded content stream and returns reconstructed text.
function extractFromContent(content) {
  const runs = [];
  let i = 0;
  const n = content.length;
  let pendingNewline = false;

  function flushRun(str) {
    if (pendingNewline && runs.length) { runs.push('\n'); pendingNewline = false; }
    runs.push(str);
  }

  while (i < n) {
    const ch = content[i];
    if (ch === '(') {
      // a literal string — find its closing op (Tj or part of TJ array)
      const lit = readLiteral(content, i);
      // peek ahead past the literal to find the operator
      let j = lit.end + 1;
      while (j < n && /\s/.test(content[j])) j += 1;
      // direct Tj
      if (content.startsWith('Tj', j)) {
        flushRun(lit.value);
        i = j + 2;
        continue;
      }
      // otherwise it's a bare string (possibly inside a TJ array, handled below)
      // skip — TJ arrays are handled by the '[' branch
      i = lit.end + 1;
      continue;
    }
    if (ch === '[') {
      // possible TJ array — scan to matching ] then check for TJ
      let depth = 0;
      let k = i;
      const parts = [];
      for (; k < n; k += 1) {
        const c = content[k];
        if (c === '(') {
          const lit = readLiteral(content, k);
          parts.push(lit.value);
          k = lit.end;
        } else if (c === '[') { depth += 1; }
        else if (c === ']') { depth -= 1; if (depth === 0) break; }
      }
      let j = k + 1;
      while (j < n && /\s/.test(content[j])) j += 1;
      if (content.startsWith('TJ', j)) {
        flushRun(parts.join(''));
        i = j + 2;
        continue;
      }
      i = k + 1;
      continue;
    }
    // line-move operators → mark a newline between shows
    // Td, TD, T*, ', "
    if (ch === 'T' && (content[i + 1] === 'd' || content[i + 1] === 'D' || content[i + 1] === '*')) {
      // ensure token boundary
      const prev = content[i - 1];
      if (prev === undefined || /\s|\d|\.|\]|\)/.test(prev)) {
        pendingNewline = true;
        i += 2;
        continue;
      }
    }
    if ((ch === "'" || ch === '"')) {
      pendingNewline = true;
      i += 1;
      continue;
    }
    i += 1;
  }
  return runs.join('');
}

// --- raw-byte stream scanning -------------------------------------------
function* iterStreams(buf) {
  const KW = Buffer.from('stream');
  const END = Buffer.from('endstream');
  let from = 0;
  while (true) {
    const s = buf.indexOf(KW, from);
    if (s < 0) break;
    // ensure it's the `stream` keyword, not part of `endstream`
    if (s >= 3 && buf.slice(s - 3, s).toString('latin1') === 'end') {
      from = s + KW.length;
      continue;
    }
    let dataStart = s + KW.length;
    // strip EOL after `stream`: CRLF or LF (or lone CR)
    if (buf[dataStart] === 0x0d && buf[dataStart + 1] === 0x0a) dataStart += 2;
    else if (buf[dataStart] === 0x0a) dataStart += 1;
    else if (buf[dataStart] === 0x0d) dataStart += 1;
    const e = buf.indexOf(END, dataStart);
    if (e < 0) break;
    let dataEnd = e;
    // strip the single EOL the PDF spec mandates before `endstream`
    // (CRLF / LF / lone CR) — do NOT strip more, deflate payloads can end in
    // a byte that happens to be whitespace.
    if (dataEnd > dataStart && buf[dataEnd - 1] === 0x0a) {
      dataEnd -= 1;
      if (dataEnd > dataStart && buf[dataEnd - 1] === 0x0d) dataEnd -= 1;
    } else if (dataEnd > dataStart && buf[dataEnd - 1] === 0x0d) {
      dataEnd -= 1;
    }
    // preceding dict (look back a bounded window for the object header)
    const dictStart = Math.max(0, s - 600);
    const dict = buf.slice(dictStart, s).toString('latin1');
    yield { data: buf.slice(dataStart, dataEnd), dict };
    from = e + END.length;
  }
}

function decodeStream(stream) {
  const isFlate = /\/Filter\b[\s\S]*?\/FlateDecode/.test(stream.dict) || /\/FlateDecode/.test(stream.dict);
  if (isFlate) {
    try {
      return zlib.inflateSync(stream.data).toString('latin1');
    } catch (_e) {
      return null; // skip undecodable stream
    }
  }
  // non-Flate: try reading as Latin1 text directly
  return stream.data.toString('latin1');
}

function extractText(pdfBuffer) {
  let text = '';
  try {
    const buf = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer || []);
    const pieces = [];
    for (const stream of iterStreams(buf)) {
      const content = decodeStream(stream);
      if (content == null) continue;
      // only bother if it looks like a content stream with text operators
      if (!/(\bTj\b|\bTJ\b)/.test(content)) continue;
      const piece = extractFromContent(content);
      if (piece && piece.trim()) pieces.push(piece);
    }
    text = pieces.join('\n');
    // collapse 3+ blank lines to 2
    text = text.replace(/\n{3,}/g, '\n\n').trim();
  } catch (_e) {
    text = '';
  }

  if (!text) {
    return { text: '', markdown: '', caveat: NO_TEXT_CAVEAT };
  }
  return { text, markdown: text, caveat: FALLBACK_CAVEAT };
}

module.exports = { extractText };
