# Survey question anti-patterns — catalog

Loaded on demand by `/survey-design`. **Two consumers:**

1. **The generator (Phase 3)** must produce *none* of these — when it writes `survey.json` it self-checks every stem and option set against the detection heuristics below.
2. **The reviewer subagent (Phase 4)** walks each question against these heuristics and reports any match as a structured finding (`target`, `severity`, `defect`, `message`, `proposed_fix`).

Each entry has a uniform block: **category**, **harm** (why the data is biased or unusable), **BAD example**, **FIXED example**, and a **detection heuristic** (the concrete keyword / structure signal to look for). Thresholds (e.g. "≤ 7 grid rows", "≤ 5–7 ranked items", "≤ 30-day recall for routine events") are rules of thumb — the reviewer should phrase borderline cases as "likely too many / confirm intent", not a hard fail. Always pretest; a static rubric complements, it does not replace, cognitive interviews and a soft launch.

Category bands: **A** = question-stem framing defects · **B** = respondent-capability violations · **C** = response-option defects · **D** = format & cognitive-load bias · **E** = structure, length & logic.

## Contents

- A. Question-stem framing defects · B. Respondent-capability violations
- C. Response-option defects · D. Format & cognitive-load bias · E. Structure, length & logic

---

## A. Question-stem framing defects

### A1 — Leading question
- **category:** framing / bias
- **harm:** Steers the respondent toward a particular answer; you measure the wording, not the opinion.
- **BAD:** "How short was Napoleon?" / "Should concerned parents use infant car seats?"
- **FIXED:** "How would you describe Napoleon's height?" / "Do you think infant car seats should be required for infant passengers?"
- **detection heuristic:** Flag evaluative adjectives/adverbs in the stem ("short", "concerned", "generous", "excessive", "easy", "great"); flag any phrasing that names only one side of an issue.

### A2 — Loaded question / presupposition
- **category:** framing / bias
- **harm:** Embeds an assumption the respondent may not share; to answer at all they must accept the premise ("Have you stopped …?").
- **BAD:** "Where do you enjoy drinking beer?" / "What do you like most about our new dashboard?"
- **FIXED:** Add a screening/filter question first (with skip logic) or neutralize: "Have you used the dashboard? If yes, what is your overall impression of it?"
- **detection heuristic:** Does the stem assert a fact (a behavior, feeling, prior usage, or shared value) *before* asking the question? Look for "our excellent …", "since you enjoy …", "what do you like about …".

### A3 — "Don't you agree …" / rhetorical pressure
- **category:** framing / bias (leading + acquiescence)
- **harm:** Signals the "correct" answer; acquiescence compounds it.
- **BAD:** "Don't you agree that our checkout process is easy to use?"
- **FIXED:** "How easy or difficult was the checkout process?" (balanced: very easy → very difficult).
- **detection heuristic:** Flag stems starting "Don't you …", "Wouldn't you say …", "Isn't it true that …", or "Most people think X — do you?"

### A4 — Emotionally charged / loaded wording
- **category:** framing / bias
- **harm:** Affect-laden terms ("suicide", "slaughter", "handout", "freedom") move responses by framing alone.
- **BAD:** "Do you support doctors helping terminally ill patients commit suicide?"
- **FIXED:** "Do you favor or oppose allowing doctors to give terminally ill patients the means to end their lives?" (and A/B-test both wordings).
- **detection heuristic:** Flag strongly-connotated terms where a neutral synonym exists; flag asymmetric framing ("favor" without "or oppose").

### A5 — Double-barreled question
- **category:** structure
- **harm:** Two distinct asks in one item; a respondent who feels differently about each can't answer; the result is uninterpretable.
- **BAD:** "How satisfied are you with the pay and benefits of your job?" / "How much confidence do you have in the President to handle domestic and foreign policy?" / "Was the textbook useful for students and young professionals?"
- **FIXED:** Split into separate items (one for pay, one for benefits; one for domestic, one for foreign policy).
- **detection heuristic:** Flag "and"/"or" joining two concepts, objects, time periods, or audiences in the stem — any "X and Y" where someone could rate X high and Y low.

### A6 — Double negative / confusing negation
- **category:** clarity
- **harm:** Cognitive load and misreads; a "yes" may mean the opposite of what the respondent intended.
- **BAD:** "Do you oppose not allowing employees to work from home?" / "Congress should not fail to act."
- **FIXED:** "Do you think employees should be allowed to work from home?"
- **detection heuristic:** Flag ≥ 2 negations ("not", "no", "never", "oppose", "fail", "prohibit", "without", "un-") in one sentence; flag "not un-" constructions.

### A7 — Ambiguous / undefined terms
- **category:** clarity
- **harm:** Respondents silently interpret the same words differently, so the answers aren't comparable.
- **BAD:** "How often do you exercise?" / "Was the room clean?" (clean vs. spotless?)
- **FIXED:** Define it in the stem: "In a typical week, how many days do you do at least 30 minutes of moderate physical activity (e.g., brisk walking, cycling)?"
- **detection heuristic:** Flag any key noun or verb that three people could define three ways ("regularly", "household", "income", "use", "recently"); require an inline definition or example.

### A8 — Jargon / acronyms / insider language
- **category:** clarity
- **harm:** Respondents who don't know the term guess or drop out; the sample skews toward insiders.
- **BAD:** "How satisfied are you with our NPS and CSAT touchpoints?" / "Do you own a tablet PC?"
- **FIXED:** Plain language plus examples: "Do you own a tablet, such as an iPad or Android tablet?"
- **detection heuristic:** Flag acronyms not expanded on first use; flag domain / product / feature terms with no gloss; run a reading-level check.

---

## B. Respondent-capability violations

### B1 — Assumes knowledge / experience the respondent may lack
- **category:** capability / presupposition
- **harm:** Respondents who never used the thing answer anyway (to be agreeable) — non-attitudes get recorded as attitudes.
- **BAD:** "How satisfied are you with our new dashboard?" (asked of everyone).
- **FIXED:** Gate it: "Have you used the new dashboard in the past 30 days?" → if yes, "How satisfied are you with it?" with an explicit "Haven't used it" backstop.
- **detection heuristic:** Does the stem assume usage / awareness / possession? Is there a screening question and/or an "I haven't used this / not familiar" option? If not, flag.

### B2 — Recall / memory overload
- **category:** capability
- **harm:** Respondents can't accurately recall distant or high-frequency mundane events; the precision is fabricated; longer recall periods produce larger, biased error.
- **BAD:** "How many times did you visit our website in the last 12 months?" / "How much did you spend on groceries last year?"
- **FIXED:** Shorten the reference period and/or coarsen: "In the past 7 days, how many times did you visit our website?" or use bands ("0 / 1–2 / 3–5 / 6+").
- **detection heuristic:** Flag exact-count questions about frequent/mundane behaviors; flag reference periods longer than ~30 days for routine events or ~12 months for salient ones; prefer bands over open numeric for recalled counts.

### B3 — Asking for precision the respondent can't give
- **category:** capability
- **harm:** "Best-guess" precision masquerades as data; respondents anchor on round numbers or quit.
- **BAD:** "What percentage of your work time is spent in meetings?" / "How many emails did you receive yesterday?"
- **FIXED:** Use ranges or a coarse scale: "Roughly how much of your work time is spent in meetings? (None / A little — under 25% / Some — 25–50% / A lot — over 50%)."
- **detection heuristic:** Flag requests for percentages, exact counts of hard-to-track items, dollar figures to the dollar, or "how many minutes" — unless the respondent plausibly keeps a record.

### B4 — Hypotheticals / future-prediction
- **category:** capability / validity
- **harm:** Stated intentions (especially purchase intent) are weak predictors; respondents over-claim interest; the real-decision context is absent.
- **BAD:** "Would you buy this product if we launched it?" / "Would you use a feature that did X?"
- **FIXED:** Anchor to past behavior / revealed preference: "In the past 6 months, have you bought a product like this? Which one?" — or if you must ask intent, add price/effort and a calibrated scale ("definitely will / probably will / might or might not / probably won't / definitely won't") and treat it as directional only.
- **detection heuristic:** Flag "Would you …", "If we built …, would you …", "How likely are you to [future action]" without realistic constraints; flag any decision being made on raw intent data.

---

## C. Response-option defects

### C1 — Unbalanced response scale
- **category:** scale design
- **harm:** More positive than negative options (or stronger positive anchors) pulls the mean up — the scale is itself leading.
- **BAD:** "Outstanding / Excellent / Very good / Good / Fair" (four positive, one weak low).
- **FIXED:** Symmetric: "Very satisfied / Satisfied / Neither satisfied nor dissatisfied / Dissatisfied / Very dissatisfied."
- **detection heuristic:** Count positive vs. negative options — they must match in number and roughly in intensity; flag asymmetric anchor strength (an "unbalanced" set).

### C2 — Missing midpoint when neutrality is real
- **category:** scale design
- **harm:** Forces genuinely neutral respondents to pick a side — random noise; inflates apparent extremity.
- **BAD:** "Satisfied / Somewhat satisfied / Somewhat dissatisfied / Dissatisfied" (no neutral) for an attitude many people are genuinely neutral on.
- **FIXED:** Add "Neither satisfied nor dissatisfied" (plus "No opinion / Not applicable" as a *separate* option if applicable).
- **detection heuristic:** Is neutral a meaningful real-world stance for this item? If yes and there's no midpoint, flag.

### C3 — Unwanted midpoint / forced fence-sitting
- **category:** scale design
- **harm:** When you need a direction (a go/no-go, a recommendation), a midpoint becomes a satisficing dump.
- **BAD:** A 5-point agree scale with "Neither agree nor disagree" for "I would recommend this to a colleague" when the business needs a lean.
- **FIXED:** An even-numbered scale to force a lean — or keep the odd scale deliberately. (Judgment call — flag only when the survey's stated purpose requires direction.)
- **detection heuristic:** If the survey's goal is directional and the scale has a soft midpoint, raise it as a trade-off to confirm.

### C4 — Overlapping / non-mutually-exclusive ranges
- **category:** options
- **harm:** Respondents at a boundary don't know which bucket to pick; results can't be cleanly bucketed.
- **BAD:** "0–10 / 10–20 / 20–30 / 30+" (10 and 20 each appear twice).
- **FIXED:** "0–9 / 10–19 / 20–29 / 30 or more."
- **detection heuristic:** Scan numeric bands for shared endpoints; verify every value maps to exactly one bucket.

### C5 — Non-exhaustive options / missing "Other" / "None" / "N/A" / "Don't know"
- **category:** options
- **harm:** Respondents whose true answer isn't listed pick the "closest" wrong option or abandon — fabricated, biased distribution.
- **BAD:** "Which browser do you use? Chrome / Safari / Firefox" (no Edge, no "Other", no "I don't know").
- **FIXED:** Add "Other (please specify) ___" and, where relevant, "None of these" / "Not applicable" / "Don't know" as *distinct* options.
- **detection heuristic:** Could a real respondent's honest answer be absent? Is there an escape hatch (an opt-out)? Are "None" / "N/A" / "Don't know" conflated when they mean different things? Flag.

### C6 — Question / answer-scale mismatch
- **category:** structure
- **harm:** The stem asks one thing and the options measure another; respondents re-map (inconsistently) or answer the wrong question.
- **BAD:** Stem "How often do you use feature X?" with options "Strongly agree / Agree / Disagree / Strongly disagree."
- **FIXED:** Match the dimension: a frequency stem → frequency options ("Daily / A few times a week / A few times a month / Rarely / Never").
- **detection heuristic:** Does the option set's dimension (frequency / agreement / satisfaction / likelihood / quantity) match the stem's verb? If not, flag.

### C7 — Vague quantifiers in options (or stem)
- **category:** clarity / options
- **harm:** "Often" / "sometimes" / "regularly" / "occasionally" mean wildly different frequencies to different people — uncomparable data.
- **BAD:** "How often do you use it? Always / Often / Sometimes / Rarely / Never."
- **FIXED:** Anchor to time: "Every day / 3–6 days a week / 1–2 days a week / Less than weekly / Never" (calibrate the buckets to the behavior's cadence).
- **detection heuristic:** Flag adverbial frequency labels with no numeric anchor; flag "a few" / "several" / "many" used as response options.

### C8 — Absolutes forcing a false choice
- **category:** framing / options
- **harm:** "Always / never / all / every / ever" plus Yes/No leaves no room for the common "usually" reality; few can honestly say yes, so the behavior is under-detected.
- **BAD:** "Do you always read the terms before agreeing? (Yes / No)"
- **FIXED:** "How often do you read the terms before agreeing? (Always / Most of the time / About half the time / Occasionally / Never)."
- **detection heuristic:** Flag universal quantifiers ("always", "never", "all", "every", "everyone", "none", "ever") in the stem, especially paired with a binary answer set.

---

## D. Format & cognitive-load bias

### D1 — Acquiescence bias (agree/disagree format)
- **category:** format bias
- **harm:** People — especially less-educated, less-engaged, or fatigued respondents (Pew) — tend to agree regardless of content; "agree" is the low-effort default.
- **BAD:** "Agree or disagree: 'The new layout is easy to navigate.'"
- **FIXED:** Rewrite item-specific / forced-choice: "How easy or difficult is the new layout to navigate? (Very easy … Very difficult)" — or present two competing statements and ask which is closer to the respondent's view.
- **detection heuristic:** Flag any "[statement] — agree / disagree" battery; recommend conversion to construct-specific scales or a forced choice between alternatives.

### D2 — Social-desirability triggers
- **category:** response bias
- **harm:** Over-reporting of "good" behavior (voting, exercise, donations, recycling) and under-reporting of "bad" (drinking, drug use, prejudice, skipping work); the stem's framing signals what's approved.
- **BAD:** "How often do you exercise to stay healthy?" / "Do you always recycle?"
- **FIXED:** Normalize the full range and lower the stakes: "Some people exercise regularly, others rarely or never. In the past 7 days, on how many days did you exercise for at least 30 minutes?"; for sensitive topics prefer a self-administered mode and acknowledge the barrier ("Did things come up that kept you from voting, or did you happen to vote?").
- **detection heuristic:** Flag stems that moralize ("to stay healthy", "to do your part"); flag sensitive behaviors asked bluntly with no face-saving framing or "haven't / didn't" option built into the scale.

### D3 — Order / priming effects baked into wording (or sequence)
- **category:** context
- **harm:** An earlier item primes a frame that distorts a later one (assimilation = consistency pressure; contrast = differentiation). Within an item, an example or preamble primes a category.
- **BAD:** "How worried are you about data breaches?" immediately before "How do you feel about our new data-sharing feature?" / a preamble that lists only downsides before the question.
- **FIXED:** Separate sensitive / priming items; general before specific when measuring overall sentiment; randomize where order shouldn't matter; keep preambles neutral and minimal.
- **detection heuristic:** Look at adjacent items — does one establish a frame (worry, value, comparison) the next inherits? Does an item's lead-in nudge toward certain answers? Flag and recommend reorder/randomize.

### D4 — Option-order effects (primacy / recency)
- **category:** format bias
- **harm:** Self-administered surveys → primacy (top option over-chosen); phone → recency. A fixed order systematically biases which option wins.
- **BAD:** A long brand / feature list always shown in the same order, with no randomization noted.
- **FIXED:** Randomize (or reverse for half the sample) for non-ordinal lists; keep ordinal scales in logical order but consider reversing for half in a long instrument.
- **detection heuristic:** Flag long non-ordinal lists with no randomization noted; flag ordinal scales presented in only one direction in a long instrument.

### D5 — Matrix / grid overload & straight-lining
- **category:** format bias
- **harm:** Big grids invite picking one column straight down the page; missing data and break-offs rise with visual complexity; straight-lining is largely a design failure.
- **BAD:** A 15-row × 7-column agree/disagree matrix on one screen.
- **FIXED:** Break it into ≤ 5–7-row blocks; vary item polarity to defeat auto-pilot; one item per screen on mobile; use attention checks sparingly.
- **detection heuristic:** Flag matrices with more than ~7 rows or ~5 columns; flag all-positively-worded rows; flag multiple large grids in sequence.

### D6 — "Select all that apply" pitfalls vs. forced-choice yes/no
- **category:** format
- **harm:** "Select all" (CATA) produces lower endorsement than asking yes/no per item — respondents satisfice and stop scanning; a non-selection is ambiguous ("no" vs. "didn't read it").
- **BAD:** "Which of these features have you used? [select all that apply]" when accurate prevalence matters.
- **FIXED:** For each feature, "Have you used [feature]? Yes / No" — this forces consideration of every item and disambiguates blanks. Reserve "select all that apply" for low-stakes quick-scan contexts.
- **detection heuristic:** Flag "select all that apply" used where you need per-item prevalence; recommend a forced-choice grid.

### D7 — Ranking too many items
- **category:** format / capability
- **harm:** People reliably rank only a handful; beyond ~5–7 items they guess at the tail, so the lower ranks are noise.
- **BAD:** "Rank these 12 features from most to least important."
- **FIXED:** Pick the top 3 (or MaxDiff, or a "most important" + "least important" pick), or rank a shortlist of ≤ 5.
- **detection heuristic:** Flag rank-order tasks with more than ~5–7 items; recommend top-N or MaxDiff.

---

## E. Structure, length & logic

### E1 — Compound stems / long preambles / buried instructions
- **category:** cognitive load
- **harm:** Long lead-ins and mid-sentence instructions get skimmed; the load amplifies satisficing and acquiescence; respondents answer a question they didn't fully parse.
- **BAD:** "Given that our company has recently undergone a major reorganization and launched several new initiatives across multiple regions, and bearing in mind your own role, please rate, on a scale where 1 is low and 5 is high, but only if you've been here over a year, how supported you feel."
- **FIXED:** Screen for tenure first; then "How supported do you feel in your role? (1 = not at all supported … 5 = fully supported)." Put any instruction on its own line before the question.
- **detection heuristic:** Flag stems longer than ~20–25 words, subordinate clauses stacking conditions, instructions buried after the question or mid-sentence.

### E2 — Biased or missing reference period
- **category:** clarity / structure
- **harm:** No timeframe → each respondent picks their own → uncomparable answers. A loaded period ("during the holidays, when service is slowest") biases recall.
- **BAD:** "How satisfied have you been with our support?" (no period) / "How was support during our recent outage?" (a cherry-picked bad window).
- **FIXED:** "Thinking about your experience with our support in the past 3 months, how satisfied are you?" — a neutral, explicit, fixed window.
- **detection heuristic:** Flag any retrospective or frequency question with no reference period; flag reference periods chosen to coincide with unusually good or bad conditions.

### E3 — Forced answers / no opt-out
- **category:** ethics / data quality
- **harm:** Required questions with no "Prefer not to say" / "Don't know" / "N/A" → respondents fabricate or abandon; biases the sample toward the compliant and toward those who have an opinion.
- **BAD:** A mandatory income question; a mandatory "How satisfied are you with feature X?" with no "haven't used it" option.
- **FIXED:** Make sensitive items optional, or always include "Prefer not to say" / "Don't know" / "Not applicable" as selectable options (an opt-out); reserve "required" for genuinely essential, low-sensitivity items.
- **detection heuristic:** Flag required questions on sensitive topics (income, health, demographics, politics) lacking an opt-out; flag attitude/usage questions marked required with no "don't know / haven't used" option.

### E4 — Branching mistakes / no skip logic
- **category:** structure / logic
- **harm:** Respondents get irrelevant questions (e.g. rate a product they said they don't own) → frustration, break-offs, meaningless data; or a relevant follow-up is skipped for everyone.
- **BAD:** "Do you own a car? No." → next question: "How satisfied are you with your car's fuel economy?"
- **FIXED:** Add skip logic — non-owners bypass the car-specific items; owners get the follow-ups; pipe prior answers ("the [brand] you mentioned …").
- **detection heuristic:** Trace each path — does a "No" / "Never" / "N/A" answer ever lead to a question presupposing the opposite? Are filter questions wired to their downstream items? Flag any orphaned follow-up.

### E5 — Pseudo-anonymity claims / unnecessary PII
- **category:** ethics / trust
- **harm:** Claiming "anonymous" while collecting email / IP / employee ID, or asking for PII not needed for the analysis, suppresses honest answers and erodes trust → social-desirability spikes, response rate drops, data-protection liability.
- **BAD:** "This survey is completely anonymous." [then] "Please enter your work email so we can follow up." / asking full date of birth when an age band would do.
- **FIXED:** Either truly anonymize (collect no identifiers; say "confidential" not "anonymous" if you *can* re-identify) or be transparent ("Your responses are confidential; your manager will not see individual answers"); collect only the PII the analysis requires; use bands (an age range, not a date of birth).
- **detection heuristic:** Flag the word "anonymous" if any identifier (email, name, ID, IP, identifying free-text) is also collected; flag PII fields not used by any stated analysis goal; flag exact DOB / full address / SSN-like fields unless clearly justified.

### E6 — Non-attitude harvesting / no "Don't know" on knowledge or opinion items
- **category:** capability / options
- **harm:** On topics respondents know nothing about, omitting "Don't know / No opinion" manufactures opinion data out of noise.
- **BAD:** "Do you approve or disapprove of the Bricker Amendment?" with only Approve / Disapprove.
- **FIXED:** Include "Don't know / No opinion"; consider a prior filter ("Have you heard of …?").
- **detection heuristic:** For opinion or knowledge questions on niche / technical topics, is "Don't know / No opinion" offered? If not, flag.

---

## Sources

- Pew Research Center — *Writing Survey Questions* (https://www.pewresearch.org/writing-survey-questions/) — double-barreled, loaded wording, double negatives, jargon, agree/disagree → acquiescence, response-order + randomization, question-order effects, social desirability, open vs. closed, "pretest everything".
- Pew Research Center — *When online survey respondents only select some that apply* (https://www.pewresearch.org/methods/2019/05/09/when-online-survey-respondents-only-select-some-that-apply/) — CATA yields lower endorsement than forced-choice yes/no.
- Qualtrics — *Double-barreled question* (https://www.qualtrics.com/articles/strategy-research/double-barreled-question/); *Survey bias* / *Response bias* (https://www.qualtrics.com/articles/strategy-research/survey-bias/, https://www.qualtrics.com/articles/strategy-research/response-bias/); *Avoiding the yes bias* (https://www.qualtrics.com/articles/strategy-research/avoiding-the-yes-bias/).
- SurveyMonkey — *5 common survey mistakes that ruin your data* (https://www.surveymonkey.com/learn/survey-best-practices/5-common-survey-mistakes-ruin-your-data/); *Likert scale questions and mistakes to avoid* (https://www.surveymonkey.com/learn/survey-best-practices/likert-scale-questions-and-mistakes-to-avoid/); *How to avoid common types of survey bias* (https://www.surveymonkey.com/learn/survey-best-practices/how-to-avoid-common-types-survey-bias/); *Good survey questions* (https://www.surveymonkey.com/curiosity/good-survey-questions/).
- MeasuringU — *15 Common Rating Scales Explained* (https://measuringu.com/rating-scales/); *SATA vs. yes/no forced choice* (https://measuringu.com/sata-vs-yes-no-forced-choice/); Sauro & Lewis survey-design walkthrough (https://measuringu.com/wp-content/uploads/2020/11/SurveyDesign_Hulu2020.pdf).
- ISR / University of Michigan — Total Survey Error and recall-period trade-offs (https://psm.isr.umich.edu/descriptions, https://www.src.isr.umich.edu/research-themes/methodology/); Bradburn on recall-period bias (https://www.bls.gov/cex/methwrkshp_pap_bradburn.pdf); recall-length vs. accuracy (https://www.sciencedirect.com/science/article/pii/S0167629614000083, https://pubmed.ncbi.nlm.nih.gov/18667254/).
- *Designing Effective Questions and Questionnaires* (https://viva.pressbooks.pub/sociology-research-methods/chapter/13-3-designing-effective-questions-and-questionnaires/) — academic checklist: clarity, double-barreled, leading, negative wording, MECE options, fence-sitting, question order.
- OpinionX — *Survey straightlining* (https://www.opinionx.co/blog/survey-straightlining); NIH PMC — grid visual complexity → break-offs / missing data / straight-lining (https://pmc.ncbi.nlm.nih.gov/articles/PMC4172361/).
- Wikipedia — *Social-desirability bias* (https://en.wikipedia.org/wiki/Social-desirability_bias).
- Stantcheva — *How to Run Surveys* (https://www.nber.org/system/files/working_papers/w30527/w30527.pdf) — wording, ordering/priming, attention checks, avoiding non-attitudes.
- CUNY Queens College — *Survey best practices* checklist (https://www.qc.cuny.edu/oie/assessment/survey-best-practices/); Caroline Jarrett / Effortmark — *Likert and rating scales* (https://www.effortmark.co.uk/surveys/surveysthatwork-the-book-and-extras/spotlight-h-likert-and-rating-scales/).
- Kantar — *Attention check questions* (https://www.kantar.com/north-america/inspiration/research-services/attention-check-questions-pf).
