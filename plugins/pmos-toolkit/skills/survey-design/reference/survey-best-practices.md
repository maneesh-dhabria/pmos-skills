# Survey design — best practices reference

Loaded on demand by `/survey-design` (Phase 2–3 generation and Phase 4 reviewer critique). This file is the methodological backbone the skill applies when it builds `survey.json` and when the reviewer subagent grades it. Keep `survey.json`'s control-flow and the time-cost constants in `SKILL.md`; this file is the "why / how" the agent reasons from.

Companion files: `question-antipatterns.md` (the catalog the generator must avoid and the reviewer applies) and `platform-export.md` (per-platform import recipes).

## Contents

- Product fit (evaluate this first) · Scoring rubric (0–100, informational)
- 1. Survey structure & flow · 2. Question types · 3. Scale design · 4. Length & burden
- 5. Sampling & audience · 6. Generative vs. evaluative · 7. Reducing bias & error
- 8. Writing the questions · 9. Pre-testing / piloting · 10. Accessibility & mobile-first
- 11. Ethics / consent / PII · Sources

---

## Product fit (evaluate this first)

Methodology hygiene (wording, scales, order, accessibility, ethics) is necessary but not sufficient. A question can be methodologically immaculate and still be *useless* — it produces an answer everyone could have predicted, or it doesn't move the needle on the stated research goal, or it's framed wider/narrower than the thing actually being researched. PMs lead with these checks; so does the Phase-4 reviewer (it evaluates **every** question against the three binary checks below **before** it walks the methodology / anti-pattern catalog), and the Phase-3 generator self-checks against them before committing `survey.json`.

All checks are **binary** (PASS / FAIL) and **contextual to `purpose` and `audience`** — there is no abstract "good question", only "load-bearing for *this* research goal, for *this* audience".

**1. Predictability check — "is the answer a foregone conclusion?"**
- *Closed-ended* (`single_select`, `multi_select`, `forced_choice_grid`, `rating`, `nps`, `dichotomous`, `ranking`, `matrix`): write a one-line **predicted answer distribution** for the stated audience (e.g. "≈70% will pick 'price', ≈20% 'missing integration', the rest scattered"). **FAIL** iff one or two options would plausibly absorb ≳80% of responses — the question won't discriminate, you already know the answer. The written prediction is the evidence; a verdict with no prediction is not a verdict.
- *Open-ended* (`open_short`, `open_long`, `multi_field_open` field): a yes/no on whether **multiple distinct high-signal answers** are realistically expected from this audience. **FAIL** iff it collapses to one or two predictable themes ("everyone will say 'the analytics team'", "everyone will say 'it was too expensive'") — then it's a closed question wearing an open coat; either make it closed (and re-run check 1) or cut it.

**2. Load-bearing check — "does this question earn its place?"** **FAIL** iff dropping the question would not change what the author learns *relative to `purpose`*. Decorative demographics, "nice to know" items, questions that re-ask something an earlier item already answered, questions whose answer can't act on anything — all FAIL. (A question can pass check 1 — genuinely unpredictable answers — and still FAIL this one if the unpredictable answer is irrelevant to the goal.)

**3. Scope-match check — "is the framing the right size?"** **FAIL** iff the question is framed **broader** than the actual scope implied by `purpose`/`audience` (asking about "your experience with our product" when the research is about one onboarding step) **or narrower** (asking only about feature X's pricing when the research is about churn drivers generally). The frame should match the thing being researched — not the whole product, not one pixel of it.

**Survey-wide: research-goal coverage.** Beyond the per-question checks, the reviewer also asks of the question *set*: does it actually answer `purpose`? — **coverage gaps** (a dimension of the goal no question touches), **redundancy** (two+ questions that yield the same signal), **scope drift** (the set as a whole has wandered off the stated goal). These land in the `survey-eval.md` "Research-goal coverage / product fit" section, not the per-question file.

### Worked examples

**FAIL — predictability (closed wearing an open coat).** `purpose`: "Understand why trial users who hit a wall didn't upgrade." Draft question: *open_long* — "When you hit a wall during the trial, who did you reach out to?" Audience: solo-and-small-team trial users. Predicted distribution: "≈85% 'the analytics team' (it's the obvious internal owner), ≈10% 'nobody', the rest scattered." → **FAIL check 1** (open-ended collapses to one theme). It also FAILs check 2 — even if you got the answer, "who they asked" doesn't tell you *why the wall blocked the upgrade*. Disposition: cut it, or replace with "What was the wall?" (open) + "What would have gotten you past it?" (open) — both unpredictable and load-bearing.

**PASS.** Same `purpose`. Draft question: *single_select* — "What was the main thing that stopped you from upgrading?" options `{price · missing capability · still evaluating · solved it another way · changed priorities · other}` + opt-out. Predicted distribution: "genuinely spread — price and 'missing capability' likely lead but neither dominates past ~40%; 'still evaluating' is a real chunk." → **PASS check 1** (discriminates). **PASS check 2** (the answer routes the follow-up and is directly the research goal). **PASS check 3** (framed at exactly the churn-driver level the research is about). Keep it; pair with an open "tell us more about that" follow-up.

---

## Scoring rubric (0–100, informational)

The Phase-4 reviewer also computes a single 0–100 composite as a **progress signal** for the refinement loop — it lets the loop and the user see "did iteration 2 actually improve things" at a glance. **It never gates the loop.** Loop exit is *categorical*: zero product-fit FAILs **and** zero blocker-severity methodology findings, **or** the 2-iteration cap — the composite score is reported alongside but is not a threshold.

**Eight dimensions, weights sum to 100:**

| Dimension | Weight | What it scores |
|---|---|---|
| product-fit | **30** | the three binary checks above + the survey-wide coverage check (a single product-fit FAIL is a large deduction here) |
| structure / funnel | **15** | general→specific order, screening first, demographics last, signposting, no clustered hard items |
| length vs. budget | **10** | `estimated_minutes` vs. `time_budget_min`; question count vs. `max_questions` |
| mode fit | **10** | type mix matches `mode` (generative→open-heavy, evaluative→closed-comparable) |
| scale balance | **10** | balanced scales, labeled poles/midpoint, separate opt-out, construct-specific (not agree/disagree) |
| accessibility | **10** | label-adjacent controls, text progress, no color-only meaning, mobile-first, keyboard/SR |
| ethics / PII | **10** | consent before collection, anonymous≠confidential honesty, PII minimization, opt-outs on sensitive items |
| intro / consent | **5** | sponsor/purpose/accurate-time/what's-collected/voluntary + the persuasive WIIFM line (see §1 intro guidance) |

**Per-dimension deduction sizes** (applied to that dimension's sub-score, before weighting):

| Finding severity in a dimension | Deduction off that dimension |
|---|---|
| `blocker` | −60% (large) |
| `should-fix` | −25% (medium) |
| `nit` | −8% (small) |

Multiple findings in one dimension compound multiplicatively (`(1−d₁)(1−d₂)…`), floored at 0. A product-fit FAIL on any question counts as a `blocker` for the product-fit dimension.

**Composite formula:** `composite = round( Σ over dimensions [ weight_d × (1 − total_deduction_d) ] )`. Example: a survey with one product-fit FAIL (product-fit dim → 30 × 0.40 = 12), one `should-fix` scale issue (scale-balance → 10 × 0.75 = 7.5), everything else clean → composite = 12 + 15 + 10 + 10 + 7.5 + 10 + 10 + 5 ≈ **80**. The number is informational only — the loop keeps going because there's a product-fit FAIL, not because 80 < some bar; it would stop at the same 80 if that FAIL were instead, say, a coverage gap the user accepted.

---

## 1. Survey structure & flow

**Intro / consent screen.** State sponsor, purpose, an *accurate* completion-time estimate, what's collected / how it's used / how it's stored, whether responses are anonymous or merely confidential (do not conflate — see §11), that participation is voluntary and can be stopped, and a contact. For research, require an affirmative consent action before any data is collected.

**Persuasive respondent-motivation (WIIFM) line — required.** The generated `intro.text` MUST include one sentence that gives the respondent a concrete reason to spend the time — *what changes as a result of their answers*, framed for *this* audience, and kept **honest**: no fake scarcity ("only 10 spots!"), no fake urgency, no overclaiming impact you can't deliver. When `survey.json :: intro.response_impact` is stated (the Phase-2 intake variable — "what happens to the responses / what does the audience get out of it"), build the WIIFM sentence from it ("your answers decide which onboarding gaps we fix first this quarter"). When `response_impact` is `null`, the WIIFM sentence is a *benefit-framed restatement of `purpose`* ("we're figuring out which gaps actually block people like you") and MUST NOT assert a downstream action that wasn't stated. A bare "your answers help us improve" is not a WIIFM line — it's the absence of one; the Phase-4 reviewer's intro/consent dimension flags that absence as a `should-fix` finding.

**Funnel order: general → specific.** Specific items prime general ones (contrast effect — Pew: asking presidential approval before "satisfaction with the country" pushed the dissatisfied share 78% → 88%). Warm up with easy, interesting, low-effort, non-sensitive items. A common Pew pattern: an open "most important problem" question before the related closed items. Narrow as you go.

**Screening / qualifying first.** Eligibility and routing questions go up front (the one exception to "demographics last"). Keep screeners short and neutrally worded so respondents can't game them; don't reveal which answer qualifies; avoid over-screening (it biases the sample toward higher-education respondents).

**Group by topic; signpost transitions.** Cluster related items, label section transitions, and put any instruction immediately before the question it governs (Dillman). Use item-in-a-series / matrix layouts sparingly.

**Ordering effects to watch.** *Contrast* (specific-before-general makes respondents mentally exclude the specific topic). *Assimilation* (consecutive similar items pull toward consistency — Pew: "Should Democrats work with Republicans?" before the reverse moved agreement 66% → 81%). *Priming* (a preamble or example sets a frame the next item inherits). Don't cluster the hard items together.

**Sensitive / demographic items last** (unless used for screening or routing). **Closing:** an optional open-ended catch-all ("Anything else you'd like to tell us?"), then a thank-you screen.

---

## 2. Question types — and when to use each

Map to the `survey.json` `type` enum (see `SKILL.md` §schema). Brief decision guidance:

| Type (`survey.json`) | Use when | Watch out for |
|---|---|---|
| `open_short` / `open_long` | Discovery; surfacing the respondent's own vocabulary / JTBD; "biggest problem" before closed items | Costly to analyze; *under-reports* vs. a prompted list (Pew: economy named by 35% unprompted vs. 58% when listed). Build the closed list from pilot open answers. Give length guidance; don't ask for essays. |
| `single_select` | One attitude / category; MECE options (~4–5 for attitudinal) | Include an opt-out / "Other". |
| `multi_select` ("select all that apply") | Low-stakes quick scan only | Lower data quality — satisficing, ambiguous blanks ("no" vs. "didn't read"). When per-item prevalence matters, use a `forced_choice_grid` (Yes/No per item) instead. Randomize options if you do use it. |
| `forced_choice_grid` | Accurate per-item prevalence / endorsement; replaces "select all that apply" | Still a grid — keep rows ≤ 5–7. |
| `rating` (Likert / semantic differential) | A construct measured on a scale; prefer construct-specific anchors over agree/disagree | See §3 on points, labels, balance, midpoint, opt-out. |
| `nps` | "How likely are you to recommend?" 0–10 (promoters 9–10, passives 7–8, detractors 0–6; NPS = %P − %D) | Single-item — don't over-interpret. Pair with an open follow-up ("What's the main reason for your score?"). |
| `dichotomous` (Yes/No) | Genuine binaries, eligibility, the cells of a forced-choice grid | Add "Don't know" when uncertainty is plausible; don't use a binary where "usually" is the honest answer (see anti-pattern C8). |
| `ranking` | Relative preference over a *short* list (≤ 5–7) | Cognitively heavy; beyond ~7 items the tail is noise. Consider "pick your top 3" or MaxDiff instead. |
| `matrix` | Compact rating of several rows on a shared scale | Top cause of straightlining and break-offs — keep rows ≤ 5–7, split if longer, randomize rows, one item per screen on mobile. |
| `constant_sum` | Forcing explicit trade-offs ("allocate 100 points across…") | Demanding; small item count; show a running total vs. the target. |
| `statement` | Display-only text — section intro, instructions, transitions | No control; not a question. |

Star ratings are quick but coarse (ceiling effects). Sliders are interactive but have starting-position bias and mobile non-response risk — handle "untouched" explicitly; provide an accessible alternative.

---

## 3. Scale design

- **Odd points (5 / 7 / 9):** the midpoint is genuine neutrality — use when "no opinion / neutral" is a legitimate real-world stance. **5-point** = best default for general / customer audiences; **7-point** = more reliability for nuanced / employee research; **> 7** = diminishing returns.
- **Even points (4 / 6, forced choice):** forces a lean — use *only* when you deliberately want to push respondents off the fence (a go/no-go, a recommendation decision). Caveat: removing the midpoint does not make ambivalent people informed — usually better to keep the odd scale *and* add a separate, visually-offset "Don't know" / "N/A".
- **Always label the poles** (and the midpoint on odd scales). Fully verbal labels aid interpretation. Endpoint intensity matters: extreme labels ("Extremely satisfied") produce a peaked distribution; moderate labels ("Very satisfied") get people to actually use the extremes.
- **Provide an opt-out** — "N/A" / "Don't know" / "Prefer not to answer" / "None" — and do *not* bundle several opt-outs into one option; visually separate it from the scale itself.
- **Balanced scales:** equal number of positive and negative options, with roughly equivalent intensity on each side (no "Outstanding / Excellent / Very good / Good / Fair").
- **Direction & consistency:** logical order, consistent within the survey; numeric 0–10 runs low-to-high left-to-right; reverse the scale for a random half of the sample to distribute primacy/recency if the instrument is long.
- **Acquiescence:** avoid agree/disagree batteries. Use construct-specific options ("How easy was X? Very easy … Very difficult") or a forced choice between two competing statements. If you must use a battery, mix reverse-coded items.

---

## 4. Length & burden

- **Target < 5 minutes** for general audiences (≈ 10–15 questions is the email/web sweet spot). Quality and completion degrade past ~10–15 minutes; **> 12 minutes ≈ 3× the drop-off** of a sub-5-minute survey. In-app / intercept / microsurveys: **1–3 questions** (ideally 1–2) in context.
- **Burden is psychological** — respondents judge length by the *number* of questions and perceived effort, not the actual clock time. Don't pad. Don't use a graphical bar that crawls early (it can *increase* drop-off).
- **Drop-off curve:** ~85% completion for a 1-question micro; ~83% for 1–3; falls with each added question, steepest early.
- **Progress indicator:** prefer text "**Question X of Y**" (screen-reader-friendly; see §10) over a graphical bar — and state the total up front. Don't show a "% complete" bar when heavy skip logic makes the denominator misleading.
- **Pagination:** one question per page on mobile; logical section breaks; one-per-page also helps screen readers and skip logic, at the cost of more clicks.

**Time budgeting in this skill.** `survey.json` carries `time_budget_min` (target) and `estimated_minutes` (Σ per-question cost using the constants in `SKILL.md`). If the estimate exceeds the budget (or `max_questions` if set), trim — keep screening and the highest-value items, cut nice-to-haves — *before* rendering. If the user insists on keeping over-budget items, the Phase-9 summary must prominently flag the expected over-run and drop-off risk.

---

## 5. Sampling & audience

Define the target audience precisely *first* — role, tenure, usage, geography, plan tier — because the screener and quota logic flow from it. Screeners: short, up front, neutrally worded, don't reveal the qualifying answer, don't over-screen. Quotas: cell quotas (N per segment or proportional), close cells as they fill, decide interlocking vs. marginal in advance, track during fielding. Sample size is driven by the precision needed on the key estimates plus any subgroup analysis; size the *invite* list to absorb break-off and disqualification.

The skill takes `audience` as a variable; if it can't be confidently inferred from context it is asked once (the rare free-form question). The `audience` shapes the screener, the language level, the recall windows, and which demographic items (if any) are warranted.

---

## 6. Generative vs. evaluative — decide before you design

| | **Generative / discovery** | **Evaluative / validation** |
|---|---|---|
| Question | "What problems exist? What's the landscape? What vocabulary do people use?" | "How well does X work? Is hypothesis H true? How big is the effect?" |
| Question-type mix | Heavy `open_long` / `open_short` + broad items; closed items are exploratory, not confirmatory | Heavy closed-ended, comparable, quantitative — `single_select`, `rating`, `nps`, `forced_choice_grid` |
| Structure | Minimal pre-imposed structure; goal = breadth, surfacing the unknown | Tight, hypothesis-targeted; pre-defined options for cross-respondent comparison + stats |
| Randomization | Randomize/rotate to explore | Freeze wording / order / context and hold constant across waves for comparability |
| Caveat | Surveys are a *weak* primary tool for generative work — use them to size and prioritize themes that interviews surfaced | Wording/order/context effects must be locked; benchmark, A/B-test wording on random halves |

**`hybrid` mode** (the skill's default when genuinely ambiguous): a generative section (open "what happened in your own words") *then* an evaluative section (structured read on the usual suspects). The skill picks the type mix per section accordingly; the closing optional open catch-all is always present.

---

## 7. Reducing bias & error

- **Question-order randomization** for independent blocks where no logical sequence is required — spreads order/context bias.
- **Answer-option randomization / rotation** for nominal lists — counters primacy (visual / self-administered) and recency (aural / phone). *Never* randomize an ordered scale; you may reverse it for a random half.
- **Avoid priming** — no loaded preambles; general before specific.
- **Social-desirability mitigation:** self-administered modes reduce it; word sensitive items non-judgmentally; *normalize* the undesirable answer ("Many people don't get around to … did you happen to …?"); offer several low/none options; offer "Prefer not to answer". Known: respondents under-report alcohol / drug use / tax evasion / prejudice and over-report voting / church attendance / charity / exercise.
- **Satisficing / straightlining:** designing it *out* (shorter, fewer grids, varied question types, plain language) matters more than detecting it. If you detect: 2+ short attention checks (instructed-response items), flag speeders (time vs. a realistic floor), flag straightliners (low/zero variance down a grid), flag inconsistent reverse-coded pairs — treat each as one indicator, not the sole gate; pre-register exclusion rules (aggressive exclusion correlates with demographics).
- **Recall bias / timeframe anchoring:** don't ask "how often do you *usually* …" — anchor to a concrete recent window ("In the past 7 days, approximately how many times …"), use "approximately" plus ranges, use shorter windows for frequent/mundane events. Never ask people to predict their own future behavior.

---

## 8. Writing the questions

- **Plain language** — phrase it as you'd ask aloud; target the vocabulary of the least-educated respondent; no jargon / acronyms / double negatives.
- **One concept per question** — split "easy *and* intuitive", split "domestic *and* foreign policy". An "and"/"or" joining two ideas in the stem is a suspected double-barrel.
- **Concrete & specific** — ambiguous "regularly" / "recently" / "this area" / "good value" must be defined or replaced. Word choice swings results (Pew: support for "military action in Iraq" 68% → 43% when "even if it meant thousands of U.S. casualties" was added; "welfare" vs. "assistance to the poor"). A/B-test wording on random halves when the stakes are high.
- **MECE answer options** — no overlapping ranges ("20–29" / "30–39", not "20–30" / "30–40"); cover every plausible answer or include "Other (please specify)" plus an opt-out.
- **Consistent time references** — the same window across related items; state it in the stem.
- **Avoid hypotheticals** — "Would you use X if we built it?" / "How likely are you to …?" are unreliable; reframe to past behavior, current needs, or revealed preference.
- **Neutral / non-leading** — no pleading wording, no loaded premises, balanced options.
- **Respectful / inclusive** — current demographic terminology; gender beyond binary plus "prefer not to say"; objective phrasing for conditions and behaviors.

---

## 9. Pre-testing / piloting (what this skill approximates — and what it does not)

Real sequence: (1) expert review (3–5 reviewers); (2) cognitive interviews with target users (think-aloud / probing); (3) revise; (4) soft launch / field pilot; (5) analyze and iterate; (6) full launch. Cognitive-interview sampling: 5–10 per round; 5–7 catch ~75–85% of major problems; iteration beats size (three rounds of ~5 with revisions > one round of 15). Soft launch: ~50–100 responses or 5–10% of target (whichever is smaller); check completion rate, drop-off points, item non-response, straightlining, time-to-complete, skip-logic correctness, and whether the open answers reveal missing closed options. Also pilot the plumbing (device/browser rendering, skip logic, quotas, export, randomization).

**The skill's Phase-4 reviewer pass** ≈ the expert-review step (an automated rubric walk). **The skill's Phase-6 simulated-respondent pass** ≈ a *heuristic stand-in* for cognitive interviews — it walks the survey as a persona and flags friction, confusion, comprehension gaps, and time pressure. Neither replaces real cognitive interviews or a real soft launch; the skill states this near the simulation results (it's a Non-Goal to replace fielded pretesting).

---

## 10. Accessibility & mobile-first

- **Mobile-first:** design for small screens first; one question (or a small group) per screen; reformat wide matrices per-item; large tap targets; minimal typing (prefer choices); thumb-reachable; no horizontal scroll; test on real devices.
- **WCAG 2.1 AA:** radio/checkbox immediately adjacent to its label, with proper label association; don't rely on a graphical progress bar — use "Question X of Y" and state the total up front; self-paced (no timeouts); text equivalents / alt text / transcripts for any images in questions or answers; sufficient color contrast and never encode meaning in color alone; keyboard-navigable with a logical focus order; works with screen readers and zoom; sliders are problematic for keyboard / screen-reader users — provide an accessible alternative or ARIA.
- Run the platform's accessibility checker; manually test with a screen reader and keyboard-only.

The skill's rendered `preview.html` follows these: label-adjacent controls, ≥ 4.5:1 contrast, visible focus, text "Question X of Y" (no graphical-only bar), keyboard navigation.

---

## 11. Ethics / consent / PII

- **Informed consent** — a plain-language statement *before* data collection: who you are, the purpose, what's collected, how it's used / stored, retention, who sees it, that it's voluntary and can be stopped, any risks, incentive terms, and a contact. For research, require an affirmative action.
- **Anonymous vs. confidential** — distinct; don't conflate. *Anonymous* = responses cannot be linked to identity by anyone — do not promise it if you collect email / IP / account ID / device fingerprint. *Confidential* = identity is known but protected and not disclosed ("your manager will not see individual answers"). If `survey.json` sets `intro.anonymous: true`, the survey must not contain any question that collects a direct identifier.
- **PII minimization** — collect the minimum necessary; avoid identifiers you won't use in the analysis; if you must collect PII, justify it, store it separately / encrypted, restrict access, set a retention/deletion schedule, and anonymize/aggregate for analysis and sharing. Use bands (age range, not date of birth).
- **Regulatory:** GDPR (consent freely given / specific / informed / unambiguous, by affirmative action; data-subject rights to access and deletion; plain-language notices); CCPA/CPRA (disclosure and opt-out obligations).
- **Sensitive topics** (health, finances, sexuality, immigration, illegal behavior, protected characteristics): make them optional, offer "Prefer not to answer", and consider whether you need them at all.

---

## Sources

- Pew Research Center — *Writing Survey Questions* (https://www.pewresearch.org/writing-survey-questions/) — wording effects, open vs. closed, question-order, acquiescence, randomization, sensitive topics, with worked % examples.
- Pew Research Center — *U.S. Survey Methodology* (https://www.pewresearch.org/u-s-survey-methodology/) — questionnaire development as a collaborative, iterative process; mode effects on trends.
- Krosnick & Presser, *Question and Questionnaire Design* (Handbook of Survey Research) — scale points, labeling, acquiescence, satisficing, forced-choice vs. select-all, ordering. (https://web.stanford.edu/dept/communication/faculty/krosnick/docs/2010/2010%20Handbook%20of%20Survey%20Research.pdf)
- Dillman, Smyth & Christian, *Internet, Phone, Mail, and Mixed-Mode Surveys: The Tailored Design Method* (4th ed.) — minimizing burden, instruction placement, item-in-a-series, mode-tailored design.
- Groves, Fowler, Couper, Lepkowski, Singer & Tourangeau, *Survey Methodology* (2nd ed.) — the Total Survey Error framework.
- AAPOR — *Best Practices* (https://aapor.org/standards-and-ethics/best-practices/) — sampling, pretesting, disclosure, ethics.
- Nielsen Norman Group — *Writing Good Survey Questions: 10 Best Practices* (https://www.nngroup.com/articles/survey-best-practices/); *Keep Online Surveys Short* (https://www.nngroup.com/articles/keep-online-surveys-short/); *Which UX Research Methods?* (https://www.nngroup.com/articles/which-ux-research-methods/).
- SurveyMonkey — *Survey completion rates* (https://www.surveymonkey.com/curiosity/survey_questions_and_completion_rates/); *Likert scales* (https://www.surveymonkey.com/learn/survey-best-practices/likert-scale/).
- Qualtrics — *Question Types Overview* (https://www.qualtrics.com/support/survey-platform/survey-module/editing-questions/question-types-guide/question-types-overview/).
- MeasuringU — *15 Common Rating Scales Explained* (https://measuringu.com/rating-scales/); *SATA vs. yes/no forced choice* (https://measuringu.com/sata-vs-yes-no-forced-choice/).
- Conjointly — *Semantic differential questions* (https://conjointly.com/guides/semantic-differential-question/).
- CloudResearch — *Identifying & handling invalid survey responses* (https://www.cloudresearch.com/resources/guides/ultimate-guide-to-survey-data-quality/how-to-identify-handle-invalid-survey-responses/).
- Kantar — *Attention check questions* (https://www.kantar.com/north-america/inspiration/research-services/attention-check-questions-pf).
- ISR / University of Michigan — *Cognitive Interviewing* (https://ccsg.isr.umich.edu/chapters/pretesting/cognitive-interviewing/); Blair & Conrad on cognitive-interview pretesting sample size (https://academic.oup.com/poq/article-abstract/75/4/636/1821509).
- W3C WAI — *Mobile Accessibility* (https://www.w3.org/WAI/standards-guidelines/mobile/) + WCAG 2.1 AA; Qualtrics — *Check Survey Accessibility* (https://www.qualtrics.com/support/survey-platform/survey-module/survey-tools/check-survey-accessibility/).
- User Interviews — *The UX researcher's guide to GDPR* (https://www.userinterviews.com/blog/the-user-researchers-guide-to-gdpr); CiviCom — *Anonymity vs. confidentiality* (https://www.civicommrs.com/maintaining-privacy-anonymity-confidentiality-in-research/).
- UserTesting / Dovetail — generative vs. evaluative research (https://www.usertesting.com/blog/generative-vs-evaluation-research, https://dovetail.com/blog/generative-evaluative-research/).
- Userpilot — in-app microsurvey best practices (https://userpilot.com/blog/microsurveys-saas-product/, https://userpilot.com/blog/in-app-survey-design-best-practices/).
- Survicate — survey length vs. completion (https://survicate.com/blog/how-many-questions-should-surveys-have/, https://survicate.com/blog/survey-completion-rate/).
