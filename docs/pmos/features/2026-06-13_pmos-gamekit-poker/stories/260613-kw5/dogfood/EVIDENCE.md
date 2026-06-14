# Dogfood evidence — /poker (story 260613-kw5)

Load-bearing dogfood for the `/poker` build. Real game served through the shared
zero-dependency launcher (`_shared/game-launcher/serve.js`) and driven live in Chromium
via Playwright at `http://127.0.0.1:62457/`. Both an objective gate matrix and an
independent blind-judge verdict are recorded.

## Objective gates (live, served game)

| # | Gate | Result |
|---|------|--------|
| O1 | Server binds free loopback port + serves the single file | PASS — HTTP 200 at `http://127.0.0.1:62457/` |
| O2 | Start screen → opponent picker → Deal seats a table | PASS — 2-opponent game dealt (You + Bao + Cleo) |
| O3 | Preflop legal action set + min-raise + slider/quick-bets render | PASS — `betslider` min 20 / max 1000; quick-bets ½ Pot / Pot / Min / All-in present |
| O4 | Raise via quick-bet + Raise button registers | PASS — Pot quick-bet set slider to 35; raise applied, pot → 75, committed 35 |
| O5 | Natural hand plays preflop→flop→turn→river to showdown | PASS — board `5d Tc 3d 4c As`, fold-out + check-down driven live |
| O6 | Showdown names the winning hand + awards pot | PASS — log: **"You win 75 with Two Pair, Fives & Threes (2 pots: 15 + 60)"** |
| O7 | Bot hole cards revealed only at showdown | PASS — bot cards face-down during play, face-up at showdown |
| O8 | **Side-pot correctness** (short all-in, deeper stacks) | PASS — see O9 |
| O9 | Side-pot award + eligibility + chip conservation | PASS — main pot **300** (eligible 0,1,2) → seat 0 (Three of a Kind, Aces, short stack) wins; side pot **800** (eligible 1,2 only) → seat 1 (Three of a Kind, Kings) wins; seat 2 wins nothing; net **+200 / +300 / −500 = 0** |
| O10 | Side-pot showdown renders in UI with named hands | PASS — log: **"You win 300 with Three of a Kind, Aces · Ivo wins 800 with Three of a Kind, Kings (2 pots: 300 + 800)"** |
| O11 | Zero console errors across the full session | PASS — `browser_console_messages(onlyErrors)` → 0 errors, 0 warnings |
| O12 | Engine selftest | PASS — `tests/run.mjs --selftest` → 39/39 |
| O13 | Single-file contract (no external runtime refs) | PASS — all CSS/JS inline, inline data-URI favicon, no `http(s)://` / `src=` / external `href` |

Side-pot scenario was set up deterministically via the `window.__POKER_TEST__.dealRigged`
seam (`seatStacks: [100, 500, 500]`, `holeOverride` aces/kings/queens,
`boardOverride: As Kd 7c 2h 3s`) — the short stack holds the best hand and therefore wins
the main pot it is eligible for, while the deeper second-best hand wins the side pot it has
no claim to lose. This is the exact case the engine-level selftest also covers; here it is
proven through the real served UI.

Screenshot: `poker-sidepot-showdown.png` (full-page capture of the side-pot showdown).

## Live bug caught + fixed (cap-2 fix loop — 1 of 2 used)

The action log and showdown banner used third-person conjugation for every seat, including
the human ("You checks", "You wins 75 …"). Fixed by adding an `isYou(seat)` helper and
second-person conjugation in `describeAction` and `finishHand` ("You check / call / fold /
bet / raise / win"). Re-verified live: the side-pot showdown now reads
**"You win 300 with Three of a Kind, Aces"**. Engine untouched — selftest still 39/39.

## Subjective blind-judge verdict

Independent agent, given only the game file + a play description, no authorship context.

| Dimension | Score | Note |
|---|---|---|
| Rules correctness surface | 5/5 | Full action set with correct min-raise (`baseMin = currentBet + lastRaiseSize`), all-in, SB/BB posting incl. heads-up button-is-SB, rotating button, side pots from per-seat contributions. |
| Feedback & legibility | 5/5 | Live aria-live log, `.acting` gold ring, pot pill, per-seat betchip + lastact, winner glow + named hand, multi-pot summary, winning-card highlight. |
| Input ergonomics | 5/5 | F/C/R/Enter/N map, raise slider bound to legal range, four quick-bets, mouse controls, start-overlay opponent picker. |
| Polish & accessibility | 4/5 | Confetti gated behind `prefers-reduced-motion` (also disables deal anim), responsive breakpoint, focus-visible, aria-labels; minor gap: winner/folded lean on color+glow with no text-equivalent beyond the log. |
| Failure modes | 4/5 | No dead-ends; Next-hand auto-focuses at showdown; stacks top up so you can't get felted; illegal bot decisions fall back to check/fold. Minor: **R** focuses the slider rather than raising immediately — Enter confirms and the msg guides. |

**VERDICT: SHIP.**

Both non-blocking 4/5 notes (text-equivalent for color-only state; R-as-focus vs R-as-raise)
are logged as future polish; neither blocks the ship and neither was raised as a defect.

