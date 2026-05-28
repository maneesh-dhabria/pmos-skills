/* comments.js — pmos-toolkit html-authoring substrate.
 * Pure-data helpers for the inline-comments overlay. Loaded two ways:
 *   (a) Browser: <script defer src="comments.js"> → attaches to window.PMOSComments.
 *   (b) Node:    require('.../comments.js')      → module.exports = {...}.
 * Skeleton only (T3) — the panel/marker UI lands at T7.
 * Safari/Firefox fallback (T22): FSA-unavailable browsers use localStorage +
 * a "Save sidecar" download button instead of the FSA write path.
 * T24: Overlay UX surfaces — orphan banner, diagram markers, review-mode gate,
 *      file:// E1 blocking modal, FR-52 foreign-SVG bbox capture.
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
    _docRef: null,           // test override: pin a document reference so async callbacks
                             // see a stable doc even after global.document is deleted
    diagramMarkers: []       // T24: tracked markers { threadId, element }
  };

  /* =====================================================================
   * T3 — Inline JSON read path + FR-14 mode detection + POST /save.
   * Replaces the FSA / sidecar-fetch read path. The legacy code paths
   * below (FSA + localStorage fallback) remain in place; T9 will gut
   * them once T3..T8 land.
   * Refs: FR-13, FR-14, FR-15, FR-16, FR-17, E2..E6, E11.
   * ===================================================================== */

  // _state: hydrated from the inline JSON block at first mount-or-eval.
  // Shape: { schema, version, generated_at, threads, mode }.
  // mode ∈ {'unknown','read-only','read-write'}; resolved by detectMode().
  var _state = {
    schema: 1,
    version: 0,
    generated_at: null,
    threads: [],
    mode: 'unknown'
  };

  /* readInlineState: parse the sentinel-bracketed <script id="pmos-comments">
   * block into _state. Idempotent; on parse-fail leaves _state at defaults
   * and surfaces nothing (artifact may be mid-render in tests). */
  function readInlineState() {
    var doc = _doc(); if (!doc) return;
    var el = doc.getElementById ? doc.getElementById('pmos-comments') : null;
    if (!el) return;
    var raw = el.textContent || '';
    try {
      var obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') {
        _state.schema = (typeof obj.schema === 'number') ? obj.schema : 1;
        _state.version = (typeof obj.version === 'number') ? obj.version : 0;
        _state.generated_at = obj.generated_at || null;
        _state.threads = Array.isArray(obj.threads) ? obj.threads.slice() : [];
      }
    } catch (_) { /* swallow — defaults stand */ }
  }

  /* detectMode (FR-14): file:// short-circuits to read-only; otherwise HEAD
   * /save with 500ms AbortController timeout. Any non-2xx OR network error
   * OR timeout → read-only. Returns a Promise<'read-only' | 'read-write'>. */
  function detectMode() {
    try {
      var proto = (typeof location !== 'undefined' && location.protocol) ? location.protocol :
                  (root && root.location && root.location.protocol);
      if (proto === 'file:') return Promise.resolve('read-only');
    } catch (_) { return Promise.resolve('read-only'); }

    var fetchFn = (typeof fetch === 'function') ? fetch :
                  (root && typeof root.fetch === 'function') ? root.fetch : null;
    if (!fetchFn) return Promise.resolve('read-only');

    var AC = (typeof AbortController !== 'undefined') ? AbortController :
             (root && root.AbortController) ? root.AbortController : null;
    var ctrl = AC ? new AC() : null;
    var timer = null;
    if (ctrl && typeof setTimeout !== 'undefined') {
      timer = setTimeout(function () { try { ctrl.abort(); } catch (_) {} }, 500);
    }
    var opts = { method: 'HEAD' };
    if (ctrl) opts.signal = ctrl.signal;

    return Promise.resolve()
      .then(function () { return fetchFn('/save', opts); })
      .then(function (r) {
        if (timer) clearTimeout(timer);
        var ok = (r && (r.ok === true || (typeof r.status === 'number' && r.status >= 200 && r.status < 300)));
        return ok ? 'read-write' : 'read-only';
      })
      .catch(function () {
        if (timer) clearTimeout(timer);
        return 'read-only';
      });
  }

  /* _hideComposeForReadOnly: dim+disable the compose UI and append a passive
   * footer hint per FR-14. Idempotent. */
  function _hideComposeForReadOnly() {
    var doc = _doc(); if (!doc) return;
    var compose = doc.querySelector('.pmos-thread-compose');
    if (compose) {
      compose.style.display = 'none';
      compose.setAttribute('data-pmos-readonly', '1');
    }
    var panel = doc.querySelector('.pmos-side-panel');
    if (panel && !doc.querySelector('.pmos-readonly-hint')) {
      var hint = doc.createElement('div');
      hint.className = 'pmos-readonly-hint';
      hint.textContent = 'Read-only — launch comments-open to add comments';
      panel.appendChild(hint);
    }
  }

  /* _renderConflictBanner (FR-17): top-of-page banner on 409.
   * "This document was updated since you opened it (current version: M).
   *  Reload to merge." plus a Reload button. Idempotent — replaces any
   *  prior banner so the most-recent server-current version wins. */
  function _renderConflictBanner(currentVersion) {
    var doc = _doc(); if (!doc) return null;
    var prior = doc.querySelector('.pmos-conflict-banner');
    if (prior) prior.remove();
    var banner = doc.createElement('div');
    banner.className = 'pmos-conflict-banner';
    banner.setAttribute('role', 'alert');
    banner.textContent = 'This document was updated since you opened it (current version: ' +
                         currentVersion + '). Reload to merge.';
    var reload = doc.createElement('button');
    reload.setAttribute('type', 'button');
    reload.className = 'pmos-conflict-reload';
    reload.textContent = 'Reload';
    reload.addEventListener('click', function () {
      try { if (root && root.location && typeof root.location.reload === 'function') root.location.reload(); } catch (_) {}
    });
    banner.appendChild(reload);
    // Disable compose while a conflict is pending.
    var compose = doc.querySelector('.pmos-thread-compose');
    if (compose) compose.setAttribute('data-pmos-conflict', '1');
    // Insert at top of body.
    if (doc.body && doc.body.firstChild) {
      doc.body.insertBefore(banner, doc.body.firstChild);
    } else if (doc.body) {
      doc.body.appendChild(banner);
    }
    return banner;
  }

  /* postSubmit: POST a new-thread submission to /save with optimistic
   * concurrency. Body shape:
   *   { expected_version: <N>, payload: { schema, version: N, generated_at, threads: [..., newThread] } }
   * Returns { ok: true, version, generated_at } on 200, or
   *         { ok: false, status, conflict_version? } on non-2xx.
   * On 409 also renders the conflict banner with the server-reported
   * current_version (FR-17). */
  function postSubmit(opts) {
    opts = opts || {};
    var t = buildThread({
      id_anchor: opts.anchor && opts.anchor.id_anchor,
      quote_anchor: opts.anchor && opts.anchor.quote_anchor,
      body: opts.body,
      author: opts.author
    });
    var nextThreads = _state.threads.concat([t]);
    var body = {
      expected_version: _state.version,
      payload: {
        schema: _state.schema || 1,
        version: _state.version,
        generated_at: _state.generated_at,
        threads: nextThreads
      }
    };
    var fetchFn = (typeof fetch === 'function') ? fetch :
                  (root && typeof root.fetch === 'function') ? root.fetch : null;
    if (!fetchFn) return Promise.resolve({ ok: false, status: 0 });

    return Promise.resolve()
      .then(function () {
        return fetchFn('/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      })
      .then(function (r) {
        var status = (r && typeof r.status === 'number') ? r.status : 0;
        if (status === 200) {
          return Promise.resolve(r.json ? r.json() : {}).then(function (j) {
            if (j && typeof j.version === 'number') _state.version = j.version;
            else _state.version = _state.version + 1; // optimistic local bump
            if (j && j.generated_at) _state.generated_at = j.generated_at;
            _state.threads = nextThreads;
            return { ok: true, version: _state.version, generated_at: _state.generated_at };
          });
        }
        if (status === 409) {
          return Promise.resolve(r.json ? r.json() : {}).then(function (j) {
            var cur = (j && typeof j.current_version === 'number') ? j.current_version : null;
            if (cur != null) _renderConflictBanner(cur);
            return { ok: false, status: 409, conflict_version: cur };
          });
        }
        return { ok: false, status: status };
      })
      .catch(function () { return { ok: false, status: 0 }; });
  }

  // Hydrate _state from the inline JSON block immediately on module eval.
  // Safe in Node (no document) — readInlineState() bails on missing doc.
  readInlineState();

  /* T24: orphan banner, diagram markers, review-mode gate, file:// modal, FR-52 bbox. */

  var _reviewMode = 'on';
  var _keyboardToggleAttached = false;

  function _initReviewMode() {
    try {
      if (typeof localStorage !== 'undefined') {
        var v = localStorage.getItem('pmos:reviewMode');
        if (v === 'off') { _reviewMode = 'off'; return; }
      }
    } catch (_) { /* swallow */ }
    _reviewMode = 'on';
  }

  function _isFileProtocol() {
    try {
      if (typeof root !== 'undefined' && root.location && root.location.protocol === 'file:') return true;
      if (typeof location !== 'undefined' && location.protocol === 'file:') return true;
    } catch (_) { /* swallow */ }
    return false;
  }

  function _mkBtn(doc, attr, text, cmd) {
    var btn = doc.createElement('button');
    btn.setAttribute(attr, '1');
    btn.setAttribute('type', 'button');
    btn.textContent = text;
    btn.addEventListener('click', function () {
      try { if (root && root.navigator && root.navigator.clipboard) root.navigator.clipboard.writeText(cmd); } catch (_) { /* swallow */ }
    });
    return btn;
  }

  function _renderFileWarningModal() {
    var doc = _doc(); if (!doc) return;
    if (doc.querySelector('[data-pmos-file-warning]')) return;
    var overlay = doc.createElement('div');
    overlay.setAttribute('data-pmos-file-warning', '1');
    var modal = doc.createElement('div');
    modal.setAttribute('data-pmos-file-warning-modal', '1');
    var title = doc.createElement('h2');
    title.textContent = 'HTTP serving required';
    var msg = doc.createElement('p');
    msg.textContent = 'The comments overlay requires HTTP serving (not file://). Use one of the commands below:';
    modal.appendChild(title);
    modal.appendChild(msg);
    modal.appendChild(_mkBtn(doc, 'data-pmos-copy-serve', 'Copy serve command', 'python3 -m http.server 8000'));
    modal.appendChild(_mkBtn(doc, 'data-pmos-copy-launcher', 'Copy launcher command',
      'bash <repo>/plugins/pmos-toolkit/skills/_shared/html-authoring/assets/comments-open.sh <artifact-path>'));
    overlay.appendChild(modal);
    doc.body.appendChild(overlay);
  }

  function _renderOrphanBanner(threads) {
    var doc = _doc(); if (!doc) return;
    var orphans = (threads || []).filter(function (t) { return t && t.orphan === true; });
    if (!orphans.length) return;
    var panel = _ensurePanel(); if (!panel) return;
    var old = doc.querySelector('[data-pmos-orphan-banner]');
    if (old) old.remove();
    var banner = doc.createElement('div');
    banner.setAttribute('data-pmos-orphan-banner', '1');
    var n = orphans.length;
    banner.textContent = (n === 1 ? '1 orphaned thread' : n + ' orphaned threads') + ' — view + reattach';
    var existingSecond = panel.children[1] || null;
    if (existingSecond) { panel.insertBefore(banner, existingSecond); }
    else { panel.appendChild(banner); }
    orphans.forEach(function (t) {
      var btn = doc.createElement('button');
      btn.setAttribute('data-pmos-reattach-btn', t.id);
      btn.setAttribute('type', 'button');
      btn.textContent = 'Reattach';
      btn.addEventListener('click', function () { openReattachForm(t.id); });
      banner.appendChild(btn);
    });
  }

  function openReattachForm(threadId) {
    var doc = _doc(); if (!doc) return;
    var panel = _ensurePanel(); if (!panel) return;
    panel.classList.add('open');
    var threads = (state.sidecar && state.sidecar.threads) || [];
    var thread = null;
    for (var i = 0; i < threads.length; i++) { if (threads[i].id === threadId) { thread = threads[i]; break; } }
    var composeDiv = doc.querySelector('.pmos-thread-compose');
    var ta = composeDiv ? composeDiv.querySelector('textarea') : null;
    if (ta && thread) {
      var msgs = thread.messages || [], lastBody = '';
      for (var j = msgs.length - 1; j >= 0; j--) { if (msgs[j].role === 'user') { lastBody = msgs[j].body || ''; break; } }
      ta.value = lastBody; ta._textContent = lastBody;
    }
    if (!doc.querySelector('[data-pmos-reattach-anchor]') && composeDiv) {
      var inp = doc.createElement('input');
      inp.setAttribute('type', 'text');
      inp.setAttribute('data-pmos-reattach-anchor', threadId);
      inp.setAttribute('placeholder', 'Paste quote anchor text to reattach to...');
      composeDiv.appendChild(inp);
    }
  }

  function _computeMarkerPos(anchorEl) {
    if (!anchorEl) return null;
    try {
      if (typeof anchorEl.getBoundingClientRect === 'function') {
        var r = anchorEl.getBoundingClientRect();
        return { left: r.left + r.width / 2, top: r.top + r.height / 2 };
      }
      if (typeof anchorEl.getBBox === 'function') {
        var b = anchorEl.getBBox();
        return { left: b.x + b.width / 2, top: b.y + b.height / 2 };
      }
    } catch (_) { /* swallow */ }
    return null;
  }

  function _clearDiagramMarkers(doc) {
    state.diagramMarkers.forEach(function (e) { try { if (e.element) e.element.remove(); } catch (_) { /* swallow */ } });
    state.diagramMarkers = [];
    if (doc) { var s = doc.querySelectorAll('[data-pmos-diagram-marker]'); s.forEach(function (el) { try { el.remove(); } catch (_) { /* swallow */ } }); }
  }

  function _renderDiagramMarkers(threads) {
    var doc = _doc(); if (!doc) return;
    _clearDiagramMarkers(doc);
    (threads || []).forEach(function (thread) {
      if (!thread || !thread.diagram_anchor) return;
      var da = thread.diagram_anchor;
      var anchorEl = da.shape_id ? doc.querySelector('[data-anchor="' + da.shape_id + '"]') : null;
      if (!anchorEl && da.svg_id) anchorEl = doc.querySelector('#' + da.svg_id);
      if (!anchorEl) return;
      var pos = _computeMarkerPos(anchorEl); if (!pos) return;
      var m = doc.createElement('div');
      m.setAttribute('data-pmos-diagram-marker', thread.id);
      m.style.position = 'absolute'; m.style.left = pos.left + 'px'; m.style.top = pos.top + 'px';
      m.style.width = '16px'; m.style.height = '16px'; m.style.zIndex = '5';
      m.style.borderRadius = '50%'; m.style.cursor = 'pointer'; m.style.transform = 'translate(-50%, -50%)';
      m.addEventListener('click', function () { var p = _ensurePanel(); if (p) p.classList.add('open'); });
      doc.body.appendChild(m);
      state.diagramMarkers.push({ threadId: thread.id, element: m });
    });
  }

  function _renderMainOverlay() {
    var doc = _doc(); if (!doc) return;
    if (doc.querySelector('#pmos-comments-overlay')) return;
    var o = doc.createElement('div'); o.setAttribute('id', 'pmos-comments-overlay'); doc.body.appendChild(o);
  }

  function unmount() {
    var doc = _doc(); if (!doc) return;
    _clearDiagramMarkers(doc);
    var o = doc.querySelector('#pmos-comments-overlay'); if (o) o.remove();
    var p = doc.querySelector('.pmos-side-panel'); if (p) p.remove();
    state.mounted = false;
  }

  function captureSvgBboxAnchor(targetEl, svgEl, clickX, clickY) {
    var el = targetEl;
    while (el) {
      var tag = el.tagName ? el.tagName.toUpperCase() : '';
      if ((tag === 'G' || tag === 'RECT' || tag === 'PATH') && el.getAttribute && el.getAttribute('data-anchor')) {
        return { svg_id: svgEl ? (svgEl.getAttribute('id') || null) : null, shape_id: el.getAttribute('data-anchor'), bbox: null };
      }
      if (el === svgEl || tag === 'SVG') break;
      el = el.parentNode || null;
    }
    var svgId = svgEl ? (svgEl.getAttribute ? svgEl.getAttribute('id') : null) : null;
    return { svg_id: svgId || null, shape_id: null, bbox: [clickX - 20, clickY - 20, 40, 40] };
  }

  function _attachKeyboardToggle(doc) {
    if (!doc || typeof doc.addEventListener !== 'function') return;
    if (_keyboardToggleAttached) return;
    _keyboardToggleAttached = true;
    doc.addEventListener('keydown', function (e) {
      e = e || {};
      if (!(e.key && e.key.toUpperCase() === 'R') || !(e.ctrlKey || e.metaKey) || !e.altKey) return;
      if (typeof e.preventDefault === 'function') e.preventDefault();
      _reviewMode = (_reviewMode === 'off') ? 'on' : 'off';
      try { if (typeof localStorage !== 'undefined') localStorage.setItem('pmos:reviewMode', _reviewMode); } catch (_) { /* swallow */ }
      if (_reviewMode === 'on') { state.mounted = false; _mountOverlaySurfaces(); } else { unmount(); }
    });
  }

  function _mountOverlaySurfaces() {
    _renderMainOverlay();
    var threads = (state.sidecar && state.sidecar.threads) || [];
    _renderOrphanBanner(threads);
    _renderDiagramMarkers(threads);
  }

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
   *      on FSA-unavailable browsers, and renders the "Save sidecar" button.
   *      T24: review-mode gate, file:// modal, orphan banner, diagram markers. */
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

    // T24: read review-mode from localStorage on every mount call (allows toggle).
    _initReviewMode();

    // T24: always attach the keyboard toggle listener (even when reviewMode='off'),
    // so Ctrl/Cmd+Alt+R can turn the overlay back on.
    var doc = _doc();
    if (doc) {
      _attachKeyboardToggle(doc);
    }

    // T24: file:// protocol → render blocking modal only; no overlay surfaces.
    if (_isFileProtocol()) {
      if (doc) _renderFileWarningModal();
      return; // Do NOT proceed to mount the overlay.
    }

    // T24: review-mode gate — if 'off', skip mounting overlay surfaces.
    if (_reviewMode === 'off') {
      return; // Keyboard listener already attached above.
    }

    if (state.mounted) return;
    state.mounted = true;

    // T3: hydrate inline _state on each mount (cheap; idempotent), then
    // resolve mode via FR-14 detection. Compose UI gates on the resolved mode.
    readInlineState();
    detectMode().then(function (m) {
      _state.mode = m;
      if (m === 'read-only') _hideComposeForReadOnly();
    });

    if (doc) {
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
      // T24: render the overlay + orphan banner + diagram markers.
      _mountOverlaySurfaces();
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
    // T24 additions — overlay UX surfaces
    unmount: unmount,
    openReattachForm: openReattachForm,
    captureSvgBboxAnchor: captureSvgBboxAnchor,
    // T3 additions — inline JSON read path + FR-14 mode detection + POST submit.
    detectMode: detectMode,
    postSubmit: postSubmit,
    readInlineState: readInlineState,
    // Expose state for test introspection.
    _state: state
  };

  // T3: test-only hook. Activated when window.__pmosTest === true (set by
  // jsdom harness before eval'ing this source). Exposes _state as an accessor
  // so tests see the live object, not a stale snapshot.
  if (typeof root !== 'undefined' && root.__pmosTest) {
    root.__pmosTestHook = {
      detectMode: detectMode,
      postSubmit: postSubmit,
      readInlineState: readInlineState,
      _state: function () { return _state; }
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.PMOSComments = api;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
