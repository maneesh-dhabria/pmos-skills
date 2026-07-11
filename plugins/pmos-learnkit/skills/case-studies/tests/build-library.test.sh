#!/usr/bin/env bash
# build-library.test.sh — the viewer regression gate for /case-studies.
# Runs build-library.mjs --selftest (its own offline-invariant assertions), then builds against
# the REAL shipped corpus and re-asserts the hard constraints at scale.
# Deterministic; bash-3.2-safe; run ≥2× for SIGPIPE robustness.
set -euo pipefail

SRC="${BASH_SOURCE[0]:-$0}"
if [ -n "$SRC" ] && [ -f "$SRC" ]; then
  HERE="$(cd -- "$(dirname -- "$SRC")" && pwd)"
else
  HERE="$PWD"
  while [ "$HERE" != "/" ] && [ ! -f "$HERE/build-library.test.sh" ]; do HERE="$(dirname "$HERE")"; done
  [ -f "$HERE/build-library.test.sh" ] || { echo "cannot locate test dir" >&2; exit 2; }
fi
SK="$(cd -- "$HERE/.." && pwd)"

# 1) the script's own selftest (fixture-level offline invariants)
node "$SK/scripts/build-library.mjs" --selftest

# 2) build against the real 665-record corpus and re-assert at scale
TMP="$(mktemp -t case-studies-lib.XXXXXX).html"
trap 'rm -f "$TMP"' EXIT
node "$SK/scripts/build-library.mjs" --corpus "$SK/data/case-studies.json" --out "$TMP" 2>/dev/null

CORPUS_LEN="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).length)' "$SK/data/case-studies.json")"

node - "$TMP" "$CORPUS_LEN" <<'NODE'
const fs = require('fs');
const [file, wantLen] = [process.argv[2], parseInt(process.argv[3], 10)];
const h = fs.readFileSync(file, 'utf8');
function assert(c, m) { if (!c) { console.error('  FAIL:', m); process.exit(1); } console.log('  ok:', m); }
assert(!/<img\s/i.test(h), 'no <img> tags');
assert(!/<link[^>]+href="https?:/i.test(h), 'no external stylesheet');
assert(!/<script[^>]+src="https?:/i.test(h), 'no external script src');
assert(!/(href|src)="https?:\/\/[^"]*amazonaws/i.test(h), 'no S3/amazonaws asset refs');
assert(!/type=["']module["']/i.test(h), 'no <script type=module>');
const code = h.replace(/<script[^>]*type="application\/json"[^>]*>[\s\S]*?<\/script>/gi, '');
assert(!/\bimport\s+[^;\n]*\bfrom\s+['"]/.test(code), 'no ESM import-from in emitted code');
assert(!/\bexport\s+(default|function|const|let|var|\{)/.test(code), 'no ESM export in emitted code');
const m = h.match(/<script id="lv-data" type="application\/json">([\s\S]*?)<\/script>/);
assert(m, 'lv-data JSON block present');
const data = JSON.parse(m[1].replace(/<\\\/script>/gi, '</script>'));
assert(data.length === wantLen, `DATA length (${data.length}) == corpus length (${wantLen})`);
assert(h.includes('Case Studies Library'), 'PMOS masthead present');
console.log('  real-corpus build: PASS (' + data.length + ' studies)');
NODE

echo "build-library.test.sh: PASS (selftest + real-corpus offline invariants)"
