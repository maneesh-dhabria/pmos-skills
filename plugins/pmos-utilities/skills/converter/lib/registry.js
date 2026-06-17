'use strict';
// registry.js — the converter registry: the single extension point (Inv-1).
//
// A conversion is a *descriptor*:
//   {
//     id: 'json-to-yaml',          // unique kebab id
//     from: 'json', to: 'yaml',
//     label: 'JSON → YAML',
//     kind: 'pure' | 'llm',        // pure = deterministic vendored lib; llm = claude subprocess
//     requires: [],                // e.g. ['claude-cli']; the UI badges it
//     inputMode: 'text' | 'binary',
//     outputMode: 'text' | 'binary',
//     convert(input, ctx) -> output | Promise<output>   // input: string|Buffer; ctx: { log, tmpdir }
//   }
//
// Adding a conversion = drop one module under lib/converters/ that calls register(...).
// Neither server.js nor the UI ever hardcodes a conversion — both derive from list()/get().
//
// Node built-ins only (fs, path for discovery). Pure otherwise.

const fs = require('node:fs');
const path = require('node:path');

const VALID_KINDS = new Set(['pure', 'llm']);
const VALID_MODES = new Set(['text', 'binary']);

function createRegistry() {
  const descriptors = new Map();

  function validate(d) {
    if (!d || typeof d !== 'object') throw new Error('descriptor must be an object');
    for (const f of ['id', 'from', 'to', 'label']) {
      if (typeof d[f] !== 'string' || d[f].length === 0) {
        throw new Error(`descriptor.${f} must be a non-empty string (id=${d.id || '<none>'})`);
      }
    }
    if (typeof d.convert !== 'function') {
      throw new Error(`descriptor.convert must be a function (id=${d.id})`);
    }
    const kind = d.kind || 'pure';
    if (!VALID_KINDS.has(kind)) throw new Error(`descriptor.kind '${kind}' invalid (id=${d.id})`);
    const inputMode = d.inputMode || 'text';
    const outputMode = d.outputMode || 'text';
    if (!VALID_MODES.has(inputMode)) throw new Error(`descriptor.inputMode '${inputMode}' invalid (id=${d.id})`);
    if (!VALID_MODES.has(outputMode)) throw new Error(`descriptor.outputMode '${outputMode}' invalid (id=${d.id})`);
    if (d.requires != null && !Array.isArray(d.requires)) {
      throw new Error(`descriptor.requires must be an array (id=${d.id})`);
    }
    return {
      id: d.id,
      from: d.from,
      to: d.to,
      label: d.label,
      kind,
      requires: d.requires ? d.requires.slice() : [],
      inputMode,
      outputMode,
      convert: d.convert,
    };
  }

  function register(descriptor) {
    const d = validate(descriptor);
    if (descriptors.has(d.id)) throw new Error(`duplicate converter id: ${d.id}`);
    descriptors.set(d.id, d);
    return d;
  }

  // discover(dir): require every lib/converters/*.js so each module self-registers.
  // Each converter module exports a function `(registry) => { registry.register(...) }`.
  function discover(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch (e) {
      if (e.code === 'ENOENT') return registryApi; // no converters dir yet
      throw e;
    }
    for (const name of entries.sort()) {
      if (!name.endsWith('.js')) continue;
      const mod = require(path.join(dir, name));
      if (typeof mod === 'function') {
        mod(registryApi);
      } else if (mod && typeof mod.register === 'function') {
        mod.register(registryApi);
      } else {
        throw new Error(`converter module ${name} must export a function(registry) or { register(registry) }`);
      }
    }
    return registryApi;
  }

  // list(): descriptor metadata WITHOUT the convert fn — safe to JSON-serialize for GET /conversions.
  function list() {
    return Array.from(descriptors.values()).map(({ convert, ...meta }) => meta);
  }

  function get(id) {
    return descriptors.get(id);
  }

  function has(id) {
    return descriptors.has(id);
  }

  function clear() {
    descriptors.clear();
  }

  const registryApi = { register, discover, list, get, has, clear };
  return registryApi;
}

// A process-wide default registry, plus the factory for isolated test instances.
module.exports = createRegistry();
module.exports.createRegistry = createRegistry;
