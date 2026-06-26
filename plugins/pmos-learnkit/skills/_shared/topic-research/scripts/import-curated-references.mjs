// import-curated-references.mjs — one-shot importer: spike YAML -> scrubbed JSON.
//
// Design anchors: 02_design.html#a-overlay-file (corpus), #pii-gate (scrub contract),
// #junk-policy (DEAD/WEAK/CLEAN). Zero-dep Node ESM — a minimal hand-rolled YAML reader
// for the flat, known spike shape (D-TOOL: stay Python-free, no npm yaml dep).
//
// Run command (documented; re-run only to refresh the shipped corpus from a new export):
//
//   node plugins/pmos-learnkit/skills/_shared/topic-research/scripts/import-curated-references.mjs \
//     /Users/<you>/Desktop/Projects/personal/notion-writing-backup/spikes/curated-references/curated-references.yaml \
//     plugins/pmos-learnkit/skills/_shared/topic-research/curated-references.json
//
// Both args optional — defaults below. After running, the T1 PII scrub gate
// (tests/test_pii_scrub_gate.sh) must pass GREEN over the produced file.
//
// GENERATION PIPELINE (D3, story 260626-af6). This importer is STEP 1 — it produces the
// scrubbed JSON verbatim from the spike (titles/summaries exactly as the Notion crawl left
// them). STEP 2 is the title + content backfill, which recovers real titles for junk-title
// records and re-summarizes ungrounded ones over a throttled headless-Chromium pass:
//
//   node .../scripts/backfill-titles.mjs .../curated-references.json   # writes back in place
//
// The backfill is idempotent + re-runnable (it only re-touches records still carrying a junk
// title or an ungrounded summary), so a refresh from a new spike export is: import → backfill.
// See scripts/backfill-titles.mjs for the D5/D6/D8/D9 recovery contract.
//
// What it does per record (#pii-gate):
//   - keep ONLY {url,title,source_type,publication_date,tags,summary,summary_grounded};
//   - re-mint id = "ref_" + sha256(url).slice(0,12)  (provably content-derived);
//   - EXCLUDE DEAD entries (title/summary indicates a 404 / page-no-longer-exists);
//   - KEEP WEAK (summary_grounded:false — e.g. auth-walled tweets "could not be
//     retrieved"; the prefilter deprioritizes them, verification re-checks at fetch);
// then recompute meta.counts and set meta.source = "curated-references" (genericised).
//
// Build-time tuning note (#junk-policy): the spike encodes dead pages mostly in TITLES
// ("404 Error", "Page Not Found"). DEAD detection therefore scans title OR summary, with
// a NARROW regex that deliberately excludes the WEAK signals ("could not be retrieved",
// "unavailable", "no longer accessible") so auth-walled-but-live sources survive as WEAK.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DEFAULT_SRC =
  '/Users/maneeshdhabria/Desktop/Projects/personal/notion-writing-backup/spikes/curated-references/curated-references.yaml';
const DEFAULT_OUT = fileURLToPath(new URL('../curated-references.json', import.meta.url));

// DEAD = the page itself is gone. NARROW on purpose — WEAK (auth-wall / "could not be
// retrieved" / "unavailable" / "no longer accessible") is KEPT (summary_grounded:false).
const DEAD_RE = /\b404\b|page not found|no longer exists?\b|\b410\b\s*gone|dead link/i;

function isDead(title, summary) {
  const t = String(title || '');
  const s = String(summary || '');
  return DEAD_RE.test(t) || DEAD_RE.test(s);
}

function refId(url) {
  return 'ref_' + createHash('sha256').update(String(url)).digest('hex').slice(0, 12);
}

// ---- minimal YAML reader for the spike's exact flat shape -------------------
// Records live under a top-level `references:` list. Each record:
//   - id: <plain>                 (0-indent dash; re-minted, value ignored)
//     publication_date: null|'YYYY-MM-DD'
//     source_type: <plain>
//     summary: <plain|single-quoted, may fold across 4-space continuation lines>
//     summary_grounded: true|false
//     tags:                       (2-indent key, empty value -> opens a list)
//     - tag                       (2-indent dash list items)
//     title: <plain|single-quoted, may fold>
//     url: <plain>
// Plain multi-line scalars fold line breaks to a single space (YAML plain folding).

function parseScalar(pieces) {
  const raw = pieces.map((p) => p.trim()).filter((p) => p.length > 0).join(' ').trim();
  if (raw === 'null' || raw === '~' || raw === '') return raw === '' ? '' : null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw.length >= 2 && raw[0] === "'" && raw[raw.length - 1] === "'") {
    return raw.slice(1, -1).replace(/''/g, "'");
  }
  if (raw.length >= 2 && raw[0] === '"' && raw[raw.length - 1] === '"') {
    return raw.slice(1, -1).replace(/\\"/g, '"');
  }
  return raw;
}

function parseReferences(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i].trim() !== 'references:') i++;
  if (i >= lines.length) throw new Error('no top-level `references:` key found in YAML');
  i++; // first record line

  const records = [];
  let cur = null;
  let curField = null;   // scalar field accumulating continuation lines
  let scalarBuf = [];
  let listField = null;  // field accumulating `- ` list items (tags)
  let pendingEmpty = false; // field opened with an empty inline value — list-or-scalar TBD

  const flushScalar = () => {
    if (curField !== null) {
      cur[curField] = parseScalar(scalarBuf);
      curField = null;
      scalarBuf = [];
      pendingEmpty = false;
    }
  };
  const openField = (key, rest) => {
    flushScalar();
    listField = null;
    curField = key;
    // An empty inline value is ambiguous: `tags:` opens a list, but `url:` / `summary:`
    // can carry the value on the next more-indented line. Stay 'pending' until the next
    // line disambiguates (`- item` -> list; 4-space continuation -> next-line scalar).
    scalarBuf = rest === '' ? [] : [rest];
    pendingEmpty = rest === '';
  };

  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      // blank line inside a folded scalar -> paragraph space; otherwise ignore
      if (curField !== null) scalarBuf.push('');
      continue;
    }
    let m;
    if ((m = line.match(/^- (.*)$/))) {
      // new record (0-indent dash); the remainder is the first field "id: value"
      flushScalar();
      listField = null;
      if (cur) records.push(cur);
      cur = {};
      const fm = m[1].match(/^(\w+):(.*)$/);
      if (fm) openField(fm[1], fm[2].trim());
      continue;
    }
    if ((m = line.match(/^  - (.*)$/))) {
      // `- item` at field indent: a pending empty field is actually a list (tags)
      if (curField !== null && pendingEmpty) {
        cur[curField] = [];
        listField = curField;
        curField = null;
        pendingEmpty = false;
      }
      if (listField && Array.isArray(cur[listField])) {
        cur[listField].push(parseScalar([m[1]]));
      }
      continue;
    }
    if ((m = line.match(/^  (\w[\w]*):(.*)$/))) {
      openField(m[1], m[2].trim());
      continue;
    }
    if ((m = line.match(/^    +(.*)$/))) {
      // 4+-space continuation of the current scalar (incl. a next-line scalar value)
      if (curField !== null) {
        scalarBuf.push(m[1]);
        pendingEmpty = false;
      }
      continue;
    }
    // anything else (shouldn't occur for this shape) — ignore defensively
  }
  flushScalar();
  if (cur) records.push(cur);
  return records;
}

// ---- main -------------------------------------------------------------------

function importCorpus(srcPath) {
  const yamlText = readFileSync(srcPath, 'utf8');
  const raw = parseReferences(yamlText);

  const kept = [];
  let dropped = 0;
  for (const r of raw) {
    const url = typeof r.url === 'string' ? r.url.trim() : '';
    if (!url) { dropped++; continue; }
    if (isDead(r.title, r.summary)) { dropped++; continue; }
    const tags = Array.isArray(r.tags) ? r.tags.filter((t) => typeof t === 'string' && t) : [];
    kept.push({
      id: refId(url),
      url,
      title: typeof r.title === 'string' ? r.title : (r.title == null ? '' : String(r.title)),
      source_type: typeof r.source_type === 'string' ? r.source_type : null,
      publication_date: r.publication_date === undefined ? null : r.publication_date,
      tags,
      summary: typeof r.summary === 'string' ? r.summary : (r.summary == null ? '' : String(r.summary)),
      summary_grounded: r.summary_grounded === true,
    });
  }

  // Deterministic order: id ascending (stable git diffs + reproducible runs).
  kept.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const grounded = kept.filter((r) => r.summary_grounded === true).length;
  const weak = kept.length - grounded;

  return {
    meta: {
      schema_version: 1,
      source: 'curated-references',
      counts: { total: kept.length, grounded, weak },
    },
    references: kept,
    _dropped: dropped,
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const src = process.argv[2] || DEFAULT_SRC;
  const out = process.argv[3] || DEFAULT_OUT;
  const corpus = importCorpus(src);
  const dropped = corpus._dropped;
  delete corpus._dropped;
  writeFileSync(out, JSON.stringify(corpus, null, 2) + '\n');
  console.log(`imported ${corpus.references.length} records (${corpus.meta.counts.grounded} grounded, ${corpus.meta.counts.weak} weak); excluded ${dropped} DEAD/urlless`);
  console.log(`wrote ${out}`);
}

export { importCorpus, isDead, refId, parseReferences };
