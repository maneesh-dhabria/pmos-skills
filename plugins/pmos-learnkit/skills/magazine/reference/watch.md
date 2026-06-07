# magazine — the optional background transcription worker (`/magazine watch`)

How `/magazine` keeps podcasts transcribed in the background so interactive issue
creation is mostly whisper cache hits instead of a slow, synchronous transcription
pass. **Opt-in** (does nothing until installed) and **fully reversible**.

## Contents

- [The queue model](#the-queue-model)
- [The /magazine watch surface](#the-magazine-watch-surface)
- [Scheduler artifacts (per OS)](#scheduler-artifacts-per-os)
- [Concurrency & the lock](#concurrency--the-lock)
- [Troubleshooting](#troubleshooting)

## The queue model

The podcast ledger (`state.json`) **is** the job queue. There is no separate
datastore.

- **A queue item** is a podcast item (one with an `enclosure`) at `discovered`.
- **Producers (enqueue)** call the existing idempotent `discover`, so "enqueue
  whatever isn't queued" is free (GUID dedup):
  - the background tick — `magazine-run.js enqueue` over every `type:podcast`
    feed, **forward** from each feed's cursor (`--backfill <days>` pulls history);
  - any interactive `/magazine` build — discovering its window (incl. a backfill
    like "last 6 months") drops missing episodes into the **same** queue.
- **Consumers (drain)** claim a pending item, transcribe it, and mark it
  `transcribed`:
  - the background worker — `magazine-run.js drain --max K` (bounded per tick);
  - the interactive session — `prep` foreground-drains a **bounded** number
    (default 3) of the items its issue needs, renders those + show-notes fallback
    for the rest, and leaves the remainder queued.

**Lifecycle:** `discovered → transcribing{by,at} → transcribed`. A claim whose
owner died (PID gone) or went stale (older than a 30-min TTL) is auto-reclaimed to
`discovered` so an episode is never stranded.

**Invariant:** `enqueue` and `drain` **never** advance cursors and **never**
render — they only move podcast items along the transcription lifecycle. Cursor
advancement stays where it always was: full issue completion (Stage B render). So
no background activity can change "what's new."

## The /magazine watch surface

`node ${CLAUDE_SKILL_DIR}/scripts/magazine-watch.js <cmd> [opts]`

| Command | What it does |
|---|---|
| `install [--interval H] [--max K] [--ac-only] [--backfill DAYS]` | **Refuses** (no artifact written) unless whisper is detected (`transcribe.sh --detect`) **and** ≥1 podcast feed exists. Otherwise writes the wrapper + the OS scheduler artifact, loads it, and prints cadence + log path. Defaults: interval 6h, K=5, forward-only. |
| `status` | Installed? · cadence · warm-transcript count · queue depth by state · in-flight claims · last run/error (tail of `watch.log`). |
| `run-now` | Trigger one pass immediately (testing). |
| `uninstall` | Unload + delete the artifact and wrapper. Cached transcripts and the ledger are **kept**. No-op if not installed. |

`--ac-only` makes the wrapper skip a tick while on battery (portable: `pmset` on
macOS, `/sys/class/power_supply` on Linux) — the scheduler artifacts have no
uniform AC condition, so the guard lives in the wrapper.

## Scheduler artifacts (per OS)

The worker entrypoint is a generated wrapper (`~/.pmos/magazine/watch-run.sh`) that
runs `enqueue` then `drain --max K`, appending to `~/.pmos/magazine/watch.log`.

- **macOS — launchd.** `~/Library/LaunchAgents/com.pmos.magazine.watch.plist` with
  `StartInterval` (interval×3600, default 21600), `ProcessType=Background`,
  `Nice=10`, `LowPriorityIO`. Loaded via `launchctl bootstrap` (fallback `load`);
  `run-now` via `launchctl kickstart`. launchd handles sleep/wake natively.
- **Linux — systemd user units.** `~/.config/systemd/user/pmos-magazine-watch.{service,timer}`
  — a `oneshot` service (`Nice=10`, `IOSchedulingClass=idle`) + a timer
  (`OnUnitActiveSec=<H>h`, `Persistent=true` so missed runs catch up). Enabled via
  `systemctl --user enable --now …timer`.
- **Linux fallback — crontab.** If `systemctl --user` is unavailable, a tagged
  crontab line (`0 */H * * * /bin/sh <wrapper> # pmos-magazine-watch`). Uninstall
  removes the tagged line. (cron does not run during sleep and does not catch up —
  the degraded mode is reported at install time.)

**Windows is not supported** (macOS + Linux only); install reports this clearly.

## Concurrency & the lock

`scripts/magazine-lock.js` is an `O_EXCL` lockfile at `~/.pmos/magazine/.watch.lock`
holding `{pid, at}`; a dead/stale holder is reclaimed automatically. macOS ships no
`flock` binary, so the lock lives in node. **It is held only for the brief
claim/release ledger mutation, never across the whisper subprocess** — so the
background worker and an interactive session can transcribe *different* episodes at
once, but the per-item claim guarantees they never pick the *same* one.

## Troubleshooting

- **`install` refuses "no whisper".** Install `openai-whisper`
  (`pip install openai-whisper`) or `whisper.cpp` (`brew install whisper-cpp`), then
  re-run. The watcher is pointless without whisper.
- **`install` refuses "no podcast feeds".** Add one with
  `/magazine add <url> --type podcast` or `/magazine add --bundle <id> --medium podcast`.
- **Whisper removed after install.** Ticks degrade to logged no-ops (per-episode
  exit 3 requeues the item); the schedule never crashes.
- **Nothing transcribed yet.** Check `status` — a fresh install is forward-only, so
  it waits for new episodes; use `--backfill <days>` (at install) to pull recent
  history, or `run-now` to force a pass.
- **High CPU.** Lower `--max`, raise `--interval`, or add `--ac-only`.

## Out of scope (deliberately)

Persistent `whisper-server` batching (a separate future lever); full headless
*issue* generation (would advance cursors unattended); Windows; auto-installing
whisper; more than one background + one foreground consumer.
