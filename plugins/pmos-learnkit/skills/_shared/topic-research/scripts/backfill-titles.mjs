// backfill-titles.mjs — Playwright title + content backfill for curated-references.json.
//
// The title-recovery + ungrounded-re-summarization pre-pass of epic 260626-j5k (story af6).
// Design anchors: 02_design.html#d5 (escalation ladder), #d6 (conservative drop),
// #d8 (X/Twitter branch), #d9 (throttling + retry budget), #c4 (id re-mint on canonical URL).
//
// What it does, per junk-title-or-tweet record (the ~816-record work set = junk ∪ tweets):
//   D5 ladder  — og:title → clean document.title → first <h1>, following redirects to the
//                canonical URL; a recovered value that is itself junk does NOT overwrite —
//                the record escalates to a real (non-headless) browser, then a URL-slug
//                last resort (slug-derived titles are flagged for audit).
//   D8 tweet   — for x.com / twitter.com hosts, an INVERTED-precedence branch runs FIRST:
//                title ← document.title (strip trailing " / X"); summary ← og:description
//                (server-rendered meta survive the SPA login wall). Link/image-only tweets
//                stay WEAK; tombstones fall to the D6 drop.
//   re-summ.   — a navigated record with summary_grounded:false is re-summarized from
//                recovered body content (og:description, else first substantial paragraph)
//                and flipped to grounded ONLY when real prose is produced — never fabricated.
//   D6 drop    — a record is dropped ONLY when the post-escalation live fetch confirms the
//                page is genuinely gone (hard 404 / dead domain / "Deployment Paused" /
//                deleted-tweet tombstone). Alive-but-hard records are KEPT; rate-limited
//                records are KEPT and flagged (never dropped on false-dead evidence).
//   C4 id      — a recovered canonical URL re-mints id = "ref_"+sha256(url).slice(0,12);
//                re-mints are enumerated in the report. The 7-field schema never changes.
//   D9 throttle— per-host serialization with randomized 1.5–4s politeness jitter, ≤4 distinct
//                hosts concurrent, 429/503/challenge-aware exponential backoff honouring
//                Retry-After. A host past its retry budget is recorded rate-limited (KEPT)
//                and added to the report's re-run worklist for an idempotent second pass.
//
// Zero new npm deps (D1): Playwright is resolved from the installed module cache and used
// ONLY as a build-time tool — it never becomes a runtime skill dependency. Absent Playwright
// degrades with a clear error, never a silent no-op.
//
// Generation path (D3): this is step 2 of the corpus pipeline — import-curated-references.mjs
// produces the raw scrubbed JSON, then this pre-pass cleans titles/summaries and writes the
// shipped curated-references.json. Idempotent + resumable: re-running only re-touches records
// still carrying a junk title or an ungrounded summary, so a rate-limited subset (the report's
// worklist) can be re-fetched on a second pass without redoing the whole corpus.
//
// Usage:
//   node backfill-titles.mjs [corpus.json] [--out report.json] [--limit N] [--only-ids a,b,…]
//                            [--dry-run] [--no-escalate] [--checkpoint N]
//   --dry-run      : recover + report, never write the corpus (still writes the report).
//   --no-escalate  : skip the real-browser rung (faster headless-only pass; for CI/smoke).
//   --limit N      : process only the first N work-set records (sizing / smoke runs).
//   --checkpoint N : write the corpus back every N processed records (default 25; resumable).

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const DEFAULT_CORPUS = fileURLToPath(new URL('../curated-references.json', import.meta.url));

// ---- junk + tweet classifiers ----------------------------------------------
// A title is junk if it is empty, a known bot-wall string, or an HTTP error label.
const JUNK_RE = /^\s*$|^just a moment|^amazon\.com$|403|forbidden|429|too many requests|access denied|attention required|enable javascript|are you a robot|page not found|^404\b|^503\b|service unavailable|^site not found/i;
export const isJunk = (t) => JUNK_RE.test(String(t || '').trim());
// A recovered title is still junk if it trips the same wall, is host-only, or is too short.
const HOST_ONLY_RE = /^[a-z0-9.-]+\.[a-z]{2,}$/i;
export const stillJunk = (t) => {
  const s = String(t || '').trim();
  return !s || isJunk(s) || s.length < 5 || HOST_ONLY_RE.test(s);
};

// Genuinely-dead evidence (D6) — drop ONLY on these RENDERED signals, after the full
// escalation ladder. A page that literally renders a not-found/tombstone/paused message.
// A bare HTTP 404/410 status alone is NOT here on purpose: a stale tracking URL (e.g. an
// expired Amazon `ref=sr_1_1` search link) can HTTP-404 while the canonical work is alive —
// the slug rung recovers it and the record is KEPT (D6 conservative; alive-but-hard ≠ dead).
const DEAD_TITLE_RE = /page not found|^404\b|\b404 error\b|\b410 gone\b|no longer exists?\b|deployment paused|we (?:can.?t|couldn.?t) find (?:that|this) page|sorry,? .*(?:can.?t|couldn.?t) find|this account doesn.?t exist|account suspended|tweet.*(deleted|unavailable)|domain (?:is )?for sale|site not found|this page (?:is|has) (?:gone|been removed)/i;
// Rate-limit / challenge evidence (D9) — KEEP + flag, never drop.
const RATELIMIT_RE = /just a moment|attention required|^429\b|too many requests|^503\b|rate limited|are you a robot|checking your browser|access denied|cf-browser-verification/i;

export function host(u) {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return '?'; }
}
export function isTweetHost(h) {
  return /(^|\.)x\.com$/.test(h) || /(^|\.)twitter\.com$/.test(h);
}
export function refId(url) {
  return 'ref_' + createHash('sha256').update(String(url)).digest('hex').slice(0, 12);
}

// ---- canonical fetch URL ----------------------------------------------------
// Amazon's 98 junk records mostly carry stale SEARCH-RESULT URLs (…/dp/<ASIN>/ref=sr_1_1?qid=…)
// that render "Sorry, we couldn't find that page" even though the product is alive. Fetching the
// canonical /dp/<ASIN> (tracking query + /ref=… stripped) is what recovers the real title (AC4).
// Non-Amazon URLs are returned unchanged — redirects are followed naturally by the browser.
export function canonicalForFetch(url) {
  try {
    const u = new URL(url);
    if (!/(^|\.)amazon\./i.test(u.hostname)) return url;
    const m = u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (m) {
      const isGp = /\/gp\/product\//i.test(u.pathname);
      return u.origin + (isGp ? `/gp/product/${m[1]}` : `/dp/${m[1]}`);
    }
    return u.origin + u.pathname; // no ASIN — at least drop the tracking query
  } catch { return url; }
}

// ---- URL-slug last resort (D5 rung 4) --------------------------------------
// Derive a human-ish title from the last meaningful path segment. Marked for audit.
export function slugTitle(url) {
  try {
    const u = new URL(url);
    const segs = u.pathname.split('/').filter(Boolean).map((s) => {
      try { return decodeURIComponent(s); } catch { return s; }
    });
    // Reject non-descriptive segments: pure ids, ASIN-like (10-char alphanum), structural
    // markers (dp/gp/product/ref/category), tracking fragments (`ref=…`, `sr_…`, contain `=`).
    const isNoise = (s) =>
      /^\d+$/.test(s) || /^[A-Z0-9]{10}$/.test(s) || /^(dp|gp|product|ref|category|c|b|s)$/i.test(s) ||
      /[=]/.test(s) || /^(ref|sr|qid|sprefix|crid)[-_=]/i.test(s) || s.length <= 2;
    // Prefer the most descriptive remaining segment = the one with the most word separators.
    const cand = segs.filter((s) => !isNoise(s))
      .sort((a, b) => (b.split(/[-_]/).length - a.split(/[-_]/).length) || (b.length - a.length))[0] || '';
    let seg = cand.replace(/\.(html?|php|aspx?)$/i, '');
    seg = seg.replace(/[-_]+/g, ' ').replace(/\b([a-z])/g, (m, c) => c.toUpperCase()).trim();
    // A single short word or an id that survived is not a usable title.
    return (seg.length >= 5 && seg.split(' ').length >= 2 && !/^\d+$/.test(seg)) ? seg : '';
  } catch { return ''; }
}

// ---- Playwright resolution (D1) --------------------------------------------
async function loadPlaywright() {
  const candidates = [
    'playwright',
    '/Users/' + (process.env.USER || 'maneeshdhabria') + '/node_modules/playwright/index.js',
  ];
  const req = createRequire(import.meta.url);
  for (const c of candidates) {
    try {
      const resolved = c.startsWith('/') ? c : req.resolve(c);
      const mod = await import(resolved.startsWith('/') ? 'file://' + resolved : resolved);
      const pw = mod.default || mod;
      if (pw && pw.chromium) return pw;
    } catch { /* try next */ }
  }
  throw new Error(
    'Playwright not found. This is a BUILD-TIME tool (D1) — install it where Node can resolve it ' +
    '(e.g. `npm i -g playwright && npx playwright install chromium`) and re-run. It is never a runtime skill dependency.'
  );
}

// ---- extraction (in-page) ---------------------------------------------------
const EXTRACT = () => {
  const meta = (s) => document.querySelector(s)?.content?.trim() || '';
  const ogTitle = meta('meta[property="og:title"]') || meta('meta[name="twitter:title"]');
  const ogDesc = meta('meta[property="og:description"]') || meta('meta[name="description"]') || meta('meta[name="twitter:description"]');
  const h1 = document.querySelector('h1')?.innerText?.trim() || '';
  const docT = (document.title || '').trim();
  let body = '';
  const sel = 'article p, main p, #mw-content-text p, .available-content p, .post-content p, p';
  for (const p of document.querySelectorAll(sel)) {
    const txt = (p.innerText || '').trim();
    if (txt.length > 80) { body = txt; break; }
  }
  return { ogTitle, ogDesc, h1, docT, bodyLen: document.body?.innerText?.length || 0, firstPara: body.slice(0, 400) };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Deterministic jitter (no Math.random — keeps runs reproducible/resumable). Index-seeded.
function jitter(seed, lo, hi) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const frac = x - Math.floor(x);
  return Math.round(lo + frac * (hi - lo));
}

// Strip a trailing " / X" or " / Twitter" suffix from a tweet document.title.
function cleanTweetTitle(docT) {
  return String(docT || '').replace(/\s*\/\s*(X|Twitter)\s*$/i, '').trim();
}

// Produce a grounded summary from recovered content, or '' if none is real (never fabricate).
function summaryFrom(ex) {
  const cand = (ex.ogDesc && ex.ogDesc.length >= 40) ? ex.ogDesc
    : (ex.firstPara && ex.firstPara.length >= 80) ? ex.firstPara : '';
  // A bare t.co / pic link with no prose is not a summary (D8 link-only tweets stay WEAK).
  if (/^https?:\/\/t\.co\/\S+$/i.test(cand.trim())) return '';
  if (/^(pic\.twitter\.com|https?:\/\/pic\.)/i.test(cand.trim())) return '';
  return cand.trim();
}

// ---- single-record recovery (D5/D8 ladder over one already-open context) ----
async function recoverOne(ctx, realCtxFactory, rec, opts) {
  const h = host(rec.url);
  const out = {
    id: rec.id, url: rec.url, finalUrl: rec.url, oldTitle: rec.title, newTitle: null,
    newSummary: null, groundedFlip: false, status: 'pending', auditSlug: false,
    rateLimited: false, dead: false, escalated: false, err: null,
  };
  const tweet = isTweetHost(h);
  const fetchUrl = tweet ? rec.url : canonicalForFetch(rec.url); // Amazon → canonical /dp/ASIN

  async function attempt(context, label) {
    const page = await context.newPage();
    try {
      const resp = await page.goto(fetchUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
      const code = resp ? resp.status() : null;
      await page.waitForTimeout(2500); // let JS-challenge / SPA settle
      const ex = await page.evaluate(EXTRACT);
      out.finalUrl = page.url();
      return { code, ex, retryAfter: resp?.headers?.()['retry-after'] };
    } finally {
      await page.close().catch(() => {});
    }
  }

  // retry/backoff budget (D9): up to 3 tries on rate-limit/challenge evidence.
  let res = null;
  for (let tryN = 0; tryN < 3; tryN++) {
    try {
      res = await attempt(ctx, 'headless');
    } catch (e) {
      out.err = String(e.message || e).split('\n')[0].slice(0, 140);
      if (tryN < 2) { await sleep(jitter(rec.url.length + tryN, 1500, 4000) * (tryN + 1)); continue; }
      res = null;
      break;
    }
    const t = tweet ? cleanTweetTitle(res.ex.docT) : (res.ex.ogTitle || res.ex.docT || res.ex.h1);
    const challenged = (res.code === 429 || res.code === 503) ||
      RATELIMIT_RE.test(res.ex.docT) || RATELIMIT_RE.test(t || '');
    if (challenged && tryN < 2) {
      const ra = parseInt(res.retryAfter || '0', 10);
      const back = (ra > 0 ? ra * 1000 : jitter(rec.url.length, 1500, 4000) * Math.pow(2, tryN));
      await sleep(Math.min(back, 30000));
      continue;
    }
    break; // got a usable (or final) response
  }

  if (!res) { out.status = out.err ? 'error' : 'no-response'; return out; }

  // Pick a title per host precedence.
  const ex = res.ex;
  let title = tweet
    ? cleanTweetTitle(ex.docT)                                   // D8 inverted precedence
    : ([ex.ogTitle, ex.docT, ex.h1].find((x) => x && !stillJunk(x)) || '');

  // Accumulate RENDERED dead / rate-limit evidence across all rungs. A bare HTTP 404 alone is
  // deliberately NOT a drop signal — a recovered (real-browser or slug) title always overrides
  // a drop. Drop happens ONLY when we finish with no usable title AND a rendered-dead page (D6).
  let deadEvidence = DEAD_TITLE_RE.test(ex.docT) || DEAD_TITLE_RE.test(title || '');
  const rateLimited = RATELIMIT_RE.test(ex.docT) || RATELIMIT_RE.test(title || '') ||
    res.code === 429 || res.code === 503;

  // Escalate to a real browser (D5 rung 3) when the headless title is still junk and we're
  // not already certain it's dead, and escalation is enabled.
  if (!tweet && stillJunk(title) && !deadEvidence && opts.escalate) {
    out.escalated = true;
    try {
      const realCtx = await realCtxFactory();
      const page = await realCtx.newPage();
      try {
        const resp = await page.goto(fetchUrl, { waitUntil: 'networkidle', timeout: 40000 }).catch(() => null);
        await page.waitForTimeout(3000);
        const rex = await page.evaluate(EXTRACT);
        out.finalUrl = page.url();
        const rt = [rex.ogTitle, rex.docT, rex.h1].find((x) => x && !stillJunk(x)) || '';
        if (rt && !stillJunk(rt)) { title = rt; Object.assign(ex, { ogDesc: rex.ogDesc || ex.ogDesc, firstPara: rex.firstPara || ex.firstPara }); }
        // Only a RENDERED dead page (not a bare HTTP code) escalates to a drop signal.
        if (DEAD_TITLE_RE.test(rex.docT)) deadEvidence = true;
      } finally { await page.close().catch(() => {}); }
    } catch (e) {
      out.err = (out.err ? out.err + ' | ' : '') + 'escalate:' + String(e.message || e).slice(0, 80);
    }
  }

  // URL-slug last resort (D5 rung 4) — only when nothing live produced a usable title and we
  // are not certain the page is dead (a slug title for a dead page would be misleading).
  if (stillJunk(title) && !deadEvidence) {
    const st = slugTitle(rec.url);
    if (st) { title = st; out.auditSlug = true; }
  }

  // Classify final disposition (D6 conservative). A usable recovered title wins over a drop.
  if (title && !stillJunk(title)) {
    out.newTitle = title; out.status = out.auditSlug ? 'slug-fallback' : 'recovered';
  } else if (deadEvidence) {
    out.dead = true; out.status = 'dead'; return out;          // confirmed gone, no title → drop
  } else if (rateLimited) {
    out.rateLimited = true; out.status = 'rate-limited'; return out; // KEEP existing, flag for re-run
  } else {
    out.status = 'still-junk';                                  // keep existing title untouched
  }

  // Re-summarize an ungrounded record from recovered content (T5).
  if (rec.summary_grounded === false) {
    const s = summaryFrom(ex);
    if (s) { out.newSummary = s; out.groundedFlip = true; }
  }
  return out;
}

// ---- D9 per-host scheduler --------------------------------------------------
// Group the work set by registrable host; run ≤MAX_HOSTS host-queues concurrently;
// within a host-queue, serialize with a politeness jitter delay.
async function runScheduler(workSet, processFn, { maxHosts = 4 } = {}) {
  const byHost = new Map();
  for (const rec of workSet) {
    const h = host(rec.url);
    if (!byHost.has(h)) byHost.set(h, []);
    byHost.get(h).push(rec);
  }
  const hostQueues = [...byHost.entries()];
  let qi = 0;
  const results = [];
  async function worker() {
    while (qi < hostQueues.length) {
      const [, recs] = hostQueues[qi++];
      for (let k = 0; k < recs.length; k++) {
        const r = await processFn(recs[k]);
        results.push(r);
        if (k < recs.length - 1) await sleep(jitter(recs[k].url.length + k, 1500, 4000));
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(maxHosts, hostQueues.length) }, worker));
  return results;
}

// ---- corpus projection (C1/C4) ---------------------------------------------
// Re-emit a record through the 7-field whitelist with a content-derived id. Guarantees the
// PII scrub gate stays green and the schema never gains a field.
function project(rec) {
  return {
    id: refId(rec.url),
    url: rec.url,
    title: typeof rec.title === 'string' ? rec.title : (rec.title == null ? '' : String(rec.title)),
    source_type: typeof rec.source_type === 'string' ? rec.source_type : null,
    publication_date: rec.publication_date === undefined ? null : rec.publication_date,
    tags: Array.isArray(rec.tags) ? rec.tags.filter((t) => typeof t === 'string' && t) : [],
    summary: typeof rec.summary === 'string' ? rec.summary : (rec.summary == null ? '' : String(rec.summary)),
    summary_grounded: rec.summary_grounded === true,
  };
}

// Collapse records that project to the same content-derived id. URL canonicalization
// (Amazon → /dp/ASIN; tweet redirect normalization) can rewrite two distinct source urls
// onto one canonical url; without this they would ship as duplicate id+url rows that break
// any id-keyed consumer (the viewers, the prefilter). Deterministic winner per id:
// grounded first, then longer summary, then longer title, then first-seen (stable).
export function dedupeById(projected) {
  const winner = new Map();   // id -> record
  const collapsed = [];       // {id, url, dropped} for the report
  const better = (a, b) => {
    if (a.summary_grounded !== b.summary_grounded) return a.summary_grounded ? a : b;
    if ((a.summary || '').length !== (b.summary || '').length) return (a.summary || '').length > (b.summary || '').length ? a : b;
    if ((a.title || '').length !== (b.title || '').length) return (a.title || '').length > (b.title || '').length ? a : b;
    return a; // stable: keep the first-seen on a full tie
  };
  for (const r of projected) {
    const prev = winner.get(r.id);
    if (!prev) { winner.set(r.id, r); continue; }
    winner.set(r.id, better(prev, r));
    const c = collapsed.find((x) => x.id === r.id);
    if (c) c.dropped++; else collapsed.push({ id: r.id, url: r.url, dropped: 1 });
  }
  return { records: [...winner.values()], collapsed };
}

function recompute(refs) {
  const { records } = dedupeById(refs.map(project));
  const kept = records.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const grounded = kept.filter((r) => r.summary_grounded === true).length;
  return {
    meta: { schema_version: 1, source: 'curated-references', counts: { total: kept.length, grounded, weak: kept.length - grounded } },
    references: kept,
  };
}

// Apply one recovery result back onto the in-memory corpus (mutates the record map).
function applyResult(byId, res, drops, remints) {
  const rec = byId.get(res.id);
  if (!rec) return;
  if (res.dead) { drops.add(res.id); return; }
  if (res.newTitle) rec.title = res.newTitle;
  if (res.groundedFlip && res.newSummary) { rec.summary = res.newSummary; rec.summary_grounded = true; }
  if (res.finalUrl && res.finalUrl !== res.url) {
    const oldId = rec.id, newId = refId(res.finalUrl);
    if (newId !== oldId) { rec.url = res.finalUrl; remints.push({ from: oldId, to: newId, url: res.finalUrl }); }
  }
}

function junkBreakdown(refs) {
  const cat = (t) => {
    const s = String(t || '').trim();
    if (s === '') return 'empty';
    if (/^just a moment/i.test(s)) return 'cloudflare';
    if (/^amazon\.com$/i.test(s)) return 'amazon';
    if (/403|forbidden/i.test(s)) return '403';
    if (/429|too many/i.test(s)) return '429';
    if (isJunk(s)) return 'other-wall';
    return null;
  };
  const out = {};
  for (const r of refs) { const c = cat(r.title); if (c) out[c] = (out[c] || 0) + 1; }
  out.total_junk = refs.filter((r) => isJunk(r.title)).length;
  return out;
}

// ---- main -------------------------------------------------------------------
function parseArgs(argv) {
  const a = { corpus: null, out: null, limit: 0, onlyIds: null, dryRun: false, escalate: true, checkpoint: 25 };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--out') a.out = argv[++i];
    else if (t === '--limit') a.limit = parseInt(argv[++i], 10) || 0;
    else if (t === '--only-ids') a.onlyIds = new Set(argv[++i].split(',').map((s) => s.trim()));
    else if (t === '--dry-run') a.dryRun = true;
    else if (t === '--no-escalate') a.escalate = false;
    else if (t === '--checkpoint') a.checkpoint = parseInt(argv[++i], 10) || 25;
    else rest.push(t);
  }
  a.corpus = rest[0] || DEFAULT_CORPUS;
  a.out = a.out || a.corpus.replace(/\.json$/, '') + '.backfill-report.json';
  return a;
}

export async function backfill(opts) {
  const corpus = JSON.parse(readFileSync(opts.corpus, 'utf8'));
  const refs = corpus.references;
  const byId = new Map(refs.map((r) => [r.id, r]));
  const before = junkBreakdown(refs);

  // Work set: junk-title ∪ tweets (the records a navigation can fix). Ungrounded records
  // inside this set are re-summarized in the same pass.
  let workSet = refs.filter((r) => isJunk(r.title) || isTweetHost(host(r.url)));
  if (opts.onlyIds) workSet = workSet.filter((r) => opts.onlyIds.has(r.id));
  if (opts.limit) workSet = workSet.slice(0, opts.limit);

  const pw = await loadPlaywright();
  const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  const browser = await pw.chromium.launch({ headless: true });
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 } });
  let realBrowser = null;
  const realCtxFactory = async () => {
    if (!realBrowser) realBrowser = await pw.chromium.launch({ headless: false }).catch(() => null);
    if (!realBrowser) throw new Error('real browser unavailable');
    return realBrowser.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 } });
  };

  const drops = new Set();
  const remints = [];
  const results = [];
  let done = 0;
  const total = workSet.length;
  const writeCorpus = () => { if (!opts.dryRun) writeFileSync(opts.corpus, JSON.stringify(recompute([...byId.values()].filter((r) => !drops.has(r.id))), null, 2) + '\n'); };

  await runScheduler(workSet, async (rec) => {
    const res = await recoverOne(ctx, realCtxFactory, rec, opts);
    results.push(res);
    applyResult(byId, res, drops, remints);
    done++;
    if (done % 10 === 0 || done === total) process.stderr.write(`  [${done}/${total}] ${res.status.padEnd(12)} ${(res.newTitle || res.err || '—').slice(0, 60)}\n`);
    if (!opts.dryRun && done % opts.checkpoint === 0) writeCorpus();
    return res;
  }, { maxHosts: 4 });

  await ctx.close().catch(() => {});
  await browser.close().catch(() => {});
  if (realBrowser) await realBrowser.close().catch(() => {});

  writeCorpus();

  const kept = [...byId.values()].filter((r) => !drops.has(r.id));
  // Mirror exactly what writeCorpus persists (project → dedupe by canonical id).
  const finalCorpus = recompute(kept);
  const finalRefs = finalCorpus.references;
  const { collapsed: dedupCollapsed } = dedupeById(kept.map(project));
  const after = junkBreakdown(finalRefs);
  const tally = results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
  const report = {
    generated_for: '260626-af6',
    corpus: opts.corpus,
    counts: { total_before: refs.length, total_after: finalRefs.length, dropped: drops.size, deduped: dedupCollapsed.reduce((s, c) => s + c.dropped, 0) },
    junk_before: before, junk_after: after,
    junk_rate_before: +(100 * before.total_junk / refs.length).toFixed(2),
    junk_rate_after: +(100 * after.total_junk / finalRefs.length).toFixed(2),
    status_tally: tally,
    drop_list: [...drops],
    dedup_collapsed: dedupCollapsed,
    slug_fallback_list: results.filter((r) => r.auditSlug && r.newTitle).map((r) => ({ id: r.id, title: r.newTitle, url: r.url })),
    rate_limited_worklist: results.filter((r) => r.rateLimited).map((r) => r.id),
    id_remints: remints,
    resummarized: results.filter((r) => r.groundedFlip).length,
  };
  writeFileSync(opts.out, JSON.stringify(report, null, 2) + '\n');
  return report;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const opts = parseArgs(process.argv.slice(2));
  backfill(opts).then((rep) => {
    console.log(`backfill done: ${rep.counts.total_before} → ${rep.counts.total_after} records, dropped ${rep.counts.dropped}`);
    console.log(`junk-title rate: ${rep.junk_rate_before}% → ${rep.junk_rate_after}%   (re-summarized ${rep.resummarized}, slug-fallback ${rep.slug_fallback_list.length}, rate-limited ${rep.rate_limited_worklist.length}, id-remints ${rep.id_remints.length})`);
    console.log(`report → ${opts.out}`);
  }).catch((e) => { console.error('backfill FAILED:', e.message || e); process.exit(1); });
}
