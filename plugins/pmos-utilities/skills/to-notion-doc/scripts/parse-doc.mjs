#!/usr/bin/env node
// parse-doc.mjs — parse a local .md / .html / .txt document into a normalized block tree.
//
// Zero-dependency. Emits a stable, source-indexed block tree consumed by map-to-notion.mjs.
// Notion-API / NFM facts that drive the downstream mapping live in ../reference/notion-blocks.md
// (one-fact-one-home); this file only normalizes source structure.
//
// Block node shape (see reference/notion-blocks.md §2):
//   { type, si, ...fields }
//   types: heading{level,rich} | paragraph{rich} | bulleted_list_item{rich,children}
//        | numbered_list_item{rich,children} | to_do{rich,checked,children} | quote{rich,admonition}
//        | code{language,code} | divider | table{header,rows:[[cell]]} (cell=[span])
//        | image{src,alt,external} | bookmark{url} | equation{expr}
//        | ambiguous{kind,raw}
//   span: { t, b?, i?, s?, code?, link? }
//   si: stable pre-order source index (top-level then children), assigned last.
//
// Usage: node parse-doc.mjs <file>           # prints { blocks } JSON
//        node parse-doc.mjs --format md <f>  # force format
//        node parse-doc.mjs --selftest
'use strict';
import fs from 'node:fs';

// ---------------------------------------------------------------------------
// Inline rich-text parsing (shared by md + txt; html has its own collector)
// ---------------------------------------------------------------------------

// Parse a markdown inline string into [span]. Handles **bold** *italic* ~~strike~~ `code` [text](url).
export function parseInline(text) {
  const spans = [];
  let i = 0;
  let buf = '';
  const flush = (marks) => {
    if (buf) { spans.push({ t: buf, ...marks }); buf = ''; }
  };
  while (i < text.length) {
    const c = text[i];
    // inline code `...`
    if (c === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > i) { flush({}); spans.push({ t: text.slice(i + 1, end), code: true }); i = end + 1; continue; }
    }
    // link [text](url)
    if (c === '[') {
      const m = /^\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/.exec(text.slice(i));
      if (m) { flush({}); spans.push({ t: m[1], link: m[2] }); i += m[0].length; continue; }
    }
    // bold ** or __
    if ((c === '*' && text[i + 1] === '*') || (c === '_' && text[i + 1] === '_')) {
      const delim = c + c;
      const end = text.indexOf(delim, i + 2);
      if (end > i) { flush({}); for (const s of parseInline(text.slice(i + 2, end))) spans.push({ ...s, b: true }); i = end + 2; continue; }
    }
    // strike ~~
    if (c === '~' && text[i + 1] === '~') {
      const end = text.indexOf('~~', i + 2);
      if (end > i) { flush({}); for (const s of parseInline(text.slice(i + 2, end))) spans.push({ ...s, s: true }); i = end + 2; continue; }
    }
    // italic * or _  (single)
    if (c === '*' || c === '_') {
      const end = text.indexOf(c, i + 1);
      if (end > i && text[i + 1] !== ' ') { flush({}); for (const s of parseInline(text.slice(i + 1, end))) spans.push({ ...s, i: true }); i = end + 1; continue; }
    }
    buf += c; i++;
  }
  flush({});
  return spans.length ? spans : (text ? [{ t: text }] : []);
}

const isHttpUrl = (u) => /^https?:\/\//i.test(u || '');

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

function parseMarkdown(src) {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    let line = lines[i];
    // fenced code
    const fence = /^\s*(`{3,}|~{3,})\s*([\w+#-]*)\s*$/.exec(line);
    if (fence) {
      const marker = fence[1][0];
      const lang = fence[2] || '';
      const body = [];
      i++;
      while (i < lines.length && !new RegExp('^\\s*' + marker + '{3,}\\s*$').test(lines[i])) { body.push(lines[i]); i++; }
      i++; // closing fence
      blocks.push({ type: 'code', language: lang, code: body.join('\n') });
      continue;
    }
    // blank
    if (/^\s*$/.test(line)) { i++; continue; }
    // hr
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { blocks.push({ type: 'divider' }); i++; continue; }
    // heading
    const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) { blocks.push({ type: 'heading', level: Math.min(h[1].length, 3), rich: parseInline(h[2]) }); i++; continue; }
    // table (GFM): header row + delimiter row
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const rows = [];
      const splitRow = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => parseInline(c.trim()));
      rows.push(splitRow(line)); i++; // header
      i++; // delimiter
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(splitRow(lines[i])); i++; }
      blocks.push({ type: 'table', header: true, rows });
      continue;
    }
    // blockquote (consecutive >)
    if (/^\s*>\s?/.test(line)) {
      const qlines = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { qlines.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      const text = qlines.join(' ').trim();
      const adm = /^\s*(?:\[!)?(NOTE|WARNING|WARN|TIP|IMPORTANT|CAUTION)\]?[:\s]/i.exec(text);
      const admonition = adm ? adm[1].toUpperCase().replace('WARNING', 'WARN').replace('IMPORTANT', 'NOTE').replace('CAUTION', 'WARN') : null;
      blocks.push({ type: 'quote', rich: parseInline(text), admonition: admonition ? admonition.toLowerCase() : null });
      continue;
    }
    // list (bulleted / numbered / to-do), with nesting by indentation
    if (/^(\s*)([-*+]|\d+[.)])\s+/.test(line)) {
      const consumed = parseList(lines, i, 0);
      blocks.push(...consumed.items);
      i = consumed.next;
      continue;
    }
    // standalone bare URL → bookmark
    if (/^\s*<?(https?:\/\/[^\s>]+)>?\s*$/.test(line)) {
      blocks.push({ type: 'bookmark', url: /^\s*<?(https?:\/\/[^\s>]+)>?\s*$/.exec(line)[1] });
      i++; continue;
    }
    // standalone image ![alt](url)
    const img = /^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.exec(line);
    if (img) { blocks.push({ type: 'image', alt: img[1], src: img[2], external: isHttpUrl(img[2]) }); i++; continue; }
    // block equation $$ ... $$
    if (/^\s*\$\$\s*$/.test(line)) {
      const body = []; i++;
      while (i < lines.length && !/^\s*\$\$\s*$/.test(lines[i])) { body.push(lines[i]); i++; }
      i++;
      blocks.push({ type: 'equation', expr: body.join('\n').trim() });
      continue;
    }
    // paragraph (gather until blank / block start)
    const para = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) &&
      !/^(#{1,6})\s/.test(lines[i]) && !/^\s*([-*_])(\s*\1){2,}\s*$/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) && !/^(\s*)([-*+]|\d+[.)])\s+/.test(lines[i]) &&
      !/^\s*(`{3,}|~{3,})/.test(lines[i])) { para.push(lines[i]); i++; }
    blocks.push({ type: 'paragraph', rich: parseInline(para.join(' ').trim()) });
  }
  return blocks;
}

// Recursive list parser: returns { items, next } for a run at the given base indent.
function parseList(lines, start, baseIndent) {
  const items = [];
  let i = start;
  while (i < lines.length) {
    const m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(lines[i]);
    if (!m) break;
    const indent = m[1].replace(/\t/g, '  ').length;
    if (indent < baseIndent) break;
    if (indent > baseIndent && items.length === 0) break; // not our level
    if (indent > baseIndent) break; // nested handled below by lookahead
    const ordered = /\d/.test(m[2]);
    let content = m[3];
    let type = ordered ? 'numbered_list_item' : 'bulleted_list_item';
    let checked;
    const task = /^\[([ xX])\]\s+(.*)$/.exec(content);
    if (task) { type = 'to_do'; checked = task[1].toLowerCase() === 'x'; content = task[2]; }
    const node = { type, rich: parseInline(content), children: [] };
    if (type === 'to_do') node.checked = checked;
    i++;
    // gather nested deeper-indented list lines
    if (i < lines.length) {
      const nm = /^(\s*)([-*+]|\d+[.)])\s+/.exec(lines[i]);
      if (nm) {
        const nIndent = nm[1].replace(/\t/g, '  ').length;
        if (nIndent > baseIndent) {
          const sub = parseList(lines, i, nIndent);
          node.children = sub.items;
          i = sub.next;
        }
      }
    }
    if (!node.children.length) delete node.children;
    items.push(node);
  }
  return { items, next: i };
}

// ---------------------------------------------------------------------------
// HTML (tolerant tokenizer + tree builder + block walker)
// ---------------------------------------------------------------------------

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW_TAGS = new Set(['script', 'style', 'svg', 'pre', 'code', 'textarea']);

function decodeEntities(s) {
  if (!s) return s;
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, e) => {
    if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
    const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', copy: '©', reg: '®', trade: '™', check: '✓' };
    return e in named ? named[e] : m;
  });
}

function parseAttrs(s) {
  const attrs = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g;
  let m;
  while ((m = re.exec(s))) {
    let v = m[2];
    if (v && (v[0] === '"' || v[0] === "'")) v = v.slice(1, -1);
    attrs[m[1].toLowerCase()] = v === undefined ? '' : decodeEntities(v);
  }
  return attrs;
}

// Build a lightweight DOM tree. Node: { tag, attrs, children:[], text? , raw? }
function buildDom(html) {
  const root = { tag: '#root', attrs: {}, children: [] };
  const stack = [root];
  let i = 0;
  const top = () => stack[stack.length - 1];
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt < 0) { const t = decodeEntities(html.slice(i)); if (t.trim()) top().children.push({ tag: '#text', text: t }); break; }
    if (lt > i) { const t = decodeEntities(html.slice(i, lt)); if (t.trim()) top().children.push({ tag: '#text', text: t }); }
    // comment
    if (html.startsWith('<!--', lt)) { const end = html.indexOf('-->', lt + 4); i = end < 0 ? html.length : end + 3; continue; }
    if (html[lt + 1] === '!') { const end = html.indexOf('>', lt); i = end < 0 ? html.length : end + 1; continue; }
    const tagMatch = /^<\s*(\/?)\s*([a-zA-Z][-a-zA-Z0-9]*)([^>]*?)(\/?)>/.exec(html.slice(lt));
    if (!tagMatch) { top().children.push({ tag: '#text', text: '<' }); i = lt + 1; continue; }
    const closing = tagMatch[1] === '/';
    const tag = tagMatch[2].toLowerCase();
    const attrStr = tagMatch[3];
    const selfClose = tagMatch[4] === '/';
    const tagEnd = lt + tagMatch[0].length;
    if (closing) {
      // pop to matching tag
      for (let s = stack.length - 1; s >= 1; s--) { if (stack[s].tag === tag) { stack.length = s; break; } }
      i = tagEnd; continue;
    }
    const node = { tag, attrs: parseAttrs(attrStr), children: [] };
    // raw-content tags: capture until matching close
    if (RAW_TAGS.has(tag) && !selfClose) {
      const closeRe = new RegExp('</\\s*' + tag + '\\s*>', 'i');
      const rest = html.slice(tagEnd);
      const cm = closeRe.exec(rest);
      const rawEnd = cm ? tagEnd + cm.index : html.length;
      node.raw = html.slice(lt, cm ? rawEnd + cm[0].length : html.length);
      node.text = html.slice(tagEnd, rawEnd);
      top().children.push(node);
      i = cm ? rawEnd + cm[0].length : html.length;
      continue;
    }
    top().children.push(node);
    if (!VOID_TAGS.has(tag) && !selfClose) stack.push(node);
    i = tagEnd;
  }
  return root;
}

// Collect inline rich text [span] from an html node's descendants.
function inlineFromHtml(node, marks = {}) {
  const spans = [];
  for (const ch of node.children || []) {
    if (ch.tag === '#text') { if (ch.text) spans.push({ t: ch.text.replace(/\s+/g, ' '), ...marks }); continue; }
    const t = ch.tag;
    if (t === 'strong' || t === 'b') spans.push(...inlineFromHtml(ch, { ...marks, b: true }));
    else if (t === 'em' || t === 'i') spans.push(...inlineFromHtml(ch, { ...marks, i: true }));
    else if (t === 'del' || t === 's' || t === 'strike') spans.push(...inlineFromHtml(ch, { ...marks, s: true }));
    else if (t === 'code') spans.push({ t: (ch.text || textOf(ch)), code: true, ...marks });
    else if (t === 'a') { const url = ch.attrs.href || ''; for (const sp of inlineFromHtml(ch, marks)) spans.push({ ...sp, link: url }); }
    else if (t === 'br') spans.push({ t: ' ', ...marks });
    else if (t === 'span' || t === 'u' || t === 'mark' || t === 'sup' || t === 'sub' || t === 'small' || t === 'font' || t === 'abbr' || t === 'time' || t === 'kbd' || t === 'q') spans.push(...inlineFromHtml(ch, marks));
    else if (t === 'svg') { /* inline svg in text: ignored inline (becomes ambiguous at block level) */ }
    else spans.push(...inlineFromHtml(ch, marks));
  }
  // merge adjacent identical-mark spans
  return mergeSpans(spans);
}

function mergeSpans(spans) {
  const out = [];
  for (const s of spans) {
    if (!s.t) continue;
    const prev = out[out.length - 1];
    if (prev && prev.b === s.b && prev.i === s.i && prev.s === s.s && prev.code === s.code && prev.link === s.link) prev.t += s.t;
    else out.push({ ...s });
  }
  return out.filter((s) => s.t !== '' && !(s.t.trim() === '' && out.length > 1 && false)).map((s) => { const o = { t: s.t }; for (const k of ['b', 'i', 's', 'code', 'link']) if (s[k]) o[k] = s[k]; return o; });
}

function textOf(node) {
  if (node.tag === '#text') return node.text || '';
  return (node.children || []).map(textOf).join('') + (node.text && !node.children?.length ? node.text : '');
}

const BLOCK_LEVEL = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'blockquote', 'pre', 'hr', 'table', 'div', 'section', 'article', 'main', 'header', 'footer', 'figure', 'figcaption', 'details', 'aside', 'nav']);

function htmlToBlocks(node, blocks) {
  for (const ch of node.children || []) {
    const t = ch.tag;
    if (ch.tag === '#text') { if (ch.text && ch.text.trim()) blocks.push({ type: 'paragraph', rich: [{ t: ch.text.replace(/\s+/g, ' ').trim() }] }); continue; }
    if (/^h[1-6]$/.test(t)) { blocks.push({ type: 'heading', level: Math.min(parseInt(t[1], 10), 3), rich: inlineFromHtml(ch) }); }
    else if (t === 'p') { const rich = inlineFromHtml(ch); if (rich.length) blocks.push({ type: 'paragraph', rich }); else htmlToBlocks(ch, blocks); }
    else if (t === 'hr') blocks.push({ type: 'divider' });
    else if (t === 'ul' || t === 'ol') blocks.push(...htmlList(ch, t === 'ol'));
    else if (t === 'blockquote') { const text = inlineFromHtml(ch); const raw = text.map((s) => s.t).join(''); const adm = /\b(NOTE|WARNING|WARN|TIP|IMPORTANT|CAUTION)\b/i.exec(raw); blocks.push({ type: 'quote', rich: text, admonition: adm ? adm[1].toLowerCase().replace('warning', 'warn').replace('important', 'note').replace('caution', 'warn') : null }); }
    else if (t === 'pre') { const codeNode = (ch.children || []).find((c) => c.tag === 'code') || ch; const lang = (codeNode.attrs?.class || ch.attrs?.class || '').replace(/^.*language-/, '').split(/\s+/)[0] || ''; blocks.push({ type: 'code', language: /language-|^\w+$/.test(lang) ? lang : '', code: decodeEntities(codeNode.text || textOf(codeNode)).replace(/\n$/, '') }); }
    else if (t === 'table') blocks.push(htmlTable(ch));
    else if (t === 'svg') blocks.push({ type: 'ambiguous', kind: 'svg', raw: ch.raw || '<svg>…</svg>' });
    else if (t === 'iframe') blocks.push({ type: 'ambiguous', kind: 'iframe', raw: ch.raw || `<iframe src="${ch.attrs.src || ''}">` });
    else if (t === 'embed' || t === 'object') blocks.push({ type: 'ambiguous', kind: 'embed', raw: ch.attrs.src || ch.attrs.data || t });
    else if (t === 'img') { const src = ch.attrs.src || ''; blocks.push({ type: 'image', alt: ch.attrs.alt || '', src, external: isHttpUrl(src) }); }
    else if (t === 'figure') { htmlToBlocks(ch, blocks); }
    else if (t === 'figcaption') { const rich = inlineFromHtml(ch); if (rich.length) blocks.push({ type: 'paragraph', rich }); }
    else if (t === 'details') { const sum = (ch.children || []).find((c) => c.tag === 'summary'); if (sum) blocks.push({ type: 'heading', level: 3, rich: inlineFromHtml(sum) }); htmlToBlocks({ children: (ch.children || []).filter((c) => c.tag !== 'summary') }, blocks); }
    else if (BLOCK_LEVEL.has(t) || t === 'body' || t === 'html' || t === 'span' || t === 'a') {
      // container: if it holds block-level children, recurse; else treat as paragraph
      const hasBlockChild = (ch.children || []).some((c) => BLOCK_LEVEL.has(c.tag) || c.tag === 'img' || c.tag === 'svg');
      if (hasBlockChild) htmlToBlocks(ch, blocks);
      else { const rich = inlineFromHtml(ch); if (rich.length) blocks.push({ type: 'paragraph', rich }); }
    }
    else { htmlToBlocks(ch, blocks); }
  }
  return blocks;
}

function htmlList(node, ordered) {
  const items = [];
  for (const li of (node.children || []).filter((c) => c.tag === 'li')) {
    // task list checkbox?
    const inputs = (li.children || []).filter((c) => c.tag === 'input');
    const isTask = inputs.some((c) => (c.attrs.type || '') === 'checkbox');
    const checked = inputs.some((c) => 'checked' in c.attrs);
    const nested = (li.children || []).filter((c) => c.tag === 'ul' || c.tag === 'ol');
    const rich = inlineFromHtml({ children: (li.children || []).filter((c) => c.tag !== 'ul' && c.tag !== 'ol') });
    let type = ordered ? 'numbered_list_item' : 'bulleted_list_item';
    const node2 = { type, rich };
    if (isTask) { node2.type = 'to_do'; node2.checked = checked; }
    const children = [];
    for (const n of nested) children.push(...htmlList(n, n.tag === 'ol'));
    if (children.length) node2.children = children;
    items.push(node2);
  }
  return items;
}

function htmlTable(node) {
  const rows = [];
  let header = false;
  const collect = (n) => {
    for (const ch of n.children || []) {
      if (ch.tag === 'tr') {
        const cells = (ch.children || []).filter((c) => c.tag === 'td' || c.tag === 'th').map((c) => inlineFromHtml(c));
        if ((ch.children || []).some((c) => c.tag === 'th')) header = true;
        rows.push(cells);
      } else if (ch.tag === 'thead' || ch.tag === 'tbody' || ch.tag === 'tfoot') collect(ch);
    }
  };
  collect(node);
  return { type: 'table', header, rows };
}

function parseHtml(src) {
  // strip a leading doctype/head noise is handled by buildDom (comments/doctype skipped)
  const dom = buildDom(src);
  // prefer <body> if present
  let rootChildren = dom;
  const findBody = (n) => { for (const c of n.children || []) { if (c.tag === 'body') return c; const f = findBody(c); if (f) return f; } return null; };
  const body = findBody(dom);
  if (body) rootChildren = body;
  return htmlToBlocks(rootChildren, []);
}

// ---------------------------------------------------------------------------
// Plain text (light heuristics — D-grill)
// ---------------------------------------------------------------------------

function parseTxt(src) {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  const isCaps = (l) => /[A-Z]/.test(l) && l === l.toUpperCase() && l.trim().length >= 3 && l.trim().length <= 80 && !/[.!?]$/.test(l.trim());
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }
    // underlined heading: next line all === or ---
    if (i + 1 < lines.length && /^\s*(={3,}|-{3,})\s*$/.test(lines[i + 1]) && line.trim()) {
      const level = lines[i + 1].includes('=') ? 1 : 2;
      blocks.push({ type: 'heading', level, rich: [{ t: line.trim() }] });
      i += 2; continue;
    }
    // ALL-CAPS heading
    if (isCaps(line)) { blocks.push({ type: 'heading', level: 2, rich: [{ t: line.trim() }] }); i++; continue; }
    // bullet
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push({ type: 'bulleted_list_item', rich: [{ t: lines[i].replace(/^\s*[-*]\s+/, '').trim() }] }); i++; }
      blocks.push(...items); continue;
    }
    // paragraph until blank
    const para = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i]) && !isCaps(lines[i])) { para.push(lines[i].trim()); i++; }
    blocks.push({ type: 'paragraph', rich: [{ t: para.join(' ') }] });
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// si assignment (pre-order: top-level then children)
// ---------------------------------------------------------------------------

function assignSi(blocks) {
  let n = 0;
  const walk = (arr) => { for (const b of arr) { b.si = n++; if (b.children) walk(b.children); } };
  walk(blocks);
  return blocks;
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export function parseDoc(src, format) {
  let blocks;
  if (format === 'md' || format === 'markdown') blocks = parseMarkdown(src);
  else if (format === 'html' || format === 'htm') blocks = parseHtml(src);
  else if (format === 'txt' || format === 'text') blocks = parseTxt(src);
  else throw new Error(`unknown format: ${format}`);
  return { blocks: assignSi(blocks), format };
}

export function formatFromPath(p) {
  const ext = (p.match(/\.([a-zA-Z0-9]+)$/) || [, ''])[1].toLowerCase();
  if (ext === 'md' || ext === 'markdown') return 'md';
  if (ext === 'html' || ext === 'htm') return 'html';
  return 'txt';
}

// ---------------------------------------------------------------------------
// Selftest
// ---------------------------------------------------------------------------

function selftest() {
  let pass = 0, fail = 0;
  const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } };

  // MD: heading + bold + list + code + divider + table + quote + image + link
  const md = [
    '# Title',
    '',
    'A para with **bold** and *italic* and `code` and [link](https://x.com).',
    '',
    '- one',
    '- two',
    '  - nested',
    '',
    '1. first',
    '2. second',
    '',
    '- [ ] todo open',
    '- [x] todo done',
    '',
    '> NOTE: heed this',
    '',
    '```python',
    'print(1)',
    '```',
    '',
    '---',
    '',
    '| A | B |',
    '| - | - |',
    '| 1 | 2 |',
    '| 3 |',
    '',
    '![alt](https://img/x.png)',
  ].join('\n');
  const r = parseDoc(md, 'md');
  const types = r.blocks.map((b) => b.type);
  ok(types[0] === 'heading' && r.blocks[0].level === 1, 'md h1');
  const para = r.blocks.find((b) => b.type === 'paragraph');
  ok(para.rich.some((s) => s.b) && para.rich.some((s) => s.i) && para.rich.some((s) => s.code) && para.rich.some((s) => s.link), 'md inline marks');
  const bl = r.blocks.filter((b) => b.type === 'bulleted_list_item').find((b) => b.children);
  ok(bl && bl.children && bl.children[0].rich[0].t === 'nested', 'md nested list');
  ok(r.blocks.some((b) => b.type === 'numbered_list_item'), 'md ordered list');
  const todos = r.blocks.filter((b) => b.type === 'to_do');
  ok(todos.length === 2 && todos[0].checked === false && todos[1].checked === true, 'md to_do checked');
  ok(r.blocks.some((b) => b.type === 'quote' && b.admonition === 'note'), 'md quote admonition');
  ok(r.blocks.some((b) => b.type === 'code' && b.language === 'python' && b.code === 'print(1)'), 'md code');
  ok(r.blocks.some((b) => b.type === 'divider'), 'md divider');
  const tbl = r.blocks.find((b) => b.type === 'table');
  ok(tbl && tbl.rows.length === 3 && tbl.header === true, 'md table rows');
  ok(r.blocks.some((b) => b.type === 'image' && b.external === true), 'md image external');
  // stable si: strictly increasing, unique, pre-order
  const sis = []; const collect = (a) => a.forEach((b) => { sis.push(b.si); if (b.children) collect(b.children); });
  collect(r.blocks);
  ok(sis.every((v, k) => k === 0 || v === sis[k - 1] + 1) && sis[0] === 0, 'md si contiguous pre-order');

  // HTML: table + nested list + code + divider + inline svg (ambiguous) + heading + marks
  const html = `<html><body>
    <h2>Sec</h2>
    <p>Hello <strong>world</strong> <a href="https://y.com">y</a></p>
    <ul><li>a<ul><li>a1</li></ul></li><li>b</li></ul>
    <hr>
    <table><thead><tr><th>H1</th><th>H2</th></tr></thead><tbody><tr><td>x</td><td>y</td></tr><tr><td>z</td></tr></tbody></table>
    <pre><code class="language-js">const a=1;</code></pre>
    <svg width="10"><rect/></svg>
  </body></html>`;
  const h = parseDoc(html, 'html');
  ok(h.blocks.some((b) => b.type === 'heading' && b.rich[0].t === 'Sec'), 'html heading');
  const hp = h.blocks.find((b) => b.type === 'paragraph');
  ok(hp.rich.some((s) => s.b && s.t === 'world') && hp.rich.some((s) => s.link), 'html inline marks+link');
  const hbl = h.blocks.find((b) => b.type === 'bulleted_list_item');
  ok(hbl.children && hbl.children[0].rich[0].t === 'a1', 'html nested list');
  ok(h.blocks.some((b) => b.type === 'divider'), 'html divider');
  const ht = h.blocks.find((b) => b.type === 'table');
  ok(ht && ht.header === true && ht.rows.length === 3, 'html table (header + 2 body rows)');
  ok(h.blocks.some((b) => b.type === 'code' && b.code.includes('const a=1')), 'html code');
  ok(h.blocks.some((b) => b.type === 'ambiguous' && b.kind === 'svg'), 'html inline svg → ambiguous');

  // TXT: underlined heading, ALL-CAPS heading, bullets, paragraph
  const txt = ['Big Title', '=========', '', 'SECTION ONE', '', 'a paragraph here', 'continued', '', '- item one', '- item two'].join('\n');
  const tr = parseDoc(txt, 'txt');
  ok(tr.blocks[0].type === 'heading' && tr.blocks[0].level === 1, 'txt underlined heading');
  ok(tr.blocks.some((b) => b.type === 'heading' && b.rich[0].t === 'SECTION ONE'), 'txt caps heading');
  ok(tr.blocks.filter((b) => b.type === 'bulleted_list_item').length === 2, 'txt bullets');
  ok(tr.blocks.some((b) => b.type === 'paragraph' && b.rich[0].t.includes('paragraph here continued')), 'txt paragraph join');

  console.log(`parse-doc selftest: ${pass} passed, ${fail} failed`);
  return fail === 0;
}

// CLI
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) { process.exit(selftest() ? 0 : 1); }
  let format = null; const files = [];
  for (let k = 0; k < args.length; k++) { if (args[k] === '--format') format = args[++k]; else files.push(args[k]); }
  if (!files.length) { console.error('usage: parse-doc.mjs [--format md|html|txt] <file> | --selftest'); process.exit(64); }
  const src = fs.readFileSync(files[0], 'utf8');
  const out = parseDoc(src, format || formatFromPath(files[0]));
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}
