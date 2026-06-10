# Findings Dispositions — Shared Protocol

> Canonical protocol for presenting review findings to the user and collecting dispositions. Any skill whose review / critique / eval loop produces findings follows this file instead of restating the protocol. Skills cite it by path — "Present findings per `_shared/findings-dispositions.md`" — and state only their genuine deltas (defer target, auto-apply carve-outs, extra options) at the call site.

## The four dispositions

Every finding is offered the same four options, with these exact names:

- **Fix as proposed** — the agent applies the stated change via `Edit`. Carries `(Recommended)` when the proposed fix is concrete and mechanical (see "Non-interactive behavior").
- **Modify** — the user edits the proposal; expect a free-form reply next turn, then apply that instead.
- **Skip** — not an issue; drop it, with a brief note in the skill's review log.
- **Defer** — log with rationale and move on. The default defer target is the artifact's Open Questions; consumers with a different target state it at the call site (e.g. /spec defers to its Review Log and must resolve every deferral before exit because published specs forbid Open Questions; /polish defers via an in-document marker comment).

Do not rename the options ("Apply fix as proposed", "Apply as recommended", "Defer to user notes" are pre-substrate drift — converge on the names above when touching a consumer).

## Presentation

1. **Severity-tag every finding**, prefixed on the question text, using the canonical vocabulary:
   - **`[Blocker]`** — the artifact cannot ship without this fix (missing requirement coverage, broken contract).
   - **`[Should-fix]`** — real defect; ship-blocker absent a good reason to defer.
   - **`[Nit]`** — cosmetic or stylistic.
2. **Group by category, order batches by severity** — Blockers first, then Should-fixes, then Nits. Small categories can be merged; never present more than 4 findings in a single batch.
3. **One question per finding** via `AskUserQuestion`: `question` = severity tag + one-sentence restatement of the finding + the concrete proposed fix (e.g. `[Blocker] Add 409 response for duplicate email to POST /users` — never "tighten section 3"); `options` = the four dispositions above.
4. **Batch up to 4 questions per interactive-prompt call**, one category per call; issue sequential calls for more findings.
5. **Open-ended findings** ("what retry policy should the worker use?") don't fit the options — ask them inline as a normal follow-up after the batch; do not shoehorn them into options.
6. **After dispositions arrive**, apply them in order, record dispositions in the review log, then ask whether the user sees additional gaps before declaring the loop complete.

**Structural-finding escape:** a finding whose fix would invalidate three or more sections of the artifact (re-architecting, not a local edit) does not belong in this flow. Pause the loop, surface it alone — never batched — with options shaped to the consumer (revise scope / accept trade-off / defer / modify), and resume the loop after the user picks. If a localized edit to one or two sections fixes it, it is not structural.

## Non-interactive behavior

The protocol composes with the canonical non-interactive block (`_shared/non-interactive.md` Section 0, step 2). Classify each finding question before asking:

- **Deterministic, safe fix** — mechanical edit, agent-verifiable against the skill's own checks → mark the **Fix as proposed** option `(Recommended)`. Under `--non-interactive` the classifier AUTO-PICKs it.
- **Judgment call** — the proposed fix could plausibly be wrong, destructive, or taste-dependent → no `(Recommended)`; put `<!-- defer-only: ambiguous -->` on the line above the call. Under `--non-interactive` the classifier DEFERs the finding to the Open Questions buffer.

Every findings prompt must be one or the other; `tools/audit-recommended.sh` fails call sites that are neither.

## Platform fallback (no `AskUserQuestion`)

List findings as a numbered table with columns [Finding | Proposed Fix | Options: Fix/Modify/Skip/Defer]; ask the user to reply with the disposition numbers. Do NOT silently self-fix.

**Anti-pattern:** a wall of prose ending in "Let me know what you'd like to fix." It forces the user to restate each finding in their reply. Always structure the ask.

**Edge cases:** a reply outside the offered options (free-form text, an invariant-breaking pick, leftover findings that share no category) → follow `_shared/structured-ask-edge-cases.md`.

## Consumers

requirements, spec, plan, wireframes, prototype, verify, msf-req, msf-wf, design-crit, polish, survey-design, diagram, complete-dev, feature-sdlc

---

*Spec lineage: extracted 2026-06-10 (skill-design review P1) from the drifted per-skill copies in /spec, /plan, /requirements, /diagram, and /polish's `reference/findings-protocol.md`. Severity vocabulary and question shape adopted from /spec (most recently shipped wording wins, review decision 8); non-interactive classification per `2026-05-08_non-interactive-mode`.*
