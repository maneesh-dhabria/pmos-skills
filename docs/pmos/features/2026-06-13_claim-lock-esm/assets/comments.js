/* comments.js — pmos-toolkit html-authoring substrate.
 * Pure-data helpers + browser overlay for the inline-comments feature. Loaded two ways:
 *   (a) Browser: <script defer src="comments.js"> → attaches to window.PMOSComments.
 *   (b) Node:    require('.../comments.js')      → module.exports = {...}.
 *
 * Read path (T3): inline JSON sentinel block in the artifact.
 * Write path (T3): POST /save with optimistic concurrency (FR-16, FR-17).
 * Overlay UX (T24): orphan banner, diagram markers, review-mode gate, file:// blocking modal.
 *
 * Refs: FR-01, FR-02, FR-10, FR-11, FR-13, FR-14, FR-16, FR-17, S3, S4, §10.1, §11.
 * (T9 removed: FSA write path, localStorage draft mirror, Save-sidecar download button,
 * IndexedDB handle rehydrate. Review-mode is in-memory only per D14.)
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
      out += NANO_ALPHABET.charAt(bytes[i] & 63);
    }
    return out;
  }

  function nowIso() { return new Date().toISOString(); }

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
    if (obj.schema_version !== SCHEMA_VERSION) return false;
    if (typeof obj.lineage !== 'string' || !V4_UUID_RE.test(obj.lineage)) return false;
    if (!Array.isArray(obj.threads)) return false;
    return true;
  }

  function serialize_sidecar(obj) {
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

  // Module-scope state (single overlay per artifact).
  var state = {
    mounted: false,
    artifactPath: '/',
    artifactBaseName: 'artifact',
    lineage: null,
    sidecar: null,           // in-memory sidecar object
    _docRef: null,           // test override
    diagramMarkers: []
  };

  /* =====================================================================
   * T3 — Inline JSON read path + FR-14 mode detection + POST /save.
   * Refs: FR-13, FR-14, FR-15, FR-16, FR-17, E2..E6, E11.
   * ===================================================================== */

  var _state = {
    schema: 1,
    version: 0,
    generated_at: null,
    threads: [],
    mode: 'unknown'
  };

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
    var compose = doc.querySelector('.pmos-thread-compose');
    if (compose) compose.setAttribute('data-pmos-conflict', '1');
    if (doc.body && doc.body.firstChild) {
      doc.body.insertBefore(banner, doc.body.firstChild);
    } else if (doc.body) {
      doc.body.appendChild(banner);
    }
    return banner;
  }

  /* postSubmit: POST a new-thread submission to /save with optimistic concurrency. */
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
            else _state.version = _state.version + 1;
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
  readInlineState();

  /* =====================================================================
   * T24 — Overlay UX: orphan banner, diagram markers, review-mode gate,
   *       file:// blocking modal, FR-52 foreign-SVG bbox capture.
   * D14: review-mode is in-memory only (no localStorage persistence).
   * ===================================================================== */

  var _reviewMode = 'on';
  var _keyboardToggleAttached = false;

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
      if (_reviewMode === 'on') { state.mounted = false; _mountOverlaySurfaces(); } else { unmount(); }
    });
  }

  function _mountOverlaySurfaces() {
    _renderMainOverlay();
    var threads = (state.sidecar && state.sidecar.threads) || [];
    _renderOrphanBanner(threads);
    _renderDiagramMarkers(threads);
  }

  /* ---- FNV-1a 64-bit → 16 hex chars. Stable quote-content fingerprint. ---- */
  function fnv1a64Hex(str) {
    var s = String(str == null ? '' : str);
    var hi = 0xcbf29ce4 >>> 0, lo = 0x84222325 >>> 0;
    var primeHi = 0x00000100, primeLo = 0x000001b3;
    for (var i = 0; i < s.length; i++) {
      var code = s.charCodeAt(i);
      lo = lo ^ code;
      var lolo = (lo & 0xffff) * primeLo;
      var lohi = (lo >>> 16) * primeLo;
      var hilo = (lo & 0xffff) * primeHi;
      var newLo = (lolo + ((lohi & 0xffff) << 16)) >>> 0;
      var carry = ((lolo >>> 16) + lohi + hilo) >>> 0;
      var newHi = ((hi * primeLo) + (lo * primeHi) + (carry >>> 16)) >>> 0;
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

  /* ---- DOM helpers ---- */
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

  /* ---- mount: idempotent. Wires DOM listeners + overlay surfaces.
   *      T24: review-mode gate, file:// modal, orphan banner, diagram markers.
   *      T9: FSA detection + localStorage draft + Save-sidecar button + IndexedDB
   *      rehydrate removed; persistence is exclusively the T3 POST /save flow. */
  function mount(opts) {
    opts = opts || {};
    state.artifactPath = opts.artifactPath || state.artifactPath;
    var bn = String(state.artifactPath).replace(/^.*\//, '').replace(/\.html?$/i, '');
    state.artifactBaseName = bn || 'artifact';
    if (opts.lineage) state.lineage = opts.lineage;
    if (opts.sidecar) state.sidecar = opts.sidecar;

    var doc = _doc();
    if (doc) {
      _attachKeyboardToggle(doc);
    }

    // file:// → render blocking modal only; no overlay surfaces.
    if (_isFileProtocol()) {
      if (doc) _renderFileWarningModal();
      return;
    }

    // Review-mode gate — if 'off', skip mounting overlay surfaces. (D14: in-memory)
    if (_reviewMode === 'off') {
      return;
    }

    if (state.mounted) return;
    state.mounted = true;

    // T3: hydrate inline _state on each mount, then resolve mode (FR-14).
    readInlineState();
    detectMode().then(function (m) {
      _state.mode = m;
      if (m === 'read-only') _hideComposeForReadOnly();
    });

    if (doc) {
      _attachSelectionListener();
      _mountOverlaySurfaces();
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
    captureSelection: captureSelection,
    onFloatingButtonClick: onFloatingButtonClick,
    mountBanner: mountBanner,
    mount: mount,
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

  // T3 test hook.
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
}(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this)));
