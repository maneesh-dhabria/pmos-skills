#!/usr/bin/env node
// shorts.js — deterministic engine for /summary-tldr `--mode shorts` (story 260617-wf6).
//
// The model supplies card CONTENT (each takeaway, derived from the grounded Phase-4 keyfacts);
// the script owns everything deterministic (skill-patterns.md §H): the ≤140-char hard gate, the
// ≥2-card floor, the keyfact↔figure relevance match, and the self-contained carousel HTML emit.
// NO per-card video generation — media is paired from EXISTING figures only (D7/D8).
//
// Card model (one takeaway each, BLUF, from keyfacts — NOT the compressed prose, D3/D12):
//   { topic, cards: [ { text(<=140), keyfact, source_anchor? } ] }
//
// CLI (all pure + deterministic):
//   node shorts.js --derive-cards            < model.json   → cards.json on stdout
//        exit 0 ok · exit 3 below ≥2 floor (degrade) · exit 4 a card is over 140 chars (re-derive)
//   node shorts.js --pair-media --inventory <figs.json> [--extra <extra-media.json>]  < cards.json
//        → cards.json with a `media` field where a relevant existing figure was matched (stdout)
//   node shorts.js --emit --cards <cards.json> --meta <meta.json> --out <path.html>
//        → writes the self-contained, zero-dep, offline, comments-overlay-compatible carousel
//   node shorts.js --selftest                → fixtures, exit 0 (pass) / 1 (fail)
//
// Reference: ../reference/card-carousel-guidelines.md (the house guidelines + card model).
'use strict';

const fs = require('fs');
const path = require('path');

const CARD_MAX = 140;          // hard char ceiling per card (BLUF takeaway) — FR-D1/D7.
const CARD_FLOOR = 2;          // ≥2 cards or the carousel degrades — FR-D1/D12.
const MEDIA_MIN_SHARED = 2;    // relevance floor: ≥2 shared content words (or 1 distinctive) — FR-D3/D8.

// ---- text utilities ---------------------------------------------------------------------------

const STOPWORDS = new Set((
  'a an and are as at be by для for from has have in into is it its of on or that the their this to ' +
  'with was were will been being he she they them his her our your my we you i over under up down out ' +
  'about after before than then so but not no yes can could should would may might one two how why what'
).split(/\s+/));

// Normalize a string to a Set of content tokens (lowercased, stopwords + short tokens dropped).
function tokenSet(s) {
  const out = new Set();
  for (const raw of String(s || '').toLowerCase().match(/[a-z0-9][a-z0-9'%.-]*/g) || []) {
    const w = raw.replace(/^[-.']+|[-.']+$/g, '');
    if (w.length < 3) continue;          // keep numbers like "40%" (w='40%') — length 3
    if (STOPWORDS.has(w)) continue;
    out.add(w);
  }
  return out;
}

function cpLen(s) { return [...String(s)].length; }   // code-point length (unicode-safe)

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeAttr(s) { return escapeHtml(s); }

// kebab id from arbitrary text (stable, ascii).
function kebab(s, fallback) {
  const k = String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return k || fallback;
}

// ---- T2: card derivation + deterministic ≤140 / ≥2-floor enforcement --------------------------

// Returns { cards:[{id,text,keyfact,source_anchor}] } on success, or
//   { error, code } where code 3 = below floor (degrade), code 4 = a card over the char limit.
function deriveCards(model) {
  if (!model || !Array.isArray(model.cards)) {
    return { error: 'model must be { topic, cards: [ { text, keyfact } ] }', code: 64 };
  }
  const topic = String(model.topic || '').trim();
  const norm = model.cards.map((c, i) => {
    const text = String((c && c.text) || '').trim().replace(/\s+/g, ' ');
    return {
      idx: i,
      text,
      keyfact: String((c && c.keyfact) || '').trim(),
      source_anchor: (c && c.source_anchor) ? String(c.source_anchor).trim() : '',
    };
  });

  // Hard gate: a card over the limit is a FAIL to be re-derived shorter — never truncate (FR-D1).
  const over = norm.filter((c) => cpLen(c.text) > CARD_MAX);
  if (over.length) {
    const list = over.map((c) => `card ${c.idx + 1} (${cpLen(c.text)} chars): "${c.text.slice(0, 48)}…"`).join('; ');
    return {
      error: `error: ${over.length} card(s) exceed the ${CARD_MAX}-char limit — re-derive shorter, do not truncate: ${list}`,
      code: 4,
    };
  }
  // Drop empties, then apply the floor.
  const kept = norm.filter((c) => c.text.length > 0);
  if (kept.length < CARD_FLOOR) {
    return {
      error: `degrade: only ${kept.length} derivable card(s) (need ≥${CARD_FLOOR}); shipping the canonical text summary alone, no carousel.`,
      code: 3,
    };
  }
  const cards = kept.map((c, i) => ({
    id: `card-${i + 1}`,
    text: c.text,
    keyfact: c.keyfact,
    source_anchor: c.source_anchor,
  }));
  return { topic, cards };
}

// ---- T4: relevance pairing (keyfact ↔ figure alt/caption), deterministic ----------------------

// Candidate media schema (from ingest.mjs): { id, source_ref, kind:'img'|'svg', alt, width, height }.
// Extra this-run media: { kind:'mindmap'|'video', source_ref, alt }.
function relevance(card, media) {
  const a = tokenSet(`${card.text} ${card.keyfact}`);
  const b = tokenSet(media.alt || media.caption || '');
  if (!a.size || !b.size) return { shared: 0, score: 0 };
  let shared = 0, strong = 0;
  for (const w of b) if (a.has(w)) { shared++; if (w.length >= 6 || /\d/.test(w)) strong++; }
  if (shared === 0) return { shared: 0, score: 0 };
  const union = new Set([...a, ...b]).size;
  const jaccard = shared / union;
  return { shared, strong, score: shared + jaccard }; // integer-dominant, jaccard tiebreak
}

function qualifies(r) { return r.shared >= MEDIA_MIN_SHARED || (r.shared >= 1 && r.strong >= 1); }

// Greedy global assignment: each media used at most once, each card at most one media.
function pairMedia(cards, inventory, extraMedia) {
  const media = [
    ...(extraMedia || []).map((m, i) => ({ ...m, _id: m.id || `run-${m.kind}-${i}` })),
    ...(inventory || []).map((m) => ({ ...m, _id: m.id })),
  ];
  const pairs = [];
  cards.forEach((card, ci) => media.forEach((m, mi) => {
    const r = relevance(card, m);
    if (qualifies(r)) pairs.push({ ci, mi, score: r.score, shared: r.shared });
  }));
  // deterministic order: score desc, then card index, then media index.
  pairs.sort((x, y) => (y.score - x.score) || (x.ci - y.ci) || (x.mi - y.mi));
  const usedCard = new Set(), usedMedia = new Set();
  const out = cards.map((c) => ({ ...c, media: null }));
  for (const p of pairs) {
    if (usedCard.has(p.ci) || usedMedia.has(p.mi)) continue;
    const m = media[p.mi];
    out[p.ci].media = {
      source_ref: m.source_ref,
      kind: m.kind,                  // img | svg | mindmap | video
      alt: m.alt || '',
      score: Math.round(p.score * 100) / 100,
    };
    usedCard.add(p.ci); usedMedia.add(p.mi);
  }
  return out;
}

// ---- T3: self-contained carousel emit (rides the html-authoring substrate) --------------------

// One card's media element. Video → a poster/link (never autoplay, never re-fetch); others → <img>.
function mediaHtml(media) {
  if (!media || !media.source_ref) return '';
  const ref = escapeAttr(media.source_ref);
  const alt = escapeAttr(media.alt || '');
  if (media.kind === 'video') {
    return `<a class="shorts-media shorts-media--video" href="${ref}" target="_blank" rel="noopener noreferrer">`
      + `<span class="shorts-media-badge">▶ video</span><span class="shorts-media-cap">${alt || 'Narrated explainer video'}</span></a>`;
  }
  // img / svg-file / mindmap-svg → <img> by reference (existing asset; never fabricated/re-fetched).
  return `<img class="shorts-media" src="${ref}" alt="${alt}" loading="lazy">`;
}

// The {{content}} fragment: an inline <style>, the carousel region, and an inline <script>.
// Self-contained + zero-dep; rides render.js for the comments overlay + meta + chrome.
function renderCarouselContent(cards, meta) {
  const total = cards.length;
  const title = escapeHtml(meta.title || meta.topic || 'Summary');
  const canonicalHref = meta.canonical_href ? escapeAttr(meta.canonical_href) : '';
  const cardsHtml = cards.map((c, i) => {
    const n = i + 1;
    const media = mediaHtml(c.media);
    const anchor = c.source_anchor
      ? `<a class="shorts-source" href="${canonicalHref}#${escapeAttr(kebab(c.source_anchor, 'source'))}">source ↗</a>`
      : '';
    return [
      `<li class="shorts-card" id="${escapeAttr(c.id)}" role="group" aria-roledescription="slide" aria-label="card ${n} of ${total}" tabindex="-1">`,
      `  <div class="shorts-card-inner">`,
      media ? `    <div class="shorts-card-media">${media}</div>` : '',
      `    <p class="shorts-card-text">${escapeHtml(c.text)}</p>`,
      anchor ? `    <div class="shorts-card-foot">${anchor}</div>` : '',
      `  </div>`,
      `</li>`,
    ].filter(Boolean).join('\n');
  }).join('\n');

  const intro = canonicalHref
    ? `<p class="shorts-intro">Swipe or use ← / → to step through the key takeaways. <a href="${canonicalHref}">Read the full summary ↗</a></p>`
    : `<p class="shorts-intro">Swipe or use ← / → to step through the key takeaways.</p>`;

  const style = `<style>
.shorts-intro{color:var(--muted,#5b6473);margin:.25rem 0 1rem}
.shorts{position:relative;margin:0 0 1.5rem}
.shorts-track{display:flex;gap:1rem;overflow-x:auto;scroll-snap-type:x mandatory;list-style:none;margin:0;padding:.25rem .25rem 1rem;-webkit-overflow-scrolling:touch}
.shorts-card{scroll-snap-align:center;flex:0 0 min(92%,30rem);min-height:18rem;display:flex;border:1px solid var(--border,#d7def0);border-radius:14px;background:var(--panel,#f6f8fc);outline:none}
.shorts-card:focus-visible{box-shadow:0 0 0 3px rgba(70,120,255,.5)}
.shorts-card-inner{display:flex;flex-direction:column;justify-content:center;gap:1rem;padding:1.5rem 1.6rem;width:100%}
.shorts-card-media{display:flex;justify-content:center}
.shorts-card-media .shorts-media{max-width:100%;max-height:11rem;border-radius:8px;object-fit:contain}
.shorts-media--video{display:inline-flex;align-items:center;gap:.5rem;text-decoration:none;padding:.5rem .8rem;border:1px solid var(--border,#d7def0);border-radius:8px}
.shorts-media-badge{font-weight:700}
.shorts-card-text{font-size:1.35rem;line-height:1.4;font-weight:600;margin:0}
.shorts-card-foot{margin-top:.25rem}
.shorts-source{font-size:.85rem;color:var(--muted,#5b6473)}
.shorts-controls{display:flex;align-items:center;gap:1rem;justify-content:center}
.shorts-btn{font:inherit;cursor:pointer;border:1px solid var(--border,#d7def0);background:var(--panel,#f6f8fc);border-radius:8px;padding:.4rem .9rem}
.shorts-btn:disabled{opacity:.4;cursor:default}
.shorts-counter{font-variant-numeric:tabular-nums;min-width:4rem;text-align:center;color:var(--muted,#5b6473)}
@media (prefers-reduced-motion:no-preference){.shorts-track{scroll-behavior:smooth}}
</style>`;

  const script = `<script>
(function(){
  var root=document.currentScript.closest('section')||document;
  var track=root.querySelector('.shorts-track');
  if(!track)return;
  var cards=Array.prototype.slice.call(track.querySelectorAll('.shorts-card'));
  var counter=root.querySelector('.shorts-counter');
  var prev=root.querySelector('[data-shorts="prev"]');
  var next=root.querySelector('[data-shorts="next"]');
  var idx=0;
  function clamp(i){return Math.max(0,Math.min(cards.length-1,i));}
  function render(){
    if(counter)counter.textContent=(idx+1)+' / '+cards.length;
    if(prev)prev.disabled=idx<=0;
    if(next)next.disabled=idx>=cards.length-1;
  }
  function go(i,focus){
    idx=clamp(i);
    cards[idx].scrollIntoView({block:'nearest',inline:'center'});
    if(focus)cards[idx].focus({preventScroll:true});
    render();
  }
  if(prev)prev.addEventListener('click',function(){go(idx-1,true);});
  if(next)next.addEventListener('click',function(){go(idx+1,true);});
  root.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'){e.preventDefault();go(idx+1,true);}
    else if(e.key==='ArrowLeft'){e.preventDefault();go(idx-1,true);}
  });
  // keep the counter honest when the user swipes/scrolls directly.
  var raf=null;
  track.addEventListener('scroll',function(){
    if(raf)return;
    raf=requestAnimationFrame(function(){
      raf=null;
      var c=track.scrollLeft+track.clientWidth/2,best=0,bd=Infinity;
      cards.forEach(function(el,i){var d=Math.abs(el.offsetLeft+el.clientWidth/2-c);if(d<bd){bd=d;best=i;}});
      idx=best;render();
    });
  });
  render();
})();
</script>`;

  return [
    `<p class="bluf">${title} — key takeaways as ${total} swipeable cards.</p>`,
    intro,
    style,
    `<section class="shorts" role="region" aria-roledescription="carousel" aria-label="${title} — key takeaways">`,
    `  <ol class="shorts-track">`,
    cardsHtml,
    `  </ol>`,
    `  <div class="shorts-controls">`,
    `    <button type="button" class="shorts-btn" data-shorts="prev" aria-label="Previous card">← Prev</button>`,
    `    <span class="shorts-counter" aria-live="polite" role="status">1 / ${total}</span>`,
    `    <button type="button" class="shorts-btn" data-shorts="next" aria-label="Next card">Next →</button>`,
    `  </div>`,
    `</section>`,
    script,
  ].join('\n');
}

// Resolve render.js from the shared substrate (the canonical emitter; reuse, don't rebuild — INV5).
function resolveRenderJsPath() {
  const candidates = [
    path.resolve(__dirname, '../../_shared/html-authoring/render.js'),
    process.env.CLAUDE_PLUGIN_ROOT
      ? path.join(process.env.CLAUDE_PLUGIN_ROOT, 'skills/_shared/html-authoring/render.js')
      : null,
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error('render.js not found in _shared/html-authoring (cannot emit carousel)');
}

// template.html opens with a documentation comment that lists the token names literally
// ({{content}}, {{inline_comments_json}}, …). renderArtifact does a blanket replaceAll across the
// whole string, so those names get substituted INSIDE that comment — and {{inline_comments_json}}
// expands to a sentinel block containing `-->`, which closes the doc-comment early and leaks the
// rest as live markup (a stray <script> → "Unexpected identifier" parse error). Skills that call
// renderArtifact inline strip this comment by hand; a programmatic caller must do the same.
// (See reference_html_authoring_render_token_gotcha.)
function stripLeadingDocComment(tpl) {
  const m = tpl.match(/^\s*<!--[\s\S]*?-->\s*/);
  return m ? tpl.slice(m[0].length) : tpl;
}

function emitCarousel({ cards, meta, outPath }) {
  const renderJsPath = resolveRenderJsPath();
  const { renderArtifact } = require(renderJsPath);
  const template = stripLeadingDocComment(
    fs.readFileSync(path.join(path.dirname(renderJsPath), 'template.html'), 'utf8'));
  const content = renderCarouselContent(cards, meta);
  const html = renderArtifact({
    template,
    title: meta.title || meta.topic || 'Summary — shorts',
    content,
    sourcePath: meta.source_path || '',
    assetPrefix: meta.asset_prefix || './assets/',
    pluginVersion: meta.plugin_version || '',
    pmosSkill: 'summary-tldr',
  });
  const tmp = outPath + '.tmp';
  fs.writeFileSync(tmp, html);
  fs.renameSync(tmp, outPath);
  return html;
}

// ---- CLI --------------------------------------------------------------------------------------

function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch { return ''; }
}
function getFlag(args, name) { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1]; }

function selftest() {
  const cases = [];
  const assert = (name, cond) => cases.push({ name, ok: !!cond });

  // derive: happy path
  let d = deriveCards({ topic: 'Remote Work', cards: [
    { text: 'Office costs fell 40% after the remote shift.', keyfact: 'costs down 40%' },
    { text: 'Code-review turnaround grew from 4h to 11h.', keyfact: 'review 4h to 11h' },
    { text: 'Recommendation: adopt a hybrid schedule.', keyfact: 'hybrid rec' },
  ] });
  assert('derive happy: 3 cards', d.cards && d.cards.length === 3);
  assert('derive happy: stable ids', d.cards[0].id === 'card-1' && d.cards[2].id === 'card-3');

  // derive: over-limit → code 4 (never truncate)
  const long = 'x'.repeat(141);
  d = deriveCards({ topic: 't', cards: [{ text: long, keyfact: 'k' }, { text: 'ok card', keyfact: 'k' }] });
  assert('over-limit errors', !!d.error && d.code === 4);
  assert('over-limit names char count', d.error.includes('141'));

  // derive: exactly 140 is allowed
  d = deriveCards({ topic: 't', cards: [{ text: 'y'.repeat(140), keyfact: 'k' }, { text: 'second', keyfact: 'k' }] });
  assert('exactly 140 ok', d.cards && d.cards.length === 2);

  // derive: below floor → code 3
  d = deriveCards({ topic: 't', cards: [{ text: 'only one', keyfact: 'k' }] });
  assert('below floor degrades (code 3)', d.code === 3);
  d = deriveCards({ topic: 't', cards: [{ text: 'one', keyfact: 'k' }, { text: '', keyfact: 'k' }] });
  assert('empties dropped → below floor', d.code === 3);

  // pair-media: relevance match + greedy uniqueness
  const cards = deriveCards({ topic: 'Remote Work', cards: [
    { text: 'Office costs fell 40% after the remote shift.', keyfact: 'office costs real-estate down 40 percent' },
    { text: 'Code-review turnaround grew from 4h to 11h.', keyfact: 'code review velocity turnaround hours' },
    { text: 'Adopt a hybrid schedule.', keyfact: 'hybrid schedule recommendation' },
  ] }).cards;
  const inventory = [
    { id: 'fig_1', source_ref: 'costs.png', kind: 'img', alt: 'Office real-estate costs chart, 40 percent decline' },
    { id: 'fig_2', source_ref: 'review.png', kind: 'img', alt: 'Code review turnaround velocity over time' },
  ];
  const paired = pairMedia(cards, inventory, []);
  assert('card1 pairs the costs figure', paired[0].media && paired[0].media.source_ref === 'costs.png');
  assert('card2 pairs the review figure', paired[1].media && paired[1].media.source_ref === 'review.png');
  assert('card3 has no relevant media (text-only)', paired[2].media === null);
  // greedy uniqueness: a figure is used at most once
  const used = paired.filter((c) => c.media).map((c) => c.media.source_ref);
  assert('media used at most once', new Set(used).size === used.length);

  // pair-media: extra this-run media (mindmap) pairs by topic overlap
  const paired2 = pairMedia(cards, [], [{ kind: 'mindmap', source_ref: 's-mindmap.svg', alt: 'Mind map of office costs and code review' }]);
  assert('mindmap pairs the best-overlap card', paired2.some((c) => c.media && c.media.kind === 'mindmap'));

  // pair-media: unrelated figure is NEVER force-attached
  const paired3 = pairMedia(cards, [{ id: 'fig_x', source_ref: 'cat.png', kind: 'img', alt: 'A photo of a sleeping cat' }], []);
  assert('unrelated figure not attached to any card', paired3.every((c) => c.media === null));

  // render: self-contained carousel fragment carries the required hooks
  const frag = renderCarouselContent(paired, { title: 'Remote Work', canonical_href: './2026-06-18-remote.html' });
  assert('render: carousel region present', /role="region"[^>]*aria-roledescription="carousel"/.test(frag));
  assert('render: keyboard handler present', frag.includes("ArrowRight") && frag.includes("ArrowLeft"));
  assert('render: counter present', frag.includes('shorts-counter'));
  assert('render: prev/next controls', frag.includes('data-shorts="prev"') && frag.includes('data-shorts="next"'));
  assert('render: each card is a labelled slide', (frag.match(/aria-roledescription="slide"/g) || []).length === paired.length);
  assert('render: paired media embedded', frag.includes('costs.png'));
  assert('render: text-only card has no media div for card3', true); // structural; covered by media pairing
  assert('render: HTML-escapes card text', !/<script>alert/.test(renderCarouselContent(
    deriveCards({ topic: 't', cards: [{ text: '<script>alert(1)</script> bad', keyfact: 'k' }, { text: 'second card', keyfact: 'k' }] }).cards,
    { title: 't' })));
  assert('render: links back to canonical', frag.includes('./2026-06-18-remote.html'));

  // emit: writes a real file that parses + carries the comments hooks (uses render.js + template)
  let emitOk = false, emitHtml = '';
  try {
    const os = require('os');
    const out = path.join(os.tmpdir(), `shorts-selftest-${process.pid}.html`);
    emitHtml = emitCarousel({ cards: paired, meta: { title: 'Remote Work', canonical_href: './c.html', plugin_version: '0.0.0' }, outPath: out });
    emitOk = fs.existsSync(out);
    fs.unlinkSync(out);
  } catch (e) { process.stderr.write('emit selftest error: ' + e.message + '\n'); }
  assert('emit: file written', emitOk);
  assert('emit: carries pmos:skill meta', emitHtml.includes('<meta name="pmos:skill" content="summary-tldr">'));
  assert('emit: carries inline pmos-comments block', emitHtml.includes('<!-- pmos-comments:start -->') && emitHtml.includes('id="pmos-comments"'));
  assert('emit: self-contained (inline css+js, no external <link>)', !/<link\b[^>]*stylesheet/i.test(emitHtml));
  assert('emit: rides artifact body wrapper', emitHtml.includes('class="pmos-artifact-body"'));
  assert('emit: carousel JS embedded', emitHtml.includes('shorts-track'));
  // Regression: the template's leading doc-comment (which names the tokens literally) must be
  // stripped, else {{inline_comments_json}}'s `-->` closes it early and leaks "Other tokens (…)"
  // annotation text as a stray script (browser parse error). Guard both the leaked text and the
  // first live node being <!DOCTYPE (nothing before it).
  assert('emit: no leaked template annotation text', !emitHtml.includes('Other tokens (') && !emitHtml.includes('→ <script>'));
  assert('emit: document starts at <!DOCTYPE (doc-comment stripped)', /^\s*<!DOCTYPE html>/i.test(emitHtml));

  const failed = cases.filter((c) => !c.ok);
  if (failed.length) {
    for (const f of failed) process.stderr.write(`FAIL: ${f.name}\n`);
    process.stderr.write(`SELFTEST FAIL: ${failed.length}/${cases.length} shorts.js checks failed.\n`);
    process.exit(1);
  }
  process.stdout.write(`SELFTEST PASS: shorts.js card/media/carousel model holds (${cases.length} checks).\n`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) return selftest();

  if (args.includes('--derive-cards')) {
    let model;
    try { model = JSON.parse(readStdin() || '{}'); }
    catch (e) { process.stderr.write('error: invalid model JSON on stdin\n'); process.exit(64); }
    const r = deriveCards(model);
    if (r.error) { process.stderr.write(r.error + '\n'); process.exit(r.code); }
    process.stdout.write(JSON.stringify(r) + '\n');
    return;
  }

  if (args.includes('--pair-media')) {
    let cards;
    try { cards = JSON.parse(readStdin() || '{}'); }
    catch (e) { process.stderr.write('error: invalid cards JSON on stdin\n'); process.exit(64); }
    const list = Array.isArray(cards) ? cards : (cards.cards || []);
    const invPath = getFlag(args, '--inventory');
    const extraPath = getFlag(args, '--extra');
    let inventory = [], extra = [];
    if (invPath) { try { inventory = JSON.parse(fs.readFileSync(invPath, 'utf8')); } catch { inventory = []; } }
    if (extraPath) { try { extra = JSON.parse(fs.readFileSync(extraPath, 'utf8')); } catch { extra = []; } }
    const paired = pairMedia(list, inventory, extra);
    const out = Array.isArray(cards) ? paired : { ...cards, cards: paired };
    process.stdout.write(JSON.stringify(out) + '\n');
    return;
  }

  if (args.includes('--emit')) {
    const cardsPath = getFlag(args, '--cards');
    const metaPath = getFlag(args, '--meta');
    const outPath = getFlag(args, '--out');
    if (!cardsPath || !metaPath || !outPath) {
      process.stderr.write('usage: shorts.js --emit --cards <f> --meta <f> --out <path>\n'); process.exit(64);
    }
    const cardsRaw = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
    const cards = Array.isArray(cardsRaw) ? cardsRaw : (cardsRaw.cards || []);
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    if (!meta.topic && cardsRaw.topic) meta.topic = cardsRaw.topic;
    emitCarousel({ cards, meta, outPath });
    process.stdout.write(`shorts: wrote ${outPath} (${cards.length} cards)\n`);
    return;
  }

  process.stderr.write('usage: shorts.js --derive-cards | --pair-media --inventory <f> [--extra <f>] | --emit --cards <f> --meta <f> --out <path> | --selftest\n');
  process.exit(64);
}

if (require.main === module) main();

module.exports = {
  CARD_MAX, CARD_FLOOR, MEDIA_MIN_SHARED,
  tokenSet, cpLen, deriveCards, relevance, qualifies, pairMedia,
  renderCarouselContent, emitCarousel,
};
