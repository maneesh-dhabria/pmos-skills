# Editorial reduction pass (Phase 3)

## Contents

- (1) Resolving the reduction target — the `--reduce` flag / the gate
- (2) Editor subagent prompt template
- (3) Validation & prune (orchestrator)
- (4) Rewriter subagent prompt template
- (5) Capped re-critique
- (6) HTML fidelity (best-effort + warn)
- (7) `--dry-run`
- (8) Chunking interplay
- (9) Budget & metrics

The editorial pass runs **after** preset selection (Phase 2) and **before** the binary rubric (Phase 4). It is **opt-in** — the default is Skip. Its output document (the *reduced doc* if the pass ran, else the ingested doc unchanged) becomes the working document for Phase 4 onward. **The editorial pass is not a polish iteration** — it runs once (plus at most one capped re-critique), independent of the Phase 7 two-iteration rubric cap.

Two subagents: an **editor** (critiques → `editor_notes.json`, never rewrites) and a **rewriter** (applies the notes → reduced doc). When no subagent tool is available, run both sequentially in the main agent — same behavior.

## (1) Resolving the reduction target

1. `--reduce <value>` flag present (or an NL equivalent like "shorten this by ~30%" was parsed into it) → parse `<value>` as a single percent (`25` → `{kind: point, low: 25, high: 25}`) or a `low-high` range (`30-40` → `{kind: range, low: 30, high: 40}`). Valid only if `0 < low <= high <= 90`. Malformed → print `--reduce: invalid value '<v>'; skipping the editorial pass` and treat as **Skip** (do NOT abort, do NOT prompt). When `--reduce` is present the Phase 3 gate is **not** shown (parallels `--preset` suppressing the Phase 2 prompt).
2. Otherwise, `AskUserQuestion` (this gate **has a Recommended option — do NOT add a `<!-- defer-only: -->` tag**; it auto-picks Skip in `--non-interactive`):
   ```
   question: "Run an editorial reduction pass before polishing? Target reduction:"
   options:
     - "Skip — no reduction (Recommended)"   # → no-op
     - "~10-20% (light trim)"                # → {kind: range, low: 10, high: 20}
     - "~30-40% (substantial cut)"           # → {kind: range, low: 30, high: 40}
     - "~50%+ (aggressive)"                  # → {kind: point, low: 50, high: 50}; rewriter cuts as much as it safely can, >= 50% if possible
   ```
   An out-of-options / "Other" reply is treated as a custom target, parsed by the same rule as `--reduce`; unparseable → Skip-with-note.
3. **Skip** (or unparseable custom, or malformed `--reduce`) ⇒ **no-op**: no subagents dispatched, no `editor_notes.json` written, the ingested doc is the working doc, Phase 4+ is byte-for-byte today's behavior. Phase 8's `Editorial pass:` summary line reads `skipped`.

Platform fallback (no `AskUserQuestion`): state the assumption — "no `--reduce` flag → skipping the editorial pass" — and proceed. The editor pass is opt-in, so the safe fallback is Skip.

## (2) Editor subagent prompt template

Dispatch with: the verbatim ingested doc (chunked on `#`/`##` markdown headings or `<h1>`/`<h2>` HTML headings if polishable words >= 4,000 — one editor call per chunk, notes merged), the Phase 1 voice markers, the lock-zone byte-range map, `doc_format`, and the parsed target.

```
You are a ruthless developmental editor. Your job is to identify every opportunity to make
this document shorter and tighter WITHOUT changing its meaning, claims, or the author's voice.
You do NOT rewrite anything — you only produce structured notes.

DOC FORMAT: <markdown | html>
VOICE MARKERS (anchored to the original doc — the rewriter must preserve these):
<voice marker JSON from Phase 1>
LOCKED ZONES (byte ranges that must stay byte-identical — you may NOT target any span that intersects these):
<lock-zone map>
REDUCTION TARGET: <e.g. "30-40%"> of the polishable word count (<N> words).

DOCUMENT:
<verbatim document text>

Produce a JSON object ONLY, conforming to schemas/editor-notes.schema.json:
- "doc_format", "target" (echo what you were given).
- "notes": an array. For each opportunity, one note:
    - "id": "E1", "E2", ... sequential.
    - "kind": one of rephrase | merge | reorder | tighten | cut.
        cut      = delete a span outright (filler, throat-clearing, redundant restatement).
        tighten  = shorten a span in place (wordy → terse), same content.
        rephrase = reword for clarity (may save 0 words).
        merge    = combine adjacent sentences/paragraphs.
        reorder  = move a span (e.g. surface a buried lede, reorder sections).
    - "locator": { "heading_path": [enclosing headings, outermost first], "quote": "<a verbatim substring of the document, >= 20 chars, enough to locate it unambiguously>" }. NO line numbers.
    - "rationale": one sentence — why this edit.
    - "est_words_saved": integer >= 0 (may be 0 for rephrase).
    - "risk": "low" or "high". reorder is ALWAYS high. A merge spanning more than two adjacent paragraphs is high. cuts/tightens/rephrases that stay within one paragraph are low.
- "reconciliation": { "estimated_pct": <sum of est_words_saved / polishable_words * 100>, "achievable": <does that reach the target band without touching locked content or destroying meaning?>, "note": "<one sentence — e.g. 'doc is 60% code blocks; max safe prose cut ~18%'>" }.

CONSTRAINTS:
- Never target a span inside a locked zone.
- Never propose changing a technical/factual claim, a number, a name, a citation, or anything the author asserts as true. Flag-and-leave is not your job here (the rubric does that) — just don't touch them.
- Every "quote" must be a verbatim, contiguous substring of the document.

Output: the JSON object, nothing else.
```

## (3) Validation & prune (orchestrator, before the rewriter runs)

1. Validate the editor's output against `schemas/editor-notes.schema.json`. On a schema error: print the offending entries and proceed with the entries that *do* validate (same "print and continue" rule as custom-checks — never silently swallow).
2. Drop any `cut` or `tighten` note whose `locator.quote` is empty or **not a verbatim substring** of the source document (no evidence → no action — the same rule the rubric applies to `cited_spans`).
3. Write `editor_notes.json` next to the run's other artifacts (the directory the polished file would go in, or cwd for URL/Notion/inline inputs). Written even on `--dry-run`.

## (4) Rewriter subagent prompt template

Dispatch after validation/prune with: the verbatim original ingested doc, the pruned `editor_notes.json`, the voice markers, the lock-zone map, `doc_format`.

```
You are a prose editor applying a pre-approved set of editorial notes to a document.
Apply ONLY the notes marked "risk": "low". Do not touch anything else. Preserve the author's voice markers.

DOC FORMAT: <markdown | html>
VOICE MARKERS (preserve these):
<voice marker JSON>
LOCKED ZONES (must stay byte-identical — never edit inside these):
<lock-zone map>

EDITOR NOTES (apply the risk=low ones):
<editor_notes.json>

DOCUMENT:
<verbatim original document>

For each risk=low note:
- Locate the span via locator.heading_path + locator.quote. If the quote is not a verbatim
  substring within that heading context, SKIP the note (log: "skipped: quote not found").
- If applying the note would touch a locked zone, SKIP it (log: "skipped: intersects locked zone").
- Otherwise apply the edit (cut / tighten / rephrase / merge as the kind says).
- If applying a low-risk note would force a voice-marker violation, do NOT apply it — emit:
    PRESERVE_VOICE_CONFLICT
    {"conflicting_marker": "<one of: avg_sentence_length | sentence_length_stddev | register | person | idiomatic_phrases | contraction_rate>", "reason": "<one sentence>"}
  for that note (it becomes a high-risk finding — see reference/patch-contract.md for the shape).
- Do NOT apply any "risk": "high" note — leave those spans untouched.

For HTML docs: only ever change text between tags (element bodies). Never change a tag, an
attribute, a comment, <script>/<style>/<pre>/<code> contents, or the <head>.

Output:
1. The full rewritten document.
2. An applied/skipped log — one line per note: "<id>: applied" | "<id>: skipped: <reason>" | "<id>: voice-conflict".
```

High-risk notes are **not** auto-applied. The orchestrator surfaces each via the **Phase 6 findings protocol** (`reference/findings-protocol.md`): each as a high-risk finding ("Fix as proposed / Modify / Skip / Defer"); structural reorders are individually surfaced per the existing "Structural changes" rule. Approved high-risk notes are then applied (a short second rewriter call scoped to those notes, or applied inline). A rewriter `PRESERVE_VOICE_CONFLICT` is promoted to a high-risk finding exactly like a patch-pass conflict (`reference/patch-contract.md`).

## (5) Capped re-critique (GR-3)

After the rewriter's first pass, compute `actual_pct = (orig_polishable_words - reduced_polishable_words) / orig_polishable_words * 100`. If `actual_pct < target.low` **and the editor has not already re-critiqued** (cap = 1):

1. Dispatch the editor subagent once more, given the rewriter's output, the applied/skipped log, and the shortfall (target band, actual %, words still to cut). It returns a **delta** `editor_notes.json` — new notes only, ids continuing the sequence; append them to the existing file and set `recritique: {ran: true, shortfall_pct: <target.low - actual_pct>}`.
2. Run the rewriter once more on the delta notes only.
3. Done — whatever `actual_pct` ends up at, the pass is complete; the pipeline proceeds. Never loop further.

(If `actual_pct >= target.low` after the first pass, `recritique: {ran: false, shortfall_pct: null}`.)

## (6) HTML fidelity (GR-1)

The rewriter changes only text-node bytes inside prose elements; the orchestrator holds the lock-zone byte-range map. After the rewrite, reconstruct the document by splicing the new prose text into the original byte stream at the recorded prose ranges, then diff every byte *outside* those ranges against the original.

- Diff empty → the HTML is exact; proceed normally.
- Diff non-empty → keep the output anyway (**best-effort HTML + warn**): Phase 8's summary and the chat output carry `⚠ markup outside prose nodes may have shifted — review before replacing`, and the replace prompt is shown with **no default-yes**. Never refuse, never hard-fail.

## (7) `--dry-run`

`--dry-run` + a non-Skip target: the editor subagent runs and `editor_notes.json` is written; the re-critique does **not** run (no rewriter output to measure); the rewriter does **not** run. Phase 5 stops as it does today; the dry-run report includes the editor notes + the reconciliation summary above the rubric results. Phase 8's `Editorial pass:` line reads `dry-run — N notes drafted (est ~X%), not applied`.

## (8) Chunking interplay (GR-2)

When the ingested doc has >= 4,000 polishable words: the editor pass chunks (on `#`/`##` headings, or `<h1>`/`<h2>` for HTML) and reduces it; the resulting reduced doc is then **re-measured against the size thresholds** (`reference/chunking.md`) for the Phase 4 rubric / Phase 5 patch phase — it may now be small enough to skip chunking entirely. Voice markers are still sampled once, from the *original* doc, in Phase 1 — never re-sampled.

## (9) Budget & metrics

- Phase 5 budget estimate: when the editor pass produced output, include its calls in the estimate — roughly 2 (editorial critique + rewrite), 4 if a re-critique ran, 1 under `--dry-run` (editor only). The Surgical/Comprehensive shape is not introduced.
- Phase 8 metrics: the `Words:` before/after delta is anchored to the **original ingested doc** (not the reduced doc) so the headline % includes editor cut + rubric tightening. Summary line: `Editorial pass: target ~30-40% · est ~36% · actual ~33% · 19 applied / 2 skipped / 3 surfaced (2 approved)` — or `Editorial pass: skipped` / `Editorial pass: dry-run — N notes drafted (est ~X%), not applied`.
