'use strict';
// html-md.js — HTML ↔ Markdown descriptors (design D10, the document pair).
//
// Two PURE, text↔text converters registered against the EXISTING registry (from 260617-7ag)
// with NO edits to server.js or ui/converter.html — the proof of the registry extension
// contract (Inv-1): only the registry grows, the surfaces stay byte-inert.
//
//   md→html : markdown.mdToHtml — vendored CommonMark-ish renderer (lib/markdown.js).
//   html→md : markdown.htmlToMd — walks the tolerant HTML tree (lib/html-parser.js).
//
// Both are pure (no network/fs/DOM/global state) and deterministic (Inv-2). The
// CommonMark-ish subset + documented lossy round-trip edges live in lib/markdown.js (D10).

const path = require('node:path');
const markdown = require(path.join(__dirname, '..', 'markdown.js'));

module.exports = function register(registry) {
  registry.register({
    id: 'md→html',
    from: 'md',
    to: 'html',
    label: 'Markdown → HTML',
    kind: 'pure',
    requires: [],
    inputMode: 'text',
    outputMode: 'text',
    convert(input) {
      const md = Buffer.isBuffer(input) ? input.toString('utf8') : String(input);
      return markdown.mdToHtml(md);
    },
  });

  registry.register({
    id: 'html→md',
    from: 'html',
    to: 'md',
    label: 'HTML → Markdown',
    kind: 'pure',
    requires: [],
    inputMode: 'text',
    outputMode: 'text',
    convert(input) {
      const html = Buffer.isBuffer(input) ? input.toString('utf8') : String(input);
      return markdown.htmlToMd(html);
    },
  });
};
