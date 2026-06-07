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

# --- FR-R3: generated wrapper + plist carry a PATH including the whisper dir ---
node -e '
const w=require("'"$SCRIPTS"'/magazine-watch.js");
const gen={nodePath:"/usr/bin/node",scriptsDir:"/s",logPath:"/l",wrapperPath:"/wp",intervalHours:6,max:5,whisperDir:"/opt/homebrew/bin"};
const wrap=w.wrapperFor(gen), plist=w.plistFor(gen);
if(!/\nPATH="[^"]*\/opt\/homebrew\/bin[^"]*"\nexport PATH\n/.test(wrap)){console.error("wrapper missing PATH export");process.exit(1);}
if(!(plist.includes("EnvironmentVariables")&&plist.includes("/opt/homebrew/bin"))){console.error("plist missing PATH env");process.exit(1);}
process.exit(0);
'
chk "FR-R3: wrapper+plist embed whisper-dir PATH" "[ $? -eq 0 ]"

# --- FR-R4: forward-only seed sets a podcast cursor to now (absent-only) ---
SEEDROOT="$(mktemp -d)"
cat > "$SEEDROOT/feeds.yaml" <<EOF
feeds:
  - name: seedpod
    url: $FIXTURE
    type: podcast
EOF
node -e '
const w=require("'"$SCRIPTS"'/magazine-watch.js");
const state=require("'"$SCRIPTS"'/magazine-state.js");
const root="'"$SEEDROOT"'";
const n=w.seedForwardCursors(root);
const st=state.load(root+"/state.json");
if(n!==1){console.error("expected 1 seeded, got "+n);process.exit(1);}
if(typeof st.cursors.seedpod!=="string"){console.error("podcast cursor not seeded");process.exit(1);}
if(w.seedForwardCursors(root)!==0){console.error("re-seed should be a no-op");process.exit(1);}
process.exit(0);
'
chk "FR-R4: install seeds forward-only cursor (absent-only)" "[ $? -eq 0 ]"
rm -rf "$SEEDROOT"

# --- FR-R6: --check-model exit codes (env-guarded on whisper presence) ---
CMROOT="$(mktemp -d)"; : > "$CMROOT/ggml-base.bin"
if [ -n "$(bash "$SCRIPTS/transcribe.sh" --detect 2>/dev/null)" ]; then
  WHISPER_MODEL_DIR="$CMROOT" bash "$SCRIPTS/transcribe.sh" --check-model base >/dev/null 2>&1
  chk "FR-R6: --check-model resolves a present model (exit 0)" "[ $? -eq 0 ]"
else
  bash "$SCRIPTS/transcribe.sh" --check-model base >/dev/null 2>&1
  chk "FR-R6: --check-model exits 3 with no whisper" "[ $? -eq 3 ]"
fi
rm -rf "$CMROOT"

echo "watch.test.sh: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
