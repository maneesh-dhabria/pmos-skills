#!/usr/bin/env bash
# build-library.test.sh — the /primer browse library generator: --selftest passes; the page
# built against the SHIPPED corpus is single-file/offline, lists all curated primers as cards
# with resolvable links, exposes every facet, and folds in user-generated primers found in the
# output directory under Collection=Yours. Run from anywhere. Deps: bash >= 3.2, node.
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
INDEX="$SKILL_DIR/data/primers-index.json"

if [ "${1:-}" = "--selftest" ]; then
  [ -f "$SCRIPT" ] && echo "SELFTEST PASS: found $SCRIPT" && exit 0
  echo "SELFTEST FAIL: no build-library.mjs at $SCRIPT" >&2; exit 1
fi
[ -f "$SCRIPT" ] || { echo "ERROR: no build-library.mjs at $SCRIPT" >&2; exit 2; }
[ -f "$INDEX" ]  || { echo "ERROR: no primers-index.json at $INDEX (corpus not transplanted?)" >&2; exit 2; }

fail=0
need()   { grep -q -- "$1" "$OUT" || { echo "  FAIL: expected to find: $1" >&2; fail=1; }; }
forbid() { if grep -Eq -- "$1" "$OUT"; then echo "  FAIL: forbidden pattern present: $1" >&2; fail=1; fi; }

# --- substrate consumer: the generator must build on the shared library-viewer engine
#     (not a forked, self-contained copy). The facet/filter/search/sort/view/masthead logic
#     lives in _shared/library-viewer/lib.mjs; primer supplies only the corpus adapter + extras. ---
grep -Eq "_shared/library-viewer/lib\.mjs" "$SCRIPT" \
  || { echo "  FAIL: build-library.mjs does not import the shared library-viewer substrate" >&2; fail=1; }

# --- the generator's own selftest ---
node "$SCRIPT" --selftest >/dev/null || { echo "  FAIL: build-library.mjs --selftest failed" >&2; fail=1; }

# --- build against the SHIPPED corpus into a temp out-dir ---
OUTDIR="$(mktemp -d -t primer-lib.XXXXXX)"
OUT="$OUTDIR/library.html"
trap 'rm -rf "$OUTDIR"' EXIT
node "$SCRIPT" --out "$OUT" >/dev/null

INDEX_N="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).length)' "$INDEX")"

# self-contained / offline (no external asset refs)
forbid '<link[^>]+href="[^d]'             # no external <link> (only inline data: favicon allowed)
forbid '<script[^>]+src='                 # no external script
forbid '(href|src)="https?://'            # no remote refs
forbid '<img '                            # no images (cards are text)

# facet controls + search + applied bar present.
# collection / area / depth stay single-select <select> controls; category + audience are
# now multi-select dropdowns (D4) → assert their data-dd triggers + checkbox item attrs.
need 'id="search"'
need 'id="f-collection"'
need 'id="f-super"'
need 'id="f-depth"'
need 'data-dd="category"'
need 'data-dd="audience"'
need 'id="catSearch"'
need 'id="applied"'
need 'meta name="pmos:skill" content="primer"'
# the retired single-select category/audience <select>s must be gone
forbid 'id="f-category"'
forbid 'id="f-audience"'

# D4 — area valueLabels rename: display label shown, RAW super_category kept as the value
need '<option value="Cross Functional Skills">Cross-Functional Skills</option>'
forbid '<option value="Cross-Functional Skills"'

# D5 — three views present and NOT CSS-hidden (the .viewswitch{display:none} hack is gone)
need 'data-view="compact"'
need 'data-view="detailed"'
need 'data-view="list"'
forbid '\.viewswitch\{display:none\}'

# D3 — in-page iframe reader (not link-out cards): reader.mode plumbed + lazy src + open-in-new-tab + empty-state
need '"mode":"iframe"'
need '"iframeField":"href"'
need 'sandbox="allow-popups allow-popups-to-escape-sandbox"'
forbid 'sandbox="[^"]*allow-same-origin[^"]*allow-scripts'
need 'fr.src=f\[CFG.reader.iframeField\]'
need 'Open in new tab'
need 'reader-empty'
need '"card":{"link":null'

# bug fix — dynamic subtitle count: {count} → an id="subtitleCount" span set from DATA.length
need 'id="subtitleCount"'
forbid '<title>[^<]*[0-9]+ curated'

# cards render client-side from an embedded data block (static container is empty)
need '<div id="groups"></div>'

# data-level assertions via node (count, facet values, link resolution, dual-population)
node - "$OUT" "$INDEX_N" <<'NODE'
const fs = require('fs'), path = require('path');
const [out, indexN] = [process.argv[2], Number(process.argv[3])];
const h = fs.readFileSync(out, 'utf8');
const m = h.match(/<script id="lv-data"[^>]*>([\s\S]*?)<\/script>/);
if (!m) { console.error('  FAIL: no embedded lv-data block'); process.exit(1); }
const data = JSON.parse(m[1]);
let bad = 0;
const curated = data.filter(r => r.collection === 'Curated');
if (curated.length !== indexN) { console.error(`  FAIL: curated cards ${curated.length} != index ${indexN}`); bad = 1; }
const escAttr = (v) => v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
// single-select facets (area / depth): every distinct value appears as an <option> (raw value)
for (const key of ['super_category','depth']) {
  const vals = [...new Set(curated.map(r => r[key]).filter(Boolean))];
  for (const v of vals) {
    if (!h.includes('<option value="' + escAttr(v) + '"')) { console.error(`  FAIL: single-select facet ${key} value not an option: ${v}`); bad = 1; break; }
  }
}
// multi-select dropdowns (category / audience): every distinct value appears as a data-<attr> checkbox
for (const [key, attr] of [['category','data-cat'],['audience','data-aud']]) {
  const vals = [...new Set(curated.map(r => r[key]).filter(Boolean))];
  for (const v of vals) {
    if (!h.includes('<input type="checkbox" ' + attr + '="' + escAttr(v) + '">')) { console.error(`  FAIL: multi-dropdown facet ${key} value not a checkbox: ${v}`); bad = 1; break; }
  }
}
// every curated href resolves on disk relative to the out dir
const outDir = path.dirname(out);
for (const r of curated) {
  if (!fs.existsSync(path.resolve(outDir, r.href))) { console.error(`  FAIL: curated href does not resolve: ${r.href}`); bad = 1; break; }
}
if (bad) process.exit(1);
console.log(`  ok: ${curated.length} curated cards, facets + links verified`);
NODE
[ $? -eq 0 ] || fail=1

# --- dual population: a user-generated primer in the out-dir folds in under Collection=Yours ---
printf '<title>Seeded User Primer</title><h1>x</h1>' > "$OUTDIR/2026-01-01_seeded.html"
node "$SCRIPT" --out "$OUT" >/dev/null
node - "$OUT" <<'NODE'
const fs = require('fs');
const h = fs.readFileSync(process.argv[2], 'utf8');
const data = JSON.parse(h.match(/<script id="lv-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
const yours = data.filter(r => r.collection === 'Yours');
let bad = 0;
if (!yours.some(r => r.title === 'Seeded User Primer' && r.href === '2026-01-01_seeded.html' && r.date === '2026-01-01')) {
  console.error('  FAIL: seeded user primer not folded in under Collection=Yours'); bad = 1;
}
if (data.some(r => r.href === 'library.html')) { console.error('  FAIL: library page listed itself'); bad = 1; }
if (bad) process.exit(1);
console.log(`  ok: dual-population (${yours.length} yours), self-page excluded`);
NODE
[ $? -eq 0 ] || fail=1

if [ "$fail" -ne 0 ]; then echo "build-library.test.sh: FAILED" >&2; exit 1; fi
echo "build-library.test.sh: PASS (selftest, single-file/offline, $INDEX_N curated cards, facets, resolvable links, dual-population)"
