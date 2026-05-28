#!/usr/bin/env bash
# test-emit-findings.sh — T8 unit tests for scripts/emit-findings.js
#
# Asserts:
#   - feeds 3-finding fixture (from-spec mode) through emit-findings.js
#   - .json, .html, .md files all written
#   - JSON parses to length 3, each item has all 7 §9.3 keys
#   - HTML contains <meta name="pmos:skill" content="architecture">
#   - HTML contains one <section> per finding with the quote rendered
#   - MD contains "## Finding 1" through "## Finding 3"
#   - schema round-trip: re-parse JSON → identical to input

set -u
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
EMITTER="$SKILL_DIR/scripts/emit-findings.js"

PREFIX="/tmp/test-emit-findings_from-spec"
SOURCE_PATH="/tmp/dummy-source.html"

FAIL=0
PASS=0

assert() {
  local desc="$1"; local cond="$2"
  if eval "$cond"; then
    echo "  PASS: $desc"
    PASS=$((PASS+1))
  else
    echo "  FAIL: $desc  (cond: $cond)"
    FAIL=$((FAIL+1))
  fi
}

# Cleanup any prior run
rm -f "$PREFIX".{json,html,md} "$PREFIX".*.tmp.* 2>/dev/null || true
echo "<html><body>dummy spec source</body></html>" > "$SOURCE_PATH"

# 3-finding fixture (from-spec → spec_section_id, not file_path)
FIXTURE='[
  {
    "rule_id": "U001",
    "severity": "must_fix",
    "confidence": 92,
    "spec_section_id": "system-design",
    "quote": "the system shall use a layered architecture with no upward dependencies between layers",
    "finding": "Layer-1 service imports a layer-2 controller, inverting the dependency direction.",
    "recommendation": "Move the shared interface into a layer-0 contracts package and re-export from both sides."
  },
  {
    "rule_id": "U007",
    "severity": "should_fix",
    "confidence": 70,
    "spec_section_id": "modules",
    "quote": "every module declared in the modules table must list its direct dependencies explicitly",
    "finding": "Module M3 is declared but lists no dependencies despite calling M1 transitively at runtime.",
    "recommendation": "Add M1 to the M3 deps cell to make the cross-module call visible to the audit."
  },
  {
    "rule_id": "U012",
    "severity": "wont_fix",
    "confidence": 55,
    "spec_section_id": "api-contracts",
    "quote": "all public API endpoints must include explicit request and response schemas in the contract",
    "finding": "Endpoint POST /webhook lacks an explicit response schema (returns empty 204).",
    "recommendation": "Document the 204-no-body contract inline so the omission is intentional, not missing."
  }
]'

echo "[run] piping fixture to emit-findings.js..."
set +e
echo "$FIXTURE" | node "$EMITTER" \
  --out-prefix "$PREFIX" \
  --mode from-spec \
  --source-path "$SOURCE_PATH"
RC=$?
set -e
assert "emitter exits 0" "[ '$RC' -eq 0 ]"

# Files exist
assert "json file exists"  "[ -s '$PREFIX.json' ]"
assert "html file exists"  "[ -s '$PREFIX.html' ]"
assert "md file exists"    "[ -s '$PREFIX.md' ]"

# JSON shape
assert "json parses to length 3" "node -e 'const a=JSON.parse(require(\"fs\").readFileSync(\"'$PREFIX'.json\",\"utf8\"));process.exit(Array.isArray(a)&&a.length===3?0:1)'"

# Every finding has all 7 keys (mode=from-spec → spec_section_id, not file_path)
assert "every finding has 7 required §9.3 keys" "node -e '
const a=JSON.parse(require(\"fs\").readFileSync(\"'$PREFIX'.json\",\"utf8\"));
const keys=[\"rule_id\",\"severity\",\"confidence\",\"spec_section_id\",\"quote\",\"finding\",\"recommendation\"];
for (const f of a){ for (const k of keys){ if (!(k in f)){ console.error(\"missing\",k); process.exit(1);} } }
process.exit(0)'"

# HTML head meta
assert "html has <meta name=pmos:skill content=architecture>" "grep -q '<meta name=\"pmos:skill\" content=\"architecture\">' '$PREFIX.html'"

# HTML has one <section> per finding rendering the quote
for i in 1 2 3; do
  Q=$(node -e 'console.log(JSON.parse(require("fs").readFileSync("'$PREFIX'.json","utf8"))['$((i-1))'].quote)')
  assert "html renders finding $i quote substring" "grep -qF \"\${Q:0:40}\" '$PREFIX.html'"
done

# section count: at least 3
assert "html has >= 3 <section> tags" "[ \"\$(grep -c '<section' '$PREFIX.html')\" -ge 3 ]"

# MD headings
assert "md has '## Finding 1'" "grep -q '^## Finding 1' '$PREFIX.md'"
assert "md has '## Finding 2'" "grep -q '^## Finding 2' '$PREFIX.md'"
assert "md has '## Finding 3'" "grep -q '^## Finding 3' '$PREFIX.md'"

# Schema round-trip: every finding key/value identical. Write the fixture to a
# tempfile so the assert subshell doesn't mangle embedded newlines/quotes.
FIX_FILE="$(mktemp)"
printf '%s' "$FIXTURE" > "$FIX_FILE"
assert "schema round-trip is exact" "node -e '
const fs=require(\"fs\");
const inp=JSON.parse(fs.readFileSync(\"'$FIX_FILE'\",\"utf8\"));
const out=JSON.parse(fs.readFileSync(\"'$PREFIX'.json\",\"utf8\"));
if (inp.length!==out.length) process.exit(1);
for (let i=0;i<inp.length;i++){
  const a=inp[i], b=out[i];
  for (const k of Object.keys(a)){ if (JSON.stringify(a[k])!==JSON.stringify(b[k])){ console.error(\"mismatch\",i,k);process.exit(1);} }
}
process.exit(0)'"
rm -f "$FIX_FILE"

# No leftover temp files
assert "no leftover .tmp.* files" "[ -z \"\$(ls $PREFIX.*.tmp.* 2>/dev/null)\" ]"

# Same-day overwrite (E6): re-run, should succeed without error
echo "[run] re-running for E6 same-day overwrite..."
set +e
echo "$FIXTURE" | node "$EMITTER" --out-prefix "$PREFIX" --mode from-spec --source-path "$SOURCE_PATH"
RC2=$?
set -e
assert "second run exits 0 (same-day overwrite per E6)" "[ '$RC2' -eq 0 ]"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
