# Reviewer rubric — /primer

## Contents

- R1: cites-real-urls
- R2: no-plagiarism
- R3: no-hand-wavy-claims
- R4: covers-ground
- R5: right-reading-level
- R6: structurally-complete
- R7: sections-json-ids-match
- R8: audience-vocab
- R9: flags-uncertainty
- R10: primer-shaped

This rubric is inlined verbatim into the Phase-5 reviewer subagent prompt. The reviewer makes no edits — it scores. Each check returns one JSON object: `{check_id, verdict: 'pass'|'fail', evidence: '<≤2-line excerpt or pointer>', quote: '<≥40-char verbatim substring of the draft>'}`. Output contract details below.

Tier convention (D-RUBRIC): **trust** checks are mechanically verifiable (URL match, structural match, citation present) — failures hard-fail the run. **taste** checks are subjective quality (reading level, voice, uncertainty handling) — failures surface as known-risk with a user override gate.

### R1: cites-real-urls

- **Tier:** trust
- **Pass criterion:** every inline `<a href="X">` URL X in the draft appears as a verbatim string in `sources.json[].url`. ≥1 mismatch = fail.
- **Evidence shape:** the offending URL + the H2 section it appears under (e.g., `href="https://example.com/blog/foo" under H2 "Why it matters"`).
- **Quote requirement:** ≥40-char verbatim substring of the draft containing the offending anchor. Example: `According to <a href="https://example.com/blog/foo">recent research</a>, teams that…`
- **Fail example:** an `<a href="https://medium.com/@author/invented-post">` whose URL does not appear in any `sources.json` entry.

### R2: no-plagiarism

- **Tier:** trust
- **Pass criterion:** any text copied verbatim from a source is wrapped in `<blockquote>` with an inline citation; paraphrases reword the source rather than lifting sentences. ≥1 unattributed verbatim run of ≥15 consecutive words = fail.
- **Evidence shape:** the unattributed run + the source it was lifted from (by `sources.json` id).
- **Quote requirement:** ≥40-char verbatim substring of the draft containing the unattributed copy. Example: `Product discovery is the work of deciding what to build, and it is fundamentally different from delivery.`
- **Fail example:** a 20-word sentence lifted word-for-word from a Marty Cagan post with no `<blockquote>` and no citation link.

### R3: no-hand-wavy-claims

- **Tier:** trust
- **Pass criterion:** any empirical claim (percentages, "studies show", "most teams", "research finds") either (a) carries an inline `<a href=...>` citation to a `sources.json` URL, or (b) is explicitly qualified as anecdote ("anecdotally", "in our experience", "we've observed"). Unsupported, unqualified empirical claim = fail.
- **Evidence shape:** the offending claim + the H2 section it appears under.
- **Quote requirement:** ≥40-char verbatim substring of the draft containing the claim. Example: `Studies show that 73% of product teams ship features nobody uses, costing the industry billions.`
- **Fail example:** "Research finds that most PMs spend less than 10% of their time on discovery." — no citation, no qualifier.

### R4: covers-ground

- **Tier:** taste
- **Pass criterion:** every H2/H3 declared in the outline has a body of ≥3 sentences of substantive content. Sections that are 1 sentence, a "TBD" placeholder, or only a bullet list with no prose = fail.
- **Evidence shape:** the underweight H2/H3 heading + its current body length (e.g., `H2 "Common pitfalls" → 1 sentence`).
- **Quote requirement:** ≥40-char verbatim substring of the draft spanning the heading and its thin body. Example: `<h2>Common pitfalls</h2><p>There are many pitfalls to watch out for.</p>`
- **Fail example:** an H2 whose entire body is `<p>TBD — expand later.</p>` or a single declarative sentence.

### R5: right-reading-level

- **Tier:** taste
- **Pass criterion:** vocabulary and sentence complexity match the resolved audience preset. For `senior-pms`: industry shorthand assumed (e.g., "RICE", "discovery vs delivery"). For `all-pms`: 9th-grade-equivalent prose, no unexplained jargon, sentences ≤25 words on average. Sustained mismatch (≥3 paragraphs off-register) = fail.
- **Evidence shape:** the off-register passage + which preset is active + which way it misses.
- **Quote requirement:** ≥40-char verbatim substring of the off-register passage. Example: `The orthogonality of the discovery-delivery dichotomy obviates conventional waterfall epistemics.`
- **Fail example:** an `all-pms` draft using "orthogonality", "epistemics", and "dichotomy" in one paragraph without definition.

### R6: structurally-complete

- **Tier:** trust
- **Pass criterion:** the set of H2 headings in the draft equals the set of H2 headings declared in the outline — same count, same titles, same order. Missing H2, extra H2, or reordered H2 = fail.
- **Evidence shape:** the diff between outline H2 list and draft H2 list (missing + extra).
- **Quote requirement:** ≥40-char verbatim substring of the draft showing the offending region (e.g., the extra H2 or the gap where a missing one should be). Example: `<h2 id="bonus-tips">Bonus tips not in the outline</h2>`
- **Fail example:** outline declares 5 H2s; draft has 6 (one was invented during writing) or 4 (one was dropped).

### R7: sections-json-ids-match

- **Tier:** trust
- **Pass criterion:** every `<h2 id="...">` in the draft has a matching entry in `sections.json` with the same `id`, and the count of H2 ids in the draft equals the count of entries in `sections.json`. Any id-set mismatch = fail.
- **Evidence shape:** the diff between draft H2 ids and `sections.json` ids (missing + extra) + the counts.
- **Quote requirement:** ≥40-char verbatim substring of the draft containing an offending H2 tag. Example: `<h2 id="why-it-matters">Why it matters for senior PMs</h2>`
- **Fail example:** draft contains `<h2 id="why-it-matters">` but `sections.json` has the entry id `why-this-matters` — id-set differs by one.

### R8: audience-vocab

- **Tier:** taste
- **Pass criterion:** term-of-art handling matches the resolved preset. For `all-pms`: each domain term-of-art is defined on first use (parenthetical or short clause). For `senior-pms`: terms-of-art appear without definition (assumed known); definitions of basic terms are a fail signal (condescension). ≥2 violations of the preset's convention = fail.
- **Evidence shape:** the offending term + first-use location + which convention was violated.
- **Quote requirement:** ≥40-char verbatim substring of the draft containing the first use. Example: `Use a RICE score (Reach × Impact × Confidence ÷ Effort, a common prioritization framework) to rank…` in a `senior-pms` draft.
- **Fail example:** in a `senior-pms` draft, defining "MVP" and "north-star metric" inline as if the reader is new.

### R9: flags-uncertainty

- **Tier:** taste
- **Pass criterion:** topics that are genuinely contested (e.g., "OKRs vs north-star metrics", "product trios vs PM-led teams") or rapidly evolving (e.g., "AI-assisted PM tooling in 2026") carry an explicit marker — phrases like "this is contested", "practitioners disagree", "rapidly evolving", "still being figured out". Stating one camp's view as settled fact when ≥2 cited sources disagree = fail.
- **Evidence shape:** the contested claim + the disagreeing source ids from `sources.json`.
- **Quote requirement:** ≥40-char verbatim substring of the draft containing the unflagged claim. Example: `Product trios are the right operating model for every team building software in 2026.`
- **Fail example:** asserting "OKRs are the correct goal-setting framework" when two cited sources argue against OKRs and none are flagged as a counterview.

### R10: primer-shaped

- **Tier:** taste
- **Pass criterion:** the draft reads as a curator — it **selects** what's worth knowing, **frames** the landscape, and **attributes** views to named sources/practitioners. It does not argue a single thesis or push the author's POV. Sustained first-person advocacy ("I believe", "my view is", "the right answer is X") for >1 paragraph at a stretch = fail.
- **Evidence shape:** the advocacy passage + the H2 it appears under + which sources were available but not contrasted.
- **Quote requirement:** ≥40-char verbatim substring of the draft containing the advocacy passage. Example: `I strongly believe that continuous discovery is the only correct way to do product management, full stop.`
- **Fail example:** an entire H2 section that argues one framework is correct and dismisses alternatives, rather than presenting the landscape with attribution.
- **Informational fields (new in v0.2.0).** The R10 object additionally returns two fields used by the orchestrator at the Phase-5 write gate; neither affects the R10 verdict:
  - `examples_per_h2_distribution: [{h2_id, h2_title, count}]` — count of named-company / named-product / named-incident mentions plus any sentence prefixed `"Hypothetical: "` per H2 section. The orchestrator surfaces a one-line note at the write gate when ≥30% of H2s have `count == 0`. Per S-FR-6.2.
  - `word_count: <int>` — actual draft word count. The orchestrator surfaces a one-line note at the write gate when this falls outside the resolved depth tier's target range (brief 2,000–3,000 / standard 4,000–6,000 / deep 7,000–10,000). Per S-FR-8.7.

## Output contract

- Reviewer returns one JSON array, exactly 10 objects, one per check_id above. The check_id set must equal the rubric's set — orchestrator hard-fails on mismatch (FR-44).
- Per FR-8.2 / FR-43: a fail whose `quote` field is empty or not a verbatim substring of the draft is **treated as pass** by the orchestrator (defense against hallucinated quotes).
- Trust-tier fails (R1, R2, R3, R6, R7) hard-fail the run and require a re-draft. Taste-tier fails (R4, R5, R8, R9, R10) surface as known-risk and gate on explicit user override.
