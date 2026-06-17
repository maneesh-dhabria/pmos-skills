'use strict';

// claude-pdf.js — mockable seam that uses the host `claude` CLI to turn a PDF's
// EXTRACTED TEXT into clean Markdown (story 260617-ade, T2 / AC2). Node built-ins only.
//
// Safety (load-bearing, found at dogfood): the subprocess is NEVER handed a file path
// or filesystem access. Earlier this seam wrote the PDF to os.tmpdir() and passed the
// path to `claude -p` — but the CLI does not ingest a binary PDF that way, and (with
// its default tools enabled) it wandered the working directory and surfaced UNRELATED
// local files instead of converting the input. So we now:
//   1. deterministically extract the PDF's own text first (lib/pdf-text.js), then
//   2. ask `claude` to reflow ONLY that text into Markdown, with an EMPTY tool
//      allowlist (`--allowedTools ''`) and no path referenced anywhere — the CLI has
//      nothing to read but the text we passed, so it cannot leak other content.
// claude's value-add here is formatting/structure, not extraction. Any failure (CLI
// absent, empty output, no extractable text, oversize) throws a typed CLI_UNAVAILABLE
// error so the descriptor falls back to the raw deterministic extraction (Inv-5).

const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { extractText } = require(path.join(__dirname, 'pdf-text.js'));

const CLI_UNAVAILABLE = 'cli-unavailable';

// Cap the text handed to the CLI via argv to stay well under the OS arg limit
// (ARG_MAX). Larger docs throw → the caller falls back to the raw extraction (which
// handles any size). Never crash on E2BIG (Inv-5).
const MAX_TEXT_BYTES = 96 * 1024;

const PROMPT_PREFIX = 'The following is raw text extracted from a PDF. Reformat it into '
  + 'clean, well-structured Markdown (headings, lists, paragraphs, code blocks where '
  + 'apparent). Output ONLY the Markdown — no preamble, no surrounding code fences. Use '
  + 'ONLY the text provided below; do not add, invent, or look anything else up.\n\n'
  + '--- BEGIN PDF TEXT ---\n';
const PROMPT_SUFFIX = '\n--- END PDF TEXT ---';

function unavailable(message, cause) {
  const e = new Error(`claude CLI unavailable: ${message}`);
  e.code = CLI_UNAVAILABLE;
  if (cause) e.cause = cause;
  return e;
}

const execFileAsync = promisify(execFile);

// Default exec: resolves { stdout, stderr } on success, rejects native error on
// failure (a missing CLI rejects with err.code === 'ENOENT').
async function defaultExec(cli, argv, options) {
  return execFileAsync(cli, argv, options);
}

async function runClaudePdfToMd(pdfBuffer, opts = {}) {
  const exec = opts.exec || defaultExec;
  const cli = opts.cli || 'claude';
  // Tests inject a deterministic extractor; production uses the vendored one.
  const extract = opts.extractText || extractText;

  const { text } = extract(pdfBuffer) || {};
  const body = (text || '').trim();
  // Nothing to reflow (scanned/image-only PDF) — let the caller fall back + caveat.
  if (!body) throw unavailable('no extractable text');
  if (Buffer.byteLength(body, 'utf8') > MAX_TEXT_BYTES) {
    throw unavailable('extracted text too large for the CLI seam');
  }

  // No file path anywhere in argv; empty tool allowlist denies the CLI filesystem and
  // network access (defense in depth) so it can only transform the text we passed.
  const argv = ['-p', PROMPT_PREFIX + body + PROMPT_SUFFIX, '--allowedTools', ''];

  let res;
  try {
    res = await exec(cli, argv, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    throw unavailable(err && err.message ? err.message : String(err), err);
  }

  const out = typeof res === 'string' ? res : res.stdout;
  const md = (out || '').trim();
  if (!md) throw unavailable('empty output');
  return md;
}

module.exports = { runClaudePdfToMd, CLI_UNAVAILABLE };
