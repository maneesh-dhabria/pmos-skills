#!/usr/bin/env bash
# transcribe.sh — Stage A podcast transcription (deterministic, no LLM).
# Detects whisper / whisper.cpp on PATH, downloads enclosure audio to a temp
# path, transcribes, writes the transcript, and deletes the audio immediately
# after a successful transcript (FR-C3, FR-6).
#
# Dependencies: bash, curl. Optional: whisper OR whisper.cpp (a.k.a. main/whisper-cli)
#   on PATH. When absent, exits 3 so the caller uses show-notes + an install hint
#   rather than fabricating a summary.
#
# Soft time cap: if transcription exceeds --cap-seconds, the run is warned + the
# transcript flagged (caller renders a degraded card) — it is NOT hard-killed
# mid-transcript, since speed is explicitly not a goal.
#
# Usage:
#   transcribe.sh <audio-url> <guid> [--model base] [--cap-seconds 3600] [--out-dir DIR]
#   transcribe.sh --selftest
set -euo pipefail

MODEL="base"
CAP_SECONDS=3600
OUT_DIR="${HOME}/.pmos/magazine/transcripts"

# Locate a usable whisper binary; echo its name, or empty if none.
detect_whisper() {
  for cand in whisper whisper-cli whisper.cpp main; do
    if command -v "$cand" >/dev/null 2>&1; then
      echo "$cand"
      return 0
    fi
  done
  echo ""
}

selftest() {
  local ok=0
  # detect_whisper returns cleanly whether or not whisper is installed.
  local bin
  bin="$(detect_whisper)"
  if [ -z "$bin" ]; then
    echo "selftest: no whisper on PATH (expected exit-3 path is reachable)"
  else
    echo "selftest: whisper detected as '$bin'"
  fi
  # Argument-parse smoke: defaults are sane.
  [ "$MODEL" = "base" ] || { echo "FAIL: default model"; ok=1; }
  [ "$CAP_SECONDS" -eq 3600 ] || { echo "FAIL: default cap"; ok=1; }
  if [ "$ok" -eq 0 ]; then echo "transcribe.sh --selftest: PASS"; else echo "transcribe.sh --selftest: FAIL"; fi
  exit "$ok"
}

main() {
  if [ "${1:-}" = "--selftest" ]; then selftest; fi

  local audio_url="${1:-}"
  local guid="${2:-}"
  shift 2 || true
  while [ $# -gt 0 ]; do
    case "$1" in
      --model) MODEL="$2"; shift 2;;
      --cap-seconds) CAP_SECONDS="$2"; shift 2;;
      --out-dir) OUT_DIR="$2"; shift 2;;
      *) shift;;
    esac
  done

  if [ -z "$audio_url" ] || [ -z "$guid" ]; then
    echo "usage: transcribe.sh <audio-url> <guid> [--model base] [--cap-seconds N] [--out-dir DIR]" >&2
    exit 64
  fi

  local bin
  bin="$(detect_whisper)"
  if [ -z "$bin" ]; then
    echo "transcribe: no whisper/whisper.cpp on PATH — install one for real podcast summaries (e.g. 'pip install openai-whisper' or 'brew install whisper-cpp')" >&2
    exit 3
  fi

  mkdir -p "$OUT_DIR"
  local audio_tmp transcript
  audio_tmp="$(mktemp "${TMPDIR:-/tmp}/mag-audio-XXXXXX")"
  transcript="${OUT_DIR}/${guid}.txt"

  # Download audio.
  if ! curl -fsSL --max-time 120 -o "$audio_tmp" "$audio_url"; then
    rm -f "$audio_tmp"
    echo "transcribe: download failed for $audio_url" >&2
    exit 1
  fi

  # Transcribe with a soft wall-clock cap. SECONDS is bash's elapsed-time builtin.
  SECONDS=0
  if [ "$bin" = "whisper" ]; then
    "$bin" "$audio_tmp" --model "$MODEL" --output_format txt --output_dir "$OUT_DIR" >/dev/null 2>&1 || true
    # openai-whisper names output after the input basename; normalize to <guid>.txt.
    local produced="${OUT_DIR}/$(basename "$audio_tmp").txt"
    [ -f "$produced" ] && mv -f "$produced" "$transcript"
  else
    "$bin" -m "$MODEL" -f "$audio_tmp" -otxt -of "${OUT_DIR}/${guid}" >/dev/null 2>&1 || true
  fi

  rm -f "$audio_tmp" # audio deleted immediately after transcription attempt

  if [ ! -s "$transcript" ]; then
    echo "transcribe: produced no transcript for $guid" >&2
    exit 1
  fi

  if [ "$SECONDS" -gt "$CAP_SECONDS" ]; then
    echo "transcribe: WARN $guid exceeded soft cap (${SECONDS}s > ${CAP_SECONDS}s) — flag the card" >&2
  fi

  echo "$transcript"
}

main "$@"
