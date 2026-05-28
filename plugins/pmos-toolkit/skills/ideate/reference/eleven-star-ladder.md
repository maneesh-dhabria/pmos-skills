# 11-Star Ladder (Phase 3: Amplify)

The 1→11-star ladder is Brian Chesky's design exercise for stretching a chosen idea past its obvious shape. Take one user-facing moment, sketch what it looks like from terrible (1) through expected (5) and then keep pushing — 6, 7, 8, 9, 10, 11 — until you've designed something deliberately infeasible. The sweet spot you actually ship lives in the *walk back* from 11, not at 11 itself.

Chesky's canonical example (Airbnb arrival experience):

> "A 5-star arrival is: you show up, they open the door, you go in. A 6-star is: you arrive, they greet you by name, the room is at your preferred temperature. … An 11-star is: you arrive at the airport and Elon Musk is there with 5,000 people throwing you a parade. The 11-star is absurd. But once you've imagined it, having a surfboard waiting in the apartment because they know you surf stops feeling crazy — it's just 7-star."

The exercise unlocks ceiling-raising ideas that a generator phase like Expand (breadth) rarely reaches on its own, because Expand is biased toward feasibility from the first variant.

## When this phase runs

- **idea-type = `new` or `extend`** (per `reference/idea-type-classifier.md`) — the idea has a user-facing experience to amplify.
- **idea-type = `fix`** — auto-skip. Bug fixes don't have a UX ceiling to raise; there's nothing to extrapolate past "the bug is gone."

Even on a passing gate, default is Skip — opt-in via the end-of-Phase-2 prompt or `--amplify` flag. Most ideas don't earn the ceiling-raising cost; routine extensions and obvious features should pay it only when the upside warrants it.

## Ladder shape (per finalist)

Produce one 11-row table per chosen finalist. Two columns: `★` (1–11) and `Experience description` (one sentence).

| Star | Anchor                          | Generator prompt                                                                                              |
|------|---------------------------------|----------------------------------------------------------------------------------------------------------------|
| 1    | Terrible / broken               | What does this feel like when it fails — broken flow, abandoned mid-task, user actively harmed?                |
| 2-3  | Bad-but-functional              | Janky, unintuitive, slow, requires workarounds. Technically works.                                             |
| 4    | Mediocre                        | Works as expected for technical users; non-technical users struggle silently.                                   |
| 5    | Baseline good                   | The Phase-2 finalist as written — what the user picked. Solid, expected, no surprises.                          |
| 6    | Thoughtful                      | Small touches the user notices: helpful defaults, clear error states, sensible follow-ups.                      |
| 7    | Delightful                      | Anticipates one need the user didn't know to ask for. The "huh, that's nice" moment.                             |
| 8    | Memorable                       | Anticipates multiple needs; user mentions it unprompted. The "I have to tell someone about this" moment.        |
| 9    | Genre-bending                   | Redefines what category the product is in. Users compare it to things in adjacent industries.                     |
| 10   | Industry-redefining             | Competitors copy this within 12 months; the experience becomes the new baseline expectation.                     |
| 11   | Deliberately absurd / infeasible | Physically impossible, economically ruinous, or scope-impossibly broad. The "send them to space" tier.            |

Generate each row in order; do NOT skip rungs. The continuity is the value — each step should clearly exceed the one below it. If two adjacent rungs feel the same, push the higher one harder.

## Sweet-spot selection

After the ladder is written, the skill identifies the **sweet spot** — the highest rung that is still imaginable to actually build with the team and budget that would build the Phase-2 finalist. **Almost always 7 or 8.** Never 11 (infeasible by construction); rarely 9-10 (those are usually multi-year R&D bets, not Phase-2-finalist-scope). The sweet spot is **recommended** to the user as a concrete reframed finalist — never dumped as raw ladder rungs for the user to pick from.

The sweet-spot row becomes a **reframed finalist** that feeds Phase 4 Pressure-test. State it as: *"Finalist (sweet-spot reframe): <one-line restating the original finalist with the sweet-spot rung's ceiling-raising element folded in>."*

The skill then surfaces a confirm prompt (`AskUserQuestion`) with three options:

- **Use sweet-spot reframe (Recommended)** — the recommended reframe feeds Phase 4. Phase 4 attacks the reframe; the original Phase-2 finalist is preserved on record.
- **Stay with original Phase-2 finalist** — keep the unmodified Phase-2 selection; Phase 4 attacks it; the ladder is preserved in the artifact for reference.
- **Pick a different rung** — user names which rung (typically 6, 8, or 9) to use as the reframe instead; that rung's row becomes the reframed finalist.

The prompt is **never** "pick from the 11 rungs" — that pushes synthesis onto the user. The skill expresses a recommendation; the user redirects only when their judgement diverges from 7-8.

Example — original Phase-2 finalist: "In-app onboarding tour for new users." Ladder 7-star: "Onboarding adapts to the user's first action — if they create a project, the tour pivots to project-specific tips; if they invite a teammate, it pivots to collaboration tips." Sweet-spot reframe: "Adaptive in-app onboarding that branches based on the user's first action."

The reframe is what Phase 4 attacks. The original Phase-2 finalist is preserved in the artifact alongside it — Phase 4 can decide whether the amplification survives pressure-testing.

## Multi-finalist handling

When Phase 2 produced 2–3 finalists, run the ladder per finalist (each finalist gets its own 11-row table + sweet-spot reframe). Phase 4 then runs its battery against each sweet-spot reframe in turn, and the cross-cutting decision table (existing Phase 4 behavior) compares the reframed variants — not the originals.

Cap visual density: each table is 11 rows × 2 cols. Don't merge ladders across finalists; the cross-finalist comparison happens in Phase 4's existing decision table, not here.

## Skip signaling

When Phase 3 is skipped (idea-type=fix OR user opted out OR `--no-amplify`):

- The artifact's `<section id="amplify-ladder">` placeholder MUST exist with one of:
  - `<em>Skipped — idea-type=fix (no UX ceiling to raise)</em>`
  - `<em>Skipped — user opted out at Phase 2 gate</em>`
  - `<em>Skipped — --no-amplify flag</em>`
- Phase 4 Pressure-test runs against the **original Phase-2 finalist(s)** unchanged.
- The TL;DR does NOT carry a warning (unlike `--no-stress-test`, which DOES warn) — amplify is opt-in cost, not a default-on guardrail being bypassed.

## Anti-patterns specific to this phase

- **Picking 11 as the sweet spot.** 11 is infeasible by construction — designing past feasibility is the point of writing it down. The value lives in the *walk back*. Sweet spot is almost always 7–8.
- **Defaulting Amplify to on.** Phase 3 is opt-in even when the idea-type gate passes. Routine extensions and obvious features don't earn the ceiling-raising cost; defaulting on would punish those cases with a phase whose output they won't use.
- **Running on idea-type=fix.** Bugs don't have a UX ceiling. Auto-skip and advance to Phase 4; do not surface the gate prompt.
- **Skipping rungs in the ladder.** Each of the 11 rows must be present. The continuity is what makes the sweet-spot visible — gaps break the visual ratchet.
- **Letting the sweet-spot reframe quietly *replace* the Phase-2 finalist.** Both are preserved in the artifact. Phase 4 attacks the reframe by default, but the original is still on record so the user can decide whether the amplification survives pressure-testing.
