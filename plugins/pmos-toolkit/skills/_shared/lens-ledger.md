# Lens Ledger — Shared Floor/Ceiling/Context-Gate Protocol

> Canonical, skill-agnostic mechanism for **structured exploration that is a floor, not a ceiling, and not an interrogation**. A consumer skill supplies a concrete *deck* of lenses (its domain questions) and points its terminal artifact at the **ledger** output shape below; this file owns the three mechanisms that make the deck disciplined without making it a checklist. Cite it by path — "the floor/ceiling/context-gate mechanism lives in `_shared/lens-ledger.md`" — and state only the per-consumer deltas (the deck, the context buckets, the artifact section) at the call site. It names no consumer and hard-codes no domain lenses.

This protocol exists because two failure modes sit on opposite sides of the same coin: a deck used as a **script** becomes a checklist that grills the user and still misses the dimension no one listed; a deck used too **loosely** silently drops dimensions and nobody notices. The ledger holds both at bay — a disposition *floor* under every applicable lens, a mandatory *ceiling-breaker* above the deck, and a *context gate* that right-sizes the floor.

## Mechanism 1 — Floor = disposition, not interrogation

The terminal state is **not** "every lens was asked as a question." It is "every *applicable* lens carries an explicit **disposition**," in one of four states (the same discipline as `_shared/findings-dispositions.md`, reused here for lens coverage rather than review findings — cite it, do not restate):

- **Answered** — the lens is resolved. Crucially, "Answered" may come from **what the user already said, prior context, the workstream, or research** — not necessarily a fresh question. If the seed already pins the customer, the Customer lens is Answered without a turn spent re-asking (the "don't re-ask what you already know" rule).
- **Parked** — deliberately out of scope *for now*, **with a one-line reason**. Parked is a decision, not an omission.
- **Open question** — applicable and unresolved; carried forward into the artifact's Open-questions section so it is visible, not silently absent.
- **N/A-for-context** — the context gate (Mechanism 3) dropped this lens for this kind of work; recorded as N/A with the bucket that dropped it, so the drop is auditable.

A lens with **no** disposition is the bug this mechanism prevents. The floor is "all four states are legal; *blank* is not." That makes the deck a floor (minimum coverage) **without** making it an interrogation (every lens need not become a question).

## Mechanism 2 — Ceiling-breaker = mandatory meta-probe (with a sufficiency-attestation escape)

A deck is the **starting hand**, never the ceiling. Before convergence, the model — acting as a seasoned domain leader — MUST do one of two things, explicitly:

1. **Surface ≥1 genuine off-deck probe** — a problem-specific dimension *not* in the deck — and justify in one line why it matters *here*; **or**
2. **Record a one-line sufficiency attestation** — *"deck sufficient for this <unit> because …"* — when, in honest judgement, no genuine off-deck dimension exists.

Both outcomes are accepted. The escape exists because **forcing a hollow probe would itself be the checklist anti-pattern, inverted**: a manufactured low-value question to satisfy a counter is no better than a skipped real one. The discipline is that the meta-probe step *happens and is recorded* — a real off-deck probe **or** a justified attestation — never that a probe is fabricated.

**Adaptive-lens rule.** Treat the deck as the opening hand and **spin up a problem-specific lens whenever a signal appears** — e.g. regulatory / compliance, ethical, technical-feasibility-as-a-constraint, network-effects, a hard external dependency. An adaptive lens, once spun up, takes a disposition like any deck lens (Mechanism 1) and renders in the ledger like any other (Mechanism 1's transparency rule), so the addition is visible.

## Mechanism 3 — Context gate = classify first, then downshift

Not every unit of work earns the full deck. **Classify the context first**, then apply a **downshift map** that, per lens, marks it full-floor (`F`), downshifted to a lightweight one-liner (`↓`), dropped unless a signal forces it (`N/A`), or surfaced only on a signal (`sig`). A one-off weekend effort is never grilled on strategic positioning; a high-stakes new bet gets every lens at depth. (Same shape as scope-tiering, applied to *context* instead of *size*.) The consumer's deck owns the concrete buckets and the full matrix; this file owns the *rule* that classification precedes and parameterises the floor.

**Persistence model — the classification persists, not the answers.**

- **What persists:** the **classification** (the context bucket), not the lens answers. Answers are per-unit; the bucket is a stable property of the working context.
- **Precedence:** a **workstream** signal outranks a **settings** signal (`.pmos/settings.yaml`) when both are present.
- **Confirm-once:** read the persisted classification and **use it silently when unambiguous**. Confirm with the user **only** when it is *absent*, *seeded from a document* (low-confidence), or *conflicting* (a fresh signal contradicts the persisted bucket — e.g. the workstream now reads new-bet but settings say side-project). One confirmation, then persist/overwrite.
- **Self-healing:** because a *conflicting* signal re-triggers the one confirmation, a wrong classification corrects itself on the next divergent run rather than ossifying. Never re-ask per run absent a conflict (the "don't re-ask persisted context" rule).

## The ledger output shape (transparency forcing-function)

The consumer's terminal artifact renders the **full lens ledger** — **every** lens with its disposition, **including N/A and Parked-with-reason**, plus any adaptive lenses spun up and the ceiling-breaker outcome (the off-deck probe **or** the sufficiency attestation). The point is that a missing or downshifted dimension is **visible** rather than silently absent: a reader can see *what was not covered and why*, which is the property a loose deck destroys. A consumer renders this as a table (lens · disposition · note) with the ceiling-breaker outcome adjacent.

## Autonomous (non-interactive) variant

Under a non-interactive run the three mechanisms still run — **autonomously**, not skipped (the canonical non-interactive contract is a *degradation to best-effort*, never a refusal or a no-op):

- **Parallel lens drafters.** Dispatch one subagent per applicable lens (per the context gate) to **draft that lens's disposition** from the seed + workstream + any research — Answered (with the evidence it leaned on), Parked (with reason), or Open question.
- **Reviewer-judgement convergence.** A **reviewer subagent applies seasoned-leader judgement** to converge the drafts into a coherent framing **and run the ceiling-breaker** (surface a genuine off-deck probe or record the sufficiency attestation). The reviewer-subagent input contract is `_shared/reviewer-protocol.md`.
- **Unresolved → Open, not blocked.** Any lens the drafters/reviewer cannot resolve lands as an **Open question** disposition (recorded, visible), and any leap the reviewer made lands as a recorded **assumption**. The run does **not** deadlock and does **not** hard-refuse.
- **Escalate only on a major gap.** An explicit prompt fires **only** when a *major* gap genuinely blocks a defensible terminal statement — expected to be rare. Everything else becomes an assumption-or-open-question and the run proceeds. The ledger is the same artifact; only *who fills it* differs.

## Consumers

A consumer skill: (1) ships a **deck** (its concrete lenses + applicability tests) and the **context buckets + downshift matrix** in its own `reference/`; (2) renders the **full lens ledger** (this file's output shape) in its terminal artifact; (3) implements the **autonomous variant** above in its non-interactive path. It cites this file for the mechanisms and `_shared/findings-dispositions.md` for the disposition discipline, restating neither.

---

*Spec lineage: extracted 2026-06-16 from the `/shape` design (`docs/pmos/features/2026-06-16_shape-skill/02_design.html` §5 — floor/ceiling/context-gate) so the mechanism is reusable by a future solution-shaping deck without duplicating machinery (design D7). Disposition discipline reused from `_shared/findings-dispositions.md`; autonomous-path reviewer contract from `_shared/reviewer-protocol.md`; non-interactive degradation per `_shared/non-interactive.md`.*
