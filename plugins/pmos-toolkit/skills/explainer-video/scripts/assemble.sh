#!/usr/bin/env bash
# assemble.sh — frames/ + audio/ -> video.mp4 (16:9 H.264/AAC), then self-check.
#
# Per slide: ffmpeg holds frames/slide_NN.png for audio/slide_NN.wav's exact
# duration (-shortest), yuv420p, even-dimension scale; then concat the segments.
# Captions (burned-in .srt from notes + durations) are ON by default (--no-captions
# disables). After building, runs the binary self-check from
# ../reference/eval-rubric.md — ALL ARITHMETIC IS DONE HERE, never by the model (§H).
#
# Usage:
#   assemble.sh --frames <dir> --audio <dir> --durations <durations.json> --out <video.mp4>
#               [--deck <deck.json>] [--figures <figures.json>] [--no-captions]
#   assemble.sh --selftest
#
# Exit codes: 0 ok + self-check pass · 1 bad args / missing dep · 2 ffmpeg error
#             · 3 self-check FAIL (video built but not deliverable).
# Dependencies: bash, ffmpeg, ffprobe, node (JSON + arithmetic).
set -euo pipefail

_src="${BASH_SOURCE[0]:-$0}"
if [ -n "$_src" ] && [ -e "$_src" ]; then SELF_DIR="$(cd "$(dirname "$_src")" && pwd)"; else SELF_DIR="$PWD"; fi

FRAMES="" ; AUDIO="" ; DURATIONS="" ; OUT="" ; DECK="" ; FIGS="" ; CAPTIONS=1 ; MODE="assemble"

while [ $# -gt 0 ]; do
  case "$1" in
    --frames)     FRAMES="$2"; shift 2 ;;
    --audio)      AUDIO="$2"; shift 2 ;;
    --durations)  DURATIONS="$2"; shift 2 ;;
    --out)        OUT="$2"; shift 2 ;;
    --deck)       DECK="$2"; shift 2 ;;
    --figures)    FIGS="$2"; shift 2 ;;
    --no-captions) CAPTIONS=0; shift ;;
    --selftest)   MODE="selftest"; shift ;;
    *) echo "assemble: unknown arg '$1'" >&2; exit 1 ;;
  esac
done

# Seconds -> SRT timestamp HH:MM:SS,mmm (node does the arithmetic).
srt_ts() { node -e 'const t=+process.argv[1];const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=Math.floor(t%60),ms=Math.round((t-Math.floor(t))*1000);const p=(n,w=2)=>String(n).padStart(w,"0");console.log(`${p(h)}:${p(m)}:${p(s)},${p(ms,3)}`)' "$1"; }

selftest() {
  local ok=0
  command -v ffmpeg >/dev/null 2>&1 && echo "selftest: ffmpeg present" || echo "selftest: ffmpeg missing (gate path reachable)"
  command -v ffprobe >/dev/null 2>&1 && echo "selftest: ffprobe present" || echo "selftest: ffprobe missing (gate path reachable)"
  local ts; ts="$(srt_ts 3661.5)"
  [ "$ts" = "01:01:01,500" ] || { echo "FAIL: srt_ts (got $ts)"; ok=1; }
  # node sum arithmetic smoke
  local sum; sum="$(node -e 'console.log([1.5,2.5,3].reduce((a,b)=>a+b,0))')"
  [ "$sum" = "7" ] || { echo "FAIL: node sum (got $sum)"; ok=1; }
  [ "$ok" = "0" ] && echo "SELFTEST PASS: assemble.sh srt + arithmetic helpers hold." || echo "SELFTEST FAIL"
  return "$ok"
}

[ "$MODE" = "selftest" ] && { selftest; exit $?; }

# --- deps + args -----------------------------------------------------------
for bin in ffmpeg ffprobe node; do command -v "$bin" >/dev/null 2>&1 || { echo "assemble: missing dependency: $bin (brew install ffmpeg)" >&2; exit 1; }; done
[ -n "$FRAMES" ] && [ -n "$AUDIO" ] && [ -n "$DURATIONS" ] && [ -n "$OUT" ] || { echo "usage: assemble.sh --frames <dir> --audio <dir> --durations <json> --out <mp4> [--deck <json>] [--figures <json>] [--no-captions]" >&2; exit 1; }
[ -f "$DURATIONS" ] || { echo "assemble: durations.json not found: $DURATIONS" >&2; exit 1; }

WORK="$(mktemp -d "${TMPDIR:-/tmp}/ev-assemble-XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

# Number of frames == number of slides we assemble.
NF="$(find "$FRAMES" -maxdepth 1 -name 'slide_*.png' | wc -l | tr -d ' ')"
NA="$(find "$AUDIO"  -maxdepth 1 -name 'slide_*.wav' | wc -l | tr -d ' ')"
[ "$NF" -gt 0 ] || { echo "assemble: no frames in $FRAMES" >&2; exit 2; }

concat_list="$WORK/concat.txt"
: > "$concat_list"
srt_file="$WORK/captions.srt"
: > "$srt_file"
cum=0
i=0
sub_idx=1
while [ "$i" -lt "$NF" ]; do
  idx=$((i+1)); nn="$(printf '%02d' "$idx")"
  png="$FRAMES/slide_${nn}.png"; wav="$AUDIO/slide_${nn}.wav"
  [ -f "$png" ] || { echo "assemble: missing frame $png" >&2; exit 2; }
  [ -f "$wav" ] || { echo "assemble: missing audio $wav" >&2; exit 2; }
  seg="$WORK/seg_${nn}.mp4"
  # Still image + its narration; even dims; stop at the shorter (the audio).
  ffmpeg -nostdin -y -loglevel error -loop 1 -i "$png" -i "$wav" \
    -c:v libx264 -tune stillimage -pix_fmt yuv420p \
    -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" \
    -c:a aac -ar 44100 -shortest "$seg" </dev/null
  echo "file '$seg'" >> "$concat_list"
  # caption from this slide's narration duration
  dur="$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$wav" 2>/dev/null || echo 0)"
  if [ "$CAPTIONS" = "1" ] && [ -n "$DECK" ] && [ -f "$DECK" ]; then
    start="$(srt_ts "$cum")"; end="$(srt_ts "$(node -e 'console.log(+process.argv[1]+ +process.argv[2])' "$cum" "$dur")")"
    text="$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const sl=JSON.parse(s).slides['"$i"'];process.stdout.write((sl&&(sl.speaker_notes||sl.idea)||"").replace(/\s+/g," ").trim())})' < "$DECK")"
    printf '%s\n%s --> %s\n%s\n\n' "$sub_idx" "$start" "$end" "$text" >> "$srt_file"
    sub_idx=$((sub_idx+1))
  fi
  cum="$(node -e 'console.log(+process.argv[1]+ +process.argv[2])' "$cum" "$dur")"
  i=$idx
done

mkdir -p "$(dirname "$OUT")"
concat_mp4="$WORK/concat.mp4"
ffmpeg -nostdin -y -loglevel error -f concat -safe 0 -i "$concat_list" -c copy -movflags +faststart "$concat_mp4" </dev/null

if [ "$CAPTIONS" = "1" ] && [ -s "$srt_file" ]; then
  # Burn captions in (re-encode video; audio copied).
  ffmpeg -nostdin -y -loglevel error -i "$concat_mp4" -vf "subtitles=${srt_file}:force_style='FontSize=22,Outline=1,MarginV=40'" \
    -c:v libx264 -pix_fmt yuv420p -c:a copy -movflags +faststart "$OUT" </dev/null
else
  cp "$concat_mp4" "$OUT"
fi
echo "assemble: wrote $OUT" >&2

# --- self-check (binary; arithmetic by node, never the model) --------------
fail=0
echo "# self-check (reference/eval-rubric.md)" >&2

# 1. frame-slide-parity
if [ -n "$DECK" ] && [ -f "$DECK" ]; then
  NS="$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).slides.length))' < "$DECK")"
  if [ "$NF" = "$NS" ]; then echo "frame-slide-parity	pass	frames=$NF slides=$NS" >&2; else echo "frame-slide-parity	FAIL	frames=$NF slides=$NS" >&2; fail=1; fi
else
  echo "frame-slide-parity	pass	frames=$NF (no deck for slide count; frames==audio: $NF/$NA)" >&2
  [ "$NF" = "$NA" ] || { echo "frame-audio-parity	FAIL	frames=$NF audio=$NA" >&2; fail=1; }
fi

# 2. duration-sum: video duration ≈ Σ durations.json (±1s or ±2%)
VID_DUR="$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUT" 2>/dev/null || echo 0)"
SUM_DUR="$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).reduce((a,b)=>a+(+b||0),0)))' < "$DURATIONS")"
DUR_OK="$(node -e 'const v=+process.argv[1],s=+process.argv[2];const tol=Math.max(1,s*0.02);console.log(Math.abs(v-s)<=tol?"1":"0")' "$VID_DUR" "$SUM_DUR")"
if [ "$DUR_OK" = "1" ]; then echo "duration-sum	pass	video=${VID_DUR}s sum=${SUM_DUR}s" >&2; else echo "duration-sum	FAIL	video=${VID_DUR}s sum=${SUM_DUR}s" >&2; fail=1; fi

# 3. audio-non-silent: every WAV mean_volume > -90 dB
i=0
while [ "$i" -lt "$NA" ]; do
  idx=$((i+1)); nn="$(printf '%02d' "$idx")"; wav="$AUDIO/slide_${nn}.wav"
  [ -f "$wav" ] || { i=$idx; continue; }
  mv="$(ffmpeg -nostdin -hide_banner -i "$wav" -af volumedetect -f null /dev/null 2>&1 | grep -o 'mean_volume: [-0-9.]* dB' | grep -o '[-0-9.]*' | head -1 || echo -91)"
  SIL="$(node -e 'console.log((+process.argv[1] <= -90)?"1":"0")' "${mv:--91}")"
  if [ "$SIL" = "1" ]; then echo "audio-non-silent	FAIL	slide_${nn}.wav mean=${mv}dB" >&2; fail=1; fi
  i=$idx
done
[ "$fail" = "0" ] && echo "audio-non-silent	pass	all $NA segment(s) above -90 dB" >&2 || true

# 4. figures-resolved: every deck figure.source ∈ figures.json ids
if [ -n "$DECK" ] && [ -f "$DECK" ] && [ -n "$FIGS" ] && [ -f "$FIGS" ]; then
  RES="$(node -e '
    const fs=require("fs");
    const deck=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
    const figs=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
    const ids=new Set(figs.map(f=>f.id));
    const bad=[];
    for (const s of deck.slides) if (s.figure && s.figure.source && !ids.has(s.figure.source)) bad.push(s.figure.source);
    console.log(bad.length?("FAIL:"+bad.join(",")):"ok");
  ' "$DECK" "$FIGS")"
  if [ "$RES" = "ok" ]; then echo "figures-resolved	pass	all figure refs in inventory" >&2; else echo "figures-resolved	FAIL	$RES" >&2; fail=1; fi
fi

# 5. artifacts-present
[ -f "$OUT" ] && echo "artifacts-present	pass	video.mp4 written" >&2 || { echo "artifacts-present	FAIL	no video.mp4" >&2; fail=1; }

if [ "$fail" = "0" ]; then echo "assemble: SELF-CHECK PASS (video=${VID_DUR}s, ${NF} slides)" >&2; exit 0; else echo "assemble: SELF-CHECK FAIL — video built but not deliverable" >&2; exit 3; fi
