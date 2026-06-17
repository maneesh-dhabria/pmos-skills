// yaml.js — vendored, zero-dependency YAML (pragmatic subset) for the /converter skill.
//
// Node built-ins only; no npm deps; pure functions (no fs/net/DOM/global state).
//
// SUPPORTED SUBSET (the "D9 subset"):
//   - block mappings:           key: value   (nested by 2-space-ish indentation)
//   - block sequences:          - item       (including sequences of maps)
//   - scalars:
//       * null   via `null`, `~`, or an empty value
//       * bool   via `true` / `false`  (only these — `yes/no/on/off` stay STRINGS)
//       * number int / float  (e.g. 42, -3, 3.14, 1e3)
//       * string everything else
//   - flow style:               [a, b, c]  and  {k: v, k2: v2}   (recursive)
//   - quoted scalars:
//       * single  '...'   ('' -> a literal single quote)
//       * double  "..."   (escapes: \n \t \" \\ , plus \r \0 \/ )
//   - comments: a `#` that starts a line, or a `#` preceded by whitespace after a
//     value, begins a comment and is ignored. `#` inside quotes / inside a flow
//     scalar is literal.
//   - block scalars `|` and `>`: OUT OF SCOPE (not implemented).
//
// OUT OF SCOPE (intentionally unsupported):
//   - anchors & aliases (&a, *a), merge keys (<<)
//   - explicit tags (!!str, !Foo)
//   - multi-document streams (--- / ... separators)
//   - complex / explicit keys (`? key`)
//   - block scalars (| literal, > folded)
//   - YAML 1.1 sexagesimal / base-60, special floats (.inf/.nan), date types
//
// CONTRACT: parse(stringify(x)) deepEquals x for the supported subset.

'use strict';

/* ============================ parse ============================ */

function parse(yamlText) {
  if (yamlText == null) return null;
  const rawLines = String(yamlText).split(/\r?\n/);

  // Build a list of significant lines with their indentation. Comment-only and
  // blank lines are dropped. Comments are stripped from content lines (respecting
  // quotes), so downstream parsing never sees them.
  const lines = [];
  for (const raw of rawLines) {
    const stripped = stripComment(raw);
    if (stripped.trim() === '') continue;
    const indent = stripped.length - stripped.replace(/^ +/, '').length;
    lines.push({ indent, content: stripped.trim(), raw: stripped });
  }

  if (lines.length === 0) return null;

  const [value] = parseBlock(lines, 0, lines[0].indent);
  return value;
}

// Parse a block (mapping or sequence) at indentation `minIndent`, starting at
// line index `i`. Returns [value, nextIndex].
function parseBlock(lines, i, minIndent) {
  // Determine block kind from the first line at this indent.
  const first = lines[i];
  const isSeq = first.content.startsWith('- ') || first.content === '-';

  if (isSeq) return parseSequence(lines, i, minIndent);
  return parseMapping(lines, i, minIndent);
}

function parseSequence(lines, i, indent) {
  const arr = [];
  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < indent) break;
    if (line.indent > indent) {
      // Shouldn't happen for a well-formed seq; treat as nested under prior item.
      break;
    }
    if (!(line.content === '-' || line.content.startsWith('- '))) break;

    const afterDash = line.content === '-' ? '' : line.content.slice(2).trim();

    if (afterDash === '') {
      // Value is a nested block on following deeper lines.
      if (i + 1 < lines.length && lines[i + 1].indent > indent) {
        const [val, next] = parseBlock(lines, i + 1, lines[i + 1].indent);
        arr.push(val);
        i = next;
      } else {
        arr.push(null);
        i += 1;
      }
      continue;
    }

    // Does the dash content start a mapping (key: ...)?  e.g. "- name: a"
    const kv = splitKeyValue(afterDash);
    if (kv) {
      // Inline map item. The dash + first key share a line; subsequent keys of the
      // same map are indented to align past the "- " (indent + 2).
      const itemIndent = indent + 2;
      // Re-synthesize a virtual mapping block: the first key lives on this line,
      // remaining keys (if any) on following lines at itemIndent.
      const mapLines = [{ indent: itemIndent, content: afterDash }];
      let j = i + 1;
      while (j < lines.length && lines[j].indent >= itemIndent &&
             !(lines[j].indent === indent &&
               (lines[j].content === '-' || lines[j].content.startsWith('- ')))) {
        if (lines[j].indent < itemIndent) break;
        mapLines.push(lines[j]);
        j += 1;
      }
      const [val] = parseMapping(mapLines, 0, itemIndent);
      arr.push(val);
      i = j;
      continue;
    }

    // Plain scalar / flow item after the dash.
    arr.push(parseScalar(afterDash));
    i += 1;
  }
  return [arr, i];
}

function parseMapping(lines, i, indent) {
  const obj = {};
  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < indent) break;
    if (line.indent > indent) break; // stray deeper line; owned by a child parse

    const kv = splitKeyValue(line.content);
    if (!kv) break; // not a mapping line at this level

    const { key, value } = kv;
    if (value === '') {
      // Nested block or null. A child block is either indented deeper (mappings,
      // and most sequences) OR a sequence at the SAME indent as the key — the
      // common YAML style where `- item` lines sit flush under their key.
      const next = lines[i + 1];
      const sameIndentSeq = next && next.indent === indent &&
        (next.content === '-' || next.content.startsWith('- '));
      if (next && next.indent > indent) {
        const [val, nextIdx] = parseBlock(lines, i + 1, next.indent);
        obj[key] = val;
        i = nextIdx;
      } else if (sameIndentSeq) {
        const [val, nextIdx] = parseSequence(lines, i + 1, indent);
        obj[key] = val;
        i = nextIdx;
      } else {
        obj[key] = null;
        i += 1;
      }
    } else {
      obj[key] = parseScalar(value);
      i += 1;
    }
  }
  return [obj, i];
}

// Split "key: value" honoring quotes and flow brackets. Returns {key,value} or
// null if there's no top-level ": " / trailing ":".
function splitKeyValue(s) {
  let depth = 0;
  let q = null; // active quote char
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (q) {
      if (c === q) {
        if (q === "'" && s[k + 1] === "'") { k++; continue; }
        q = null;
      }
      continue;
    }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '[' || c === '{') { depth++; continue; }
    if (c === ']' || c === '}') { depth--; continue; }
    if (depth === 0 && c === ':') {
      const after = s[k + 1];
      if (after === undefined || after === ' ' || after === '\t') {
        const key = unquoteScalarKey(s.slice(0, k).trim());
        const value = s.slice(k + 1).trim();
        return { key, value };
      }
    }
  }
  return null;
}

// Keys: support quoted keys; otherwise bare string (not coerced to number/bool —
// object keys are always strings in JS anyway).
function unquoteScalarKey(s) {
  if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') {
    return parseDoubleQuoted(s);
  }
  if (s.length >= 2 && s[0] === "'" && s[s.length - 1] === "'") {
    return parseSingleQuoted(s);
  }
  return s;
}

// Strip a trailing/whole-line comment from `raw`, honoring quotes. A `#` is a
// comment iff it starts the (trimmed) line or is preceded by whitespace.
function stripComment(raw) {
  let q = null;
  for (let k = 0; k < raw.length; k++) {
    const c = raw[k];
    if (q) {
      if (c === q) {
        if (q === "'" && raw[k + 1] === "'") { k++; continue; }
        q = null;
      }
      continue;
    }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '#') {
      const prev = raw[k - 1];
      if (k === 0 || prev === ' ' || prev === '\t') {
        return raw.slice(0, k).replace(/\s+$/, '');
      }
    }
  }
  return raw;
}

// Parse a scalar token (possibly a flow collection or quoted string).
function parseScalar(s) {
  s = s.trim();
  if (s === '') return null;
  if (s[0] === '[' || s[0] === '{') return parseFlow(s).value;
  if (s[0] === '"' && s[s.length - 1] === '"') return parseDoubleQuoted(s);
  if (s[0] === "'" && s[s.length - 1] === "'") return parseSingleQuoted(s);
  return parsePlainScalar(s);
}

function parsePlainScalar(s) {
  if (s === 'null' || s === '~' || s === 'Null' || s === 'NULL') return null;
  if (s === 'true' || s === 'True' || s === 'TRUE') return true;
  if (s === 'false' || s === 'False' || s === 'FALSE') return false;
  if (isNumber(s)) return Number(s);
  return s;
}

function isNumber(s) {
  // Integers and floats (incl. exponent). No leading-plus weirdness beyond JS.
  return /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s) && s !== '' &&
    !/^[-+.eE]+$/.test(s);
}

function parseDoubleQuoted(s) {
  const body = s.slice(1, -1);
  let out = '';
  for (let k = 0; k < body.length; k++) {
    const c = body[k];
    if (c === '\\') {
      const n = body[++k];
      switch (n) {
        case 'n': out += '\n'; break;
        case 't': out += '\t'; break;
        case 'r': out += '\r'; break;
        case '"': out += '"'; break;
        case '\\': out += '\\'; break;
        case '/': out += '/'; break;
        case '0': out += '\0'; break;
        default: out += n === undefined ? '\\' : n; break;
      }
    } else {
      out += c;
    }
  }
  return out;
}

function parseSingleQuoted(s) {
  const body = s.slice(1, -1);
  return body.replace(/''/g, "'");
}

/* ----- flow style: [..] and {..} ----- */

function parseFlow(s) {
  s = s.trim();
  if (s[0] === '[') return parseFlowSeq(s);
  if (s[0] === '{') return parseFlowMap(s);
  // bare scalar inside flow context
  return { value: parseFlowScalar(s), rest: '' };
}

// Tokenize the inside of a flow collection at the top level (respecting nesting
// and quotes), splitting on commas.
function splitFlowItems(inner) {
  const items = [];
  let depth = 0, q = null, start = 0;
  for (let k = 0; k < inner.length; k++) {
    const c = inner[k];
    if (q) {
      if (c === q) {
        if (q === "'" && inner[k + 1] === "'") { k++; continue; }
        q = null;
      }
      continue;
    }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '[' || c === '{') { depth++; continue; }
    if (c === ']' || c === '}') { depth--; continue; }
    if (c === ',' && depth === 0) {
      items.push(inner.slice(start, k));
      start = k + 1;
    }
  }
  const tail = inner.slice(start);
  if (tail.trim() !== '' || items.length > 0) items.push(tail);
  return items.map((x) => x.trim()).filter((x, idx, a) => !(x === '' && a.length === 1 && idx === 0));
}

function parseFlowSeq(s) {
  const inner = s.slice(1, s.lastIndexOf(']')).trim();
  if (inner === '') return { value: [], rest: '' };
  const parts = splitFlowItems(inner);
  return { value: parts.map(parseFlowScalar), rest: '' };
}

function parseFlowMap(s) {
  const inner = s.slice(1, s.lastIndexOf('}')).trim();
  const obj = {};
  if (inner === '') return { value: obj, rest: '' };
  const parts = splitFlowItems(inner);
  for (const p of parts) {
    if (p === '') continue;
    const kv = splitFlowKeyValue(p);
    if (kv) obj[kv.key] = parseFlowScalar(kv.value);
  }
  return { value: obj, rest: '' };
}

function splitFlowKeyValue(s) {
  let depth = 0, q = null;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (q) {
      if (c === q) { if (q === "'" && s[k + 1] === "'") { k++; continue; } q = null; }
      continue;
    }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '[' || c === '{') { depth++; continue; }
    if (c === ']' || c === '}') { depth--; continue; }
    if (depth === 0 && c === ':') {
      return { key: unquoteScalarKey(s.slice(0, k).trim()), value: s.slice(k + 1).trim() };
    }
  }
  return null;
}

function parseFlowScalar(s) {
  s = s.trim();
  if (s === '') return null;
  if (s[0] === '[' || s[0] === '{') return parseFlow(s).value;
  if (s[0] === '"' && s[s.length - 1] === '"') return parseDoubleQuoted(s);
  if (s[0] === "'" && s[s.length - 1] === "'") return parseSingleQuoted(s);
  return parsePlainScalar(s);
}

/* ============================ stringify ============================ */

function stringify(value) {
  if (value === undefined) return 'null\n';
  const out = emit(value, 0);
  return out.endsWith('\n') ? out : out + '\n';
}

function emit(value, indent) {
  if (Array.isArray(value)) return emitArray(value, indent);
  if (value !== null && typeof value === 'object') return emitObject(value, indent);
  // top-level scalar
  return pad(indent) + scalarToYaml(value) + '\n';
}

function emitObject(obj, indent) {
  const keys = Object.keys(obj);
  if (keys.length === 0) return pad(indent) + '{}\n';
  let out = '';
  for (const key of keys) {
    const v = obj[key];
    const k = formatKey(key);
    if (Array.isArray(v)) {
      if (v.length === 0) {
        out += `${pad(indent)}${k}: []\n`;
      } else {
        out += `${pad(indent)}${k}:\n`;
        out += emitArray(v, indent); // sequences sit at SAME indent as the key
      }
    } else if (v !== null && typeof v === 'object') {
      if (Object.keys(v).length === 0) {
        out += `${pad(indent)}${k}: {}\n`;
      } else {
        out += `${pad(indent)}${k}:\n`;
        out += emitObject(v, indent + 1);
      }
    } else {
      out += `${pad(indent)}${k}: ${scalarToYaml(v)}\n`;
    }
  }
  return out;
}

function emitArray(arr, indent) {
  let out = '';
  for (const item of arr) {
    if (Array.isArray(item)) {
      if (item.length === 0) {
        out += `${pad(indent)}- []\n`;
      } else {
        out += `${pad(indent)}-\n`;
        out += emitArray(item, indent + 1);
      }
    } else if (item !== null && typeof item === 'object') {
      const objStr = emitObject(item, indent + 1);
      // Hang the first line off the dash: "- key: val", rest indented.
      const objLines = objStr.replace(/\n$/, '').split('\n');
      const firstContent = objLines[0].slice((indent + 1) * 2); // strip leading indent
      out += `${pad(indent)}- ${firstContent}\n`;
      for (let li = 1; li < objLines.length; li++) {
        out += objLines[li] + '\n';
      }
    } else {
      out += `${pad(indent)}- ${scalarToYaml(item)}\n`;
    }
  }
  return out;
}

function pad(indent) {
  return '  '.repeat(indent);
}

function formatKey(key) {
  // Keys are always strings. Quote when they'd otherwise be ambiguous.
  if (needsQuoting(String(key))) return quoteDouble(String(key));
  return String(key);
}

function scalarToYaml(v) {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return quoteDouble(String(v)); // Infinity/NaN -> string
    return String(v);
  }
  const s = String(v);
  if (s.includes('\n')) return quoteDouble(s);
  if (needsQuoting(s)) return quoteDouble(s);
  return s;
}

const INDICATORS = new Set([
  ':', '#', '-', '?', '&', '*', '!', '|', '>', "'", '"', '%', '@', '`', '[', '{', ',', ']', '}',
]);

function needsQuoting(s) {
  if (s === '') return true;
  // looks like a number / bool / null / tilde
  if (s === 'null' || s === '~' || s === 'true' || s === 'false') return true;
  if (s === 'Null' || s === 'NULL' || s === 'True' || s === 'TRUE' ||
      s === 'False' || s === 'FALSE') return true;
  if (isNumber(s)) return true;
  // leading / trailing whitespace
  if (s !== s.trim()) return true;
  // starts with a special indicator char
  if (INDICATORS.has(s[0])) return true;
  // contains a colon-space, or a space-hash (would be read as comment)
  if (s.includes(': ') || s.endsWith(':')) return true;
  if (s.includes(' #')) return true;
  // newline (handled by caller too, belt-and-suspenders)
  if (s.includes('\n')) return true;
  return false;
}

function quoteDouble(s) {
  const esc = s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r');
  return `"${esc}"`;
}

module.exports = { parse, stringify };
