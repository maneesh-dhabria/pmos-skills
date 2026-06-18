#!/usr/bin/env bash
# tests/run.sh — /summary-tldr test suite (story 260617-xn4).
# Covers: deterministic mode-dispatch (mode.js), mindmap hierarchy normalize+floor
# (mindmap-hierarchy.js), the existing compression model (compression.js), the
# end-to-end hierarchy→/diagram-layout chain, and static SKILL.md contract assertions
# (mode parsing, canonical-first / back-compat invariants, mindmap handoff).
# Pure stdlib (node + bash); no network, no deps. Exit 0 = all green, 1 = any failure.
set -u

# Resolve skill dir robustly (BASH_SOURCE may be empty under `bash -c "source …"` — repo bash rule).
SRC="${BASH_SOURCE[0]:-$0}"
TESTS_DIR="$(cd "$(dirname "$SRC")" && pwd)"
SKILL_DIR="$(cd "$TESTS_DIR/.." && pwd)"
SCRIPTS="$SKILL_DIR/scripts"
SKILL_MD="$SKILL_DIR/SKILL.md"
# /diagram layout module lives in the sibling skill (present in this worktree via the 1aq dep-merge).
LAYOUT="$SKILL_DIR/../diagram/scripts/mindmap-layout.mjs"

pass=0; fail=0
ok()   { pass=$((pass+1)); printf '  ok   %s\n' "$1"; }
bad()  { fail=$((fail+1)); printf '  FAIL %s\n' "$1"; }
check(){ if eval "$2" >/dev/null 2>&1; then ok "$1"; else bad "$1"; fi; }
grep_md(){ if grep -qF -- "$2" "$SKILL_MD"; then ok "$1"; else bad "$1"; fi; }

echo "== script selftests =="
if node "$SCRIPTS/mode.js" --selftest >/dev/null 2>&1; then ok "mode.js --selftest"; else bad "mode.js --selftest"; fi
if node "$SCRIPTS/mindmap-hierarchy.js" --selftest >/dev/null 2>&1; then ok "mindmap-hierarchy.js --selftest"; else bad "mindmap-hierarchy.js --selftest"; fi
if node "$SCRIPTS/compression.js" --selftest >/dev/null 2>&1; then ok "compression.js --selftest (existing, stays green)"; else bad "compression.js --selftest"; fi

echo "== mode.js behavior =="
# default → narrative
out="$(node "$SCRIPTS/mode.js")"
check "default mode is narrative" "echo '$out' | grep -q '\"mode\":\"narrative\"'"
# invalid → exit 64 naming the set
node "$SCRIPTS/mode.js" --mode bogus >/dev/null 2>&1; rc=$?
check "invalid mode exits 64" "[ $rc -eq 64 ]"
err="$(node "$SCRIPTS/mode.js" --mode bogus 2>&1)"
check "invalid mode names the full set" "echo '$err' | grep -q 'narrative|mindmap|video|shorts'"
# mindmap + style → warn, style not applied
out="$(node "$SCRIPTS/mode.js" --mode mindmap --style bullets)"
check "mindmap styleApplies=false" "echo '$out' | grep -q '\"styleApplies\":false'"
check "mindmap+style warns" "echo '$out' | grep -q 'ignored in --mode mindmap'"
# video is now implemented (story gfx); style does not apply
out="$(node "$SCRIPTS/mode.js" --mode video)"
check "video is implemented" "echo '$out' | grep -q '\"status\":\"implemented\"'"
check "video styleApplies=false" "echo '$out' | grep -q '\"styleApplies\":false'"
# shorts still deferred with a note that promises the canonical text
out="$(node "$SCRIPTS/mode.js" --mode shorts)"
check "shorts is deferred" "echo '$out' | grep -q '\"status\":\"deferred\"'"
check "shorts note promises canonical text" "echo '$out' | grep -q 'canonical text'"

echo "== video length mapping (FR-C1/D9) =="
out="$(node "$SCRIPTS/mode.js" --video-length-resolve --compression tight)"
check "tight -> quick" "echo '$out' | grep -q '\"length\":\"quick\"'"
out="$(node "$SCRIPTS/mode.js" --video-length-resolve --compression detailed)"
check "detailed -> deep" "echo '$out' | grep -q '\"length\":\"deep\"'"
out="$(node "$SCRIPTS/mode.js" --video-length-resolve --compression tight --video-length standard)"
check "--video-length override wins" "echo '$out' | grep -q '\"length\":\"standard\".*\"source\":\"override\"'"
# invalid override → exit 64 naming the set
node "$SCRIPTS/mode.js" --video-length-resolve --compression tight --video-length bogus >/dev/null 2>&1; rc=$?
check "invalid --video-length exits 64" "[ $rc -eq 64 ]"
err="$(node "$SCRIPTS/mode.js" --video-length-resolve --compression tight --video-length bogus 2>&1)"
check "invalid --video-length names the set" "echo '$err' | grep -q 'quick|standard|deep'"

echo "== mindmap-hierarchy.js behavior =="
good='{"topic":"Remote Work","branches":[{"label":"Costs","leaves":["40% down","real estate"]},{"label":"Velocity","leaves":["4h to 11h"]},{"label":"Recs","leaves":["hybrid"]}]}'
tree="$(echo "$good" | node "$SCRIPTS/mindmap-hierarchy.js")"
check "good hierarchy normalizes to a tree" "echo '$tree' | grep -q '\"id\":\"remote-work\"'"
check "tree exposes id/label/children only" "echo '$tree' | node -e 'const t=JSON.parse(require(\"fs\").readFileSync(0,\"utf8\"));const ks=new Set();(function w(n){Object.keys(n).forEach(k=>ks.add(k));(n.children||[]).forEach(w)})(t);process.exit([...ks].every(k=>[\"id\",\"label\",\"children\"].includes(k))?0:1)'"
# below-floor → exit 3
echo '{"topic":"Thin","branches":[{"label":"Only","leaves":["a","b","c"]}]}' | node "$SCRIPTS/mindmap-hierarchy.js" >/dev/null 2>&1; rc=$?
check "below-floor degrades (exit 3)" "[ $rc -eq 3 ]"

echo "== end-to-end: hierarchy -> /diagram layout =="
if [ -f "$LAYOUT" ]; then
  pos="$(echo "$good" | node "$SCRIPTS/mindmap-hierarchy.js" | node "$LAYOUT" --layout tree 2>/dev/null)"
  check "layout returns positions for the root" "echo '$pos' | grep -q '\"remote-work\"'"
  check "layout returns bounds" "echo '$pos' | grep -q '\"bounds\"'"
else
  bad "layout module present (expected via 1aq dep-merge at $LAYOUT)"
fi

echo "== SKILL.md contract (back-compat + mode wiring) =="
grep_md "argument-hint lists --mode enum" '[--mode narrative|mindmap|video|shorts]'
grep_md "argument-hint lists --video-length enum" '[--video-length quick|standard|deep]'
grep_md "mode picker has Narrative (Recommended)" 'grounded text TL;DR (Recommended)'
grep_md "mode-render phase anchor present" '{#mode-render}'
grep_md "mindmap-mode sub-anchor present" '{#mindmap-mode}'
grep_md "video-mode sub-anchor present" '{#video-mode}'
grep_md "diagram add-on anchor preserved (back-compat)" '{#diagram}'
grep_md "canonical-first invariant stated (D2/INV3)" 'before any mode rendering'
grep_md "mindmap handoff cites /diagram --mode mindmap" '/diagram --mode mindmap --source'
grep_md "video handoff cites /explainer-video on original source" '/explainer-video <ORIGINAL-SOURCE>'
grep_md "video length resolved via script (§H)" '--video-length-resolve --compression'
grep_md "deterministic mode dispatch via script (§H)" 'scripts/mode.js'
grep_md "hierarchy floor via script (§H)" 'mindmap-hierarchy.js'
grep_md "orthogonal mode/style invariant" 'orthogonal to'

echo
echo "TOTAL: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
