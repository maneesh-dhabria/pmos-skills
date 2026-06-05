# pmos-toolkit — Answers to 7 design-philosophy questions

**Date:** 2026-06-05
**Companion to:** `2026-06-05_pmos-toolkit-skill-architecture-review.md`
**Method:** 4 targeted parallel scans (writing-guideline duplication, persona prescriptiveness, visual identity, prompt-friction + lint blocks) + direct top-to-bottom reads of requirements/SKILL.md and feature-sdlc/SKILL.md. Agent claims were verified before inclusion — corrections noted inline.

---

## Q1 — Inline content vs shared references; am I repeating guidelines?

**Short answer:** Your *heuristic content* is already well-shared (msf-heuristics, sim-spec-heuristics). What's still duplicated is (a) **prose-quality guidance** and (b) **the persona/journey-alignment ceremony**. There's a clean, bounded opportunity to extract both — but don't over-rotate; this is a consistency win, not a crisis.

**Evidence:**
- **Writing guidance** is scattered as one-liners across ~10 artifact-emitting skills: "user-facing language" (requirements:540, changelog:135), "conciseness" (spec:749/964, requirements:573), "no placeholder language" (plan:696), de-jargon (survey-analyse), voice-consistency (ideate:140). Meanwhile `polish/reference/rubric.md` owns the *authoritative* version (de-AI-slop vocab, clutter words, passive-voice, throat-clearing, rhetorical excess, structural clarity). Only **readme** actually defers to `/polish`; nobody cites a shared principles doc.
- **Persona/journey-alignment prose** is copy-pasted across creativity (Phase 1), msf-req (Phase 3), msf-wf (Phase 3–4) — all three cite `_shared/msf-heuristics.md` for the *heuristics* but re-state the *alignment ceremony* (extract personas → propose if absent → confirm via AskUserQuestion).

**Recommendation:**
1. Extract a **short** `_shared/writing-principles.md` — the skill-agnostic prose rules only (user-facing language, conciseness, de-slop vocab, no throat-clearing, voice anchoring). Artifact-emitting skills cite it in their *write* phase: "follow `_shared/writing-principles.md`." Keep skill-specific content rules local (changelog bullet count, survey WIIFM, plan type-consistency).
2. Make `polish/reference/rubric.md` the **enforcement** layer that builds on those principles (it adds regex + auto-apply machinery) — single source for the *principles*, polish owns the *checks*.
3. Extract `_shared/persona-journey-alignment.md`; have creativity/msf-req/msf-wf cite it.

**Caution:** the architecture is right (you *have* a substrate); the gap is that prose principles never got the same treatment as MSF/sim-spec heuristics. Don't go further and force every skill to run a full `/polish` pass inline — that's friction and scope creep. A shared *reference* + an end-of-skill *offer* to run `/polish` (readme's pattern) is the right ceiling. **Priority: P2.**

---

## Q2 — Are the inline lint patterns necessary? They make skills awkward to read.

**Short answer:** The *contract* needs to be inline; the **52-line awk extractor pasted into 29 skills does not** — that's CI tooling that leaked into the runtime prompt. Remove it from the skills and you delete ~1,500 lines of the most awkward content in the suite without losing anything.

**The key insight (this is the one to act on):** The non-interactive block's awk extractor (requirements:90–142 and identically in 28 other skills) exists to "find AskUserQuestion call sites in the live SKILL.md." But **the executing model does not run awk** — it classifies its own questions by *reading* them. The awk function is needed by `tools/audit-recommended.sh` (a CI lint), not at runtime. Pasting a 52-line parser into every skill prompt is pure tax: the model reads it, gets nothing actionable, and a human maintainer's eyes glaze over before reaching the actual skill.

**Numbers (corrected):**
- The non-interactive block is inlined in **29 skills** (not 82 as the scan reported). At ~84 lines each that's **~2,440 lines** of repeated contract.
- Of that 84, roughly **52 lines are the awk extractor** and **~32 are the genuine contract** (mode resolution, defer/auto-pick decision rule, buffer+flush, refusal check, end-of-skill summary).
- The `pipeline-setup-block` is only 12 lines × 21 skills — negligible; leave it.

**The six lint scripts, sorted by what they actually do:**

| Script | Guards | Verdict |
|---|---|---|
| lint-non-interactive-inline | The 84-line block's byte-identity | **Keep, but shrink what it guards** — drop the awk from the inlined region; guard only the ~32-line contract. |
| lint-pipeline-setup-inline | The 12-line setup block | Keep. Cheap, load-bearing. |
| lint-platform-strings | Structure of a *reference file* | Fine as CI; unrelated to inline readability. |
| lint-stack-libraries | Structure of *reference files* | Fine as CI; unrelated to inline readability. |
| lint-js-stack-preambles | ~40-line preamble copied across 5 stack files | Low value — consider a single canonical preamble + include. |
| lint-no-modules-in-viewer | viewer.js has no ES-module syntax | Fine as a pre-commit/CI check (it protects `file://` loads). |

**Recommendation:**
1. **Move the awk extractor out of all 29 skills** into `tools/audit-recommended.sh` (and the lint script). Replace the inlined "5. Awk extractor" item with one line: "Classify each of your own AskUserQuestion calls by reading them (does the option list contain a `(Recommended)` label? is there an adjacent `<!-- defer-only -->` tag?)." This removes ~1,500 lines of tax and is the single biggest readability win.
2. Keep the ~32-line contract inline (it genuinely must be in-context).
3. Leave the reference-structure linters (platform-strings, stack-libraries, no-modules) as CI — they don't touch readability.

**Priority: P1** — this is high-leverage and low-risk.

---

## Q3 — Does each SKILL.md read well to a first-time reader? Too verbose?

**Short answer:** The *intros* are genuinely good; the *machinery* is front-loaded. A first-time reader of `requirements.md` wades through ~100 lines of setup/contract before reaching the actual method (Phase 1). But reframe the question: SKILL.md is a **model prompt**, not end-user docs — the first-time *user* never reads it; the first-time *reader* is you or a contributor. So this is a maintainability concern, and the Q2 fix (remove the awk) solves most of it.

**Direct observation (requirements.md, read top-to-bottom):**
- Lines 8–21: excellent. Clear "what is this", a pipeline diagram, and a dual acid-test. A reader gets the gist immediately. ✓
- Lines 23–44: Platform Adaptation + Backlog Bridge — operational detail a human skims.
- Lines 47–149: pipeline-setup-block (12L) + the non-interactive block (84L, mostly awk). **~100 lines of machinery before Phase 1 at line 153.**

So the "first screen" is strong, then signal-to-noise collapses for ~100 lines, then the real content resumes. feature-sdlc is better oriented (the mode×phase table at lines 36–53 is genuinely useful) but its *description frontmatter* is a 1,400-character wall.

**The tension:** execution order wants setup first (Phase 0 really does run first); reading order wants method first. You can't fully satisfy both in a linear file.

**Recommendation:**
1. Do Q2 first — removing the awk cuts the worst 52 of those 100 lines.
2. Adopt a consistent skeleton across skills: **what + when + acid-test → method/phases → operational contract (setup, non-interactive, platform) last** (or behind a single `reference/operational-contract.md` the model reads at Phase 0). A reader gets method in screen one; the model still hits the contract before it acts.
3. Trim the giant description frontmatter on feature-sdlc — the triggers list is exhaustive to the point of unreadable. Lead with one sentence + the four modes; push the trigger phrases to the end.

**Priority: P2** (rides on the P1 awk removal).

---

## Q4 — Prescriptive vs model intelligence (the simulated personas)

**Short answer:** **Spec the physics of the persona, not its biography.** Don't write per-persona guideline documents. Prescribe the *constraint* (time budget), the *exit condition* (what makes them bounce), and the *anti-theater guard* — then let the model embody the persona grounded in the *real artifact*. You already do this best in readme; propagate it.

**What I found (and agree with):**
- **Prescribe heavily where it buys reproducibility/standards:** PSYCH scoring rubric (msf-wf:206–237), WCAG/Nielsen heuristics (design-crit/eval.md), Braun-Clarke thematic method (survey-analyse), quote contracts. These aren't personas — they're *standards the model applies*. Correct to prescribe.
- **Keep light where the model's judgment IS the product:** grill's adversarial questioning (improvise the questions — if you script them, you've done the grilling for the user), creativity's idea generation, the MSF persona *alignment* (extract from the doc, confirm with the user — the artifact is ground truth, not your persona spec).
- **The standout pattern: readme's `simulated-reader.md`.** Each persona is *Evaluator (60s) / Adopter (5min) / Contributor (30min)* — a **time budget + concrete bounce triggers + an anti-theater re-dispatch** (if the reader returns "looks great" but the rubric found ≥3 issues, re-dispatch once with a harder prompt and accept the second result). This directly defeats the #1 failure mode of LLM persona work: sycophantic theater.

**The principle, stated plainly:**
> Prescribe the scaffold and the guardrails; improvise the content. Ground the persona in the real artifact, not in a biography you wrote.

**Recommendation:**
1. **Do not** write detailed per-persona guideline files. The model simulates "a time-pressured skeptical evaluator" better than a spec can. What it can't do reliably is *resist being helpful* — that's what you prescribe.
2. **Extend readme's theater-check re-dispatch** to the other persona simulations: design-crit's per-journey friction, survey-design's simulated respondent. (Verify survey-design Phase 6 — the scan couldn't confirm whether it has an anti-theater guard.)
3. Where you already prescribe standards (PSYCH, WCAG, Braun-Clarke), keep it — that's correct and load-bearing.

**Priority: P2** (quality, not correctness).

---

## Q5 — AskUserQuestion friction, especially in orchestrators

**Short answer:** feature-sdlc hits ~11 prompts on a fresh run, ~5 of them soft gates in sequence. complete-dev already solved exactly this with a Phase 0.5 lastrun-seeded consolidation. **feature-sdlc never adopted it.** Port that pattern — it's the highest-leverage UX fix in the suite.

**Evidence — the feature-sdlc fresh-run prompt journey:**
1. Slug confirmation (0a)
2. Branch/worktree collision (0a, conditional)
3. Base-drift pull-or-branch (0a, conditional, destructive)
4. /ideate gate (1.5, soft, fuzzy-seed only)
5. /creativity gate (3a, soft)
6. /wireframes gate (3b, soft)
7. /prototype gate (3c, soft)
8. /reflect gate (8a, soft)
(plus the hard phases spec→plan→execute→verify→complete-dev, which don't prompt)

**What already works (credit where due):**
- **complete-dev Phase 0.5** (SKILL.md:193–220): one consolidated prompt seeded from `.pmos/complete-dev.lastrun.yaml` collapses ~6 prompts into one pre-confirmed summary; destructive prompts still re-fire. This is the right model.
- feature-sdlc's **Phase 0d batches** tier+location+platform into one ask. Good.
- `--minimal` short-circuits the soft gates. Good.
- defer-only tags + non-interactive auto-pick. Good.

**The gap:** feature-sdlc's 2nd+ run still walks the full soft-gate gauntlet one prompt at a time. The infrastructure to fix this exists three skills over.

**Recommendation (prioritized):**
1. **[P1] Port complete-dev's lastrun consolidation to feature-sdlc.** Read `.pmos/feature-sdlc.lastrun.yaml` at a new Phase 0.5; present one batched "here's how I'll run the pipeline (ideate: skip, creativity: skip, wireframes: run, prototype: skip, reflect: skip) — confirm or edit?" If the user's prior choices match defaults, it's one confirm instead of five sequential gates.
2. **[P1] Consolidate the 0a pre-flight** (slug + collision + drift) into a single summary prompt in the common case.
3. **[P2] Merge wireframes+prototype** into one "Frontend artifacts: Skip / Wireframes / Both" gate.

**The art:** consolidate the *non-destructive* gates; keep *destructive* prompts (merge conflict, base-drift, push) explicit and one-at-a-time. complete-dev gets this balance right — copy it.

---

## Q6 — Is the HTML/visual substrate distinctively PMOS?

**Short answer:** No — it's clean but generic (Tailwind-blue `#2563eb` + system fonts + a near-invisible footer). The good news: identity is governed by **one substrate** (`_shared/html-authoring/assets/style.css` + diagram themes), so making it distinctive is an afternoon of design intent, not a re-architecture. **Use real typography — it's the primary lever for distinctiveness.** (Note on delivery: "offline" here means *no local server*, not *no internet* — a `file://` page with internet CAN load CDN fonts. The recommendation below is to base64-inline a subsetted display face anyway, because that matches the self-contained-single-file architecture and renders durably with no server AND no internet.)

**Current signature (from style.css):**
- Type: OS-default stack (`ui-sans-serif, system-ui, -apple-system…`). Not distinctive.
- Color: accent `#2563eb` — Tailwind blue-500, the most common SaaS accent on earth.
- Layout: 880px column, simple toolbar, footer attribution at 65% opacity/italic — reads as legal boilerplate, not a brand mark.
- Diagram themes are a *separate visual world* — the "technical" theme's blue matches the doc blue by accident, not by a shared token.

**Verdict:** ~2/10 on recognizability. Someone seeing a PMOS doc would not know it's PMOS without reading the footer.

**Recommendation — highest-leverage, and `file://`-safe:**
1. **Pick one ownable accent** that isn't Tailwind blue (an ink/teal/aubergine) and use it across docs *and* diagrams.
2. **Add a masthead wordmark** — a small consistent "pmos" lockup top-left of every artifact toolbar. Single most recognizable element; ~10 lines of CSS+HTML; appears on every artifact.
3. **A signature structural detail repeated ~50×/doc** — e.g., a left-border accent on `<section>` headers, or a `§N` section-number treatment. Cheap; compounds recognition.
4. **Converge diagrams and docs on ONE palette** via a shared `themes/_shared-palette` token file. This is what makes "a PMOS diagram" and "a PMOS doc" feel like one product.
5. **A visible, branded footer** (not 65%-opacity italic).
6. **Typography (where most of the identity lives):** bundle **one distinctive display face** for headings + the wordmark — subset to Latin + the glyphs used (~15–30KB woff2), base64-inlined into `style.css` like the rest of the substrate. Keep body on a strong system stack (a legitimate editorial pairing that keeps each artifact light), or bundle a body face too if you accept the per-weight byte cost. Delivery options ranked by durability: base64-inline (no server, no internet, single file — best fit) > CDN `<link>` (works from `file://` with internet, but leaks viewer IP to Google per the 2022 German GDPR ruling and adds an external render dependency) > sidecar woff2 (breaks the single-file property — avoid).

**The architectural point:** your *mechanism* is right (centralized tokens fanning out to all 14 HTML surfaces). You just haven't spent the design decision. This is a "tokens + wordmark afternoon," P2.

---

## Q7 — mac-health belongs in a separate `pmos-utilities` plugin

**Agreed — and use the moment to define plugin charters so this doesn't recur.**

- **mac-health → pmos-utilities.** Clear. It has zero connection to req→ship and is written as a passive command-reference anyway.
- **architecture** is the borderline case. It's a code-quality tool (utilities-shaped), but it's *wired into /verify* (Phase 4.7 dispatches it), so moving it carries a cross-plugin dependency. Two options: keep it in toolkit but reframe it as a /verify deepening, or move it to pmos-utilities and have /verify call across plugins (the marketplace already supports cross-plugin references). I lean **keep for now**, revisit if pmos-utilities grows a "codebase tools" cluster.
- **survey-design / survey-analyse** stay in toolkit — surveys are PM work.
- **Write a one-line charter per plugin** so future skills route correctly: *toolkit = ship a feature; learnkit = learn a topic; utilities = maintain your environment/machine.* The absence of such a charter is exactly what let mac-health land in toolkit. Add it to the repo CLAUDE.md alongside the existing Plugins list.

**Priority: P1 for the move (small), P1 for the charter (one paragraph, prevents recurrence).**

---

## Corrections made to the underlying scans

- Non-interactive block is in **29 skills (~2,440 lines)**, not the 82 / ~6,888 the friction scan reported.
- The awk extractor inside that block is **CI tooling, not runtime logic** — the model classifies questions by reading, not by running awk. (My addition; the scan only said "could be a reference.")
- Visual scan's web-font recommendations (Inter/Hubot Sans) were initially flagged as conflicting with `file://` — that was wrong. `file://` + internet loads CDN fonts fine; "offline" here means no-server, not no-internet. Corrected recommendation: bundle a subsetted display face as base64 (matches the self-contained-artifact architecture; durable with neither server nor internet), with CDN `<link>` as a viable-but-less-durable alternative.
