# Interface design: is a /pmos-toolkit mega-router worth pursuing?

**Date:** 2026-06-10 · **Question:** with 40 skills across 3 plugins, how do we reduce cognitive load for users who aren't command-style natives? Is a single mega skill with a resolver that routes (or orchestrates) the right skill(s) far-fetched?

**Verdict up front: do not pursue the mega-router as a routing layer. Pursue a lightweight `/pmos` discovery-and-concierge skill (drift-free by construction, additive, ~70 lines) plus description-tuning of the six real ambiguity clusters.** The router's two genuine benefits — discovery and clarify-then-route — survive in the concierge at a fraction of the cost; everything else the router would do either already exists (NL auto-triggering, `/feature-sdlc` orchestration) or recreates this repo's #1 documented disease (facts stated twice, drifted once).

---

## 1. The quantified surface

| Plugin | User-invocable skills | Quoted trigger phrases | Description chars |
|---|---|---|---|
| pmos-toolkit | 32 | 197 | ~18,300 |
| pmos-learnkit | 6 | 52 | ~5,300 |
| pmos-utilities | 2 | 10 | ~1,000 |
| **Total** | **40** | **259** | **~24,600 (≈6k tokens, loaded into every session)** |

Description lengths: median ≈ 480 chars; 8 skills exceed 800 chars (feature-sdlc 1,379; wireframes 1,012; magazine 1,007; ideate 990; frameworks 984; prototype 916; survey-analyse 861; diagram 830). All 40 carry `argument-hint`s. Every skill is technically user-invocable, but roughly a third are *pipeline-interior* (msf-wf, simulate-spec, plan, execute, verify, comments, product-context) — a user rarely needs to discover them cold; the orchestrators call them.

### Verbatim trigger collisions (mechanical scan of all 259 quoted phrases)

Only **7** exact duplicates exist, and **6 are deliberate alias seams** (skill-sdlc and prototype-sdlc intentionally mirror feature-sdlc phrases — the thin-alias pattern the prior review graded A). Exactly **one is a genuine bug**:

> `"I have a half-formed idea"` appears verbatim in **both `/ideate` and `/feature-sdlc`**. These do very different things (15-minute brief vs full pipeline-to-ship in a worktree). This phrase should be removed from feature-sdlc — ideate owns the fuzzy-idea moment, and its brief is the natural feature-sdlc input.

### Semantic ambiguity clusters (the real cognitive-load cost)

The collisions that matter aren't verbatim — they're plausible-NL overlaps where the disambiguator is something the user doesn't have in mind (artifact stage, output shape, pipeline membership):

| # | Cluster | Colliding phrases (verbatim from descriptions) | Hidden disambiguator |
|---|---|---|---|
| 1 | **ideate ↔ requirements ↔ creativity ↔ feature-sdlc** | "help me brainstorm this idea" (ideate) / "let's brainstorm", "what should we build" (requirements) / "what should we build to solve Y" (ideate) / "think outside the box" (creativity) / "I want to brainstorm this end-to-end" (feature-sdlc) | How fuzzy the idea is, and whether the user wants a brief, a formal req doc, divergence techniques, or the whole pipeline. The single most common PM utterance ("brainstorm") routes 4 ways. |
| 2 | **grill ↔ ideate ↔ simulate-spec** | "stress-test this plan" (grill) vs "stress-test this idea" (ideate); "poke holes in my design" (grill) vs "poke holes in this idea before I write it up" (ideate); "pressure-test this concept" (ideate) vs simulate-spec's "Pressure-test a spec" | Stage of the artifact (idea / committed doc / spec) and modality (grill interviews *you*; simulate-spec traces scenarios with no interview). |
| 3 | **design-crit ↔ msf-wf ↔ msf-req** | "review the wireframes", "UX review" (design-crit) vs "evaluate the wireframes", "wireframe UX evaluation" (msf-wf); "will the proposed solution work for users" (msf-req) is a plain-English ask that fits all three | Heuristic crit of any running UI vs persona-grounded MSF/PSYCH eval of pipeline-generated artifacts; req-doc vs wireframe input. |
| 4 | **wireframes ↔ prototype** | "mock up the UI" (wireframes) vs "high-fi mockup" (prototype) | "Mockup" is fidelity-ambiguous; the real split is static screens vs walkable journeys. |
| 5 | **polish ↔ readme ↔ artifact** | polish's description explicitly lists "README" in its clean-up targets ("clean up a PRD/blog/README/email") while `/readme` owns "fix my README"; "critique my writing" (polish) vs artifact's reviewer loop | Structure/rubric work (readme) vs prose voice (polish) — readme even delegates voice to polish, but a user can't know that. |
| 6 | **primer ↔ learn-list** | "ramp me up on Y" (primer) vs "get me smart on this topic fast" (learn-list) | Output shape: teachable essay vs curated link list. User asking "help me learn X" has no shape preference yet. |
| 7 | backlog ↔ mytasks ↔ ideate | "capture this idea" (backlog) vs "add a task" (mytasks) vs ideate's idea-shaping; "track this bug" vs personal tasks | Repo-scoped work items vs `~/.pmos` personal tasks. (Prior review already queued "mytasks/backlog NL-routing hybridization" as P3.) |
| 8 | verify ↔ built-in code-review | "check my work", "review and test everything" (verify) vs the harness-native `/code-review` and `/review` | Whole-gate (lint+test+deploy+QA) vs diff review. Outside pmos's control but real in shared sessions. |

One **positive pattern already in the repo**: session-log's description ends with "Distinct from /reflect, which critiques the tools and skills you used; session-log records the work itself." That one sentence is per-skill router tuning. Only session-log does it.

### Transcript evidence

Searched 939 transcripts from the last 15 days for "which skill", "wrong skill", "actually use /X", "instead of /X" redirects: **zero hits**. Interpretation: the maintainer is a command-style power user who types explicit slash commands, so auto-trigger ambiguity never bites *him*. The cognitive-load problem is prospective — it concerns the hypothesized non-command user, for whom no evidence of failure exists yet either way. This caps how much investment the problem currently justifies.

---

## 2. How routing already works — and what a mega-router would actually add

**The platform already ships an NL router.** Every installed skill's `name` + `description` is loaded into the model's context at session start (observable in any session's available-skills list), and the model auto-invokes the best match from natural language. The 259 trigger phrases and 24.6k description chars *are* the routing table, and decision #4 from the 2026-06-10 review ("NL-first with flags as sugar") already commits every skill to honoring natural-language invocation. A `/pmos-toolkit` mega-router would be a second router stacked on the first.

### Honest cost accounting

1. **Drift is not a risk; it is a certainty.** A router needs a decision table mapping intents → 32 skills. That table is the skill list *stated a second time* — the exact disease behind the ~35 verified defects in the prior audit ("facts stated in two places with no lint binding them"). The catalog changed 4 times in the last month alone (frameworks v0.17→0.18, magazine 0.13→0.15). The router's table would be stale within weeks, and stale routing fails *silently* — the worst failure class this repo knows.
2. **The repo already ran this experiment at 1/8 scale and it failed.** feature-sdlc's token-1 dispatch grammar — a 4-mode router (`<idea>` / `skill` / `prototype` / `list`) — "caused three real mis-dispatch bugs at the alias seam" (prior report, finding #4). A 32-target router multiplies that surface by 8.
3. **Double dispatch on every call.** User NL → router skill loads (+its body tokens) → router reasons → target skill loads → work begins. Today's path is one hop. For the 80%-case power user this is pure tax.
4. **Argument-hint loss.** Per-skill `argument-hint`s (all 40 have them) surface at the slash prompt; behind a router they're invisible until after dispatch.
5. **"Orchestrating multiple skills on the fly" already has an owner.** `/feature-sdlc` (and `/prototype-sdlc`) exist precisely because ad-hoc multi-skill chaining needs state schemas, worktrees, resume semantics, tier gates, and drift checks. A router improvising pipelines per-request would be feature-sdlc without any of its safety engineering — re-deriving, badly, what was built deliberately. If a new recurring chain emerges, the answer is a new thin orchestrator mode, not on-the-fly composition.
6. **It doesn't even reduce context load.** The 40 descriptions stay loaded regardless (hiding them would break direct slash invocation and NL auto-triggering for everyone). The router *adds* its own description + body on top.

### The steelman — what's genuinely missing today

- **Discovery has no in-session surface.** "What can pmos do for me?" has no answer inside a session. The README's "What do you want to do?" table is good but (a) out-of-session, (b) hand-maintained — already a drift surface (it lists 15-ish rows for 40 skills).
- **Auto-triggering is silent and confident.** When a request lands in cluster #1 or #2 above, the platform router picks *one* skill without telling the user there were three candidates. A clarify-then-route step ("is this a fuzzy idea or are you ready to write requirements?") is something raw auto-triggering cannot do.
- **A single memorable entry point** matters for exactly one persona: a new or non-command user, or a teammate on a shared install. `/pmos` is learnable in one telling; 40 names are not.

These three benefits are real. None of them requires the router to *own routing* — they require a **concierge that knows the catalog and hands off**.

---

## 3. Alternatives, graded

| Option | Drift surface | Latency | Discoverability (non-command users) | Maintenance | Verdict |
|---|---|---|---|---|---|
| (a) Status quo + description tuning (fix the 8 clusters with boundary sentences, remove the 1 verbatim collision) | None — descriptions are single-source | Zero | Unchanged (poor) | One-time edit + skill-eval already lints descriptions | **Do regardless; necessary, not sufficient** |
| (b) Lightweight `/pmos` concierge — reads the live catalog at runtime, asks ≤2 questions, **invokes** the chosen skill via the Skill tool | ~Zero — no hardcoded table; routes off live frontmatter | 1 extra hop, *only when explicitly invoked*; normal routing untouched | High — answers "what can pmos do" in-session; clarify-then-route on ambiguity | One small skill (~70 lines), no state, no scripts required | **Recommended** |
| (c) Generated catalog doc — script derives a menu (name, one-liner, top triggers, pipeline position) from frontmatter; replaces the hand-maintained README table | None if generated (regen in `/complete-dev` or a lint asserts freshness) | Zero | Medium — still out-of-session, but now trustworthy | ~40-line script | **Do as a byproduct of (b)** — the concierge's Phase 1 parser *is* this script |
| (d) Consolidation to reduce N | Reduces total surface | Zero | Mild — 40→~36 doesn't change the qualitative problem | High — each merge is a /skill-sdlc run + migration | **Opportunistic only.** Real candidates: msf-req+msf-wf → `/msf <doc>` (same MSF substrate, input-type dispatch); survey-design+survey-analyse → `/survey design\|analyse`; fold creativity into ideate as an opt-in technique pass (creativity graded C, write-side already stale). Non-candidates: the thin aliases (they're cheap and A-grade); session-log/changelog/reflect (different audiences). |
| (e) Mega-router `/pmos-toolkit` owning all dispatch | **Worst** — a 32-row decision table = the facts-twice disease at maximum scale; silent staleness | Double dispatch on **every** call | High | Highest — table must track every skill add/rename/retire; the repo's own 4-mode router already shipped 3 mis-dispatch bugs | **Rejected** |

---

## 4. Recommended posture

**Layered, additive, drift-free:**

1. **P0 (description tuning, one PR):**
   - Delete `"I have a half-formed idea"` from feature-sdlc's description (ideate owns it; feature-sdlc keeps its "end-to-end" qualified phrases).
   - Add one boundary sentence — the session-log pattern — to each side of clusters 1–7. Drafts:
     - ideate: "Distinct from /requirements, which writes the formal doc — run /ideate first when the idea isn't yet worth a document."
     - grill: "Distinct from /simulate-spec — /grill interviews *you* about any committed doc; /simulate-spec traces a spec against scenarios with no interview."
     - design-crit: "Distinct from /msf-wf, which runs persona-grounded MSF/PSYCH evaluation of pipeline-generated wireframes; /design-crit is a heuristic crit of any existing UI."
     - polish: drop "README" from its target list, replace with "…or run /readme first for README structure; /polish owns prose voice."
     - primer: "Produces a teachable essay — for a curated list of external links instead, use /learn-list." (and the mirror in learn-list)
     - wireframes/prototype: anchor on "static screens" vs "walkable clickable journeys" rather than the fidelity-ambiguous "mockup".
   - These sentences are cheap (~1 line × ~12 skills), single-sourced, and improve the *platform* router directly.
2. **P1 (the `/pmos` concierge):** design sketch below.
3. **Skip:** the mega-router (rejected per §2/§3) and bulk consolidation (do msf merge and survey merge only when those skills are next touched anyway).

---

## 5. Design sketch — `/pmos` discovery-and-concierge skill

**Home:** `plugins/pmos-utilities/skills/pmos/SKILL.md`. It is cross-plugin meta-tooling, exactly like `/reflect` — pmos-utilities' charter ("maintain my environment") already holds the precedent. Slash surface: `/pmos`.

**The one inviolable rule (the skill, in one sentence):** *The concierge never names a pmos skill in its own body and never reimplements one — it reads the live catalog at runtime, asks at most two questions, and hands off verbatim via a Skill-tool invocation.* This is what makes it immune to the facts-twice disease: the only routing table is the frontmatter that already exists.

**Frontmatter:**

```yaml
---
name: pmos
description: Catalog concierge for all installed pmos plugins — shows what pmos
  can do, helps pick the right skill when you're not sure, then invokes it with
  your request. Knows nothing the live skill catalog doesn't; reads it fresh
  every run. Use ONLY for meta-requests about the toolkit itself — when the user
  says "/pmos", "what can pmos do", "which pmos skill should I use", "show me
  the pmos menu", "is there a skill for this", "help me get started with pmos",
  or "I don't know which command to use". Do NOT trigger on domain requests
  (brainstorming, reviews, docs, learning) — those route directly to the
  matching skill as usual.
user-invocable: true
argument-hint: "[goal description | browse]"
---
```

The "Use ONLY for meta-requests / Do NOT trigger on domain requests" clause is load-bearing: without it the concierge becomes a 41st collider in every cluster it was built to disambiguate.

**Phases:**

- **Phase 1 — Read the live catalog.** Glob the installed plugins' skill dirs (`~/.claude/plugins/**/pmos-*/skills/*/SKILL.md` for marketplace installs; `plugins/pmos-*/skills/*/SKILL.md` when run inside this repo) and parse frontmatter `name` + `description` + `argument-hint`. Fallback: if no path is readable, use the skill list already present in session context. Optional ~40-line zero-dep parser script (`scripts/read-catalog.sh` emitting JSON) — which doubles as the generator for option (c)'s catalog doc. *No catalog content is ever stored in the skill.*
- **Phase 2 — Mode split on the argument.**
  - `browse` / empty: render a grouped menu — group 1 by plugin charter (ship a feature / learn a topic / maintain environment), group 2 within toolkit by "pipeline stage" vs "standalone utility" (derivable from the descriptions' own "First/Second/Third stage…" / "Standalone utility" sentences — another fact already single-sourced). One line per skill: name, ≤12-word gist, argument-hint.
  - goal text: match the goal against descriptions. **Exactly one strong match →** confirm in one line and dispatch. **2+ plausible matches (the ambiguity clusters) →** one `AskUserQuestion` listing the candidates with each one's discriminator (stage of artifact: raw idea / req doc / spec / built thing; output shape: doc / screens / list) and a `(Recommended)` default. **Zero matches →** say so honestly, show the nearest group from the menu, and offer `/backlog add` for "pmos should have a skill for this".
- **Phase 3 — Dispatch.** Invoke the chosen skill via the Skill tool with the user's original request passed verbatim as args — exactly the skill-sdlc thin-alias pattern (graded A in the prior review: "18 lines, zero duplication"). The concierge adds nothing, rewrites nothing, and ends its involvement at handoff. Never chains multiple skills — if the goal needs a pipeline, the catalog match will be `/feature-sdlc` or `/prototype-sdlc`, which own orchestration.
- **Non-interactive contract:** under `--non-interactive`, never prompt — dispatch the single best match if one exists, else print the menu and exit 0. Carries the canonical inline non-interactive block per W14 posture (extending the lint to pmos-utilities is already on the prior review's P3 list).

**Size budget:** ≤80 lines of SKILL.md + optional 40-line parser. No state files, no reference dir, no subagents.

**Why it dodges every router cost:** no decision table (drift = 0); invoked only on demand (latency tax = 0 for power users); platform auto-routing untouched (slash commands and NL triggers work exactly as today); orchestration untouched (it dispatches *to* orchestrators, never around them); and its maintenance cost is constant in N — adding skill #41 requires zero edits to `/pmos`.

---

## 6. Answer to the maintainer's question, directly

The mega-router instinct is *half* right. The half that's right: discovery and clarify-on-ambiguity are genuinely missing, and a single memorable `/pmos` entry point is the correct fix for the non-command persona. The half that's wrong: making it own routing or on-the-fly orchestration. The platform's description-based NL router already does dispatch (and decision #4 doubled down on it); `/feature-sdlc` already does orchestration with the state machinery ad-hoc chaining lacks; and a hand-maintained 32-way decision table is a monoculture of the exact bug class the 2026-06-10 audit spent its #1 finding on. Build the concierge that *reads* the catalog instead of the router that *restates* it.
