# Design Brief — `/shape`: collaborative problem-space exploration

**Date:** 2026-06-16
**Plugin:** pmos-toolkit
**Status:** Design locked; ready for `/skill-sdlc define`
**Author seed:** A thought-partner skill that probes the user like a seasoned product leader to *shape the problem* before any solution work begins.

---

## 1. Problem this skill solves

The user repeatedly arrives with a half-baked idea or a fuzzy sense of a problem (feature or skill) and wants a **collaborative thought-partner** to decompose and shape it by *probing with the right questions* — exploring the problem space, then narrowing to the right *shape* of the problem. None of the existing skills do this:

| Skill | Starts from | Mode | Lives in |
|---|---|---|---|
| `/requirements` Phase 3 | a problem you roughly know | gap-fill questions to populate a doc template | solution direction |
| `/ideate` | a framed idea | Frame (HMW+JTBD) → **generate** 8–15 variants → batch pressure-test | solution space |
| `/grill` | a *committed* artifact | one-question-at-a-time decision-tree interrogation | interrogating a candidate |
| `/creativity` | a committed direction | alternative angles | solution space |
| `/ripple-effects` | a *proposal* | "and then what" — external consequence tree (Futures Wheel); orthogonal, not a stage | downstream consequences |

Every one presumes the problem is known and pushes toward a solution/doc — **except `/grill`, which has the cadence the user loves but requires an existing candidate to attack.** Nobody co-explores the *problem itself*. This is a genuine missing primitive, confirmed against the problem-space / solution-space literature (SVPG, abstraction laddering, 5 Whys, Socratic questioning, How-Might-We reframing).

The user's own request was the meta-example: fuzzy sense → probed to decompose → narrowed to a sharp shape.

---

## 2. Decisions (all confirmed with the user)

| # | Decision | Choice |
|---|---|---|
| D1 | New skill vs. evolve existing | **New skill** → feeds `/requirements`. Keeps `/requirements`' "a spec author could write the spec" acid test clean; mirrors how `/ideate` hands off. |
| D2 | Terminal scope | **Problem-only, hard handoff.** Solutions explicitly out of scope. This discipline is the reason to exist (vs `/ideate`). |
| D3 | Questioning cadence | **Hybrid:** `/grill`'s one-question-per-turn rhythm, seeded by `/ideate`'s HMW+JTBD frame. Recommended answers ONLY on convergence moves; open probing (no recommended answer) on exploration moves (laddering, reframing) so the skill doesn't think *for* the user. Divergent early, convergent late. |
| D4 | Output & handoff | **Single commentable problem-brief HTML artifact** rendering the full lens ledger → handoff suggestions to `/requirements`, `/ideate`, `/backlog`, optional `/ripple-effects`. |
| D5 | Context-gate persistence | Read workstream → else `.pmos/settings.yaml` → confirm-once only when absent / doc-seeded / conflicting → persist. Never re-ask per run. **What persists = the *classification* (side-project / feature / new-bet / internal), not the answers.** Precedence: workstream signal > `settings.yaml`. A "conflict" = a fresh signal that contradicts the persisted classification (e.g. workstream now says new-bet but settings say side-project) → re-confirm once and overwrite. Correction path: a later run whose signal conflicts triggers the same confirm-once, so a wrong classification self-heals on the next divergent run. |
| D6 | `/ripple-effects` in problem shaping | **Fold the spirit, not the machinery.** Lens 5 absorbs a lightweight "and then what" at problem altitude; REFRAME adds ripple-on-the-framing; full `/ripple-effects` is a handoff suggestion. Keeps ripple orthogonal per its charter. |
| D7 | Solution-shaping (the symmetric question) | **Extract the lens architecture as shared substrate; no twin skill yet.** Solution shaping is *fragmented* across `/ideate` + `/requirements` + `/grill` + `/ripple` — not absent like the problem gap. Reuse the PATTERN later inside those if dogfooding proves a real gap; do not duplicate the machinery or add a 5th colliding front-end skill. |
| D8 | Pipeline placement | **`/shape` becomes the gated Phase-1 front of `/feature-sdlc`** (before `/ideate` + `/requirements`). `/ideate` becomes the solution-exploration step and **consumes `/shape`'s HMW+JTBD frame** instead of re-deriving it. **Additive + version-gated** (no breaking change): the phase is inserted additively and the state `schema_version` bumps; resume states lacking the phase skip it, so in-flight worktrees / existing epics keep the old order. |
| D9 | Gating posture | **Tier 1 → auto-skip. Tier 2 → mandatory. Tier 3 / new-bet → mandatory.** Always available standalone (like `/grill`, `/ripple`). The context classifier from D5 also feeds this gate. |
| D10 | Non-interactive degradation (the W14 contract) | `/shape` is fundamentally interactive (one-question-per-turn), so under `--non-interactive` the mandatory Tier-2/3 gate **does not deadlock and does not hard-refuse.** Instead `/shape` runs an **autonomous best-effort shaping**: parallel lens subagents draft each applicable lens's disposition from the seed + workstream + research, a **reviewer subagent applies seasoned-leader judgement** to converge the framing and run the ceiling-breaker, and the brief is written with assumptions recorded and unresolved items logged as **Open questions**. It escalates to an explicit prompt **only** for a *major* gap that genuinely blocks a defensible problem statement (expected rare); everything else becomes an assumption-or-open-question and the pipeline proceeds. This is the canonical non-interactive path, not a skip. |

---

## 3. Skill shape

**Charter (one line):** Turn a half-formed sense of a problem into a sharply shaped problem via seasoned-product-leader probing, then hand off. Produces no solutions.

**Spine (divergent early → convergent late):**

```
/shape <fuzzy thought>
  ─▶ CONTEXT-GATE  classify side-project / feature-in-product / new-bet / internal
                   (read persisted → confirm-once if absent/conflicting → persist)
  ─▶ FRAME         one-pass HMW + JTBD + "felt problem" (borrowed from /ideate's framing)
  ─▶ LADDER        abstraction laddering — climb "why" / descend "how" to find the right
                   altitude; 5-Whys when the seed is a symptom, not a root cause
  ─▶ DECOMPOSE     break into sub-problems; mark which is the real one
  ─▶ REFRAME       surface 2–3 competing framings (diverge); ripple-on-the-framing —
                   "if framed as X vs Y, what does each set in motion downstream?"
  ─▶ CONVERGE      narrow to the sharpest 1–2 problem statement(s) + who/when/why-now
                   (mandatory ceiling-breaker meta-probe fires here — see §5)
  ─▶ WRITE         one commentable problem-brief HTML artifact (full lens ledger)
  ─▶ HANDOFF       suggest /requirements · /ideate · /backlog · optional /ripple-effects
```

**Interaction model:** `/grill` cadence — one `AskUserQuestion` per turn, branch on the answer, walk by leverage, never batch. Adaptive answer style per D3.

---

## 4. The lens deck (the floor)

Lives in `reference/problem-lenses.md`. Six lenses, each tagged with an applicability test (the side-project nuance). These are the **floor** — minimum coverage — not a script.

| Lens | Sharpened probes | Applies as floor when… |
|---|---|---|
| **1. Customer & pain** | Can you name the segment crisply enough to picture 3 real people in it? Which pain is #1 — and why does it beat #2? Is your evidence *observed* (talked to someone / saw data) or *assumed*? Motivation/friction/satisfaction around the pain. | Always — even a side project has a user (often you). |
| **2. Problem framing & hypothesis** | Symptom or root cause? Whose problem is it *really* — user, business, or your own itch? What competing framings did you reject? State as a **falsifiable hypothesis**: "If we solve X, then Y observably changes." | Always. |
| **3. Success & guardrails** | How would you *know* it's solved — leading + lagging signal? What's the **counter-metric** that tells you you've made something else worse? | Floor for products; downshifts to "what would 'good enough' feel like?" for a side project. |
| **4. Strategy & fit** | Why *this* problem now vs. everything else? How does it serve the product's ambition / right to win? Does solving it pull you off-strategy? | Floor for products; N/A or one-line "does this fit what I want this to be?" for a side project. |
| **5. Risks, urgency & reversibility** | Biggest risk in solving it. Cost of *not* solving it now — urgency, cost of delay (the "and then what" of inaction). One-way or two-way door / cost of being wrong? | Always — depth scales with stakes. |
| **6. Constraints & dependencies** | Hard constraints that *shape* the problem (legal, brand, a team you depend on, a deadline). Who else must care for this to matter? | Surfaced when signals appear; not asked reflexively. |

**Downshift matrix (all four context buckets).** The "applies as floor when…" column above is the per-lens rule; this is the full matrix the context gate applies — `F` = full floor, `↓` = downshifted (lightweight one-liner), `N/A` = drop unless a signal forces it, `sig` = surfaced only on a signal:

| Lens | side-project | feature-in-product | new-bet | internal-tool |
|---|---|---|---|---|
| 1 Customer & pain | F (user = often you) | F | F (at depth) | F (the internal user) |
| 2 Framing & hypothesis | F | F | F | F |
| 3 Success & guardrails | ↓ ("good enough?") | F | F (at depth) | ↓ (adoption-only) |
| 4 Strategy & fit | N/A | F | F (at depth) | ↓ ("worth the team's time?") |
| 5 Risks/urgency/reversibility | ↓ (light) | F | F (at depth) | ↓ |
| 6 Constraints & dependencies | sig | sig | F (at depth) | F (often dependency-heavy) |

---

## 5. Floor-not-ceiling architecture — the "lens ledger"

Extracted to shared substrate **`_shared/lens-ledger.md`** (so a future solution deck can adopt it without duplicating machinery, per D7). Three mechanisms:

1. **Floor = disposition, not interrogation.** Terminal state requires every *applicable* lens in one of four states — **Answered / Parked (out-of-scope, with reason) / Open question / N/A-for-context**. "Answered" often comes from what the user already said or from research, not a fresh question. (Reuses the repo's `findings-dispositions` discipline.) → makes it a floor without making it an interrogation.

2. **Ceiling-breaker = mandatory meta-probe.** Before CONVERGE, the model (acting as the seasoned leader) MUST surface ≥1 problem-specific probe *not* in the deck and justify why it matters here. Plus an **adaptive-lens rule**: treat the deck as the starting hand; spin up a problem-specific lens when signals appear (regulatory, ethical, technical-feasibility-as-constraint, network-effects, hard dependency). → structurally forces beyond the list every run. (Mirrors `/critical-thinking`, which grades on reasoning moves.) **Escape (anti–manufactured-probe):** if no genuine off-deck dimension exists, the model may instead record an explicit one-line attestation — *"deck sufficient for this problem because …"* — rather than fabricate a low-value probe. Forcing a hollow question would itself be the checklist anti-pattern, inverted; the eval accepts either a real off-deck probe **or** a justified sufficiency attestation.

3. **Context gate = the side-project nuance.** Classify context first; each lens's applicability test downshifts or drops it. → a one-off never gets grilled on strategic positioning; a new bet gets all six at depth. (Same shape as `/requirements`' tiering, applied to *problem context* instead of *scope*.)

**Transparency forcing-function:** the problem-brief artifact renders the **full lens ledger** — every lens with its disposition, including N/A and Parked-with-reason — so a missing dimension is *visible* rather than silently absent.

**Non-interactive path (D10):** under `--non-interactive` the same three mechanisms run **autonomously** — parallel lens subagents draft each applicable lens's disposition, a reviewer subagent applies seasoned-leader judgement to converge + run the ceiling-breaker, and unresolved lenses land as **Open question** dispositions (not skipped). Only a *major* blocking gap escalates to a prompt. The lens ledger is the same artifact; the difference is who fills it.

**Operational problem/solution boundary (makes anti-pattern #1 enforceable).** "Shaping the solution" is not a vibe — it's testable: a statement is **solution-shaped** if it names a *mechanism, feature, or implementation* ("add a button that…", "use a queue"); it is **problem-shaped** if it names a *felt outcome + who + when* ("user X can't accomplish Y at moment Z, and it costs them W"). `/shape`'s terminal brief must contain only problem-shaped statements; framings in REFRAME are admissible only as *lenses on the problem*, not solution commitments.

**skill-eval deltas:** (1) one check that rewards surfacing ≥1 off-deck dimension **or** a justified sufficiency attestation — enforces the ceiling-breaker, not just the floor; (2) one check that fails the brief if any terminal problem statement is solution-shaped per the operational test above.

---

## 6. Where things physically live

- `plugins/pmos-toolkit/skills/shape/SKILL.md` — body carries only the mechanisms (floor-disposition gate · mandatory ceiling-breaker · context gate) and cites the deck as "the floor."
- `plugins/pmos-toolkit/skills/shape/reference/problem-lenses.md` — the lens deck (§4).
- `plugins/pmos-toolkit/skills/_shared/lens-ledger.md` — the reusable floor/ceiling/context-gate mechanism (§5).
- `plugins/pmos-toolkit/skills/shape/reference/artifact-template.html` — problem-brief template (lens ledger + HMW/JTBD/decomposition/framings/chosen-framing/open-questions).

---

## 7. Epic scope (multi-story)

This spans 3 surfaces — it is an epic, not a single skill drop:

1. **`/shape` skill + `_shared/lens-ledger.md` substrate** — new SKILL.md + lens-deck reference + artifact template + context-gate persistence + comment-resolver shim/tests + non-interactive block, **and** the `_shared/lens-ledger.md` mechanism file in the same surface. *One surface owns both so the file and its cite ship together — this closes the dangling-cite bootstrap gap (no consumer references a substrate file that doesn't yet exist).* Both live in pmos-toolkit's canonical home, so the cross-plugin `sync-shared.sh` bootstrap gap does not apply here; cross-plugin sync (if a consumer plugin ever needs it) follows `sync-shared.sh` rules.
2. **`/feature-sdlc` rewiring** — `/shape` as gated Phase-1 front (Tier 1 skip, Tier 2 + Tier 3 mandatory); update the pipeline diagram + gate table. **Additive + version-gated:** the new phase is inserted additively and the state `schema_version` is bumped — resume states that predate it skip it (back-compat by absence), so in-flight worktrees and already-defined epics are unaffected; only fresh runs get the gate. No migration step.
3. **`/ideate` frame-dedup** — `/ideate`'s Frame phase consumes `/shape`'s HMW+JTBD brief when present instead of re-deriving.

**Explicitly deferred:** a symmetric solution-shaping skill (per D7). The lens-ledger substrate is built to be reused there *if* dogfooding shows `/ideate`+`/requirements`+`/grill`+`/ripple` are genuinely insufficient.

---

## 8. Naming

Candidates: `/shape` (primary) · `/frame` · `/unpack`. Resolved to **`/shape`** during define. **Known tension (grill nit):** "shape" overlaps Basecamp's *Shape Up*, which connotes solution-shaping — the opposite of this skill's problem-only charter (D2). Accepted: the charter line, anti-pattern #1, and the operational boundary (§5) make the problem-only intent explicit in-skill, and `/shape` reads better as a verb for the cadence than `/frame`/`/unpack`. Recorded so the naming choice is deliberate, not accidental.

---

## 9. Anti-patterns (carry into the skill)

1. **Shaping the solution.** Terminal state is a shaped *problem*. Surfacing solution options collapses into `/ideate`'s job.
2. **Treating the lens deck as a checklist/ceiling.** The deck is the floor; the ceiling-breaker meta-probe is mandatory every run.
3. **Over-asking on a side project.** The context gate must downshift/drop lenses — don't grill a weekend project on strategic positioning.
4. **Re-asking persisted context.** Read → use silently if unambiguous → confirm-once only on absent/doc-seeded/conflicting.
5. **Acting like `/grill` (pure interrogation) or `/ideate` (batch generation).** `/shape` *co-builds* the framing turn-by-turn; it neither attacks a committed artifact nor fans out solution variants.
