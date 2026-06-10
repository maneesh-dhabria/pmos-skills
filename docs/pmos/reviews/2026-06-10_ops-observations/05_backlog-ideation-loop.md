# 05 — Backlog / ideation / execution-loop assessment

**Question (maintainer):** "I constantly define & shape ideas for new skills. Should backlog-building/grooming and execution/verification be two separate abstractions, atomic enough that I can run loops that pick execution items?"

**Verdict in one line:** The two-loop *abstraction* is right and ~80% of it already exists in `/backlog` + the pipeline-bridge + `/feature-sdlc --backlog`; what's missing is three small connectors (ideate→backlog capture, a deterministic `next` picker, and a route field), not two new skills.

---

## 1. Current-state map

### 1a. Capture side — what exists

**`/backlog`** (plugins/pmos-toolkit/skills/backlog/SKILL.md, 467 lines):

- **Schema** (backlog/schema.md:15–42): per-item markdown file at `backlog/items/{id}-{slug}.md` with frontmatter `id, title, type (8-enum: feature|enhancement|bug|tech-debt|chore|docs|idea|spike), status, priority (must|should|could|maybe), score (ICE 1–1000), labels, source, spec_doc, plan_doc, pr, parent, dependencies`. Body = three fixed H2s: `## Context`, `## Acceptance Criteria`, `## Notes` (schema.md:55–67). Title-only capture is valid (schema.md:69).
- **Statuses** (schema.md:41): `inbox → ready → spec'd → planned → in-progress → done | wontfix`. `ready` is set when `refine` runs on an `inbox` item (SKILL.md:275 "`status:` -> `ready` if currently `inbox`").
- **Capture contract** (SKILL.md:118): single round-trip, zero clarifying questions — "Wrong inference is acceptable; capture friction is not." This is the skill's best property; keep it.
- **Iterative refinement:** `refine <id>` (SKILL.md:246–280) is the only grooming surface. It IS re-runnable across sessions (it replaces the body each run, keeps frontmatter), so multi-session re-shaping *technically works* — but it is interactive-only, field-by-field (title/context/ACs/priority/score/labels), and has **no split support** (no "break this into two items"; `parent`/`dependencies` fields exist in the schema but no verb populates them except raw `set`), **no merge**, and **no way to attach a shaping artifact** other than stuffing a path into the free-string `source:`.

**`/ideate`** (plugins/pmos-toolkit/skills/ideate/SKILL.md):

- Produces a pressure-tested one-page brief at `docs/pmos/ideate/{date}_{slug}.html` (14 briefs exist there, 2026-05-13 → 2026-06-07).
- **The handoff is suggest-only.** Phase 7 (SKILL.md:190–198): "Print 1–3 candidate follow-up commands … The skill does NOT auto-invoke any of these. Promotion is explicit." For idea-type `new` it suggests `/requirements <slug>` + `/backlog add` — as *text in chat*. Anti-Pattern 6 (SKILL.md:258) explicitly forbids auto-promotion: "Auto-promotion floods /backlog with half-baked ideas; manual promotion preserves the bar. Suggest, don't dispatch."
- Net: if the maintainer doesn't act in that same session, the brief sits in `docs/pmos/ideate/` and the idea exists nowhere the execution side can see. **There is no field, no item, no link — the brief is orphaned by design.**

### 1b. The actual backlog data — evidence

Live store at `<repo>/backlog/` (the canonical per-repo location; `~/.pmos` holds no backlog):

- **9 items total, 8 open** (backlog/INDEX.md, "Last regenerated: 2026-05-23").
- **All 8 open items are status `inbox`. Zero `ready`. Zero ever promoted** — every `spec`/`plan`/`pr` column in INDEX.md is empty. `backlog/archive/` is empty (item 0003 is `done` since 2026-05-23 and now archive-eligible; never archived).
- **Staleness:** items captured 2026-05-12/13; last write to `backlog/` was 2026-05-23 (`git log -- backlog/`: `6254896`). ~4 weeks untouched as of today.
- **Content quality is fine when capture happens:** 0009 (backlog/items/0009-feature-sdlc-mid-flight-base-drift-gap.md) has rich Context, 4 checkbox ACs, Notes — genuinely execution-ready. The store isn't the problem; the *flows in and out* are.
- **Schema drift in live data:** 0003 carries `closed:` and `closed_reason:` fields that exist nowhere in schema.md:15–33 — an agent invented closing metadata because the schema has no closure-provenance fields. A signal that "how/why an item closed" is a real need the schema doesn't serve.
- **The control sample:** in the same 4 weeks the backlog sat frozen, **every major skill idea shipped via ideate→/skill-sdlc directly** (magazine output-UX, feed bundles, watch worker, frameworks v0.17/v0.18 — per docs/pmos/ideate/ timestamps and release history), touching the backlog zero times. The backlog has become a *defect log of things noticed mid-session*, not the idea store the maintainer wants.

### 1c. Execution side — what exists

The execution loop is **more complete than the maintainer may realize**:

- **Per-item linkage exists end-to-end.** `pipeline-bridge.md:9–17` defines the full lifecycle: `/requirements --backlog <id>` → sets `source:`; `/spec` → `spec_doc:` + status `spec'd`; `/plan` → `plan_doc:` + `planned` (plan/SKILL.md:539); `/execute` → `in-progress` (execute/SKILL.md:37); `/verify` pass → `done` + `pr:` (verify/SKILL.md:34). The `set` machine API is honored by 5 skills.
- **`/feature-sdlc` accepts `--backlog <id>` and forwards it to every child** (feature-sdlc/SKILL.md:5, :533 "Pass `--backlog <id>` through if it was given to `/feature-sdlc`"). So `/feature-sdlc skill --backlog 0009 <seed>` already runs the whole execute+verify+deploy loop against one item, with worktree isolation (Phase 0a) and the inlined non-interactive contract (SKILL.md:138+).
- **`/backlog promote <id>`** (SKILL.md:316–363) seeds a feature folder from the item (status-routed: `inbox`→/requirements, `ready`→/spec), refuses double-promotion, never clobbers an existing `01_requirements.md`.
- **What does NOT exist — the picker.** The only "offer me an item" surface is the pipeline-bridge auto-prompt (pipeline-bridge.md:19–38): top-5 by priority/score, fired **only** when `/requirements` or `/spec` is invoked with an *empty argument* — and `/feature-sdlc` always passes a seed to `/requirements`, so the prompt never fires inside the orchestrator the maintainer actually uses. It is also `AskUserQuestion`-interactive, so it can't drive an unattended loop. There is **no `next` verb, no deterministic selection contract, no `--json` read API.**
- **Closure seam:** `done` is set by `/verify` on pass — *before* `/complete-dev` merges/releases. **`/complete-dev` contains zero backlog references** (grep over complete-dev/SKILL.md: no hits). An item can read `done` while the work sits unmerged in a worktree; nothing records the release tag on the item.
- **No readiness semantics beyond `ready`.** `ready` currently means "refine ran once" (has ACs). There is no distinction between "shaped enough to discuss" and "groomed enough for an autonomous run to pick it" — and no way to record *how* it should be executed (skill-mode vs feature-mode vs lightweight).

### 1d. The quick-fix path

Ad-hoc plan+execute+verify (no pipeline) leaves **no trace anywhere**: backlog has no retro-capture affordance (`add` always creates `status: inbox`; marking done takes a second manual `set <id> status=done`), and nothing prompts for it. The only retro surfaces are `/verify`'s auto-capture of *deferred* work (verify/SKILL.md:35) and `/plan`'s (plan/SKILL.md:46) — both capture future work, not completed work, and both require having run the pipeline. **Assessment: mostly correct behavior** — not everything needs ceremony, and forcing tracked-ness on 5-minute fixes would violate the capture contract's spirit. The genuine gap is the absence of a *one-line* retro form (`/backlog add --done "<what>"`), so the changelog and the backlog disagree about what happened.

### 1e. Prior-review context

The 2026-06-10 skill-design review graded backlog **B-** and ideate **B-**. Relevant carry-overs: backlog's type-enum drift was fixed in the P0 batch (SKILL.md:207 now cites schema.md); per-skill/backlog.md finding 5 recommends collapsing `list/show/link/archive` into NL-routed handling while keeping `add`/`set`/`promote` deterministic (the P3 "mytasks/backlog NL-routing hybridization" item); per-skill/ideate.md finding 6 recommends shrinking ideate's flag surface. Any change here should ride those refactors, not fight them.

---

## 2. Gap analysis vs. the desired two-loop workflow

Loop A = capture → shape → groom → mark ready. Loop B = pick ready item → execute → verify → deploy → close.

| # | Gap | Severity | Evidence |
|---|---|---|---|
| G1 | **Ideate→backlog seam is open.** The brief is never captured as an item; `/backlog add` after ideate is a manual suggestion the data shows is never taken (0 of 14 briefs have a backlog item). | High — this is where skill ideas "go to die" (or get executed immediately to avoid dying) | ideate SKILL.md:194–198, :258; backlog data §1b |
| G2 | **No deterministic picker / loop driver.** Nothing answers "give me the next ready item" non-interactively; the auto-prompt is interactive and unreachable from /feature-sdlc. | High — blocks the entire Loop B-as-a-loop ambition | pipeline-bridge.md:19–38; feature-sdlc always-seeds /requirements |
| G3 | **`ready` is underspecified for autonomous execution.** No execution-route on the item (skill vs feature vs lite), so a driver can't know whether to invoke `/feature-sdlc skill --backlog id` or feature mode or a tier-1 pass. No "groomed" bar beyond refine-ran-once. | Medium-high | schema.md:41; SKILL.md:275 |
| G4 | **Grooming is interactive-only and can't split.** `refine` requires AskUserQuestion turn-taking; `parent`/`dependencies` have no verb; no non-interactive grooming for "agent, flesh out item 0007 from its context + the linked brief." | Medium | SKILL.md:246–280 |
| G5 | **Closure happens at the wrong stage and loses provenance.** `done` at /verify-pass, pre-merge; /complete-dev never writes back; live data already grew unofficial `closed:`/`closed_reason:` fields to compensate. | Medium | verify/SKILL.md:34; item 0003; complete-dev grep ∅ |
| G6 | **No retro capture for ad-hoc fixes.** Two-step manual dance to record completed unplanned work; in practice it isn't recorded. | Low | SKILL.md Phase 2 (always `status: inbox`) |
| G7 | **Grooming has no trigger.** Nothing ever resurfaces inbox items (the top-5 prompt fires on a path the maintainer never walks). 8 items, 4 weeks, zero touches. | Medium — this is the staleness mechanism | §1b; pipeline-bridge.md:21 |

## 3. Steelman of the status quo — and where it actually breaks

The strongest defense: **for a single maintainer with momentum, same-session ideate→skill-sdlc is strictly better than round-tripping through a tracker** — no state to groom, no staleness possible, the ideate brief *is* the grooming artifact and `/requirements` consumes it directly. The backlog then correctly holds only "not now" items. The data half-supports this: everything that shipped, shipped fine without the backlog.

Where it demonstrably breaks, in the maintainer's own experience:

1. **Ideas that arrive while a run is in flight have no atomic landing spot.** You can't start a second skill-sdlc; `/backlog add <one line>` loses the shaping; running /ideate produces a brief that G1 then orphans. The choice is "lose detail" or "lose the pointer."
2. **"Not now" silently becomes "never."** Zero of 8 inbox items advanced in a month (G7). The backlog is write-only because nothing in the maintainer's actual entry path (feature-sdlc) ever reads it.
3. **The execution loop can't self-feed.** Even with 0009 sitting there execution-ready in all but status, starting it requires the human to remember it exists, look up the id, and type the invocation (G2). That's exactly the "separate execution loop that picks items" the maintainer is asking for — and it's blocked by a missing ~30-line verb, not a missing skill.

So: the status quo is fine for the *happy path* and broken for exactly the two flows the maintainer named — atomic capture of shaped ideas, and a self-feeding execution loop.

## 4. Recommendation — extend three skills, add zero

**Do not build two new skills.** Loop A is `/ideate` + `/backlog` (capture+groom); Loop B is `/feature-sdlc --backlog` + the pipeline-bridge (execute+verify+close). Both loops exist as 80% machinery; close the seams:

### 4a. Capture seam — `/ideate` Phase 7 gains a confirmed backlog capture (~10 lines)

Replace the passive "suggest `/backlog add`" with one AskUserQuestion at handoff: *"Capture this as a backlog item? (Recommended)"*. On yes, invoke `/backlog add` with the brief's one-line summary, then `set <id> source=<brief-path>` and `set <id> type=idea|feature`. This preserves Anti-Pattern 6's bar (explicit confirmation, not auto-promotion — change :258's wording from "manual promotion" to "confirmed promotion") while making capture one keystroke instead of a context switch. The brief stops being orphaned: `source:` points at it, and `promote` Step 2 (SKILL.md:336–345) already inlines the body+source into the pipeline seed.

### 4b. Grooming home — `/backlog` gains `groom` semantics on the existing `refine` verb (~25 lines)

- **Non-interactive grooming:** under `--non-interactive` (the W14 contract is already inlined, SKILL.md:60–88), `refine <id>` drafts Context/ACs *from* the item's `source:` artifact and existing body instead of prompting, and logs the draft as an open question for review. This is the "agent, shape item 0007 overnight" surface.
- **Split:** `refine <id> --split` (or NL "split 0007 into …") writes child items with `parent:` set and ACs distributed — the schema fields already exist (schema.md:31–32); only the verb is missing.
- **Ready bar:** an item may be set `ready` only when it has ≥1 AC **and** a `route:` (below). One sentence in Phase 5 Step 3 and Phase 6 validation.

### 4c. Schema — two field additions, one formalization (schema.md)

- `route: skill | feature | lite` — how this item should be executed. Set during grooming; inferred default (`type` ∈ skill-ish labels → `skill`; `chore|docs|tech-debt` one-liners → `lite`).
- `released:` — tag or version, written by /complete-dev (4e).
- Formalize `closed_reason:` (the live data already invented it; cheaper to bless than to fight).

### 4d. Picker — `/backlog next` (~20 lines, the linchpin)

Deterministic selection: highest item by the existing sort (priority bucket → score desc → updated desc, SKILL.md:211) among `status: ready` items whose `dependencies` are all `done`. Flags: `--route <r>` filter, `--json` (emit the frontmatter + body for machine callers), `--claim` (atomically `set status=in-progress` on selection so concurrent loops don't double-pick). This is a machine API like `set` — keep it exact, exempt from the NL-routing collapse.

### 4e. Loop B driver — `/feature-sdlc --next-from-backlog` (~15 lines) + `/complete-dev` close (~5 lines)

- Phase 0: if `--next-from-backlog`, call `/backlog next --json [--route …]`; empty result → log `backlog: no ready items` and exit 0 (loop-safe). Otherwise set `--backlog <id>`, seed = item body, and dispatch by `route:` — `skill` → `pipeline_mode=skill-new/skill-feedback`, `feature` → feature mode, `lite` → `--minimal --tier 1`. Everything downstream (worktree, passthrough at :533, lifecycle write-backs) already works.
- `/complete-dev`: after the release tag lands, if a `--backlog <id>` rode the run, `set <id> released=<tag>` (and `closed_reason:` if wontfix-style closure). Leave /verify's `status=done` write where it is — moving it would break the existing bridge contract for non-releasing repos; `released:` is the stronger signal for this repo.
- **The nightly loop then needs zero new infrastructure:** `/loop 1d "/feature-sdlc --next-from-backlog --non-interactive"` (or a `schedule` routine). Worktree isolation: already default (Phase 0a). Non-interactive: already contractual, with open-questions flushed to the artifact. Verify gate: the item's ACs travel in the promote/next seed and land in `01_requirements.md`, which /spec→/verify already trace. The one *operational* caveat: a non-interactive skill-sdlc run ends at a release gate touching `main` — for unattended runs, configure the run to stop after /verify (`--minimal` honors hard phases; add "stop-before-complete-dev under non-interactive unless explicitly allowed" as a driver default) so the human reviews before merge.

### 4f. Retro capture — `/backlog add --done "<text>"` (~5 lines)

Creates the item with `status: done`, `closed_reason: ad-hoc`, today's dates. One line to make the ledger honest about quick fixes; deliberately nothing more.

### Migration cost

- **Code:** ~80 lines across 4 skills (backlog +45, ideate +10, feature-sdlc +15, complete-dev +5) + schema.md (+3 fields) + scenarios.md test rows. Each is a `/skill-sdlc --from-feedback` run; 4a+4b+4c+4d can be one run on /backlog+/ideate, 4e a second on the orchestrator pair. Bundle 4b/4d with the already-approved P3 NL-routing collapse (per-skill/backlog.md fix list, "structural") to pay the test-update tax once.
- **Data:** none. All 9 existing items remain valid (`route:` is optional-absent = ungroomed; 0003's invented fields become legal). No INDEX format change required (optionally add a `route` column).
- **Risk:** low. The only contract-sensitive surfaces are `set` (untouched) and `next` (new, additive). The one design decision needing care is `--claim` atomicity for concurrent loops — acceptable to defer (single maintainer, single loop) with a documented "one loop at a time" assumption.

## 5. Answer to the maintainer's question

Yes to the *two-loop mental model*; no to *two new abstractions*. The loops should be: **Loop A = /ideate ∘ /backlog (capture+groom, with the 4a/4b seams closed)** and **Loop B = /feature-sdlc --next-from-backlog ∘ pipeline-bridge (pick+execute+verify+close)**. The seam between them is exactly one bit of state — `status: ready` plus `route:` — which is the correct minimal interface: Loop A's only output is flipping that bit; Loop B's only input is reading it. That's the atomicity you asked for, achieved with ~80 lines of extension to skills you already trust.
