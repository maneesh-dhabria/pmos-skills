# game-launcher.md — how a game skill bundles and launches

Canonical home (§K) for the conventions every `pmos-gamekit` game skill follows. A game
SKILL.md **cites this file and states only its own deltas** (which game file, which title)
— it never restates the bundling rule, the launch contract, the platform-open matrix, or
the no-persistence rule below.

## Contents

- [Single-file bundling convention (D7)](#bundling)
- [Directory convention](#layout)
- [The launch contract a SKILL.md follows](#launch-contract)
- [serve.js — what the launcher does](#serve)
- [Platform-open matrix](#open-matrix)
- [Ephemeral-port selection](#port)
- [Node-prerequisite error contract (D2)](#node-prereq)
- [No persistence (D6)](#no-persistence)

## Single-file bundling convention (D7) {#bundling}

A game is **one self-contained HTML file** — all CSS and JavaScript embedded inline, no
external references, no network fetches, no build step. It runs offline from `file://` or
from the launcher's `http://` equally. Card/board art is CSS + inline SVG or Unicode —
**no image files**. This keeps a game a single reviewable artifact, makes it trivially
launchable, and lets a Node `vm` self-test extract the engine `<script>` and evaluate it
in isolation (see a game's `tests/run.mjs`).

The HTML must expose its **pure-logic engine on a global** (e.g. `window.SolitaireEngine`)
decoupled from DOM rendering, so the engine is unit-testable without a browser.

## Directory convention {#layout}

```
plugins/pmos-gamekit/skills/<game>/
  SKILL.md                 # launch-only; cites this file
  game/<game>.html         # the single bundled file (D7)
  tests/run.mjs            # node --selftest engine harness
plugins/pmos-gamekit/skills/_shared/game-launcher/
  serve.js                 # this launcher (shared by every game)
  game-launcher.md         # this doc
  serve.test.mjs           # launcher self-test
```

A game lives under `game/<game>.html` — one game file per skill directory.

## The launch contract a SKILL.md follows {#launch-contract}

A game skill's body is **launch-only** — no `AskUserQuestion`, no generation. It:

1. Resolves the bundled game path: `<skill-dir>/game/<game>.html`.
2. Asserts Node is present (`node --version`); on failure emits the [Node-prerequisite
   error](#node-prereq) and stops — **no silent `file://` fallback** (D2).
3. Invokes the shared launcher: `node <…>/_shared/game-launcher/serve.js <game-path>`.
4. Reports the printed `http://127.0.0.1:<port>/` URL and that Ctrl-C stops the server.

The skill issues no prompts — a free port is auto-selected, and a missing Node is a hard
error, so there is nothing to ask. (Whether a prompt-free skill still needs the canonical
non-interactive inline block is decided by `lint-non-interactive-inline.sh`, not here.)

## serve.js — what the launcher does {#serve}

`node serve.js <path-to-game.html> [--no-open]`:

- Binds an [ephemeral free port](#port) on `127.0.0.1` (loopback only).
- Serves **exactly** the passed file at `GET /` and `HEAD /` (also `/index.html`); returns
  **404 for every other path** — it is a single-file server, not a static directory host.
- [Auto-opens](#open-matrix) the default browser at the URL, degrading to a printed
  "visit `<URL>` manually" line when no opener is available.
- Prints the URL to stdout and runs until `Ctrl-C` (SIGINT/SIGTERM), then exits 0.
- Is **read-only** — no write endpoint, no `/save`, [no persistence](#no-persistence).
- `--no-open` (or `GAME_LAUNCHER_NO_OPEN=1`) suppresses the browser spawn — the test seam.

## Platform-open matrix {#open-matrix}

| `process.platform` | opener command |
|---|---|
| `darwin` (macOS) | `open <url>` |
| `win32` (Windows) | `cmd /c start "" <url>` |
| everything else (Linux/BSD) | `xdg-open <url>` |

If the opener binary is missing or errors, the launcher prints the URL and continues — the
server is still up; the user opens the link manually. The opener is never a hard failure.

## Ephemeral-port selection {#port}

The launcher listens on port `0`, letting the OS assign a free ephemeral port — so two
games (or two launches) never collide and no port is hard-coded. The actual port is read
back from `server.address()` and printed. Loopback bind (`127.0.0.1`) keeps the game off
the network.

## Node-prerequisite error contract (D2) {#node-prereq}

The launcher requires Node (stdlib only — no `npm install`). A game skill checks for Node
**before** launching and, if absent, emits a clear, actionable error and stops:

```
This game needs Node.js to launch (it runs a tiny local server). Install Node
(https://nodejs.org) and re-run. The game does not open directly from file:// by design,
so the local server is required.
```

There is **no silent `file://` fallback** — opening the bundle from disk would work for
rendering but the contract is "launch via the server", and a silent downgrade hides the
missing prerequisite. Fail loud, tell the user what to install.

## No persistence (D6) {#no-persistence}

Games are **stateless across launches** — no save files, no `localStorage` reliance for
cross-session state, no server-side writes. Closing the tab or stopping the server discards
the game. In-page state (the current deal, the undo stack, the timer) lives only in memory
for the session. This keeps the launcher read-only and the artifact a pure, side-effect-free
single file.
