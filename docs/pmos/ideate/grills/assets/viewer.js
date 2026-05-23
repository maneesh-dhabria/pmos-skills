/* viewer.js — pmos-toolkit html-authoring substrate.
 * Single classic <script>; NO import/export/type=module (FR-05/FR-05.1).
 * Runs in two contexts:
 *   (a) chrome  : feature-folder index.html (sidebar + iframe router + fallback banner + quickstart)
 *   (b) artifact: per-artifact <NN>_*.html (Copy MD toolbar + per-section anchors)
 * Keep small (<=30 KB unminified). No fetch() of sibling JSON (FR-41) — manifest is inlined.
 */
(function () {
  'use strict';

  var memStore = Object.create(null);
  var manifestCache = null;

  function isFileProtocol() {
    try { return location.protocol === 'file:'; } catch (_) { return false; }
  }

  function readManifest() {
    if (manifestCache) return manifestCache;
    var el = document.getElementById('pmos-index');
    if (!el) return null;
    try { manifestCache = JSON.parse(el.textContent || '{}'); }
    catch (_) { manifestCache = null; }
    return manifestCache;
  }

  function safeSessionSet(key, value) {
    try { window.sessionStorage.setItem(key, String(value)); return; }
    catch (_) { memStore[key] = String(value); }
  }
  function safeSessionGet(key) {
    try {
      var v = window.sessionStorage.getItem(key);
      if (v != null) return v;
    } catch (_) { /* fall through to in-memory */ }
    return Object.prototype.hasOwnProperty.call(memStore, key) ? memStore[key] : null;
  }
  function isQuickstartSeen() { return safeSessionGet('pmos.quickstart.seen') === '1'; }
  function markQuickstartSeen() { safeSessionSet('pmos.quickstart.seen', '1'); }

  // Derive a sidebar/hash slug for a manifest entry. Prefers the entry's
  // explicit `id` (canonical per spec §9.1) and falls back to a path-derived
  // kebab. NOTE: distinct from conventions.md §3 heading-id rule — this is
  // for manifest entry identity, not for `<h2>`/`<h3>` ids that skills emit.
  function artifactSlug(entry) {
    if (entry && typeof entry.id === 'string' && entry.id) return entry.id;
    var s = (entry && (entry.path || entry.title)) || '';
    return String(s).toLowerCase()
      .replace(/\.[a-z0-9]+$/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled';
  }

  function getMain() {
    return document.querySelector('main.pmos-main')
        || document.querySelector('[data-pmos-role="main"]');
  }

  /* ---- Sidebar (FR-21) ---- */
  function buildSidebar(manifest) {
    var sidebar = document.querySelector('.pmos-sidebar');
    if (!sidebar || !manifest || !Array.isArray(manifest.artifacts)) return [];
    var groupOrder = [];
    var groups = Object.create(null);
    manifest.artifacts.forEach(function (a) {
      var phase = a.phase || 'Other';
      if (!groups[phase]) { groups[phase] = []; groupOrder.push(phase); }
      groups[phase].push(a);
    });
    sidebar.textContent = '';
    var fileMode = isFileProtocol();
    var rendered = [];
    groupOrder.forEach(function (phase) {
      var g = document.createElement('div');
      g.className = 'pmos-sidebar-group';
      var h = document.createElement('div');
      h.className = 'pmos-sidebar-group-h';
      h.textContent = phase;
      g.appendChild(h);
      groups[phase].forEach(function (a) {
        var slug = artifactSlug(a);
        var link = document.createElement('a');
        link.className = 'pmos-sidebar-item';
        link.textContent = a.title || a.path;
        link.setAttribute('data-pmos-artifact', slug);
        link.setAttribute('data-pmos-format', a.format || 'html');
        link.setAttribute('data-pmos-path', a.path || '');
        if (fileMode) {
          link.href = a.path || '#';
          link.target = '_blank';
          link.rel = 'noopener';
        } else {
          link.href = '#' + slug;
        }
        g.appendChild(link);
        rendered.push(link);
      });
      sidebar.appendChild(g);
    });
    return rendered;
  }

  /* ---- file:// fallback banner (FR-40) ---- */
  function renderFallbackBanner() {
    if (document.querySelector('.pmos-fallback-banner')) return;
    var shell = document.querySelector('.pmos-viewer-shell') || document.body;
    var b = document.createElement('div');
    b.className = 'pmos-fallback-banner';
    b.setAttribute('data-pmos-role', 'fallback-banner');
    b.textContent = 'Running from file://. For embedded viewer, run `node serve.js`.';
    shell.insertBefore(b, shell.firstChild);
  }

  /* ---- Iframe router (FR-23, hash deep linking) ---- */
  function findArtifact(manifest, slug) {
    if (!manifest || !Array.isArray(manifest.artifacts)) return null;
    for (var i = 0; i < manifest.artifacts.length; i++) {
      var a = manifest.artifacts[i];
      if (artifactSlug(a) === slug) return a;
    }
    return null;
  }
  function loadArtifactInIframe(artifact, sectionId) {
    var main = getMain();
    if (!main) return;
    main.textContent = '';
    var iframe = document.createElement('iframe');
    iframe.className = 'pmos-artifact-frame';
    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts');
    var src = artifact.path || '';
    if (sectionId) src += '#' + sectionId;
    iframe.src = src;
    main.appendChild(iframe);
  }
  function setupIframeRouter(manifest, links) {
    if (isFileProtocol()) return;
    function activate(slug, sectionId) {
      links.forEach(function (l) {
        l.classList.toggle('is-active', l.getAttribute('data-pmos-artifact') === slug);
      });
      var artifact = findArtifact(manifest, slug);
      if (!artifact) return;
      if (artifact.format === 'md') renderLegacyMdShimAsync(artifact);
      else loadArtifactInIframe(artifact, sectionId);
    }
    function fromHash() {
      var h = (location.hash || '').replace(/^#/, '');
      if (!h) {
        var first = (manifest && manifest.artifacts && manifest.artifacts[0]) || null;
        if (first) activate(artifactSlug(first));
        return;
      }
      var parts = h.split('/');
      activate(parts[0], parts[1]);
    }
    window.addEventListener('hashchange', fromHash, false);
    fromHash();
  }

  /* ---- Legacy-md shim (FR-22, G11 patch) ---- */
  function renderLegacyMdShim(source, pathHint) {
    var main = getMain();
    if (!main) return;
    main.textContent = '';
    var banner = document.createElement('div');
    banner.className = 'pmos-legacy-md-banner';
    banner.textContent = 'Legacy markdown — not rendered, view source.';
    main.appendChild(banner);
    var pre = document.createElement('pre');
    pre.className = 'pmos-legacy-md';
    pre.setAttribute('data-pmos-source', pathHint || '');
    pre.textContent = String(source == null ? '' : source);
    main.appendChild(pre);
  }
  function renderLegacyMdShimAsync(artifact) {
    if (isFileProtocol()) {
      window.open(artifact.path, '_blank', 'noopener');
      return;
    }
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', artifact.path, true);
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) renderLegacyMdShim(xhr.responseText, artifact.path);
        else renderLegacyMdShim('# ' + (artifact.title || artifact.path) + '\n\n(unable to load: HTTP ' + xhr.status + ')', artifact.path);
      };
      xhr.onerror = function () { renderLegacyMdShim('# ' + (artifact.title || artifact.path) + '\n\n(network error)', artifact.path); };
      xhr.send();
    } catch (e) {
      renderLegacyMdShim('# ' + (artifact.title || artifact.path) + '\n\n(error: ' + (e && e.message) + ')', artifact.path);
    }
  }

  /* ---- Copy-Markdown surfaces (FR-24, FR-25, FR-25.1) ---- */
  function getTurndown() {
    if (typeof window.TurndownService !== 'function') return null;
    var td = new window.TurndownService({
      headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '*', fence: '```'
    });
    if (window.turndownPluginGfm && typeof window.turndownPluginGfm.gfm === 'function') {
      try { td.use(window.turndownPluginGfm.gfm); } catch (_) {}
    }
    return td;
  }
  function copyToClipboard(text) {
    var t = String(text == null ? '' : text);
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = t;
        ta.style.position = 'fixed'; ta.style.left = '-9999px'; ta.style.top = '0';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        var ok = document.execCommand && document.execCommand('copy');
        document.body.removeChild(ta);
        return !!ok;
      } catch (_) { return false; }
    }
    try {
      if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return fallback(); });
      }
    } catch (_) { /* fall through */ }
    return Promise.resolve(fallback());
  }
  function showToast(msg) {
    var existing = document.querySelector('.pmos-toast');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    var t = document.createElement('div');
    t.className = 'pmos-toast is-visible';
    t.setAttribute('role', 'status');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { try { t.classList.remove('is-visible'); } catch (_) {} }, 1600);
    setTimeout(function () { try { t.parentNode && t.parentNode.removeChild(t); } catch (_) {} }, 2000);
  }
  function setupCopyMarkdown() {
    var fileMode = isFileProtocol();
    var toolbarBtns = document.querySelectorAll('[data-pmos-action="copy-md"]');
    toolbarBtns.forEach(function (btn) {
      if (fileMode && btn.closest && btn.closest('.pmos-toolbar')) { btn.disabled = true; return; }
      btn.addEventListener('click', function () {
        var body = document.querySelector('main.pmos-artifact-body') || getMain();
        if (!body) return;
        var td = getTurndown();
        var md = td ? td.turndown(body.innerHTML) : (body.textContent || '');
        Promise.resolve(copyToClipboard(md)).then(function (ok) { showToast(ok ? 'Copied' : 'Copy failed'); });
      });
    });
    document.querySelectorAll('[data-pmos-action="copy-link"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        Promise.resolve(copyToClipboard(location.href)).then(function (ok) { showToast(ok ? 'Link copied' : 'Copy failed'); });
      });
    });
    var body = document.querySelector('main.pmos-artifact-body');
    if (!body) return;
    body.querySelectorAll('h2[id], h3[id]').forEach(function (h) {
      if (h.querySelector('.pmos-section-anchor')) return;
      var a = document.createElement('a');
      a.className = 'pmos-section-anchor';
      a.href = '#' + h.id;
      a.setAttribute('aria-label', 'Copy section markdown');
      a.textContent = '¶';
      h.appendChild(a);
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        var stop = h.tagName.toLowerCase() === 'h2' ? 'h2' : 'h2,h3';
        var html = h.outerHTML;
        var n = h.nextElementSibling;
        while (n && !n.matches(stop)) { html += n.outerHTML; n = n.nextElementSibling; }
        var td = getTurndown();
        var md = td ? td.turndown(html) : (h.textContent || '');
        Promise.resolve(copyToClipboard(md)).then(function (ok) { showToast(ok ? 'Section copied' : 'Copy failed'); });
      });
    });
  }

  /* ---- Quickstart banner (FR-26, W04) ---- */
  function showQuickstartBanner() {
    if (isQuickstartSeen()) return;
    var shell = document.querySelector('.pmos-viewer-shell') || document.body;
    var sidebar = document.querySelector('.pmos-sidebar');
    var b = document.createElement('div');
    b.className = 'pmos-quickstart-banner';
    b.setAttribute('data-pmos-role', 'quickstart');
    var s = document.createElement('strong'); s.textContent = 'Quickstart: '; b.appendChild(s);
    b.appendChild(document.createTextNode('Pick an artifact from the left. Use Copy Markdown for export. '));
    var dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'pmos-quickstart-dismiss';
    dismiss.textContent = 'Got it';
    dismiss.addEventListener('click', function () {
      markQuickstartSeen();
      try { b.parentNode.removeChild(b); } catch (_) {}
    });
    b.appendChild(dismiss);
    if (sidebar && sidebar.parentNode) sidebar.parentNode.insertBefore(b, sidebar);
    else shell.insertBefore(b, shell.firstChild);
  }

  /* ---- Init ---- */
  function init() {
    var manifest = readManifest();
    var inChrome = !!document.querySelector('.pmos-viewer-shell');
    if (inChrome) {
      var links = buildSidebar(manifest);
      if (isFileProtocol()) {
        renderFallbackBanner();
      } else {
        showQuickstartBanner();
        setupIframeRouter(manifest, links);
      }
    }
    setupCopyMarkdown();
  }

  /* ---- Test surface (also useful for in-browser debugging) ---- */
  window.__pmosViewer = {
    isFileProtocol: isFileProtocol,
    readManifest: readManifest,
    safeSessionSet: safeSessionSet,
    safeSessionGet: safeSessionGet,
    isQuickstartSeen: isQuickstartSeen,
    buildSidebar: buildSidebar,
    renderLegacyMdShim: renderLegacyMdShim,
    copyToClipboard: copyToClipboard,
    artifactSlug: artifactSlug
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, false);
  } else {
    init();
  }
})();
