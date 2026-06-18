'use strict';

// html-parser.js — vendored, zero-dependency tolerant HTML parser.
// Tokenize -> lightweight node tree. Pure string processing, no requires,
// no DOM, no fs/network. Never throws on malformed input; always returns a tree.
//
// Node shapes:
//   Element: { type: 'element', tag: <lowercased string>, attrs: { [name]: value }, children: Node[] }
//   Text:    { type: 'text', value: string }

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

// Elements whose content is raw text (no nested tag parsing).
const RAW_TEXT_ELEMENTS = new Set(['script', 'style']);

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
};

// Decode the common HTML entities (named + numeric) — best-effort.
function decodeEntities(str) {
  if (str.indexOf('&') === -1) return str;
  return str.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body) => {
    if (body[0] === '#') {
      let code;
      if (body[1] === 'x' || body[1] === 'X') {
        code = parseInt(body.slice(2), 16);
      } else {
        code = parseInt(body.slice(1), 10);
      }
      if (Number.isNaN(code) || code < 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch (e) {
        return match;
      }
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named !== undefined ? named : match;
  });
}

// Parse the attribute portion of a start tag into { [name]: value }.
function parseAttrs(src) {
  const attrs = {};
  const re = /([^\s/=>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1].toLowerCase();
    if (!name) break;
    let value;
    if (m[2] !== undefined) value = m[2];
    else if (m[3] !== undefined) value = m[3];
    else if (m[4] !== undefined) value = m[4];
    else value = '';
    attrs[name] = decodeEntities(value);
  }
  return attrs;
}

function parse(html) {
  const root = { children: [] };
  const stack = [root];
  const input = typeof html === 'string' ? html : String(html == null ? '' : html);
  const len = input.length;
  let i = 0;

  function top() {
    return stack[stack.length - 1];
  }

  function pushText(value) {
    if (value === '') return;
    top().children.push({ type: 'text', value: decodeEntities(value) });
  }

  while (i < len) {
    const lt = input.indexOf('<', i);

    if (lt === -1) {
      pushText(input.slice(i));
      break;
    }

    if (lt > i) {
      pushText(input.slice(i, lt));
    }

    // Comment.
    if (input.startsWith('<!--', lt)) {
      const end = input.indexOf('-->', lt + 4);
      i = end === -1 ? len : end + 3;
      continue;
    }

    // Doctype / declaration.
    if (input.startsWith('<!', lt)) {
      const end = input.indexOf('>', lt + 2);
      i = end === -1 ? len : end + 1;
      continue;
    }

    // Processing instruction.
    if (input.startsWith('<?', lt)) {
      const end = input.indexOf('>', lt + 2);
      i = end === -1 ? len : end + 1;
      continue;
    }

    // Close tag.
    if (input[lt + 1] === '/') {
      const end = input.indexOf('>', lt + 2);
      const raw = input.slice(lt + 2, end === -1 ? len : end);
      const tag = raw.trim().toLowerCase().split(/\s/)[0];
      i = end === -1 ? len : end + 1;
      if (!tag) continue;
      // Find matching open element on the stack; tolerant of mismatches.
      let found = -1;
      for (let s = stack.length - 1; s >= 1; s -= 1) {
        if (stack[s].tag === tag) {
          found = s;
          break;
        }
      }
      if (found !== -1) {
        stack.length = found; // auto-close any intervening unclosed elements
      }
      // No matching open -> ignore.
      continue;
    }

    // Start tag (must begin with a letter).
    if (/[a-zA-Z]/.test(input[lt + 1])) {
      const end = input.indexOf('>', lt + 1);
      if (end === -1) {
        // Unterminated tag -> treat rest as text.
        pushText(input.slice(lt));
        break;
      }
      let inner = input.slice(lt + 1, end);
      let selfClosing = false;
      if (inner.endsWith('/')) {
        selfClosing = true;
        inner = inner.slice(0, -1);
      }
      const spaceIdx = inner.search(/\s/);
      const tag = (spaceIdx === -1 ? inner : inner.slice(0, spaceIdx)).toLowerCase();
      const attrSrc = spaceIdx === -1 ? '' : inner.slice(spaceIdx + 1);
      const attrs = parseAttrs(attrSrc);
      i = end + 1;

      if (!tag) {
        continue;
      }

      const node = { type: 'element', tag, attrs, children: [] };
      top().children.push(node);

      if (VOID_ELEMENTS.has(tag) || selfClosing) {
        continue; // never push, never has children
      }

      if (RAW_TEXT_ELEMENTS.has(tag)) {
        // Capture raw content until matching close tag (case-insensitive).
        const closeRe = new RegExp('</' + tag + '\\s*>', 'i');
        const rest = input.slice(i);
        const cm = closeRe.exec(rest);
        if (cm) {
          const rawContent = rest.slice(0, cm.index);
          if (rawContent !== '') node.children.push({ type: 'text', value: rawContent });
          i += cm.index + cm[0].length;
        } else {
          const rawContent = rest;
          if (rawContent !== '') node.children.push({ type: 'text', value: rawContent });
          i = len;
        }
        continue;
      }

      stack.push(node);
      continue;
    }

    // A '<' that is not part of a recognizable tag -> literal text.
    pushText('<');
    i = lt + 1;
  }

  // Unclosed elements at EOF are auto-closed simply by returning root children.
  return root.children;
}

module.exports = { parse };
