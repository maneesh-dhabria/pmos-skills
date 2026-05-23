# Structured-Ask Edge Cases — Shared Protocol

> **<MUST READ END-TO-END>** Consumer skills (`/requirements`, `/spec`, `/simulate-spec`, `/plan`, `/wireframes`, `/prototype`) MUST read this file before applying any disposition that arrived from an `AskUserQuestion`-batched ask. Do not infer behavior from the calling skill's text. The three edge cases below recur across the pipeline; each was caught and worked around manually before being codified here. </MUST READ END-TO-END>

This protocol governs what happens when a user reply slips outside the structured form of an `AskUserQuestion` ask — that is, when the dispositions you'd expect to receive (Fix / Modify / Skip / Defer, or skill-specific equivalents) don't cleanly apply.

The three cases below are exhaustive *as of the retro that produced this file*. Adding a fourth requires retro evidence (see Anti-Patterns).

---

## 1. Free-form reply to a structured question

**Trigger:** the skill issued an `AskUserQuestion` with structured options, and the user replied in free-form text instead of selecting one (e.g., reply: "actually, just clean up the old data first" when the offered options were Fix / Modify / Skip / Defer).

**Prescribed behavior:**

1. **Paraphrase the reply back as one of the offered options.** State the mapping explicitly: "I read this as **Modify** — applying your version: clean up old data first, then recreate. Confirm?"
2. **Wait for confirmation before applying.** Do not silently re-interpret. The user may correct the mapping, supply additional detail, or choose a different option.
3. **Log both the original reply and the back-mapped disposition** in the consumer's Review Log / Findings Log row. Future readers need to see why a "Modify" disposition has free-form text behind it.

**Example.** Skill asks "Add 409 response for duplicate email to POST /users? — Fix / Modify / Skip / Defer". User replies "yeah but make it 422, not 409, and only when the email is already verified". → Skill paraphrases: "I read this as **Modify** — apply 422 instead of 409, gated on email verification status. Confirm?" Once confirmed, the Edit lands and the Review Log row reads: "Modify (user override): 422 instead of 409, verified-email gate".

---

## 2. Non-recommended pick that may break an invariant

**Trigger:** the agent's recommended option (typically option (a)) was not the one the user picked. The chosen option may carry an implication the user hasn't surfaced.

**Prescribed behavior:**

1. **Before moving to the next finding, role, or phase, ask:** "Does this choice change any existing invariant or contract? If yes, capture it as a Decision-Log entry with the trade-off explicit."
2. **If the user says yes,** append a numbered Decision-Log entry to the working artifact (requirements doc, spec doc, plan doc, etc.) naming: the invariant being broken, the chosen option, the trade-off accepted, and the rationale.
3. **If the user says no,** record the disposition and continue. No Decision-Log entry needed.

**Example.** Spec asks "Photos: appear in only-one-of {chat-thread, moment} (recommended) / appear in BOTH". User picks "BOTH". → Skill: "This breaks the existing one-photo-one-moment invariant. Capture as a Decision-Log entry?" → User: "Yes." → Skill appends `D12 | Allow photos in both chat-thread and another moment | Recommended single-location vs. dual-location | Dual-location chosen because...`. The invariant break is now load-bearing in the doc, not silent.

---

## 3. Leftover findings that don't share a category

**Trigger:** the skill has already presented N batches of findings grouped by category. The remaining findings (1–4) don't share a coherent category — padding them into a final "≤4 per call" batch produces a question grouping that mixes unrelated concerns.

**Prescribed behavior:**

1. **Prefer category coherence over batch fullness.** The "≤4 per call" rule is an upper bound, not a target.
2. **Issue 1–2 question calls** for the leftovers rather than padding a final batch to 4 with unrelated items. A single-question `AskUserQuestion` is fine.

**Example.** `/simulate-spec` Phase 7 has 18 gaps. First three batches (4+4+4) are category-coherent (Data, Interfaces, Behavior). Six remain: 2 Wire-up, 1 Operational, 1 Data-quality, 1 CLI, 1 Atomic-write. → Skill issues a 4th call for the 2 Wire-up + 1 Operational, then a separate 1-question call for each of the remaining stragglers (Data-quality, CLI, Atomic-write) — *not* one final batch of 4 unrelated leftovers.

---

## Platform fallback (no `AskUserQuestion`)

When the consumer is running in a platform without `AskUserQuestion` (Codex, Gemini CLI, plain CLI), the same three rules apply via numbered-list reply mode:

1. **Free-form reply:** if the user types free-form text instead of a number, echo back the back-mapped disposition as a follow-up text prompt: "I read this as option 2 (Modify). Confirm with `y` or correct."
2. **Non-recommended pick:** after the user picks a non-recommended option number, ask the invariant question as a follow-up text prompt before issuing the next batch.
3. **Leftover-coherence:** unchanged — issue smaller numbered tables (1–2 findings) rather than padding to 4 with unrelated items.

---

## Consumers

- **`/requirements`** — Findings Presentation Protocol (review loops, design-critique batches).
- **`/spec`** — Findings Presentation Protocol (review loops, design-level self-critique). Also Role Protocol non-recommended-pick check.
- **`/simulate-spec`** — Phase 7 gap resolution batches.
- **`/plan`** — Findings Presentation Protocol (review loops, design-level self-critique).
- **`/wireframes`** — Findings Presentation Protocol (cross-file rollup).
- **`/prototype`** — Phase 8 Findings Presentation Protocol.

Each consumer references this file via the relative path `../_shared/structured-ask-edge-cases.md`. Do not duplicate the protocol's content into the consumer files — link to it.

---

## Anti-Patterns (DO NOT)

- **Don't silently re-interpret a free-form reply** without confirming the back-mapped disposition. The mapping you inferred may be wrong; the user must agree on the record.
- **Don't skip the invariant question** after a non-recommended pick. Even when the choice looks safe to you, the user owns the invariant set — surface it.
- **Don't pad a final batch with unrelated leftovers** to hit the ≤4 cap. Coherence beats fullness.
- **Don't duplicate this protocol's content** in the consumer files. Link to it. The whole point of `_shared/` is one source of truth.
- **Don't add a 4th edge case to this file without retro evidence** (named scenario + named skill + named line where it surfaced). Rule-bloat is its own anti-pattern; the three current cases earned their place by appearing in a real session and being worked around manually before codification. New cases must clear the same bar.
