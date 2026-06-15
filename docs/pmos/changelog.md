# Changelog

## 2026-06-15 — pmos-learnkit 0.23.0: a smoother /frameworks browse experience

The `/frameworks` browse-and-search library page gets a round of UX fixes so exploring your framework collection feels stable and fast.

- **No more jarring reloads or jumps.** Opening a framework's details no longer makes the whole page appear to reload, and the list keeps its scroll position instead of snapping back to the top — so you can scan, open, close, and keep your place.
- **Faster first paint, and deep-linkable.** Diagram thumbnails load lazily as you scroll rather than all at once, the page opens quickly even with the full corpus, and the framework you're viewing is reflected in the URL so you can link straight to it.
- **Friendlier to keyboard and mobile.** The reader pane is keyboard-navigable, search gains a clear button, the subtitle updates to reflect what you're filtering, and the layout holds together on small screens.

## 2026-06-15 — pmos-gamekit 0.3.0: a full Sudoku board — play /sudoku

`/sudoku` brings the classic 9×9 number puzzle to the kit — generate a fresh, uniquely-solvable board at the difficulty you want and solve it with pencil marks, hints, and on-demand error checking.

- **Play classic 9×9 Sudoku, fully offline.** `/sudoku` opens a freshly generated puzzle in your browser via the same zero-dependency launcher as the other games. Pick Easy, Medium, or Hard — each difficulty is graded by the solving techniques the puzzle actually requires, so "Hard" really is hard.
- **Pencil notes, hints, and error-checking on demand.** Toggle pencil-mark notes into cells, ask for a hint when you're stuck (it fills a correct next move), and check your work on demand to flag wrong entries — without spoiling the cells you haven't filled yet. Finish the board for a small celebration.

## 2026-06-15 — pmos-gamekit 0.2.0: slide the tiles — play 2048 with /2048

A new game joins the kit. `/2048` opens the classic sliding-tile puzzle in your browser — combine matching tiles to reach 2048, then keep going past it.

- **Play 2048, fully offline.** `/2048` launches a single-file game served by the same zero-dependency local launcher as `/solitaire` — no install, no account, no network. Slide with the arrow keys (or WASD); matching tiles merge and the board spawns a new tile each move.
- **Pick your board, undo a slip, keep playing.** Choose a board size (4×4, 5×5, or 6×6) before you start, undo your last move one step when a slide goes wrong, and keep playing after you hit the 2048 tile to chase a higher score. Your best score for the session is tracked.

## 2026-06-15 — pmos-learnkit 0.22.0: browse a built-in library of 61 PM primers, and list your own, with /primer browse

`/primer` gains a browse/library view and ships with a ready-made corpus of 61 product-management primers, so you can explore a whole curriculum of trustworthy, source-cited explainers without generating anything first — and your own primers show up in the same place.

- **A built-in library of 61 PM primers.** `/primer` now ships a curated, verified-source corpus spanning the PM curriculum — AI fundamentals, analytics, finance, design, marketing, strategy, and more. Every primer is a self-contained page with its sources, ready to read offline.
- **Browse and search the whole collection.** `/primer browse` (or `/primer list`, or just `/primer` with no topic) builds a single filterable, searchable page of every primer — faceted by category, audience, and depth, with a card per primer linking straight to it. The page is fully offline: open it from disk, no server or network needed.
- **Your primers and the curated ones, together.** The library folds in any primers you've generated yourself (shown under "Yours") alongside the shipped corpus (shown under "Curated"), so everything you can read is reachable from one page. The page is regenerated on demand and stays out of version control.
- **Skill quality & internals.** The browse page is produced by a zero-dependency generator with its own self-test and a test suite that builds against the shipped corpus; the curated corpus is committed while the generated page is gitignored (mirroring `/frameworks`). A stale internal documentation pointer in the skill's learnings step was also corrected.

## 2026-06-14 — pmos-toolkit 2.77.0: browse your backlog in a web page with /backlog web

`/backlog` gains a `web` verb that opens your epics and stories as a clean, read-only web page instead of scrolling raw Markdown. It's a live view: a tiny local server re-reads your backlog files (and any in-flight claims) on each load, so what you see in the browser always reflects the real state on disk.

- **A read-only backlog viewer in your browser.** `/backlog web` launches a single-file HTML view of your whole backlog — a tree of epics and their stories, the groom/next/releases queues, and filters to narrow by status, route, plugin, or kind. It's purely for reading and navigating; nothing in the page can edit, claim, or release anything, so it's always safe to leave open while a build loop runs.
- **Always shows the live state.** The view is served by a small zero-dependency local server that re-reads your `backlog/` files and active claim locks on every request — no stale snapshot, no separate export step. In-progress stories show who's holding them. When you're done, the server shuts down cleanly.
- **Stays out of the build loop's way.** The server only ever reads; it never opens a write handle to your backlog and never touches the claim lock, so running the viewer can't race or interfere with `/feature-sdlc build` or `/complete-dev --epic` working in the same repo.

## 2026-06-14 — pmos-toolkit 2.76.0: /mytasks gets a Todoist-class local web app, plus projects, subtasks, and recurrence

`/mytasks` grows from a terminal task list into a full personal task manager you can drive from a browser or the command line — with projects, nested subtasks, and repeating tasks. Everything stays local: your tasks live as plain files in your repo, and the web app talks to a tiny zero-dependency server that re-reads those files on every request, so the terminal and the browser are always looking at the same source of truth.

- **A single-file web app for your tasks.** `/mytasks web` opens a three-pane Todoist-style interface in your browser — projects in a sidebar, a task list in the middle, and details on the right. You can add, edit, complete, reorder (drag-and-drop), and organize tasks without touching the command line. It's one HTML file served by a small local server; nothing is uploaded anywhere and there's no build step.
- **Projects, subtasks, and recurrence everywhere.** Tasks can now belong to a project, nest under a parent as subtasks, carry a manual sort order, and repeat on a schedule. Completing a recurring task automatically spawns its next occurrence. These capabilities are available identically from the terminal and the web app — full parity, one data model.
- **A faster terminal grammar.** The CLI gains a quick-add token grammar (set project, parent, recurrence, and ordering inline as you type) and nested rendering that shows subtasks under their parents, so the keyboard-first workflow keeps up with the web UI.
- **Your existing workstreams migrate automatically.** The old `workstream:` field is renamed to `project:` and your tasks are migrated in place the first time the new version runs — idempotent and safe to re-run, with no manual cleanup.
- **Skill quality & internals.** Recurrence lives in a single shared module so the CLI and the server can never drift; the task store gained content-hash versioning with optimistic-concurrency conflict detection (so two tabs editing at once can't silently clobber each other); and the web server, core library, and client app are covered by a 66-check self-test suite.

## 2026-06-13 — pmos-toolkit 2.75.2: the backlog claim-lock now works in repos that use ES modules

A bug fix for one specific failure: in a host project whose `package.json` declares `"type": "module"`, the backlog's story-claim lock script silently died on startup — which quietly disabled the whole `/loop … build` claim/unclaim/reconcile machinery in exactly the repos most likely to run an unattended build loop.

- **The claim-lock script is now `claim-lock.cjs` (was `.js`).** Node reads a bare `.js` file as an ES module when the surrounding project opts into ESM, and the script is written in CommonJS — so it crashed before doing any work. The explicit `.cjs` extension pins it to CommonJS regardless of the host project's module setting. Every reference across `/backlog` and `/feature-sdlc` was repointed; the rename flows automatically through the scaffolding that ships the script into your repo.
- **A regression test now guards it.** The test suite spins up a throwaway project with `"type": "module"` and asserts the lock still acquires, releases, and self-tests cleanly there, plus a structural check that no bare `.js` script can sneak back into the scripts directory.

## 2026-06-13 — pmos-gamekit 0.1.0: a new casual-games plugin, opening with /solitaire (Klondike)

A brand-new plugin whose whole job is to let you **play a casual game** right from your skills — no install, no account, no cloud. Its first game is `/solitaire`, a full single-player Klondike that opens in your browser.

- **`/solitaire` is a complete, self-contained Klondike.** The entire game — rules, board, drag-and-drop, draw-1/draw-3, undo, win detection — ships as one HTML file with all CSS and JS embedded. There are no external assets and nothing to download; the skill just launches it.
- **Launch is one local, zero-dependency step.** A new reusable `_shared/game-launcher` substrate runs a tiny Node server on an ephemeral port and points your browser at the game — no framework, no package install, clean shutdown when you're done. Every future game in the plugin reuses the same launcher.
- **The game logic is testable, not just playable.** The Klondike engine is separated from rendering so it can be exercised headlessly: a bundled `tests/run.mjs` checks move legality, foundation rules, undo purity, and win detection (13 checks), and the launcher has its own server smoke test (5 checks).
- **First member of a growing kit.** `pmos-gamekit` is registered as its own marketplace plugin with the charter "help me play a casual game"; `/poker` (No-Limit Hold'em) is already queued to reuse the same launcher.

## 2026-06-13 — pmos-toolkit 2.75.1: /feature-sdlc worktree isolation is now real, not nominal

`/feature-sdlc` (and its `define` / `build` / `skill` modes) now reliably *enters* the isolated worktree it creates, instead of creating the worktree on disk but continuing to work in the main checkout. This is what makes parallel `define`/`build` sessions genuinely safe to run side by side.

- **The worktree you create is the worktree you work in.** Previously the orchestrator could create a worktree, fail to enter it (the `EnterWorktree` tool is loaded on demand and guards against being called without explicit instruction), and then silently drive the worktree by absolute path from the main checkout — defeating isolation, risking `git add -A` cross-contamination between concurrent sessions, and breaking `--resume`. The skill now loads the worktree tool before calling it, treats reaching that step as the authorization to call it, and **hard-asserts that the session actually re-rooted** before proceeding — handing off cleanly if it didn't, never improvising remote control.
- **Parallel sessions stay out of each other's way.** Because each run now lives inside its own worktree, you can keep multiple `define` sessions open to grow the backlog without one run's uncommitted work bleeding into another's release.

## 2026-06-13 — pmos-toolkit 2.75.0: /complete-dev ships several release-ready epics in one pass

`/complete-dev --epic` now releases more than one epic per invocation, so a session that finished several epics can ship them all without re-running the release ceremony by hand each time.

- **Bare `--epic` is now a picker, not a one-at-a-time prompt.** Interactively, it presents a **multi-select** list of the release-ready epics and ships each selected epic in turn as its own independent release (its own merge train, gate, changelog, version bump, and tag).
- **`--epic <id1>,<id2>,…` ships an explicit list in order.** Name the epics you want, and they release sequentially — each precondition-checked on its own (an unknown or not-yet-ready id refuses the whole run before anything ships).
- **`--non-interactive` drains the shelf.** A bare `--epic --non-interactive` ships **all** release-ready epics with no prompt — the lights-out path for unattended release loops — framed as a documented mode branch, not an auto-pick of a deferred question.
- **Stop-and-report on the first failure.** If an epic's train hits a merge conflict, a red gate, or a push failure, the loop stops and the remaining epics are left untouched; a per-epic outcome summary (`shipped (vX.Y.Z)` / `FAILED` / `not attempted`) makes clear that already-shipped epics are irreversible. `--epic <id>` still behaves exactly as before (a loop of one), and `--stories` stays restricted to a single explicit `--epic <id>`.

## 2026-06-13 — pmos-toolkit 2.74.0: /explainer-video — turn any source into a narrated slideshow video

A new `/explainer-video` skill turns a single document, pmos artifact, or web URL into a watchable narrated `.mp4` — a deck distilled to one idea per slide, narrated by a synthetic voice, and assembled with ffmpeg. It joins `/diagram`, `/logos`, and `/summary-tldr` as a shareable-artifact authoring tool, and runs end-to-end **locally at `$0`** — there is no cloud-TTS path in the skill, by design.

- **Any source → one idea per slide.** It ingests a PDF, markdown/HTML/text file, pmos artifact, or web URL in-session (native `Read` for text incl. PDF pages, `WebFetch` for URLs — no bundled PDF parser), then distills a length-calibrated deck where each slide carries exactly one idea and bullets are minimal support. `--length quick|standard|deep` sets the target.
- **Reuses the source's own figures.** A deterministic figure inventory pulls charts and diagrams from the source (resolving relative URLs, dropping nav/tracking/spacer images) and places the original asset on the slide it illustrates, rather than paraphrasing it away.
- **Captured, narrated, and assembled with a binary self-check.** Slides are authored via the `_shared/html-authoring` substrate and screenshotted at 1920×1080 with Playwright; narration is one local WAV per slide (macOS `say` by default, auto-upgrading to Kokoro when installed); ffmpeg assembles a 16:9 H.264/AAC video with optional burned-in captions. A script-computed self-check verifies frame/slide parity, duration sum, non-silent audio, and resolved figure references before claiming success.
- **Deps are honest hard gates.** `ffmpeg`/`ffprobe` are probed up front; a missing narration engine or Playwright stops with an install hint rather than a silent skip. (The release smoke against a dense Microsoft Research PDF caught and fixed a real ffmpeg bug — `-shortest` overrunning a looped still image — that would otherwise have failed the duration self-check on multi-slide decks.)

## 2026-06-13 — pmos-toolkit 2.73.0: /summary-tldr — a faithful TL;DR of any source

A new `/summary-tldr` skill turns any single source — an article or web URL, raw text, a PDF, an image, an email thread, a tweet/thread, a podcast episode, or a video URL — into a grounded, front-loaded summary. Its north star: a reader who never saw the original comes away with the source's actual claims, numbers, and takeaways — not a meta-description of what the document is "about."

- **Any input, with honest degradation.** Each source kind gets its own preprocessing — web pages fetched and stripped, PDFs and images read natively, email threads de-duplicated and ordered, tweet threads stitched in posting order, podcasts/videos transcribed (via pmos-learnkit's transcriber when installed). When extraction is partial or impossible, it flags low confidence or asks for a paste — it never fabricates content it couldn't read.
- **Compression you confirm.** It measures the source, proposes an intent band — Tight ~10–20%, Standard ~20–30% (default), or Detailed ~30–40% — bounded by a length-scaled word cap so even long sources stay TL;DRs, and confirms the target before writing (or honors `--compression`).
- **Grounded, not hand-wavy.** A hybrid extract-then-generate pipeline pulls a keyfact list first and writes to cover and assert it; exact numbers, entities, and named conclusions are preserved, and a meta-description ("this article discusses X") is a hard failure.
- **A first-time-reader review pass.** Before emitting, it grades the draft from a fresh reader's perspective — coverage, faithfulness, standalone readability, asserts-not-describes, coherence — with up to two remediation loops and any residual gaps surfaced, not hidden.
- **Pick a style; get a durable artifact.** Choose key-takeaway bullets (default), an executive narrative, nested bullets, or a layered/progressive read (or `--style`), with an optional `/diagram` handoff. Output saves as a self-contained HTML doc and refreshes a `summary-tldr` library listing.

## 2026-06-13 — pmos-toolkit 2.72.0: /logos — propose & generate on-brand SVG logo candidates from a brief

A new `/logos` skill turns a brief — free text, a web URL, and/or existing brand assets — into a *set* of on-brand logo candidates, authored as real vector SVG in-session at `$0` (no paid image-generation API, ever). It is a sibling of `/diagram`: same renderer hard-gate, same deterministic-metrics-plus-vision eval shape.

- **Decomposition-first.** Rather than emit one mark, `/logos` decomposes the brief into N named logo needs (a brand mark, a feature icon, a few nav glyphs…) with rationale, then works each need independently.
- **Style-profile extraction from any reference.** Point it at a URL (Playwright screenshot + scraped CSS colors / `theme-color`), a local image (SVG parse if vector, k-means palette if raster), or an existing SVG seed (corner radii, stroke weight, geometry read from path commands) — every candidate is conditioned on *and* checked against the extracted palette, corner-style, stroke-ratio, and mood. Text-only briefs derive the profile from mood adjectives.
- **2–3 structurally-divergent variants per need**, each a standalone self-contained `.svg` (valid XML, single `<svg viewBox>`, no raster embeds, no `<script>`, namespaced gradient/clip ids).
- **Hybrid evaluator gates every candidate.** Deterministic SVG code-metrics as hard gates (no raster embed, bounded color count, min effective stroke at 16px, square-ish icon viewBox, path-budget) plus a renderer-backed vision check (favicon-16px legibility, monochrome-still-reads, brief-fit). No renderer present (Playwright → rsvg-convert → cairosvg) ⇒ it refuses to run with an install hint, exactly like `/diagram`.
- **The deliverables logos actually need.** Combination/emblem/wordmark marks also emit an icon-only variant; every non-flat-theme candidate emits a flat monochrome fallback. A single self-contained `logos.html` showcases every need × variant inline, on light + dark, at full + favicon size, with per-file download links and the inline-comments overlay.
- **A bundled starter theme set** — flat-minimal (default), line/outline, geometric/monogram, gradient/duotone, badge/emblem, and dimensional-flat (filter-based soft depth) — pickable per need or auto-selected.

## 2026-06-13 — pmos-toolkit 2.71.0: year-prefixed backlog & task ids

Backlog and task ids now carry a two-digit year prefix — `<YYMMDD>-<rand3>` (e.g. `260613-waf`) instead of `<MMDD>-<rand3>`. The change keeps ids coordination-free (no shared counter, minted from crypto randomness) while making them unambiguous across year boundaries, so a December item and the following January item never collide on month-day alone.

- **Every reader stays backward-compatible.** A single triple-accepting validator now recognizes all three forms — the original 4-digit ids (`0001`…`0019`), the interim `<MMDD>-<rand3>` ids (`0612-d14`), and the new year-prefixed ids — so nothing you already have is rewritten or invalidated. The `/feature-sdlc define` merge gate accepts all three too.
- **One format, one home.** The scheme is defined once in the shared tracker substrate and cited by `/backlog`, `/mytasks`, and `/feature-sdlc` rather than re-specified in each — so the three skills can't drift out of agreement.

## 2026-06-13 — pmos-toolkit 2.70.0: /ripple-effects — simulate the downstream effects of a proposal, then refine it

A new `/ripple-effects` skill — a sibling of `/grill` — takes any proposal (a file, a pipeline-doc stem, or inline text) and walks its *external* ripple tree: "and then what?" Where `/grill` interrogates whether a decision is internally defensible, `/ripple-effects` traces what the decision sets in motion downstream, then uses what it surfaces to help you refine and de-risk the proposal.

- **Futures-Wheel simulation across a product lens set.** It generates first-order effects across Users, Business, Team/Org, Technical, Market, and Ethics/Risk, then recursively expands each into second- and third-order ripples. Depth is yours to dial: `--orders 1|2|3` caps the recursion, `--depth brief|standard|deep` governs breadth (same semantics as `/grill`).
- **Every notable effect scored, none filtered away.** Each ripple is tagged likelihood × impact × desirability (good/bad/mixed) and the interrogation is ordered by leverage — high-impact, uncertain, or negative effects first — but it surfaces every notable effect, not just a top-N.
- **A scored consequence map before any questions.** You see the full 1st→2nd→3rd-order tree first, then a grill-style loop asks one question per effect — mitigate, accept, design-around, or invalidate — each with a recommended answer; a mitigation can spawn a new chain and a surprise can insert a missed effect.
- **A durable report you can annotate.** Optionally saves a single self-contained HTML doc — the scored tree, the interrogation transcript, and a refinements/residual-risks summary — with the inline-comments overlay. Tree-only by design; no diagram to render.

## 2026-06-12 — pmos-toolkit 2.69.0: the build loop self-heals stories that crash mid-build

When an unattended `/feature-sdlc build` loop crashed partway through a story (mid-`/execute`, mid-`/verify`), that story used to leak forever — stuck at `in-progress` with its claim still held, neither done nor blocked, silently jamming the loop. `build` now reconciles in-flight stories *before* it picks new work.

- **Resume-first step 0.** Before picking the next story, `build` looks for one it left `in-progress`. If the claim is absent, stale, or its own from a prior tick, it re-enters that story's worktree and resumes from where it crashed (via the phase cursor) instead of starting over — then stops, honoring the one-story-per-iteration contract.
- **Own-claim reclaim without the wait.** Each loop claims with a stable per-loop holder (`build:<root-session-id>`), so the next tick recognizes its *own* abandoned claim and reclaims it immediately — no 4-hour stale-lease wait. A *different* driver's fresh claim is still respected.
- **Forward-progress poison guard.** A story that keeps crashing without making progress is capped (2 unproductive resumes) and set to `blocked` with a diagnosable note — attempts, last completed task/sha, in-flight phase — so a genuinely poisoned story can't head-of-line-block the loop. Any new commit since the last attempt resets the counter.
- **Finalize-only on a post-verify crash.** A crash *after* `/verify` passed but *before* write-back lands on write-back and finalizes idempotently — a flaky re-run never flips a correct PASS to `blocked`.

## 2026-06-12 — pmos-learnkit 0.21.0: /book-summary — verified public takeaways from any book, PM-framed

A new `/book-summary` skill turns the public conversation around a book into durable, product-ready takeaways — without reproducing the book or making you read it cover-to-cover.

- **Verified public sources only.** It curates author interviews, podcasts, talks, reputable reviews, and corroborating posts about a named book — every source fetched and identity-matched at runtime, nothing pulled from memory.
- **Theme-grouped, PM-framed takeaways.** The big ideas are distilled into themed takeaways translated into product practice, in a single self-contained HTML artifact.
- **Audience- and depth-shaped.** Tune vocabulary for senior vs all PMs and size the run with `--depth brief|standard|deep` (persisted per project).
- **Stays in its lane.** It summarizes public material *about* a book — it does not summarize a user-supplied PDF, reproduce the book's text, or transcribe audio.

## 2026-06-12 — pmos-learnkit 0.20.0: /frameworks browse UI — clearer selection, list-first, multi-select filters

The `/frameworks` library browser gets a round of browse-UI fixes so scanning and filtering the collection feels right.

- **Selection that stays put.** Picking a framework highlights it in place without yanking the page — no more auto-scroll stealing your spot in the list.
- **List view by default, with one-click layout switches.** The library opens in a scannable list; icons let you flip between compact, detailed-card, and list layouts.
- **Multi-select filters with an applied bar.** Filter by more than one area/tag at once; the active filters show in an applied bar you can clear at a glance.
- **Clearer area labels.** The category rename makes the grouping read the way PMs actually think about it — display-only, so the underlying corpus and the programmatic `--json` contract are unchanged.

## 2026-06-12 — pmos-toolkit 2.68.0: concurrency-safe backlog ids (no more duplicate-id corruption)

Two parallel `define` sessions branched off the same backlog could mint the *same* id — both grabbed `0016` — silently corrupting the tracker: slug-suffixed filenames give no git path conflict, and the hand-merged `INDEX.md` gained duplicate rows. Backlog ids are now coordination-free, the define merge refuses colliding ids, and `INDEX.md` is a regenerated artifact.

- **New id format: `<MMDD>-<rand3>`.** New backlog items get ids like `0612-k3f` — today's month-day plus three random characters minted from `crypto` randomness with no shared counter — so two people (or two worktrees) creating items at the same moment can't collide. Existing 4-digit ids (`0001`…`0019`) stay valid forever and are never rewritten; everything that reads an id accepts both forms.
- **The define merge refuses duplicate ids.** `/feature-sdlc define` now runs an id-uniqueness gate beside its path-scope check: if a definition branch introduces an id that already exists on main, the merge stops loudly and names the offending id — the exact `0016` collision that slipped through before is now caught before it lands.
- **`INDEX.md` is a derived artifact.** The backlog index is regenerated from the item files (the only sanctioned writer is `rebuild-index`), never hand-merged, and its sort never keys on the id — so non-monotonic ids order correctly and a stale hand-edit can't reintroduce a duplicate row.

## 2026-06-12 — pmos-toolkit 2.67.1: Skill quality & internals

- **`/feature-sdlc define` cleans up after itself.** The Define loop now exits its worktree and tears down the redundant `define/<epic-id>` branch the moment the docs-only definition merge lands — so the next `build` starts from your main checkout instead of a stale define worktree, stories spin fresh per-story branches, and the `/complete-dev --epic` release train fast-forwards cleanly (no more stray `--no-ff` merge). Paused (un-merged) define runs still keep their worktree for `--resume`. Teardown ownership is now documented in one place: define owns its own worktree; the release train touches per-story worktrees only.

## 2026-06-12 — pmos-toolkit 2.67.0: `compact_mode` setting — skip `/compact` prompts when autocompact is on

Add `compact_mode: manual | auto` to `.pmos/settings.yaml`. Set it to `auto` when you have autocompact configured — the pipeline stops asking you to run `/compact` and instead trusts autocompact to handle context between phases. Default is `manual`, so existing installs are unaffected.

- **`/feature-sdlc` compact checkpoints.** In `auto` mode the pre-phase AskUserQuestion is skipped entirely; a single log line confirms the checkpoint was bypassed (`compact_mode: auto — checkpoint at <phase> skipped; autocompact active`). In `manual` mode (or absent) behaviour is unchanged.
- **`/execute` phase-boundary handler.** In `auto` mode the `HALT_FOR_COMPACT` message drops the `/compact` instruction; the hard stop is preserved — you still re-invoke `/execute --resume` after each phase, but you no longer need to run `/compact` yourself.
- **Trust-based.** The skills trust that autocompact is configured and active; they do not verify it at runtime. If autocompact is not active, context growth is unmanaged — configuring it correctly is the user's responsibility.

## 2026-06-12 — pmos-toolkit 2.66.1: skill feedback always goes through the loop

`/skill-sdlc --from-feedback` now routes into the skill three-loop **every time**, not just for multi-skill batches. The earlier "offer the loop once 3+ skills are in scope" threshold is gone — a single-skill fix is a perfectly valid one-story epic, so the loop is the uniform path. Pass `--monolithic` for the old single-pass behaviour when you just want a quick one-shot fix.

## 2026-06-12 — pmos-toolkit 2.66.0: the three-loop now drives skill work too (`route: skill`)

The define → build → release loops — until now only for features — extend to skill work, so a batch of skill changes becomes an epic of one-skill-at-a-time stories you can grind through and ship as a single release.

- **`/skill-sdlc define` and `/skill-sdlc build`.** The skill SDLC gains the same two-door loop the feature pipeline has: `define` shapes a batch of skill changes into an epic and splits it into per-skill stories; `build` picks the next ready skill story, resolves its tier, builds it, scores it against the skill rubric, verifies it, and writes it back `done` or `blocked`. Run `build` on a loop or schedule for unattended throughput.
- **`/skill-sdlc --from-feedback` now offers the loop instead of always running one giant pass.** Hand it a design doc and it routes straight into a skill epic; hand it raw feedback and, once triage finds 3+ skills in scope, it offers to define an epic and grind per-skill — or stay a single batch (`--monolithic` forces the old behaviour). Small fixes still run in one shot.
- **Every skill is gated on its own.** Each skill story runs the full skill-eval rubric (deterministic + judge) before it can reach `done`, so a skill that regresses goes back to you `blocked` — it never silently ships. A skill epic shares one design doc its stories cite, keeping a multi-skill batch coherent.
- **One coherence check before a skill epic ships.** `/complete-dev --epic` now runs the deterministic skill-eval pass across the merged skills plus a single cross-skill coherence review (do aliases and the skills they forward to still agree? do shared contracts still hold?) — the one judgement gate over the assembled batch. Its changelog separates real new capabilities from internal quality work, so a pure-refactor epic reads as one "skill quality & internals" line, not a wall of how-it-was-built noise.

## 2026-06-12 — pmos-toolkit 2.65.0: /artifact becomes a depth-scaled document pipeline

`/artifact` grows from a draft-and-review tool into an end-to-end document pipeline you dial up or down with one flag — so a high-stakes doc arrives researched, stakeholder-critiqued, diagrammed, polished, and stress-tested in a single run, while a quick draft stays quick.

- **One dial: `--depth brief|standard|deep`.** It controls both how much pipeline runs and how many sections the doc has. Default is `standard`. `brief` is the fast path (draft + polish + a light grill); `deep` adds research and diagrams. The old `--tier lite|full` still works as a quiet alias.
- **Stakeholder critique, not just a rubric check.** At `standard` and `deep`, a panel of 3–4 stakeholder personas (defined per template, or recommended from context) reviews the draft in parallel and you reconcile their findings before it's final — distinct from the existing eval-criteria reviewer.
- **Research before drafting (`deep`).** `/artifact` decides whether external research is even warranted, proposes a research plan for your approval, fans out to gather verified sources, and saves them alongside the doc — every research-backed claim keeps its citation.
- **Diagrams that get checked before they land (`deep`).** It proposes diagrams, generates them via `/diagram`, validates each one, and only then inlines it — never inserting a broken visual. You can remember the preference per project.
- **Always finishes with polish and a grill.** Every run ends with a `/polish` pass (mechanical fixes auto-applied, voice-risky edits surfaced for your call) and a `/grill` stress-test scaled to the depth.
- **Proposes a template when none fits.** Ask for a doc type with no matching template and `/artifact` offers to research and author one for you — and to save it for next time (you opt in; it won't clutter your library by default).
- **Stays headless-safe.** The whole pipeline degrades cleanly in non-interactive runs and when `/artifact` is driven by another skill.

## 2026-06-12 — pmos-toolkit 2.64.0: three-loop backlog (define · build · release)

The backlog grows from a flat capture buffer into a three-loop system over **epics** and **stories**, so captured work actually moves.

- **Capture still costs one sentence.** `/backlog add "<title>"` is the whole required input; it silently wraps the new story in a same-titled epic so nothing needs structure up front. Acceptance criteria are required before the machine touches a story, never before you write the idea down.
- **Three queues, one dashboard.** Bare `/backlog` now shows what's waiting on **you** (`groom`), what the machine can pick up next (`next`), and what's ready to ship (`releases`). Each row comes with the exact next command to run.
- **Define a feature once, build its stories independently.** `/feature-sdlc define <epic>` shapes an epic's requirements + spec, splits it into stories, and plans each — then merges the docs to main. `/feature-sdlc build --next` then picks the next ready story (dependencies satisfied, in-flight epics first), claims it with a crash-safe lock, builds and verifies it, and writes it back `done` — or `blocked` with the gaps, for you to pick up. Run it on a loop or a schedule for unattended throughput; multiple drivers are safe.
- **Ship a whole epic as one release train.** `/complete-dev --epic <id>` merges an epic's finished story branches in dependency order, runs the repo's deterministic test/lint gate on the merged tree, then assembles one changelog and one version bump + tag for the epic. Bare `/complete-dev --epic` shows you what's release-ready first.
- **Tasks live in one place.** `/plan` now emits a `tasks.yaml` beside each plan; `/execute` reads it as its work queue and is the sole writer of task status, so progress is never smeared across two files. Work discovered mid-build is routed automatically — needed for the story's criteria → done inline; beyond them → captured as a new draft story.
- **Ideas stop evaporating.** At the close of `/ideate`, one keystroke captures a promising idea straight into the backlog (and never auto-captures one the pressure-test killed).
- **Sharper `/backlog`.** The read and maintenance commands (`list`, `show`, `archive`, …) now take plain natural language; the long-standing type-enum drift is fixed (all eight types are recognised everywhere).

## 2026-06-12 — pmos-utilities 0.2.1: skill-design P1/P2 — mac-health non-interactive block resync

The utilities share of the P1/P2 campaign (shipped alongside pmos-toolkit 2.63.0 and pmos-learnkit 0.19.0). `/mac-health`'s third-generation non-interactive block variant is replaced with the canonical byte-identical block (the all-plugins inline lint now covers it), plus a one-line `/reflect` touch-up. Patch release — content fixes, no new capability.

## 2026-06-12 — pmos-learnkit 0.19.0: skill-design P1/P2 — learnkit skills rewritten, `_shared` resynced to toolkit

The learnkit share of the 2026-06-10 skill-design review's P1/P2 campaign (shipped alongside pmos-toolkit 2.63.0). Behavior-preserving: the Batch-D adversarial review over the full diff confirmed zero lost contracts — every magazine verb, the GUID lifecycle (incl. the `transcribing` claim state), frameworks' `--json`, and the unified `--depth`/`--audience` dial all survive verbatim.

- **`_shared` resynced and de-fossilized.** The canonical non-interactive block is now byte-identical across all plugins (lint scope extended to every plugin); ~1,360 lines of dead substrate cargo deleted (execute-resume, phase-boundary-handler, msf/sim-spec heuristics, stacks/ — zero learnkit consumers, verified per file); html-authoring resynced from toolkit via `sync-shared.sh` (pmos-wordmark in `template.html`, current `style.css`, `resolve-input.md` msf slug fix) — all nine key files md5-identical to toolkit's.
- **/primer + /learn-list** — `source-floor.md` rewritten 141→36 lines to honor the shipped non-blocking design (the old four-strands blocking gate contradicted it); dial resolution now lives once in `_shared/topic-research/intake.md`; `sourcing-ladder.md`'s skill-naming leaks fixed (the substrate is skill-agnostic again, test-pinned).
- **/magazine** — the trust rule ("never fabricate; degrade honestly") hoisted to one prominent home; Phase 1 dispatch is a 7-line routing table; Phases 2–3 de-narrated; reserved `--format` dropped until implemented.
- **/frameworks** — `match.mjs` scoring fixes verified empirically against v0.18.0 (length-insensitive floor normalization, full-pool re-rank below floor, zero-score exclusion) + `--json` hardening (reranked flag, absolute diagram paths, null convention); stale `/diagram` anti-pattern bullet corrected.
- **/critical-thinking** — calibration exercises are now actually resolvable: the shape-7 generator pre-commits a hidden resolution and reveals it only after you state your probability.
- **/playbook** — articles render through the shared html-authoring template + `render.js`, so emitted articles are genuinely annotatable (inline pmos-comments, `pmos:skill` meta); guarded by a new skill-local render-surface test.
- **FR-tag soup stripped** across all six skills (each keeps one "Spec lineage" footnote); phase headings carry stable `{#kebab-slug}` anchors; both new repo hygiene lints PASS on every learnkit skill.



The full execution of the 2026-06-10 skill-design review's P1 (systemic hygiene) and P2 (design changes) across the plugin — one coordinated multi-wave campaign, behavior-preserving by contract (machine-coupled flags, log-line strings, state fields, output filenames all kept or explicitly aliased; verified by a repo-wide gate sweep plus four adversarial batch reviews over the full `main...HEAD` diff).

- **Design policies codified.** `skill-patterns.md` gains §H–§L: gates (deterministic = hard, judgment = advisory, arithmetic = script), flags (hybrid NL-first; argument-hints carry contract flags only, the rest become `nl-sugar` silent aliases; machine-coupled flags never renamed), phases (integer phases + stable `{#kebab-slug}` anchors; cross-references cite slugs), one-fact-one-home, and subagent model selection. `skill-eval.md` mirrors them 1:1 — now 53 checks (47 gated: 24 [D] + 23 [J]; 6 advisory; pass floor 43), with `--selftest` asserting the counts structurally.
- **Two new repo hygiene lints**, wired into CI (`.github/workflows/skill-hygiene.yml`): `tools/lint-flags-vs-hints.sh` (argument-hint ↔ body flag sync) and `tools/lint-phase-refs.sh` (every `Phase <N>` / `{#slug}` / cross-skill anchor must resolve). Both PASS across all 40 skills.
- **Five canonical `_shared/` substrate surfaces** replace the worst duplication: `findings-dispositions.md` (Fix/Modify/Skip/Defer + `[Blocker]/[Should-fix]/[Nit]`), `folded-phase.md`, `tier-matrix.md` (incl. the `--depth brief|standard|deep` dial), `reviewer-protocol.md` (≥40-char quote grounding, 2-loop cap), `psych-scoring.md` (judgment-assigned Watch/Bounce/Cliff bands), plus a now-canonical `sim-spec-heuristics.md`. Consumers cite; they no longer restate.
- **Every toolkit skill rewritten** to consume the substrate, drop FR-tag soup (each keeps one "Spec lineage" footnote), and adopt the flag/phase policies. Median SKILL.md roughly halved (spec 705→366 lines, requirements 721→406, wireframes 758→378 with a coherent renumber, readme 487→216 as a full intent-doc rewrite, mytasks+people 980→506). Notable structural work: /plan's four prose state machines replaced with model-executable equivalents; /architecture's judge modes merged and its drift-police scripts retired; /polish gains zero-dep `scripts/metrics.js` for its three metric checks; /diagram gets non-interactive self-fixing and a rebalanced rubric; /prototype gains the "what question must this prototype answer" gate and a `Verdict:` handoff line.
- **Cross-skill contracts repaired, not just preserved:** the `/feature-sdlc --tier <N>` passthrough is now a documented contract in /spec and /plan; the `output_format` valid set converged on `{html, md}` everywhere (legacy `both` → `html`); /plan's stale claim that /execute reads `execution_mode` frontmatter corrected.
- **Tests hardened against future refactors:** checked-in fixtures that grepped literal FR-tags/phase numbers were converted to renumber-proof slug/semantic greps; stale asserts (sync-shared, format valid-set, substrate-ref floor) aligned with the current contracts.



A reading-experience overhaul of the `/frameworks` library, shaped from seven pieces of feedback. The corpus is the same 272 frameworks; what changed is how you browse, read, and slice them — and how the diagrams sit inside each framework.

- **Three listing views.** `browse` now offers **Compact** (areas → comma-separated framework links), **Detailed** (cards with the framework's primary diagram as a thumbnail), and **List** (one bulleted row per framework with its description). Group-by is configurable — **area** (default) or **tag** — in the Detailed and List views.
- **Diagrams render inline, where they belong.** A new `diagram_anchors[]` field (a ≥40-char verbatim substring of the framework's body, parallel and equal-length to `diagrams[]`) places each diagram immediately after the block it illustrates instead of stacking them all at the top; an unanchored diagram falls back to a leading group. **418 of 421** diagrams are anchored to a specific block.
- **A sidebar reader that shifts the layout, not an overlay.** Opening a framework slides the listing aside and shows the detail in a sticky right-hand reader (≤720px it stacks) — no modal, no backdrop, no "where did the list go?" disorientation.
- **Decision-types regrouped into cognitive jobs.** The old vague enum (`judgment` / `analysis` / `prioritization` / `framing` / `estimation`) is retired and hard-rejected. The new 8-value taxonomy classifies each framework by the *thinking job* it does: **prioritize · decide · diagnose · estimate · strategize · design · communicate · frame** (+ `n/a`). A `validate-corpus` distribution gate keeps any one value from re-forming a mega-bucket (no value > 30%, `n/a` ≤ 5%). All 272 frameworks were re-derived; the live spread tops out at `strategize` 27.2%.
- **Tag-based filtering.** Filter the library by problem-tag chips (OR within the facet), composable with the area filter and free-text search.
- **Share + copy-markdown per framework.** The detail reader gains a share button and a copy-as-markdown button (with an `execCommand` clipboard fallback).
- **PMOS masthead** at the top of the library.

### Internal

- New `scripts/apply-rederive.mjs` — an incremental, idempotent **offline** re-derive path: re-classify a shipped corpus over its own `body_md` (no Notion round-trip), applying only valid `{decision_type, diagram_anchors}` entries and exiting non-zero on any invalid one. `build-library.mjs` rewritten with `parseBlocks`/`renderBody` (inline-anchor placement) and the three-view client app; `validateAnchors` is shared from `derive-fields.mjs`; the distribution gate lives in `validate-corpus.mjs`.
- A `/verify` code-review pass caught and fixed a latent diagram↔anchor index-misalignment in `build-library.mjs` (a missing SVG could shift a later diagram onto the wrong anchor); the fix zips by original index before dropping missing slots, with a red-green regression test.
- **Known / accepted residual:** the skill-eval check `a-name-verb-or-gerund` fails — `frameworks` is a library noun, not a verb/gerund. Accepted in skill-eval and reconfirmed in `/verify`: renaming would break the public `/frameworks` command, its directory, and the marketplace entry, and is out of scope for a browse-UX revision; sibling skills (`/primer`, `/magazine`, `/backlog`) share the noun convention.
- Authored end-to-end via `/feature-sdlc skill --from-feedback` (the `/skill-sdlc` alias), Tier 3. Triage / requirements / grill / spec / plan / verify artifacts ship under `docs/pmos/features/2026-06-10_frameworks-library-revamp/`.

### Breaking changes

None for users. Internally, the `decision_type` enum is a clean break — the five pre-0.18 values are rejected by `validate-corpus`/`derive-fields`; any out-of-tree corpus must re-derive. The shipped corpus is already migrated.

---

## 2026-06-07 — pmos-learnkit 0.17.0: `/frameworks` — your searchable offline library of ~270 PM frameworks

A new learnkit skill that turns "I'm stuck on this decision — what thinking tool fits?" into a ranked shortlist. Describe a problem and `/frameworks` returns the 2–5 most relevant frameworks (RICE, JTBD, Kano, regret-minimization, …), each with a one-line "why it fits", the curator's PM's-take, and an owned inline SVG diagram — or browse the whole filterable collection offline from `file://`. It ships a pre-built, verified corpus so there's nothing to fetch on first use.

- **A 272-framework corpus, ingested once and shipped.** Sourced from a Notion framework database via a two-stage pipeline (deterministic Stage-A split/derive/validate scripts + an in-session Stage-B agent pass). Each record carries `problem_tags`, a `decision_type`, `lifecycle_stage`, and when-to-use / when-not-to-use guidance, so free-text matching is precise rather than keyword-soup. Re-ingest anytime with `/frameworks sync` (`--changed-only` for the cheap path).
- **Every framework owns its diagram — 421 inlined SVGs, never a hot-link.** A primary structural diagram per framework, plus, for the 94 frameworks whose source described multiple *distinct* structural sub-models, up to two extra owned SVGs (149 extras in all). All are self-contained (no `<image>`, no expiring S3 refs), inlined into the library at build time, and rendered on a consistent light palette.
- **A `--json` API for other skills.** `/frameworks --json "<problem>"` returns a ranked, machine-readable match list (confidence-floored) so other pmos skills can ask "which framework for this?" programmatically.
- **Offline, single-file library.** `browse` opens a self-contained `index.html` — search by problem, filter by area and decision-type, expand any framework for its diagram(s), PM's-take, and references — that works from `file://` with zero network.

### Breaking changes

None. New additive skill.

### Internal

- Authored via `/feature-sdlc skill` (the `/skill-sdlc` alias), Tier 3, skill-new. Requirements/spec/plan under `docs/pmos/features/2026-06-07_frameworks-skill/`. Corpus population (W4) and the per-framework diagrams (W4 primary + W4b second-pass extras) were generated by parallel multi-agent workflows. The execute-time D5 deviation — direct owned-SVG generation instead of `/diagram` at scale, after a probe proved `/diagram` cannot run unattended — is documented in `reference/ingestion.md`.
- Corpus validates clean (name+body 100%, diagram 100%, 0 dangling refs, 0 invalid tags); all five Stage-A script `--selftest`s + the structure/build-library/split-corpus/json-contract suites green; browser smoke confirms multi-diagram detail views and search/filters. skill-eval: 19/19 deterministic + 18-pass/2-n-a LLM-judge; `/verify` pass.

---

## 2026-06-07 — pmos-learnkit 0.16.0: `/magazine` prep + background worker now actually work end-to-end

A real two-run shakeout (a mixed newsletter+podcast build, then a `watch --install`) revealed that `/magazine`'s documented `prep` and background-worker entrypoints were silently non-functional for a common setup (whisper.cpp + Homebrew + Substack bundles) — the right output only appeared because the work was done by hand around them. This release makes those entrypoints do what they promise, with loud self-checks instead of silent failure.

- **Newsletters are crawled, not mis-queued for transcription.** `prep` now routes by feed `type` (only `podcast` feeds are transcribed), not by whether an item carries an audio file. Every Substack post ships an audio enclosure, so the old logic queued whole newsletters for a slow, wrong transcription pass and never crawled the article text. Now newsletters are crawled and podcasts are transcribed — and `prep` warns if a newsletter ever lands in the transcribe queue.
- **The transcription worker no longer fails silently.** The drain now passes each podcast's configured `whisper_model` to the transcriber (it previously passed none, so a whisper.cpp model never resolved and episodes were quietly requeued with nothing transcribed). Any failure is now logged to `watch.log` instead of vanishing.
- **`watch --install` makes whisper reachable from the scheduler.** The generated launchd/cron job now carries an explicit `PATH` that includes your whisper install (e.g. Homebrew's `/opt/homebrew/bin`), so the background worker can actually find `whisper-cli`/`ffmpeg` — previously it couldn't, and transcribed nothing forever.
- **Install verifies itself before declaring success.** `watch --install` now runs a smoke check under the scheduler's own minimal environment and reports `found-whisper: yes · model …: resolved` — or warns loudly (naming PATH/model as the likely cause) rather than printing a bare "Installed."
- **Forward-only really means forward-only.** A fresh `watch --install` seeds each podcast's "since last run" anchor to now, so the first background tick pulls only new episodes instead of the entire back catalogue (one real install had queued ~2,000 episodes back to 2021).
- **One consistent feed key + a stale-ledger warning.** Feeds are now keyed by their slug everywhere (ledger, cursors, card badges); older URL-keyed positions are migrated automatically. `status` and first-run setup now surface orphaned cursors from renamed/removed feeds instead of mistaking a stale config dir for a clean first run.

### Breaking changes

None. Existing ledgers migrate on the next run (URL-keyed cursors → slug). All script self-tests and the structure/watch/bundles suites pass.

### Internal

- Authored via `/feature-sdlc skill --from-feedback` (the `/skill-sdlc` alias), Tier 2. Requirements/spec/plan ship under `docs/pmos/features/2026-06-07_magazine-entrypoint-fixes/`. New regression coverage: `structure.test.sh` FR-R1..R6 + extended `watch.test.sh`.

---

## 2026-06-07 — pmos-toolkit 2.62.0: `/reflect` moves to pmos-utilities and reviews every plugin

`/reflect` — the session retrospective that turns a working session into paste-back feedback for skill authors — used to live in `pmos-toolkit` and only noticed `pmos-toolkit:*` skills. It now lives in **pmos-utilities** (where cross-cutting, environment-level tooling belongs) and reviews invocations of **every** installed pmos plugin — toolkit, learnkit, and utilities — in one pass.

- **Sees the whole marketplace.** A session that ran `/magazine`, `/primer`, and `/spec` now gets retro blocks for all three, not just the toolkit one. Detection matches any `pmos-*:*` namespace, and frontmatter lookup resolves each skill across whichever plugin owns it.
- **New home.** Invoke it as `/pmos-utilities:reflect` (or just `/reflect`). The `/feature-sdlc` end-of-pipeline retro gate now calls it at its new address.
- **Same output, same flags.** Single- and multi-session modes (`--last`, `--days`, `--since`, `--project`, `--skill`, `--scan-all`), severity tags, and the paste-back shape are unchanged.

### Breaking changes

If you invoked the skill by its fully-qualified name `/pmos-toolkit:reflect`, use `/pmos-utilities:reflect` instead. The bare `/reflect` trigger and all flags are unchanged.

### Internal

`git mv` of the single-file skill from `pmos-toolkit` to `pmos-utilities`. Bumps both plugins: pmos-toolkit 2.61.0→2.62.0 (skill removal + `/feature-sdlc` retro-gate address fix) and pmos-utilities 0.1.0→0.2.0 (skill arrival, tagged separately via a follow-up `/complete-dev --plugin pmos-utilities`). Phase 2 detection broadened to all `pmos-*:*` namespaces (now captures the owning plugin per invocation); Phase 3 frontmatter resolution walks every `plugins/*/skills/<name>/`; Phase 6 learnings step inlined to drop the `_shared/learnings-capture.md` dependency, since pmos-utilities is self-contained (no `_shared/` substrate). Verified: deterministic skill-eval exit 0, non-interactive block byte-identical to canonical, both `/reflect` test fixtures repointed and green.

---

## 2026-06-07 — pmos-learnkit 0.15.0: `/magazine` keeps your podcasts transcribed in the background

`/magazine`'s slowest step was always transcribing podcasts at the moment you asked for an issue. This release adds an **optional local background worker** that keeps your subscribed podcasts transcribed ahead of time, so building an issue becomes mostly cache hits instead of a long wait — opt-in, and fully reversible.

- **`/magazine watch` — a background transcription worker.** `/magazine watch --install` sets up a local scheduled job (every 6h by default) that discovers new podcast episodes and transcribes them in the background at low priority. `--status` shows the queue and what's warm; `--run-now` forces a pass; `--uninstall` removes it cleanly (your cached transcripts are kept). Install **refuses** unless whisper is detected and you have at least one podcast feed — it won't set up a job that can't do anything.
- **One queue, no surprises.** Your podcast ledger becomes a transcription queue that the background worker and your interactive `/magazine` runs share. Both enqueue (the worker forward across feeds; an issue request — including a backfill like "last 6 months" — for its window) and both drain it, but nothing transcribes the same episode twice, and the background activity can **never** change what counts as "new" in an issue.
- **Issues build fast, even on a big backlog.** When you ask for an issue, `/magazine` transcribes a bounded number of episodes up front, renders those plus a show-notes fallback for the rest, and leaves the remainder queued for the worker — so you get your issue now and the backlog finishes itself.
- **Safe by default.** Forward-only on first install (no transcribing your entire back-catalogue on day one; `--backfill <days>` pulls history on purpose), background/low-IO priority, an optional `--ac-only` battery guard, and a per-episode retry cap so a dead download never loops forever.

### Platforms

macOS (launchd) and Linux (systemd user timer, with a crontab fallback). Windows is not supported. Requires `whisper` or `whisper.cpp` for transcription (the feature refuses to install without it; it never auto-installs whisper).

### Breaking changes

None. The synchronous `/magazine` build still works with no watcher installed; `state.json`, cursors, dedup, and every existing command are unchanged. The ledger gains an additive `transcribing` state and Phase 1 dispatch grows a `watch` selector.

### Internal

Authored via `/feature-sdlc skill` (the `/skill-sdlc` alias), Tier 3. New `scripts/magazine-lock.js` (O_EXCL lockfile, PID-stale recovery — no `flock` dependency) and `scripts/magazine-watch.js` (pure launchd/systemd/cron generators + install/status/run-now/uninstall); queue ops in `magazine-state.js`; `enqueue`/`drain` modes in `magazine-run.js`; `transcribe.sh --detect`; new `reference/watch.md`. Tested: 4 script `--selftest`s, `structure.test.sh` 77/0, new `tests/watch.test.sh` 5/0, deterministic skill-eval exit 0, skill-eval [J] reviewer PASS, and a live launchd install/run/uninstall smoke (which caught and fixed a drain budget-burn bug). SDLC artifacts under `docs/pmos/features/2026-06-07_magazine-transcription-queue/`.

## 2026-06-06 — pmos-learnkit 0.14.0: `/magazine` ships a verified PM feed catalog + starter bundles

`/magazine` no longer assumes you already have a `feeds.yaml`. It now ships a **verified PM feed catalog** and **ready-made starter bundles**, so a new PM goes from an empty subscription list to a relevant, populated feed set in one command — and the research method that produced the catalog is baked into the skill so it can be re-run and refreshed.

- **Verified catalog, bundled.** Ships `data/catalog/` — a 9-column TSV each for newsletters (174 active) and podcasts (129 active), every feed RSS-verified, plus a foldered `feeds.opml` of the active feeds. Each row carries Access, Cadence, Tags, Status, and Last Post date so staleness is honest, not hidden.
- **8 starter bundles (4 newsletters + 4 podcasts).** `essentials` (the canon) plus thematic cuts — newsletters: `growth-monetization`, `ai-for-pms`, `strategy-leadership`; podcasts: `ai-and-tech`, `founders-business`, `leadership-career`. Each bundle is active-only (~12–18 feeds) with a documented inclusion rule, shipped as OPML under `data/bundles/` with a `bundles.yaml` manifest.
- **Two new commands.** `/magazine bundles` lists what's available; `/magazine add --bundle <id> [--medium newsletter|podcast]` imports a bundle through the existing validate → dedup → batch-approve → `feeds.yaml` rail (the bundle's medium folder supplies the newsletter/podcast type that generic OPML import has to guess). Verification-first is preserved — a shipped feed that fails to fetch at import is reported, not silently added.
- **First-run onboarding offers bundles.** New users are shown the bundle menu during setup, with the two `essentials` bundles as the recommended starter pick (so non-interactive runs auto-pick a sensible default). Skipping is allowed.
- **Re-runnable curation.** The 4-phase, verification-first research method is bundled as `reference/feed-curation.md`, with a thin `/magazine curate [--audience <a>] [--media <m>] [--out <dir>]` wrapper. It never writes into the read-only plugin cache — installed runs write to `~/.pmos/magazine/curated/<date>/`; the maintainer refreshes shipped data with `--out plugins/pmos-learnkit/skills/magazine/data/` from the repo.

### Breaking changes

None. Existing `/magazine` builds, `add`/`remove`/`list`/`add --from`, the pipeline, and `state.json` are unchanged. The Phase 1 dispatch grows `bundles`, `add --bundle`, and `curate` as recognised selectors.

### Internal

Authored via `/feature-sdlc skill` (the `/skill-sdlc` alias), Tier 3. New `scripts/bundles.js` (zero-dep list/resolve/validate-data) + `tests/bundles.test.sh` (15 checks); `structure.test.sh` 62/0; deterministic skill-eval 19/19 [D] + 18/18 [J]. Catalog data generated deterministically from the verified research output; the generation rules are mirrored in `reference/feed-curation.md` Phase 5 so `curate` reproduces them. SDLC artifacts under `docs/pmos/features/2026-06-06_magazine-feed-bundles/`.

## 2026-06-05 — pmos-learnkit 0.13.0: `/magazine` issue output UX — layouts, read-state, color, dropdown filters

The first wave of the `/magazine` issue output-UX upgrade: every issue is now a far more skimmable, navigable digest — without losing the core promise (one self-contained HTML file that works offline from `file://`, zero dependencies). Eight reader affordances, all in `render-issue.js`, all progressive enhancements (the grid + every bullet + the read/listen links still work with JavaScript disabled):

- **Three reading layouts, switchable in-issue.** A header toggle picks Grid (default), Carousel (In-shorts-style — one card at a time with ◀▶ buttons + arrow keys), or Listicle; the choice persists in `localStorage`.
- **Read-state tracking.** Mark any card read (a ✓ button or the `m` key); a header counter shows "N of M left"; a "hide read" toggle clears finished cards. State persists per issue (`localStorage`, keyed by issue date + GUID) and syncs across a top-pick's two card copies.
- **Keyboard skim.** `j`/`k` move between cards, `o` opens the focused card's link, `f` jumps to the filter, `m` toggles read; `←`/`→` page the carousel.
- **Source cues at a glance.** Newsletters and podcasts get a subtle distinct left-border accent; each feed gets a small deterministic color dot; tag chips carry a stable per-tag pastel color (same tag → same color across issues).
- **Catch-up budget.** The header sums reading time into "~N min to skim · Xh Ym of audio" so you can size the session before diving in.
- **Uniform cards.** Bullet lists collapse to 3 with a "show more" toggle, keeping the grid tidy.
- **Dropdown filter bar.** The old checkbox/chip wall is replaced by compact dropdowns — Feed and Tag (multi-select with a count badge), Type, and Status (read/unread) — plus the date range and a live "showing X of Y" counter.

### Internal

Authored via `/feature-sdlc skill --from-feedback` (the `/skill-sdlc` alias) from a `/ideate` brief, Tier 2, streamlined-inline. Wave 1 of a 3-wave roadmap; Waves 2–3 (RSS thumbnails, a background transcription cron, per-post diagrams) are deferred pending cheap validation probes. All changes are confined to `scripts/render-issue.js` (+ `reference/issue-format.md`); the `items.json` input contract, the pipeline, and `state.json` are unchanged. The inline `--selftest` grows a per-feature assertion (now also covering the JS-off bullet clamp); `structure.test.sh` 50/0; deterministic skill-eval 19/19 [D] + 20/20 [J]. A Playwright browser pass caught two runtime issues the Node selftest can't see — read-state never persisting (`[].slice.call(Set)` returns `[]`; fixed with `Array.from`) and an ugly native-`<select multiple>` filter bar (replaced with `<details>` checkbox dropdowns) — both fixed and re-verified in-browser.

## 2026-06-05 — pmos-utilities 0.1.0: new plugin — `/mac-health` Mac diagnostics

Debut of **pmos-utilities**, the third plugin in the `pmos-skills` marketplace. Its charter is the one the other two don't serve: *maintain my environment* — standalone diagnostics and cleanup that are neither a feature-delivery step (pmos-toolkit) nor a learning artifact (pmos-learnkit).

- **`/mac-health`** moves here from pmos-toolkit (it diagnoses a hot/slow Mac — that maintains your environment; it neither ships a feature nor teaches a topic, so it failed both other charters). Read-first, diagnose-then-confirm: it surfaces orphaned (`ppid 1`) processes, browser-extension/helper leaks, stale dev services, and sleep-assertion blockers, and never kills a process or stops a service without explicit confirmation. It carries a right-sized, self-contained non-interactive contract (no dependency on pmos-toolkit's substrate): mode resolution, destructive-actions-defer, and a `pmos-utilities: /mac-health finished` summary.

### Internal

Scaffolded per the new-plugin contract: paired `.claude-plugin`/`.codex-plugin` manifests at 0.1.0, registered (version-free) in both `marketplace.json` catalogs, and added to `CLAUDE.md`'s plugin-charter table + release-policy plugins list. Skill lives at the canonical `plugins/pmos-utilities/skills/mac-health/SKILL.md`. The skill content shipped to `main` with the pmos-toolkit 2.61.0 release; this entry + the `pmos-utilities/v0.1.0` tag formalize the debut.

## 2026-06-05 — pmos-toolkit 2.61.0: architecture-review remediation (Waves 1–6) + `/comments` inline resolver

The full remediation program from the 2026-06-05 pmos-toolkit architecture review — six waves of substrate consolidation, a visual-identity pass, and the close-out of the v2.58.0 inline-comments migration. User-facing highlights:

- **`/feature-sdlc` Phase 0e — one consolidated soft-gate confirm (W3).** The five non-destructive soft gates (ideate, creativity, wireframes, prototype, retro) collapse into a single prompt seeded from `.pmos/feature-sdlc.lastrun.yaml` (main-repo-root anchored so it survives worktree cleanup), mirroring `/complete-dev` Phase 0a. Per-gate short-circuits; wireframes re-fires on a frontend-signal change; destructive/judgement prompts still fire. New `--reset-defaults`.
- **Visual identity "Mono Minimal" across every HTML artifact (W11).** A single substrate change fans out to all 14 emitting surfaces: burnt-orange `#C2410C` accent + stone neutrals (light + dark), a bundled base64-inlined **JetBrains Mono 700** display face (no CDN), a `pmos` masthead wordmark with a CSS accent caret, and zero-padded `[NN]` section counters (CSS `::before`, not in the DOM — anchors/quotes unaffected). The `/diagram` **technical** theme reconverged on the same palette via a shared `_shared-palette.yaml` bridge; the `editorial` theme keeps its alternate palette by design.
- **`/comments resolve` now reads & writes the inline thread block (sidecar fully retired).** The CLI resolver was the last piece still using the `<artifact>.comments.json` sidecar that v2.58.0 replaced with an inline `<script id="pmos-comments">` block. It now round-trips threads in that block (atomic temp-then-rename write, optimistic-concurrency `version` bump, `git add <artifact>` only). Fixing this exposed — and we fixed — a latent anchor bug where a thread's own stored `quote_anchor.text` could satisfy its own anchor; the anchor resolver now masks the inline block from its search corpus. The obsolete comments-drift pre-commit hook (whose installer was already removed in v2.58.0) is retired.
- **Non-interactive contract, tightened (W2 + W14).** The inline non-interactive block shrank 83→27 lines across every block-carrying skill (the awk extractor moved out of the runtime prompt into Section D of `_shared/non-interactive.md`); the W14 posture documents the re-paste tax (no auto-propagate tool) and adds self-documenting exemption markers (`<!-- non-interactive: delegated … -->` for thin aliases alongside `refused`). Three real `--non-interactive` gaps (architecture, comments, ideate) were closed, not masked.

### Internal

Shared-substrate consolidation: new `_shared/tracker-crudl.md` (backlog/mytasks/people, W4), `_shared/persona-journey-alignment.md` (creativity/msf-req/msf-wf, W5), `_shared/writing-principles.md` (W5), and `learnings-capture.md` relocated into `_shared/` with 20 citations repointed (W13). Inline templates moved to `reference/` in `/spec` (1019→695) and `/plan` (861→636) to stay under the eval body cap (W8). First-class skill identity + structural gates for `/comments`, `/changelog`, `/session-log` (W9); persona theater-checks added to `/design-crit` + `/survey-design` (W10). `mac-health` left pmos-toolkit for the new `pmos-utilities` plugin (W6; released separately). Resolver migration carries 5 inline-fixture node tests + a schema-refuse shell test; the browser `comments.js` test suite (26 cases) and `template_comments_bake.test.sh` were updated to the v2.58.0 inline contract; full comments suite + `/verify` coverage gate green.

---

## 2026-06-03 — pmos-learnkit 0.12.0: `/magazine` second-retro fixes — output quality, cross-feed dedup, stored window

Five more findings from `/magazine`'s first run — output-quality and design-gap issues the agent had quietly worked around (which is exactly why the prior retro missed them):

- **Titles render cleanly.** The v0.11.1 entity-decode fix covered URLs but not the `title`, so a feed title like `Hugging Face&apos;s Clem Delangue` was re-escaped by the renderer into literal `&apos;` on the card. `fetch-feed.js` now decodes entities in `title` and `description` too (body stays raw HTML); a regression asserts the decoded title.
- **Cross-feed duplicates collapse automatically.** The same article syndicated across two feeds (a newsletter re-publishing a podcast episode) arrives under different GUIDs, which GUID-keyed dedup can't catch — forcing the agent to hand-dedupe every run. `magazine-state.js` now keys a **canonical link** (scheme/`www.`/tracking-param/trailing-slash insensitive) and records the second sighting as `status: duplicate` (`duplicate_of` set) — catalogued in the ledger but kept out of the issue snapshot. This supersedes the v1 "no URL canonicalization" grill decision.
- **The issue grid dedupes too.** `render-issue.js renderIssue()` previously deduped nothing (only the library view did), so an un-deduped pass rendered two cards. It now collapses by link as a backstop to the ledger-level dedup.
- **The build window is stored, not asked.** First-run setup now captures `interest.yaml :: defaults` (`days`, `max_per_feed`), and a plain `/magazine` resolves the lookback/cap from those defaults — no interactive window prompt after setup. A flag still overrides for one-off runs.
- **Whisper model-reload cost is documented.** Per-episode model + backend reload is recorded as an accepted known limitation (speed is not a goal; transcripts cache forever), with a persistent `whisper-server`/batched invocation noted as a deliberate future option — no code change.

### Internal

Authored via `/feature-sdlc skill --from-feedback` (the `/skill-sdlc` alias), Tier 2. Each code fix ships a regression in the owning script's `--selftest`; `structure.test.sh` grows from 41 to 50 checks (FR-Q1..Q5). Deterministic skill-eval 19/19 [D]. A second cross-feed fixture (`sample-feed-2.xml`) drives the dedup integration test.

---

## 2026-06-03 — pmos-learnkit 0.11.1: `/magazine` reliability fixes from first-run retro

Six fixes to `/magazine` surfaced by its first real end-to-end run — two of them silent-failure blockers that cut against the skill's "trust" promise:

- **Crawls no longer silently truncate.** `extract-article.js` flushed stdout and exited in the same tick, so a long article captured through a pipe was cut at the pipe buffer (~8–64 KB) and summaries were built on a truncated tail. It now exits from the write callback, after the buffer drains. A &gt;64 KB piped-child regression guards it.
- **whisper.cpp transcription works from a model name.** `whisper_model: base` was passed straight to `whisper-cli -m`, which needs a ggml *file path*, so whisper.cpp users silently fell back to show-notes. `transcribe.sh` now resolves a model name to `ggml-<name>.bin` across `$WHISPER_MODEL_DIR`, `~/.pmos/magazine/models`, the Homebrew share dir, and `./models` — or exits 3 with an actionable hint (still never fabricates).
- **Capability is probed the way the script detects it.** The skill now tells the agent to probe via `transcribe.sh --selftest` (which detects whisper *and* whisper.cpp) rather than a bare on-PATH check, and to treat only exit 3 as "no transcription."
- **A real Stage-A entrypoint.** New `magazine-run.js <discover|prep|status>` drives discovery and prep over the existing scripts, so the agent no longer hand-writes a throwaway driver per phase. `prep` redirects each crawl to a file (never a pipe), closing the truncation class at the call site too.
- **URLs from feeds are decoded.** `fetch-feed.js` now decodes XML entities (`&amp;`→`&`, numeric refs) in link/enclosure/guid, so podcast enclosure query params are curl-safe.
- **Podcast GUIDs are filesystem-safe.** `transcribe.sh` sanitizes GUIDs like `substack:post:198591907` for the transcript path while keeping the original as the ledger key.

### Internal

Authored end-to-end via `/feature-sdlc skill --from-feedback` (the `/skill-sdlc` alias), Tier 2. Each fix ships a regression in the owning script's `--selftest` (or `structure.test.sh`, now 41 checks). Requirements/spec/plan ship under `docs/pmos/features/2026-06-03_magazine-retro/`.

---

## 2026-06-03 — pmos-learnkit 0.11.0: `/playbook` — turn your own AI sessions into shareable PM case studies

New **pmos-learnkit** skill. `/playbook` mines your own Claude Code session history for **one repo** and synthesizes focused, self-sufficient **case-study articles** that teach fellow PMs how you used AI to solve a real problem — the prompt you started with, how you refined the idea, the trade-offs you decided, and the skills you reached for. Each problem becomes a shareable HTML article + a tweet thread, every one gated behind a human safety review. Concretely:

- **Repo-scoped, worktree-aware resolution.** A multi-signal resolver attributes sessions to a repo via three independent signals — nested-prefix cwd match, sibling-directory token-strip (so a `<repo>-<slug>` worktree still counts even after it's merged and deleted), and branch-in-merge-history. Branch-only matches are flagged ambiguous and excluded rather than mis-attributed; sibling-only matches are kept as low-confidence so the worktree undercount the resolver exists to prevent doesn't creep back.
- **Interactive-only by default.** Headless/subprocess sessions (`claude -p`, the SDK, subagent transcripts) are filtered out using a `permission-mode` record-type discriminator; `--include-headless` overrides. The scout reads only flat top-level session transcripts and deliberately does not recurse into per-session `subagents/` subdirectories.
- **Problem-clustering + article synthesis.** Attributed threads are clustered by topic into discrete problems; each cluster is mined for its starting prompt, refinement turns, load-bearing decisions (`AskUserQuestion` anchors + free-prose pushbacks), and the skills invoked, then written up as a teachable article with an accompanying tweet thread.
- **Human is the share gate.** The skill **never posts anything** and never marks output "safe to share" on its own — every emitted article ships with a safety-review checklist, and publishing is always an explicit human step.

**Why**

PMs accumulate a lot of hard-won AI working knowledge inside their session logs, but it's locked in a format nobody revisits — scattered across worktrees, interleaved with headless noise, and shaped for the machine, not for a colleague. `/playbook` turns that exhaust into teaching material: it finds the real interactive work (even when it happened on a branch that's long since merged away), reconstructs the problem-solving arc, and produces something a peer can actually learn from — while keeping the author firmly in control of what, if anything, ever leaves their machine.

## 2026-06-03 — pmos-learnkit 0.10.0: `/magazine` — your RSS backlog as one offline digest

New **pmos-learnkit** skill. `/magazine` turns your scattered public RSS subscriptions — newsletters *and* podcasts — into one skimmable, filterable, self-contained HTML digest of what's new since last time. A resumable local pipeline crawls each article, transcribes podcasts (whisper-if-installed), summarizes every item into 3–5 trustworthy bullets with a read/listen link, auto-tags from a closed registry, and ranks a Top-picks lane. Concretely:

- **One digest, offline.** Each run produces a durable issue plus a searchable cross-issue library, all working from `file://` — no app-hopping, no server.
- **Resumable local pipeline.** Crawl → transcribe → summarize → tag → rank runs in stages that resume where they left off, so a long backlog or a flaky network doesn't force a restart.
- **Feed management built in.** `add <url>` / `add --from <file>` / `remove <name>` / `list`, with assisted import from CSV / OPML / screenshot. `--days N`, `--feed <name>`, and `--max-per-feed N` scope each run.
- **Trust-first summaries.** Every item is condensed to 3–5 bullets with a link back to the source; auto-tags come from a closed registry rather than free-form invention. v1 is public feeds only.

**Why**

A feed backlog is read in a dozen apps or not at all. `/magazine` collapses the catch-up ritual into a single skimmable artifact you own and can re-open offline — surfacing what's worth your attention (the Top-picks lane) without asking you to trust a summary you can't trace back to its source.

*(Backfilled 2026-06-03: the 0.10.0 release shipped its version bump, README row, and tag but omitted this changelog entry.)*

## 2026-06-03 — pmos-learnkit 0.9.0: `/primer` + `/learn-list` share one topic-research front half

`/primer` and `/learn-list` now run the **same research front half** — intake → canon discovery → topic outline → verified per-topic sourcing — extracted into a shared, skill-agnostic substrate at `_shared/topic-research/` that both skills inline. Each keeps its own back half: `/primer` synthesizes the verified sources into a teachable prose artifact; `/learn-list` ranks and annotates them into a curated list. Concretely:

- **Unified controls.** Both skills now take `--depth brief|standard|deep` (one effort dial) and `--audience senior-pms|all-pms` (one reader axis). `/learn-list`'s old `--mode` and `--level` flags are **retired** — passing them returns a clear error naming the replacement (`--mode` → `--depth`, `--level` → `--audience`). `/learn-list` is now explicitly PM-shaped, like `/primer`.
- **`/primer` gains** the anti-slop hard gate, rank-then-verify sourcing, curation harvest, outline **provenance**, and topic **dedupe** that previously lived only in `/learn-list` — plus a new closing **"Where this connects" adjacency-pointer section** (depth-scaled). Its source-floor is now an eval-time *coverage signal*, not a sourcing gate: `/primer` reads and synthesizes **every** verified source per topic (the old "≥3-source short-circuit" is gone), and each outline topic's verified shortlist becomes the evidence for the matching section.
- **`/learn-list` gains** the unified intake and PM audience-shaping while keeping its list/annotation/follow-list/paste-block output unchanged.

**Why**

The two skills had independently grown the same front half with cosmetic differences, so every research-quality improvement had to be made twice and the two drifted. `/learn-list`'s output is really a precursor of the work `/primer` does — list the sources vs. read-and-synthesize them — so the front half should be one thing. Extracting a shared substrate (rather than merging the skills or having one call the other) lets provenance, dedupe, the anti-slop gate, and adjacency land in both at once, while the substrate stays strictly skill-agnostic: it emits typed outputs (a richness verdict, a ranked shortlist, an outline + provenance rung) and each skill owns how it reacts — a boundary enforced by a test that fails if the shared docs ever name a consuming skill.

## 2026-06-03 — pmos-learnkit 0.8.2: `/primer` — browse every primer from one sidebar page

`/primer` now regenerates a single `docs/pmos/primer/primers.html` listing after each run, so every primer you've generated is reachable from one place. The page is a sidebar of all your primers (newest first), with the most recent auto-selected and its content loaded in place — click any entry to read it without leaving the page. Previously the skill regenerated a generic `index.html` built for feature-folder artifacts, which grouped primers under meaningless pipeline-phase headers (`00 Pipeline`, `01 Requirements`, …); the new listing puts them all under one "Primers" heading, ordered by date. Rejected drafts are never listed.

**Why**

A primer is only useful if you can find it again. The old index reused the feature-pipeline viewer, so a growing primer library read like a half-built feature folder. A flat, newest-first sidebar that opens straight to your latest primer matches how the library is actually used — ramp up now, come back and browse later. No JS or CSS changes were needed; the existing HTML-authoring substrate already does sidebar nav, default-selection, and in-place loading.

## 2026-06-03 — pmos-learnkit 0.8.1: `/learn-list` — every paid book gets an authoritative summary

`/learn-list` now attaches the **most authoritative summary reference** to every emitted book that isn't free — *wherever* the book appears (reading-list-by-topic and adjacent rabbit holes, not just the follow-list). Previously the book-summary contract only fired in the follow-list, so a paid book in the body of the list (e.g. *The Four Steps to the Epiphany*, *The Lean Product Playbook*) shipped with no way to skim its high-level ideas — even though paywalled *non-book* sources already got an inline "free alternative" line. The contract is now wired into Phase 4 sourcing and the Phase 5 adjacency walk, a Phase 6 "book-summary parity" eval check refuses to write a list where a paid book lacks a summary-or-explicit-none note, and the artifact template carries an inline summary slot so the renderer can't drop it. Genuinely-free books are exempt, and the honest "no good summary found — read the book" escape is preserved (so *The Mom Test* still reads correctly).

**Why**

A book is a paywall too. The list already treats paywalled articles as a skim-without-paying problem and surfaces a free alternative; paid books were the one source type left out, which made them the hardest items to grok at a glance. Closing the asymmetry makes the whole list skimmable by the same rule, while the explicit none-note escape keeps the verification-first "never fabricate a summary" discipline intact.

## 2026-06-03 — pmos-learnkit 0.8.0: `/learn-list` — verified, anti-slop curated reading lists

New `/learn-list <topic>` skill: turns any topic into a curated, multi-format reading list organized by a **canon-derived topic outline** — find the field's canonical books, top practitioners, and existing curations by live search; derive the outline from where they agree (provenance always shown); then fan out one subagent per topic to source articles, newsletters, threads, talks, podcasts, and book summaries. Every emitted link is **fetched and verified this run** — the skill never ships a URL it hasn't confirmed is reachable, is the named content, and actually supports its ≤2-sentence "why included." It closes with a follow-list (people · newsletters · podcasts · books-with-summaries · practitioners' signature writings) and a copy-ready paste-block for Readwise/Notion. Effort scales via `--mode quick|standard|deep` (fan-out width + adjacency depth); `--level beginner|practitioner` shapes the sourcing. Standalone learnkit utility; suggests `/primer <topic>` as a follow-up but never invokes it.

**Why**

Ramping on a topic means drowning in SEO/AI slop and page-1 noise, not knowing who the real experts are. Google and Perplexity optimize for an *answer*, not a *learning map*; "Awesome" lists are static and single-curator. The unmet gap is trust, non-obviousness, and curation — which a memory-based LLM structurally cannot provide. So `/learn-list` is built as a verification-first web pipeline (rank candidates cheaply, then fetch-verify only the survivors that ship) with an explicit anti-slop source-tier rubric, rather than a generate-from-memory list that 404s on the first click.

## 2026-05-29 — pmos-toolkit 2.60.1: `/complete-dev` bumps only the two plugin manifests

`/complete-dev`'s version-bump step now writes the new version to the two `plugin.json` manifests only (the `.claude-plugin` and `.codex-plugin` pair) and leaves both `marketplace.json` files untouched. Previously it also wrote the version into the two marketplace entries — which contradicts the repo invariant: marketplace entries are version-free catalogs, and the effective version is resolved from `plugin.json` at install time. The release dry-run summary and the pre-push-hook description were corrected to match (two bump targets; marketplace is a presence-only registration check). A couple of hard-coded references were also generalized so the skill reads cleanly for any plugin-marketplace repo.

**Why**

The old behavior would have written a `version` into `marketplace.json` entries that must stay version-free (per Anthropic's plugin guidance — `plugin.json` wins silently, so a marketplace version only invites drift). Aligning the skill with the actual pre-push hook removes a latent source of version-drift bugs at release time.

## 2026-05-29 — pmos-learnkit 0.7.0: `/critical-thinking` — practice choosing the right metric

`/critical-thinking` can now drill **metric choice**. A new *choose-the-metric* exercise hands you a goal or problem with no metric attached ("make onboarding feel effortless") and asks you to name the one metric that would tell you you're winning — then defend it as a faithful proxy for the goal, pair it with a guardrail, and call out how it could be gamed (Goodhart). Like every other drill it grades your *reasoning*, not a single "right" metric, and a new `metric-selection` muscle now accrues on your scorecard so you can watch it improve across sessions. Ask for it by name with "metric-choice drill," or just let a session mix it in.

**Why**

Choosing what to measure is one of the highest-leverage PM moves — pick a vanity metric and you optimize the wrong thing for a quarter. The existing drills exercised judgment about decisions; none trained the prior step of deciding *how you'd know you succeeded*. This closes that gap.

## 2026-05-29 — pmos-learnkit 0.6.0: `/critical-thinking` — PM reasoning practice

New `/critical-thinking` skill: a low-friction, time-boxed practice session that drills the reasoning muscles product managers actually use. Each session generates a varied mix of PM-scoped exercises **fresh at runtime** — pick-and-defend, assumption-hunt, spot-the-bias, calibration, second-order mapping, reframing, and more — across six PM domains (product design, prioritization/tradeoffs, metrics/experimentation, influence/stakeholder, strategy-under-ambiguity, GTM). There is no static scenario bank; every session is new.

Exercises are **graded on reasoning moves, not the answer** — the grader names the moves you made well and always surfaces at least one gap (no pure praise). An accumulating scorecard tracks per-muscle performance plus calibration (Brier score) across sessions, persisted as a JSON file so you can watch yourself improve. Pick a time band — `quick` (2–3 exercises), `standard` (4–5), `deep` (6–8), or `marathon` (uncapped, "another? / wrap up" every ~3).

The skill is standalone but can optionally pull scenarios from the current repo: if a `README` exists it frames product-decision scenarios from it; if not, it offers to study the code and propose a reusable `README.md`. Pass `--no-repo` to keep every exercise generic. Repo exercises are capped at 2 per session and never echo secrets.

**Why**

PM judgment is a practiced skill, but most "practice" is incidental and unscored. A repeatable drill that grades *how you reason* (not whether you picked the "right" option) and tracks calibration over time turns reasoning into something you can deliberately train.

## 2026-05-29 — pmos-learnkit 0.5.0: `/primer` sources tweets + LinkedIn posts

`/primer` Phase 2 (Research) gains a fourth, social-primary strand: tweets/threads and LinkedIn posts are now valid **primary** sources when a framework or observation lives only there. Discovery is active+bounded — deliberate `site:x.com` / `site:linkedin.com` qualifier searches (≤2 topic-level + ≤1 per named practitioner) plus routing any social URL that surfaces from the existing strands through the same path. Fetching uses a free ladder, never the paid X API and never a bare `x.com` URL (the login wall returns an empty body): single tweet → `api.fxtwitter.com/<user>/status/<id>`; thread → `threadreaderapp.com/thread/<root-id>.html` (with a fxtwitter self-reply walk when not unrolled); LinkedIn → direct fetch → `r.jina.ai` reader fallback; Playwright MCP is last-resort only.

Citations point at the **original canonical post URL** (the proxy is a fetch mechanism, never the citation), and social content is always paraphrased into the source `takeaway`, never reproduced verbatim — which keeps the reviewer's R1 (cites-real-urls) and R2 (no-plagiarism) trust checks passing. LinkedIn posts are fetched body-only with relative dates resolved to the absolute year. New `reference/social-sourcing.md` carries the full ladder + never-do rules; `reference/source-floor.md` adds `social` to the `source_strand` enum and counts social sources toward the depth-tier floor like any other usable source.

## 2026-05-28 — pmos-learnkit 0.4.0: `/primer` SVG diagrams self-contained under dark mode

`reference/diagram-style.md` now mandates that every inline SVG ship a full-viewBox background rect (`<rect x="0" y="0" width="<W>" height="<H>" fill="#fbfaf6"/>`) as its first drawn child, plus a CSS-style fallback (`style="background:#fbfaf6;border-radius:8px"`) on the `<svg>` element itself. The Phase 4 drafter inlines this file when authoring diagrams, so every new primer SVG inherits the rule.

**Why**

The primer's `assets/style.css` flips `--pmos-bg` to `#0b0b0c` under `prefers-color-scheme: dark`. Pre-0.4.0 diagrams rely on the page background showing through — under dark mode, dark strokes (`#222`) and gray labels disappear into the near-black page. The reviewer subagent reads markup, not rendered output, so R10 never caught it. Baking the background into the SVG makes every diagram self-contained regardless of page theme.

**Changes**

- New mandatory section "Background isolation" with the two-requirement contract (background rect + style fallback).
- Worked example updated to demonstrate both requirements.
- Anti-pattern added: "Diagrams without the mandatory background rect + `style=\"background:...\"` fallback".

## 2026-05-28 — pmos-toolkit 2.60.0: `/architecture --from-spec` mode + folded into /spec and /verify

`/architecture` gains a seventh mode — `--from-spec <spec-path>` — that audits a Tier-3 spec's `§Modules` + `§Architectural Assertions` against the loaded principles set (L1 + L2 + L3) by dispatching a judge subagent at `temperature: 0`, validating findings via a 6-rule orchestrator-side gate, and emitting the standard HTML+MD+JSON triplet at `{docs_path}/architecture/{date}_<slug>_from-spec.{html,md,json}`. The mode also lights up two new folded sub-phases in the SDLC: `/spec` Phase 6.6 (Tier-3 default-on, Tier-2 auto-upgrade-on-new-modules, Tier-1 skipped) and `/verify` Phase 4.7 (`--since <merge-base>` against the feature branch's diff). Both sub-phases follow the advisory-failure pattern (D11): folded-architecture crashes append to `state.yaml.phases.<host>.folded_phase_failures[]` and emit a chat `WARNING` but never block the host phase.

**What's new**

- **`--from-spec <spec-path>` CLI mode.** Mutually exclusive with `--since` / `--baseline` / `--deep`. Three D8 knobs control output: `--top-n <N>` (default 8), `--min-confidence <N>` (default 70), `--no-evidence-required` (disables the ≥40-char verbatim-quote requirement). Spec contract violations exit 65 with §9.4 stderr; usage errors exit 64. Spec parsing extracts `§Modules` (table → `{name, deps, role}`) and `§Architectural Assertions` (bullet list → `{text, section_id}`) via `node scripts/parse-spec.js`.
- **`/spec` Phase 6.6 (folded /architecture --from-spec).** Runs immediately after the spec's review loop closes. Tier-1 skips with a log line; Tier-2 runs `auto-upgrade-detector.sh` (a deterministic heuristic that resolves `§Modules` entries against the live repo tree — basename OR full-path match — and returns `{upgrade, new_modules, reason}`); Tier-3 runs unconditionally. The auto-upgrade-to-Tier-3 path fires only when the spec declares new modules absent from the repo. `--skip-folded-arch` is the explicit escape hatch. Re-invoking `/spec` re-runs Phase 6.6 idempotently (overwrites the prior triplet at the same path; no new orchestrator phase ID is created).
- **`/verify` Phase 4.7 (folded /architecture --since).** Runs after Phase 4's compliance tables. Tier-1 skips; Tier-2 dispatches with scoped `--since <merge-base>` (branch diff); Tier-3 dispatches with full `--since $(git merge-base HEAD main)`. The empty-diff log line `architecture: no changes since $SINCE; skipping` short-circuits when the diff is clean. `--skip-folded-arch` mirrors `/spec`'s escape. Findings are aggregated into `verify`'s compliance summary as an `Architecture findings` subsection.
- **Principles set (24 rules).** `plugins/pmos-toolkit/skills/architecture/principles.md` ships 11 L1 universal rules + 4 L2 TypeScript rules + 9 L2 Python rules. Each rule carries `id`, `layer`, `severity ∈ {must_fix, should_fix, consider}`, prose `description`, and `## Why` / `## How to verify` subsections (per the existing skill's rubric). `principles.yaml` is the structured loader source; `principles.md` is the human-readable rationale doc. A pre-commit drift hook (`bash plugins/pmos-toolkit/skills/architecture/scripts/install-arch-hooks.sh`) installs `check-principles-drift.sh` to refuse commits that desynchronize the two; bypassable via `git commit --no-verify` per D9.
- **Advisory-failure pattern (D11).** Folded-architecture crashes (judge dispatch timeout, validator hard-fail, etc.) append `{skill: 'architecture', ts, error_excerpt}` to `state.yaml.phases.<host>.folded_phase_failures[]` and emit `WARNING: architecture crashed (advisory continue per D11): <excerpt>` to chat. The host phase continues to PASS. `/feature-sdlc` Phase 9 (final-summary) surfaces all `folded_phase_failures[]` aggregates per FR-29.
- **State-schema invariance.** `/feature-sdlc`'s `reference/state-schema.md` carries **zero** top-level `arch-spec` / `arch-verify` / `architecture` phase IDs. The whole feature is folded sub-step only — verified by `test-feature-sdlc-state-invariance.sh`.
- **20 bash test suites.** 15 architecture (rule loader, validator, knobs, emit, drift hook, drift-hook installer, from-spec parser, judge prompt template, since-extension, tracer, principles-md coverage, auto-upgrade detector, findings validator, advisory-failure pattern, E2E + state-invariance + installer) + 3 spec (Phase 6.6 smoke / gate / re-run cascade) + 2 verify (Phase 4.7 smoke / sub-step). All green at release.

**Marketplace.json hygiene**

This release also strips the `version` field from both `.claude-plugin/marketplace.json` and `.codex-plugin/marketplace.json` entries — they were carrying a stale `2.57.0` value pre-existing this branch, which directly violates `CLAUDE.md ## Plugin manifest version sync` ("The `plugin.json` value always wins silently, so a stale manifest version can mask a version you set in `marketplace.json`"). The marketplace catalogs are now version-free; `plugin.json` is the single source of truth.

**Why this matters**

The shipped `/architecture` (v2.50+) audited code against principles; this release flips the same lens onto the spec — does the architecture you *committed to in the doc* match what's actually in the tree? Auditing both directions closes the loop where teams write idealized spec architecture and then drift silently as the code evolves. The folded sub-phases make this automatic at /spec time (catch drift the moment the spec is written) and at /verify time (catch drift before the merge lands).

**References**

- Feature folder: `docs/pmos/features/2026-05-28_architecture-in-feature-sdlc/` — requirements (Tier 3, 13 reshaped after grill), spec (47 FRs, 6 NFRs, 13 decisions), plan (16 tasks, 6 waves), /verify review report (Phase 7 PASS with 3 advisory deviations).
- Spec: `02_spec.html#mode-from-spec-cli` (§9.1 CLI signature), `#advisory-failure-pattern` (§14 D11), `#fr-29` (folded_phase_failures aggregation).
- 3 deviations logged for follow-up minor: (1) WARNING-phrasing divergence /spec ↔ /verify; (2) T15 E2E honest degradation — real-judge dispatch is a TN human API-smoke item; (3) shfmt not installed in dev env, TN lint degraded to `bash -n`.



Stakeholder comment threads on pmos-emitted HTML artifacts now persist as an **inline JSON block inside the HTML itself** — `<script id="pmos-comments" type="application/json">` between `<!-- pmos-comments:start -->` / `<!-- pmos-comments:end -->` sentinels. The legacy `<artifact>.comments.json` sidecar contract (pre-v2.59.0) and its pre-commit drift-hook installer are retired. The artifact is now the single source of truth; copy the file, the threads come with it.

**What's new**

- **Inline `pmos-comments` block.** Every pmos-emitted HTML artifact carries a sentinel-bracketed `<script id="pmos-comments" type="application/json">` block at write time. Read mode works from `file://`, `http://`, any browser, any protocol — the overlay reads the inline JSON on page load.
- **Write requires `http://localhost` via the launcher trio.** `comments-open.command` / `.sh` / `.bat` (macOS/Linux/Windows) spawn `serve.js` and open the artifact at `http://localhost:<port>/<artifact>`. The HEAD `/save` probe (FR-14) decides read-only vs. read-write on mount. `file://` opens are blocked from writing with a modal pointing at the launcher — avoids the "comment vanished" failure mode users hit when there was no server to receive the save.
- **Atomic writes + optimistic concurrency.** `serve.js`'s `POST /save` writes via temp-then-rename; on crash the artifact is intact and an orphan `.tmp` is logged to stderr at startup. Each request carries `expected_version`; a stale write returns 409 + reload banner (FR-17).
- **Migration script.** `scripts/migrate-sidecars-to-inline.sh [--dry-run] [path]` walks `*.comments.json` sidecars, injects each into the sibling artifact's inline block, deletes the sidecar. Idempotent; safe to re-run. Run once per fork at v2.59.0 to absorb pre-existing sidecars. The pre-commit installer that guarded the html/sidecar pairing was deleted in the same release.
- **Bundle size policy (NFR-02).** Authoring assets (`comments.js + comments.css`) capped at ≤20KB soft / ≤40KB hard, enforced by `.github/workflows/comments-bundle-size.yml`. The inline `pmos-comments` block has a 200 KiB soft-warn (NFR-03) emitted by `scripts/check-comments-coverage.sh` per artifact.
- **SVG anchoring (FR-52).** `/diagram` + `/wireframes` emit `data-anchor="<slug>"` on every `<g>` + top-level `<rect>`/`<path>`. Foreign embedded SVGs use bbox-based anchors.
- **Diff suppression.** `.gitattributes` marks `docs/pmos/**/*.html` as `linguist-generated=true -diff` — the inline JSON mutates on every comment write and the inline `<style>` + scripts are bulk; suppressing the default diff keeps PR reviews readable. Use `git diff --text` to opt back in.
- **Coverage gate.** `bash scripts/check-comments-coverage.sh` is wired into `/verify` Phase 7 Hard Gates; refuses completion if any of the 14 contract tests, 15 emit references, 1 resolver integration, or 2 anchor calibration tests are missing.

**Retired in this release**

- File System Access API (`showSaveFilePicker`) write path — replaced by serve.js POST /save.
- `localStorage` draft persistence — threads now live in the artifact, no client-side draft layer.
- Save-as-sidecar contract — see migration script above.
- `diff-match-patch` + `turndown` + `html-to-md.js` — `output_format=both` is retired (FR-12.1); inert until a future feature re-introduces MD export. The 14 apply-edit-at-anchor shims now use the substring-contains anchor-resolver path (≥40 chars), same Bitap shape, no DMP dependency.
- The Copy-Markdown toolbar button (`data-pmos-action="copy-md"`) — dead UI under FR-12.1.
- The pre-commit drift-hook installer that paired `<artifact>.html` with `<artifact>.comments.json` — sidecar contract is gone.

**Why this matters**

The sidecar-pair contract was an awkward half-step: artifacts felt portable until you noticed the threads lived in a sibling file that `cp` missed. The inline model collapses the trust boundary — one file, one source of truth, threads travel with the artifact. Read mode is now universal (any browser, any protocol); write mode is locked behind localhost because `file://` write-back is unreliable enough that silently dropping comments is the wrong default.

**Migration**

Run `bash scripts/migrate-sidecars-to-inline.sh docs/pmos` once on any fork after pulling v2.59.0. Idempotent. Removes sidecars after a successful inject; the pre-commit hook installer is no-op'd in the same release.

**References**

- Feature folder: `docs/pmos/features/2026-05-28_inline-html-artifacts/` — spec, plan, 13 task logs, /verify review report.
- Spec: `02_spec.html#fr-deletions` for the complete retirement inventory.

## 2026-05-28 — pmos-toolkit 2.58.0: `/ideate` gains Phase 3 Amplify (Brian Chesky's 11-star ladder)

`/ideate` learns to push past the obvious shape of a chosen finalist. A new opt-in Phase 3 between Expand and Pressure-test runs Brian Chesky's 11-star design exercise — generate a 1→11★ ladder per chosen finalist, identify the sweet spot (typically 7-8★), and **recommend** a concrete sweet-spot reframe that feeds Phase 4 Pressure-test. The reframe is what the pressure-test attacks; the original Phase-2 finalist is preserved on record alongside it. Fills a real asymmetry — pressure-test pulls ideas down to feasibility but nothing pushed their ceiling up first.

**What's new**

- **New Phase 3 Amplify, opt-in.** Gated to `idea-type ∈ {new, extend}`; auto-skipped for `idea-type=fix` (bugs don't have a UX ceiling to raise). Even on a passing gate, default is Skip (mirrors `/refine`'s "don't pay the cost unless it earns it"). `--amplify` forces opt-in; `--no-amplify` forces skip. Most ideas don't earn the ceiling-raising cost.
- **The skill recommends, doesn't dump.** After generating the 11-row ladder, the skill identifies the sweet-spot rung (almost always 7 or 8 — never 11, rarely 9-10) and produces a one-line "Finalist (sweet-spot reframe): …" that restates the original finalist with the sweet-spot rung's ceiling-raising element folded in. The confirm prompt presents three concrete options: **Use sweet-spot reframe (Recommended)** / **Stay with original Phase-2 finalist** / **Pick a different rung**. Never "pick from the 11 rungs" — that pushes synthesis onto the user.
- **Clean integer phase numbering.** Phases are now `0 Setup · 1 Frame · 2 Expand · 3 Amplify (NEW) · 4 Pressure-test · 5 Refine · 6 Write Artifact · 7 Handoff · 8 Capture Learnings`. No Phase 1.5 / 2.5 / decimal sub-phases.
- **New section in the artifact.** `<section id="amplify-ladder">` slots between `idea-variants` and `how-it-works`. Skill becomes 13 sections (was 12). When Amplify is skipped, the section carries an explicit `<em>Skipped — <reason></em>` placeholder so the artifact schema stays consistent — silent omission would break downstream tooling.
- **New reference doc.** `reference/eleven-star-ladder.md` carries Chesky's framing (Airbnb arrival-experience → surfboard-in-apartment example), the rung-by-rung anchor table (1=terrible, 5=baseline, 7-8=delightful/memorable, 11=deliberately absurd), sweet-spot selection rules, multi-finalist handling, and skip-signaling contract.
- **Two new anti-patterns** in the SKILL: **#11 Treating Amplify as default-on** (opt-in is the point), and **#12 Picking 11★ as the sweet spot / dumping the ladder without a recommendation** (the value lives in the *walk back* from 11; the skill MUST recommend, never present raw rungs).

**Why this matters**

`/ideate`'s existing shape — Frame → Expand → Pressure-test — has an asymmetry. Pressure-test pulls a chosen finalist down to earth (premortem, inversion, assumption-map) but nothing pushes its ceiling *up* before that. Generators like Expand are biased toward feasibility from the first variant; they rarely produce the 7-star moment that makes the 5-star baseline feel insufficient. Chesky's exercise is the canonical fix: by deliberately designing the 11-star (absurd, impossible), the 7-star sweet spot suddenly looks reasonable. "Surfboard waiting in the apartment because they know you surf" stops being crazy once "Elon Musk meets you at the airport with 5,000 people throwing a parade" is on the page.

The phase is opt-in because most ideas don't earn it — a routine extension or obvious feature doesn't need ceiling-raising. But for ideas with real UX surface area and ambition behind them, Amplify produces variants that Expand alone couldn't reach. The skill always **recommends** a concrete reframe to the user; it never abdicates synthesis to "here are 11 options, you pick."

**References**

- Brian Chesky, [Masters of Scale — "Do things that don't scale"](https://mastersofscale.com/brian-chesky/)
- Reid Hoffman, [How to Scale a Magical Experience: 4 Lessons from Airbnb's Brian Chesky](https://reid.medium.com/how-to-scale-a-magical-experience-4-lessons-from-airbnbs-brian-chesky-eca0a182f3e3)
- [Airbnb's 11-Star Experience framework](https://www.product-frameworks.com/11-Star-Experience.html)

## 2026-05-28 — pmos-toolkit 2.57.1: substrate — `## A.6 Optional skill-specific fields` registry

Tiny patch ride-along with pmos-learnkit 0.2.0. `_shared/pipeline-setup.md` gains a `## A.6` registry section documenting optional skill-owned keys in `.pmos/settings.yaml` — first entry is `/primer`'s new `default_primer_depth`. Doc-only; no behavior change. Bumped to satisfy the pre-push version-sync hook (any pmos-toolkit content change requires a bump per `CLAUDE.md ## Plugin manifest version sync`).

## 2026-05-28 — pmos-learnkit 0.2.0: `/primer` deeper, broader, practitioner-aware

`/primer` learns to read the room. Five fixes land together: senior-PM topics that used to come back as 3K-word skims with 7 mostly-overlapping sources now produce 4K–10K-word primers backed by 10–20+ sources, with named practitioner voices (not anonymous "industry experts") and named-company worked examples per H2 where they exist.

**What's new**

- `--depth brief|standard|deep` — explicit sizing with persistence. First run in a project surfaces a prompt; the answer writes `default_primer_depth` to `.pmos/settings.yaml` and subsequent runs read silently. Tiers map to word targets (2K–3K / 4K–6K / 7K–10K) and source floors (6 / 10 / 15).
- **Phase 2 practitioner+book naming step.** Before any URL generation, `/primer` lists 6–10 canonical practitioners and 3–5 canonical books on the topic. The primary research strand queries per-practitioner (`<name> <topic>`) and per-book free-entry (First Round Review, Lenny, podcast transcripts, author blogs, publisher excerpts). The old topic-frame queries (`<topic> overview`, etc.) become the demoted secondary strand. New `practitioner_index` field on `sources.json`; practitioners whose queries return zero usable sources are dropped silently with an OQ-buffer entry (no hallucinated authorities in citations).
- **Depth-aware source floor.** Source-floor.md §"Source floor = 4" becomes §"Source floor by depth tier"; the thin-source banner interpolates `{floor}` + `{depth}`.
- **Phase 1 topic-richness check.** A new heuristic next to the vagueness check returns `rich` (proceed), `narrow-by-design` (proceed with outline carve-out), or `thin` (surface 2–3 LLM-generated broader reframings + Keep-as-is + Abort). Pre-empts the failure mode where genuinely-narrow topics get padded into thin primers.
- **Worked-examples drafting hint.** `curator-lens.md` Phase-4 framing prompt gains a bullet directing the writer to try ≥1 worked example per H2 (named company, named product, named incident, or labeled hypothetical) — without inventing. The Phase-5 reviewer emits an informational `examples_per_h2_distribution` field on R10; the write gate surfaces a one-line note when ≥30% of H2s lack examples. Informational only — never blocks.

**Substrate update**

- `pmos-learnkit`'s `skills/_shared/` forward-ported to `pmos-toolkit` v2.57.0 parity in a separate commit on the same release branch: the inline-doc-comments substrate (`apply-edit-at-anchor.md`, comments overlay assets, diff-match-patch, the comments-open launcher trio) now lives under both plugins. No primer code wires it up yet — future enablement work.
- New shared `## A.6 Optional skill-specific fields` registry in `_shared/pipeline-setup.md` (both plugins): first entry documents `/primer`'s `default_primer_depth` setting.

**References**

- Feedback source: `docs/pmos/fixes/2026-05-28_primer-skill-fixes.md` (in `maneesh-dhabria/pmos-content`)
- Triage: `docs/pmos/features/2026-05-28_primer-skill-fixes/0c_feedback_triage.html`
- Spec: `docs/pmos/features/2026-05-28_primer-skill-fixes/02_spec.html`
- Plan: `docs/pmos/features/2026-05-28_primer-skill-fixes/03_plan.html`
- Verify report: `docs/pmos/features/2026-05-28_primer-skill-fixes/05_verify.html`
- Skill-eval iteration 1 (clean pass): `docs/pmos/features/2026-05-28_primer-skill-fixes/skill-eval-iter1.json`

## 2026-05-28 — pmos-toolkit 2.57.0: `/retro` renamed to `/reflect`

The session-retrospective skill is now `/reflect`. Same behavior, clearer name — "reflect on what just happened" reads more naturally than "retro this session". The `--from-retro` flag on `/feature-sdlc skill --from-feedback` becomes `--from-reflect`; the `retro-parser.md` reference and `retro.bats` integration test are renamed in parallel for consistency.

**Breaking change — no alias.** Anyone scripted around `/retro`, `--from-retro`, or `/pmos-toolkit:retro` must update to the new names. The historical phase identifier `state.yaml.phases.retro` is intentionally preserved (renaming would force a state-schema migration for in-flight `/feature-sdlc` worktrees). The noun "retrospective" / "retro" is preserved in prose where it describes the artifact, not the command.

**Migration:** find-and-replace `/retro` → `/reflect`, `--from-retro` → `--from-reflect`. CLAUDE.md, `/feature-sdlc`, `/complete-dev`, `/readme`, `/skill-sdlc`, `/prototype-sdlc`, and the top-level README have been updated in this release; historical pipeline artifacts under `docs/pmos/features/` and prior changelog entries are unchanged (they record what shipped under the old name).

## 2026-05-25 — pmos-toolkit 2.56.0: `/comments` — inline comment overlay on every pmos HTML artifact

Stakeholders can now annotate any pmos-emitted HTML artifact directly in their browser — highlight a span, leave a threaded comment, resolve from chat. No screenshots, no out-of-band Slack threads, no "what page did you mean" back-and-forth. The overlay JS + sidecar JSON are baked into every HTML emit; `/comments resolve <artifact>` walks the threads and dispatches each to its originating skill for surgical edits.

**What's new**

- New `/comments` skill with `/comments resolve <artifact>` in 4 modes: `--confirm-each` (default), `--batch`, `--auto`, `--non-interactive`.
- New launcher trio (`comments-open.command` / `.sh` / `.bat`) opens any artifact through a local Node server with the overlay pre-loaded. Chrome writes the sidecar `<artifact>.comments.json` directly via the File System Access API; Safari/Firefox buffer to localStorage and offer a Save-sidecar download.
- 14 pmos surfaces (`/requirements`, `/spec`, `/plan`, `/wireframes`, `/prototype`, `/diagram`, `/polish`, `/architecture`, `/readme`, `/survey-design`, `/survey-analyse`, `/ideate`, `/artifact`, `/feature-sdlc` × 2 emits) now bake `<meta name="pmos:skill">` + the comments overlay into every HTML emit, with per-skill `apply-edit-at-anchor.js` shims so each resolved thread routes back to the originating skill.
- SVG artifacts (`/diagram`, `/wireframes`) get `data-anchor` attributes on every `<g>` + top-level `<rect>` / `<path>`; foreign embedded SVGs fall back to bbox-based anchors.
- New pre-commit drift hook refuses to commit one half of the `<artifact>.html` / `<artifact>.comments.json` pair without its sibling. Install with `bash scripts/install-comments-hooks.sh`; bypass via `git commit --no-verify` for archival/migration scenarios.
- `/verify` Phase 7 Hard Gates now invoke `scripts/check-comments-coverage.sh` — refuses completion if any of the 14 contract tests, 15 emit references, or the resolver integration test is missing.
- Bundle-size policy: authoring assets (`comments.js + comments.css`) ≤20KB soft / ≤40KB hard; vendored `diff-match-patch.js` ≤100KB ceiling. Enforced by `.github/workflows/comments-bundle-size.yml`.

**References**

- Spec: `docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html`
- Plan: `docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html`
- Verify report: `docs/pmos/features/2026-05-23_inline-doc-comments/verify/2026-05-25-review.html`
- Manual smoke matrix: `plugins/pmos-toolkit/skills/comments/tests/MANUAL-fsa-fallback.md`

## 2026-05-24 — pmos-toolkit 2.55.0: `/wireframes` Phase 7 — Figma-like canvas view aggregating every screen

`/wireframes` now always emits a Figma-like `canvas.html` viewer alongside the per-device wireframe files. Every screen of every device renders on an infinite pan/zoom surface, with flow arrows derived from DESIGN.md user journeys and screens drag-positionable on the canvas. The curated layout persists to a `canvas.json` sidecar that round-trips across re-runs — drag a screen, click **Save layout**, drop the downloaded JSON next to the existing one, commit. Next time anyone opens the canvas they see the curated arrangement.

(Skips 2.54.0 — that version was concurrently shipped for `/prototype-sdlc`; this release rides 2.55.0 to avoid the collision. See the 2026-05-13 origin-drift learning in `~/.pmos/learnings.md`.)

**What's new**

- New **Phase 7: Canvas Aggregation** in `/wireframes`, between Phase 6 (MSF + PSYCH) and Phase 8 (Spec Handoff). Always-on — no flag, no gate.
- New substrate at `plugins/pmos-toolkit/skills/wireframes/assets/canvas/`: `canvas-template.html` (the viewer), `build-canvas.js` (the aggregator), `extract-screens.js` (screen discovery).
- New reference at `plugins/pmos-toolkit/skills/wireframes/reference/canvas-aggregation.md` — full Phase 7 contract, `canvas.json` schema (v1), screen-extraction rules, DESIGN.md journey parser, auto-layout algorithm, merge semantics.
- Canvas viewer dependencies: `panzoom@4.5.1` and `leader-line-new@1.1.9` loaded via jsdelivr with SRI hashes. Single-file HTML; works under `file://` once cached.

**Why it matters**

Before this release, design crits required scrolling back and forth through one stacked HTML file per device, mentally reconstructing the flow each time. The canvas view lays the entire feature out spatially so stakeholders can compare onboarding screens side-by-side, spot inconsistencies across devices, and walk the journey end-to-end without leaving one viewport. The arrows make user-flow structure visible at-a-glance instead of buried in DESIGN.md prose.

**Behavioural notes**

- Existing per-device wireframe files are unchanged — the canvas is additive. Per-device files remain the source of truth; the canvas embeds them as sandboxed iframes (`allow-scripts allow-same-origin` so wireframe state-switchers still work).
- Idempotent on re-run: user-curated `(x, y)` positions in `canvas.json` are preserved; newly-added screens (post-regen) are auto-laid-out below the existing layout; removed screens drop out.
- Bootstrap-only mode (`/wireframes --bootstrap-design-only`) does **not** run Phase 7 — by-design, because no per-device files exist in that mode.
- Missing DESIGN.md degrades gracefully: screens still render; arrows array is empty; a warning is logged to chat.
- Smoke-tested in a real browser: 4 wireframes render via iframes; Fit-to-screen, Reset zoom, drag, and Save-layout all work; 0 console errors.

**Files changed**

- `plugins/pmos-toolkit/skills/wireframes/SKILL.md` — frontmatter description + new Phase 7 section + Phase 5 / Phase 8 cross-references.
- `plugins/pmos-toolkit/skills/wireframes/assets/canvas/` — new substrate directory (3 files).
- `plugins/pmos-toolkit/skills/wireframes/reference/canvas-aggregation.md` — new reference.
- `plugins/pmos-toolkit/skills/wireframes/reference/{eval-rubric,components-md-spec,style-extraction,screenshot-ingestion,design-md-spec,html-template}.md` — added `## Contents` ToC blocks to satisfy `c-reference-toc` skill-eval check (pre-existing failure).

## 2026-05-23 — pmos-toolkit 2.53.0: `/design-crit` gains `--depth` flag; lifts silent 12-finding cap

`/design-crit` previously truncated reviewer output and disposition prompts at a hard 12 high+medium findings per run. On complex multi-screen audits, the 13th-Nth medium-severity finding silently became "unsurfaced" — logged to `eval-findings.json` but never reaching the user as an actionable disposition. This release adds explicit depth control:

- **New `--depth shallow|standard|deep` flag** (default: unset → triggers adaptive Phase 4 gate). `shallow` caps at 5, `standard` caps at 12 (current behavior — no regression), `deep` lifts the cap entirely (reviewer-side safety bound of 50).
- **Adaptive Phase 4 disposition gate** fires when `--depth` was not set on CLI and the reviewer returned >5 findings. Single AskUserQuestion: "Reviewer surfaced N findings. Top 5 / Top 12 (Recommended) / All N?". In `--non-interactive` mode, auto-picks Top 12 (standard) per the canonical Recommended-pick contract; the deferred choice is logged to the OQ buffer.
- **No silent capping.** After dispositions, `/design-crit` now prints `<N> surfaced, <M> unsurfaced — see eval-findings.json` in every mode. A new anti-pattern entry codifies the rule.
- Fixup: added a Contents ToC to `reference/eval.md` to satisfy the `c-reference-toc` skill-eval check (pre-existing failure unrelated to this change set).

## 2026-05-23 — pmos-toolkit 2.52.1: parameterize HTML substrate attribution

Small refactor to support multi-plugin reuse of `_shared/html-authoring/`:

- The `template.html` "attribution" string is now parameterized so sibling plugins (e.g. `pmos-learnkit`) can reuse the substrate without leaking pmos-toolkit's name into their HTML output. Behavior is unchanged for existing callers; the default still renders pmos-toolkit's attribution.
- Added `_shared/html-authoring/tests/template-bytestable.sh` to lock the byte-stable template invariant under the new parameterization.

## 2026-05-23 — pmos-learnkit 0.1.0: new plugin shipping /primer

First release of the **pmos-learnkit** plugin — a companion to `pmos-toolkit`
focused on verified-source, audience-shaped teachable artifacts.

- New `/primer <topic>` skill — researches a topic from primary sources,
  drafts an audience-shaped HTML primer (`senior-pms` or `all-pms`), and
  self-evaluates against a binary rubric before delivering. Use to ramp up
  before a meeting, a scope review, or a doc review when you need citations
  you can trust.
- Audience presets shape depth, jargon, and examples — see
  `reference/audience-presets.md`.
- Source-floor enforcement prefers primary sources over secondary commentary;
  surfaces degraded-source warnings when WebFetch / context7 are unavailable.
- Curator-lens pass biases drafts toward non-obvious angles before final
  evaluation.
- Output: single self-contained HTML artifact (Markdown sidecar when
  `output_format: both`).

### References

- [Requirements](features/2026-05-23_pmos-learnkit-primer/01_requirements.html)
- [Spec](features/2026-05-23_pmos-learnkit-primer/02_spec.html)
- [Plan](features/2026-05-23_pmos-learnkit-primer/03_plan.html)
- [Verify report](features/2026-05-23_pmos-learnkit-primer/verify/2026-05-23-review.html)

## 2026-05-23 — pmos-toolkit 2.52.0: /feature-sdlc gains an optional /ideate phase before /requirements

`/feature-sdlc` now slots an **optional Phase 1.5 `/ideate` gate** between init-state and `/requirements`, for the cases where a user has a half-formed idea and `/requirements` is the wrong starting point. The gate auto-detects fuzzy-vs-formed via a deterministic heuristic (`reference/fuzzy-idea-detection.md`); a formed seed silently skips with a log line, a fuzzy seed surfaces a single Run /ideate (Recommended) / Skip prompt. When `/ideate` runs and the resulting brief looks Tier-3 (≥3 user-journey sections OR ≥5 pressure-test findings OR `--tier 3` explicit), the orchestrator auto-chains `/grill --deep` on the brief before handing off to `/requirements`. The brief lands in the feature folder as `00d_ideate.html` (+ optional `00d-grill_ideate.html`) and is forwarded to `/requirements` via `[ideate-brief: …]` and `[ideate-grill: …]` first-line seed lines.

### What's new

- **Phase 1.5 `/ideate` gate** (soft, runs in `feature` + `skill-new` modes only; mode-conditional by-design non-presentation in `skill-feedback` — the triage doc is already a structured seed).
- **`reference/fuzzy-idea-detection.md`** — 5-rule deterministic classifier (doc-attached → formed; ≥80 words → formed; vagueness markers → fuzzy; <20 words → fuzzy; else formed). Uses the portable word-boundary pattern `($|[^A-Za-z])` per the BSD-awk learning; no LLM judgement.
- **`--no-ideate` flag** — unconditional bypass; records `status: skipped-flag`.
- **Tier-3 auto-`/grill --deep` chain** — disjunctive heuristic OR explicit `--tier 3`; logs the reason; never silent.
- **`description` frontmatter** picks up three fuzzy-idea triggers — "I have a half-formed idea", "this is a rough idea", "I want to brainstorm this end-to-end".

### Schema (state.yaml, v4 additive)

- `phases[]` for `feature` + `skill-new` gains an `ideate` entry between `init-state` and `requirements` (skill-feedback omits it). Fields: `seed_shape ∈ {fuzzy, formed, null}`, `ideate_tier_estimate ∈ {null, 1, 2, 3}`, `grill_deep_chained: bool`, `grill_deep_artifact_path`. Status enum gains `skipped-formed` (classifier-skip) and `skipped-flag` (`--no-ideate`).
- **Back-compat:** no `schema_version` bump. Pre-2.52.0 state files have no `ideate` entry — the resume cursor scans whatever phases are present and advances past missing entries (same shape as the pre-2.34.0 `msf-req`/`simulate-spec` elision).

### Eval

- 18/19 [D] checks pass. One accepted residual: `e-scripts-dir` (`tools/` should be `scripts/` per `skill-patterns.md §E`) — multi-file refactor deferred (rename + sed all references across SKILL.md / reference / fixtures).
- Two pre-existing eval failures (`c-reference-toc` on `failure-dialog.md`; `c-portable-paths` on didactic-example absolute paths in `skill-patterns.md` + `state-schema.md`) folded into the same change as cheap in-skill fixes — TOC added; `${REPO_PARENT}` / `${BAD}` placeholders bypass the regex on what are intentionally negative examples.

### Anti-pattern #14 added

Skipping the `/ideate` gate without running the fuzzy-detect classifier first. `skipped-formed` is allowed only because the classifier ran. The presented gate (when `seed_shape: fuzzy`) is non-bypassable interactive; defers per canonical block non-interactive. Tier-3 grill-chain is similarly deterministic — disjunctive heuristic OR `--tier 3`, no LLM gut-feel.

## 2026-05-22 — pmos-toolkit 2.50.0: /architecture deep-pass v2 (discovery-capable deepening + signal-hygiene + cross-module detectors + triplet output)

Major revision of `/architecture` shipped via `/feature-sdlc skill --from-feedback` (skill-feedback mode, Tier 3). 24 tasks (T1–T24 + TN) replayed onto an in-flight rewrite of the audit harness: a new opt-in deepening pass classifies modules as deep / shallow / leaky with substring-grep-verified evidence; monorepo fan-out, since/baseline diffing, and L3-config scaffolding are now first-class flags; output is an HTML+MD+JSON triplet under `{docs_path}/architecture/` rather than stdout-JSON. The schema break (`severity:` → `disposition:`) is intentional and not back-compatible with v1 baselines — see "Breaking" below. One eval residual accepted: skill name `architecture` is a bare noun, not a verb/gerund per `a-name-verb-or-gerund`; rename would cascade through manifests, README, every fixture `.assert`, and the `/architecture` slash command itself — deferred as a future feature.

### What's new

- **`--deep` deepening pass** classifies modules as deep / shallow / leaky with substring-grep-verified evidence. Subagent-driven; runtime-gated via Task-tool marker — `--deep` is a no-op when no subagent runtime is available (records `skipped_reason: no_tool_use_runtime` in the JSON sidecar). Module classifications carry inline rationale + at least one verbatim code citation.
- **`--monorepo` fan-out** runs the audit once per detected stack root rather than at repo root, so polyglot trees with separate TS/Python/Vue subtrees get per-stack findings without false-positive cross-pollination.
- **`--since <ref>` + `--baseline <path>` AND-intersect** filter findings to those that are simultaneously new since `<ref>` AND absent from `<path>`'s baseline. Designed for "did this PR regress us?" gating.
- **`--scaffold-l3`** writes `.pmos/architecture/principles.yaml` seeded with idiomatic exemptions (Typer/Click decorators, framework conventions) so L3 overrides start from a sensible baseline, not from scratch.
- **HTML+MD+JSON triplet output** under `{docs_path}/architecture/{date}_<slug>.{html,md,json}` replaces stdout-JSON. The HTML view renders Must-Fix / Should-Fix / Won't-Fix sections with kebab-case `<h2>`/`<h3>` IDs and a `godmodule_candidates` table from the deepening pass; the MD sidecar is a regenerated companion; the JSON is the machine-readable artifact.
- **Phase 4.5 deepening pass** is documented inline in `SKILL.md` with the full subagent dispatch contract (return shape, validation rules, size caps).
- **New reference docs:** `deepening-vocabulary.md` (deep / shallow / leaky definitions + indicative anti-patterns), `l1-rationales.md` (per-rule rationale + source citation for U001–U011), `gap-map-rationale.md` (per-rule rationale for `delegate_to:` assignment).
- **`scripts/cycle-py.py`** ships a Python cross-file cycle detector (the missing peer to `dependency-cruiser` for TS); the L2 Python pass now includes cycle findings, not just ruff complexity signals.
- **`## When NOT to use`** section added to `SKILL.md` per `skill-patterns §D` (style-only lint should use `ruff`/`prettier` directly; docs-only repos / single-file scripts / repos missing `jq`+`python3`+`node`).

### Breaking

- **Schema: `severity:` → `disposition:`.** Every finding now carries `disposition ∈ {must-fix, should-fix, wont-fix}` rather than a numeric/textual severity. L3 principles.yaml files using the legacy `severity:` key are rejected at load with exit 64 and the verbatim message `legacy 'severity:' key … rename to 'disposition:'`. **v1 baseline JSONs do NOT interop with v2** — re-baseline against a v2 run before relying on `--baseline`.
- **ADR machinery removed.** The `--no-adr` flag is deleted; no ADRs are written under `docs/adr/`. The architecture audit is read-mostly: it emits the triplet and nothing else. Repos that relied on the v1 ADR-write behaviour need to capture decisions via `/spec` or manual ADRs instead.
- **Stdout-JSON replaced with the triplet.** Pipelines that consumed `architecture audit … | jq …` from stdout must instead read `{docs_path}/architecture/{date}_<slug>.json`. Stdout is now empty; stderr emits a single human summary line of the documented shape.
- **Skill layout: `tools/` → `scripts/`** per `skill-patterns §E`. `package.json` colocates with `scripts/` (`scripts/package.json`); `npm install` lands at `scripts/node_modules/`; the `.depcruise` fallback `cwd` is `scripts/`, not the skill root. External callers shelling into `$SKILL_DIR/tools/...` must rewrite to `$SKILL_DIR/scripts/...`.

### Known follow-ups

- **`a-name-verb-or-gerund` eval residual accepted.** Skill name `architecture` is a bare noun (rule expects a verb/gerund such as `audit-architecture`). Rename would cascade through plugin manifests, README rows, CLAUDE.md references, every reference doc, all fixture `.assert` files, and the `/architecture` slash command itself — deferred as a separate future feature. Surfaced in this release's `/verify` report and recorded in `state.yaml.accepted_residuals[]`.
- **Book-companion regression deferred.** Plan §Done-when requires running `/architecture audit backend/` on a pinned-SHA clone of `book-companion` and confirming `jq '.findings | length' ≤ 120` (down from v1's 586) AND `--monorepo --deep` yielding ≥3 non-deep candidates. User disposition is post-release follow-up; verify manually before relying on the deep-pass numbers in production reports.

### References

- [Feature folder](docs/pmos/features/2026-05-13_architecture-deep-pass/)
- [Spec](docs/pmos/features/2026-05-13_architecture-deep-pass/02_spec.html)
- [Plan](docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html)
- [Verify report](docs/pmos/features/2026-05-13_architecture-deep-pass/verify/2026-05-22-review.html)
- [Skill source](plugins/pmos-toolkit/skills/architecture/)

## 2026-05-15 — pmos-toolkit 2.49.0: /readme — hardening pass against /retro feedback (rubric portability, reviewer-subagent contract, FR-V-2 polish-hook)

Skill-feedback revision of `/pmos-toolkit:readme` shipped via `/feature-sdlc skill --from-feedback` (skill-feedback mode, Tier 2). Ten surgical changes (T1–T10) against the existing `/readme` substrate to close gaps surfaced by a prior `/retro` against the audit pipeline: rubric script BSD-awk portability, deterministic rubric schema (`type:` field), reviewer-subagent contract with parent-side validation, 4th simulated-reader persona + 5-Task dispatch, audit close-out mode-branch, FR-V-2 `Suggest:/polish` unconditional hook, and four new regression fixtures registered under the run-all harness. Two known structural residuals from Phase 6a (skill name `readme` is a noun — not verb/gerund per `a-name-verb-or-gerund`; SKILL.md body 505 lines in the 501–800 reviewer-judge band per `c-body-size-judge`) accepted as out-of-scope for this audit-fix revision; both surfaced loudly in the `/verify` report. The `/readme` skill at `plugins/pmos-toolkit/skills/readme/SKILL.md` remains the canonical path (no rename, no relocation).

### What's new

- **`scripts/rubric.sh` — BSD-awk portability + selftest drift-guard** (T1, `378064a`). Replaced GNU-awk-only `\b` word-boundary at lines 40 and 119 with the portable boundary class `($|[^A-Za-z])`. Selftest now grep-lints every `awk '...'` block in the script and hard-fails on `\b` regressions; explicit `/usr/bin/awk` fork added to the install-or-quickstart fixture path. macOS users on default `/usr/bin/awk` now get deterministic rubric runs.
- **`reference/rubric.yaml` — `type:` field + cross-cutting [D] check + `--validate-yaml` flag** (T2, `471d181`). Every rubric row now declares `type: [D]` (deterministic, scored by `scripts/rubric.sh`) or `type: [J]` (judge-only, scored by reviewer subagent). New cross-cutting [D] check asserts every row carries a `type:`; `--validate-yaml` flag prints `missing type` and exits non-zero on omission so CI catches schema drift. Audit-mode behaviour unchanged ([D] rows only).
- **`reference/reviewer.md` + `[J]` rows + `READMER_REVIEWER_STUB` env path** (T3, `6890ae7`). New 106-line `reference/reviewer.md` carries the [J] rubric rows + the reviewer-subagent dispatch contract (cites `/skill-eval` FR-44 shape). `READMER_REVIEWER_STUB=<path>` env var substitutes a deterministic stub for the live Task-tool dispatch in tests — reusable seam for any pmos skill that dispatches a reviewer.
- **`scripts/_reviewer_validate.sh` — parent-side validation + 3-variant contract** (T4, `950acaa`, `5a1dc89`). New validator enforces (1) `check_id` set-equality against `reference/reviewer.md`, (2) every `quote` substring-grep ≥40 chars against the source README, (3) hard-fail with exact existing FR-SR-3 message on either miss. 3-variant integration test (`reviewer_subagent_contract.sh`) covers valid / sub-40-quote / missing-check_id paths. `BASH_SOURCE[0]` resolution hardened with `${BASH_SOURCE[0]:-$0}` + cwd-walking fallback (T10).
- **4th persona `returning-user-navigator` + 5-Task dispatch** (T5, `5b53d64`). Simulated-reader persona inventory expanded to 4 (evaluator, adopter, contributor, returning-user-navigator) with a parallel reviewer (5 total Task dispatches per audit). Theater-check (FR-SR-5) fires symmetrically on all 4 personas. `tests/mocks/simulated_reader_stub.sh` gains the navigator fixture.
- **SKILL.md §1 mode-branch + close-out + `Suggest:/polish` unconditional** (T6, `309c1c7`). Audit mode emits the findings table only (D2 column shape preserved); scaffold mode unchanged. `Suggest:/polish — readme requires technical voice; /polish refines style without changing meaning.` (FR-V-2) now emits unconditionally on successful audit-or-scaffold close-out — both modes wired.
- **`simulated_reader_sub40_quote.sh` regression fixture** (T7, `bb1ea01`). New integration test seals FR-SR-3: a sub-40 quote from any persona OR the reviewer MUST hard-fail with the exact existing message. Fixture asserts hard-fail at quote length 18.
- **JTBD-organized synthetic README fixture + reviewer-subagent test** (T8, `0b57281`). New `tests/fixtures/jtbd-organized-readme.md` and `reviewer_subagent_jtbd_fixture.sh` exercise the [J] check pair against a non-standard but valid README organization; both [J] checks PASS.
- **Tracer + close-out tightening + 5-dispatch contract** (T9, `cfd852e`). `tracer_audit_polish_suggest.sh` asserts `Suggest:/polish` appears exactly once on every audit-or-scaffold close-out. `audit_clean.sh` tightened to assert the audit-mode contract (16/16 PASS, zero file diff, cross-cutting row present, BSD-awk fork green). `simulated_reader_contract.sh` documents the 5-Task dispatch shape (4 personas + 1 reviewer) and asserts the SKILL.md declares it.
- **Run-all harness picks up 4 new tests via glob** (`tests/run-all.sh`). The existing alphabetical-glob loop auto-discovers `reviewer_subagent_contract.sh`, `reviewer_subagent_jtbd_fixture.sh`, `simulated_reader_sub40_quote.sh`, `tracer_audit_polish_suggest.sh` — no manual registration needed.

### Known residuals (accepted; carry forward)

- `a-name-verb-or-gerund` (skill-eval [J] check) — skill name `readme` is a noun. Rename would touch plugin manifests, hooks, every existing reference; deferred to a dedicated rename pass.
- `c-body-size-judge` (skill-eval [J] check) — `SKILL.md` body is 505 lines (down from 511 via T3's extraction of `reference/reviewer.md` at 106 lines). Still in the 501–800 reviewer-judge band; further extraction of §4/§5/§7/§8/§9/§10 deferred to a dedicated restructure pass.

### Pipeline + repo hygiene

- **CLAUDE.md `## Bash portability`** — new section documents the `BASH_SOURCE[0]` fallback pattern (resolved from T10's `_reviewer_validate.sh` hardening). Applies to every shell script under `plugins/pmos-toolkit/skills/*/scripts/` and `tests/integration/`.
- **`~/.pmos/learnings.md ## /readme`** — captured BSD-awk portability gotcha + the reusable `*_REVIEWER_STUB` env-var test-seam pattern.
- **README inventory drift fix** — `/changelog` and `/people` rows added to the "What do you want to do?" table (pre-existing drift; not caused by this revision).

### Advisory — pre-existing test failures (out of scope for this release)

Surfaced by `/verify` against the full `tests/run-all.sh`, confirmed pre-existing on `main` (neither file changed in T1–T10). Filed for a follow-up backlog pass:

- `scripts/commit-classifier.sh --selftest` — fixture `tests/fixtures/commits/01_feat-only` lacks `.git`; no `setup.sh` to materialise it. Selftest exits rc=2 with the clear error.
- `tests/integration/update_hook_dry_run.sh` — exits rc=2 with no diagnostic output. Needs a `set -x` pass to surface the failing line.

### Tests

- `scripts/rubric.sh --selftest`: 16/16 PASS; A2 fixture-agreement 100% on 10 fixtures.
- `plugins/pmos-toolkit/skills/feature-sdlc/tools/skill-eval-check.sh --target claude-code plugins/pmos-toolkit/skills/readme/`: [D] 19/19 PASS.
- `tests/run-all.sh`: 4 substrate-selftests + 13 integration tests — 15 PASS, 2 advisory-fail-pre-existing.
- All 4 new T1–T10 fixtures green.

## 2026-05-13 — pmos-toolkit 2.48.0: /architecture — tiered repo audit (L1/L2/L3) with ADR promotion

New skill `/pmos-toolkit:architecture` shipped via `/feature-sdlc skill` (skill-new mode, Tier 3). Audits a repository against 18 architectural rules across three tiers — L1 universal (capped at 15 per spec; 10 shipped: file-size, function-size, arg-count, debug-leak, TODO-rot, path-depth, missing-header, hardcoded-credential, throw-TBD, console.log-in-src), L2 stack-specific (8 rules delegated to `dependency-cruiser` for TypeScript/Vue and `ruff` for Python), and L3 per-repo overrides at `<repo>/.pmos/architecture/principles.yaml` (severity demote/promote + exemption rows with optional `adr:` pointer and `expires:` date). Emits a deterministic JSON report to stdout; promotes ≤5 unexempted block-severity findings to Nygard ADRs at `<repo>/docs/adr/NNNN-<slug>.md` (atomic write, monotonic numbering, `--no-adr` suppression). CLI-only, offline, no network reach.

### What's new

- **`/pmos-toolkit:architecture`** — the canonical skill at `plugins/pmos-toolkit/skills/architecture/SKILL.md` (target: `generic`). Tools under `tools/`: `run-audit.sh` (1256 lines — entrypoint + 3-tier rule loader + scanner + L1 evaluators + L2 dep-cruiser/ruff delegation + exemption reconciliation + ADR writer; FR-01 `audit` selector + FR-04 `--non-interactive` flag enforced), `check-citations.sh` (asserts every rule has a non-empty `source:`), `check-gap-map.sh` (reports declarative-delegated ratio; current 0.444, G2 stretch 0.70 not enforced), `check-determinism.sh` (2-run byte-identical guarantee; STRIP targets real time fields). `principles.yaml` carries 10 L1 + 8 L2 rules with rule citations. `reference/`: `l1-rationales.md`, `gap-map-rationale.md`, `adr-template.md` (Nygard).
- **Test suite (23/23 green)** — fixture-based regression harness at `tests/run.sh`. 13 fixture groups covering tracer, gitignore-deny, l1-hygiene/security/size, l3-override/malformed, principles-16-rules (cap), tool-missing graceful skip, ts-circular (dep-cruiser), vue-mixed (Vue SFC L1-only coverage gap surfacing), py-tidy-imports (ruff), exemption-row, adr-cap (5-write truncation), adr-reconcile (4 sub-fixtures: clean/expired/orphan/informational), citations-missing, determinism, and a new `selector-required` regression covering FR-01 absence-of-selector + FR-04 `--non-interactive` acceptance + too-many-positionals exit 64.
- **Skill-eval Phase 6a — 2 accepted residuals** that the orchestrator surfaces but does not block on:
  - **`c-asset-layout` [D]** — `package.json` + `package-lock.json` at skill root are required for `npx dependency-cruiser` to resolve its devDep; moving them breaks the L2 TS rule path. Documented design call.
  - **`a-name-verb-or-gerund` [J]** — name `architecture` is a domain noun; verb/gerund rename would contradict the pmos peer convention (`plan`, `spec`, `backlog`, `wireframes`, `verify`, `creativity`). Documented exception.
- **`/verify` Phase 3 caught 5 doc/code drift bugs that Phase 6a missed and were fixed inline before merge**: (1) `--non-interactive` was advertised in SKILL.md frontmatter L5 but unparseable — would have exited 64 on use; (2) FR-01 `audit` selector was documented but not enforced — parser treated `audit` as a positional path; (3) SKILL.md Phase 6 documented a JSON shape with ghost fields (`run.id`, `findings[].rule`, `exemptions_applied/orphaned/expired`, `duration_ms`) that the implementation never emitted — 22 fixtures locked the real shape; SKILL.md was the lie; (4) `run.duration_s` was hardcoded to `0.0` instead of computed; (5) `check-determinism.sh` STRIP targeted the same ghost fields — determinism passed only by accident. All 5 fixes ship in this release; new regression fixture seals (1)+(2). Surfaced as a learning: doc/code drift in JSON-emitting skills must be caught by fixture-locked shape, not the prose sketch.

### Pipeline run signature

- **Phases run:** worktree(`feat/architecture-principles-skill`) → init-state → skill-tier-resolve(T3, generic) → requirements (+folded /grill Tier-3, 5 findings) → creativity(skipped — composite finalist) → spec (+folded /simulate-spec skipped per user; F2 gap-map 0.444 reframed as G2 stretch) → plan (21 tasks, inline mode) → execute (T1 tracer → T21 final-verification; 22 commits) → skill-eval iter 1 (17/18 [D] + 15/16 [J]; 2 residuals accepted) → verify (PASS_WITH_ACCEPTED_RESIDUALS; 5 reviewer findings fixed inline + new selector-required regression; 23/23 fixtures, shellcheck clean, citations/gap-map/determinism all exit 0) → complete-dev → final-summary.
- **Manifests:** both `plugins/pmos-toolkit/.claude-plugin/plugin.json` and `plugins/pmos-toolkit/.codex-plugin/plugin.json` bumped 2.47.0 → 2.48.0 in sync (pre-push hook enforces).

## 2026-05-13 — pmos-toolkit 2.47.0: /readme — audit, scaffold, update READMEs against a binary 15-check rubric

New skill `/pmos-toolkit:readme` shipped via `/feature-sdlc skill` (skill-new mode). Three modes share one substrate: `--audit` (default) grades an existing README against a 15-check binary rubric + a 3-persona simulated-reader pass; `--scaffold` writes a missing README from detected workspace signals; `--update <commit-range>` proposes diff-driven section edits from recent commit history. Monorepo-aware (8 workspace-manifest detectors + multi-stack), cross-file rules R1–R4 (Install/Contributing/License root-only + version-bump-touches-changelog), voice work delegated to `/polish` (never inlined). Never auto-commits — every write goes through an atomic-write contract with a pre-write diff preview.

### What's new

- **`/pmos-toolkit:readme`** — the canonical skill at `plugins/pmos-toolkit/skills/readme/SKILL.md` (477 lines, NFR-6 ≤480). Three substrates under `scripts/`: `rubric.sh` (15-check binary grader with `--selftest` 100% A2 agreement on 10 fixtures), `workspace-discovery.sh` (8 manifest detectors: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`, `composer.json`, `pom.xml`, `build.gradle`), `commit-classifier.sh` (Conventional-Commits + breaking-change detection), `voice-diff.sh` (delegates to `/polish` for prose work). Cross-file rules at `reference/cross-file-rules.md`: R1 (Install root-only), R2 (Contributing root-only), R3 (License root-only with anchor for fragment resolution), R4 (version-bump → changelog touched). Plugin-manifest detection warns-and-skips when no manifest mentioned. Bash 3.2-safe end-to-end.
- **Test suite (13/13 green from repo root)** — 4 substrate `--selftest` invocations + 9 integration scripts (`tracer_audit`, `scaffold_greenfield`, `update_hook_dry_run`, `audit_cluttered`, `cross_file_rules`, `multi_stack_grafana_style`, `compose_audit_scaffold`, `simulated_reader_contract`) + dogfood orchestrator `run-dogfood.sh` (ADVISORY-exit-0 contract per /plan Loop-1 F2 — exits 0 even when host-repo gates can't pass because the repo has only 1 plugin with no top-level README; surfaces as advisory residual `phase-9-r1`).
- **`reference/skill-tier-matrix.md`** — the new `/readme` skill is **Tier 3** (full-pipeline: shipped via the complete `/feature-sdlc skill` flow including `/grill` + `/simulate-spec` folded in `/spec` Phase 6.5 + 26-task `/plan` + subagent-driven `/execute` + Phase 6a `/skill-eval` 2-iteration loop + feature-level `/verify`).

### Known accepted residuals (carried per Phase 6a + execute reconciliation)

- **`a-name-verb-or-gerund` (Phase 6a accepted)** — skill name is `readme`, a noun. Verb/gerund preferred by rubric, but `readme` is the user-spoken trigger (`/readme`, "audit my README"); rename has wide blast radius. Documented in `reference/skill-eval.md` exception list.
- **`c-context-economy` (Phase 6a accepted)** — inlined non-interactive-block + awk extractor (~100 lines) is the canonical cross-skill greppable contract (audited by `audit-recommended.sh`), not /readme-specific bloat.
- **Execute carried residuals (6)** — `phase-1-r1` SC1091 info on `_lib.sh source` (info-level only), `phase-2-r1` rubric.yaml `pass_when` doc-impl drift on `install-or-quickstart-presence` (functional path correct), `phase-2-r2` `_lib.sh` header says Bash >=4 but code is 3.2-safe (comment-only), `phase-3-r1` `repo_type` binary at workspace-discovery layer (full FR-WS-5 taxonomy deferred), `phase-3-r3` long-tail fallback triggers on no-manifest alone (plugin-marketplace signal combination deferred to v2), `phase-4-r3` FR-SR-4 dedupe rule documented in SKILL.md §2 step 4 (end-to-end exercise deferred).
- **`phase-9-r1` dogfood advisory** — G1 (73%) + G3 (0 findings) ADVISORY_FAIL on host repo because only 1 plugin exists with no top-level README; the 6-target plan-spec set is unattainable on today's repo by design (per /plan Loop-1 F2 — `run-dogfood.sh` still exits 0).
- One low-severity `tracer_audit.sh` cwd-portability gap (uses repo-root-relative paths; works from repo root, fails from skill dir) — non-blocking; documented in `reference/cross-file-rules.md` follow-ups.

### Pipeline run signature

- **Phases run:** worktree(`feat/readme-skill`) → init-state → skill-tier-resolve(T3) → requirements (+folded /grill Tier-3 + /msf-req 7 gap + 14 grill) → spec (+folded /simulate-spec A2 10/10 + A8 20/20) → plan (26 tasks, subagent-driven mode) → execute (9 phases, 50 commits) → skill-eval (2 iterations; iter 2 → 16/18 [J] + 19/19 [D], 2 accepted residuals) → verify (PASS_WITH_ACCEPTED_RESIDUALS, [D] 19/19 + tests 13/13) → complete-dev → final-summary.
- **Manifests:** both `plugins/pmos-toolkit/.claude-plugin/plugin.json` and `plugins/pmos-toolkit/.codex-plugin/plugin.json` bumped 2.46.0 → 2.47.0 in sync (pre-push hook enforces).

## 2026-05-13 — pmos-toolkit 2.46.0: /feature-sdlc base-drift pre-flight + release-prereq scope discipline

Two follow-up fixes for `/feature-sdlc` from the 2026-05-13 retro on the `/survey-analyse` run, applied to its skill modes. (2.44.0 was taken by `/plan vertical-slice`; 2.45.0 by `/ideate` — both shipped concurrently.)

### What's new

- **`/feature-sdlc` Phase 0a — base-drift pre-flight.** Before `git worktree add`, `/feature-sdlc` now fetches the base branch's upstream and computes `behind`. When local is behind remote, it surfaces a dialog: pull-then-branch (Recommended) / branch-anyway (record drift) / abort. The branch-anyway path writes `state.base_drift = {behind, fetched_at, remote, base, remote_sha, local_sha}` so `/complete-dev` Phase 8 can surface the gap at merge time. Phase 0b on resume re-runs the fetch+diff to flag origin advancing after worktree creation. Network failures degrade gracefully (log + proceed). Closes the silent-friction class where a worktree branched from stale local main only fails at Phase 8 merge with version-collision conflicts on `plugin.json` and changelog files.
- **`reference/state-schema.md` — three new optional top-level fields** (`base`, `remote`, `base_drift`) on the run-state document. Additive; no migration needed for older states (v4 schema unchanged).
- **`reference/skill-patterns.md` §G — Release-prerequisites scope.** New section codifies the scope split: `SKILL.md` body, `reference/`, `scripts/`, `tests/` are `/execute`'s scope; README rows, manifest version bumps, changelog entries, and `~/.pmos/learnings.md` header bootstraps are `/complete-dev`'s scope and belong in the spec's `## Release prerequisites` section. The pmos-specific file list is delegated to the host repo's `CLAUDE.md ## Skill-authoring conventions`.
- **`reference/skill-eval.md` 10.G — two new rubric checks.** `g-release-prereqs-scope` `[J]` (reviewer) verifies a plan's wave sections list only skill-content tasks; `g-plan-grep-clean` `[D]` (script) greps `03_plan.{html,md}` wave blocks for `version bump|bump.*plugin\.json|CHANGELOG\.md|docs/.*changelog|README row` markers. Group skipped when no plan artifact is present. Totals: 41 checks (21 `[D]` + 20 `[J]`).
- **`tools/skill-eval-check.sh` — implements `g-plan-grep-clean`.** New `--plan <path>` flag enables the check; awk wave-block extractor scopes the grep to `## Wave N` sections (preamble and `## Release prerequisites` are excluded); HTML chrome stripped before grep so `.html` and `.md` plans are graded uniformly. Selftest bijection regex extended from `§[A-F]` to `§[A-Z]` so future §-additions don't break it. Verified via selftest + good/bad smoke fixtures. Companion prose `§[A-F]` → `§[A-Z]` cleanup in skill-patterns.md + skill-eval.md cross-reference sections.
- **`/feature-sdlc` Phase 5 dispatch — directive line in skill modes.** The `/plan` invocation now prepends a directive forbidding version-bump / CHANGELOG / README-row / manifest-sync / learnings-bootstrap tasks in any wave block — they MUST live in the spec's `## Release prerequisites` section as `/complete-dev` deliverables. Backed by the 10.G rubric.

### Why this matters

The 2026-05-13 `/survey-analyse` SDLC run branched off stale local main and the resulting `03_plan` included version bumps + changelog edits as `/execute` tasks. `/execute` committed them against the stale base; `/complete-dev` then had to merge-conflict-resolve `plugin.json`, revert the legacy `CHANGELOG.md` writes, and re-prepend the entry to the canonical `docs/pmos/changelog.md`. Phase 0a Step 2.5 surfaces the divergence before the worktree exists; §G + 10.G prevents `/execute` from ever owning release artifacts.

This very release encountered the same stale-bump dynamic in `/complete-dev` (2.45.0 was taken by /ideate while this branch was being prepared at 2.45.0) — the Phase 9 stale-bump recovery prompt fired correctly, rebased onto main, and re-bumped to 2.46.0. That path is operating as designed.

### Breaking changes

None. The Phase 0a Step 2.5 pre-flight degrades gracefully when no upstream is configured (skipped). The 10.G checks are group-skipped when no plan artifact is given to `skill-eval-check.sh`. The state-schema additions are optional fields — older state files keep working.

### Migration

None. Additive.

---

## 2026-05-13 — pmos-toolkit 2.43.0: /survey-analyse skill

Sister to `/survey-design`: turns a raw survey response export (CSV / TSV / XLSX / XLS / PDF) into a defensible HTML report.

### What's new

- **`/survey-analyse`** — new standalone utility. Eight phases: ingest → user-confirmed schema (column-by-column; no silent auto-classification) → cleaning (straightliners / speeders / incompletes / duplicates / attention checks, with rule counts logged) → per-question analysis via **bundled Python helper modules** under `scripts/helpers/` (`categorical`, `multi_select`, `likert`, `nps`, `ranking`, `matrix`, `numeric`, `stats`, `clean`, `ingest`, `schema`, `pii`) — pure stdlib + `openpyxl` for xlsx; each ships `--selftest`. The LLM authors a per-run `analysis.py` that imports the helpers and runs it via Bash with one consolidated permission ask → open-end thematic coding via **subagent-per-question** (Braun & Clarke 6-phase contract; structured JSON return validated against the verbatim ids) → whole-survey cross-tabs with **Holm correction applied by default** across each segment family (plain-language framing in the report body; technical term in Methodology; `--raw-p-only` opts out) → HTML report through the `_shared/html-authoring/` substrate with executive summary, methodology & limitations, key findings, per-question, open-end themes, cross-tab appendix, data-quality log. Numbers are deterministic across runs on the same cleaned input; narrative + theme names are LLM-generated and disclosed as such. PII in verbatim quotes is **detect-and-warn only** — never auto-redacted. Bundled `reference/` files cover the per-question-type playbook, the thematic-coding contract, the cross-survey statistics (Holm, MoE, weighting), and the cleaning / reporting standards.

### Breaking changes

None.

### Migration

None — additive. New skill auto-discovered from `plugins/pmos-toolkit/skills/`.

---

## 2026-05-13 — pmos-toolkit 2.42.0: /artifact HTML output parity

`/artifact` produces HTML artifacts that look and behave like every other pipeline skill's HTML output — same toolbar, same fonts, same anchors, same companion files. Eight gaps closed:

### What's new

- **MD→HTML authoring contract is explicit.** `/artifact` Phase 2.7 spells out that the skill authors HTML directly using `template.md` for section ordering + per-section guidance (matching how `/spec` and `/plan` author HTML from outline) — no MD→HTML renderer step at write time. The template store at `~/.pmos/artifacts/templates/<slug>/template.md` retains its MD shape (runbook edge case row 4 carve-out).
- **Pre-rename heading-id + section-wrapper assertion** (FR-2). Before the atomic `rename(2)` of `{slug}.html.tmp`, inline `grep` checks hard-fail the write if any `<h2>`/`<h3>` lacks an `id="..."` or any `<section>` lacks one — surfacing the soft-phase failure dialog (Retry / Pause / Abort).
- **Phase 3 reviewer dispatch is HTML-aware** (FR-4, FR-5, FR-9). The reviewer subagent receives a chrome-stripped HTML slice (`<h1>` + `<main>` only, via `chrome-strip.js`) plus the companion `{slug}.sections.json`. Reviewer returns gain a required `quote` field — a ≥40-char verbatim substring of the source. The skill validates parent-side: every finding's `section` must be a kebab id present in `sections.json`; every `quote` must substring-match the source. On miss → hard-fail. Reviewer-prompt updated with HTML preamble + Rules 9 and 10 making the contract explicit.
- **Post-edit re-emit of `sections.json` + MD sidecar** (FR-6). After any Phase 3 `Edit` applies a fix, the skill regenerates `{slug}.sections.json` from the live HTML via the new `build_sections_json.js` helper, and (when `output_format=both`) re-runs the MD sidecar through `html-to-md.js`. No more stale companions.
- **`build_sections_json.js`** (new substrate file). Zero-dep Node helper at `_shared/html-authoring/assets/build_sections_json.js` — regex+stack DOM walker (~80 LOC, mirrors `chrome-strip.js`'s pattern). Reads HTML from argv or stdin; emits the conventions.md §10 `[{id, level, title, parent_id}]` schema. Self-tested against `01_requirements.html` + `02_spec.html`.
- **Refine flow extension mirrors primary format** (FR-7). `/artifact refine prd.html` now offers `prd.refined.html` (not `prd.refined.md`); the legacy MD path still works for `.md` primaries.
- **Update flow Comment Resolution Log is HTML-shaped** (FR-8). `/artifact update` appends a `<section id="comment-resolution-log">` containing an HTML `<table>` to the artifact (not a markdown table). MD primary keeps the markdown table fallback.
- **JSON frontmatter example** (FR-3). Phase 2.7's frontmatter example shows the actual emitted `<script type="application/json" id="pmos-frontmatter">` shape (not the misleading YAML triple-dash that was there before).

### Changed

- **Substrate manifest extended** (FR-11). `build_sections_json.js` joins the substrate manifest enumeration across 11 files: `_shared/html-authoring/README.md` plus 10 SKILL.md files (`artifact`, `design-crit`, `grill`, `msf-req`, `msf-wf`, `plan`, `requirements`, `simulate-spec`, `spec`, `verify`). New substrate files added in future releases continue to ride along automatically — the "currently includes" list is informational, not gating.
- **`reviewer-prompt.md`** is HTML-aware (no more "you receive a markdown document"), explicitly cites the new `quote` field as required, and ties `section` to `sections.json` ids.

### Migration

None — additive. Existing MD-only primary mode (`output_format=md`) continues to work — chrome-strip + quote validation only run for HTML. `build_sections_json.js` is consumed by `/artifact` only at this release; other HTML-emitting skills can adopt it incrementally.

## 2026-05-13 — pmos-toolkit 2.41.1: subtle "Created using pmos-toolkit" attribution in HTML chrome

Every HTML artifact emitted by a pmos-toolkit skill now carries a small, muted "Created using pmos-toolkit" link to the GitHub README — one centralized substrate edit, no per-skill changes.

### What's new

- **Attribution in the shared HTML chrome.** `plugins/pmos-toolkit/skills/_shared/html-authoring/template.html` adds an `<a class="pmos-attribution">` in both the toolbar (right of the action buttons) and the footer (inline after `Source:`, separated by a middot). Both link to `https://github.com/maneesh-dhabria/pmos-toolkit#readme` with `target="_blank" rel="noopener noreferrer"`. Styled via a new `.pmos-attribution` class in `assets/style.css`: `--pmos-fs-xs`, italic, `--pmos-muted` color, `opacity: 0.65`, with hover bumping to `opacity: 1` plus a 1px underline at `text-underline-offset: 2px` — subtle by default, clearly clickable on intent. The toolbar variant is hidden in print; the footer attribution prints (it's where source/citation conventionally appears).
- **Reach.** Inherited automatically by every skill that emits via the substrate: `/requirements`, `/spec`, `/plan`, `/wireframes`, `/prototype`, `/diagram`, `/survey-design`, `/polish`, `/artifact`, `/design-crit`, `/msf-req`, `/msf-wf`, `/grill`, `/creativity`, `/simulate-spec`, plus the pipeline-status and OQ-index artifacts written by `/feature-sdlc`. No per-skill edits.
- **No reviewer-payload leakage.** `_shared/html-authoring/assets/chrome-strip.js` already extracts only `<h1>` + `<main>`, so the attribution (which sits in `<header>` and `<footer>` chrome) is automatically stripped from the bytes passed to reviewer subagents — no risk of the LLM judge quoting "Created using pmos-toolkit" as a finding.

### Why

Drive adoption without being in users' face. The attribution is discoverable (in chrome on every artifact) but deferential (xs italic muted, opacity 0.65) — readers who care can click through to the README; readers focused on the artifact content barely register it.

## 2026-05-13 — pmos-toolkit 2.41.0: /complete-dev gains lastrun memory + one-shot defaults confirm + worktree-cleanup moved to after push

`/complete-dev` learns to remember its own answers, asks for them in one consolidated prompt instead of twelve scattered ones, and stops removing the worktree before push tag succeeds (which was severing the `/feature-sdlc --resume` contract).

### What's new

- **Per-developer lastrun memory.** Each `/complete-dev` run now reads `.pmos/complete-dev.lastrun.yaml` (gitignored, per-developer) at Phase 0 and writes it at the end of Phase 17 once the release lands. The schema captures `merge_style`, `worktree_disposition`, `deploy_path`, `version_bump`, `changelog_disposition`, `push_target`, `verify_already_ran`, plus the last-run `detected_signals.deploy` for Phase 5's environment-change check. Malformed file → stderr warn + fall through to built-in defaults; never errors. Cancelled / failed runs do NOT update lastrun (so broken choices aren't memorialized). See `plugins/pmos-toolkit/skills/complete-dev/reference/lastrun-schema.md`.
- **New Phase 0.5 — "Confirm run defaults".** One consolidated `AskUserQuestion` seeded from lastrun (or built-ins). Pick **Confirm all** (Recommended) and the run-shaping prompts at Phase 1 (/verify gate), Phase 3 guard-PASS (merge style), Phase 5 (deploy path, when detected signals haven't drifted), Phase 8 (changelog accept), Phase 9 step 5 (bump kind), and Phase 14 (push target) all short-circuit — about six per-run prompts collapsed into one. Pick **Edit one or more** to multi-select which fields to override; the per-field prompts then loop until you re-confirm. Destructive prompts (merge conflict, stale-bump recovery, push failure, tag collision, commit message draft, Phase 6 learnings findings) always still fire — they involve free-form input or non-recoverable consequences and can't be meaningfully memorized. Skipped in non-interactive mode (the AUTO-PICK-Recommended contract already covers it).
- **Worktree removal moved to Phase 16.5 — after push tag succeeds.** Previously Phase 4 ran cleanup right after merge, severing `/feature-sdlc --resume`: a Phase 15 push failure would leave the worktree gone AND `<worktree>/.pmos/feature-sdlc/state.yaml` unreachable. The substantive cleanup body (dirty-check excluding `.pmos/feature-sdlc/`, `--force-cleanup` handling, `ExitWorktree(action=keep)` with fallback chat line) now lives at Phase 16.5; Phase 4 is a one-line deferral stub. Anti-pattern #4 retitled "Removing the worktree before **push** succeeds" with explicit reference to the resume-contract dependency. The Phase 17 success summary now reports `Worktree <removed|retained>` to reflect that lastrun can opt into retention.
- **New flag: `--reset-defaults`.** Bypass the lastrun read for one run (seed Phase 0.5 from built-ins instead). The file is not deleted; Phase 17 still overwrites it with this run's choices.

### Changed

- `complete-dev/SKILL.md` grew Phase 0.5 (consolidated confirm), Phase 16.5 (relocated cleanup body), and Phase 0 lastrun-load steps; Phase 4 shrank to a deferral stub; Phases 1/3/5/8/9/14 each gained a "Short-circuit when Phase 0.5 confirmed" rider above their existing prompt. Phase 7.5's release-notes recipes moved verbatim to `reference/release-recipes.md` (keeps SKILL.md body under the 800-line eval cap). Anti-pattern #4 rewritten.
- README's `/complete-dev` row now mentions Phase 0.5 lastrun confirm + Phase 16.5 timing.
- `.gitignore` adds `.pmos/complete-dev.lastrun.yaml`.

### Why

Triaged from user feedback on the 2.40.0 ship: "save lastrun defaults to make /complete-dev easy to execute, reduce questions asked, rationalize the worktree removal sequence — it happens too early." The pre-push worktree removal was a latent resume-contract bug (state.yaml lives inside the worktree); the prompt-count was friction the user kept hitting on every ship.

## 2026-05-13 — pmos-toolkit 2.40.0: /polish honors source format (md or HTML) + opt-in editorial reduction pass

`/polish` learns two things, plus a de-flake of `/feature-sdlc skill`'s `[D] body` checks comes along for the ride.

### What's new

- **Source format honored.** Hand `/polish` a local `.md` and you get `<name>.polished.md`; hand it a local `.html` and you get `<name>.polished.html` — same shape in, same shape out. HTML inputs get HTML-aware lock zones (tags + attributes, `<script>`/`<style>`/`<pre>`/`<code>` contents, HTML comments, `<head>`, short `<td>`/`<th>` cells) and `<h1>`/`<h2>` chunk anchors; the rubric and patches only ever change text between tags. URL and Notion inputs continue to normalize to markdown (their HTML is page chrome, not an authored artifact). After an HTML rewrite, `/polish` verifies all non-prose bytes are byte-identical to the original; if not, it keeps the output but surfaces a loud `⚠ markup outside prose nodes may have shifted — review before replacing` and drops the replace prompt's default-yes — never refuse, never hard-fail.
- **New "Phase 2.5 — Editorial reduction" (opt-in, runs before the rubric).** Either pass `--reduce <pct|range>` (e.g. `--reduce 30-40` or `--reduce 25`) or pick a target at the gate: `Skip — no reduction (Recommended)` / `~10-20% (light trim)` / `~30-40% (substantial cut)` / `~50%+ (aggressive)` / custom. Skip is a true no-op; the pipeline behaves exactly as before. On a non-Skip target, an **editor subagent** critiques the doc ruthlessly (rephrase / merge / reorder / tighten / cut) and emits structured notes to `editor_notes.json` (validated against the new `schemas/editor-notes.schema.json`); a **rewriter subagent** applies the `risk: low` notes honoring lock zones; `risk: high` notes (structural reorders, large merges) and any `PRESERVE_VOICE_CONFLICT` are surfaced through the existing Phase 5 findings protocol — never auto-applied. If the rewriter falls short of the target band, the editor gets one capped re-critique. The editor pass is **not** a polish iteration — the existing 2-iteration rubric cap is untouched.
- **`--dry-run` interplay.** With a non-Skip target, the editor still runs and writes `editor_notes.json`; the rewriter and re-critique do not. The dry-run report now includes the editor notes + target reconciliation above the rubric results.
- **Phase 7 metrics anchored to the original.** The headline `Words: 1,842 → 1,310 (-29%)` is computed against the original ingested doc (not the editor-reduced one), so the % reflects editor cut + rubric tightening together. A new `Editorial pass:` summary line reports target / estimated / actual / applied / skipped / surfaced — or `skipped` / the dry-run variant.

### Changed

- **`/polish` is now `10` phases** (Phase 2.5 inserted between preset selection and the rubric). The "Track Progress" instruction, the platform-adaptation note, the file map, and the anti-patterns all updated; the rubric runs on the *working document* (editor-reduced if Phase 2.5 ran).
- **`reference/chunking.md`** gains a "Format-aware lock zones" subsection (the markdown set is unchanged; HTML adds its own lock zones); the chunking algorithm cites `<h1>`/`<h2>` (and `<h3>`/`<p>` for oversized) as the HTML analogues.
- **New files:** `plugins/pmos-toolkit/skills/polish/reference/editorial-pass.md` (editor + rewriter prompt templates, the `editor_notes.json` validate/prune contract, re-critique, HTML fidelity rule), `plugins/pmos-toolkit/skills/polish/schemas/editor-notes.schema.json` (JSON Schema draft-07), and two fixtures — `tests/fixtures/html-doc.html` (HTML round-trip + lock zones) and `tests/fixtures/bloated-doc.md` (a verbose PRD-shaped doc for the reduction pass) — with paired `tests/expected.yaml` contracts.

### Fixed

- **`/feature-sdlc skill`'s deterministic eval was flaky on any skill with a >16KB body.** `tools/skill-eval-check.sh` ran the body-pattern checks as `body | grep -q …`; under `set -o pipefail`, `grep -q` closes the pipe on its first match and the upstream `sed` gets SIGPIPE, so the pipeline reports failure even when the pattern *did* match — flaking `d-platform-adaptation`, `d-learnings-load-line`, `d-capture-learnings-phase`, and `d-progress-tracking`. The body is now cached once and the checks read from a here-string. Same script for `/polish` runs 10/10 clean post-fix.

### Migration

None — additive. The existing markdown path is byte-for-byte unchanged when the editor gate is Skipped (the default). The new `--reduce` flag and the new phase do not require any state changes; `editor_notes.json` is a per-run artifact alongside the polished file.

### References

- Requirements: `docs/pmos/features/2026-05-13_polish-editorial-pass/01_requirements.html`
- Spec: `docs/pmos/features/2026-05-13_polish-editorial-pass/02_spec.html`
- Plan: `docs/pmos/features/2026-05-13_polish-editorial-pass/03_plan.html`
- Feedback triage: `docs/pmos/features/2026-05-13_polish-editorial-pass/0c_feedback_triage.html`

---

## 2026-05-13 — pmos-toolkit 2.39.0: /execute parallel subagent-driven execution mode

`/execute` can now run a plan by fanning independent tasks out across subagents in parallel, instead of (or in addition to) the single-agent task-by-task loop. The behavior is selected by a flag, the user is asked which mode to use right after `/plan`, and all of the subagent-driven logic lives inside `/execute` itself — nothing outside `plugins/pmos-toolkit/skills/execute/` is required.

### What's new

- **`/execute --subagent-driven` — parallel, subagent-driven execution.** A fresh implementer subagent per task; a deterministic wave planner groups tasks into "waves" (a task is in wave *k* once all its `Depends on:` / `Requires state from:` are in earlier waves **and** it shares no `Files:` path with its wave-mates), and each wave's implementers are dispatched concurrently. Implementer subagents implement + test but never `git commit` — the controller commits each task's file-set serially after the wave, preserving the `T<N>` commit subjects the resume resolver depends on (and honoring the plan's `commit_cadence`). Every completed task then goes through a two-stage review — spec-compliance reviewer subagent first, then (only on ✅) a code-quality reviewer subagent — looping to clean, and one whole-implementation reviewer runs after the last wave. Implementer status (`DONE` / `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` / `BLOCKED` / stall) is handled per the subagent-driven contract. Inspired by `superpowers:subagent-driven-development`, but with no dependency on it — degenerate plans (dependency cycle, unknown task id, legacy plan with no v2 task fields) fall back to fully-sequential singleton waves.
- **`plugins/pmos-toolkit/skills/execute/subagent-driven.md` — self-contained prompt templates.** Implementer / spec-compliance-reviewer / code-quality-reviewer / final-reviewer templates plus model-selection guidance (cheap model for mechanical 1–2-file tasks, standard for integration, most-capable for design/review). No `../_shared/*` or `superpowers:*` reference is load-bearing.
- **`/plan` asks the execution mode at close.** Before the closing offer, `/plan` asks **Inline execution** (Recommended — one agent, task-by-task, lowest token cost) vs **Subagent-driven execution** (fresh subagent per task, parallel waves, two-stage review — faster on wide plans), records the choice as `execution_mode:` in the plan's frontmatter, and reflects it in the `/execute …` invocation it offers.
- **`/feature-sdlc` honors it.** Phase 6 reads `execution_mode` from the plan and passes `--subagent-driven` accordingly; an absent value (legacy plan) means inline, with no re-prompt.

### Changed

- `/execute` `argument-hint` gains `[--subagent-driven | --inline]` (mutually exclusive, last wins, absent ⇒ inline). On platforms with no subagent tool, `--subagent-driven` degrades to a warning + inline execution — never an error. `/execute` also gains a `## Track Progress` section. The pre-existing "Subagent Execution (when Agent tool is available)" note is now framed as a lightweight *sequential* sub-option of inline mode; the new section is the parallel variant.
- Both `plugin.json` manifests bumped to 2.39.0 (in sync).

### References

- Requirements: `docs/pmos/features/2026-05-13_execute-subagent-mode/01_requirements.md`
- Spec: `docs/pmos/features/2026-05-13_execute-subagent-mode/02_spec.md`
- Plan: `docs/pmos/features/2026-05-13_execute-subagent-mode/03_plan.md`
- Verification report: `docs/pmos/features/2026-05-13_execute-subagent-mode/04_verify.md`

## 2026-05-12 — pmos-toolkit 2.38.0: skill development via /feature-sdlc (skill modes, skill-eval rubric, /skill-sdlc alias)

Folds skill authoring into the same SDLC spine everything else uses. `/create-skill` and `/update-skills` are retired — building or revising a skill now runs the full worktree-isolated, resumable, gated `/feature-sdlc` pipeline (requirements → spec → plan → execute → eval → verify → complete-dev), and every skill is scored against a binary rubric before it can merge.

### What's new

- **`/feature-sdlc skill <description>` builds a new skill end-to-end.** It runs the same pipeline as a feature: git worktree + branch, resumable `state.yaml`, auto-tiering, compact checkpoints — then adds a skill-eval gate before merge. `/feature-sdlc skill --from-feedback <file|text>` (or `--from-retro`) drives the same pipeline to apply feedback or retro findings to one or more existing skills in a single combined run.
- **`/skill-sdlc` — a thin alias** for `/feature-sdlc skill …`. Triggers on "create a skill", "build me a slash command", "author a new skill", "apply this retro feedback to the skill", etc. It forwards verbatim; all the logic lives in `/feature-sdlc`.
- **A research-grounded skill-authoring guide + binary eval rubric.** `reference/skill-patterns.md` (§A frontmatter · §B description & triggering · §C structure & progressive disclosure · §D body & content · §E scripts & tooling · §F platform-conditional frontmatter) is the single source of truth for how a good skill is written; `reference/skill-eval.md` mirrors it 1:1 as a 39-check pass/fail rubric (20 deterministic + 19 LLM-judge). `/feature-sdlc skill`'s requirements / spec / execute / verify stages all cite the guide; `/create-skill`'s old prose "Conventions" checklist is superseded (the three pmos-specific bits — canonical path, manifest version-sync, release entry point — live in `CLAUDE.md`).
- **`skill-eval-check.sh` — a bundled deterministic-check runner.** `plugins/pmos-toolkit/skills/feature-sdlc/tools/skill-eval-check.sh [--target claude-code|codex|generic] [--selftest] <skill-dir>` runs the 20 deterministic checks and prints a TSV verdict (exit 0 all-pass / 1 a-check-failed / 2 invocation error). `--selftest` asserts the check-list ↔ rubric bijection. The 19 LLM-judge checks run via a reviewer subagent with a verbatim-quote contract.
- **A TDD-style skill-eval refinement loop (new Phase 6a).** After `/execute`, the skill is scored; failing checks become a `## Eval-remediation` task block appended to the plan, `/execute` re-runs (task-level resume), and it re-scores — up to 2 iterations, then a categorical decision (accept residuals as known risk / iterate manually / restore iteration 1 / abort). `/verify` re-runs the rubric fresh and reconciles against any accepted residuals. Nothing passes silently.
- **New skill-mode phases.** `0c /feedback-triage` (parse a retro/feedback source → per-finding critique vs the current skill → approve/modify/skip/defer → triage doc → combined per-skill requirements seed) and `0d /skill-tier-resolve` (resolve skill tier, on-disk location, and target platform — host CLAUDE.md/AGENTS.md/GEMINI.md rule > plugin manifest > `.agents/` > `.claude/skills/` — with a single consolidated confirmation).

### Changed

- **`/feature-sdlc`'s phases are renumbered linearly:** `0, 0a, 0b, 0c, 0d, 1, 2, 2a, 3, 3a, 3b, 3c, 4, 5, 6, 6a, 7, 8, 8a, 9, 10`. Feature mode behaves exactly as before — the new `0c/0d/6a` phases only run in skill modes.
- **`state.yaml` is schema v4** — additive over v3: a `pipeline_mode` field (`feature` / `skill-new` / `skill-feedback`), a `skill_eval` substructure (per-iteration results + accepted residuals), and a mode-conditional `phases[]` set. Existing v1/v2/v3 state files auto-migrate on `--resume`.
- **`/create-skill` and `/update-skills` are archived** to `archive/skills/` (with `archive/skills/README.md` explaining the merge and where each old phase lives now); their reusable reference files moved into `feature-sdlc/reference/`. The README rows for both now redirect to the archive; `CLAUDE.md` gains a `## Skill-authoring conventions` section.

### References

- Requirements: `docs/pmos/features/2026-05-11_feature-sdlc-skill-mode/01_requirements.html`
- Spec: `docs/pmos/features/2026-05-11_feature-sdlc-skill-mode/02_spec.html`
- Plan: `docs/pmos/features/2026-05-11_feature-sdlc-skill-mode/03_plan.html`
- Verification report: `docs/pmos/features/2026-05-11_feature-sdlc-skill-mode/verify/2026-05-12-review.html`
- Archive: `archive/skills/README.md`

## 2026-05-11 — pmos-toolkit 2.37.0: survey-design hardening (Phase-4 refinement loop, multi_field_open, two-tier assets)

Acts on the retro from the first `/survey-design` session (the skill shipped in 2.36.0): rebuilds the reviewer pass as a bounded refinement loop with a product-fit rubric, adds a new question type, hardens substrate-asset handling, declutters dispositions, and adds a persuasive-intro intake variable. Five fixes (F1, F3, F6, F7, F8) approved out of 8 surfaced; F2/F4/F5 skipped with reasons (see the triage doc). Driven via `/update-skills`.

### What's new

- **Phase 4 is now a bounded generate↔review refinement loop (F1).** ≤ 2 iterations, *categorical* exit (zero product-fit FAILs **and** zero blocker-severity methodology findings, or the cap). The reviewer **evaluates and recommends only** — it never writes files or mutates `survey.json`; the generator applies a targeted regeneration (only the flagged questions + directly-coupled ones; author-supplied questions are rewrite-only, never auto-cut), re-runs trim-to-budget, re-derives the artifacts, and loops. The reviewer return contract gains: a `**Product fit:**` lead line per question (predictability / load-bearing / scope-match — each PASS/FAIL with a *written* predicted-answer / themes line as the evidence), a `## Refinement loop changelog` (`### Iteration N` tables), a `## Research-goal coverage / product fit` section in `survey-eval.md`, per-section sub-scores, and a YAML machine block (`score`, `sub_scores`, `product_fit_fails`, `blockers`, `recommended_edits`). Phase 5 opens with the loop summary and surfaces residual product-fit FAILs first as "Kill or rewrite Q<id>?" decisions (`Rewrite as proposed (Recommended)` / `Kill` / `Keep with reason` / `Defer`).
- **Product-fit rubric + 0–100 score (F1).** `reference/survey-best-practices.md` gains a leading **"Product fit (evaluate this first)"** section (the three binary per-question checks + a survey-wide research-goal-coverage check + two worked PASS/FAIL examples) and a **"Scoring rubric (0–100, informational)"** section (8 weighted dimensions summing to 100 — product-fit 30 / structure 15 / length 10 / mode 10 / scale 10 / accessibility 10 / ethics 10 / intro 5 — deduction sizes, composite formula). The score is a *progress signal only* — it never gates the loop; the exit is categorical.
- **`multi_field_open` question type + `schema_version` 2 (F6).** A shared stem + one labelled single-line input per `fields: [{id,label,placeholder}]` entry — the recommended shape for "metrics by cadence" items (one input each for daily / weekly / monthly …). 30 s per field; not routable; new schema invariants (`fields` ≥ 1, kebab-unique field ids, no `options`/`scale`/`rows`/`columns`/`constant_sum_total`). `reference/platform-export.md` maps it per platform: SurveyMonkey and Qualtrics native (`open_ended`/`multi` with `answers.rows[]`; `Matrix`/`TE`); Typeform and Google Forms downgrade to N short-answer items preceded by a statement / section header, with an in-artifact comment and a `export/README.md` note. `assets/survey-preview.js` renders it (one `<label for>`+`<input type="text">` per field, label-adjacent, counted as one question). `schema_version: 1` surveys remain valid input — the skill rewrites it to `2` on the next re-derive; no v1 field is removed.
- **Two-tier substrate-asset handling (F3).** A missing **hard-required** asset (`survey-preview.js`, `style.css`, `viewer.js`) aborts with `survey-design: missing substrate asset <abs-path> — reinstall the pmos-toolkit plugin` and writes **no** degraded artifact (no improvised self-contained renderer). A missing **convenience** asset (`serve.js`; the turndown trio / `html-to-md.js`) emits one warning, skips the dependent extra, and continues.
- **Cosmetic-finding filter (F7).** Reviewer / simulation findings that are severity-`nit` **and** pure wording/title polish (no methodological or product-fit weight) no longer crowd the batched dispositions — they go in a trailing "Noted, not asked:" line and into `## Dispositions` as `noted (cosmetic, not asked)`.
- **Persuasive-intro intake variable (F8).** Phase 2 gains a free-form `response_impact` variable ("what happens to the responses / what does the audience get out of it"); the generated `intro.text` MUST carry a WIIFM sentence built from it — concrete impact, audience-specific, **honest** (no fake scarcity/urgency, no overclaiming) — or a benefit-framed restatement of `purpose` when `response_impact` is null (no invented downstream-action claim). The reviewer's intro/consent dimension flags a missing WIIFM line as `should-fix`. Stored as `intro.response_impact` in `survey.json`.

### Verification

- `/verify` PASS — static + structural: `audit-recommended.sh` exit 0; the non-interactive-block region byte-matches `_shared/non-interactive.md`; `node --check` on `survey-preview.js`; `expected.yaml` parses; structural greps confirm each F-fix's contract is present and self-consistent. Report: `docs/pmos/features/2026-05-11_update-skills-survey-design-fixes/verify/2026-05-11-review.html`. The plan's behavioral runbook (an end-to-end `/survey-design` run on a reconstructed retro brief; rename-the-asset abort/warn checks; a 3-field `multi_field_open` export + render) is recorded for the next real `/survey-design` invocation — it's a use-time exercise of the skill, not a deploy-time gate. New test expectations + a fixture for the type and the F8 regression were added under `tests/`.

### References

- [`docs/pmos/features/2026-05-11_update-skills-survey-design-fixes/00_triage.md`](features/2026-05-11_update-skills-survey-design-fixes/00_triage.md) — `/update-skills` triage (8 findings → F1/F3/F6/F7/F8 approved; F2/F4/F5 skipped)
- [`.../01_requirements.html`](features/2026-05-11_update-skills-survey-design-fixes/01_requirements.html) · [`grills/2026-05-11_01-requirements.html`](features/2026-05-11_update-skills-survey-design-fixes/grills/2026-05-11_01-requirements.html) · [`02_spec.html`](features/2026-05-11_update-skills-survey-design-fixes/02_spec.html) · [`03_plan.html`](features/2026-05-11_update-skills-survey-design-fixes/03_plan.html) · [`verify/2026-05-11-review.html`](features/2026-05-11_update-skills-survey-design-fixes/verify/2026-05-11-review.html)
- [`plugins/pmos-toolkit/skills/survey-design/SKILL.md`](../../plugins/pmos-toolkit/skills/survey-design/SKILL.md) — updated skill body · [`reference/survey-best-practices.md`](../../plugins/pmos-toolkit/skills/survey-design/reference/survey-best-practices.md) · [`reference/platform-export.md`](../../plugins/pmos-toolkit/skills/survey-design/reference/platform-export.md) · [`assets/survey-preview.js`](../../plugins/pmos-toolkit/skills/survey-design/assets/survey-preview.js)

## 2026-05-10 — pmos-toolkit 2.35.0: feature-sdlc worktree-resume rework

Reworks /feature-sdlc to use harness-native worktree entry, fixes resume friction across compact checkpoints, and teaches /complete-dev to clean up worktrees on success.

### What's new

- **Harness-native worktree entry (FR-W01–W05).** /feature-sdlc Phase 0.a now creates the worktree and immediately calls `EnterWorktree(path=<abs>)`. On harness success, the same Claude session continues into the new worktree. On any error, /feature-sdlc emits a byte-deterministic handoff block + a grep-able `Status: handoff-required` line, then exits 0 — wrapper scripts (/loop, /schedule) see clean exit.
- **Drift-check resume (FR-R01–R07).** `/feature-sdlc --resume` now compares `realpath($PWD)` to `state.worktree_path` before any other validation. If the user is in the wrong directory, the skill refuses early with the relaunch instruction and exit 64. Each drift check logs its inputs to chat for debuggability (NFR-06).
- **State schema v3 (FR-S01–S05).** Pure cohort-marker bump over v2 — no field changes, no removals. Auto-migrates on read when the drift check passes; legacy v2 files in main trigger drift-refusal (correct). `worktree_path` is now realpath-canonical at write time.
- **`/feature-sdlc list` (FR-L01–L08).** New subcommand discovers all in-flight features across `feat/*` worktrees. Outputs a markdown table with `Slug | Branch | Phase | Last updated | Worktree`, sorted by last_updated descending. Worktrees with legacy v1/v2 state get a `(legacy v1/v2)` Phase suffix.
- **`/complete-dev --force-cleanup` (FR-CD01–CD06).** Phase 4 now does `ExitWorktree(action=keep)` → fallback `cd <root>` instruction → `git worktree remove` → `git branch -D feat/<slug>`. New `--force-cleanup` flag handles dirty-tree and rebased-stale-branch edge cases. Dirty-status check excludes the gitignored `.pmos/feature-sdlc/` subtree (FR-CD03).
- **state.yaml gitignored.** `.pmos/feature-sdlc/` added to `.gitignore`; the previously-tracked `state.yaml` removed from tracking (FR-G01–G03). Per-worktree state files no longer collide across features in fresh worktrees.
- **`_shared/canonical-path.md`.** Single source of truth for the realpath contract; cited by /feature-sdlc Phase 0.b + Phase 1, and /complete-dev Phase 4 (FR-SH01).

### Verification

- Unit tests: `tools/test-feature-sdlc-worktree.sh` — 4/4 OK.
- Integration tests: `tools/verify-feature-sdlc-worktree.sh` — 8/8 PASS. Cases 3+4 hardened to grep production prose (red-green verified) per /verify Phase 3 multi-agent finding (score 95).
- Manifest version sync: 2.34.0 → 2.35.0 in both `.claude-plugin` and `.codex-plugin`.
- audit-recommended baseline preserved: 15 unmarked across 28 skills, byte-identical to main pre-merge.
- Dogfood: this very feature shipped through /feature-sdlc end-to-end; /complete-dev Phase 4 exercised on the rework's own worktree + the stale `pipeline-consolidation` worktree from the prior release.

### References

- [Spec](docs/pmos/features/2026-05-10_feature-sdlc-worktree-resume/02_spec.md)
- [Plan](docs/pmos/features/2026-05-10_feature-sdlc-worktree-resume/03_plan.md)
- [Verify review](docs/pmos/features/2026-05-10_feature-sdlc-worktree-resume/verify/2026-05-10-review.md)

## 2026-05-10 — pmos-toolkit 2.34.0: Pipeline consolidation — folded MSF-req/MSF-wf/simulate-spec, /retro multi-session, /feature-sdlc Phase 13 + --minimal

Folds three optional pipeline skills (`/msf-req`, `/msf-wf`, `/simulate-spec`) into their parents (`/requirements`, `/wireframes`, `/spec` respectively) as Tier-3 default-on phases with per-finding commit cadence and inline-disposition for sub-threshold findings. Removes the now-redundant `/feature-sdlc` Phase 4.a (msf-req gate) and Phase 6 (simulate-spec gate). Adds `/retro` as Phase 13 of `/feature-sdlc` (soft, Recommended=Skip). Enhances `/retro` with multi-session analysis (--last/--days/--since/--project current|all/--skill/--scan-all) via subagent-per-transcript dispatch with 5-in-flight + 60s timeout + boilerplate-strip aggregation. Bumps `state.yaml` schema v1→v2 with auto-migration. Adds `--minimal` flag to short-circuit four soft gates. Fixes the slug clash between `/msf-req` and `/msf-wf` (both previously wrote `msf-findings.md`) by adopting the `<skill-name-slug>-findings.<ext>` convention.

### What's new

- **Folded MSF-req inside `/requirements` (Phase 5.5)** — Tier-3 default-on; Tier-1/2 optional. Apply-loop with confidence threshold (default 80; override via `--msf-auto-apply-threshold N`); per-finding git commits with `Depends-on:` body annotation; sub-threshold findings surface as structured-ask with `Recommended=Defer to OQ`. Output to `msf-req-findings.md` (slug-distinct per W4). Escape: `--skip-folded-msf`. FR-64 uncommitted-edits guard prevents clobber. Failure capture appends `{folded_skill, error_excerpt, ts}` to `state.yaml.phases.requirements.folded_phase_failures[]`; chat-emits a `WARNING: msf-req crashed (advisory continue per D11): <excerpt>` at append.
- **Folded MSF-wf inside `/wireframes` (Phase 6 reframed)** — same contract, per-wireframe iteration. Output to `msf-wf-findings/<wireframe-id>.md` (directory variant). Escape: `--skip-folded-msf-wf`. FR-65 uncommitted guard.
- **Folded simulate-spec inside `/spec` (Phase 6.5)** — delegates to a new `_shared/sim-spec-heuristics.md` substrate (4-pass scenario enumeration → trace → 4-bucket fitness critique → cross-reference → severity-keyed disposition). Auto-apply patches edit `02_spec.md` in-place with `spec: auto-apply simulate-spec patch P<N>` per-finding commits. Escape: `--skip-folded-sim-spec`. FR-66 uncommitted guard.
- **`/feature-sdlc` Phase 13 `/retro` gate (new)** — soft, Recommended=Skip. Options: Skip / Run /retro / Run /retro --last 5 / Defer. State.yaml gains `retro` phase entry (v2 schema).
- **`/feature-sdlc` `--minimal` flag** — sets `_minimal_active=true` directive; orchestrator short-circuits the four soft gates (creativity, wireframes, prototype, retro) via chat log line `[orchestrator] phase_minimal_skip: <phase-id>` without issuing the AskUserQuestion. User-explicit; does not bypass canonical-block classifier.
- **`/retro` multi-session capability (W8)** — 7 new flags: `--last N`, `--days N`, `--since YYYY-MM-DD`, `--project current|all`, `--skill <name>`, `--scan-all`, `--msf-auto-apply-threshold N`. Phase 1 enumerates candidates, applies cap-confirmation prompt at >20 transcripts (Recommended=most-recent-20 per D32; NI auto-pick same). Phase 2 dispatches one subagent per candidate, batched 5-in-flight, 60s per-subagent timeout (FR-42), with `scanned-failed` partial-failure handling (FR-44). Per-wave progress to stderr (`Wave i/N: complete/in-flight (T+sec)`, FR-49). Phase 4 aggregates via `(skill, severity, first-100-chars-stripped)` hash with boilerplate-strip regex (`^The /\S+ skill\b\s*|^The skill\b\s*|^An?\s+|^The\s+`); constituent raw findings nested per aggregated row. Phase 5 emits two-tier output (`## Recurring Patterns` ≥2 sessions sorted frequency × severity + `## Unique but Notable` + `## Skipped (scan failed)`). NFR-02 wall-clock budget <90s for 5-transcript fixture.
- **`state.yaml` schema v1 → v2 with auto-migration (FR-SCHEMA / D31)** — additive: `phases[].folded_phase_failures: []` (with `(folded_skill, error_excerpt)` append-dedup rule per spec §10.1), `phases[].started_at` write contract on `pending → in_progress` transitions (FR-57; never overwritten on resume), `retro` phase entry between `complete-dev` and `final-summary`. 4-step idempotent auto-migration runs on read of any v1 state file. POSIX-atomic same-directory write-temp-then-rename per D31; orphan `.tmp` reaper at /plan startup; NFR-08 hard error on `rename(2)` failure.
- **`/feature-sdlc` Phase 11 + Resume folded-phase failure surfacing (T12b)** — Phase 11 final-summary reads each `state.yaml.phases.<x>.folded_phase_failures[]` and emits a `## Folded-phase failures (N)` subsection above the OQ index when ≥1 failure present (omitted when N=0). The `--resume` Resume Status panel (single chat-block per D30) re-emits the same subsection so users see folded-phase health at every resume.
- **`/verify` legacy slug fallback + folded-phase awareness (T19)** — primary read at `msf-req-findings.md` / `msf-wf-findings/<id>.md`; fallback to `msf-findings.md` with soft warning. Affirmative `✓ folded phases skipped per documented flags` when E14 conditions hold (all skipped + zero failures + flags in state.yaml.notes). Advisory warning when Tier-3 has no folded artifacts AND no documented skips. Per-failure advisory emit per FR-52.
- **`/complete-dev` release-notes recipes (T20)** — four recipes: (1) `git log --invert-grep --grep='auto-apply'` to filter human-meaningful commits; (2) `git log --grep='Depends-on:'` to discover folded-finding dependency graph; (3) `git rebase -i mid-pipeline` anti-pattern documentation (rewrites SHAs/timestamps that the apply-loop's `--since=<phase.started_at>` resume cursor depends on); (4) `--help` quick-reference for the 11-flag v2.34.0 surface.
- **11 new CLI flags (T1)** — across 5 SKILL.md frontmatters: `/feature-sdlc --minimal`; `/requirements --skip-folded-msf --msf-auto-apply-threshold N`; `/wireframes --skip-folded-msf-wf --msf-auto-apply-threshold N`; `/spec --skip-folded-sim-spec`; `/retro --last N --days N --since YYYY-MM-DD --project current|all --skill <name> --scan-all`.
- **Slug-distinct findings convention (W4)** — `<skill-name-slug>-findings.<ext>` replaces the legacy `msf-findings.md`. /msf-req → `msf-req-findings.md`; /msf-wf → `msf-wf-findings/<wireframe-id>.md` (directory variant). Dogfooded in this feature's own folder before shipping.

### Verification

- **Lints PASS:** `lint-non-interactive-inline.sh` 27/27, `lint-pipeline-setup-inline.sh` 7/7, manifest version-sync diff = 0 (both at 2.34.0).
- **Fixture suite (12 tests):** `test-t5-shared-substrate.sh`, `test-w1-fold-msf-req.sh`, `test-w2-fold-msf-wf.sh`, `test-w3-fold-sim-spec.sh`, `test-w5-fsdlc-gates.sh`, `test-w7-fold-retro.sh`, `test-w8-multi-session-retro.sh`, `test-t12a-failure-capture.sh`, `test-t12b-failure-surface.sh`, `test-t14-retro-flags.sh`, `test-t19-verify-fallback.sh`, `test-resume-idempotency.sh` — all OK.
- **E2E dogfood:** `/verify` ran against this feature's own `02_spec.md` cleanly; review at `verify/2026-05-10-review.md`. PASS-with-documented-deviations.

### Known limitations / open questions

- **ADV-audit-recommended baseline** — `audit-recommended.sh` still reports 15 unmarked AskUserQuestion call sites (baseline 13 + 2 from this feature's prose-imperative directives in `/feature-sdlc` for the `--minimal` and Resume Status panel sections; the awk extractor cannot distinguish prose mentions from real call sites). Pre-existing across changelog/create-skill/execute/feature-sdlc; not blocking. Pre-push hook does not gate on this script.
- **Per-task commit cadence (T15-T18)** — DEVIATION-P6: T15-T18 (4 /retro multi-session tasks) batched into one commit because they all touch `/retro/SKILL.md` in tightly-coupled sections; per-task resume-cursor sacrifice was acceptable for documentation-only changes. Future folded-feature work in a single SKILL.md should still split per-task when feasible.
- **OQ-1 / OQ-2 from html-artifacts (v2.33.0) — RESOLVED** — bootstrap markdown handling in `/complete-dev` and `output_format` flip-back behavior were carried over but did not block this release; folded-phase artifacts in this feature are markdown (the html-artifacts substrate handles HTML for canonical pipeline artifacts, not the slug-distinct findings docs).

### Migration notes

- **Pre-2.34.0 `state.yaml` files** are auto-migrated on read by `/feature-sdlc --resume`. The migration is idempotent: sets `schema_version: 2`, ensures `folded_phase_failures: []` on every phase entry, ensures `started_at: null` where absent, appends `retro` phase entry between `complete-dev` and `final-summary`. Emits a `migration: state.schema v1 → v2 (added: ...)` chat line.
- **Pre-2.34.0 paused pipelines** with `phases.msf-req` or `phases.simulate-spec` entries are read transparently — entries elide and the resume cursor advances to the next phase. No manual intervention required.
- **Existing `msf-findings.md` artifacts** in older feature folders are preserved unchanged. /verify reads new slug primary; falls back to legacy with soft warning.

---

## 2026-05-10 — pmos-toolkit 2.33.0: HTML-native artifact generation across feature-folder pipeline skills

Migrates 10 feature-folder pipeline skills (`/requirements`, `/spec`, `/plan`, `/msf-req`, `/msf-wf`, `/simulate-spec`, `/grill`, `/artifact`, `/verify`, `/design-crit`) plus the `/feature-sdlc` orchestrator's tracking artifacts from markdown-primary to HTML-primary authoring. Establishes a shared `_shared/html-authoring/` substrate (template, conventions, vendored turndown UMD + GFM plugin, hand-authored style.css ≤30 KB, single-script viewer.js with file:// fallback + sessionStorage try/catch + clipboard execCommand fallback, zero-deps serve.js with explicit MIME map + port-fallback, `html-to-md.js` CLI shim).

### What's new

- **HTML-primary feature-folder artifacts.** Every pipeline-stage artifact (`01_requirements.html`, `02_spec.html`, `03_plan.html`, plus `/msf-req`, `/msf-wf`, `/simulate-spec`, `/grill`, `/artifact`, `/verify`, `/design-crit` outputs and the `/feature-sdlc` `00_pipeline.html` + `00_open_questions_index.html`) is authored as semantic HTML5 with `<section>` per H2, kebab-case stable IDs, sibling `<artifact>.sections.json` ground-truth manifest, asset-relative `assets/*` references, and zero server-side MD→HTML conversion. Existing markdown artifacts in older feature folders are untouched (forward-only migration).
- **`output_format` resolution gate.** Settings `output_format ∈ {html, md, both}` (default `html`); the literal token `markdown` and any out-of-set value exit 64. Resolution precedence is per-skill `--format` flag → `.pmos/settings.yaml :: output_format` → built-in default. Inlined as a non-interactive-block-style gate in all 10 affected skills.
- **Format-aware input resolver (`_shared/resolve-input.md`).** Picks `<artifact>.html` then `<artifact>.md` then errors with a clear message; consumers (reviewer subagents, downstream stages) traverse the canonical resolution order without per-skill duplication.
- **Reviewer subagent input contract.** Five reviewer-dispatching skills (`/grill`, `/verify`, `/msf-req`, `/msf-wf`, `/simulate-spec`) carry a Phase-1 "Input Contract (when invoked as reviewer subagent)" subsection — each consumes chrome-stripped HTML and validates `sections_found` against the ground-truth `<artifact>.sections.json` (FR-50/50.1/52). Chrome-strip is the **parent's** responsibility: `_shared/html-authoring/chrome-strip.md` documents the algorithm; `_shared/html-authoring/assets/chrome-strip.js` (≤80 LOC ref impl) is the canonical implementation; `tests/scripts/assert_chrome_strip.sh` exercises a 5-fixture self-test. `/verify` Phase 3 Multi-Agent Code Quality Review block is carved out (FR-50.1) since those reviewers consume git diffs, not artifact HTML.
- **`/diagram` blocking subagent pattern.** `/spec` Phase 5 dispatches `/diagram` as a blocking Task subagent (300s timeout × 3 attempts → inline-SVG fallback after 3 failures; 30 min wall-clock cap per `/spec` run via `diagram_subagent_state` accumulator). `/plan` Execution-order section cross-references the pattern. Three figcaption provenance variants (subagent / fallback / inline). Selftest at `plugins/pmos-toolkit/skills/diagram/tests/run.py` exit 0.
- **Cross-doc anchor scan in `/verify` smoke (FR-92).** Broken cross-document anchors (e.g., `02_spec.html#nonexistent-section`) are hard-failed during `/verify` smoke runs.
- **Heading-id rule (FR-03.1).** Every `<h2>`/`<h3>` carries a kebab-case `id` derived from the visible heading text; `tests/scripts/assert_heading_ids.sh` enforces the contract across feature-folder fixtures.
- **viewer.js classic-script (FR-05.1).** Single-script viewer (≤30 KB budget; 12984 bytes actual) with no ES module patterns; lint enforced by `plugins/pmos-toolkit/tools/lint-no-modules-in-viewer.sh` + `tests/scripts/assert_no_es_modules_in_viewer.sh`. Eleven UI surfaces: chrome + iframe routing + per-section Copy MD + full-doc Copy MD + sessionStorage state restore (with try/catch fallback) + clipboard execCommand fallback + file:// fallback banner + legacy-md `<pre class="pmos-legacy-md">` shim + four others.
- **Eight new assert scripts in `tests/scripts/`** — `assert_resolve_input.sh` + `_resolve_input_harness.sh` (4 sub-fixtures), `assert_sections_contract.sh`, `assert_format_flag.sh` (10 skills), `assert_unsupported_format.sh` (10 skills), `assert_no_md_to_html.sh` (G2 enforcement), `assert_no_es_modules_in_viewer.sh`, `assert_heading_ids.sh`, `assert_cross_doc_anchors.sh` — plus `assert_chrome_strip.sh` and `assert_serve_js_unit.sh` from earlier phases.
- **Canonical fixture** at `tests/fixtures/repos/node/docs/pmos/features/2026-05-09_html-artifacts-fixture/` (5 HTML artifacts + sibling sections.json + 4 cross-doc anchors + index.html + 6 byte-identical assets) drives the assert suite end-to-end.

### Known limitations / open questions

- **OQ-1 (deferred to pre-2.34.0)** — When `/complete-dev` is updated to handle the bootstrap markdown still present in this feature's own artifacts (`01_requirements.md`, `02_spec.md`, `03_plan.md`), the choice between auto-regenerate-as-HTML, hand-convert via turndown reverse, or leave-as-historical-MD is unresolved.
- **OQ-2 (deferred to pre-2.34.0)** — When `output_format` flips from `both` back to `html`, behaviour for existing `.md` sidecars from prior runs is undefined.
- **ADV-T19** — `msf-req/SKILL.md` lacks the canonical `<!-- non-interactive-block:start -->` contract carried by the other 9 affected skills (pre-existing rollout gap; not introduced by this feature).
- **ADV-T21** — `lint-no-modules-in-viewer.sh` is not yet wired into a multi-lint runner (none currently exists; tool + assert wrapper callable independently).
- **ADV-T24** — `audit-recommended.sh` fails on 13 unmarked `AskUserQuestion` call sites across `changelog`, `create-skill`, `execute`, `feature-sdlc` SKILL.md files (pre-existing on `main`; not introduced by this feature).

Single release; rollback = revert merge.

## 2026-05-09 — pmos-toolkit 2.32.0: `/create-skill` and `/update-skills` wired into `/complete-dev`

Closes the loop on the `requirements → spec → plan → execute → verify → complete-dev` pipeline by making the terminal `/complete-dev` edge real (not aspirational) at both batch entry points.

### What's new

- **`/create-skill` Phase 7 canonical-path precondition** — at write-time, refuses to write a skill outside `plugins/pmos-toolkit/skills/<skill-name>/`. Three options (Use canonical / Override-as-risk / Abort); default Recommended. Prevents the silent failure where a new skill is invisible to the plugin manifest.
- **`/create-skill` Phase 9 — Release via `/complete-dev`** — after `/verify` passes, prompts whether to invoke `/complete-dev` now / batch / skip. New row in the Phase 8 pipeline-status table for `complete-dev`. Old learnings phase renumbered to Phase 10.
- **`/update-skills` batch-level `/complete-dev` invocation** — Phase 8 dispatch now ends with one `/complete-dev` call per batch (after every approved skill passes `/verify`), not per-skill. Avoids N redundant version bumps / deploys / pushes when shipping multiple skill updates.
- **Pipeline-position diagrams updated** in both skills' bodies and frontmatter descriptions to terminate at `/complete-dev` instead of `/verify`. Convention 3 description guidance extended.
- **Repo `CLAUDE.md` added at root** — captures three project-level invariants that aren't obvious from directory structure: canonical pmos-toolkit skill path, paired-manifest version sync, `/complete-dev` as canonical release entry point. Loaded into every Claude Code session so manual skill moves/copies/renames are caught by the rule, not by coupling generic skills to repo-specific layouts.
- **Legacy `/push` references removed** in `/create-skill` Convention 1 and `/update-skills` Release-prereqs section; both now point at `/complete-dev`.

### Why

`/complete-dev` superseded the legacy `/push` in 2.30.0 but the two batch-style entry points (`/create-skill`, `/update-skills`) still terminated at `/verify`, leaving the user to remember the manual release step. The pipeline diagrams claimed an edge that the skills didn't actually walk. This release makes the diagrams honest. The accompanying repo `CLAUDE.md` keeps the misplaced-skill guard out of `/complete-dev` itself — a generic release skill should not couple to one repo's directory layout.

## 2026-05-09 — pmos-toolkit 2.31.0: `/feature-sdlc` end-to-end SDLC orchestrator

New top-level orchestrator that turns an idea into a shipped feature by driving the full pipeline sequentially — with auto-tiering, resumable state inside a git worktree, pre-heavy-phase compact checkpoints, and `--non-interactive` plumbing through every child skill.

### `/feature-sdlc` (new)

- Drives `requirements → grill → [msf-req | creativity | wireframes → prototype] → spec → [simulate-spec] → plan → execute → verify → complete-dev` sequentially. Auto-tiers each gate from the requirements doc; honours an explicit `--tier 1|2|3` override that drives both child passthrough (where children accept it) and orchestrator gate logic.
- Creates a git worktree + `feat/<slug>` branch on entry; refuses fast on the four edge cases (not-a-repo / detached HEAD / dirty tree / branch already exists), with the existing-branch case offering Use / Pick-new-slug / Abort.
- Persists resumable state at `<worktree>/.pmos/feature-sdlc/state.yaml` (schema_version: 1, refuse-newer / auto-migrate-older). On no-arg invocation inside a worktree with state.yaml, auto-detects resume; jumps to the first non-completed phase after showing the status table.
- Surfaces a compact checkpoint before each context-heavy phase (wireframes, prototype, simulate-spec, execute, verify) with a precise three-part Pause-resumable exit contract: state.yaml records `paused_reason`, chat prints exact resume command including `cd <worktree>`, clean exit. Skills can't trigger `/compact` directly — this is the contract that makes pause work.
- Failure dialog is constructed from per-phase hard/soft tags in `state-schema.md` (single source of truth). Skip is hidden for the six hard phases (`requirements`, `spec`, `plan`, `execute`, `verify`, `complete-dev`); shown for the six soft phases. Missing-skill detection presents a Pause-to-install option instead of silent skip.
- `--non-interactive` plumbs through child skills and aggregates their deferred-question artifacts into a single `00_open_questions_index.md` written at end-of-run or end-of-pause. `/grill` is auto-skipped in non-interactive mode with an explicit chat log line (never silent).
- `/wireframes` gate is always presented per FR-FRONTEND-GATE; the keyword heuristic only biases which option is `(Recommended)`. Tier-1 always recommends Skip regardless of heuristic.

### README

- New "Pipeline orchestrators" subsection groups `/feature-sdlc` alongside `/update-skills` (moved from "Pipeline enhancers"). Standalone-line updated to include `/feature-sdlc`.

### References

- `docs/pmos/features/2026-05-09_feature-sdlc-skill/02_spec.md` — full Tier-3 spec (status: verified) including the 11 post-grill dispositions in §15.
- `docs/pmos/features/2026-05-09_feature-sdlc-skill/03_plan.md` — implementation plan (16 tasks + TN, 2 phases).
- `docs/pmos/features/2026-05-09_feature-sdlc-skill/verify/2026-05-09-review.md` — /verify report (PASS, 0 critical).
- `plugins/pmos-toolkit/skills/feature-sdlc/` — SKILL.md + 6 reference files (state-schema, pipeline-status-template, slug-derivation, frontend-detection, compact-checkpoint, failure-dialog).

---

## 2026-05-08 — pmos-toolkit 2.30.0: `/update-skills` retro friction fixes across `/changelog`, `/complete-dev`, `/verify`, `/execute`

Driven by the 2026-05-08 retro of a 6-run `/execute` + 4-run `/verify` + 1-run `/complete-dev` + 1-run `/changelog` session. Seven approved findings shipped; three skipped with reasons recorded in the triage doc.

### `/changelog`

- When `.pmos/settings.yaml :: docs_path` points somewhere other than `docs/` but a sibling `docs/changelog.md` already exists, `/changelog` now writes to the sibling and emits a one-line non-blocking advisory to reconcile `settings.yaml`. Previously you had to manually redirect at every run.

### `/complete-dev`

- Phase 5 deploy-norm detection now recognizes Python projects: any `./pyproject.toml` or `./backend/pyproject.toml` with `[project]` metadata surfaces as a deploy signal, and "Build + publish to PyPI via `uv publish`" appears as a deploy menu option (recommended when no other signals are present; defers to CI when CI auto-deploys).

### `/verify`

- Phase-scoped `--scope phase --feature <slug> --phase <N>` runs no longer require a duplicate `TodoWrite` task per FR-ID. The markdown table inside `review.md` is the structural enforcement when the per-task logs already carry evidence-typed FR coverage. `TodoWrite`-as-gate stays mandatory for standalone feature-scope runs.
- Phase 4 sub-step 3d evidence guidance now explicitly warns: synthesized `KeyboardEvent`s must use `bubbles: true` to reach document-level listeners, otherwise the listener won't fire and you'll log a false negative. (One retro session almost shipped a false-pass for FR-E09 because of this.)
- Phase 5 sub-section 4b now ships a copy-pasteable markdown table template with example rows for each of the three valid `Outcome` values (`Verified` / `NA — alt-evidence` / `Unverified — action required`). Bare `Pass` / `Fail` / `✓` are now explicitly listed as not valid.

### `/execute`

- New `--no-halt` flag suppresses the per-phase `HALT_FOR_COMPACT` handshake on green; phase verify still runs and `phase-N.md` is still written, but the skill rolls directly into the next phase without pausing for a manual `/compact`. Failure escalation is unaffected.
- Mid-run, the executing agent now honors a session-sticky continuation directive: typing `[continue_through_phases]`, "continue without compacting", "no halts", "skip compacts", or "don't halt at phase boundaries" sets the same opt-out for the rest of the conversation. Default behavior (HALT on every green) is unchanged when neither flag nor directive is set.
- Phase 0.5 Resume Reports now append a "Last 5 lines from in-flight task body" bullet list under the resume table whenever a task is `in-flight` or `in-flight-with-commits`. The resuming agent sees the recent thinking trace (last test written, current deviation, etc.) without re-deriving from `git log`. Omitted entirely when no task is in-flight.

### Skipped findings (recorded in retro triage)

Three retro findings were dropped after triage: a `task_goal_hash` helper script (maintenance overhead not worth it), a "first-tag-on-mature-project" version-bump heuristic (edge case, manual override is fine), and a Recommended-marker flip on `/complete-dev` Phase 6 learnings scan (current dedup nudge is more valuable than the capture default).

### References

- `docs/pmos/features/2026-05-08_update-skills-retro-pipeline-friction/00_triage.md` — full triage with disposition log, per-skill tier, and pipeline-status.
- Per-skill requirements + verify reviews under `docs/pmos/features/2026-05-08_update-skills-retro-pipeline-friction/{changelog,complete-dev,verify,execute}/`.

## 2026-05-08 — pmos-toolkit 2.29.0: `/diagram --on-failure` flag for deterministic non-interactive terminal failures

- `/diagram` now accepts `--on-failure {drop|ship-with-warning|exit-nonzero}` to make Phase 6.5 (terminal-failure handler) disposition deterministic when running in non-interactive mode. The flag bypasses the existing `AskUserQuestion` and dispatches on three values:
  - `drop` — write nothing, exit 3, print one-line reason; caller (e.g., `/rewrite`) drops the diagram slot.
  - `ship-with-warning` — write the SVG with a leading `<!-- WARNING: <fails> -->` comment, exit 0.
  - `exit-nonzero` (default when `--non-interactive` is set) — write nothing, exit 4, print one-line reason; caller decides.
- New **Exit-Code contract table** documented in `/diagram` SKILL.md Phase 6.5 (codes: 0 success, 2 environmental, 3 drop, 4 exit-nonzero, 64 argument error). External callers can now rely on the contract without reading source.
- Interactive `/diagram` runs are unaffected — the existing `Ship-with-warning / Try-alt / Abandon` prompt remains the source of truth.
- New regression test `plugins/pmos-toolkit/tests/non-interactive/diagram-on-failure.bats` (7 assertions) locks in the SKILL.md contract.
- Per-skill addendum added to `plugins/pmos-toolkit/tests/non-interactive/per-skill-rollout-runbook.md` documenting the flag, the exit-code contract, and the awk-extractor false-positive gotcha (prose mentions of `AskUserQuestion` in tagged sections must be reworded to "interactive prompt" / "AUQ" to keep `audit-recommended.sh` green).
- Unblocks `/rewrite` v0.14.0's spec-only handoff swap, which depends on this contract for autonomous-default diagram generation.

### References
- [features/2026-05-08_update-skills-diagram-on-failure/01_requirements.md](features/2026-05-08_update-skills-diagram-on-failure/01_requirements.md)
- [features/2026-05-08_update-skills-diagram-on-failure/03_plan.md](features/2026-05-08_update-skills-diagram-on-failure/03_plan.md)
- [features/2026-05-08_update-skills-diagram-on-failure/verify/2026-05-08-review.md](features/2026-05-08_update-skills-diagram-on-failure/verify/2026-05-08-review.md)
- [../../plugins/pmos-toolkit/tests/non-interactive/diagram-on-failure.bats](../../plugins/pmos-toolkit/tests/non-interactive/diagram-on-failure.bats)

## 2026-05-08 — pmos-toolkit 2.28.1: /complete-dev rebase-default + parallel-worktree version-bump pre-flight

- `/complete-dev` Phase 3 now defaults to **rebase-onto-main + fast-forward** when a shared-branch guard passes (no upstream OR local SHA == remote SHA). Branches that have been pushed and diverged from local fall back to `--no-ff` merge with a one-line reason in the prompt. Rebase command sequence is now spelled out explicitly.
- `/complete-dev` Phase 9 now fetches `origin/main` and runs a 3-way (local / main / branch-point) version pre-flight that detects parallel-worktree bump collisions before commit. Five verdict states: Clean, Clean-after-rebase, Fresh local bump, Stale-bump (triggers recovery), and Anomaly.
- New `reference/version-bump-recovery.md` documents the stale-bump recovery recipe (restore both paired manifests from origin/main, re-bump from main's baseline) plus failure modes and manual fallback.
- Added anti-pattern entry: the shared-branch guard's `local==remote SHA` test is necessary-but-not-sufficient — documented as a runtime caveat to prefer the merge fallback for any branch shared for review.
- Pre-push hook unchanged — it remains the authoritative last line of defence; the new pre-flight catches collisions earlier and friendlier.

### References
- `docs/pmos/features/2026-05-08_update-skills-complete-dev-merge/01_requirements.md`
- `docs/pmos/features/2026-05-08_update-skills-complete-dev-merge/02_spec.md`
- `docs/pmos/features/2026-05-08_update-skills-complete-dev-merge/03_plan.md`
- `docs/pmos/features/2026-05-08_update-skills-complete-dev-merge/verify/2026-05-08-review.md`
- `plugins/pmos-toolkit/skills/complete-dev/SKILL.md`
- `plugins/pmos-toolkit/skills/complete-dev/reference/version-bump-recovery.md`

## 2026-05-08 — pmos-toolkit 2.28.0: cross-cutting `--non-interactive` mode

- All 26 user-invokable skills now accept a `--non-interactive` (and symmetric `--interactive`) flag. In non-interactive mode, every `AskUserQuestion` checkpoint is classified at runtime: calls with a `(Recommended)` option AUTO-PICK; calls without one (or with an adjacent `<!-- defer-only: <reason> -->` tag) DEFER to a structured `## Open Questions (Non-Interactive Run)` block in the produced artifact.
- Repo-level default via `.pmos/settings.yaml :: default_mode` (`interactive` | `non-interactive`); precedence: `cli_flag > parent_marker > settings.default_mode > builtin-default`.
- Three-state exit contract: `0` clean / `2` deferred / `1` runtime error / `64` usage-or-refusal.
- Subagent propagation: parent skill prepends `[mode: <current>]` as the literal first line of any child's prompt; child resolver detects + reports `mode: <m> (source: parent-skill-prompt)` on stderr.
- Per-checkpoint classifier with three defer-only reasons: `destructive` (overwrite/delete/reset/force), `free-form` (paste/file/dictate/free-text), `ambiguous` (confirm/picker without defensible auto-pick). Destructive tag wins over `(Recommended)` (FR-04.1).
- `/msf-req` declares itself refused (`<!-- non-interactive: refused; reason: recommendations-only with free-form persona inference -->`); `--non-interactive` against a refused skill exits 64 with a stderr-only diagnostic.
- Backward compatibility: a `--non-interactive` arg against a skill that has not yet been rolled out emits `WARNING: --non-interactive not yet supported by /<skill>; falling back to interactive.` and continues in interactive mode (FR-08).
- `tools/audit-recommended.sh` enforces that every `AskUserQuestion` in supported `SKILL.md` has either a `(Recommended)` option or a `<!-- defer-only: ... -->` adjacent tag (`destructive` | `free-form` | `ambiguous`); supports `--strict-keywords` to warn on un-tagged destructive vocabulary (`overwrite|restart|discard|drift|delete|force|reset|wipe`).
- `tools/lint-non-interactive-inline.sh` enforces drift-detection on the canonical `_shared/non-interactive.md` block across all supported skills.
- New CI: `.github/workflows/audit-recommended.yml` runs both scripts on every PR touching `plugins/pmos-toolkit/skills/**/SKILL.md` or the canonical `_shared/non-interactive.md`.
- 13 unit-bats files under `plugins/pmos-toolkit/tests/non-interactive/` (51 cases / 1 documented skip) cover resolver precedence, classifier decision tree, buffer-and-flush dispatch (single-MD / sidecar / chat-only / multi-artifact), destructive auto-pick override, refusal regex, parser, parent-marker propagation, child-OQ-id namespacing, and resolver/extractor perf budgets.
- 26 integration smoke tests under `plugins/pmos-toolkit/tests/integration/non-interactive/` (opt-in via `PMOS_INTEGRATION=1`; each takes 30–120s of LLM time) — invoke `claude -p '/<skill> --non-interactive ...'` and assert zero `AskUserQuestion` events.
- 2 manual E2E runbooks (`MANUAL-subagent.md` for FR-06 propagation, `MANUAL-bc-fallback.md` for FR-08).

### Notable plan deviations during execution

- The canonical awk extractor's marker regexes (`/<!-- non-interactive-block:start -->/`) originally matched their OWN literal substrings inside the inlined block (the awk script self-references the markers in its rule lines). This flipped `in_inlined` mid-block and let the awk's `/AskUserQuestion/` rule line itself escape the skip region. Fixed by anchoring marker regexes to whole-line (`/^...$/`).
- Plan estimate "≤4 defer-only tags per skill after manual review" assumed prose enumerates options inline with `(Recommended)`; in practice prose-style SKILL.md (the majority) describes calls semantically, so most skills got 5–18 tags.
- 17 of 26 skills lack an inlined `pipeline-setup-block` (Anchor B in the runbook); only 9 use Anchor A. Runbook documents both.
- 4 false-positive `AskUserQuestion` mentions per skill on average (Platform Adaptation notes, anti-pattern bullets, parenthetical asides, section headings) needed prose rephrasing rather than tagging — tagging would pollute the runtime OQ buffer with phantom DEFERs.

### References

- [`docs/pmos/features/2026-05-08_non-interactive-mode/02_spec.md`](features/2026-05-08_non-interactive-mode/02_spec.md) — non-interactive mode spec (FR-01..FR-09, NFR-01..NFR-07, E1..E14)
- [`docs/pmos/features/2026-05-08_non-interactive-mode/03_plan.md`](features/2026-05-08_non-interactive-mode/03_plan.md) — 45-task implementation plan (Phase 1 Foundation → Phase 4 Ship)
- [`plugins/pmos-toolkit/skills/_shared/non-interactive.md`](../../plugins/pmos-toolkit/skills/_shared/non-interactive.md) — canonical contract (Section 0 inline block, Section A refusal, Section B parser, Section C subagent propagation)
- [`plugins/pmos-toolkit/tests/non-interactive/per-skill-rollout-runbook.md`](../../plugins/pmos-toolkit/tests/non-interactive/per-skill-rollout-runbook.md) — 10-step procedure for adding the contract to a skill
- [`plugins/pmos-toolkit/tools/audit-recommended.sh`](../../plugins/pmos-toolkit/tools/audit-recommended.sh) and [`plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh`](../../plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh) — CI-enforced drift checks

---

## 2026-05-08 — pmos-toolkit 2.27.0: /create-skill plan+verify + /plan v2 cross-stack support + first changelog

> Note: v2.26.0 was tagged and shipped without a `docs/pmos/changelog.md` entry. This 2.27.0 release adds the first entry retroactively, covering the 2.24.0 → 2.27.0 span (everything between the previous tagged release and now).

- `/pmos-toolkit:create-skill` now runs the full pipeline. Tier 2+ runs `/plan` after spec/grill; all tiers run `/verify` after implement. The inline pre-save checklist is gone — `/verify` is the single source of truth for skill verification.
- Spec status lifecycle on skill creation extends to `draft → grilled → planned → approved → implemented → verified` so each phase boundary is auditable.
- `/spec` now emits a frontmatter contract (FR-01..FR-18 stable IDs, anchors per FR) so downstream `/plan` and `/verify` can reference requirements by anchor instead of line number.
- `/plan` v2: Phase 0 lockfile + backup, Phase 2 simulate-spec hook, Phase 4 hard task cap, blind-subagent review, skip-list and branch-strategy fields, "Done when" frontmatter contract, tier-aware templates.
- `/execute` v2: per-task `commit_cadence` (per-step / per-task / phase-end), new task frontmatter fields, back-compat with v1 plans.
- Cross-stack support added across `/plan`, `/execute`, `/spec`: shared stack preambles for Python (pytest/poetry/uv), Rails (rspec/minitest), Go, static-site, and Node variants. Skills now detect host stack and inline the right test/lint/build phrasing.
- CI lint scripts: `lint-stack-libraries.sh`, `lint-platform-strings.sh`, `lint-js-stack-preambles.sh` enforce cross-platform phrasing and prevent stack-specific drift in skill bodies.
- `/backlog` type enum extended with `enhancement`, `chore`, `docs`, `spike`; new heuristics auto-classify items at capture.
- Legacy commands pruned from the `/plan` body — fewer footguns, sharper guidance.
- Integration test fixtures and assert scripts shipped under `tests/fixtures/` so contributors can dry-run pipeline changes locally.

### References

- [`docs/pmos/features/2026-05-08_update-skills-add-plan-verify/02_spec.md`](features/2026-05-08_update-skills-add-plan-verify/02_spec.md) — /create-skill plan+verify spec
- [`docs/pmos/features/2026-05-08_update-skills-add-plan-verify/03_plan.md`](features/2026-05-08_update-skills-add-plan-verify/03_plan.md) — implementation plan
- [`plugins/pmos-toolkit/skills/create-skill/SKILL.md`](../../plugins/pmos-toolkit/skills/create-skill/SKILL.md) — updated /create-skill body
- [`plugins/pmos-toolkit/skills/plan/SKILL.md`](../../plugins/pmos-toolkit/skills/plan/SKILL.md) — /plan v2
- [`plugins/pmos-toolkit/skills/execute/SKILL.md`](../../plugins/pmos-toolkit/skills/execute/SKILL.md) — /execute v2
- [`plugins/pmos-toolkit/skills/_shared/stacks/`](../../plugins/pmos-toolkit/skills/_shared/stacks/) — cross-stack preambles
