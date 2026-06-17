# Problem Lenses — the `/shape` deck (the floor)

- [The six lenses](#the-six-lenses)
- [Downshift matrix — the four context buckets](#downshift-matrix)
- [How the gate uses this deck](#how-the-gate-uses-this-deck)

This is `/shape`'s concrete **deck**: the minimum set of dimensions a shaped problem should have a *disposition* on. It is the **floor, not a script and not a ceiling** — the floor/ceiling/context-gate *mechanism* lives in `_shared/lens-ledger.md`; this file supplies only the per-skill deltas (the lenses, their probes, their applicability tests, and the downshift matrix). Read the mechanism doc for *how* a lens reaches a disposition (Answered / Parked-with-reason / Open question / N/A-for-context), for the mandatory ceiling-breaker, and for the autonomous non-interactive variant. A lens here is never "asked because it is on the list" — it is dispositioned because it is *applicable*.

## The six lenses {#the-six-lenses}

Each lens carries an **applicability test** — the "applies as floor when…" column. The context gate (below) turns that test into a per-bucket downshift. Probes are *seeds for the seasoned-leader probing cadence*, not a questionnaire to read aloud; pick the one that has leverage given what the user has already said.

### Lens 1 — Customer & pain
- **Probes:** Can you name the segment crisply enough to picture 3 real people in it? Which pain is #1 — and *why* does it beat #2? Is your evidence *observed* (talked to someone, saw data) or *assumed*? What's the motivation / friction / satisfaction around the pain?
- **Applies as floor when:** **Always** — even a side project has a user (often you).

### Lens 2 — Problem framing & hypothesis
- **Probes:** Symptom or root cause? Whose problem is it *really* — the user's, the business's, or your own itch? What competing framings did you reject? State it as a **falsifiable hypothesis**: "If we solve X, then Y observably changes."
- **Applies as floor when:** **Always.**

### Lens 3 — Success & guardrails
- **Probes:** How would you *know* it's solved — a leading **and** a lagging signal? What's the **counter-metric** that tells you you've made something else worse?
- **Applies as floor when:** Floor for products; **downshifts** to "what would 'good enough' feel like?" for a side project.

### Lens 4 — Strategy & fit
- **Probes:** Why *this* problem now, versus everything else? How does it serve the product's ambition / right to win? Does solving it pull you *off*-strategy?
- **Applies as floor when:** Floor for products; **N/A** or a one-line "does this fit what I want this to be?" for a side project.

### Lens 5 — Risks, urgency & reversibility
- **Probes:** Biggest risk in *solving* it. Cost of *not* solving it now — urgency, cost of delay (the "and then what" of inaction). One-way or two-way door — what's the cost of being wrong? *(This lens folds the spirit of `/ripple-effects` at problem altitude per design D6; the full consequence tree stays a handoff suggestion, not a stage.)*
- **Applies as floor when:** **Always** — depth scales with stakes.

### Lens 6 — Constraints & dependencies
- **Probes:** Hard constraints that *shape* the problem (legal, brand, a team you depend on, a deadline). Who else must care for this to matter?
- **Applies as floor when:** **Surfaced when signals appear** — not asked reflexively.

## Downshift matrix — the four context buckets {#downshift-matrix}

The context gate **classifies first** (side-project / feature-in-product / new-bet / internal-tool), then applies this matrix per lens. Legend: `F` = full floor, `↓` = downshifted (lightweight one-liner), `N/A` = drop unless a signal forces it, `sig` = surfaced only on a signal. (The *rule* that classification precedes and parameterises the floor — plus the persistence model: classification persists not answers, workstream > settings, confirm-once on absent/doc-seeded/conflicting, self-heal on conflict — lives in `_shared/lens-ledger.md` Mechanism 3; not restated here.)

| Lens | side-project | feature-in-product | new-bet | internal-tool |
|---|---|---|---|---|
| 1 Customer & pain | F (user = often you) | F | F (at depth) | F (the internal user) |
| 2 Framing & hypothesis | F | F | F | F |
| 3 Success & guardrails | ↓ ("good enough?") | F | F (at depth) | ↓ (adoption-only) |
| 4 Strategy & fit | N/A | F | F (at depth) | ↓ ("worth the team's time?") |
| 5 Risks/urgency/reversibility | ↓ (light) | F | F (at depth) | ↓ |
| 6 Constraints & dependencies | sig | sig | F (at depth) | F (often dependency-heavy) |

**Reading the matrix:** a side project is never grilled on strategic positioning (Lens 4 = N/A); a new bet earns all six at depth; an internal tool leans on constraints/dependencies (Lens 6 = F) because it usually lives downstream of other teams. A cell's value is the *starting* disposition expectation — the adaptive-lens rule (`_shared/lens-ledger.md` Mechanism 2) can still promote a `sig`/`N/A` lens the moment a signal appears (a side project that touches user PII pulls Lens 6 up to a real disposition).

## How the gate uses this deck {#how-the-gate-uses-this-deck}

1. **Classify** the context bucket (persisted-first per the mechanism doc).
2. For **every** lens, settle a **disposition** — driven by the matrix cell, but always one of the four legal states; a downshifted/`N/A` lens still records *why* it was dropped (visible in the ledger, never silently absent).
3. Before converging, run the **ceiling-breaker**: surface ≥1 genuine off-deck probe **or** record a one-line sufficiency attestation (never fabricate a hollow probe). Spin up an adaptive lens on any regulatory / ethical / feasibility-as-constraint / network-effects / hard-dependency signal.
4. The terminal **problem-brief** renders the full ledger — all six lenses (plus any adaptive lenses) with their dispositions, including `N/A` and Parked-with-reason — so coverage is auditable.

The disposition states, the ceiling-breaker, the context-gate persistence model, and the autonomous non-interactive variant are all defined once in `_shared/lens-ledger.md`; this deck is the floor it operates on.
