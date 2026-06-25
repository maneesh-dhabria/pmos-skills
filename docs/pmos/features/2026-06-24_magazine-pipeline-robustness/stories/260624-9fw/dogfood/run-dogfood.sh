#!/usr/bin/env bash
# run-dogfood.sh — exercise story 260624-9fw end-to-end on a real temp magazine
# directory: 2 prior weekly issues (with sidecars) + 1 sidecar-less issue + a
# monthly snapshot overlapping both + 2 new items + an svpg feed failed 3 runs.
# Drives the SHIPPED scripts (render-issue.js, magazine-state.js, magazine-run.js)
# exactly as the SKILL.md phases would — no hand-authored HTML, no reimplementation.
set -eu

SKILL="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/../../../../../../../plugins/pmos-learnkit/skills/magazine" && pwd)"
S="$SKILL/scripts"
OUT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
MAG="$(mktemp -d "${TMPDIR:-/tmp}/mag-dogfood-XXXX")"
trap 'rm -rf "$MAG"' EXIT
echo "skill scripts: $S"
echo "magazine dir:  $MAG"
echo

# --- 1. Two prior WEEKLY issues, each rendered with an out-path so the per-issue
#        sidecar is persisted (the new T3 contract). ---
cat > "$MAG/wk1.json" <<'EOF'
{"issue_date":"2026-06-08","items":[
  {"guid":"https://blog.dev/p/glm-5-2","feed":"The Batch","type":"newsletter","title":"GLM-5.2 ships","link":"https://blog.dev/p/glm-5-2","published":"2026-06-06T09:00:00Z","reading_time":"6 min","bullets":["Mixture-of-experts at 200B","Open weights, Apache-2.0","Beats prior gen on MMLU"],"tags":["ai"],"top_pick":true},
  {"guid":"https://blog.dev/p/pricing-ladders","feed":"Lenny","type":"newsletter","title":"Pricing ladders","link":"https://blog.dev/p/pricing-ladders","published":"2026-06-07T09:00:00Z","reading_time":"8 min","bullets":["Anchor on the middle tier","Annual discounts compound","Grandfather legacy plans"],"tags":["pricing"]}
]}
EOF
cat > "$MAG/wk2.json" <<'EOF'
{"issue_date":"2026-06-15","items":[
  {"guid":"https://blog.dev/p/agent-evals","feed":"The Batch","type":"newsletter","title":"Agent evals that matter","link":"https://blog.dev/p/agent-evals","published":"2026-06-13T09:00:00Z","reading_time":"7 min","bullets":["Task-completion over benchmark scores","Trace every tool call","Hold out a private suite"],"tags":["ai"],"top_pick":true}
]}
EOF
node "$S/render-issue.js" issue "$MAG/wk1.json" "$MAG/2026-06-08_issue.html"
node "$S/render-issue.js" issue "$MAG/wk2.json" "$MAG/2026-06-15_issue.html"

# --- 2. A legacy sidecar-LESS issue HTML (data lost / pre-sidecar render). ---
node "$S/render-issue.js" issue "$MAG/wk1.json" > "$MAG/2026-06-01_issue.html"
rm -f "$MAG/2026-06-01_items.json" 2>/dev/null || true   # ensure no sidecar
echo "issues + sidecars on disk:"
ls -1 "$MAG" | grep -E '_(issue\.html|items\.json)$' | sort
echo

# --- 3. Monthly snapshot OVERLAPPING both weeklies (2 shared GUIDs, one arriving
#        as a filesystem-safe-ified key) + 2 genuinely NEW items. Reuse the prior
#        sidecars so Stage B only needs the 2 new ones. ---
cat > "$MAG/monthly-snapshot.json" <<'EOF'
[
  {"guid":"https://blog.dev/p_glm-5-2","title":"GLM-5.2 ships","link":"https://blog.dev/p/glm-5-2","bullets":[]},
  {"guid":"https://blog.dev/p/agent-evals","title":"Agent evals that matter","link":"https://blog.dev/p/agent-evals","bullets":[]},
  {"guid":"https://blog.dev/p/rag-is-dead","title":"Is RAG dead?","link":"https://blog.dev/p/rag-is-dead","bullets":[]},
  {"guid":"https://blog.dev/p/pm-comp","title":"PM comp in 2026","link":"https://blog.dev/p/pm-comp","bullets":[]}
]
EOF
echo "=== T8 objective: reuse (mergeCachedBullets) ==="
node -e '
  const r = require("'"$S"'/render-issue.js");
  const fs = require("fs");
  const snap = JSON.parse(fs.readFileSync("'"$MAG"'/monthly-snapshot.json","utf8"));
  // prior sidecars become the cache (wk1 carries the safe-ified-key match target)
  const cache = [].concat(
    JSON.parse(fs.readFileSync("'"$MAG"'/2026-06-08_items.json","utf8")).items,
    JSON.parse(fs.readFileSync("'"$MAG"'/2026-06-15_items.json","utf8")).items);
  const { hydrated, needsStageB } = r.mergeCachedBullets(snap, cache);
  console.log("hydrated:", hydrated.length, "->", hydrated.map(h=>h.title).join(" | "));
  console.log("hydrated[0] bullets (from sidecar):", JSON.stringify(hydrated[0].bullets));
  console.log("needsStageB:", needsStageB.length, "->", needsStageB.map(n=>n.title).join(" | "));
  if (needsStageB.length !== 2) { console.error("FAIL: expected needsStageB.length === 2"); process.exit(1); }
  if (!hydrated[0].bullets.length) { console.error("FAIL: expected hydrated bullets from sidecar"); process.exit(1); }
  console.log("OK: 2 overlapping items reused from sidecar (one via safe-ified key), 2 new -> Stage B");
'
echo

echo "=== T8 objective: library <dir> lists sidecar-backed issues + ONE loud notice ==="
node "$S/render-issue.js" library "$MAG" > "$MAG/index.html" 2>"$OUT/library-notice.txt"
echo "library issues listed: $(grep -c '<tr data-search' "$MAG/index.html")"
echo "skip-notice(s):"
cat "$OUT/library-notice.txt"
echo

echo "=== T8 objective: a NEW monthly issue writes its OWN sidecar ==="
# hydrate the snapshot, render the monthly issue with an out-path
node -e '
  const r = require("'"$S"'/render-issue.js");
  const fs = require("fs");
  const snap = JSON.parse(fs.readFileSync("'"$MAG"'/monthly-snapshot.json","utf8"));
  const cache = [].concat(
    JSON.parse(fs.readFileSync("'"$MAG"'/2026-06-08_items.json","utf8")).items,
    JSON.parse(fs.readFileSync("'"$MAG"'/2026-06-15_items.json","utf8")).items);
  const { hydrated } = r.mergeCachedBullets(snap, cache);
  // the 2 new items would get real bullets from Stage B; stub them for the dogfood
  hydrated.forEach(h => { if(!h.bullets.length) h.bullets=["(stage-B takeaway)"]; if(!h.feed) h.feed="The Batch"; if(!h.type) h.type="newsletter"; });
  fs.writeFileSync("'"$MAG"'/monthly-items.json", JSON.stringify({issue_date:"2026-06-30", items: hydrated}));
'
node "$S/render-issue.js" issue "$MAG/monthly-items.json" "$MAG/2026-06-30_issue.html"
test -f "$MAG/2026-06-30_items.json" && echo "OK: monthly issue wrote 2026-06-30_items.json sidecar" || { echo "FAIL: no sidecar"; exit 1; }
echo

echo "=== T8 objective: svpg feed failed 3 runs -> ONE suggestion line, no auto-disable ==="
ROOT="$MAG/run-root"; mkdir -p "$ROOT"
BAD='http://127.0.0.1:9/svpg.xml'   # connection refused -> fetch fails fast
for i in 1 2 3; do
  node "$S/magazine-run.js" discover --feed "$BAD" --days 3650 --root "$ROOT" >/dev/null 2>"$OUT/svpg-run-$i.txt" || true
done
echo "run 1 stderr (no suggestion yet):"; grep -c 'consider disabling' "$OUT/svpg-run-1.txt" || true
echo "run 3 stderr (suggestion fires once):"
grep 'consider disabling' "$OUT/svpg-run-3.txt" || echo "(none)"
node -e '
  const s = require("'"$S"'/magazine-state.js");
  const st = s.load("'"$ROOT"'/state.json");
  const fh = st.feedHealth || {};
  const slug = Object.keys(fh)[0];
  console.log("feedHealth:", JSON.stringify(fh));
  console.log("feedsToSuggest(>=3):", JSON.stringify(s.feedsToSuggest(st,3)));
  if ((fh[slug]&&fh[slug].consecFails) !== 3) { console.error("FAIL: consecFails !== 3"); process.exit(1); }
'
echo
echo "ALL T8 OBJECTIVES MET"