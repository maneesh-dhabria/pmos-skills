'use strict';
// pdf-md.js — PDF ↔ Markdown descriptors (design D5, the hybrid pair).
//
//   pdf→md : kind 'llm'  — primary = the host `claude` CLI (lib/claude-pdf.js); on any
//            failure / CLI-absence it falls back to the vendored FlateDecode text
//            extractor (lib/pdf-text.js) and surfaces a quality caveat. Never crash/hang
//            (Inv-5). binary → text.
//   md→pdf : kind 'pure' — the vendored standard-14-font PDF writer (lib/pdf-writer.js).
//            Claude can't emit a binary PDF, so this stays a deterministic vendored lib
//            (D5). text → binary (downloaded as application/pdf, Inv-6).
//
// Registers via the registry's single extension point with NO server.js / UI structural
// edits — the UI badges the `llm` kind + `requires` purely from /conversions data (Inv-1).

const path = require('node:path');
const { writePdf } = require(path.join(__dirname, '..', 'pdf-writer.js'));
const { extractText } = require(path.join(__dirname, '..', 'pdf-text.js'));
const { runClaudePdfToMd, CLI_UNAVAILABLE } = require(path.join(__dirname, '..', 'claude-pdf.js'));

module.exports = function register(registry) {
  registry.register({
    id: 'pdf→md',
    from: 'pdf',
    to: 'md',
    label: 'PDF → Markdown',
    kind: 'llm',
    requires: ['claude-cli'],
    inputMode: 'binary',
    outputMode: 'text',
    async convert(input, ctx = {}) {
      const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
      // Primary: the Claude CLI seam (best real-world quality). ctx.exec/ctx.cli are
      // injection seams so tests drive the descriptor without a live API call.
      try {
        const md = await runClaudePdfToMd(buf, { exec: ctx.exec, cli: ctx.cli });
        return md;
      } catch (e) {
        if (ctx.log) ctx.log(`pdf→md: claude backend unavailable (${e.code || e.message}); using vendored fallback`);
        // Fallback: vendored FlateDecode text extractor. Never throw (Inv-5).
        const { text, caveat } = extractText(buf);
        const note = caveat
          ? `> ⚠️ ${caveat}\n\n`
          : (e.code === CLI_UNAVAILABLE
            ? '> ⚠️ Extracted with the built-in fallback parser (Claude CLI unavailable); formatting may be approximate.\n\n'
            : '');
        return `${note}${text || ''}`;
      }
    },
  });

  registry.register({
    id: 'md→pdf',
    from: 'md',
    to: 'pdf',
    label: 'Markdown → PDF',
    kind: 'pure',
    requires: [],
    inputMode: 'text',
    outputMode: 'binary',
    contentType: 'application/pdf',
    convert(input) {
      const md = Buffer.isBuffer(input) ? input.toString('utf8') : String(input);
      return writePdf(md);
    },
  });
};
