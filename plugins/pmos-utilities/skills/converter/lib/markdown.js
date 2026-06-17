// markdown.js — vendored, zero-dependency CommonMark-ish Markdown parser/renderer.
//
// Pure string processing: no fs / network / DOM / npm / global state. Deterministic
// (same input -> same output; no Date/random). CommonJS — require()'d by other CJS
// modules and by an ESM test via createRequire.
//
// API:
//   parseBlocks(md) -> Block[]   // the BLOCK MODEL (a later pdf-writer reuses this)
//   mdToHtml(md)    -> string    // clean HTML fragment (no <html>/<body> wrapper)
//
// ── THE BLOCK MODEL (keep stable — pdf-writer depends on this exact shape) ──────
//   { type: 'heading', level: 1..6, inlines: Inline[] }
//   { type: 'paragraph', inlines: Inline[] }
//   { type: 'list', ordered: boolean, items: ListItem[] }   ListItem = { blocks: Block[] }
//   { type: 'blockquote', blocks: Block[] }
//   { type: 'code', lang: string|null, text: string }       // fenced ```; raw verbatim
//   { type: 'hr' }                                          // --- / *** / ___
//   { type: 'table', headers: Inline[][], rows: Inline[][][] }  // basic pipe tables
//
//   Inline = one of:
//     { type: 'text', value }
//     { type: 'strong', inlines: Inline[] }   // **x** / __x__
//     { type: 'em', inlines: Inline[] }       // *x* / _x_
//     { type: 'code', value }                 // `x` (verbatim, no further parsing)
//     { type: 'link', href, inlines: Inline[] }   // [text](href)
//     { type: 'image', src, alt }                 // ![alt](src)
//
// ── SUPPORTED SUBSET ────────────────────────────────────────────────────────────
//   Blocks : ATX headings (#..######), blank-line-separated paragraphs, unordered
//            lists (-/*/+), ordered lists (1.), nested lists (indent 2+ spaces or a
//            tab), blockquotes (>), fenced code blocks (```lang), thematic breaks,
//            basic pipe tables (header row + |---| separator + body rows).
//   Inlines: strong, em, inline code, links, images. Applied to heading / paragraph /
//            list-item / table-cell / blockquote text — NOT inside code.
//
// ── KNOWN LOSSY / OUT-OF-SCOPE EDGES (design D10 — honest about limits) ──────────
//   - Setext headings (=== / ---) NOT supported (a --- line is a thematic break / a
//     table separator only).
//   - Only BASIC pipe tables: a single header row, one --- separator, body rows.
//     No per-column alignment (:---:), no escaped pipes inside cells.
//   - Reference-style links ([x][1] / [1]: url) NOT supported — emitted as text.
//   - Raw inline HTML is NOT passed through as live HTML; it is treated as text and
//     escaped (e.g. `<div>` renders as &lt;div&gt;).
//   - No autolinks (<http://…>), no footnotes, no task-list checkboxes, no hard line
//     breaks via trailing spaces, no HTML blocks, no nested emphasis edge-cases
//     beyond a single delimiter pair, no link titles ([x](url "title")).
//   - Inline emphasis is delimiter-pair based and non-recursive across the SAME
//     delimiter; strong (**/__) is matched before em (*/_).

'use strict';

// ── HTML escaping ────────────────────────────────────────────────────────────────
// & FIRST, then < > " — so already-escaped entities aren't double-encoded wrongly.
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Inline parsing ───────────────────────────────────────────────────────────────
// Returns Inline[]. Scans left-to-right, longest meaningful token first.
function parseInlines(text) {
  const out = [];
  let buf = '';
  const flush = () => {
    if (buf) {
      out.push({ type: 'text', value: buf });
      buf = '';
    }
  };
  const n = text.length;
  let i = 0;

  while (i < n) {
    const ch = text[i];

    // Inline code: `...` (verbatim; no further parsing). Backtick-run delimited.
    if (ch === '`') {
      let run = 1;
      while (text[i + run] === '`') run += 1;
      const fence = '`'.repeat(run);
      const end = text.indexOf(fence, i + run);
      if (end !== -1) {
        flush();
        out.push({ type: 'code', value: text.slice(i + run, end) });
        i = end + run;
        continue;
      }
      // No closing fence — treat the backticks as literal text.
      buf += ch;
      i += 1;
      continue;
    }

    // Image: ![alt](src)
    if (ch === '!' && text[i + 1] === '[') {
      const m = matchLinkLike(text, i + 1);
      if (m) {
        flush();
        out.push({ type: 'image', src: m.href, alt: stripFormatting(m.label) });
        i = m.end;
        continue;
      }
    }

    // Link: [text](href)
    if (ch === '[') {
      const m = matchLinkLike(text, i);
      if (m) {
        flush();
        out.push({ type: 'link', href: m.href, inlines: parseInlines(m.label) });
        i = m.end;
        continue;
      }
    }

    // Strong: **...** or __...__   (matched before em)
    if (ch === '*' || ch === '_') {
      if (text[i + 1] === ch) {
        const close = text.indexOf(ch + ch, i + 2);
        if (close !== -1 && close > i + 2) {
          flush();
          out.push({ type: 'strong', inlines: parseInlines(text.slice(i + 2, close)) });
          i = close + 2;
          continue;
        }
      }
      // Em: *...* or _...*
      const close = text.indexOf(ch, i + 1);
      if (close !== -1 && close > i + 1) {
        flush();
        out.push({ type: 'em', inlines: parseInlines(text.slice(i + 1, close)) });
        i = close + 1;
        continue;
      }
    }

    buf += ch;
    i += 1;
  }
  flush();
  return out;
}

// Match a [label](href) construct starting at index `start` (the '['). Returns
// { label, href, end } or null. Used for both links and (with a leading '!') images.
function matchLinkLike(text, start) {
  if (text[start] !== '[') return null;
  // Find the matching ']' (allow no nested brackets — basic).
  let depth = 0;
  let i = start;
  let labelEnd = -1;
  for (; i < text.length; i += 1) {
    const c = text[i];
    if (c === '[') depth += 1;
    else if (c === ']') {
      depth -= 1;
      if (depth === 0) {
        labelEnd = i;
        break;
      }
    }
  }
  if (labelEnd === -1) return null;
  if (text[labelEnd + 1] !== '(') return null;
  const hrefStart = labelEnd + 2;
  const hrefEnd = text.indexOf(')', hrefStart);
  if (hrefEnd === -1) return null;
  return {
    label: text.slice(start + 1, labelEnd),
    href: text.slice(hrefStart, hrefEnd).trim(),
    end: hrefEnd + 1,
  };
}

// Flatten inline markup to plain text (for image alt text).
function stripFormatting(text) {
  return parseInlines(text)
    .map((node) => inlineToText(node))
    .join('');
}
function inlineToText(node) {
  switch (node.type) {
    case 'text':
      return node.value;
    case 'code':
      return node.value;
    case 'image':
      return node.alt;
    case 'link':
    case 'strong':
    case 'em':
      return (node.inlines || []).map(inlineToText).join('');
    default:
      return '';
  }
}

// ── Block parsing ────────────────────────────────────────────────────────────────

const RE_HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const RE_HR = /^ {0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/;
const RE_FENCE = /^ {0,3}(`{3,}|~{3,})\s*([^\s`~]*)\s*$/;
const RE_ULIST = /^(\s*)([-*+])\s+(.*)$/;
const RE_OLIST = /^(\s*)(\d+)[.)]\s+(.*)$/;
const RE_BLOCKQUOTE = /^\s*>\s?(.*)$/;

// Indentation width: a tab counts as the list-nesting unit (2 spaces).
function indentWidth(spaces) {
  let w = 0;
  for (const ch of spaces) w += ch === '\t' ? 2 : 1;
  return w;
}

function isBlank(line) {
  return /^\s*$/.test(line);
}

// Is `line` a table separator row, e.g. | --- | :--: | --- |
function isTableSeparator(line) {
  const t = line.trim();
  if (t.indexOf('-') === -1) return false;
  const cells = splitTableRow(t);
  if (cells.length === 0) return false;
  return cells.every((c) => /^:?-+:?$/.test(c.trim()));
}

// Split a pipe-table row into trimmed cell strings, dropping leading/trailing pipes.
function splitTableRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

function looksLikeTableRow(line) {
  return line.indexOf('|') !== -1 && !isBlank(line);
}

// Parse Markdown text into the documented Block[] model.
function parseBlocks(md) {
  const lines = String(md == null ? '' : md).replace(/\r\n?/g, '\n').split('\n');
  return parseLines(lines);
}

function parseLines(lines) {
  const blocks = [];
  let i = 0;
  const n = lines.length;

  while (i < n) {
    const line = lines[i];

    // Blank line — skip.
    if (isBlank(line)) {
      i += 1;
      continue;
    }

    // Fenced code block.
    const fence = line.match(RE_FENCE);
    if (fence) {
      const marker = fence[1][0];
      const lang = fence[2] ? fence[2] : null;
      const body = [];
      i += 1;
      while (i < n) {
        const closing = lines[i].match(/^ {0,3}(`{3,}|~{3,})\s*$/);
        if (closing && closing[1][0] === marker) {
          i += 1;
          break;
        }
        body.push(lines[i]);
        i += 1;
      }
      blocks.push({ type: 'code', lang, text: body.join('\n') });
      continue;
    }

    // Thematic break.
    if (RE_HR.test(line)) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    // ATX heading.
    const h = line.match(RE_HEADING);
    if (h) {
      blocks.push({
        type: 'heading',
        level: h[1].length,
        inlines: parseInlines(h[2]),
      });
      i += 1;
      continue;
    }

    // Pipe table: current line has a pipe and the NEXT line is a separator.
    if (looksLikeTableRow(line) && i + 1 < n && isTableSeparator(lines[i + 1])) {
      const headers = splitTableRow(line).map((c) => parseInlines(c));
      i += 2; // skip header + separator
      const rows = [];
      while (i < n && looksLikeTableRow(lines[i]) && !isTableSeparator(lines[i])) {
        rows.push(splitTableRow(lines[i]).map((c) => parseInlines(c)));
        i += 1;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // Blockquote.
    if (RE_BLOCKQUOTE.test(line)) {
      const inner = [];
      while (i < n && (RE_BLOCKQUOTE.test(lines[i]) || (!isBlank(lines[i]) && inner.length))) {
        if (isBlank(lines[i])) break;
        const m = lines[i].match(RE_BLOCKQUOTE);
        inner.push(m ? m[1] : lines[i]);
        i += 1;
      }
      blocks.push({ type: 'blockquote', blocks: parseLines(inner) });
      continue;
    }

    // List (unordered or ordered).
    if (RE_ULIST.test(line) || RE_OLIST.test(line)) {
      const consumed = parseList(lines, i);
      blocks.push(consumed.block);
      i = consumed.next;
      continue;
    }

    // Paragraph — gather consecutive non-blank, non-structural lines.
    const para = [];
    while (i < n && !isBlank(lines[i]) && !isStructural(lines[i])) {
      para.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: 'paragraph', inlines: parseInlines(para.join(' ')) });
  }

  return blocks;
}

// A line that starts a different block type (so a paragraph must stop before it).
function isStructural(line) {
  return (
    RE_HEADING.test(line) ||
    RE_HR.test(line) ||
    RE_FENCE.test(line) ||
    RE_BLOCKQUOTE.test(line) ||
    RE_ULIST.test(line) ||
    RE_OLIST.test(line)
  );
}

// Parse a list starting at lines[start]. Items can hold nested blocks (incl. nested
// lists, via indentation). Returns { block, next }.
function parseList(lines, start) {
  const first = lines[start].match(RE_ULIST) || lines[start].match(RE_OLIST);
  const ordered = !RE_ULIST.test(lines[start]);
  const baseIndent = indentWidth(first[1]);
  const items = [];
  let i = start;
  const n = lines.length;

  while (i < n) {
    const line = lines[i];
    if (isBlank(line)) {
      // Allow a single blank line between items; stop on a hard break.
      if (i + 1 < n && (RE_ULIST.test(lines[i + 1]) || RE_OLIST.test(lines[i + 1]))) {
        i += 1;
        continue;
      }
      break;
    }
    const um = line.match(RE_ULIST);
    const om = line.match(RE_OLIST);
    const m = um || om;
    if (!m) break;
    const itemOrdered = !um;
    const indent = indentWidth(m[1]);

    if (indent < baseIndent) break; // belongs to an outer list
    if (indent > baseIndent) break; // shouldn't happen — nested handled below
    if (itemOrdered !== ordered) break; // a different list type starts here

    // Collect this item's raw lines: the marker line (content) plus deeper-indented
    // continuation lines, with one nesting level (baseIndent + 2) of indent stripped.
    const itemLines = [m[3]];
    i += 1;
    while (i < n) {
      if (isBlank(lines[i])) {
        // Peek: a deeper-indented line after the blank continues the item.
        if (
          i + 1 < n &&
          !isBlank(lines[i + 1]) &&
          leadingIndent(lines[i + 1]) > baseIndent
        ) {
          itemLines.push('');
          i += 1;
          continue;
        }
        break;
      }
      const li = leadingIndent(lines[i]);
      if (li > baseIndent) {
        itemLines.push(dedent(lines[i], baseIndent + 2));
        i += 1;
        continue;
      }
      break; // a sibling or outer-list line — stop this item
    }
    items.push({ blocks: parseLines(itemLines) });
  }

  return { block: { type: 'list', ordered, items }, next: i };
}

function leadingIndent(line) {
  const m = line.match(/^(\s*)/);
  return indentWidth(m[1]);
}

// Remove up to `width` columns of leading indentation (tabs counted as 2).
function dedent(line, width) {
  let removed = 0;
  let i = 0;
  while (i < line.length && removed < width) {
    const ch = line[i];
    if (ch === ' ') {
      removed += 1;
      i += 1;
    } else if (ch === '\t') {
      removed += 2;
      i += 1;
    } else break;
  }
  return line.slice(i);
}

// ── HTML rendering ───────────────────────────────────────────────────────────────

function renderInlines(inlines) {
  return (inlines || [])
    .map((node) => {
      switch (node.type) {
        case 'text':
          return escapeHtml(node.value);
        case 'strong':
          return `<strong>${renderInlines(node.inlines)}</strong>`;
        case 'em':
          return `<em>${renderInlines(node.inlines)}</em>`;
        case 'code':
          return `<code>${escapeHtml(node.value)}</code>`;
        case 'link':
          return `<a href="${escapeHtml(node.href)}">${renderInlines(node.inlines)}</a>`;
        case 'image':
          return `<img src="${escapeHtml(node.src)}" alt="${escapeHtml(node.alt)}">`;
        default:
          return '';
      }
    })
    .join('');
}

function renderBlock(block) {
  switch (block.type) {
    case 'heading':
      return `<h${block.level}>${renderInlines(block.inlines)}</h${block.level}>`;
    case 'paragraph':
      return `<p>${renderInlines(block.inlines)}</p>`;
    case 'hr':
      return '<hr>';
    case 'code': {
      const cls = block.lang ? ` class="language-${escapeHtml(block.lang)}"` : '';
      return `<pre><code${cls}>${escapeHtml(block.text)}</code></pre>`;
    }
    case 'blockquote':
      return `<blockquote>\n${block.blocks.map(renderBlock).join('\n')}\n</blockquote>`;
    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      const items = block.items
        .map((it) => `<li>${renderItemBlocks(it.blocks)}</li>`)
        .join('\n');
      return `<${tag}>\n${items}\n</${tag}>`;
    }
    case 'table':
      return renderTable(block);
    default:
      return '';
  }
}

// A list item renders its inline content tight (no <p> wrapper for a lone paragraph),
// but nested lists / multiple blocks render normally.
function renderItemBlocks(blocks) {
  if (blocks.length === 1 && blocks[0].type === 'paragraph') {
    return renderInlines(blocks[0].inlines);
  }
  return blocks
    .map((b) => (b.type === 'paragraph' ? renderInlines(b.inlines) : renderBlock(b)))
    .join('\n');
}

function renderTable(block) {
  const head = block.headers
    .map((cell) => `<th>${renderInlines(cell)}</th>`)
    .join('');
  const body = block.rows
    .map(
      (row) => `<tr>${row.map((cell) => `<td>${renderInlines(cell)}</td>`).join('')}</tr>`,
    )
    .join('\n');
  return `<table>\n<thead>\n<tr>${head}</tr>\n</thead>\n<tbody>\n${body}\n</tbody>\n</table>`;
}

function mdToHtml(md) {
  return parseBlocks(md).map(renderBlock).join('\n');
}

// ── HTML → Markdown ──────────────────────────────────────────────────────────────
// Walks the tolerant node tree from html-parser.js (Element/Text) and serialises a
// CommonMark-ish Markdown string over the same documented subset (D10). Lossy by the
// SAME edges as mdToHtml: unknown elements degrade to their text content; setext, link
// titles, reference links, alignment, etc. are not reconstructed.
//
//   htmlToMd(html) -> string
//
// Element node: { type:'element', tag, attrs, children: Node[] }; Text: { type:'text', value }

const htmlParser = require('./html-parser.js');

// Tags dropped entirely (their text is metadata / executable, not document content).
const HTML_SKIP = new Set(['head', 'script', 'style', 'noscript', 'template']);
// Block elements rendered with a specific Markdown shape.
const HTML_KNOWN_BLOCK = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'hr', 'pre', 'blockquote',
  'ul', 'ol', 'li', 'table',
]);
// Block-level containers that are transparent — recurse and treat children as blocks.
const HTML_CONTAINER = new Set([
  'div', 'section', 'article', 'main', 'body', 'html', 'header', 'footer',
  'aside', 'nav', 'figure', 'figcaption', 'details', 'summary', 'dl', 'dd', 'dt',
]);

function isBlockTag(tag) {
  return HTML_KNOWN_BLOCK.has(tag) || HTML_CONTAINER.has(tag);
}

// Recursively concatenate raw text content (verbatim — for code / pre).
function collectText(node) {
  if (node.type === 'text') return node.value;
  if (node.type === 'element') return (node.children || []).map(collectText).join('');
  return '';
}

// Extract a code language from a class attribute like "language-js".
function langFromClass(cls) {
  if (!cls) return '';
  const m = String(cls).match(/language-(\S+)/);
  return m ? m[1] : '';
}

// Render a run of nodes as inline Markdown. Whitespace in text is collapsed so HTML
// indentation/newlines don't leak into the output.
function htmlRenderInline(nodes) {
  let out = '';
  for (const node of nodes || []) {
    if (node.type === 'text') {
      out += node.value.replace(/\s+/g, ' ');
    } else if (node.type === 'element') {
      switch (node.tag) {
        case 'strong':
        case 'b':
          out += `**${htmlRenderInline(node.children).trim()}**`;
          break;
        case 'em':
        case 'i':
          out += `*${htmlRenderInline(node.children).trim()}*`;
          break;
        case 'code':
          out += `\`${collectText(node)}\``;
          break;
        case 'a':
          out += `[${htmlRenderInline(node.children).trim()}](${node.attrs.href || ''})`;
          break;
        case 'img':
          out += `![${node.attrs.alt || ''}](${node.attrs.src || ''})`;
          break;
        case 'br':
          out += '\n';
          break;
        default:
          // Unknown inline element (span, mark, …) — degrade to its inline content.
          out += htmlRenderInline(node.children);
      }
    }
  }
  return out;
}

// Indent continuation lines of a multi-line string by `n` columns (first line kept).
function indentContinuation(content, n) {
  const pad = ' '.repeat(n);
  return content
    .split('\n')
    .map((line, idx) => (idx === 0 || line === '' ? line : pad + line))
    .join('\n');
}

// Collect <tr> rows under a table, recursing through thead/tbody/tfoot.
function collectTableRows(node) {
  const rows = [];
  for (const c of node.children || []) {
    if (c.type !== 'element') continue;
    if (c.tag === 'tr') rows.push(c);
    else if (c.tag === 'thead' || c.tag === 'tbody' || c.tag === 'tfoot') {
      rows.push(...collectTableRows(c));
    }
  }
  return rows;
}

function htmlRenderBlockElement(node) {
  const tag = node.tag;
  if (HTML_SKIP.has(tag)) return '';

  if (/^h[1-6]$/.test(tag)) {
    return `${'#'.repeat(Number(tag[1]))} ${htmlRenderInline(node.children).trim()}`;
  }
  if (tag === 'p') return htmlRenderInline(node.children).trim();
  if (tag === 'hr') return '---';

  if (tag === 'pre') {
    const codeEl = (node.children || []).find(
      (c) => c.type === 'element' && c.tag === 'code',
    );
    const lang = codeEl ? langFromClass(codeEl.attrs.class) : '';
    const text = collectText(codeEl || node).replace(/\n$/, '');
    return `\`\`\`${lang}\n${text}\n\`\`\``;
  }

  if (tag === 'blockquote') {
    const inner = htmlRenderBlocks(node.children).trim();
    return inner
      .split('\n')
      .map((line) => (line ? `> ${line}` : '>'))
      .join('\n');
  }

  if (tag === 'ul' || tag === 'ol') {
    const ordered = tag === 'ol';
    const items = (node.children || []).filter(
      (c) => c.type === 'element' && c.tag === 'li',
    );
    return items
      .map((li, idx) => {
        const marker = ordered ? `${idx + 1}. ` : '- ';
        const content = htmlRenderBlocks(li.children).trim();
        return marker + indentContinuation(content, marker.length);
      })
      .join('\n');
  }

  if (tag === 'table') {
    const trs = collectTableRows(node);
    if (!trs.length) return '';
    const cellsOf = (tr) =>
      (tr.children || [])
        .filter((c) => c.type === 'element' && (c.tag === 'th' || c.tag === 'td'))
        .map((c) => htmlRenderInline(c.children).trim());
    const header = cellsOf(trs[0]);
    const row = (cells) => `| ${cells.join(' | ')} |`;
    const sep = `| ${header.map(() => '---').join(' | ')} |`;
    const lines = [row(header), sep, ...trs.slice(1).map((tr) => row(cellsOf(tr)))];
    return lines.join('\n');
  }

  if (tag === 'li') {
    // A bare <li> outside a list — render its blocks directly.
    return htmlRenderBlocks(node.children).trim();
  }

  // Transparent container (div/section/body/…) — recurse as blocks.
  return htmlRenderBlocks(node.children);
}

// Render a list of sibling nodes as Markdown blocks. Inline runs between block elements
// are grouped into paragraphs; pure-whitespace text between blocks is dropped.
function htmlRenderBlocks(nodes) {
  const out = [];
  let inlineBuf = [];
  const flush = () => {
    if (inlineBuf.length) {
      const text = htmlRenderInline(inlineBuf).trim();
      if (text) out.push(text);
    }
    inlineBuf = [];
  };
  for (const node of nodes || []) {
    if (node.type === 'text') {
      if (node.value.trim() === '' && inlineBuf.length === 0) continue;
      inlineBuf.push(node);
    } else if (node.type === 'element') {
      if (HTML_SKIP.has(node.tag)) continue;
      if (isBlockTag(node.tag)) {
        flush();
        const rendered = htmlRenderBlockElement(node);
        if (rendered.trim() !== '') out.push(rendered);
      } else {
        inlineBuf.push(node);
      }
    }
  }
  flush();
  return out.join('\n\n');
}

function htmlToMd(html) {
  const nodes = htmlParser.parse(html);
  const md = htmlRenderBlocks(nodes).replace(/[ \t]+\n/g, '\n').trim();
  return md ? `${md}\n` : '';
}

module.exports = { parseBlocks, mdToHtml, htmlToMd };
