#!/usr/bin/env bash
# transcribe.sh — managerkit-owned transcription for /interview-feedback.
#
# OWNED by pmos-managerkit. Does NOT call any other plugin's transcribe.sh.
#
# Usage: transcribe.sh <recording> <out-dir> [--model <medium|base>]
#        transcribe.sh --selftest
#
# Resolves a local whisper.cpp ggml model, extracts 16kHz mono audio with
# ffmpeg, chunks long audio into <=10-min segments, runs whisper-cli with
# timestamps, and writes <out-dir>/transcript.refined.txt.
#
# Graceful degrade: if no model OR whisper-cli OR ffmpeg is available, emits
# `degrade:tier3` on stdout, a one-line install nudge on stderr, and exits 3.
# It never fails hard / never crashes the caller.
#
# NOTE: the refined transcript carries TIMESTAMPS ONLY. LLM speaker labeling
# (diarization → "Interviewer:" / "Candidate:") happens UPSTREAM, not here.

set -euo pipefail

SELF="${BASH_SOURCE[0]:-$0}"

# Chunk length in seconds (~10 min) for long-audio splitting.
CHUNK_SECS=600

# ---------------------------------------------------------------------------
# resolve_model [pin] — echoes the chosen ggml model path, or empty if none.
#
# Search dirs (in order): IFB_MODEL_DIRS (colon-separated override, used by
# the selftest) else the default trio: ~/whisper-models, ~/.pmos/managerkit/
# models, ./models. Within the FIRST dir that contains a candidate, prefer
# ggml-medium.bin then ggml-base.bin. A pin of "medium" or "base" forces that
# basename.
# ---------------------------------------------------------------------------
resolve_model() {
  local pin="${1:-}"
  local dirs_raw dir basename_pref candidate
  local IFS_save="$IFS"

  if [ -n "${IFB_MODEL_DIRS:-}" ]; then
    dirs_raw="$IFB_MODEL_DIRS"
  else
    dirs_raw="${HOME}/whisper-models:${HOME}/.pmos/managerkit/models:./models"
  fi

  # Preference order of basenames within a dir.
  local prefs="ggml-medium.bin ggml-base.bin"
  if [ "$pin" = "medium" ]; then
    prefs="ggml-medium.bin"
  elif [ "$pin" = "base" ]; then
    prefs="ggml-base.bin"
  fi

  IFS=':'
  set -- $dirs_raw
  IFS="$IFS_save"

  for dir in "$@"; do
    [ -d "$dir" ] || continue
    local found=""
    for basename_pref in $prefs; do
      candidate="$dir/$basename_pref"
      if [ -f "$candidate" ]; then
        found="$candidate"
        break
      fi
    done
    if [ -n "$found" ]; then
      printf '%s\n' "$found"
      return 0
    fi
  done

  printf '%s' ""
  return 0
}

# ---------------------------------------------------------------------------
# degrade — emit the degrade signal + install nudge, exit non-zero.
# ---------------------------------------------------------------------------
degrade() {
  echo "whisper model not found — install whisper.cpp + a ggml model under ~/whisper-models/ to enable transcription" >&2
  echo "degrade:tier3"
  exit 3
}

# ---------------------------------------------------------------------------
# transcribe <recording> <out-dir> [pin]
# ---------------------------------------------------------------------------
transcribe() {
  local recording="$1"
  local out_dir="$2"
  local pin="${3:-}"

  local model
  model="$(resolve_model "$pin")"

  if [ -z "$model" ] || ! command -v whisper-cli >/dev/null 2>&1 || ! command -v ffmpeg >/dev/null 2>&1; then
    degrade
  fi

  if [ ! -f "$recording" ]; then
    echo "transcribe.sh: recording not found: $recording" >&2
    exit 2
  fi

  mkdir -p "$out_dir"

  local wav="$out_dir/audio.wav"
  ffmpeg -i "$recording" -vn -ar 16000 -ac 1 -y "$wav" >/dev/null 2>&1

  local transcript="$out_dir/transcript.refined.txt"
  : > "$transcript"

  # Duration in whole seconds (fallback 0 → single-shot).
  local dur
  dur="$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$wav" 2>/dev/null || echo "")"
  dur="${dur%%.*}"
  case "$dur" in
    ''|*[!0-9]*) dur=0 ;;
  esac

  if [ "$dur" -gt "$CHUNK_SECS" ]; then
    # Long audio: split into <=CHUNK_SECS segments, transcribe each in order.
    local chunk_dir="$out_dir/chunks"
    mkdir -p "$chunk_dir"
    local start=0
    local idx=0
    while [ "$start" -lt "$dur" ]; do
      local seg
      seg="$(printf '%s/chunk-%04d.wav' "$chunk_dir" "$idx")"
      ffmpeg -ss "$start" -t "$CHUNK_SECS" -i "$wav" -ar 16000 -ac 1 -y "$seg" >/dev/null 2>&1
      whisper-cli -m "$model" -f "$seg" 2>/dev/null >> "$transcript" || true
      start=$((start + CHUNK_SECS))
      idx=$((idx + 1))
    done
  else
    whisper-cli -m "$model" -f "$wav" 2>/dev/null >> "$transcript" || true
  fi

  printf '%s\n' "$transcript"
}

# ---------------------------------------------------------------------------
# --selftest — must NOT require ffmpeg/whisper installed.
# ---------------------------------------------------------------------------
selftest() {
  local pass=0
  local total=0
  local tmp
  tmp="$(mktemp -d 2>/dev/null || mktemp -d -t ifb)"
  trap 'rm -rf "$tmp"' EXIT

  check() {
    total=$((total + 1))
    if [ "$1" = "$2" ]; then
      pass=$((pass + 1))
    else
      echo "  FAIL: $3 (expected [$2], got [$1])" >&2
    fi
  }

  # (a) empty search dirs → resolve_model echoes empty.
  local empty="$tmp/empty"
  mkdir -p "$empty"
  local got
  got="$(IFB_MODEL_DIRS="$empty" resolve_model || true)"
  check "$got" "" "empty dirs resolve to nothing"

  # (a') degrade path: run script as subprocess with empty dirs → stdout
  #      `degrade:tier3` + non-zero exit (no real recording needed; degrade
  #      fires before the recording check).
  local out rc
  out="$(IFB_MODEL_DIRS="$empty" bash "$SELF" "$tmp/nope.mp4" "$tmp/out" 2>/dev/null || true)"
  check "$out" "degrade:tier3" "degrade emits degrade:tier3 on stdout"
  IFB_MODEL_DIRS="$empty" bash "$SELF" "$tmp/nope.mp4" "$tmp/out" >/dev/null 2>&1 && rc=0 || rc=$?
  check "$rc" "3" "degrade exits non-zero (3)"

  # (b) plant a fake ggml-base.bin → resolver selects it.
  local md="$tmp/whisper-models"
  mkdir -p "$md"
  : > "$md/ggml-base.bin"
  got="$(IFB_MODEL_DIRS="$md" resolve_model || true)"
  check "$got" "$md/ggml-base.bin" "resolver selects planted ggml-base.bin"

  # (b') medium-before-base preference: plant both, expect medium.
  : > "$md/ggml-medium.bin"
  got="$(IFB_MODEL_DIRS="$md" resolve_model || true)"
  check "$got" "$md/ggml-medium.bin" "resolver prefers medium over base"

  # (b'') --model base pin selects base even when medium present.
  got="$(IFB_MODEL_DIRS="$md" resolve_model base || true)"
  check "$got" "$md/ggml-base.bin" "--model base pins base basename"

  # (b''') search-order: first dir with a candidate wins. dir1 empty, dir2 has base.
  local d1="$tmp/d1" d2="$tmp/d2"
  mkdir -p "$d1" "$d2"
  : > "$d2/ggml-base.bin"
  got="$(IFB_MODEL_DIRS="$d1:$d2" resolve_model || true)"
  check "$got" "$d2/ggml-base.bin" "search order skips empty dir, finds next"

  # (b'''') first dir wins over later dir even if later has medium.
  : > "$d1/ggml-base.bin"
  : > "$d2/ggml-medium.bin"
  got="$(IFB_MODEL_DIRS="$d1:$d2" resolve_model || true)"
  check "$got" "$d1/ggml-base.bin" "first dir with a candidate wins"

  trap - EXIT
  rm -rf "$tmp"

  echo "transcribe.sh selftest: $pass/$total PASS"
  if [ "$pass" -eq "$total" ]; then
    exit 0
  fi
  exit 1
}

# ---------------------------------------------------------------------------
# Arg parsing / dispatch.
# ---------------------------------------------------------------------------
main() {
  if [ "${1:-}" = "--selftest" ]; then
    selftest
  fi

  local recording="" out_dir="" pin=""
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --model)
        pin="${2:-}"
        shift 2
        ;;
      --model=*)
        pin="${1#--model=}"
        shift
        ;;
      -*)
        echo "transcribe.sh: unknown flag: $1" >&2
        exit 2
        ;;
      *)
        if [ -z "$recording" ]; then
          recording="$1"
        elif [ -z "$out_dir" ]; then
          out_dir="$1"
        else
          echo "transcribe.sh: unexpected arg: $1" >&2
          exit 2
        fi
        shift
        ;;
    esac
  done

  if [ -z "$recording" ] || [ -z "$out_dir" ]; then
    echo "usage: transcribe.sh <recording> <out-dir> [--model <medium|base>]" >&2
    exit 2
  fi

  case "$pin" in
    ''|medium|base) ;;
    *)
      echo "transcribe.sh: --model must be 'medium' or 'base' (got: $pin)" >&2
      exit 2
      ;;
  esac

  transcribe "$recording" "$out_dir" "$pin"
}

main "$@"
