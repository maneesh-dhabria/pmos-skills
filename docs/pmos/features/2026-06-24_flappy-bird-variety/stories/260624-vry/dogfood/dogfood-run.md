# Dogfood run — 260624-vry (/flappy-bird visual variety)

**Date:** 2026-06-25
**Story:** 260624-vry · epic 260624-fly · pmos-gamekit · route: skill
**Subject:** `plugins/pmos-gamekit/skills/flappy-bird/game/flappy-bird.html` (engine + render) and `tests/run.mjs`
**Harness:** headless Chromium (Playwright MCP) over `http://localhost:8731/flappy-bird.html`; deterministic playthrough driven through the in-page `__FLAPPY_TEST__` hook (`newGame`/`flap`/`advance`/`getState`).

This is the T8 closing gate: prove the visual-variety changes render in a real browser and the gameplay cycle is preserved, with the deterministic invariants already locked by the selftest (`tests/run.mjs`, 65/65 — the real oracle for AC4/AC6).

## Selftest (AC6)

```
node plugins/pmos-gamekit/skills/flappy-bird/tests/run.mjs   -> 65/65 checks passed, exit 0
node plugins/pmos-gamekit/skills/flappy-bird/tests/run.mjs --selftest -> exit 0 (count-gate)
```

18 new checks beyond the 47 pre-existing physics/scoring ones: 8 registry-completeness (THEMES[7] sky@0 + id-order + grad/ground/lum/motif present; PALETTE[5] id-order + body/accent/beak/lum; BIRD_SHAPES[4] order) + 10 picker invariants (positive threshold; I-contrast every emittable (bg,color) clears the luma threshold + every theme admits ≥2 safe colors + every pipe clears its bg; I-repeat bg≠prevBg over 400 seeds×7 prevBg; emitted-colors-only-safe; I-determinism; I-coverage all 7 bg / 4 bird / 5 color reachable over 600 seeds×7 prevBg). All pre-existing physics/scoring checks untouched and green (AC8 gameplay preserved).

## Live headless dogfood

### Seeded variant render (AC1 + AC2 + AC3 + AC4)

`pickVariants(seed=2, prevBg=0)` → `{bg:5, bird:1, color:2}` = **forest / sparrow / sky-blue** — a non-default theme, a non-round bird, a non-yellow color, all in one render. `getState()` after `newGame({seed:2,prevBg:0})`:

| field | value |
|---|---|
| `themeId` | `forest` |
| `birdId` | `sparrow` |
| `colorId` | `sky-blue` |
| `status` | `ready` |
| sampled sky pixel (cx, 25% h) | `rgba(197,228,166,255)` — forest green, **non-blank** |

Evidence bitmap: `flappy-forest-sparrow-skyblue.png` (360×640) — green gradient sky, rolling-hill motif, dark-green dashed ground, blue sparrow silhouette, "Tap / Space to start" ready overlay.

### Wordmark (AC5)

`#wordmark` DOM element:

| attr | value |
|---|---|
| `text` | `pmos · flappy-bird` (includes the literal `flappy-bird`) |
| `href` | `https://github.com/maneesh-dhabria/pmos-skills` (== repo URL) |
| `target` | `_blank` |
| `rel` | `noopener` |

(The wordmark is an HTML overlay element at `z-index:4`, not painted into the canvas, so it is intentionally absent from the canvas bitmap; verified via the DOM above. It does not intercept the flap key/tap/click — gameplay cycle below confirms input still works.)

### Flap → score → game-over → restart cycle (AC7 + AC8)

Driven through `__FLAPPY_TEST__` (seed 2, gap-aware autopilot via `getState().pipeList`):

| step | observed |
|---|---|
| `newGame` | `status: ready`, `score: 0` |
| `flap()` | `status: ready → playing` |
| autopilot (`flap` + `advance(0.016)`) | reached `score: 3` (pipes cleared — scoring works) |
| stop flapping → fall | `status: over`, `score: 3` |
| `newGame({seed:9, prevBg:5})` (restart) | `status: ready`, `score: 0`, `themeId: ocean` (fresh, ≠ forest — I-repeat holds) |

**Console:** 0 errors, 0 warnings (all messages, full session).

## Verdict

All 8 ACs exercised: registries (AC1–3) + pure seedable picker (AC4) verified by the 65/65 selftest and the live forest/sparrow/sky-blue render; wordmark (AC5) DOM-asserted; selftests extended + green (AC6); live headless dogfood with captured bitmap (AC7); gameplay preserved + console-clean (AC8). Ship.
