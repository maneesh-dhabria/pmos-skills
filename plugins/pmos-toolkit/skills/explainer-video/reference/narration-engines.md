# Narration engines — local TTS for `narrate.sh`

Consumed by `SKILL.md` Phase 5 (`{#narrate}`) and implemented by `scripts/narrate.sh`. Two engines, both fully local; **no cloud TTS path exists, ever** (epic constraint). Cites the design `02_design.html` D2 + the 2026-06-13 grill resolutions.

**Contents:** [Engine selection](#engine-selection) · [macOS say](#macos-say) · [Kokoro](#kokoro) · [Non-Mac degradation](#non-mac-degradation)

## Engine selection

`detect_tts()` (patterned on `/magazine`'s `scripts/transcribe.sh` `detect_whisper`) prefers Kokoro when installed, else falls back to macOS `say`:

```sh
detect_tts() {
  if [ -n "${EV_FORCE_KOKORO:-}" ] || python3 -c "import kokoro_onnx" 2>/dev/null; then
    echo "kokoro"; return 0
  fi
  if command -v say >/dev/null 2>&1; then echo "say"; return 0; fi
  echo ""   # neither — caller errors with the install path
}
```

`--kokoro` sets `EV_FORCE_KOKORO`. One WAV per slide → `audio/slide_NN.wav`; `ffprobe` writes each duration into `durations.json`.

## macOS say

- **Best built-in voice by default.** Auto-detect and prefer an installed **Enhanced/Premium** voice (`say -v '?'` lists them; Enhanced/Premium voices carry that label) over the default compact voice.
- **One-line nudge, never auto-download.** If only compact voices are present, print exactly one line: `Tip: install an Enhanced voice (System Settings → Accessibility → Spoken Content → System Voice → Manage Voices) for noticeably better narration.` Never trigger a download.
- **`--voice <name>` overrides** the auto-selection (passed straight to `say -v`).
- **Synthesis:** `say -v "<voice>" [-r <rate>] -o slide_NN.wav --file-format=WAVE --data-format=LEI16@44100 --file=<notes.txt>`.

## Kokoro

- **Detection probe:** `python3 -c "import kokoro_onnx"` (the `kokoro-onnx` package, MIT/Apache). When importable, Kokoro is used automatically and a one-line nudge notes the upgrade: `Using Kokoro (kokoro-onnx) for narration.`
- **Install nudge (when absent on a non-Mac host):** `Install a local neural voice: pip install kokoro-onnx (downloads the model on first use).`
- **Synthesis:** generate a 44.1 kHz WAV per slide from the notes text via the package's offline synthesis API; no network calls at runtime once the model is cached.

## Non-Mac degradation

On a non-Mac host **without** Kokoro, `say` is unavailable and there is no cloud fallback. `narrate.sh` errors clearly and exits non-zero:

```
narrate: no local TTS engine. macOS `say` is Mac-only and Kokoro is not installed.
  Install Kokoro: pip install kokoro-onnx
```

The caller (Phase 5) records the live smoke (AC7) as DEFERRED-TO-RELEASE naming the missing engine — never a silent pass.
