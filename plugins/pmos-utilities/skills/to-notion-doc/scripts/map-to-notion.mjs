#!/usr/bin/env node
// map-to-notion.mjs — normalized block tree → (a) REST-faithful Notion block model + (b) Notion-flavored
// Markdown (NFM) for the content MCP + (c) a reconciliation plan.
//
// Zero-dependency. The Notion-API / NFM facts driving this mapping live in ../reference/notion-blocks.md
// (one-fact-one-home): the table-fidelity contract (§3), the code-language + 19-value color enums (§4), the
// NFM serialization (§1). The model is what the selftests assert the design's invariants against
// (table_width / cells / is_toggleable / enums); the NFM string is what the skill actually writes via the MCP.
//
// Usage: node map-to-notion.mjs <parse-doc.json> [--style minimal|expressive] [--headings toggle|normal]
//        node map-to-notion.mjs --selftest
'use strict';
import fs from 'node:fs';
import { parseDoc, formatFromPath } from './parse-doc.mjs';
// The stub-callout shape lives in one home (upload-image.mjs §5); map-to-notion is the single positional owner
// of the in-document stub, so it renders via the SAME helper buildStub() uses — they cannot drift.
import { stubCalloutNfm, assetRelPath } from './upload-image.mjs';

// reference/notion-blocks.md §4 — code language enum (unknown → 'plain text')
export const LANGUAGES = new Set(['abap', 'arduino', 'bash', 'basic', 'c', 'clojure', 'coffeescript', 'c++', 'c#', 'css', 'dart', 'diff', 'docker', 'elixir', 'elm', 'erlang', 'flow', 'fortran', 'fsharp', 'gherkin', 'glsl', 'go', 'graphql', 'groovy', 'haskell', 'html', 'java', 'javascript', 'json', 'julia', 'kotlin', 'latex', 'less', 'lisp', 'livescript', 'lua', 'makefile', 'markdown', 'markup', 'matlab', 'mermaid', 'nix', 'objective-c', 'ocaml', 'pascal', 'perl', 'php', 'plain text', 'powershell', 'prolog', 'protobuf', 'python', 'r', 'reason', 'ruby', 'rust', 'sass', 'scala', 'scheme', 'scss', 'shell', 'sql', 'swift', 'typescript', 'vb.net', 'verilog', 'vhdl', 'visual basic', 'webassembly', 'xml', 'yaml']);
// reference/notion-blocks.md §4 — 19-value color enum (REST spelling; NFM uses *_bg for *_background)
const BASE_COLORS = ['default', 'gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];
export const COLORS = new Set([...BASE_COLORS, ...BASE_COLORS.filter((c) => c !== 'default').map((c) => `${c}_background`)]);

const LANG_ALIASES = { js: 'javascript', ts: 'typescript', py: 'python', sh: 'bash', shell: 'shell', 'c++': 'c++', cpp: 'c++', cs: 'c#', yml: 'yaml', md: 'markdown', text: 'plain text', txt: 'plain text', plaintext: 'plain text', '': 'plain text' };

export function validateLang(lang) {
  const l = (lang || '').toLowerCase().trim();
  if (LANGUAGES.has(l)) return l;
  if (l in LANG_ALIASES) return LANG_ALIASES[l];
  return 'plain text';
}

export function validateColor(color) {
  const c = (color || 'default').toLowerCase().trim();
  // accept NFM _bg spelling as alias of _background
  const norm = c.replace(/_bg$/, '_background');
  if (!COLORS.has(norm)) throw new Error(`invalid color: ${color}`);
  return norm;
}

// NFM color spelling: *_background → *_bg
const nfmColor = (c) => c.replace(/_background$/, '_bg');

// span {t,b,i,s,code,link} → notion rich-text {content, annotations:{bold,italic,strikethrough,code,color}, link}
function toNotionRich(spans, color) {
  return (spans || []).map((s) => {
    const annotations = {};
    if (s.b) annotations.bold = true;
    if (s.i) annotations.italic = true;
    if (s.s) annotations.strikethrough = true;
    if (s.code) annotations.code = true;
    if (color && color !== 'default') annotations.color = color;
    const o = { content: s.t, annotations };
    if (s.link) o.link = s.link;
    return o;
  });
}

const ADMONITION = {
  tip: { emoji: '💡', color: 'green_background' },
  warn: { emoji: '⚠️', color: 'yellow_background' },
  note: { emoji: 'ℹ️', color: 'blue_background' },
};

// Group flat blocks so each heading owns the following blocks (until an equal/higher heading) as children.
function nestUnderHeadings(blocks) {
  const root = [];
  const stack = []; // {level, node}
  for (const b of blocks) {
    if (b.type === 'heading') {
      while (stack.length && stack[stack.length - 1].level >= b.level) stack.pop();
      const node = { ...b, children: [] };
      (stack.length ? stack[stack.length - 1].node.children : root).push(node);
      stack.push({ level: b.level, node });
    } else {
      (stack.length ? stack[stack.length - 1].node.children : root).push(b);
    }
  }
  return root;
}

// Build the REST-faithful model + the reconciliation plan.
export function buildModel(tree, opts = {}) {
  const style = opts.style === 'expressive' ? 'expressive' : 'minimal';
  const headings = opts.headings === 'toggle' ? 'toggle' : 'normal';
  const plan = [];
  const source = headings === 'toggle' ? nestUnderHeadings(tree) : tree;

  const mapNode = (b) => {
    const rec = (disp, notionType) => { if (b.si !== undefined) plan.push({ si: b.si, sourceType: b.type, notionType, disposition: disp }); };
    switch (b.type) {
      case 'heading': {
        const m = { _si: b.si, type: `heading_${b.level}`, rich: toNotionRich(b.rich), is_toggleable: headings === 'toggle' };
        if (b.children && b.children.length) m.children = b.children.map(mapNode);
        rec('mapped', m.type);
        return m;
      }
      case 'paragraph': { rec('mapped', 'paragraph'); return { _si: b.si, type: 'paragraph', rich: toNotionRich(b.rich) }; }
      case 'bulleted_list_item':
      case 'numbered_list_item':
      case 'to_do': {
        const m = { _si: b.si, type: b.type, rich: toNotionRich(b.rich) };
        if (b.type === 'to_do') m.checked = !!b.checked;
        if (b.children && b.children.length) m.children = b.children.map(mapNode);
        rec('mapped', b.type);
        return m;
      }
      case 'quote': {
        if (style === 'expressive' && b.admonition && ADMONITION[b.admonition]) {
          const a = ADMONITION[b.admonition];
          rec('mapped', 'callout');
          return { _si: b.si, type: 'callout', rich: toNotionRich(b.rich), icon: a.emoji, color: validateColor(a.color) };
        }
        rec('mapped', 'quote');
        return { _si: b.si, type: 'quote', rich: toNotionRich(b.rich) };
      }
      case 'code': { rec('mapped', 'code'); return { _si: b.si, type: 'code', language: validateLang(b.language), code: b.code || '' }; }
      case 'divider': { rec('mapped', 'divider'); return { _si: b.si, type: 'divider' }; }
      case 'equation': { rec('mapped', 'equation'); return { _si: b.si, type: 'equation', expr: b.expr || '' }; }
      case 'bookmark': { rec('mapped', 'bookmark'); return { _si: b.si, type: 'bookmark', url: b.url }; }
      case 'image': {
        // disposition refined later by the skill via upload-image (external → mapped, stub → stubbed)
        rec(b.external ? 'mapped' : 'stubbed', 'image');
        const m = { _si: b.si, type: 'image', src: b.src, alt: b.alt || '', external: !!b.external };
        if (!b.external) m.assetRelPath = assetRelPath(opts.slug, b.src); // the copied path the stub callout names
        return m;
      }
      case 'table': return mapTable(b, rec);
      case 'toc': {
        // The source doc carried a table of contents. opts.tocMode (skill Phase 1 prompt) decides the fate:
        //   native (default) → Notion's auto-updating <table_of_contents/> block (recommended);
        //   replicate        → the source entries re-emitted as a plain bullet list;
        //   omit             → drop it (user-skipped — terminal disposition, never counted as a loss).
        const m = opts.tocMode || 'native';
        if (m === 'omit') { rec('user-skipped', 'none'); return { _si: b.si, type: 'toc_omit' }; }
        if (m === 'replicate') { rec('mapped', 'bulleted_list_item'); return { _si: b.si, type: 'toc_replicate', items: (b.items || []).map((it) => toNotionRich(it)) }; }
        rec('mapped', 'table_of_contents');
        return { _si: b.si, type: 'toc_native' };
      }
      case 'ambiguous': {
        // resolved by the skill (Phase 2); default placeholder callout = stubbed
        rec('ambiguous-pending', 'callout');
        return { _si: b.si, type: 'ambiguous', kind: b.kind, raw: b.raw };
      }
      default: { rec('mapped', 'paragraph'); return { _si: b.si, type: 'paragraph', rich: toNotionRich(b.rich || []) }; }
    }
  };

  const mapTable = (b, rec) => {
    // table_width is fixed once from the header/first row (fidelity contract §3): short rows are padded
    // with empty cells, over-long rows truncated + flagged. Using the first row (not max) is what lets an
    // over-long row truncate instead of widening the whole table.
    const width = Math.max(1, b.rows[0] ? b.rows[0].length : 1);
    let truncated = 0;
    const rows = b.rows.map((cells) => {
      if (cells.length > width) truncated++;
      const padded = cells.slice(0, width).map((c) => toNotionRich(c));
      while (padded.length < width) padded.push([]); // pad short rows with empty cells
      return { cells: padded };
    });
    if (!rows.length) rows.push({ cells: Array.from({ length: width }, () => []) }); // ≥1 row at create
    rec('mapped', 'table');
    const m = { _si: b.si, type: 'table', table_width: width, has_column_header: !!b.header, has_row_header: false, rows };
    if (truncated) m.truncated_rows = truncated; // flagged for the conversion report
    return m;
  };

  let blocks = source.map(mapNode);
  // Section dividers (opt-in preference): insert a horizontal rule before every top-level section heading
  // (heading_1 / heading_2) except the first, so each section reads as visibly closed. Only in 'normal'
  // heading mode — toggle headings already own their bodies, so an inter-section rule would be noise.
  if (opts.sectionDividers && headings === 'normal') blocks = withSectionDividers(blocks);
  return { blocks, plan, style, headings };
}

// Insert a synthetic divider before each heading_1/heading_2 that isn't the first block and isn't already
// preceded by a divider. Synthetic dividers carry no source index (_synthetic) so they never enter the
// reconciliation plan or the completeness census.
function withSectionDividers(blocks) {
  const out = [];
  for (const b of blocks) {
    const isSectionHead = b.type === 'heading_1' || b.type === 'heading_2';
    if (isSectionHead && out.length && out[out.length - 1].type !== 'divider') {
      out.push({ type: 'divider', _synthetic: true });
    }
    out.push(b);
  }
  return out;
}

// ---------------------------------------------------------------------------
// NFM rendering
// ---------------------------------------------------------------------------

const NFM_ESC = /[\\*~`$\[\]<>{}|^]/g;
const esc = (t) => (t || '').replace(NFM_ESC, (c) => '\\' + c);

function renderInline(rich) {
  return (rich || []).map((r) => {
    if (r.annotations && r.annotations.code) {
      // code spans are literal; multi-line → <br>
      return '`' + String(r.content).replace(/\n/g, '<br>') + '`';
    }
    let t = esc(r.content);
    const a = r.annotations || {};
    if (a.strikethrough) t = `~~${t}~~`;
    if (a.italic) t = `*${t}*`;
    if (a.bold) t = `**${t}**`;
    if (a.color && a.color !== 'default') t = `<span color="${nfmColor(a.color)}">${t}</span>`;
    if (r.link) t = `[${t}](${r.link})`;
    return t;
  }).join('');
}

const TAB = '\t';
function indent(s, depth) { return s.split('\n').map((l) => (l ? TAB.repeat(depth) + l : l)).join('\n'); }

function renderBlock(b, depth) {
  switch (b.type) {
    case 'heading_1': case 'heading_2': case 'heading_3': {
      const hashes = '#'.repeat(Number(b.type.slice(-1)));
      let line = `${hashes} ${renderInline(b.rich)}`;
      if (b.is_toggleable) line += ' {toggle="true"}';
      const lines = [line];
      if (b.children && b.children.length) for (const c of b.children) lines.push(indent(renderBlock(c, 0), 1));
      return lines.join('\n');
    }
    case 'paragraph': { const t = renderInline(b.rich); return t || '<empty-block/>'; }
    case 'bulleted_list_item':
    case 'numbered_list_item':
    case 'to_do': {
      const marker = b.type === 'numbered_list_item' ? '1.' : b.type === 'to_do' ? (b.checked ? '- [x]' : '- [ ]') : '-';
      const lines = [`${marker} ${renderInline(b.rich) || ' '}`];
      if (b.children && b.children.length) for (const c of b.children) lines.push(indent(renderBlock(c, 0), 1));
      return lines.join('\n');
    }
    case 'quote': return `> ${(renderInline(b.rich) || ' ').replace(/\n/g, '<br>')}`;
    case 'callout': {
      const icon = b.icon ? ` icon="${b.icon}"` : '';
      const color = b.color && b.color !== 'default' ? ` color="${nfmColor(b.color)}"` : '';
      return `<callout${icon}${color}>\n${TAB}${renderInline(b.rich)}\n</callout>`;
    }
    case 'code': return '```' + (b.language === 'plain text' ? '' : b.language) + '\n' + (b.code || '') + '\n```';
    case 'divider': return '---';
    case 'equation': return '$$\n' + (b.expr || '') + '\n$$';
    case 'bookmark': return `[${b.url}](${b.url})`;
    case 'image': {
      if (b.external && b.src) return `![${esc(b.alt)}](${b.src})`;
      // Single canonical local-image stub (reference/notion-blocks.md §5) — map-to-notion is the ONE owner of
      // this callout in the document; Phase 2 fills it (copies the file), it never injects a second. Shape comes
      // from upload-image.stubCalloutNfm so it matches buildStub byte-for-byte. Tab-indented body, no inline <br>.
      const base = (b.src || '').split('/').pop() || b.alt || 'image';
      const caption = b.alt || base;
      const lines = [`🖼 ${esc(base)} · Caption: ${esc(caption)}`];
      if (b.assetRelPath) lines.push(b.assetRelPath);
      lines.push('Drag this file into an image block to fill.');
      return stubCalloutNfm('🖼', lines);
    }
    case 'table': return renderTable(b);
    // TOC: native = Notion's auto-updating block; replicate = the source list as plain bullets; omit = drop.
    case 'toc_native': return '<table_of_contents/>';
    case 'toc_replicate': return (b.items || []).map((it) => `- ${renderInline(it) || ' '}`).join('\n');
    case 'toc_omit': return '';
    // One canonical stub callout per ambiguous-media node too (single owner), with a fillable caption slot.
    // Same rule as the image stub: tab-indented body lines, no inline <br> after the opening tag.
    case 'ambiguous': return stubCalloutNfm('❓', [`❓ Unresolved ${esc(b.kind || 'media')} · Caption:`, 'See the conversion report for the original source.']);
    default: return renderInline(b.rich || []) || '<empty-block/>';
  }
}

function renderTable(b) {
  const attrs = [`header-row="${b.has_column_header ? 'true' : 'false'}"`, 'fit-page-width="true"'];
  const lines = [`<table ${attrs.join(' ')}>`];
  for (const row of b.rows) {
    lines.push(`${TAB}<tr>`);
    for (const cell of row.cells) lines.push(`${TAB}${TAB}<td>${renderInline(cell)}</td>`);
    lines.push(`${TAB}</tr>`);
  }
  lines.push('</table>');
  return lines.join('\n');
}

export function renderNfm(blocks) {
  // Drop empties (e.g. toc_omit) so they don't leave a stray blank paragraph between real blocks.
  return blocks.map((b) => renderBlock(b, 0)).filter((s) => s !== '' && s != null).join('\n\n');
}

export function mapToNotion(tree, opts = {}) {
  const model = buildModel(tree, opts);
  return { blocks: model.blocks, nfm: renderNfm(model.blocks), plan: model.plan, style: model.style, headings: model.headings };
}

// ---------------------------------------------------------------------------
// Selftest
// ---------------------------------------------------------------------------

function selftest() {
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };

  // ragged table padded to rectangular
  const ragged = { blocks: [{ type: 'table', si: 0, header: true, rows: [[[{ t: 'A' }], [{ t: 'B' }], [{ t: 'C' }]], [[{ t: '1' }]], [[{ t: 'x' }], [{ t: 'y' }], [{ t: 'z' }], [{ t: 'EXTRA' }]]] }] };
  const rm = buildModel(ragged.blocks, {});
  const t = rm.blocks[0];
  ok(t.table_width === 3, 'table_width = max col count (3)');
  ok(t.rows.every((r) => r.cells.length === 3), 'every row padded/truncated to table_width');
  ok(t.rows[1].cells[1].length === 0 && t.rows[1].cells[2].length === 0, 'short row padded with empty cells');
  ok(t.rows[2].cells.length === 3, 'over-long row truncated to width');

  // unknown language → plain text; known passes
  ok(validateLang('r←nonsense') === 'plain text', 'unknown lang → plain text');
  ok(validateLang('js') === 'javascript', 'lang alias js → javascript');
  ok(validateLang('python') === 'python', 'known lang kept');

  // invalid color rejected; valid + NFM _bg alias accepted
  let threw = false; try { validateColor('chartreuse'); } catch { threw = true; }
  ok(threw, 'invalid color rejected');
  ok(validateColor('green_bg') === 'green_background', 'NFM _bg color alias normalized');

  // minimal vs expressive: admonition quote
  const adm = [{ type: 'quote', si: 0, rich: [{ t: 'be careful' }], admonition: 'warn' }];
  const mini = mapToNotion(adm, { style: 'minimal' });
  const expr = mapToNotion(adm, { style: 'expressive' });
  ok(mini.blocks[0].type === 'quote' && !/callout|⚠|color=/.test(mini.nfm), 'minimal: quote, no callout/emoji/color');
  ok(expr.blocks[0].type === 'callout' && /<callout/.test(expr.nfm) && /⚠️/.test(expr.nfm) && /color="yellow_bg"/.test(expr.nfm), 'expressive: callout + emoji + bg color');

  // toggle vs normal headings differ only by is_toggleable + children nesting
  const doc = [{ type: 'heading', si: 0, level: 1, rich: [{ t: 'H' }] }, { type: 'paragraph', si: 1, rich: [{ t: 'body' }] }];
  const norm = mapToNotion(doc, { headings: 'normal' });
  const tog = mapToNotion(doc, { headings: 'toggle' });
  ok(norm.blocks[0].is_toggleable === false && norm.blocks.length === 2, 'normal: flat, not toggleable');
  ok(tog.blocks[0].is_toggleable === true && tog.blocks.length === 1 && tog.blocks[0].children.length === 1, 'toggle: is_toggleable + body nested as child');
  ok(/\{toggle="true"\}/.test(tog.nfm) && /\n\tbody/.test(tog.nfm), 'toggle NFM: {toggle} + tab-indented child');
  ok(norm.blocks[0].rich[0].content === tog.blocks[0].rich[0].content, 'toggle/normal share heading rich text');

  // inline marks → NFM
  const para = [{ type: 'paragraph', si: 0, rich: [{ t: 'a' }, { t: 'bold', b: true }, { t: 'code', code: true }, { t: 'link', link: 'https://x' }] }];
  const pm = mapToNotion(para, {});
  ok(/\*\*bold\*\*/.test(pm.nfm) && /`code`/.test(pm.nfm) && /\[link\]\(https:\/\/x\)/.test(pm.nfm), 'inline marks render to NFM');

  // table NFM has correct <td> count per row
  const tnfm = mapToNotion([{ type: 'table', si: 0, header: true, rows: [[[{ t: 'A' }], [{ t: 'B' }]], [[{ t: '1' }]]] }], {});
  const trs = tnfm.nfm.split('<tr>').slice(1);
  ok(trs.every((r) => (r.match(/<td>/g) || []).length === 2), 'NFM table: every <tr> has table_width <td>');
  ok(/header-row="true"/.test(tnfm.nfm) && /fit-page-width="true"/.test(tnfm.nfm), 'NFM table attrs');

  // plan: one entry per source block; ambiguous → ambiguous-pending
  const amb = mapToNotion([{ type: 'ambiguous', si: 0, kind: 'svg', raw: '<svg/>' }, { type: 'paragraph', si: 1, rich: [{ t: 'x' }] }], {});
  ok(amb.plan.length === 2 && amb.plan[0].disposition === 'ambiguous-pending' && amb.plan[1].disposition === 'mapped', 'plan dispositions');

  // code block NFM literal (no escaping inside)
  const code = mapToNotion([{ type: 'code', si: 0, language: 'python', code: 'a = [1, 2]' }], {});
  ok(/```python\na = \[1, 2\]\n```/.test(code.nfm), 'code NFM literal, language preserved');

  // Single canonical stub callout per image / ambiguous node (one positional owner — never a dual-write pair).
  // Tab-indented body, never an inline <br> after the opening tag (NFM parser rejects it → literal text, §1).
  const imgStub = mapToNotion([{ type: 'image', si: 0, src: 'diagram.png', alt: 'flow', external: false }], { slug: 'pov-v6' });
  ok((imgStub.nfm.match(/<callout/g) || []).length === 1, 'image node → exactly one stub callout (no dual-write pair)');
  ok(/<callout icon="🖼">\n\t🖼 diagram\.png · Caption: flow\n/.test(imgStub.nfm), 'image stub: caption-inline, tab-indented');
  ok(/\.\/to-notion-doc-assets\/pov-v6\/diagram\.png/.test(imgStub.nfm) && /Drag this file/.test(imgStub.nfm), 'image stub names the copied path + drag hint');
  ok(!/<callout[^>]*><br>/.test(imgStub.nfm), 'image stub callout: no inline <br> after opening tag');
  const ambCallout = mapToNotion([{ type: 'ambiguous', si: 0, kind: 'svg', raw: '<svg/>' }], {});
  const ambNfm = renderNfm(ambCallout.blocks);
  ok((ambNfm.match(/<callout/g) || []).length === 1 && /<callout icon="❓">\n\t❓ Unresolved svg · Caption:\n/.test(ambNfm), 'ambiguous node → one stub callout, caption slot, tab-indented');
  ok(!/<callout[^>]*><br>/.test(ambNfm), 'ambiguous callout: no inline <br> after opening tag');
  // image + svg together → exactly two callouts total (one each), never four (single-owner, no dual-write)
  const both = mapToNotion([{ type: 'image', si: 0, src: 'a.png', alt: 'A', external: false }, { type: 'ambiguous', si: 1, kind: 'svg', raw: '<svg/>' }], { slug: 'doc' });
  ok((both.nfm.match(/<callout/g) || []).length === 2, 'image + svg → exactly two callouts total (one per node)');
  // a parse-doc 2-col table-candidate (dl / label-div detection) flows through the §3 table path unchanged
  const cand = mapToNotion([{ type: 'table', si: 0, header: true, detectedAs: 'table-candidate', rows: [[[{ t: 'Attribute' }], [{ t: 'Description' }]], [[{ t: 'Name' }], [{ t: 'Acme' }]]] }], {});
  ok(cand.blocks[0].type === 'table' && cand.blocks[0].table_width === 2 && /header-row="true"/.test(cand.nfm), 'detected table-candidate maps via §3 table path (width 2, header row)');

  // TOC modes: native → <table_of_contents/>; replicate → bullets; omit → dropped (user-skipped, no output)
  const tocDoc = [{ type: 'toc', si: 0, items: [[{ t: 'Intro' }], [{ t: 'Body' }]] }, { type: 'paragraph', si: 1, rich: [{ t: 'x' }] }];
  const tocNative = mapToNotion(tocDoc, { tocMode: 'native' });
  ok(tocNative.blocks[0].type === 'toc_native' && /<table_of_contents\/>/.test(tocNative.nfm), 'toc native → <table_of_contents/>');
  ok(tocNative.plan[0].disposition === 'mapped' && tocNative.plan[0].notionType === 'table_of_contents', 'toc native plan: mapped');
  const tocRep = mapToNotion(tocDoc, { tocMode: 'replicate' });
  ok(tocRep.blocks[0].type === 'toc_replicate' && /- Intro\n- Body/.test(tocRep.nfm), 'toc replicate → bullet list of entries');
  const tocOmit = mapToNotion(tocDoc, { tocMode: 'omit' });
  ok(tocOmit.blocks[0].type === 'toc_omit' && !/Intro|table_of_contents/.test(tocOmit.nfm), 'toc omit → dropped from NFM');
  ok(tocOmit.plan[0].disposition === 'user-skipped', 'toc omit plan: user-skipped (terminal)');

  // section dividers: inserted before each section heading except the first; only in normal heading mode
  const secDoc = [
    { type: 'heading', si: 0, level: 1, rich: [{ t: 'One' }] },
    { type: 'paragraph', si: 1, rich: [{ t: 'a' }] },
    { type: 'heading', si: 2, level: 2, rich: [{ t: 'Two' }] },
    { type: 'paragraph', si: 3, rich: [{ t: 'b' }] },
  ];
  const withDiv = mapToNotion(secDoc, { sectionDividers: true });
  const dividerCount = withDiv.blocks.filter((b) => b.type === 'divider').length;
  ok(dividerCount === 1, 'section dividers: one divider inserted (before 2nd heading, not the first)');
  ok(withDiv.blocks[2].type === 'divider' && withDiv.blocks[3].type === 'heading_2', 'section divider sits before the section heading');
  ok(withDiv.plan.length === 4, 'synthetic dividers stay out of the reconciliation plan');
  const noDiv = mapToNotion(secDoc, { sectionDividers: false });
  ok(noDiv.blocks.filter((b) => b.type === 'divider').length === 0, 'section dividers off by default');
  const togDiv = mapToNotion(secDoc, { sectionDividers: true, headings: 'toggle' });
  ok(togDiv.blocks.filter((b) => b.type === 'divider').length === 0, 'section dividers suppressed in toggle mode');

  // fit-page-width is emitted on EVERY table (full-width is the default, not per-table opt-in)
  const multiTable = mapToNotion([
    { type: 'table', si: 0, header: true, rows: [[[{ t: 'A' }], [{ t: 'B' }]], [[{ t: '1' }], [{ t: '2' }]]] },
    { type: 'paragraph', si: 1, rich: [{ t: 'gap' }] },
    { type: 'table', si: 2, header: false, rows: [[[{ t: 'C' }]], [[{ t: '3' }]]] },
  ], {});
  const fitCount = (multiTable.nfm.match(/fit-page-width="true"/g) || []).length;
  const tableCount = (multiTable.nfm.match(/<table /g) || []).length;
  ok(tableCount === 2 && fitCount === 2, 'fit-page-width="true" on every table (full-width universal)');

  console.log(`map-to-notion selftest: ${pass} passed, ${fail} failed`);
  return fail === 0;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) process.exit(selftest() ? 0 : 1);
  let style = 'minimal', headings = 'normal', tocMode = 'native', sectionDividers = false, slug = ''; const files = [];
  for (let k = 0; k < args.length; k++) {
    if (args[k] === '--style') style = args[++k];
    else if (args[k] === '--headings') headings = args[++k];
    else if (args[k] === '--toc') tocMode = args[++k];
    else if (args[k] === '--slug') slug = args[++k];
    else if (args[k] === '--dividers') sectionDividers = true;
    else if (args[k] === '--no-dividers') sectionDividers = false;
    else files.push(args[k]);
  }
  if (!files.length) { console.error('usage: map-to-notion.mjs [--style ..] [--headings ..] [--toc native|replicate|omit] [--slug <doc-slug>] [--dividers|--no-dividers] <parse-doc.json|source-file> | --selftest'); process.exit(64); }
  const raw = fs.readFileSync(files[0], 'utf8');
  let tree;
  try { const j = JSON.parse(raw); tree = j.blocks || j; } catch { tree = parseDoc(raw, formatFromPath(files[0])).blocks; }
  const out = mapToNotion(tree, { style, headings, tocMode, sectionDividers, slug });
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}
