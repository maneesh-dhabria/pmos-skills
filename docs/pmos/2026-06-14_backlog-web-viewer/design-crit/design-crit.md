# Design Crit — /backlog web viewer

Generated: 2026-06-14
Source: http://127.0.0.1:52366/ (live URL — single-page viewer served by `serve-web.mjs`)
Views reviewed: Tree, Queues (+ one expanded epic)
Focus: nomenclature & conceptual clarity (user-stated)

## TL;DR (top 6 recommendations)

1. **[high] The viewer speaks the engine's private dialect, not the user's.** `Groom`, `the machine's pick`, `the shelf`, `route` are all internal three-loop terms shown with zero translation. Rename to plain-language column titles + one-line subtitles that say what to *do*. (Cross-cutting — drives most of the confusion.)
2. **[high] No "what am I looking at?" key.** Nothing on the page explains that an **Epic** (a release unit) contains **Stories** (build units) that each flow **Define → Build → Release**. Add a one-line legend under the title. Without the model, every label is opaque.
3. **[high] Epic vs Story is invisible.** The two kinds never say their name — top-level rows are epics only because they have an expander + progress bar. Label the kind explicitly (`EPIC` / `story` tag) so the hierarchy reads at a glance.
4. **[high] One "status" filter conflates two different lifecycles.** `defined`/`released` are *epic* states; `planned`/`ready`/`done`/`wontfix` are *story* states — mixed in one alphabetical chip row with no lifecycle order. Group them (`Epic status` / `Story status`) and order by lifecycle.
5. **[medium] `@null` leaks onto story rows.** The dependencies field renders the literal `@null` when a story has no deps (seen on `#260614-a3g`). Render nothing (or "no deps").
6. **[medium] "Releases → In-flight" is a dumping ground.** It lists all 12 non-released epics, burying the (currently empty) release-ready set. Rename to "Not yet released" or show only epics with ≥1 story done.

---

## Recommendations by area

### A. Queue column nomenclature (the core complaint)

The three Queues columns use metaphors that require insider knowledge:

| Current | What it actually means | Proposed label | Proposed subtitle |
|---|---|---|---|
| **Groom — waiting on you** | Items needing a human decision before the machine can act | **Needs you** | "Define, refine, unblock — human decisions" |
| **Next — the machine's pick** | The single story the build loop will pick up next | **Ready to build** | "What `/feature-sdlc build` picks next" |
| **Releases — the shelf** | Epics ready to ship / still in progress | **Releases** | "Ready to ship, and what's still in progress" |

Within **Needs you**, the sub-labels are good (`Needs definition`, `Needs grooming`, `Blocked`, `Stale claims`) — but "grooming" is still jargon. Consider `Needs detail` (a story with no acceptance criteria). Keep "Blocked" and "Stale claims" (those are self-evident).

`route` (the `feature`/`skill` chip) is unexplained. Add a tooltip or a one-word gloss: **"build path: feature pipeline vs skill pipeline."**

### B. The missing mental model

Add a single dismissible line under "Backlog viewer · agent-skills":

> *Epics are release units; each contains Stories that flow Define → Build → Release. Tree = everything; Queues = what to do next.*

This one sentence retires ~half the confusion because every other label finally has a frame.

### C. Tree view — make the hierarchy legible

- **Label the kind.** Add an `EPIC` pill on parent rows and a `story` pill on children (you already color the child status badge differently — go one step further and name the kind).
- **Singleton epics look like multi-story epics.** `#260614-7g0` (`0/1`) is an auto-wrapped single-story epic; visually identical to a real 3-story epic. Either collapse singletons to a single row, or mark them ("1 story").
- **The progress bar + `0/3` is unlabeled.** Add a tooltip: "stories done / total." Right now it reads as a mystery ratio.
- **`@null` bug** (also affects this view) — strip it.

### D. Status filter — group by lifecycle

Instead of one alphabetical row `defined · done · planned · ready · released · wontfix`, render two labelled groups in lifecycle order:

- **Epic:** `inbox → defining → defined → released`
- **Story:** `draft → ready → planned → in-progress → done` (+ `blocked`, `wontfix`)

(Only show the states that actually occur in the data, as today.) This makes the filter teach the lifecycle instead of hiding it.

### E. Title hygiene

Gamekit/learnkit titles embed the plugin name as a prefix (`pmos-gamekit — /flappy-bird …`) *and* carry a plugin badge — redundant, and toolkit items don't do it, so the list looks inconsistent. Drop the prefix; trust the badge.

### F. Freshness affordance (minor)

The page is a static snapshot with a manual `↻ Refresh`; the only signal is a faint top-right `as of 2026-06-14 10:49:41`. Consider moving the timestamp next to the Refresh button so "this is a snapshot" is obvious at the point of action.

---

## Cross-cutting pattern

Every finding is one root cause: **the UI is a direct visual dump of `serve-web-lib.mjs`'s derived model, with the engineering vocabulary intact.** The fix is a thin *translation layer* — plain labels, a legend, explicit kind/lifecycle naming — not a structural redesign. The data model is sound; only its presentation leaks.

## Deferred / won't-fix candidates

- Mixed id formats (`#10`, `#0020`, `#260614-q4r`) — legacy vs year-prefixed scheme; cosmetic, not worth a migration.

## Appendix — evidence

- `tree-view.png`, `tree-expanded.png`, `queues-view.png` (captured 2026-06-14, 1440×900).
- `@null` observed on row `#260614-a3g` in the expanded `#260614-7g0` epic.
- "In-flight" list length = 12 (all non-released epics) vs Release-ready = 0.
