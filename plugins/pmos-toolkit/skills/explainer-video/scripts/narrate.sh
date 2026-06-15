#!/usr/bin/env bash
# narrate.sh — synthesize one WAV per slide from deck.json speaker notes, fully
# locally ($0). macOS `say` by default (best built-in voice, Enhanced-voice
# nudge); auto-upgrades to Kokoro (kokoro-onnx) when detected — whisper-if-
# installed style, patterned on /magazine's scripts/transcribe.sh. NO cloud TTS
# path exists, ever (epic constraint). Reference: ../reference/narration-engines.md.
#
# Also owns the up-front ffmpeg+ffprobe HARD GATE (--check-deps), because the
# per-WAV durations.json this script writes needs ffprobe — the gate must pass
# before Phase 5, not at assemble time. The install hint names whichever binary
# is missing (ffprobe can be absent even when ffmpeg is present).
#
# Usage:
#   narrate.sh --check-deps                        # ffmpeg+ffprobe gate only; exit 0 ok / 1 missing
#   narrate.sh --detect                            # print the resolved TTS engine; exit 0/1
#   narrate.sh --deck <deck.json> --out <audio-dir> [--voice <name>] [--rate <wpm>]
#   narrate.sh --selftest
#
# Output: <audio-dir>/slide_NN.wav for each slide + <audio-dir>/../durations.json
#   (array of per-slide seconds, slide order). --out's parent gets durations.json
#   unless --durations-out overrides.
# Exit codes: 0 ok · 1 missing dep / no engine / bad args · 2 synth error.
# Dependencies: bash, node (JSON parse), ffprobe (durations). Engine: say | kokoro.
set -euo pipefail

# BASH_SOURCE-safe self-dir (repo invariant): fall back to $0, then PWD walk.
_src="${BASH_SOURCE[0]:-$0}"
if [ -n "$_src" ] && [ -e "$_src" ]; then
  SELF_DIR="$(cd "$(dirname "$_src")" && pwd)"
else
  SELF_DIR="$PWD"
fi

DECK="" ; OUT="" ; VOICE="" ; RATE="" ; DURATIONS_OUT="" ; MODE="narrate"

# --- dependency gate -------------------------------------------------------
check_deps() {
  local missing=""
  command -v ffmpeg  >/dev/null 2>&1 || missing="ffmpeg"
  command -v ffprobe >/dev/null 2>&1 || missing="${missing:+$missing and }ffprobe"
  if [ -n "$missing" ]; then
    {
      echo "narrate: missing required dependency: ${missing}."
      echo "  install: brew install ffmpeg   (macOS)"
      echo "           apt install ffmpeg    (Debian/Ubuntu)"
      echo "  note: ffprobe ships with ffmpeg but can be absent in stripped builds — both are required."
    } >&2
    return 1
  fi
  return 0
}

# --- engine detection (Kokoro preferred, else macOS say) -------------------
detect_tts() {
  if [ -n "${EV_FORCE_KOKORO:-}" ] || python3 -c "import kokoro_onnx" >/dev/null 2>&1; then
    echo "kokoro"; return 0
  fi
  if command -v say >/dev/null 2>&1; then echo "say"; return 0; fi
  echo ""; return 1
}

# Pick the best macOS `say` voice: an installed Enhanced/Premium voice if any,
# else leave empty (system default). Emits a one-line nudge when only compact
# voices exist. Honors --voice override (handled by caller).
pick_say_voice() {
  local best=""
  # `say -v '?'` lines look like:  Samantha (Enhanced)  en_US  # comment
  best="$(say -v '?' 2>/dev/null | grep -Ei '\((Enhanced|Premium)\)' | grep -E '\ben_' | head -1 | sed -E 's/ +[a-z]{2}_[A-Z]{2}.*$//' | sed -E 's/ *\((Enhanced|Premium)\)//I' | sed -E 's/ +$//')" || true
  if [ -z "$best" ]; then
    echo "Tip: install an Enhanced voice (System Settings -> Accessibility -> Spoken Content -> System Voice -> Manage Voices) for noticeably better narration." >&2
  fi
  echo "$best"
}

# Synthesize one WAV from a text file. $1=engine $2=notes-file $3=out.wav
synth_one() {
  local engine="$1" notes="$2" outwav="$3"
  case "$engine" in
    say)
      # macOS `say`: input text via -f (NOT --file=), output WAVE/LPCM. The
      # WAVE file-format REQUIRES an explicit lpcm data-format (LEI16@44100) —
      # without it, say errors `Opening output file failed: fmt?`.
      local args=(-f "$notes" -o "$outwav" --file-format=WAVE --data-format=LEI16@44100)
      [ -n "$VOICE" ] && args=(-v "$VOICE" "${args[@]}")
      [ -n "$RATE" ]  && args=("${args[@]}" -r "$RATE")
      say "${args[@]}"
      ;;
    kokoro)
      # kokoro-onnx offline synthesis → 44.1kHz WAV. Voice/rate optional.
      EV_KOKORO_VOICE="${VOICE:-}" EV_KOKORO_RATE="${RATE:-}" \
      python3 "$SELF_DIR/_kokoro_synth.py" "$notes" "$outwav"
      ;;
    *) echo "narrate: unknown engine '$engine'" >&2; return 2 ;;
  esac
}

selftest() {
  local ok=0
  # detect_tts returns cleanly whether or not an engine is present.
  local eng; eng="$(detect_tts || true)"
  if [ -z "$eng" ]; then echo "selftest: no TTS engine (expected non-Mac-no-Kokoro path reachable)";
  else echo "selftest: TTS engine = $eng"; fi
  # check_deps returns 0/1 without crashing.
  if check_deps; then echo "selftest: ffmpeg+ffprobe present"; else echo "selftest: ffmpeg/ffprobe missing (gate path reachable)"; fi
  # node JSON parse smoke — wrapped {slides:[...]} object
  local n; n="$(printf '%s' '{"slides":[{"speaker_notes":"a"},{"speaker_notes":"b"}]}' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const d=JSON.parse(s);const sl=Array.isArray(d)?d:d.slides;console.log(sl.length)})')"
  [ "$n" = "2" ] || { echo "FAIL: node slide parse, wrapped object (got $n)"; ok=1; }
  # bare top-level array deck.json must normalise (D1/FR-1) — no crash, count reads.
  local na; na="$(printf '%s' '[{"speaker_notes":"a"},{"speaker_notes":"b"},{"speaker_notes":"c"}]' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const d=JSON.parse(s);const sl=Array.isArray(d)?d:d.slides;console.log(sl.length)})')"
  [ "$na" = "3" ] || { echo "FAIL: node slide parse, bare array (got $na)"; ok=1; }
  [ "$ok" = "0" ] && echo "SELFTEST PASS: narrate.sh detection + gate + parse hold." || echo "SELFTEST FAIL"
  return "$ok"
}

# --- arg parse -------------------------------------------------------------
while [ $# -gt 0 ]; do
  case "$1" in
    --check-deps) MODE="check"; shift ;;
    --detect)     MODE="detect"; shift ;;
    --selftest)   MODE="selftest"; shift ;;
    --deck)       DECK="$2"; shift 2 ;;
    --out)        OUT="$2"; shift 2 ;;
    --voice)      VOICE="$2"; shift 2 ;;
    --rate)       RATE="$2"; shift 2 ;;
    --durations-out) DURATIONS_OUT="$2"; shift 2 ;;
    *) echo "narrate: unknown arg '$1'" >&2; exit 1 ;;
  esac
done

case "$MODE" in
  check)    check_deps && { echo "ffmpeg + ffprobe: ok" >&2; exit 0; } || exit 1 ;;
  detect)   eng="$(detect_tts || true)"; [ -n "$eng" ] && { echo "$eng"; exit 0; } || { echo "narrate: no local TTS engine. macOS say is Mac-only and Kokoro is not installed." >&2; echo "  Install Kokoro: pip install kokoro-onnx" >&2; exit 1; } ;;
  selftest) selftest; exit $? ;;
esac

# --- narrate ---------------------------------------------------------------
[ -n "$DECK" ] && [ -n "$OUT" ] || { echo "usage: narrate.sh --deck <deck.json> --out <audio-dir>" >&2; exit 1; }
[ -f "$DECK" ] || { echo "narrate: deck not found: $DECK" >&2; exit 1; }
check_deps || exit 1

ENGINE="$(detect_tts || true)"
if [ -z "$ENGINE" ]; then
  echo "narrate: no local TTS engine. macOS say is Mac-only and Kokoro is not installed." >&2
  echo "  Install Kokoro: pip install kokoro-onnx" >&2
  exit 1
fi
if [ "$ENGINE" = "kokoro" ]; then echo "Using Kokoro (kokoro-onnx) for narration." >&2; fi
if [ "$ENGINE" = "say" ] && [ -z "$VOICE" ]; then VOICE="$(pick_say_voice)"; fi

mkdir -p "$OUT"
[ -n "$DURATIONS_OUT" ] || DURATIONS_OUT="$(cd "$OUT/.." && pwd)/durations.json"

# Number of slides + per-slide notes via node (JSON, no jq dependency).
N="$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const d=JSON.parse(s);const sl=Array.isArray(d)?d:d.slides;console.log(sl.length)})' < "$DECK")"
[ "$N" -gt 0 ] 2>/dev/null || { echo "narrate: deck.json has no slides" >&2; exit 2; }

durs=""
i=0
while [ "$i" -lt "$N" ]; do
  idx=$((i+1))
  nn="$(printf '%02d' "$idx")"
  notes_file="$OUT/.notes_${nn}.txt"
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const d=JSON.parse(s);const slides=Array.isArray(d)?d:d.slides;const n=slides['"$i"'].speaker_notes||slides['"$i"'].idea||" ";process.stdout.write(String(n))})' < "$DECK" > "$notes_file"
  outwav="$OUT/slide_${nn}.wav"
  synth_one "$ENGINE" "$notes_file" "$outwav" || { echo "narrate: synth failed on slide $idx" >&2; exit 2; }
  rm -f "$notes_file"
  dur="$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$outwav" 2>/dev/null || echo 0)"
  durs="${durs:+$durs,}$dur"
  echo "narrate: slide_${nn}.wav (${dur}s)" >&2
  i=$idx
done

printf '[%s]\n' "$durs" > "$DURATIONS_OUT.tmp"
mv "$DURATIONS_OUT.tmp" "$DURATIONS_OUT"
echo "narrate: $N WAV(s) + durations.json ($ENGINE)" >&2
