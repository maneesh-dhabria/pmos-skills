'use strict';
// json-yaml.js — JSON ↔ YAML descriptors (pure, text↔text).
// Registers WITHOUT any edit to server.js or the UI (proves Inv-1).

const path = require('node:path');
const yaml = require(path.join(__dirname, '..', 'yaml.js'));

module.exports = function register(registry) {
  registry.register({
    id: 'json→yaml',
    from: 'json',
    to: 'yaml',
    label: 'JSON → YAML',
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
      return yaml.stringify(value);
    },
  });

  registry.register({
    id: 'yaml→json',
    from: 'yaml',
    to: 'json',
    label: 'YAML → JSON',
    kind: 'pure',
    requires: [],
    inputMode: 'text',
    outputMode: 'text',
    convert(input) {
      const text = Buffer.isBuffer(input) ? input.toString('utf8') : String(input);
      let value;
      try {
        value = yaml.parse(text);
      } catch (e) {
        throw new Error(`input is not valid YAML: ${e.message}`);
      }
      return JSON.stringify(value, null, 2);
    },
  });
};
