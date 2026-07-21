## Pass 1 — reviewer findings

### critical-thinking-F1 [Should-fix] Stale "all 8" move count vs the 9 named moves
- Where: plugins/pmos-learnkit/skills/critical-thinking/reference/exercise-shapes.md:15
- Quote: "Target moves: all 8 as applicable. Strong = names assumptions, considers an alternative"
- Problem: grading-rubrics.md is titled "The 9 named moves" and lists nine (metric-selection was evidently added later), and SKILL.md line 23 also says "the 9 named moves". Shape 2 (hard-mode, the full-rubric shape) still says "all 8" — classic enumerated-set count drift. A model grading shape 2 may treat one move (most plausibly `metric-selection`, the newest) as out of scope, silently shrinking the full-rubric exercise. This is exactly the prose-only defect class no lint catches; the count should either be corrected to 9 or (better) replaced with "all named moves" so future additions can't re-ghost it.

### critical-thinking-F2 [Should-fix] No canonical muscle vocabulary — scorecard keys are free-text and will fragment
- Where: plugins/pmos-learnkit/skills/critical-thinking/reference/exercise-shapes.md:43
- Quote: "Muscle: 2nd-order effects, causal reasoning."
- Problem: the skill runs two parallel, divergently-named vocabularies for the same concept: moves (`steelman-alternatives`, `surface-assumptions`, `spot-bias`, `second-order-effects`, `reframe-question`) and muscles ("alternatives", "assumptions", "spot bias", "2nd-order effects", "problem-framing"). The mapping lives only in scattered per-shape "Muscle:" prose lines — shape 8's line above even packs two muscles into one comma-joined field, and scorecard-schema.md:48 entrenches the space-form key `"spot bias"`. `muscle_scores` keys are whatever string the model emits at runtime, and `scorecard.js update` accepts any key with zero validation (applySession, scripts/scorecard.js:76-80). Across sessions, "spot bias" / "spot-bias" / "bias" fragment into separate counters, which quietly breaks the two things the whole product is for: weakest-muscle weighting in Phase 2 and the longitudinal "see yourself improve" signal. This wants a §K one-home canonical muscle enum (ideally in scorecard-schema.md) plus a [D] key-validation gate in scorecard.js — a deterministic check that today lives nowhere. The rubric's checks would pass this skill; only vocabulary-level coherence review sees it.

### critical-thinking-F3 [Should-fix] "Brier trend" is promised but the data model cannot express a trend
- Where: plugins/pmos-learnkit/skills/critical-thinking/SKILL.md:67
- Quote: "calibration (Brier) trend if any predictions were made, and the streak."
- Problem: `calibration.predictions[]` stores flat `{p, outcome}` pairs with no date/session attribution, sessions[] does not record predictions (applySession pushes only date/band/shapes/muscles_practiced, scripts/scorecard.js:70-74), and `calibration.brier` is a single lifetime running mean. scorecard-schema.md:35 calls this "the headline \"are my probability judgments getting better\" metric" — but a lifetime mean mathematically cannot show *getting better*; early bad predictions permanently drag it, and no windowed/per-session comparison is reconstructable from what's persisted. The skill's core promise ("an accumulating per-muscle + calibration scorecard so you can see yourself improve", SKILL.md:3) is unsupported for calibration. Fix is one field: timestamp each prediction (or store per-session brier), then trend = recent-window vs lifetime.

### critical-thinking-F4 [Should-fix] Corrupt scorecard history is silently destroyed on the next update
- Where: plugins/pmos-learnkit/skills/critical-thinking/scripts/scorecard.js:49
- Quote: "process.stderr.write('scorecard: unreadable/corrupt at ' + f + ' — reseeding\\n');"
- Problem: on any parse failure or version mismatch, load() returns a fresh seed, and the next `update` atomically overwrites the corrupt file — months of practice history (the product's entire accumulated value) gone, with only a stderr line as witness. SKILL.md's Platform Adaptation deliberately mandates "never a crash", but no-crash does not require destruction: a one-line `fs.renameSync(f, f + '.corrupt')` before reseeding preserves the bytes for recovery at zero cost. For a longitudinal-progress product, silent history loss is the single worst failure mode and it's currently the designed behavior.

### critical-thinking-F5 [Nit] "reads/writes only ~/.pmos/learnkit/critical-thinking/" is contradicted by Phase 0
- Where: plugins/pmos-learnkit/skills/critical-thinking/SKILL.md:83
- Quote: "this is a standalone utility; it reads/writes only `~/.pmos/learnkit/critical-thinking/`."
- Problem: Phase 0 reads `~/.pmos/learnings.md` (line 30) and repo READMEs (line 31), and may even *write* a repo README on user approval (line 32). The "only" claim is literally false; a reader auditing the skill's filesystem footprint from this line gets the wrong answer. Soften to "persists state only under…".

### critical-thinking-F6 [Nit] Learnings loop is half-open — Phase 0 reads a file Phase 5 never says how to write
- Where: plugins/pmos-learnkit/skills/critical-thinking/SKILL.md:30
- Quote: "Read `~/.pmos/learnings.md` if present and factor any entries under the `## /critical-thinking` header"
- Problem: Phase 5 (Capture Learnings) emits exactly one `Learning:` line to chat but states no persistence path, while Phase 0 depends on `~/.pmos/learnings.md` being populated under a specific header. If an ecosystem convention (e.g. /reflect paste-back) is the writer, the skill should cite it in one clause; as written, the feedback loop the skill relies on for "recurring blind spots to probe" has no in-skill closure and a fresh reader can't tell whether Phase 5 should append to the file itself.

### critical-thinking-F7 [Nit] Schema says the scorecard is "created on first run" but `read` never persists the seed
- Where: plugins/pmos-learnkit/skills/critical-thinking/reference/scorecard-schema.md:7
- Quote: "`~/.pmos/learnkit/critical-thinking/scorecard.json` — created on first run."
- Problem: `read` seeds only in memory (load() returns seed(); nothing calls save()), so the file is actually created on the first `update` — i.e. only after a session completes Phase 4. Minor doc/behavior drift, but it misleads anyone debugging "why is there no scorecard.json after my first Phase 0 read".

**Pass 1 verdict:** 0 blockers / 4 should-fix / 3 nits — material findings

Reviewer notes: read all 6 files in full (476 lines total); ran tests/scorecard.test.js — 10/10 pass; grepped for `_shared/` citations — none exist, so no dangling cites (self-containment is appropriate for a standalone drill skill). Craft is otherwise strong: tight 96-line SKILL.md with genuine progressive disclosure, correct §J slugged phase anchors cited by slug, a proper [D]-shaped script for the arithmetic (Brier/streak) with real unit tests, well-marked non-interactive refusal, honest anti-patterns, and a description that triggers well. Product sense is sound — the skill earns its existence and complexity is proportionate. The material gaps cluster on the scorecard data model (F2/F3/F4), i.e. exactly the longitudinal-progress promise that differentiates it.
