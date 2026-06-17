'use strict';
// csv-json.js — CSV ↔ JSON descriptors (pure, text↔text).
// Registers WITHOUT any edit to server.js or the UI (proves Inv-1).

const path = require('node:path');
const csv = require(path.join(__dirname, '..', 'csv.js'));

module.exports = function register(registry) {
  registry.register({
    id: 'csv→json',
    from: 'csv',
    to: 'json',
    label: 'CSV → JSON',
    kind: 'pure',
    requires: [],
    inputMode: 'text',
    outputMode: 'text',
    convert(input) {
      const text = Buffer.isBuffer(input) ? input.toString('utf8') : String(input);
      const rows = csv.parse(text);
      return JSON.stringify(rows, null, 2);
    },
  });

  registry.register({
    id: 'json→csv',
    from: 'json',
    to: 'csv',
    label: 'JSON → CSV',
    kind: 'pure',
    requires: [],
    inputMode: 'text',
    outputMode: 'text',
    convert(input) {
      const text = Buffer.isBuffer(input) ? input.toString('utf8') : String(input);
      let value;
      try {
        value = JSON.parse(text);
      } catch (e) {
        throw new Error(`input is not valid JSON: ${e.message}`);
      }
      if (!Array.isArray(value)) {
        throw new Error('JSON → CSV expects an array of flat objects (e.g. [{"a":1,"b":2}, …])');
      }
      if (value.length === 0) return '';
      for (const row of value) {
        if (row === null || typeof row !== 'object' || Array.isArray(row)) {
          throw new Error('JSON → CSV expects an array of flat objects; found a non-object row');
        }
      }
      // CSV cells are strings — stringify non-string scalar values predictably.
      const rows = value.map((row) => {
        const out = {};
        for (const [k, v] of Object.entries(row)) {
          if (v === null || v === undefined) out[k] = '';
          else if (typeof v === 'object') out[k] = JSON.stringify(v);
          else out[k] = String(v);
        }
        return out;
      });
      return csv.serialize(rows);
    },
  });
};
