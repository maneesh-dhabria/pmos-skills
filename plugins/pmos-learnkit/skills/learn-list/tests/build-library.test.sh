#!/usr/bin/env bash
# build-library.test.sh — the /learn-list reference viewer generator. Asserts the page built
# from a fixture corpus is self-contained / offline (no external http(s) asset refs), renders a
# card per record (title + url) from the curated-references corpus through the shared
# library-viewer substrate, exposes facets (source_type / tags / publication-year), a
# title+summary search, a reader/detail affordance, applied-filter chips + masthead — AND
# enforces the corpus field-allowlist (NO notion-specific field reaches the DOM) + a graceful
# empty-state when the corpus is absent. Mirrors frameworks/tests/build-library.test.sh.
# bash-3.2 safe. Deps: bash >= 3.2, node.
set -euo pipefail

# Resolve this script's dir with a BASH_SOURCE fallback (repo bash-portability rule).
SRC="${BASH_SOURCE[0]:-$0}"
if [ -n "$SRC" ] && [ -f "$SRC" ]; then
  HERE="$(cd -- "$(dirname -- "$SRC")" && pwd)"
else
  HERE="$PWD"
  while [ "$HERE" != "/" ] && [ ! -f "$HERE/build-library.test.sh" ]; do HERE="$(dirname "$HERE")"; done
  [ -f "$HERE/build-library.test.sh" ] || { echo "cannot locate test dir" >&2; exit 2; }
fi
SKILL_DIR="$(cd -- "$HERE/.." && pwd)"
SCRIPT="$SKILL_DIR/scripts/build-library.mjs"
FIX="$HERE/fixtures/mini-corpus.json"

[ -f "$SCRIPT" ] || { echo "ERROR: no build-library.mjs at $SCRIPT" >&2; exit 2; }
[ -f "$FIX" ]    || { echo "ERROR: no fixture corpus at $FIX" >&2; exit 2; }

fail=0
need()   { grep -q -- "$1" "$OUT" || { echo "  FAIL: expected to find: $1" >&2; fail=1; }; }
needE()  { grep -Eq -- "$1" "$OUT" || { echo "  FAIL: expected to find (regex): $1" >&2; fail=1; }; }
forbid() { if grep -Eqi -- "$1" "$OUT"; then echo "  FAIL: forbidden pattern present: $1" >&2; fail=1; fi; }

# --- substrate consumer: the generator must build on the shared library-viewer engine
#     (not a forked, self-contained copy). The facet/filter/search/sort/view/masthead logic
#     lives in _shared/library-viewer/lib.mjs; learn-list supplies only the corpus adapter. ---
grep -Eq "_shared/library-viewer/lib\.mjs" "$SCRIPT" \
  || { echo "  FAIL: build-library.mjs does not import the shared library-viewer substrate" >&2; fail=1; }

# --- the generator's own selftest ---
node "$SCRIPT" --selftest >/dev/null || { echo "  FAIL: build-library.mjs --selftest failed" >&2; fail=1; }

# === (T2) BUILD OFFLINE + CORPUS RENDERS + FACETS + SEARCH + READER + CHIPS/MASTHEAD ===
OUT="$(mktemp -t ll-lib.XXXXXX).html"
trap 'rm -f "$OUT" "$OUT.tmp" "$EMPTY" "$EMPTY.tmp"' EXIT
node "$SCRIPT" --out "$OUT" --corpus "$FIX" >/dev/null

# (a) self-contained / offline: no external http(s) asset refs (inline CSS + JS only)
forbid '<link[^>]+href="https?:'        # no external stylesheet
forbid '<script[^>]+src='               # no external script
forbid '(href|src)="https?://[^"]*\.(css|js)'  # no remote css/js
forbid '<img '                          # cards are text — no <img>

# (c) FACETS — source_type, tags, publication-year controls present
need 'id="search"'
need 'id="f-source"'                    # source_type single-select facet
need 'id="f-year"'                      # publication-year single-select facet
need 'data-dd="tags"'                   # tags multi-select dropdown trigger
# (d) SEARCH over title + summary
need 'id="search"'
# (f) APPLIED-FILTER CHIPS + MASTHEAD
need 'id="applied"'
need 'data-clear-all'
need 'class="wordmark"'
need 'Reference Library'
need 'meta name="pmos:skill" content="learn-list"'

# (b) CORPUS RENDERS + (e) READER — assert via the embedded lv-data block (cards render client-side)
node - "$OUT" <<'NODE'
const fs = require('fs');
const h = fs.readFileSync(process.argv[2], 'utf8');
const m = h.match(/<script id="lv-data"[^>]*>([\s\S]*?)<\/script>/);
if (!m) { console.error('  FAIL: no embedded lv-data block'); process.exit(1); }
const data = JSON.parse(m[1]);
let bad = 0;
if (data.length !== 3) { console.error(`  FAIL: expected 3 cards, got ${data.length}`); bad = 1; }
// every card has a title + a resolvable source url (T2 b: "title + url present")
for (const c of data) {
  if (!c.title) { console.error(`  FAIL: card missing title: ${c.id}`); bad = 1; break; }
  const url = c.url || (c.references && c.references[0] && c.references[0].url);
  if (!/^https?:\/\//.test(url || '')) { console.error(`  FAIL: card missing http url: ${c.id}`); bad = 1; break; }
}
// (e) reader/detail: each card carries a body for the sidebar reader
if (!data.every((c) => typeof c.body_html === 'string')) { console.error('  FAIL: cards lack reader body_html'); bad = 1; }
// year facet derived from publication_date
if (!data.some((c) => c.year === '2019') || !data.some((c) => c.year === '2023')) { console.error('  FAIL: publication-year not derived'); bad = 1; }
if (bad) process.exit(1);
console.log('  ok: 3 cards w/ title+url+reader body, year derived');
NODE
[ $? -eq 0 ] || fail=1

# the facet option values appear in the rendered controls
need '<option value="article">'
need '<option value="video">'
needE '<option value="2019">'

# === (T3) PII NO-NEW-FIELD GATE — only allowlisted fields reach the DOM ===
# The poison fixture record carries forbidden Notion keys; the adapter MUST whitelist, so NO
# notion-specific FIELD may reach the DOM. We assert on the field-KEY form ("page_id":) and the
# planted leak VALUE sentinel — NOT bare words, since "workspace"/"snapshot"/"occurrence" are
# ordinary English that legitimately appears in titles/summaries (see DOGFOOD note). The
# precise no-field-leak check (embedded card keys ⊆ allowlist) is asserted in node below.
forbid '"page_id"'
forbid '"database_id"'
forbid '"occurrence"'
forbid '"snapshot"'
forbid '"workspace"'
forbid '"notion_'
forbid '_LEAK_'                          # the planted leak VALUE sentinel — belt and suspenders

# precise contract: every embedded card exposes ONLY allowlist-derived fields (no notion key).
node - "$OUT" <<'NODE'
const fs = require('fs');
const ALLOWED = new Set(['id','title','url','source_type','publication_date','year','tags','grounded','summary','body_html','references']);
const h = fs.readFileSync(process.argv[2], 'utf8');
const data = JSON.parse(h.match(/<script id="lv-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
let bad = 0;
for (const c of data) {
  for (const k of Object.keys(c)) {
    if (!ALLOWED.has(k)) { console.error(`  FAIL: card ${c.id} exposes non-allowlisted field: ${k}`); bad = 1; }
  }
}
if (bad) process.exit(1);
console.log('  ok: every card exposes only allowlist-derived fields');
NODE
[ $? -eq 0 ] || fail=1

# === (T4) GRACEFUL DEGRADE — corpus absent → exit 0 + visible empty-state, no card ===
EMPTY="$(mktemp -t ll-empty.XXXXXX).html"
set +e
node "$SCRIPT" --out "$EMPTY" --corpus "/nonexistent/curated-references.json" >/dev/null 2>&1
rc=$?
set -e
[ "$rc" -eq 0 ] || { echo "  FAIL: missing-corpus build exited $rc (expected 0 — must degrade, not crash)" >&2; fail=1; }
if [ -f "$EMPTY" ]; then
  grep -qi 'no curated references found' "$EMPTY" || { echo "  FAIL: empty-state marker absent when corpus missing" >&2; fail=1; }
  # no real cards embedded
  node - "$EMPTY" <<'NODE'
const fs = require('fs');
const h = fs.readFileSync(process.argv[2], 'utf8');
const m = h.match(/<script id="lv-data"[^>]*>([\s\S]*?)<\/script>/);
const data = m ? JSON.parse(m[1]) : [];
if (data.length !== 0) { console.error(`  FAIL: empty corpus still embedded ${data.length} cards`); process.exit(1); }
console.log('  ok: empty corpus → 0 cards + empty-state');
NODE
  [ $? -eq 0 ] || fail=1
else
  echo "  FAIL: missing-corpus build produced no output file" >&2; fail=1
fi

if [ "$fail" -ne 0 ]; then echo "build-library.test.sh: FAILED" >&2; exit 1; fi
echo "build-library.test.sh: PASS (offline, 3 cards, facets+search+reader+chips+masthead, PII allowlist, graceful empty-state)"
