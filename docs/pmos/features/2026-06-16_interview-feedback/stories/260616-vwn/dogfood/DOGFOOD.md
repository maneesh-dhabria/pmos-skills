# Dogfood — 260616-vwn (pmos-managerkit + /interview-feedback core)

Story A of epic 260616-9bt. Built 2026-06-17 (Loop-2). **No candidate content is recorded here** —
the live case ran entirely under the gitignored `.interview-dogfood/`; this file captures only
sanitized outcomes (counts, exit codes, the live-only bug found and fixed). Candidate data is
confidential (design §13).

## What was exercised end-to-end

Live PM case-interview recording (local, confidential) → real transcription → real grounded
scorecard → grounding-integrity gate → degrade + questionnaire fallbacks.

| Path | Tooling | Result |
|---|---|---|
| Transcription | `transcribe.sh` (managerkit-owned) on a real ~6-min segment, `--model base` (whisper.cpp) | Real timestamped transcript produced; ~4s wall (Metal). |
| Scorecard fill | `fill-scorecard.mjs fill` over `scorecard-skeleton.html` with real grounded notes | Filled scorecard emitted; 2 dims scored, flags + reco set. |
| **Grounding gate** | `check-citations.mjs` on the filled scorecard vs the real transcript | **3 passed, 0 failed → exit 0** (2 transcript-tier verbatim ≥40-char + 1 notes-tier with source). |
| **Negative control** | Planted a fabricated transcript-tier quote, re-ran the gate | **Correctly FAILED → exit 1** ("not a verbatim substring"). The gate actually catches fabrication. |
| Degrade | `transcribe.sh` with an empty model dir (`IFB_MODEL_DIRS`) | Emitted `degrade:tier3` on stdout, **exit 3, no crash** — graceful, per §16.2. |
| Tier-3 questionnaire | `questionnaire.mjs` from the real scorecard + reference | Blank form, 2 recall slots, `contenteditable` (no fabricated answers) — refuse-to-fabricate honored. |

## Live-only bug found & fixed

`check-citations.mjs` scanned the **explanatory `<cite data-cite-tier="transcript|notes|recalled">`
inside the scorecard skeleton's HTML doc-comment** (preserved into the filled output) and flagged it
as an unknown tier → false gate failure. Fix: strip `<!-- … -->` comments before scanning, so
authored contract documentation is never scored. Selftest still 4/4 after the fix; the real gate
then passed 3/0 and the negative control still failed as required.

## Gate summary (at build)

- `tests/run-tests.sh`: **8/8 PASS** (storage 5/5, transcribe 8/8, check-citations 4/4,
  fill-scorecard 22/22, questionnaire 7/7, + 3 skill-level smoke suites).
- skill-eval `[D]` (`--target claude-code`): **EXIT 0, zero fails** (21/21 applicable).
- Lints: non-interactive-inline (49 skills byte-identical), audit-recommended, flags-vs-hints,
  phase-refs — all **PASS**.
- New-plugin scaffold: both `plugin.json` same name+version (0.1.0); both marketplace entries
  carry **no** version field; CLAUDE.md charter + Plugins-list updated.
