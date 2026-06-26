// retrieval.mjs — ripgrep+BM25 retrieval over sidecars → heading-path citation anchors
// (Story 260624-1e5, AC2 / D17). Pure Node stdlib.
//
// Index input is PINNED to the structured sidecar fields (title / summary / section summaries /
// glossary), NOT the full verbatim body mirror (02_design.html#open). This keeps the index small
// and the ranking about distilled meaning, and is what makes the engine's Q&A grounded in the
// understanding layer rather than raw text.
//
//   buildIndex(docs)                         -> index
//   search(index, query, {workstream, all})  -> [{doc_id, score, anchor}]  (ranked desc)
//
// A result's `anchor` is a heading-path citation anchor `<doc_id>#<slug|block_id>` (doc-level
// `<doc_id>` when no section matches), with block-ID preference when a section carries one.

const K1 = 1.5;
const B = 0.75;
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'is', 'are', 'for', 'with', 'at']);

function tokenize(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

function termFreq(tokens) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  return tf;
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// The sidecar fields that feed the index (NOT body_md — sidecar-only, #open).
function docIndexText(d) {
  const parts = [d.original_title, d.llm_title, d.summary];
  if (Array.isArray(d.section_summaries)) {
    for (const s of d.section_summaries) parts.push(s.heading, s.summary);
  }
  if (Array.isArray(d.section_offsets)) {
    for (const s of d.section_offsets) parts.push(s.heading);
  }
  if (Array.isArray(d.glossary_terms)) {
    for (const g of d.glossary_terms) parts.push(g.term, g.definition);
  }
  return parts.filter(Boolean).join(' ');
}

// Per-section searchable units → heading-path anchors.
function docSections(d) {
  const out = [];
  const summByHeading = new Map();
  if (Array.isArray(d.section_summaries)) {
    for (const s of d.section_summaries) summByHeading.set(s.heading, s.summary);
  }
  if (Array.isArray(d.section_offsets)) {
    for (const s of d.section_offsets) {
      const text = [s.heading, summByHeading.get(s.heading)].filter(Boolean).join(' ');
      out.push({ heading: s.heading, block_id: s.block_id || null, tokens: termFreq(tokenize(text)) });
    }
  } else if (Array.isArray(d.section_summaries)) {
    for (const s of d.section_summaries) {
      out.push({ heading: s.heading, block_id: null, tokens: termFreq(tokenize([s.heading, s.summary].join(' '))) });
    }
  }
  return out;
}

/**
 * @param {object[]} docs corpus sidecar docs
 * @returns {{docs:Array, df:Map<string,number>, N:number, avgdl:number}}
 */
export function buildIndex(docs) {
  const indexed = (docs || []).map((d) => {
    const tokens = tokenize(docIndexText(d));
    return {
      doc_id: d.id,
      workstream: d.workstream ?? null,
      tf: termFreq(tokens),
      len: tokens.length,
      sections: docSections(d),
    };
  });
  const df = new Map();
  for (const d of indexed) {
    for (const term of d.tf.keys()) df.set(term, (df.get(term) || 0) + 1);
  }
  const N = indexed.length || 1;
  const avgdl = indexed.reduce((n, d) => n + d.len, 0) / N || 1;
  return { docs: indexed, df, N, avgdl };
}

function idf(df, N) {
  return Math.log(1 + (N - df + 0.5) / (df + 0.5));
}

function bm25(queryTerms, tf, len, index) {
  let score = 0;
  for (const term of queryTerms) {
    const f = tf.get(term) || 0;
    if (!f) continue;
    const df = index.df.get(term) || 0;
    const denom = f + K1 * (1 - B + B * (len / index.avgdl));
    score += idf(df, index.N) * (f * (K1 + 1)) / denom;
  }
  return score;
}

/**
 * @param {object} index from buildIndex
 * @param {string} query
 * @param {{workstream?:string|null, all?:boolean}} [opts]
 * @returns {Array<{doc_id:string, score:number, anchor:string}>} ranked desc
 */
export function search(index, query, opts = {}) {
  const qTerms = [...new Set(tokenize(query))];
  if (!qTerms.length) return [];
  const scopeWs = opts.workstream && !opts.all ? opts.workstream : null;

  const results = [];
  for (const d of index.docs) {
    if (scopeWs && d.workstream !== scopeWs) continue;
    const score = bm25(qTerms, d.tf, d.len, index);
    if (score <= 0) continue; // ripgrep-style candidate gather: no query term present → not a hit

    // Heading-path anchor: best-matching section, block-ID preferred.
    let bestSec = null;
    let bestSecScore = 0;
    for (const sec of d.sections) {
      const ss = bm25(qTerms, sec.tokens, [...sec.tokens.values()].reduce((a, b) => a + b, 0) || 1, index);
      if (ss > bestSecScore) { bestSecScore = ss; bestSec = sec; }
    }
    let anchor = d.doc_id;
    if (bestSec) anchor = `${d.doc_id}#${bestSec.block_id || slug(bestSec.heading)}`;
    results.push({ doc_id: d.doc_id, score, anchor });
  }
  // Rank desc; ties broken by doc_id asc for determinism.
  results.sort((a, b) => (b.score - a.score) || (a.doc_id < b.doc_id ? -1 : a.doc_id > b.doc_id ? 1 : 0));
  return results;
}

export default { buildIndex, search };
