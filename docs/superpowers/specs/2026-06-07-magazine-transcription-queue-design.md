# /magazine — optional local transcription queue + background worker

Design seed for `/skill-sdlc`. Brainstormed 2026-06-07. Target skill:
`plugins/pmos-learnkit/skills/magazine/`.

## Problem

`/magazine` podcast transcription (whisper, Stage A) is the slow part of issue
creation. Today it runs synchronously when you make an issue, so a backlog of
un-transcribed episodes makes issue creation slow. We want an **optional**,
**user-installed** local background job that continuously keeps podcasts
transcribed, so interactive issue-creation is mostly cache hits.

## One-sentence model

The podcast ledger becomes a job queue; multiple things enqueue into it, multiple
things drain it, and a background scheduled worker keeps it warm so interactive
issue-creation is mostly cache hits.

## Why this is low-risk (existing mechanics it builds on)

- Stage A (`discover → download → whisper transcribe → cache`) is already
  deterministic and headless-capable.
- Transcripts cache **forever**, keyed by sanitized GUID
  (`~/.pmos/magazine/transcripts/<guid>.txt`). Background and interactive runs
  share the same cache.
- `discover` is **idempotent on GUID** — "enqueue whatever wasn't queued" is its
  existing behavior.
- Cursors advance **only on full issue completion** (Stage B render), so a
  background prefetch cannot consume, skip, or double-count "what's new".
- Failure is already graceful (no whisper / dead feed / network → show-notes
  fallback with honest exit codes).

## Queue (the ledger)

`state.json` podcast items gain an in-progress state:

```
discovered → transcribing{by, at} → transcribed   (plus existing failed / duplicate)
```

Claims are **atomic** (under the lock). A dead/stale claim (dead PID, or `at`
older than a TTL) is **auto-reclaimable**.

## Producers — enqueue (both call idempotent `discover`)

- **Cron, forward:** every tick, discover all `type: podcast` feeds forward.
  Forward-only on first install; `--backfill <days>` to intentionally pull history.
- **Interactive request:** asking for e.g. "last 6 months" discovers that window
  and enqueues any missing episodes into the *same* queue.

## Consumers — drain (atomic claim → transcribe → `transcribed`)

- **Background worker:** drain-per-tick, every 6h, bounded `K` per tick,
  background/low-IO priority. No power gating by default; `--ac-only` opt-in.
- **Interactive foreground:** bounded drain (cap `N` / time budget) of the items
  *this issue* needs; render those + show-notes fallback for the rest; remainder
  stays queued for the background worker; a later run picks them up as cache hits.

## Concurrency

Node-level lockfile (`~/.pmos/magazine/.watch.lock`, `O_EXCL` + PID stale-check —
macOS ships no `flock` binary, so this lives in `magazine-run.js`, not bash). The
lock is held only for the **claim / ledger mutation**, NOT for the transcription
itself — so background worker and interactive session can transcribe **different**
episodes concurrently, but never the **same** one.

## New `magazine-run.js` modes

- `enqueue` — producer (discover podcasts forward [+ window]).
- `drain --max K` — consumer (claim + transcribe up to K pending).
- Background tick = `enqueue` then `drain --max K`.
- Interactive Stage A reuses `drain` with a cap / time budget.
- **Invariants (must be tested):** `enqueue` and `drain` never call
  `advanceCursors()` and never render.

## `/magazine watch …` management surface

| Subcommand | Behavior |
|---|---|
| `--install [--interval <h>] [--max <K>] [--ac-only] [--backfill <days>]` | Precondition: whisper detected (reuse `transcribe.sh` `detect_whisper`) **and** ≥1 podcast feed — else refuse with guidance. Generate + load the OS artifact. |
| `--status` | Installed? + parse `state.json`: queue depth by state, warm-transcript count, in-flight claims, last run/error from `watch.log`. |
| `--run-now` | Kick one pass immediately (`launchctl kickstart` / `systemctl --user start`). |
| `--uninstall` | Unload + delete artifact. Caches kept intact. |

## Scheduler artifacts (generated, per-OS)

- **macOS** → `~/Library/LaunchAgents/com.pmos.magazine.watch.plist`:
  `ProgramArguments=[node, …/magazine-run.js, enqueue+drain wrapper]`,
  `StartInterval 21600`, `ProcessType=Background`, `Nice`, `LowPriorityIO`,
  logs → `~/.pmos/magazine/watch.log`. Loaded via `launchctl bootstrap`.
- **Linux** → `~/.config/systemd/user/pmos-magazine-watch.{service,timer}`:
  oneshot service (Nice / IO-class) + timer (`OnUnitActiveSec=6h`,
  `Persistent=true` for catch-up). **Fallback** if systemd absent: a `crontab`
  line (`0 */6 * * *`).

## Out of scope (YAGNI)

- Persistent `whisper-server` batching (the documented FR-Q5 future option).
- Full headless **issue** generation / "morning digest" (would advance cursors
  unattended — a separate, larger feature).
- Windows; auto-installing whisper; parallelism beyond 1 background + 1 foreground
  consumer.

## Testing

- Cursor/render invariants for `enqueue` + `drain`.
- Claim-race (two drainers, one wins).
- Stale-claim reclaim (dead PID / TTL).
- Lock contention.
- Per-OS artifact-generation snapshots.
- `--status` parser.
- Bounded-drain cap.
- Scored against the repo's binary skill-eval rubric.

## Process note

Per `CLAUDE.md`, skill changes go through `/skill-sdlc` (= `/feature-sdlc skill`):
requirements → spec → plan → execute → skill-eval → verify. This doc is the seed.
