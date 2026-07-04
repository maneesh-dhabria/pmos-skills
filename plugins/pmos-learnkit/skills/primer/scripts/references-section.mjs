#!/usr/bin/env node
// references-section.mjs — the single deterministic References generator for /primer.
// One generator, two callers (INV-1): the forward write path (SKILL.md Phase 5) appends
// renderReferencesFragment() output to the content-only {{content}} fragment before
// renderArtifact(); the corpus backfill CLI (story 260704-3jt) calls injectReferences() over
// each bundled data/primers/*.html. Neither re-implements the markup. The LLM never
// hand-authors a References list (INV-2, mirrors SKILL.md Anti-pattern #9).
//
// Contract (docs/pmos/features/2026-07-04_primer-references/02_design.html §3/§4, D1–D8):
//   - The section lists EVERY sources.json entry (all were read + synthesized), honestly
//     (INV-5): every url appears exactly once, none silently dropped.
//   - Each entry: <a href="{url}">{label}</a> where label = cleaned host of {url} (scheme +
//     leading www. stripped, D5), followed by ·cited· iff the url is cited inline in the body
//     (D3, computed — never stored), the tier badge (T1/T2/…), and the verbatim takeaway.
//   - Ordered by tier (T1→T2→…; unknown tiers last) then original sources.json order (D4);
//     byte-stable for identical inputs (D6).
//   - injectReferences is idempotent (INV-4): re-running replaces the section in place, never
//     appends a second one; placed immediately before </main> (D7, absolute bottom).
//   - Zero-dep Node ESM (matches build-library.mjs); no network, no I/O (INV-3) — pure
//     transforms of the passed strings.

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

// Cleaned host label (D5): strip scheme + leading www. Deterministic; identical for forward
// + backfill. Falls back to a regex when the URL is not WHATWG-parseable.
export function cleanHost(url) {
  let host;
  try {
    host = new URL(String(url)).hostname;
  } catch {
    const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i.exec(String(url));
    host = m ? m[1] : String(url);
  }
  return host.replace(/^www\./i, '');
}

// Tier sort key: "T1"→1, "T2"→2, …; unknown / missing → Infinity (sorted last).
function tierRank(tier) {
  const m = /^T(\d+)$/i.exec(String(tier == null ? '' : tier).trim());
  return m ? Number(m[1]) : Infinity;
}

// Collect every href in the given HTML's <a> tags (used for cited-detection; caller passes a
// body already stripped of any References section so its own anchors don't self-mark).
function collectHrefs(html) {
  const hrefs = [];
  const re = /<a\s[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let m;
  while ((m = re.exec(String(html)))) hrefs.push(m[1] != null ? m[1] : m[2]);
  return hrefs;
}

// The set of sources.json urls that appear inline in the body (D3 — URL-substring match inside
// a body <a href> outside the References section). Exported so the forward path (Phase 5) marks
// ·cited· the same way the backfill path does (INV-1).
export function computeCitedUrls(bodyHtml, sources) {
  const hrefs = collectHrefs(bodyHtml);
  const cited = new Set();
  for (const s of Array.isArray(sources) ? sources : []) {
    if (!s || !s.url) continue;
    if (hrefs.some((h) => h === s.url || h.includes(s.url))) cited.add(s.url);
  }
  return cited;
}

// PURE. Returns a content-only fragment: <h2 id="references">References</h2> + an ordered list
// of every source. citedUrls may be a Set or an Array of urls that carry the ·cited· marker.
export function renderReferencesFragment(sources, citedUrls) {
  const citedSet = citedUrls instanceof Set ? citedUrls : new Set(citedUrls || []);
  const list = (Array.isArray(sources) ? sources : []).filter((s) => s && s.url);
  const ordered = list
    .map((s, i) => ({ s, i, rank: tierRank(s.tier) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.s);

  const items = ordered.map((s) => {
    const href = escapeAttr(s.url);
    const label = escapeHtml(cleanHost(s.url));
    const cited = citedSet.has(s.url) ? ' <span class="ref-cited">·cited·</span>' : '';
    const tier = s.tier ? ` <span class="ref-tier">(${escapeHtml(String(s.tier))})</span>` : '';
    const takeaway = s.takeaway
      ? `\n<p class="ref-takeaway">${escapeHtml(s.takeaway)}</p>`
      : '';
    return `<li>\n<a href="${href}">${label}</a>${cited}${tier}${takeaway}\n</li>`;
  });

  return `<h2 id="references">References</h2>\n<ol class="primer-references">\n${items.join('\n')}\n</ol>`;
}

// Remove any existing References section: from <h2 id="references"> up to (not including) the
// next <h2 or </main>. No-op when absent. Underpins idempotency (INV-4).
function stripReferences(html) {
  const startRe = /<h2\s+id="references"[^>]*>/i;
  const m = startRe.exec(html);
  if (!m) return html;
  const afterHeading = m.index + m[0].length;
  const tail = html.slice(afterHeading);
  const nextH2 = tail.search(/<h2[\s>]/i);
  const mainClose = tail.search(/<\/main>/i);
  const bounds = [nextH2, mainClose].filter((x) => x !== -1);
  const endRel = bounds.length ? Math.min(...bounds) : tail.length;
  const end = afterHeading + endRel;
  return html.slice(0, m.index) + html.slice(end);
}

// Backfill + any post-render path. Computes citedUrls from the body, removes any existing
// References section (idempotent, INV-4), and inserts the fresh fragment immediately before
// </main> (D7). Byte-idempotent: injectReferences(injectReferences(h, s), s) === injectReferences(h, s).
export function injectReferences(primerHtml, sources) {
  const stripped = stripReferences(String(primerHtml));
  const cited = computeCitedUrls(stripped, sources);
  const fragment = renderReferencesFragment(sources, cited);

  const mainClose = stripped.search(/<\/main>/i);
  if (mainClose === -1) {
    // No </main> to anchor to — append at the very end (best-effort; corpus primers always
    // carry the substrate's <main>, so this branch is a defensive fallback only).
    return `${stripped.replace(/\s*$/, '')}\n${fragment}\n`;
  }
  const before = stripped.slice(0, mainClose).replace(/\s*$/, '');
  const after = stripped.slice(mainClose);
  return `${before}\n${fragment}\n${after}`;
}
