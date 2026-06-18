'use strict';

// pdf-writer.js — vendored, zero-dependency Markdown→PDF writer (story 260617-ade, T1/AC1).
//   Pure, deterministic, Node-built-ins only. NO npm, NO fs, NO network, NO font embedding.
//   Emits an uncompressed, trivially-valid single PDF (%PDF-1.4 … %%EOF) using the
//   14 standard base fonts (Type1) and AFM standard glyph widths for word-wrapping.
//
// AFM width source: Adobe Core 14 AFM standard widths (the well-known Adobe Font
//   Metrics for the base-14 fonts, units = 1/1000 em). Helvetica / Helvetica-Bold /
//   Times-Roman width tables below are transcribed from those AFM files for the ASCII
//   printable range (codes 32–126). Courier is monospace (every glyph = 600).
//
// Exports: { writePdf, parseMarkdownBlocks }

// ---------------------------------------------------------------------------
// AFM glyph-width tables (codes 32–126), units 1/1000 em.
// Each array index = (code - 32). Transcribed from the Adobe Core-14 AFM files.
// ---------------------------------------------------------------------------

// Helvetica (Adobe AFM standard widths, code 32..126)
const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

// Helvetica-Bold (Adobe AFM standard widths, code 32..126)
const HELVETICA_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

// Times-Roman (Adobe AFM standard widths, code 32..126)
const TIMES_ROMAN = [
  250, 333, 408, 500, 500, 833, 778, 180, 333, 333, 500, 564, 250, 333, 250, 278,
  500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 278, 278, 564, 564, 564, 444,
  921, 722, 667, 667, 722, 611, 556, 722, 722, 333, 389, 722, 611, 889, 722, 722,
  556, 722, 667, 556, 611, 722, 722, 944, 722, 722, 611, 333, 278, 333, 469, 500,
  333, 444, 500, 444, 500, 444, 333, 500, 500, 278, 278, 500, 278, 778, 500, 500,
  500, 500, 333, 389, 278, 500, 500, 722, 500, 500, 444, 480, 200, 480, 541,
];

const FONTS = {
  Helvetica: { base: 'Helvetica', widths: HELVETICA, mono: false },
  'Helvetica-Bold': { base: 'Helvetica-Bold', widths: HELVETICA_BOLD, mono: false },
  'Times-Roman': { base: 'Times-Roman', widths: TIMES_ROMAN, mono: false },
  Courier: { base: 'Courier', widths: null, mono: true },
};

// Resource font name → base font, used in the page /Font dict.
const FONT_RESOURCES = [
  ['F1', 'Helvetica'],
  ['F2', 'Helvetica-Bold'],
  ['F3', 'Times-Roman'],
  ['F4', 'Courier'],
];
const RES_NAME = {
  Helvetica: 'F1',
  'Helvetica-Bold': 'F2',
  'Times-Roman': 'F3',
  Courier: 'F4',
};

// ---------------------------------------------------------------------------
// Page geometry (US Letter, 1-inch margins).
// ---------------------------------------------------------------------------
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 72;
const CONTENT_W = PAGE_W - 2 * MARGIN; // 468
const TOP_Y = 720; // PAGE_H - MARGIN
const BOTTOM_Y = MARGIN; // 72

const HEADING_SIZE = { 1: 24, 2: 20, 3: 16, 4: 14, 5: 12, 6: 11 };

// ---------------------------------------------------------------------------
// Glyph metrics
// ---------------------------------------------------------------------------
function glyphWidth(font, ch) {
  const code = ch.charCodeAt(0);
  if (font.mono) return 600;
  if (code >= 32 && code <= 126) return font.widths[code - 32];
  return 500; // fallback for out-of-range characters
}

function textWidth(font, str, size) {
  let w = 0;
  for (let i = 0; i < str.length; i += 1) w += glyphWidth(font, str[i]);
  return (w / 1000) * size;
}

// Greedy word-wrap to a max width (points). Returns array of lines.
function wrapText(font, text, size, maxWidth) {
  const words = String(text).split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [''];
  const lines = [];
  let cur = '';
  for (const word of words) {
    const candidate = cur ? `${cur} ${word}` : word;
    if (cur && textWidth(font, candidate, size) > maxWidth) {
      lines.push(cur);
      cur = word;
    } else {
      cur = candidate;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// PDF content-stream string escaping
// ---------------------------------------------------------------------------
function escapePdfText(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

// ---------------------------------------------------------------------------
// Page builder — accumulates text-show operators across pages.
// ---------------------------------------------------------------------------
function makeLayout() {
  const pages = [[]]; // each page is an array of content-op strings
  let y = TOP_Y;

  function newPage() {
    pages.push([]);
    y = TOP_Y;
  }

  // Emit one already-fitted line at the current y, then advance y by `advance`.
  // x is absolute. Caller guarantees the line fits horizontally.
  function emitLine(font, size, x, line, advance, rgb) {
    if (y - advance < BOTTOM_Y && pages[pages.length - 1].length > 0) {
      newPage();
    }
    const res = RES_NAME[font.base];
    const color = rgb || [0, 0, 0];
    const ops = pages[pages.length - 1];
    ops.push(
      `BT /${res} ${size} Tf ${color[0]} ${color[1]} ${color[2]} rg ` +
      `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdfText(line)}) Tj ET`
    );
    y -= advance;
  }

  function addGap(g) {
    y -= g;
  }

  return {
    pages,
    emitLine,
    addGap,
    get y() { return y; },
  };
}

// ---------------------------------------------------------------------------
// Block rendering
// ---------------------------------------------------------------------------
function renderBlocks(blocks) {
  const layout = makeLayout();

  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        const level = Math.min(Math.max(Number(block.level) || 1, 1), 6);
        const size = HEADING_SIZE[level];
        const font = FONTS['Helvetica-Bold'];
        const lines = wrapText(font, block.text, size, CONTENT_W);
        for (const line of lines) {
          layout.emitLine(font, size, MARGIN, line, size * 1.25);
        }
        layout.addGap(size * 0.4);
        break;
      }
      case 'paragraph': {
        const size = 11;
        const font = FONTS.Helvetica;
        const lines = wrapText(font, block.text, size, CONTENT_W);
        for (const line of lines) {
          layout.emitLine(font, size, MARGIN, line, size * 1.35);
        }
        layout.addGap(size * 0.6);
        break;
      }
      case 'list': {
        const size = 11;
        const font = FONTS.Helvetica;
        const indent = 18;
        const items = Array.isArray(block.items) ? block.items : [];
        items.forEach((item, idx) => {
          const marker = block.ordered ? `${idx + 1}. ` : '• ';
          const markerW = textWidth(font, marker, size);
          const lines = wrapText(font, item, size, CONTENT_W - indent);
          lines.forEach((line, li) => {
            if (li === 0) {
              layout.emitLine(font, size, MARGIN, marker + line, size * 1.35);
            } else {
              layout.emitLine(font, size, MARGIN + markerW, line, size * 1.35);
            }
          });
        });
        layout.addGap(size * 0.6);
        break;
      }
      case 'blockquote': {
        const size = 11;
        const font = FONTS['Times-Roman'];
        const indent = 24;
        const lines = wrapText(font, block.text, size, CONTENT_W - indent);
        for (const line of lines) {
          layout.emitLine(font, size, MARGIN + indent, line, size * 1.35, [0.3, 0.3, 0.3]);
        }
        layout.addGap(size * 0.6);
        break;
      }
      case 'code': {
        const size = 10;
        const font = FONTS.Courier;
        const srcLines = String(block.text).split('\n');
        for (const src of srcLines) {
          layout.emitLine(font, size, MARGIN, src, size * 1.3);
        }
        layout.addGap(size * 0.6);
        break;
      }
      default: {
        // Treat any unknown block as a paragraph of its text, if present.
        if (block && block.text != null) {
          const size = 11;
          const font = FONTS.Helvetica;
          const lines = wrapText(font, block.text, size, CONTENT_W);
          for (const line of lines) layout.emitLine(font, size, MARGIN, line, size * 1.35);
          layout.addGap(size * 0.6);
        }
        break;
      }
    }
  }

  // Ensure at least one (empty) page exists.
  if (layout.pages.length === 0) layout.pages.push([]);
  return layout.pages;
}

// ---------------------------------------------------------------------------
// PDF object serialization
// ---------------------------------------------------------------------------
function buildPdf(pages) {
  // Object numbering:
  //   1: Catalog
  //   2: Pages tree
  //   3..3+(nFonts-1): Font objects
  //   then per page: Page object + Content object
  const nFonts = FONT_RESOURCES.length;
  const fontStartObj = 3;
  const firstPageObj = fontStartObj + nFonts;

  const objects = []; // index 0 unused; objects[n] = body string for object n

  // Build font resource dict reference string (e.g. "/F1 3 0 R /F2 4 0 R ...")
  const fontDictEntries = FONT_RESOURCES.map(([res], i) =>
    `/${res} ${fontStartObj + i} 0 R`
  ).join(' ');

  // Page + content object numbers.
  const pageObjNums = [];
  const contentObjNums = [];
  let objNum = firstPageObj;
  for (let i = 0; i < pages.length; i += 1) {
    pageObjNums.push(objNum);
    objNum += 1;
    contentObjNums.push(objNum);
    objNum += 1;
  }
  const totalObjects = objNum - 1;

  // 1: Catalog
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';

  // 2: Pages tree
  const kids = pageObjNums.map((n) => `${n} 0 R`).join(' ');
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`;

  // Font objects
  FONT_RESOURCES.forEach(([, fontKey], i) => {
    const base = FONTS[fontKey].base;
    objects[fontStartObj + i] =
      `<< /Type /Font /Subtype /Type1 /BaseFont /${base} >>`;
  });

  // Page + content objects
  pages.forEach((ops, i) => {
    const pageNum = pageObjNums[i];
    const contentNum = contentObjNums[i];
    objects[pageNum] =
      `<< /Type /Page /Parent 2 0 R ` +
      `/MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << ${fontDictEntries} >> >> ` +
      `/Contents ${contentNum} 0 R >>`;

    const stream = ops.join('\n');
    const streamBytes = Buffer.byteLength(stream, 'latin1');
    objects[contentNum] =
      `<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream`;
  });

  // Serialize with byte offsets.
  const header = '%PDF-1.4\n';
  let body = header;
  const offsets = []; // offsets[n] = byte offset of object n

  for (let n = 1; n <= totalObjects; n += 1) {
    offsets[n] = Buffer.byteLength(body, 'latin1');
    body += `${n} 0 obj\n${objects[n]}\nendobj\n`;
  }

  // xref
  const xrefOffset = Buffer.byteLength(body, 'latin1');
  let xref = `xref\n0 ${totalObjects + 1}\n`;
  xref += '0000000000 65535 f \n';
  for (let n = 1; n <= totalObjects; n += 1) {
    xref += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  }

  const trailer =
    `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(body + xref + trailer, 'latin1');
}

// ---------------------------------------------------------------------------
// Markdown block parser (minimal, local, CommonMark-ish)
// ---------------------------------------------------------------------------
function stripInline(s) {
  let out = String(s);
  // links: [text](url) -> text (url)
  out = out.replace(/\[([^\]]*)\]\(([^)]*)\)/g, (_m, t, u) => (u ? `${t} (${u})` : t));
  // bold **x** / __x__
  out = out.replace(/\*\*([^*]+)\*\*/g, '$1');
  out = out.replace(/__([^_]+)__/g, '$1');
  // italics *x* / _x_
  out = out.replace(/\*([^*]+)\*/g, '$1');
  out = out.replace(/_([^_]+)_/g, '$1');
  // inline code `x`
  out = out.replace(/`([^`]+)`/g, '$1');
  return out;
}

function parseMarkdownBlocks(md) {
  const lines = String(md == null ? '' : md).replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    let line = lines[i];

    // Blank line — skip.
    if (/^\s*$/.test(line)) { i += 1; continue; }

    // Fenced code block.
    const fence = line.match(/^\s*```/);
    if (fence) {
      i += 1;
      const codeLines = [];
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1; // consume closing fence
      blocks.push({ type: 'code', text: codeLines.join('\n') });
      continue;
    }

    // Heading.
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      blocks.push({ type: 'heading', level: h[1].length, text: stripInline(h[2].trim()) });
      i += 1;
      continue;
    }

    // Blockquote (consecutive `> ` lines).
    if (/^\s*>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'blockquote', text: stripInline(quote.join(' ').trim()) });
      continue;
    }

    // Unordered list.
    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(stripInline(lines[i].replace(/^\s*[-*+]\s+/, '').trim()));
        i += 1;
      }
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }

    // Ordered list.
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(stripInline(lines[i].replace(/^\s*\d+\.\s+/, '').trim()));
        i += 1;
      }
      blocks.push({ type: 'list', ordered: true, items });
      continue;
    }

    // Paragraph — gather consecutive non-blank, non-special lines.
    const para = [];
    while (i < lines.length) {
      const cur = lines[i];
      if (/^\s*$/.test(cur)) break;
      if (/^\s*```/.test(cur)) break;
      if (/^(#{1,6})\s+/.test(cur)) break;
      if (/^\s*>\s?/.test(cur)) break;
      if (/^\s*[-*+]\s+/.test(cur)) break;
      if (/^\s*\d+\.\s+/.test(cur)) break;
      para.push(cur.trim());
      i += 1;
    }
    blocks.push({ type: 'paragraph', text: stripInline(para.join(' ').trim()) });
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------
function writePdf(blocks, _opts) {
  const blockList = typeof blocks === 'string' ? parseMarkdownBlocks(blocks) : (blocks || []);
  const pages = renderBlocks(blockList);
  return buildPdf(pages);
}

module.exports = { writePdf, parseMarkdownBlocks };
