/* comments.js — pmos-toolkit html-authoring substrate.
 * Pure-data helpers for the inline-comments overlay. Loaded two ways:
 *   (a) Browser: <script defer src="comments.js"> → attaches to window.PMOSComments.
 *   (b) Node:    require('.../comments.js')      → module.exports = {...}.
 * Skeleton only (T3) — the panel/marker UI lands at T7.
 * Refs: FR-01, FR-02, FR-10, FR-11, FR-14, FR-16, S3, S4, §10.1.
 */
(function (root) {
  'use strict';

  var SCHEMA_VERSION = 1;
  var NANO_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  var V4_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  /* ---- typed error for corrupted sidecars ---- */
  function SidecarCorruptedError(message, cause) {
    var err = new Error(message || 'Sidecar JSON is corrupted');
    err.name = 'SidecarCorruptedError';
    err.cause = cause || null;
    // Make instanceof work across realms by reparenting the prototype chain.
    if (Object.setPrototypeOf) Object.setPrototypeOf(err, SidecarCorruptedError.prototype);
    return err;
  }
  SidecarCorruptedError.prototype = Object.create(Error.prototype);
  SidecarCorruptedError.prototype.constructor = SidecarCorruptedError;

  /* ---- random bytes — browser + Node ---- */
  function randomBytes(n) {
    if (typeof root !== 'undefined' && root.crypto && typeof root.crypto.getRandomValues === 'function') {
      var b = new Uint8Array(n);
      root.crypto.getRandomValues(b);
      return b;
    }
    // Node fallback. require() is hidden behind typeof to keep browser-side static analysers quiet.
    if (typeof require === 'function') {
      var c = require('crypto');
      return c.randomFillSync(new Uint8Array(n));
    }
    throw new Error('No CSPRNG available');
  }

  /* ---- nanoid8 (FR-14, S4) ---- */
  function nanoid8() {
    var bytes = randomBytes(8);
    var out = '';
    for (var i = 0; i < 8; i++) {
      out += NANO_ALPHABET.charAt(bytes[i] & 63); // 64-char alphabet → 6 bits per char
    }
    return out;
  }

  /* ---- ISO-8601 UTC ---- */
  function nowIso() { return new Date().toISOString(); }

  /* ---- derive_kebab_id (mirrors conventions.md §3) ---- */
  function derive_kebab_id(text, seen) {
    var base = String(text == null ? '' : text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!base) base = 'untitled';
    if (!seen) return base;
    if (!seen.has(base)) return base;
    var n = 2;
    while (seen.has(base + '-' + n)) n++;
    return base + '-' + n;
  }

  /* ---- buildThread (§10.1) ---- */
  function buildThread(opts) {
    opts = opts || {};
    var now = nowIso();
    return {
      id: nanoid8(),
      anchor: {
        id_anchor: opts.id_anchor,
        quote_anchor: opts.quote_anchor
      },
      status: 'open',
      messages: [
        { role: 'user', body: opts.body, author: opts.author, ts: now }
      ],
      created_at: now,
      updated_at: now
    };
  }

  /* ---- validate_sidecar (S3) ---- */
  function validate_sidecar(obj) {
    if (!obj || typeof obj !== 'object') return false;
    if (obj.schema_version !== SCHEMA_VERSION) return false; // refuse-newer + refuse-older
    if (typeof obj.lineage !== 'string' || !V4_UUID_RE.test(obj.lineage)) return false;
    if (!Array.isArray(obj.threads)) return false;
    return true;
  }

  /* ---- serialize / parse / load (preserve unknown keys via plain JSON round-trip) ---- */
  function serialize_sidecar(obj) {
    // JSON.stringify preserves any extra top-level / nested keys verbatim.
    // LF + trailing newline (FR-16 byte-exact contract).
    return JSON.stringify(obj, null, 2) + '\n';
  }

  function parse_sidecar(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new SidecarCorruptedError('Failed to parse sidecar JSON: ' + (e && e.message), e);
    }
  }

  function load_sidecar(text) {
    return parse_sidecar(text);
  }

  /* ---- public surface ---- */
  var api = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    SidecarCorruptedError: SidecarCorruptedError,
    nanoid8: nanoid8,
    derive_kebab_id: derive_kebab_id,
    buildThread: buildThread,
    validate_sidecar: validate_sidecar,
    serialize_sidecar: serialize_sidecar,
    parse_sidecar: parse_sidecar,
    load_sidecar: load_sidecar
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.PMOSComments = api;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
