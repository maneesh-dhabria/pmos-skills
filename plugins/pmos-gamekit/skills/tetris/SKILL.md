---
name: tetris
description: Play Tetris in your browser. Use when the user wants to play Tetris, stack falling blocks, take a break with an arcade game, or says "/tetris", "play tetris", "let's play tetris", "I want a falling-blocks game". Launches a pre-bundled, offline single-player game via a tiny local server — no setup, no network, no account.
user-invocable: true
argument-hint: "(no arguments — opens the game; start level, hold, rotate, and pause are in-game controls)"
allowed-tools: Bash, Read
---

# Tetris

Launch-only skill. It does not generate anything — it serves a pre-bundled, fully
self-contained, modern guideline-style Tetris (`game/tetris.html`) through the shared
zero-dependency launcher and points your browser at it. All gameplay (start-level picker,
SRS rotation with wall kicks, 7-bag randomizer, hold piece, ghost piece, next-3 preview,
lock delay, T-spins, guideline scoring, progressive speed-up, pause, game-over + restart)
lives inside the one HTML file and runs offline.

This skill follows the launch contract in
`../_shared/game-launcher/game-launcher.md` (the §K canonical home for the bundling
convention, the launch contract, the platform-open matrix, ephemeral-port selection, the
Node-prerequisite error contract, and the no-persistence rule). Only the per-skill deltas
are stated here:

- **Game file:** `game/tetris.html` (this skill's directory).
- **Title:** Tetris.
- **No options to resolve:** start level, hold, rotation, and pause are in-game controls, so
  the skill issues **no prompts** and needs no arguments.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion` tool:** Not used — this skill is prompt-free, so there is nothing
  to degrade. The non-interactive contract block below is inlined only to satisfy the
  repo-wide W14 lint; no checkpoint ever fires.
- **No Bash tool:** the user runs the one launch command themselves —
  `node <skill-dir>/../_shared/game-launcher/serve.js <skill-dir>/game/tetris.html` —
  and opens the printed URL.
- **No browser auto-open** (headless / SSH): the launcher prints the
  `http://127.0.0.1:<port>/` URL; open it manually in any browser. The game also opens
  directly from `file://` for play, but the launch contract uses the server (D2 — no
  silent `file://` fallback from the skill).

<!-- non-interactive-block:start -->
1. **Mode resolution.** Compute `(mode, source)` with precedence: `cli_flag > parent_marker > settings.default_mode > builtin-default ("interactive")` (FR-01).
   - `cli_flag` is `--non-interactive` or `--interactive` parsed from this skill's argument string. Last flag wins on conflict (FR-01.1).
   - `parent_marker` is set if the original prompt's first line matches `^\[mode: (interactive|non-interactive)\]$` (FR-06.1).
   - `settings.default_mode` is `.pmos/settings.yaml :: default_mode` if present and one of `interactive`/`non-interactive`. Unknown values → warn on stderr `settings: invalid default_mode value '<v>'; ignoring` and fall through (FR-01.3).
   - If `.pmos/settings.yaml` is malformed (not parseable as YAML, or missing `version`): print to stderr `settings.yaml malformed; fix and re-run` and exit 64 (FR-01.5).
   - On Phase 0 entry, always print to stderr exactly: `mode: <mode> (source: <source>)` (FR-01.2).

2. **Per-checkpoint classifier.** Before issuing any `AskUserQuestion` call, classify it (FR-02):
   - The defer-only tag, if present, is the literal previous non-empty line: `<!-- defer-only: <reason> -->` where `<reason>` ∈ {`destructive`, `free-form`, `ambiguous`} (FR-02.5).
   - Decision (in order): tag adjacent → DEFER; multiSelect with 0 Recommended → DEFER; 0 options OR no option label ends in `(Recommended)` → DEFER; else AUTO-PICK the (Recommended) option (FR-02.2).

3. **Buffer + flush.** Maintain an append-only OQ buffer in conversation memory. On each AUTO-PICK or DEFER classification, append one entry per the schema in spec §11.2. At end-of-skill (or in a caught error before exit), flush (FR-03):
   - Primary artifact is single Markdown → append `## Open Questions (Non-Interactive Run)` section with one fenced YAML block per entry; update prose frontmatter (`**Mode:**`, `**Run Outcome:**`, `**Open Questions:** N` where N counts deferred only — see FR-03.4) (FR-03.1).
   - Skill produces multiple artifacts → write a single `_open_questions.md` aggregator at the artifact directory root; primary artifact's frontmatter `**Open Questions:** N — see _open_questions.md` (FR-03.5).
   - Primary artifact is non-MD (SVG, etc.) → write sidecar `<artifact>.open-questions.md` (FR-03.2).
   - No persistent artifact (chat-only) → emit buffer to stderr at end-of-run as a single block prefixed `--- OPEN QUESTIONS ---` (FR-03.3).
   - Mid-skill error → flush partial buffer under heading `## Open Questions (Non-Interactive Run — partial; skill errored)`; set `**Run Outcome:** error`; exit 1 (E13).

4. **Subagent dispatch.** When dispatching a child skill via Task tool or inline invocation, prepend the literal first line: `[mode: <current-mode>]\n` to the child's prompt (FR-06).

5. **Call-site auditing (CI only).** This runtime classifier reads the call it is about to make — it does not run awk. Static/offline auditing of `AskUserQuestion` call sites across SKILL.md files is performed by `tools/audit-recommended.sh`, which sources the shared call-site extractor from Section D of this file (`_shared/non-interactive.md`). Runtime and audit therefore share one decision contract without inlining the extractor into every skill (FR-02.6).

6. **Refusal check.** If this SKILL.md contains a `<!-- non-interactive: refused; ... -->` marker (regex: `<!--[[:space:]]*non-interactive:[[:space:]]*refused`), and `mode` resolved to `non-interactive`: emit refusal per Section A and exit 64 (FR-07).

7. **Pre-rollout BC.** If the `--non-interactive` argument is present BUT this SKILL.md does NOT contain the `<!-- non-interactive-block:start -->` marker (i.e., this skill hasn't been rolled out yet): emit `WARNING: --non-interactive not yet supported by /<skill>; falling back to interactive.` to stderr; continue in interactive mode (FR-08).

8. **End-of-skill summary.** Print to stderr at exit: `pmos-toolkit: /<skill> finished — outcome=<clean|deferred|error>, open_questions=<N>` (NFR-07).
<!-- non-interactive-block:end -->

## Load Learnings

Read `~/.pmos/learnings.md` if present and apply any entries under `## /tetris` to this
launch (e.g. a host-specific browser-open quirk). The skill body wins on conflict; surface
conflicts before applying. This skill has no persistent artifact, so there is nothing else
to load.

## Phase 0: Launch the game {#launch}

1. **Resolve paths** relative to this skill's directory (`<skill-dir>`):
   - Game: `<skill-dir>/game/tetris.html`
   - Launcher: `<skill-dir>/../_shared/game-launcher/serve.js`
2. **Assert Node is present** — run `node --version`. On failure, emit the
   Node-prerequisite error verbatim from `game-launcher.md#node-prereq` and stop. There is
   **no silent `file://` fallback** (D2).
3. **Launch** in the background so the server keeps running while you play:
   ```bash
   node <skill-dir>/../_shared/game-launcher/serve.js <skill-dir>/game/tetris.html
   ```
   The launcher binds a free ephemeral port on `127.0.0.1`, prints
   `Game ready at http://127.0.0.1:<port>/`, and auto-opens your default browser. If the
   browser does not open (headless), open the printed URL manually.
4. **Report** the URL to the user and that gameplay controls are: pick a start level (0–15)
   then **Enter**/**Play**; **←**/**→** move; **↓** soft drop; **Space** hard drop;
   **Z**/**X** (or **↑**) rotate; **C** or **Shift** hold; **P** pause; **R** new game.
   A ghost piece shows where a hard drop lands; the next-3 and hold panels flank the board;
   clear lines to score, with T-spin / Tetris / back-to-back / combo bonuses; the level and
   speed rise every 10 lines. Stopping is `Ctrl-C` in the launcher terminal. Per the launch
   contract the game keeps **no save state** — closing the tab discards the board (session
   best resets too).

## Phase 1: Capture Learnings {#capture-learnings}

If anything about launching was host-specific and worth remembering (a browser that
wouldn't auto-open, a Node path quirk, a port-binding hiccup), append a one-line entry
under `## /tetris` in `~/.pmos/learnings.md`. Nothing notable → write nothing. Never
record game state — there is none to keep.
