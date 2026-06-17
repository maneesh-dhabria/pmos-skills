// csv.js — vendored, zero-dependency RFC-4180 CSV parser/serializer.
//
// RFC-4180 features supported:
//   - Header row: first record names the fields; data rows become objects keyed by header.
//   - Double-quoted fields containing the delimiter, CR, LF, or CRLF.
//   - Escaped quotes inside quoted fields ("" -> ").
//   - Unquoted fields taken literally up to the next delimiter / line end.
//   - Tolerates both CRLF and LF line endings; ignores a trailing newline at EOF.
//   - Configurable delimiter (e.g. tab for TSV).
//   - Ragged rows: short rows pad missing keys with '' ; long rows drop extra fields.
//
// Pure functions only: no fs / network / DOM / global state. CSV values are all strings;
// numbers are never coerced (round-trip safe).
//
// API:
//   parse(csvText, { delimiter = ',' } = {}) -> Array<Object>
//   serialize(rows, { delimiter = ',', headers } = {}) -> string  (LF line endings)

'use strict';

/**
 * Tokenize CSV text into an array of records, each an array of string fields.
 * Handles quoting, escaped quotes, and both CRLF/LF newlines.
 */
function tokenize(text, delimiter) {
  const records = [];
  let field = '';
  let record = [];
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  // Tracks whether the current record has seen any content (so a final trailing
  // newline does not emit a spurious empty record).
  let sawAny = false;

  function endField() {
    record.push(field);
    field = '';
    sawAny = true;
  }
  function endRecord() {
    endField();
    records.push(record);
    record = [];
    sawAny = false;
  }

  while (i < n) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      sawAny = true;
      i += 1;
      continue;
    }
    if (ch === delimiter) {
      endField();
      i += 1;
      continue;
    }
    if (ch === '\r') {
      // CRLF or lone CR terminates the record.
      endRecord();
      if (text[i + 1] === '\n') i += 2;
      else i += 1;
      continue;
    }
    if (ch === '\n') {
      endRecord();
      i += 1;
      continue;
    }
    field += ch;
    sawAny = true;
    i += 1;
  }

  // Flush the final record if there is pending content (no trailing newline at EOF).
  if (sawAny || field.length > 0 || record.length > 0) {
    endRecord();
  }

  return records;
}

/**
 * Parse CSV text into an array of row-objects keyed by the header row.
 */
function parse(csvText, opts) {
  const delimiter = (opts && opts.delimiter) || ',';
  if (typeof csvText !== 'string' || csvText.length === 0) return [];

  const records = tokenize(csvText, delimiter);
  if (records.length === 0) return [];

  const header = records[0];
  const rows = [];
  for (let r = 1; r < records.length; r += 1) {
    const fields = records[r];
    const obj = {};
    for (let c = 0; c < header.length; c += 1) {
      obj[header[c]] = c < fields.length ? fields[c] : '';
    }
    rows.push(obj);
  }
  return rows;
}

/**
 * Quote a single field if it contains the delimiter, a quote, CR, or LF.
 */
function quoteField(value, delimiter) {
  const s = value == null ? '' : String(value);
  if (
    s.indexOf(delimiter) !== -1 ||
    s.indexOf('"') !== -1 ||
    s.indexOf('\r') !== -1 ||
    s.indexOf('\n') !== -1
  ) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Serialize an array of row-objects to CSV text (LF line endings).
 */
function serialize(rows, opts) {
  const delimiter = (opts && opts.delimiter) || ',';
  let header = opts && opts.headers;

  const list = Array.isArray(rows) ? rows : [];

  if (!header) {
    // Union of keys, first-seen order preserved.
    const seen = new Set();
    header = [];
    for (const row of list) {
      if (row && typeof row === 'object') {
        for (const k of Object.keys(row)) {
          if (!seen.has(k)) {
            seen.add(k);
            header.push(k);
          }
        }
      }
    }
  }

  const lines = [];
  lines.push(header.map((h) => quoteField(h, delimiter)).join(delimiter));
  for (const row of list) {
    const cells = header.map((h) => {
      const v = row && Object.prototype.hasOwnProperty.call(row, h) ? row[h] : '';
      return quoteField(v, delimiter);
    });
    lines.push(cells.join(delimiter));
  }
  return lines.join('\n');
}

module.exports = { parse, serialize };
