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

# Sanitize a GUID for use as a filesystem path stem. Podcast GUIDs routinely
# contain colons/slashes (e.g. `substack:post:198591907`) that break -of/-otxt
# output paths (FR-P6). The original GUID stays the ledger key; only the path
# is sanitized.
safe_guid_of() {
  printf '%s' "$1" | tr -c 'A-Za-z0-9._-' '_'
}

# whisper.cpp's `-m` needs a model *file path*, but whisper_model is documented
# as a name (base/small/...). Resolve a bare name to a ggml file (FR-P2); if it
# is already an existing path, pass it through. Echo the resolved path on
# success; return non-zero (with searched dirs on stderr) when nothing matches.
resolve_cpp_model() {
  local m="$1"
  if [ -f "$m" ]; then printf '%s' "$m"; return 0; fi
  local dirs=(
    "${WHISPER_MODEL_DIR:-}"
    "${HOME}/.pmos/magazine/models"
    "$(brew --prefix 2>/dev/null)/share/whisper-cpp/models"
    "./models"
  )
  local d
  for d in "${dirs[@]}"; do
    [ -n "$d" ] || continue
    if [ -f "${d}/ggml-${m}.bin" ]; then printf '%s' "${d}/ggml-${m}.bin"; return 0; fi
  done
  {
    echo "transcribe: could not resolve whisper.cpp model '${m}' to a ggml file."
    echo "  searched: \$WHISPER_MODEL_DIR, ~/.pmos/magazine/models, brew share/whisper-cpp/models, ./models"
    echo "  set WHISPER_MODEL_DIR or pass --model /path/to/ggml-${m}.bin"
  } >&2
  return 1
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

  # FR-P6: GUID sanitization for filesystem paths.
  [ "$(safe_guid_of 'substack:post:1')" = "substack_post_1" ] || { echo "FAIL: guid sanitize"; ok=1; }
  [ "$(safe_guid_of 'a/b c')" = "a_b_c" ] || { echo "FAIL: guid sanitize slashes/spaces"; ok=1; }

  # FR-P2: whisper.cpp model name -> ggml path resolution (no binary needed).
  local mdir; mdir="$(mktemp -d "${TMPDIR:-/tmp}/mag-models-XXXXXX")"
  : > "${mdir}/ggml-base.bin"
  local resolved
  if resolved="$(WHISPER_MODEL_DIR="$mdir" resolve_cpp_model base)"; then
    [ "$resolved" = "${mdir}/ggml-base.bin" ] || { echo "FAIL: model name resolved to wrong path ($resolved)"; ok=1; }
  else
    echo "FAIL: model name not resolved from WHISPER_MODEL_DIR"; ok=1
  fi
  # An already-absolute path passes through unchanged.
  [ "$(resolve_cpp_model "${mdir}/ggml-base.bin")" = "${mdir}/ggml-base.bin" ] || { echo "FAIL: model path passthrough"; ok=1; }
  # An unresolvable name fails (non-zero), so the caller falls back honestly.
  if WHISPER_MODEL_DIR="$mdir" resolve_cpp_model no-such-model >/dev/null 2>&1; then
    echo "FAIL: unresolvable model should be non-zero"; ok=1
  fi
  rm -rf "$mdir"

  # FR-R6: --check-model end-to-end pre-flight (exercised as a subprocess so the
  # real arg dispatch runs). Environment-guarded: with no whisper installed the
  # exit-3 path is correct; with whisper present a provided ggml must resolve.
  local cmdir; cmdir="$(mktemp -d "${TMPDIR:-/tmp}/mag-cm-XXXXXX")"
  : > "${cmdir}/ggml-base.bin"
  if [ -z "$(detect_whisper)" ]; then
    if WHISPER_MODEL_DIR="$cmdir" bash "$0" --check-model base >/dev/null 2>&1; then
      echo "FAIL: --check-model should exit 3 when no whisper is installed"; ok=1
    fi
  else
    if ! WHISPER_MODEL_DIR="$cmdir" bash "$0" --check-model base >/dev/null 2>&1; then
      echo "FAIL: --check-model should exit 0 when whisper + a resolvable model are present"; ok=1
    fi
  fi
  rm -rf "$cmdir"

  if [ "$ok" -eq 0 ]; then echo "transcribe.sh --selftest: PASS"; else echo "transcribe.sh --selftest: FAIL"; fi
  exit "$ok"
}

main() {
  if [ "${1:-}" = "--selftest" ]; then selftest; fi

  # --detect: probe for a usable whisper without downloading anything. Exit 0 if
  # found (echo the binary name), 3 if absent. Used by /magazine watch --install
  # as a precondition check (a background transcriber is pointless without whisper).
  if [ "${1:-}" = "--detect" ]; then
    local bin; bin="$(detect_whisper)"
    if [ -n "$bin" ]; then echo "$bin"; exit 0; else echo "no whisper on PATH" >&2; exit 3; fi
  fi

  # --check-model [name]: end-to-end pre-flight WITHOUT downloading audio (FR-R6).
  # Verifies whisper is on PATH AND the model resolves — the exact two things that
  # silently failed for the scheduler (no PATH / unresolved ggml). `watch --install`
  # runs this under the wrapper's simulated PATH so a broken install is caught at
  # install time, not discovered as "transcribed nothing, forever". Exit 0 = ready,
  # 3 = no whisper or no resolvable model.
  if [ "${1:-}" = "--check-model" ]; then
    local cm_model="${2:-base}"
    local cm_bin; cm_bin="$(detect_whisper)"
    if [ -z "$cm_bin" ]; then echo "no whisper on PATH" >&2; exit 3; fi
    if [ "$cm_bin" = "whisper" ]; then
      echo "found-whisper: yes (openai-whisper) · model '${cm_model}': used directly"
      exit 0
    fi
    local cm_path
    if cm_path="$(resolve_cpp_model "$cm_model")"; then
      echo "found-whisper: yes (${cm_bin}) · model '${cm_model}': resolved -> ${cm_path}"
      exit 0
    fi
    echo "found-whisper: yes (${cm_bin}) · model '${cm_model}': UNRESOLVED" >&2
    exit 3
  fi

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
  local audio_tmp transcript safe_guid
  safe_guid="$(safe_guid_of "$guid")"
  audio_tmp="$(mktemp "${TMPDIR:-/tmp}/mag-audio-XXXXXX")"
  transcript="${OUT_DIR}/${safe_guid}.txt"

  # Download audio.
  if ! curl -fsSL --max-time 120 -o "$audio_tmp" "$audio_url"; then
    rm -f "$audio_tmp"
    echo "transcribe: download failed for $audio_url" >&2
    exit 1
  fi

  # Transcribe with a soft wall-clock cap. SECONDS is bash's elapsed-time builtin.
  SECONDS=0
  if [ "$bin" = "whisper" ]; then
    # openai-whisper takes a model *name* directly.
    "$bin" "$audio_tmp" --model "$MODEL" --output_format txt --output_dir "$OUT_DIR" >/dev/null 2>&1 || true
    # openai-whisper names output after the input basename; normalize to <safe-guid>.txt.
    local produced="${OUT_DIR}/$(basename "$audio_tmp").txt"
    [ -f "$produced" ] && mv -f "$produced" "$transcript"
  else
    # whisper.cpp takes a model *file path*; resolve the documented name first.
    local model_path
    if ! model_path="$(resolve_cpp_model "$MODEL")"; then
      rm -f "$audio_tmp"
      echo "transcribe: no usable whisper.cpp model — keeping show-notes for $guid" >&2
      exit 3
    fi
    "$bin" -m "$model_path" -f "$audio_tmp" -otxt -of "${OUT_DIR}/${safe_guid}" >/dev/null 2>&1 || true
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
