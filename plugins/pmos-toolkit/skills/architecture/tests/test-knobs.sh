#!/usr/bin/env bash
# T7 — apply-knobs.js behavioral test
# Asserts: --top-n 8 --min-confidence 70 --evidence-required → 8 survivors,
# every conf >= 70, every entry has quote, sort = must_fix(conf desc) → should_fix(conf desc) → wont_fix(conf desc).
# Edge: empty input → []; all-below-threshold input → [].
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
APPLY="${SKILL_DIR}/scripts/apply-knobs.js"
FIXTURE="${SCRIPT_DIR}/fixtures/judge-output-15-findings.json"

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "PASS: $*"; }

[[ -f "$APPLY" ]] || fail "apply-knobs.js not found at $APPLY"
[[ -f "$FIXTURE" ]] || fail "fixture not found at $FIXTURE"

# --- Test 1: main pipeline ---
OUT="$(node "$APPLY" --top-n 8 --min-confidence 70 --evidence-required < "$FIXTURE")"

# Length == 8
LEN="$(echo "$OUT" | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>console.log(JSON.parse(s).length))')"
[[ "$LEN" == "8" ]] || fail "expected length 8, got $LEN"
pass "length == 8"

# Every entry confidence >= 70
MIN_CONF="$(echo "$OUT" | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{const a=JSON.parse(s);console.log(Math.min(...a.map(x=>x.confidence)))})')"
(( MIN_CONF >= 70 )) || fail "min confidence $MIN_CONF < 70"
pass "all confidence >= 70"

# Every entry has quote (non-empty, >=40 chars)
MISSING="$(echo "$OUT" | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{const a=JSON.parse(s);console.log(a.filter(x=>!x.quote||x.quote.length<40).length)})')"
[[ "$MISSING" == "0" ]] || fail "expected 0 missing/short quotes, got $MISSING"
pass "all entries have valid quote (>=40 chars)"

# Sort order: must_fix→should_fix→wont_fix; ties by confidence desc
SORTED_OK="$(echo "$OUT" | node -e '
let s=""; process.stdin.on("data",c=>s+=c).on("end",()=>{
  const a=JSON.parse(s);
  const rank={must_fix:0,should_fix:1,wont_fix:2};
  for(let i=0;i<a.length-1;i++){
    const r1=rank[a[i].severity], r2=rank[a[i+1].severity];
    if(r1>r2){console.log("BAD:severity@"+i);process.exit(0)}
    if(r1===r2 && a[i].confidence<a[i+1].confidence){console.log("BAD:conf@"+i);process.exit(0)}
  }
  console.log("OK");
})')"
[[ "$SORTED_OK" == "OK" ]] || fail "sort order violated: $SORTED_OK"
pass "sort order: must_fix→should_fix→wont_fix, ties by confidence desc"

# Spot-check head: must_fix/90 first, wont_fix/80 last
HEAD="$(echo "$OUT" | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{const a=JSON.parse(s);console.log(a[0].severity+"/"+a[0].confidence+" "+a[a.length-1].severity+"/"+a[a.length-1].confidence)})')"
[[ "$HEAD" == "must_fix/90 wont_fix/80" ]] || fail "head/tail mismatch: $HEAD"
pass "head=must_fix/90, tail=wont_fix/80"

# --- Test 2: empty input ---
EMPTY_OUT="$(echo '[]' | node "$APPLY" --top-n 8 --min-confidence 70 --evidence-required)"
[[ "$EMPTY_OUT" == "[]" ]] || fail "empty input → expected '[]', got '$EMPTY_OUT'"
pass "empty array → []"

# --- Test 3: all below threshold ---
BELOW='[{"rule_id":"X1","severity":"must_fix","confidence":50,"quote":"abcdefghijklmnopqrstuvwxyzabcdefghijklmn","finding":"f","recommendation":"r"},{"rule_id":"X2","severity":"should_fix","confidence":40,"quote":"abcdefghijklmnopqrstuvwxyzabcdefghijklmn","finding":"f","recommendation":"r"},{"rule_id":"X3","severity":"wont_fix","confidence":30,"quote":"abcdefghijklmnopqrstuvwxyzabcdefghijklmn","finding":"f","recommendation":"r"}]'
BELOW_OUT="$(echo "$BELOW" | node "$APPLY" --top-n 8 --min-confidence 70 --evidence-required)"
[[ "$BELOW_OUT" == "[]" ]] || fail "all-below-threshold → expected '[]', got '$BELOW_OUT'"
pass "all-below-threshold → []"

echo
echo "ALL TESTS PASSED"
