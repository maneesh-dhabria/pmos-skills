# Polish rubric — 15 built-in checks

> This rubric is the **enforcement** of `_shared/writing-principles.md` — the author-time prose principles every pmos artifact-emitting skill writes to. Each check below polices one or more of those principles; when a principle changes there, update its check here (and vice-versa).

Checks are numbered 1–14 with check 6 split into 6a/6b (= 15 checks). Each returns `pass` or `fail` plus cited spans. No subjective scoring.

**Detection skips locked zones.** Never run any check against text inside code fences, frontmatter, link URLs, footnote refs, short table cells (<8 words), Notion non-prose placeholders, or — for HTML inputs — tags/attributes, `<script>`/`<style>`/`<pre>`/`<code>` contents, HTML comments, and the `<head>`.

## Implementation modes

| Mode         | Used for checks            | Notes                                                                       |
|--------------|----------------------------|------------------------------------------------------------------------------|
| `regex`      | 1, 5, 6a, 8, 9, 10         | Deterministic; literal pattern match                                        |
| `script`     | 2, 3, 11                   | Deterministic; verdict computed from `scripts/metrics.js` output — the judge never does the arithmetic |
| `llm-judge`  | 4, 6b, 7, 12, 13, 14       | Strict pass/fail prompt with cited evidence required                        |

**Script-mode protocol:** run `node scripts/metrics.js <working-doc>` once per rubric pass; compare the named metric against the active threshold. The script's header documents its heuristic precision limits — thresholds carry slack for them. On a FAIL, citations come from the script output where it provides them (checks 3, 11); check 2 makes one judge call to *cite* the strongest offending sentences (judgment), never to recompute the percentage (arithmetic).

## Local vs global

| Scope  | Checks                                  | Where re-runs happen                                                  |
|--------|-----------------------------------------|------------------------------------------------------------------------|
| Local  | 1, 5, 6a, 6b, 8, 9, 10, 13              | Per-patch QA on patched span                                          |
| Global | 2, 3, 4, 7, 11, 12, 14                  | Once per iteration on whole doc (Phase 7)                             |

## Risk

| Risk      | Checks                                                  | Phase 6 behavior                                          |
|-----------|---------------------------------------------------------|-----------------------------------------------------------|
| Low-risk  | 1, 5, 6a, 6b, 9, 10                                     | Auto-apply silently; aggregate count in summary           |
| High-risk | 2, 3, 4, 7, 8, 11, 12, 13, 14                           | Surface as individual findings via `AskUserQuestion`      |

Check 8 is regex-*detected* but high-risk-*surfaced*: its patch deletes a claim ("It's not just a tool, it's a workflow." → "It's a workflow."), which is meaning-altering, not mechanical.

## LLM-judge contract

Determinism comes from structure, not sampling parameters. Every llm-judge call:
- Output schema: `{verdict: "pass" | "fail", cited_spans: [{line: int, excerpt: string}], rationale: string}`
- A `fail` with empty `cited_spans` is treated as `pass` (no evidence → no action).

---

## Checks

### Check 1 — Clutter words (regex, local, low-risk)

**Pattern:**
```
(?i)\b(very|really|just|quite|actually|basically|simply|in order to|the fact that|due to the fact that|at this point in time)\b
```

**Patch hint:** delete the word; if the sentence breaks, restructure minimally. "in order to" → "to". "due to the fact that" → "because". "the fact that" → drop.

### Check 2 — Passive voice ratio (script, global, high-risk)

**Verdict:** `passive.pct` from `scripts/metrics.js`. PASS if `passive.pct ≤ {passive_max_pct}` (or `pct` is `null` — no sentences). FAIL otherwise.

**Citations:** one judge call, given the doc and the script's `passive.examples`, cites up to 5 of the *strongest* passive-voice sentences as `cited_spans` (it may pick better examples than the heuristic flagged, but the verdict is already decided). Rationale reports the script's percentage and the threshold. No judge → cite `passive.examples` directly.

### Check 3 — Sentence length variance (script, global, high-risk)

**Verdict:** `sentences.worst_window.stddev` from `scripts/metrics.js` — the most monotone ~200-word run of contiguous prose. PASS if `stddev ≥ {sentence_stddev_min}`, or if `worst_window` is `null` (<200 prose words — too small to measure rhythm). FAIL otherwise.

**Citations:** the window's `first_sentence` and `last_sentence` from the script output — no judge call. Rationale reports stddev and threshold.

### Check 4 — Throat-clearing intro (llm-judge, global, high-risk)

**Prompt template:**
```
Examine the first paragraph. FAIL if it contains any throat-clearing phrase (e.g., "In today's...", "In the modern...", "As we all know", "It is important to note", "Before we begin") OR if it runs more than 3 sentences before stating the document's central claim.
Cite the throat-clearing sentence(s) in cited_spans. Rationale: which pattern triggered, and where the actual lede appears.
```

### Check 5 — Em-dash overuse (regex + count, local, low-risk)

**Pattern:** count `—` (U+2014) occurrences. `fail` if `count > em_dash_per_200w_max × (polishable_words / 200)`.

**Patch hint:** replace with comma, period, or parenthesis as the rhythm allows. Preserve at most one em-dash per 200 words.

### Check 6a — AI-vocabulary hard-bans (regex, local, low-risk)

**Pattern:**
```
(?i)\b(delve|tapestry|navigate the landscape|embark on a journey|in the realm of|intricate tapestry)\b
```

**Patch hint:** rewrite the sentence to drop the word entirely. Don't substitute another word — these phrases signal lazy writing; the sentence usually improves with the metaphor removed.

> The ban list is time-bound (2023–24 slop vocabulary). As slop vocabulary shifts, extend it per-user via `~/.pmos/polish/custom-checks.yaml` rather than editing this file.

### Check 6b — AI-vocabulary soft-flags (llm-judge, local, low-risk)

**Prompt template:**
```
Find each occurrence of the words: robust, foster, ecosystem, holistic, leverage, seamless, intricate, multifaceted.
For each occurrence, judge: is it used CONCRETELY (e.g., "robust error handling" — load-bearing, specific) or METAPHORICALLY (e.g., "robust framework for thinking" — vague, decorative)?
PASS if all occurrences are concrete. FAIL if any are metaphorical.
Cite metaphorical uses in cited_spans. Rationale: list each metaphorical use with a one-sentence explanation.
```

**Patch hint:** rewrite to a concrete alternative or delete the modifier.

### Check 7 — Tricolon overuse (llm-judge, global, high-risk)

**Prompt template:**
```
Count rhetorical "X, Y, and Z" triplets used for emphasis (NOT genuine three-item lists like "apples, oranges, and bananas"). PASS if count ≤ {tricolon_max_per_500w} per 500 words. FAIL otherwise.
Cite the strongest examples in cited_spans. Rationale: report count, density, and threshold.
```

### Check 8 — "Not just X, it's Y" rhetoric (regex, local, high-risk)

**Pattern:**
```
(?i)\bnot just\b[^.!?]{1,80}\b(?:it'?s|it is|but)\b
```

**Patch hint:** replace with a direct claim. "It's not just a tool, it's a workflow." → "It's a workflow." The rewrite deletes the concession claim — surfaced, never auto-applied (see Risk above).

### Check 9 — Hedging stack (regex, local, low-risk)

**Detection algorithm:** for each sentence, count occurrences of `(?i)\b(might|could|perhaps|possibly|may|somewhat|fairly|rather)\b`. `fail` if ANY sentence has 2 or more matches.

**Patch hint:** keep at most one hedge per sentence, or drop them all if the claim is sound.

### Check 10 — Empty transitions (regex, local, low-risk)

**Pattern (paragraph-start, count occurrences):**
```
(?im)^(Furthermore|Moreover|Additionally|In addition|That said)\b
```

`fail` if total count >1.

**Patch hint:** delete the transition. Paragraphs should connect via content, not connectors.

### Check 11 — Header inflation (script, global, high-risk)

**Verdict:** from `scripts/metrics.js` `headings` output. FAIL if either:
(a) `max_depth > 3`, OR
(b) `avg_words_per_section < {section_min_words_per_heading}` (skip this criterion when `avg_words_per_section` is `null` — no headings).

**Citations:** the script's `deepest` headings and `shortest_sections` — no judge call. Rationale reports max depth + avg words/section vs threshold.

### Check 12 — Bullet abuse (llm-judge, global, high-risk)

**Prompt template:**
```
Find any bulleted list where >50% of bullets are full sentences that flow naturally into each other (i.e., prose was warranted instead of bullets).
PASS if no such list exists. FAIL otherwise.
Cite the offending lists in cited_spans. Rationale: explain why prose would serve better.
```

### Check 13 — Vague abstractions (llm-judge, local, high-risk)

**Prompt template:**
```
Find any paragraph that asserts a claim without grounding it in a concrete noun, number, name, or example within 3 sentences.
PASS if every claim is grounded. FAIL otherwise.
Cite the abstract paragraphs in cited_spans. Rationale: state what each is missing.
```

### Check 14 — Weak / buried lede (llm-judge, global, high-risk)

**Prompt template:**
```
Examine the first paragraph. FAIL if it does not state the document's central claim (Bottom Line Up Front).
Cite the actual lede location (later in the doc) in cited_spans. Rationale: explain what the central claim is and where it currently appears.
```

---

## Custom checks

User-defined checks loaded from `~/.pmos/polish/custom-checks.yaml` (or `--checks <path>`) are appended to the rubric. They:
- Default to **high-risk** unless they declare `risk: low`
- May restrict themselves to specific presets via `applies_to_presets`
- `regex` mode: use the `pattern` field
- `prompt` mode: use `prompt_text`; /polish wraps it in the LLM-judge contract automatically
