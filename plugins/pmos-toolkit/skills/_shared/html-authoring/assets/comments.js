/* comments.js — pmos-toolkit html-authoring substrate.
 * Pure-data helpers for the inline-comments overlay. Loaded two ways:
 *   (a) Browser: <script defer src="comments.js"> → attaches to window.PMOSComments.
 *   (b) Node:    require('.../comments.js')      → module.exports = {...}.
 * Skeleton only (T3) — the panel/marker UI lands at T7.
 * Safari/Firefox fallback (T22): FSA-unavailable browsers use localStorage +
 * a "Save sidecar" download button instead of the FSA write path.
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

  /* =====================================================================
   * T7 — browser-side UI + FSA write path.
   * Chrome/Edge only; Safari/Firefox fallback lands at T22.
   * Refs: FR-02, FR-03, FR-04, FR-11, FR-13, FR-14, S16, S17, §11.
   * ===================================================================== */

  /* =====================================================================
   * T22 — Safari/Firefox fallback: FSA feature detection + localStorage
   * draft mirroring + "Save sidecar" download button.
   * Refs: FR-02, FR-03, FR-11, NFR-02.
   * ===================================================================== */

  // FSA availability flag. Set once at init; overridable for tests.
  var _fsaFallbackMode = false;

  /* ---- _detectFsaSupport: set _fsaFallbackMode. Called from mount(). */
  function _detectFsaSupport() {
    var hasDP = typeof root !== 'undefined' &&
                typeof root.showDirectoryPicker === 'function';
    var hasSFP = typeof root !== 'undefined' &&
                 typeof root.showSaveFilePicker === 'function';
    _fsaFallbackMode = !(hasDP && hasSFP);
  }

  /* ---- _lsKey: stable localStorage key for this artifact.
   *      Uses the artifact path directly — readable, collision-free for
   *      single-origin usage. Prefix isolates our keys. */
  function _lsKey(artifactPath) {
    return 'pmos:comments:' + String(artifactPath || '/');
  }

  /* ---- _lsDraftSave: mirror sidecar to localStorage (fallback mode). */
  function _lsDraftSave(artifactPath, sidecar) {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(_lsKey(artifactPath), serialize_sidecar(sidecar));
    } catch (_) { /* quota exceeded or private-browse no-storage: swallow */ }
  }

  /* ---- _lsDraftLoad: restore previous draft from localStorage. */
  function _lsDraftLoad(artifactPath) {
    try {
      if (typeof localStorage === 'undefined') return null;
      var raw = localStorage.getItem(_lsKey(artifactPath));
      if (!raw) return null;
      return parse_sidecar(raw);
    } catch (_) { return null; }
  }

  /* ---- _lsDraftClear: remove draft after successful download. */
  function _lsDraftClear(artifactPath) {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(_lsKey(artifactPath));
    } catch (_) { /* swallow */ }
  }

  /* ---- _renderSaveSidecarButton: inject the "Save sidecar" button into
   *      the panel header. Hidden when FSA is available.
   *      data-pmos-save-sidecar attribute for test queries. */
  function _renderSaveSidecarButton() {
    var doc = _doc(); if (!doc) return;
    var panel = doc.querySelector('.pmos-side-panel');
    if (!panel) return;
    // Idempotent — skip if already rendered.
    if (doc.querySelector('[data-pmos-save-sidecar]')) return;
    var btn = doc.createElement('button');
    btn.setAttribute('data-pmos-save-sidecar', '1');
    btn.textContent = 'Save sidecar';
    btn.setAttribute('type', 'button');
    if (_fsaFallbackMode) {
      btn.style.display = '';   // visible
    } else {
      btn.style.display = 'none'; // hidden — FSA happy path handles persistence
    }
    btn.addEventListener('click', function () { triggerSidecarDownload(); });
    var header = doc.querySelector('.pmos-panel-header');
    if (header) {
      header.appendChild(btn);
    } else {
      panel.appendChild(btn);
    }
  }

  /* ---- triggerSidecarDownload: assemble sidecar, Blob-download, clear draft.
   *      Uses <a download> pattern (broad browser support). */
  function triggerSidecarDownload() {
    var doc = _doc(); if (!doc) return;
    if (!state.sidecar) return;
    var fname = (state.artifactBaseName || 'artifact') + '.comments.json';
    var payload = serialize_sidecar(state.sidecar);
    var blob = new Blob([payload], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = doc.createElement('a');
    a.href = url;
    a.setAttribute('download', fname);
    a.style.display = 'none';
    doc.body.appendChild(a);
    a.click();
    // Revoke after a tick so the browser can initiate the download.
    if (typeof setTimeout !== 'undefined') {
      setTimeout(function () {
        URL.revokeObjectURL(url);
        a.remove();
      }, 100);
    } else {
      URL.revokeObjectURL(url);
      a.remove();
    }
    _lsDraftClear(state.artifactPath);
  }

  // Module-scope state (single overlay per artifact).
  var state = {
    mounted: false,
    artifactPath: '/',
    artifactBaseName: 'artifact',
    lineage: null,
    sidecar: null,           // current sidecar object in memory
    dirHandle: null,         // FileSystemDirectoryHandle (browser)
    writeSidecarImpl: null,  // overridable for tests
    _docRef: null            // test override: pin a document reference so async callbacks
                             // see a stable doc even after global.document is deleted
  };

  /* ---- FNV-1a 64-bit → 16 hex chars. Sync, pure, no deps.
   *      Sufficient as a stable quote-content fingerprint for anchor
   *      matching; collision risk is non-security (Bitap recheck via DMP
   *      at apply-time per T6). */
  function fnv1a64Hex(str) {
    // Two 32-bit lanes simulate 64-bit avoiding BigInt (broad runtime support).
    var s = String(str == null ? '' : str);
    var hi = 0xcbf29ce4 >>> 0, lo = 0x84222325 >>> 0;
    var primeHi = 0x00000100, primeLo = 0x000001b3;
    for (var i = 0; i < s.length; i++) {
      var code = s.charCodeAt(i);
      lo = lo ^ code;
      // 64-bit multiply: (hi:lo) * (primeHi:primeLo)
      var lolo = (lo & 0xffff) * primeLo;
      var lohi = (lo >>> 16) * primeLo;
      var hilo = (lo & 0xffff) * primeHi;
      var newLo = (lolo + ((lohi & 0xffff) << 16)) >>> 0;
      var carry = ((lolo >>> 16) + lohi + hilo) >>> 0;
      var newHi = ((hi * primeLo) + (lo * primeHi) + (carry >>> 16)) >>> 0;
      // Account for carry from low half overflow:
      if (newLo < lolo) newHi = (newHi + 1) >>> 0;
      hi = newHi; lo = newLo;
    }
    function hex8(n) { var h = (n >>> 0).toString(16); while (h.length < 8) h = '0' + h; return h; }
    return hex8(hi) + hex8(lo);
  }

  /* ---- captureSelection: pure. Builds quote_anchor from raw selection bits. */
  function captureSelection(sel) {
    sel = sel || {};
    var text = String(sel.text == null ? '' : sel.text);
    var prefix = String(sel.prefix == null ? '' : sel.prefix);
    var suffix = String(sel.suffix == null ? '' : sel.suffix);
    return {
      quote_hash: fnv1a64Hex(text),
      context_before: prefix.slice(-30),
      context_after: suffix.slice(0, 30)
    };
  }

  /* ---- DOM helpers (no-ops in Node) ---- */
  // _docRef: if set (e.g. by tests via state._docRef = doc), overrides the
  // global document lookup so async callbacks see a stable reference.
  function _doc() {
    if (state._docRef) return state._docRef;
    return (typeof document !== 'undefined') ? document : null;
  }

  function _ensurePanel() {
    var doc = _doc(); if (!doc) return null;
    var panel = doc.querySelector('.pmos-side-panel');
    if (panel) return panel;
    panel = doc.createElement('div');
    panel.classList.add('pmos-side-panel');
    var header = doc.createElement('div');
    header.classList.add('pmos-panel-header');
    header.textContent = 'Comments';
    panel.appendChild(header);
    var list = doc.createElement('div');
    list.classList.add('pmos-thread-list');
    panel.appendChild(list);
    var compose = doc.createElement('div');
    compose.classList.add('pmos-thread-compose');
    var ta = doc.createElement('textarea');
    compose.appendChild(ta);
    var btn = doc.createElement('button');
    btn.textContent = 'Submit';
    btn.classList.add('pmos-compose-submit');
    compose.appendChild(btn);
    panel.appendChild(compose);
    doc.body.appendChild(panel);
    return panel;
  }

  function onFloatingButtonClick(anchor) {
    var panel = _ensurePanel();
    if (!panel) return;
    panel.classList.add('open');
    // Stash the pending anchor on the panel for compose submit.
    panel._pendingAnchor = anchor || null;
  }

  /* ---- mountBanner: idempotent toast. ---- */
  function mountBanner(msg) {
    var doc = _doc(); if (!doc) return null;
    var b = doc.querySelector('.pmos-banner');
    if (b) { b.textContent = String(msg == null ? '' : msg); return b; }
    b = doc.createElement('div');
    b.classList.add('pmos-banner');
    b.textContent = String(msg == null ? '' : msg);
    doc.body.appendChild(b);
    return b;
  }

  /* ---- writeSidecar: per-save FSA re-request (S16, FR-13).
   *      Order MUST be: requestPermission → getFileHandle → createWritable
   *      → write → close. On 'denied', mount banner and return without
   *      writing (prior sidecar on disk untouched). */
  function writeSidecar(sidecar, handle) {
    if (!handle || typeof handle.requestPermission !== 'function') {
      // No handle → cannot write; surface banner so user can re-grant.
      mountBanner('Click to grant write access');
      return Promise.resolve(false);
    }
    return Promise.resolve(handle.requestPermission({ mode: 'readwrite' }))
      .then(function (perm) {
        if (perm !== 'granted') {
          mountBanner('Click to grant write access');
          return false;
        }
        var fname = (state.artifactBaseName || 'artifact') + '.comments.json';
        return Promise.resolve(handle.getFileHandle(fname, { create: true }))
          .then(function (fh) {
            return Promise.resolve(fh.createWritable({ keepExistingData: false }));
          })
          .then(function (writable) {
            var payload = serialize_sidecar(sidecar);
            return Promise.resolve(writable.write(payload))
              .then(function () { return writable.close(); })
              .then(function () { return true; });
          });
      })
      .catch(function (err) {
        mountBanner('Click to grant write access');
        // Re-throw? Spec says surface banner; do not throw — caller treats
        // false as soft-fail (prior sidecar untouched).
        return false;
      });
  }

  /* ---- submitThread: build thread, append to in-memory sidecar, persist.
   *      In FSA-fallback mode, persists to localStorage instead of FSA. */
  function submitThread(opts) {
    opts = opts || {};
    var t = buildThread({
      id_anchor: opts.anchor && opts.anchor.id_anchor,
      quote_anchor: opts.anchor && opts.anchor.quote_anchor,
      body: opts.body,
      author: opts.author
    });
    if (!state.sidecar) {
      state.sidecar = {
        schema_version: SCHEMA_VERSION,
        lineage: state.lineage || '00000000-0000-4000-8000-000000000000',
        threads: []
      };
    }
    state.sidecar.threads.push(t);
    if (_fsaFallbackMode) {
      // Fallback: persist to localStorage; no FSA call.
      _lsDraftSave(state.artifactPath, state.sidecar);
      return Promise.resolve(true);
    }
    var impl = state.writeSidecarImpl || writeSidecar;
    return impl(state.sidecar, state.dirHandle);
  }

  /* ---- IndexedDB rehydrate (S17). Best-effort; no-op in Node. */
  function _rehydrateHandle() {
    if (typeof indexedDB === 'undefined') return;
    try {
      var req = indexedDB.open('pmos-comments', 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles');
      };
      req.onsuccess = function () {
        try {
          var db = req.result;
          var tx = db.transaction('handles', 'readonly');
          var store = tx.objectStore('handles');
          var key = (typeof location !== 'undefined' && location.pathname) ? location.pathname : state.artifactPath;
          var g = store.get(key);
          g.onsuccess = function () {
            if (g.result && !state.dirHandle) state.dirHandle = g.result;
          };
        } catch (_) { /* swallow — best-effort */ }
      };
    } catch (_) { /* swallow */ }
  }

  /* ---- selectionchange listener: spawns floating button at end of range. */
  function _attachSelectionListener() {
    var doc = _doc(); if (!doc) return;
    if (typeof document.addEventListener !== 'function') return;
    document.addEventListener('selectionchange', function () {
      try {
        var sel = (typeof window !== 'undefined' && window.getSelection) ? window.getSelection() : null;
        if (!sel || sel.isCollapsed || !sel.rangeCount) return;
        var range = sel.getRangeAt(0);
        var rect = range.getBoundingClientRect ? range.getBoundingClientRect() : null;
        if (!rect) return;
        // Build prefix/suffix from anchor node's textContent.
        var node = sel.anchorNode || null;
        var nodeText = (node && node.textContent) ? node.textContent : '';
        var startOff = Math.min(sel.anchorOffset || 0, sel.focusOffset || 0);
        var endOff = Math.max(sel.anchorOffset || 0, sel.focusOffset || 0);
        var anchor = captureSelection({
          start: startOff,
          end: endOff,
          text: sel.toString(),
          prefix: nodeText.slice(0, startOff),
          suffix: nodeText.slice(endOff)
        });
        _placeFloatingButton(rect, anchor);
      } catch (_) { /* swallow — UI nicety */ }
    });
  }

  function _placeFloatingButton(rect, anchor) {
    var doc = _doc(); if (!doc) return;
    var btn = doc.querySelector('.pmos-floating-btn');
    if (!btn) {
      btn = doc.createElement('button');
      btn.classList.add('pmos-floating-btn');
      btn.textContent = '💬';
      btn.setAttribute('type', 'button');
      doc.body.appendChild(btn);
      btn.addEventListener('click', function () {
        onFloatingButtonClick(btn._anchor);
      });
    }
    btn._anchor = anchor;
    btn.style.top = ((rect.bottom || 0) + 8) + 'px';
    btn.style.left = ((rect.right || 0) + 8) + 'px';
  }

  /* ---- mount: idempotent. Wires DOM listeners + rehydrates handle.
   *      T22: also detects FSA availability, rehydrates localStorage draft
   *      on FSA-unavailable browsers, and renders the "Save sidecar" button. */
  function mount(opts) {
    opts = opts || {};
    state.artifactPath = opts.artifactPath || state.artifactPath;
    // Derive base name from artifact path (strip .html).
    var bn = String(state.artifactPath).replace(/^.*\//, '').replace(/\.html?$/i, '');
    state.artifactBaseName = bn || 'artifact';
    if (opts.lineage) state.lineage = opts.lineage;
    if (opts.dirHandle) state.dirHandle = opts.dirHandle;
    if (opts.sidecar) state.sidecar = opts.sidecar;
    if (typeof opts._writeSidecar === 'function') state.writeSidecarImpl = opts._writeSidecar;

    // T22: allow tests to override the fallback flag directly.
    if (typeof opts._fsaFallbackMode === 'boolean') {
      _fsaFallbackMode = opts._fsaFallbackMode;
    } else {
      _detectFsaSupport();
    }

    if (state.mounted) return;
    state.mounted = true;

    if (_doc()) {
      _attachSelectionListener();
      if (_fsaFallbackMode) {
        // Rehydrate previous localStorage draft so reload doesn't lose threads.
        // Validate first: seed only if schema is current; clear if stale/unknown.
        var draft = _lsDraftLoad(state.artifactPath);
        if (draft) {
          if (validate_sidecar(draft) && !state.sidecar) {
            state.sidecar = draft;
          } else if (!validate_sidecar(draft)) {
            // Stale/invalid draft — clear so it doesn't get re-seeded on every reload.
            _lsDraftClear(state.artifactPath);
          }
        }
        // Ensure panel exists before rendering the save button.
        _ensurePanel();
        _renderSaveSidecarButton();
      }
    }
    if (!_fsaFallbackMode) {
      _rehydrateHandle();
    }
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
    load_sidecar: load_sidecar,
    // T7 additions
    captureSelection: captureSelection,
    onFloatingButtonClick: onFloatingButtonClick,
    submitThread: submitThread,
    writeSidecar: writeSidecar,
    mountBanner: mountBanner,
    mount: mount,
    // T22 additions — FSA fallback (Safari/Firefox)
    _detectFsaSupport: _detectFsaSupport,
    _lsKey: _lsKey,
    _lsDraftSave: _lsDraftSave,
    _lsDraftLoad: _lsDraftLoad,
    _lsDraftClear: _lsDraftClear,
    triggerSidecarDownload: triggerSidecarDownload,
    // Expose state for test introspection.
    _state: state
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.PMOSComments = api;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
