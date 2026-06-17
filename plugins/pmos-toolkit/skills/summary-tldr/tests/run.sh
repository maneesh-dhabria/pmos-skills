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
grep_md(){ if grep -qF "$2" "$SKILL_MD"; then ok "$1"; else bad "$1"; fi; }

echo "== script selftests =="
if node "$SCRIPTS/mode.js" --selftest >/dev/null 2>&1; then ok "mode.js --selftest"; else bad "mode.js --selftest"; fi
if node "$SCRIPTS/mindmap-hierarchy.js" --selftest >/dev/null 2>&1; then ok "mindmap-hierarchy.js --selftest"; else bad "mindmap-hierarchy.js --selftest"; fi
if node "$SCRIPTS/compression.js" --selftest >/dev/null 2>&1; then ok "compression.js --selftest (existing, stays green)"; else bad "compression.js --selftest"; fi
if node "$SCRIPTS/shorts.js" --selftest >/dev/null 2>&1; then ok "shorts.js --selftest"; else bad "shorts.js --selftest"; fi

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
# shorts is now implemented (story wf6); style does not apply
out="$(node "$SCRIPTS/mode.js" --mode shorts)"
check "shorts is implemented" "echo '$out' | grep -q '\"status\":\"implemented\"'"
check "shorts styleApplies=false" "echo '$out' | grep -q '\"styleApplies\":false'"
# video still deferred with a note that promises the canonical text
out="$(node "$SCRIPTS/mode.js" --mode video)"
check "video is deferred" "echo '$out' | grep -q '\"status\":\"deferred\"'"
check "video note promises canonical text" "echo '$out' | grep -q 'canonical text'"

echo "== shorts.js card derivation + media pairing (FR-D1/D3/D7/D8/D12) =="
cards_model='{"topic":"Remote Work","cards":[{"text":"Office costs fell 40% after the remote shift.","keyfact":"office real-estate costs down 40 percent"},{"text":"Code-review turnaround grew from 4h to 11h.","keyfact":"code review velocity turnaround hours"},{"text":"Adopt a hybrid schedule.","keyfact":"hybrid schedule recommendation"}]}'
cards="$(echo "$cards_model" | node "$SCRIPTS/shorts.js" --derive-cards)"
check "derive: stable card ids" "echo '$cards' | grep -q '\"id\":\"card-1\"'"
# over-limit card → exit 4 (re-derive, never truncate)
longtext="$(printf 'x%.0s' $(seq 1 141))"
echo "{\"topic\":\"t\",\"cards\":[{\"text\":\"$longtext\",\"keyfact\":\"k\"},{\"text\":\"ok\",\"keyfact\":\"k\"}]}" | node "$SCRIPTS/shorts.js" --derive-cards >/dev/null 2>&1; rc=$?
check "over-140 card exits 4 (no truncation)" "[ $rc -eq 4 ]"
# below ≥2 floor → exit 3 (degrade)
echo '{"topic":"t","cards":[{"text":"only one card","keyfact":"k"}]}' | node "$SCRIPTS/shorts.js" --derive-cards >/dev/null 2>&1; rc=$?
check "below ≥2-card floor exits 3 (degrade)" "[ $rc -eq 3 ]"
# media pairing: relevant figure attaches; unrelated does not
inv="$(mktemp)"; printf '[{"id":"fig_1","source_ref":"costs.png","kind":"img","alt":"Office real-estate costs chart 40 percent decline"}]' > "$inv"
paired="$(echo "$cards" | node "$SCRIPTS/shorts.js" --pair-media --inventory "$inv")"
check "pair-media attaches the relevant figure to card 1" "echo '$paired' | grep -q 'costs.png'"
unrel="$(mktemp)"; printf '[{"id":"fig_x","source_ref":"cat.png","kind":"img","alt":"A photo of a sleeping cat"}]' > "$unrel"
paired2="$(echo "$cards" | node "$SCRIPTS/shorts.js" --pair-media --inventory "$unrel")"
check "pair-media never force-attaches an unrelated figure" "! echo '$paired2' | grep -q 'cat.png'"
# emit: self-contained carousel carries the comments hooks + meta + carousel JS
emit_out="$(mktemp -u).html"; meta="$(mktemp)"
printf '{"title":"Remote Work","canonical_href":"./c.html","plugin_version":"0.0.0"}' > "$meta"
echo "$paired" > "$inv.cards"
node "$SCRIPTS/shorts.js" --emit --cards "$inv.cards" --meta "$meta" --out "$emit_out" >/dev/null 2>&1
check "emit: writes the carousel file" "[ -f '$emit_out' ]"
check "emit: carries pmos:skill meta" "grep -q 'pmos:skill\" content=\"summary-tldr\"' '$emit_out'"
check "emit: carries inline pmos-comments block" "grep -q 'pmos-comments:start' '$emit_out'"
check "emit: carousel JS embedded (swipe/keyboard)" "grep -q 'shorts-track' '$emit_out'"
check "emit: self-contained (no external stylesheet link)" "! grep -qiE '<link[^>]*stylesheet' '$emit_out'"
rm -f "$inv" "$inv.cards" "$unrel" "$meta" "$emit_out"

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
grep_md "mode picker has Narrative (Recommended)" 'grounded text TL;DR (Recommended)'
grep_md "mode-render phase anchor present" '{#mode-render}'
grep_md "mindmap-mode sub-anchor present" '{#mindmap-mode}'
grep_md "shorts-mode sub-anchor present" '{#shorts-mode}'
grep_md "diagram add-on anchor preserved (back-compat)" '{#diagram}'
grep_md "canonical-first invariant stated (D2/INV3)" 'before any mode rendering'
grep_md "mindmap handoff cites /diagram --mode mindmap" '/diagram --mode mindmap --source'
grep_md "shorts derives cards via script (§H)" 'shorts.js --derive-cards'
grep_md "shorts pairs media via script (§H)" 'shorts.js --pair-media'
grep_md "shorts reuses explainer-video ingest.mjs (INV5)" 'explainer-video/scripts/ingest.mjs'
grep_md "shorts cites the card-carousel guidelines ref" 'reference/card-carousel-guidelines.md'

echo "== no specific app named anywhere in the skill or its output (maintainer rule) =="
# The bite-size card-story genre is studied as a FORM; no product is ever named.
# These are the forbidden brand names this guard scans the skill surface + emitted output for.
FORBIDDEN='Snapchat|Snap Discover|Instagram Stories|TikTok|Google Web Stories|AMP Stories|Flipboard|Apple News'
SCAN_TARGETS="$SKILL_DIR/SKILL.md $SKILL_DIR/reference/card-carousel-guidelines.md $SCRIPTS/shorts.js"
if grep -rEi "$FORBIDDEN" $SCAN_TARGETS >/dev/null 2>&1; then bad "no forbidden app name in skill surface"; else ok "no forbidden app name in skill surface"; fi
# also scan a freshly emitted carousel (the OUTPUT)
em="$(mktemp -u).html"; mt="$(mktemp)"; cm="$(mktemp)"
printf '{"title":"Sample","canonical_href":"./c.html","plugin_version":"0.0.0"}' > "$mt"
echo '{"topic":"Sample","cards":[{"text":"First takeaway asserts a real claim.","keyfact":"k1"},{"text":"Second takeaway asserts another.","keyfact":"k2"}]}' | node "$SCRIPTS/shorts.js" --derive-cards > "$cm"
node "$SCRIPTS/shorts.js" --emit --cards "$cm" --meta "$mt" --out "$em" >/dev/null 2>&1
if grep -Ei "$FORBIDDEN" "$em" >/dev/null 2>&1; then bad "no forbidden app name in emitted carousel"; else ok "no forbidden app name in emitted carousel"; fi
rm -f "$em" "$mt" "$cm"
grep_md "deterministic mode dispatch via script (§H)" 'scripts/mode.js'
grep_md "hierarchy floor via script (§H)" 'mindmap-hierarchy.js'
grep_md "orthogonal mode/style invariant" 'orthogonal to'

echo
echo "TOTAL: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
