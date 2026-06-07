#!/usr/bin/env bash
# watch.test.sh — integration test for the background transcription queue/worker.
# Hermetic: no network, no real whisper/model. Exercises the CLI enqueue path
# (readFeedsTyped + fetchOne over a local fixture feed) and the drain consumer
# (with an injected transcriber), asserting the queue lifecycle + the FR-7
# cursor/render invariant. Run: bash tests/watch.test.sh
set -u

DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
SCRIPTS="$DIR/scripts"
FIXTURE="$DIR/tests/fixtures/sample-feed.xml"
fail=0; pass=0
chk() { if eval "$2"; then pass=$((pass+1)); else echo "FAIL: $1"; fail=$((fail+1)); fi; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# A podcast feeds.yaml pointing at the local fixture (fetchOne reads a path via --file).
cat > "$TMP/feeds.yaml" <<EOF
feeds:
  - name: fixturepod
    url: $FIXTURE
    type: podcast
EOF

# --- enqueue via the CLI ---
ENQ="$(node "$SCRIPTS/magazine-run.js" enqueue --root "$TMP" 2>/dev/null)"
chk "enqueue reports >=1 enqueued"        "echo '$ENQ' | grep -q '\"enqueued\"' && [ \"\$(echo '$ENQ' | node -e 'let s=\"\";process.stdin.on(\"data\",d=>s+=d).on(\"end\",()=>process.exit(JSON.parse(s).enqueued>=1?0:1))')\" = '' ]"
chk "ledger has a discovered podcast item" "node -e 'const st=require(\"$SCRIPTS/magazine-state.js\").load(\"$TMP/state.json\");process.exit(Object.values(st.items).some(i=>i.enclosure&&i.status===\"discovered\")?0:1)'"

# --- drain with an injected (stub) transcriber: hermetic, no network/whisper ---
node -e '
const path=require("path"), fs=require("fs");
const run=require("'"$SCRIPTS"'/magazine-run.js");
const state=require("'"$SCRIPTS"'/magazine-state.js");
const root="'"$TMP"'";
const before=JSON.stringify(state.load(path.join(root,"state.json")).cursors);
const res=run.cmdDrain({root, max:10, transcribeFn:(guid)=>{ const d=path.join(root,"transcripts"); fs.mkdirSync(d,{recursive:true}); fs.writeFileSync(path.join(d, run.safeGuid(guid)+".txt"), "stub"); return 0; }});
const st=state.load(path.join(root,"state.json"));
const after=JSON.stringify(st.cursors);
const transcribed=Object.values(st.items).filter(i=>i.status==="transcribed").length;
const rendered=Object.values(st.items).some(i=>i.status==="rendered"||i.status==="summarized");
if(res.transcribed<1){console.error("no items transcribed");process.exit(1);}
if(transcribed<1){console.error("ledger has no transcribed item");process.exit(1);}
if(before!==after){console.error("FR-7 violated: cursors changed");process.exit(1);}
if(rendered){console.error("FR-7 violated: drain rendered/summarized an item");process.exit(1);}
process.exit(0);
'
chk "drain transcribes + leaves cursors/render untouched (FR-7)" "[ $? -eq 0 ]"

# --- transcript is cached on disk ---
chk "a transcript file was written"        "[ -n \"\$(ls -1 '$TMP/transcripts'/*.txt 2>/dev/null)\" ]"

# --- re-drain is a clean no-op (queue empty) ---
RED="$(node "$SCRIPTS/magazine-run.js" drain --root "$TMP" 2>/dev/null)"
chk "re-drain transcribes nothing (queue empty)" "[ \"\$(echo '$RED' | node -e 'let s=\"\";process.stdin.on(\"data\",d=>s+=d).on(\"end\",()=>process.exit(JSON.parse(s).transcribed===0?0:1))')\" = '' ]"

echo "watch.test.sh: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
