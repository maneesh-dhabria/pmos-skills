# Cross-cutting analysis — Dimensions 5 (Flags) & 6 (Phases)

Scope: all 38 user-invocable skills in `pmos-toolkit` (32) and `pmos-learnkit` (6). Sources: every `SKILL.md` (argument-hint frontmatter + body), reference files and scripts where a flag/phase claim needed verification, and the 35 per-skill reviews (frameworks, critical-thinking, playbook had none; assessed directly). Every dead-flag and orphan-phase claim below was re-verified against the source files, not taken from the per-skill reviews on faith.

Methodology note: a naive `grep -oE '\-\-[a-z][a-z0-9-]+'` over the 38 SKILL.md files returns **~240 distinct tokens** — roughly 100 of them are *embedded-command* flags (git `--porcelain`/`--ff-only`, jq `--arg`, vercel `--prod`, child-skill invocations like spec passing `--theme/--rigor/--out/--on-failure` to /diagram, script argv like frameworks' `--query`). The inventory below is the curated **user-facing** surface. The pollution itself is a finding: skill flags and embedded-tool flags are typographically indistinguishable, so no lint can currently tell them apart.

---

# Part A — Flags

## A0. Headline numbers

| Metric | Value |
|---|---|
| Distinct user-facing flag names | **137** |
| Total flag instances (flag × skill) | **286** (214 excluding the `--non-interactive`/`--interactive` pair) |
| Flags per skill — max | **20** (`/magazine`) |
| Flags per skill — median / min | **7.5** / 1 (`/critical-thinking`) |
| Skills with only the NI pair (zero domain flags) | 3 (`/changelog`, `/creativity`, `/session-log`) |
| Verified dead flags (documented, no mechanism) | **12** (+2 phantom cross-skill flag contracts) |
| Same-concept-different-name collisions | **10** named families (§A3) |
| Flags parsed/documented but absent from argument-hint | **~25** (worst: `/plan` — 10 of its 15 flags are body-only) |
| Pocock baseline | **0** flags across his entire repo |

## A1. Global flag inventory

Legend — Hint?: ✅ in argument-hint / ❌ documented in body only / 💀 not parsed anywhere. Verdict: **keep** / **rename** / **fold-NL** (fold into natural language) / **delete-dead** / **demote** (move to reference/internal docs, mark machine-facing).

### Repo-contract flags (shared, assessed once)

| Flag | Skill(s) | Purpose | Hint? | Verdict |
|---|---|---|---|---|
| `--non-interactive` / `--interactive` | 36 skills (lint-enforced W14 block) | headless mode contract | ✅ | **keep** — enforced substrate contract, the one flag family with a real lint |
| `--format <html\|md\|both>` | 21 skills | output-format override (FR-12) | ✅ | **keep `html\|md`, purge `both`** — `both` was retired (FR-12.1) yet is still advertised in ~15 hints; it is fully inert in survey-design, survey-analyse, magazine ("reserved"), and primer (silently coerced); live only in learn-list. One flag, four behaviors. |
| `--feature <slug>` | 13 pipeline skills | feature-folder routing (`_shared/pipeline-setup.md` §B) | ✅ mostly (❌ in artifact, msf-req, readme) | **keep** — the best-behaved flag in the repo: one name, one meaning, machine-passed by /feature-sdlc. Add to the 3 missing hints. |
| `--backlog <id>` | 8 pipeline skills | backlog linkage + status write-back | ✅ | **keep** — clean cross-skill contract with /backlog |
| `--reset-defaults` | complete-dev, feature-sdlc | ignore lastrun memory | ✅ | keep (complete-dev) / keep + add to recognised-flag list (feature-sdlc) |
| `--selftest` | diagram, readme, frameworks (scripts), magazine | run packaged tests | mixed | **demote** — dev affordance; belongs in script usage headers, not skill argv (readme review: script flags leaking into prose) |

### Pipeline-coupling flags (machine-passed; keep but mark internal)

| Flag | Skill(s) | Purpose | Hint? | Verdict |
|---|---|---|---|---|
| `--resume` | execute, feature-sdlc, prototype-sdlc | re-enter from state | ✅ | keep — core contract |
| `--resume <path>` | ideate | jump to artifact's phase cursor | ✅ | keep, but **note arity collision**: boolean elsewhere, path-valued here |
| `--restart`, `--from T<N>` | execute | destructive fresh start / resume point | ✅ | keep — destructive op + unambiguous typed value |
| `--subagent-driven` | execute, feature-sdlc | parallel execution mode | ✅ | keep (passed by /plan close + /feature-sdlc Phase 6) |
| `--inline` | execute | negate `--subagent-driven` | ✅ | **fold-NL** — default is already inline; negation flag for a non-persisted setting |
| `--scope phase --phase <N>` | verify | /execute Phase-2a invocation contract | ✅ | keep, **mark "internal — passed by /execute"** in hint |
| `--fix-from <task-id>` | plan | re-plan from /execute defect | ❌ | keep (coupling) — add to hint or mark internal |
| `--widen-to`, `--cross-phase-downstream` | plan | fix-from scope extension | ❌ | **fold-NL** ("the root cause is T5 — re-plan from there") |
| `--bootstrap-design-only` | wireframes, prototype | /prototype Phase-1a programmatic handoff | ✅ | keep — machine-facing; document as such (rename breaks /prototype) |
| `--apply-edits` | msf-wf | write-permission grant from /wireframes Phase 6 | ✅ | keep — explicit write grants should never be NL |
| `--journeys <ids>` | design-crit | skip journey approval on re-run/parent call | ✅ | keep; document what an id is |
| `--from-feedback`, `--from-reflect` | feature-sdlc, skill-sdlc | skill-feedback mode input source | ✅ | keep — dispatch-load-bearing |
| `--from-spec <path>` | architecture | judge mode on spec artifact | ✅ | keep — /spec Phase 6b depends on it |
| `--since <ref>` | architecture | judge mode on git delta | ✅ | keep — /verify Phase 4b depends on it |
| `--on-failure drop\|ship-with-warning\|exit-nonzero` | diagram | caller exit-code contract | ✅ | keep — exists for programmatic callers; cannot be NL |
| `--approach <text>`, `--source <path>`, `--out <path>` | diagram | headless invocation (frameworks D5 contract) | ✅ | keep |
| `--survey-json <path>` | survey-analyse | sister-skill schema handoff | ✅ | keep — the one inter-skill survey interface |
| `--top-n`, `--min-confidence`, `--no-evidence-required` | architecture | judge knobs for parent skills | ❌ | **demote** to reference/judge-modes.md |
| `--tier 1\|2\|3` | feature-sdlc, prototype-sdlc, skill-sdlc | scope override | ✅ | keep — but **fix the phantom passthrough** (§A2.14): claimed to pass to /requirements,/spec,/plan; none parses it |

### Effort/depth dials (the collision family — §A3.1)

| Flag | Skill(s) | Values | Hint? | Verdict |
|---|---|---|---|---|
| `--depth` | grill | quick\|standard\|deep | ✅ | keep; **unify vocabulary** |
| `--depth` | design-crit | shallow\|standard\|deep | ✅ | keep; unify vocabulary |
| `--depth` | learn-list, primer | brief\|standard\|deep | ✅ | keep — this is the best candidate for the canonical vocabulary (persisted per-project) |
| `--rigor` | diagram | high\|medium\|low | ✅ | **rename** to `--depth` or accept as theme-domain exception; spec hardcodes `--rigor medium` when invoking it |
| `--deep` | architecture | boolean | ✅ | **rename** — a boolean spelling of the same dial; collides fatally with grill (see §A2.6) |
| `--tier` | artifact | lite\|full | ✅ | **rename values** — `--tier` means 1\|2\|3 everywhere else in the pipeline |
| (positional) | critical-thinking | quick\|standard\|deep\|marathon | ✅ | fine — positional NL is the Pocock-correct shape |

### Skip/negation flags (the prefix-split family — §A3.2)

| Flag | Skill(s) | Purpose | Hint? | Verdict |
|---|---|---|---|---|
| `--no-tag`, `--skip-changelog`, `--skip-deploy` | complete-dev | bypass release stages | ✅ | keep (deterministic knobs for headless runs) — note all three concepts use two prefixes |
| `--no-worktree`, `--no-ideate` | feature-sdlc (+aliases) | opt out of worktree / ideate gate | ✅ | keep `--no-worktree`; **delete `--no-ideate`** — third redundant skip mechanism (classifier auto-skip + gate Skip already exist) |
| `--no-halt` | execute | phase-halt opt-out | ✅ | keep for orchestrated runs only; NL covers interactive |
| `--save` / `--no-save` | grill | persist report without prompting | ✅ | keep — needed non-interactively |
| `--amplify` / `--no-amplify`, `--refine` | ideate | force-run/skip Phase 3 / force Phase 5 | ✅ | **fold-NL** — "11-star this idea" already triggers it; no orchestrator forwards them |
| `--no-stress-test` | ideate | skip pressure-test | ✅ | keep — deliberate, warned escape hatch |
| `--no-repo` | critical-thinking | don't pull repo scenarios | ✅ | keep — cheap, clear |
| `--skip-folded-msf` | requirements | skip folded UX pass | ✅ | keep but **rename** — "folded" is internal jargon (suggest `--skip-ux-eval` family) |
| `--skip-folded-sim-spec` | spec | skip folded simulation | ✅ | keep + rename per family |
| `--skip-folded-arch` | spec, verify | skip folded architecture pass | ❌ both | keep + rename + **add to hints** (undiscoverable in both skills) |
| `--skip-folded-msf-wf` | wireframes | skip Phase 6 UX eval | ✅ | keep + rename (`--skip-ux-eval`) |
| `--skip-design-drift` | verify | skip advisory Phase 7a | ✅ | keep |
| `--skip-simulated-reader` | readme | skip persona pass | ✅ | **fold-NL** — preference, not contract |
| `--skip-cleaning`, `--raw-p-only` | survey-analyse | bypass cleaning / Holm | ✅ | keep — analyst opt-outs recorded in methodology |
| `--skip-export`, `--export <platforms>` | survey-design | export control | ✅ | **fold-NL** — Phase 8 already honors platforms named in context |
| `--skip-psych`, `--default-scope`, `--wireframes` | msf-req, msf-wf | tombstones for retired /msf flags | ✅ (as rejections) | **delete after migration window**; collapse to one line. Note: `--apply-edits` is a tombstone in msf-req but load-bearing in msf-wf — same name, opposite fates |
| `--mode`, `--level` | learn-list | retired-flag tombstones (exit 64) | ❌ | keep with expiry date, then delete |

### Mode/subcommand-ish flags

| Flag | Skill(s) | Purpose | Hint? | Verdict |
|---|---|---|---|---|
| `--audit` / `--scaffold` / `--update <range>` | readme | mode selection | ✅ | keep (auto-detect defaults; flags are explicit overrides) — but `--update` is dead-on-path (§A2.5) |
| `--scope <enum>` | readme | non-interactive monorepo scope | ✅ | keep (CI needs it) |
| `--edit` / `--replan` / `--append` | plan | operational mode | ❌ | **fold-NL** — mode is already auto-detected from existing-plan state + Phase 1 prompt |
| `--reset-decisions`, `--reset-skip-list` | plan | replan hygiene | ❌ | **fold-NL** |
| `--force-lock` | plan | clear stale `.plan.lock` | ❌ | **delete** with lock simplification |
| `--decide <option>` | plan | resume a non-interactive halt | ❌ | **delete-dead** — value shape never defined anywhere |
| `--mode diagram\|infographic` | diagram | wrapper branch | ✅ | keep; candidate to merge into `--theme` long-term |
| `--theme technical\|editorial` | diagram | token set | ✅ | keep — schema-validated |
| `--update-handoff` | prototype | regenerate req-doc `## Prototype` section only | ✅ | keep — genuinely distinct cheap mode |
| `--dry-run` | polish, simulate-spec | report-only | ✅ | keep; map "just critique it" to it |
| `--force` | simulate-spec | override Tier-1 refusal | ✅ | **keep — model example**: the refusal message itself names the flag |
| `--force` | prototype | (implied) override Tier-1 refusal | 💀 | **delete-dead or define** — promised in user copy (L175), never parsed, not hinted |
| `--force-cleanup` | complete-dev | `git worktree remove --force` opt-in | ✅ | keep — destructive opt-in must be explicit |
| `--autonomous` | primer | skip confirm gates | ✅ | **fold into `--non-interactive`** — overlapping semantics, unpredictable difference |
| `--json` | frameworks | machine-readable match output | ✅ | keep — the programmatic API |
| `--plugin <name>` | complete-dev | release scoping | ✅ | keep — load-bearing multi-plugin contract (CLAUDE.md) |

### Value/filter/config flags

| Flag | Skill(s) | Purpose | Hint? | Verdict |
|---|---|---|---|---|
| `--audience <enum>` | primer, learn-list, magazine | reader shaping | ✅ | keep — shared, typed, consistent |
| `--preset <slug>` | artifact, polish | bypass preset prompt | ✅ | keep — slug-addressable |
| `--reduce <pct>` | polish | editorial reduction target | ✅ | keep; parse "shorten by ~30%" to the same target |
| `--checks <path>` | polish | custom-checks file | ✅ | keep |
| `--devices=<list>` | wireframes, prototype | device pre-selection | ✅ | **fold-NL** — Phase 2c asks anyway; "desktop and mobile" works |
| `--screenshots <path>`, `--storage-state <path>`, `--responses <path>`, `--sheet <n>` | wireframes / design-crit / survey-analyse | path/sheet inputs | ✅ | keep — paths can't be NL |
| `--slug <slug>` | ideate | filename override | ✅ | keep; **note collision** with architecture's `--label` (same concept) |
| `--label <slug>` | architecture | output filename slug | ✅ | fold-NL ("call it X"); keep parse for parents |
| `--label` | backlog, mytasks | item label filter | ❌ ("[filters]") | keep — different concept from architecture's; fine within tracker family |
| list filters `--type/--status/--priority/--repo/--workstream/--include-archive/--quarter` | backlog | structured filters | ❌ ("list [filters]") | **fold-NL** ("list must-priority bugs") with schema validation |
| list filters `--status/--type/--importance/--workstream/--due/--person/--checkin-due/--include-done/--quarter` | mytasks | structured filters | ❌ | keep vocabulary + one line stating NL maps onto it; delete `--due next-7` (= `this-week`); fold `--include-done` |
| `--workstream`, `--relationship` | people | directory filters | ✅ | keep + NL-mapping line |
| `--include-info-comments` | architecture | show wont_fix | ✅ | rename (`--show-wont-fix`) or fold-NL |
| `--monorepo`, `--baseline <path>`, `--scaffold-l3`, `--sort risk` | architecture | fan-out / diff / setup / sort | ✅ | keep ×3; `--sort risk` has one legal value — delete or make boolean |
| `--days/--feed/--max-per-feed/--medium/--bundle/--from <file>` | magazine | build/add controls | ✅ | keep — flag-overrides-stored-default is the right pattern |
| `--media/--audience/--out` (curate), `--interval/--max/--ac-only/--backfill` + `--install/--status/--run-now/--uninstall` (watch) | magazine | curate targeting / worker lifecycle | ✅ (top-level) | fold curate flags into NL; **move watch flags out of the top-level hint** (they're `watch install` options); rename watch flags to positional verbs. Hint drops from ~16 flags to ~8 |
| `--repo/--days/--sessions/--since/--include-headless` | playbook | session-source filters | ✅ | keep — typed, cheap |
| `--floor N`, `--changed-only` | frameworks | match floor / sync scope | ✅ | keep |
| `--keep-index` | primer | keep research index | ❌ | add to hint or fold-NL |
| `--quick` | artifact (template add) | scaffold-only | ❌ | fold-NL ("quick template") or add to hint |
| `--add-charter`, `--add-stakeholder` | product-context | append scaffold entries | ✅ / ❌ | **fold-NL**; `--add-stakeholder` is undiscoverable; rename `--add-charter`→`--add-area` if kept |
| `--msf-auto-apply-threshold N` | requirements, spec, wireframes | auto-apply confidence | ✅ all 3 | requirements: **demote to settings.yaml** (mechanism exists, default 80). spec: **rename** — "msf" is wrong, it tunes sim-spec. wireframes: **delete-dead** (§A2.1) |
| `--out <dir>` | design-crit | escape docs_path resolution | ✅ | keep |
| `--context <path\|url>` | survey-analyse | research brief input | ✅ | **wire or delete-dead** (§A2.6) |
| `--weight-col <col>` | survey-analyse | respondent weighting | ✅ | **implement or delete-dead** (§A2.7) |
| `--path` | readme | referenced once §10, defined nowhere | 💀 | **delete-dead** |
| `--app <path>` | wireframes (resolver doc) | "reserved; not yet exposed" | 💀 | **delete-dead** — reserved-forever flags are noise |
| `--clear-cache` | diagram | wipe diagram cache | ✅ | keep — destructive op deserves a flag |

## A2. Dead flags — verified

Each verified directly against source this run (file:line cited). "Dead" = documented or advertised, with no mechanism that consumes it.

| # | Flag | Skill | Evidence | Status |
|---|---|---|---|---|
| 1 | `--msf-auto-apply-threshold N` | wireframes | Hinted + "overrides the apply threshold" (SKILL.md:554), but no threshold mechanism exists in wireframes Phase 6 or anywhere in /msf-wf (grep: zero `threshold`/`80` mechanism hits) | **dead** — delete |
| 2 | `--force` | prototype | Promised in Tier-1 refusal copy ("Re-run with `--force` to override", SKILL.md:175); not in hint, never parsed, no defined behavior | **dead** — promise the skill doesn't keep |
| 3 | `--format` | survey-design | Hinted; skill's own text says it governs feature-folder docs it "normally writes none" of | **inert** |
| 4 | `--format` | survey-analyse | Hinted + parsed (SKILL.md:43); inert by its own documentation (per-skill review finding 7, re-verified) | **inert** |
| 5 | `--context <path\|url>` | survey-analyse | Parsed at SKILL.md:43; **zero** subsequent reads in any phase or script | **dead** — wire or delete |
| 6 | `--weight-col <col>` | survey-analyse | Parsed; methodology section mentions it (L137); no helper implements weighting (`helpers/ranking.py`'s `weighted_pts` is rank scoring, unrelated) | **vapor** — documented as helper-implemented; isn't |
| 7 | `--deep` → /grill | feature-sdlc | Phase 1a step 3 invokes `/pmos-toolkit:grill --deep` (SKILL.md:513,523 — 3 sites incl. log-line contract); grill defines only `--depth=quick\|standard\|deep` | **broken cross-skill call** — works only if the model improvises; fix to `--depth=deep` |
| 8 | `--path` | readme | Referenced once in §10, defined nowhere | **dead** |
| 9 | `--update <range>` | readme | Flag parses, but FR-UP-4's dual gate requires `readme_update_hook` set by complete-dev "Phase 7.6" — which never shipped (grep complete-dev: zero hits). Documented path always no-ops, stranding `commit-classifier.sh` (255 LOC) + `voice-diff.sh` (211 LOC) | **dead-on-path** — ungate manual `--update` |
| 10 | `--decide <option>` | plan | Hint-absent, body-mentioned; option shape never defined anywhere | **dead** |
| 11 | `--format` | magazine | Hinted; "reserved", HTML-only in v1 | **reserved-dead** — delete until implemented |
| 12 | `--app <path>` | wireframes | Resolver doc: "not yet exposed; reserved" | **reserved-dead** |
| — | `--format md\|both` | primer | Values accepted, silently coerced to html (Phase 5 step 14) | **dead values** — worse than no flag |
| — | `--format both` | ~15 pipeline skills | Retired FR-12.1; still advertised in hints; feature-sdlc documents it as a no-op that "six clauses still honor" | **dead value advertised repo-wide** |
| 13 | `--tier <N>` passthrough | feature-sdlc → requirements/spec/plan | feature-sdlc:402 claims "passed down via the existing `--tier <N>` passthrough"; none of the three SKILL.md files parses, documents, or hints it | **phantom contract** |
| 14 | `readme_update_hook` / Phase 7.6 | readme ↔ complete-dev | Spec'd in `2026-05-13_readme-skill/02_spec.html`; /readme half shipped, /complete-dev half never landed | **phantom contract** (same root as #9) |

## A3. Consistency collisions — same concept, different names

1. **The effort dial — six vocabularies for one concept.** `--depth quick|standard|deep` (grill) vs `--depth shallow|standard|deep` (design-crit) vs `--depth brief|standard|deep` (learn-list/primer) vs `--rigor high|medium|low` (diagram) vs `--deep` boolean (architecture) vs `--tier lite|full` (artifact) vs `--tier 1|2|3` (feature-sdlc) — plus critical-thinking's positional `quick|standard|deep|marathon`. The feature-sdlc→grill `--deep` bug (§A2.7) is this collision claiming its first casualty: an author who can't remember which spelling a skill uses, because there is no rule.
2. **Negation prefix split: `--no-*` vs `--skip-*`.** 8 `--no-*` flags (no-tag, no-worktree, no-ideate, no-halt, no-save, no-amplify, no-stress-test, no-repo) and 10 `--skip-*` flags (skip-changelog, skip-deploy, skip-folded-msf, skip-folded-sim-spec, skip-folded-arch, skip-folded-msf-wf, skip-design-drift, skip-simulated-reader, skip-cleaning, skip-export) express the identical concept — "don't run stage X" — with no rule for which prefix applies. complete-dev uses both in one hint (`--no-tag` next to `--skip-changelog`). The `--skip-folded-*` subfamily additionally leaks internal "folded-phase" jargon to users.
3. **`--tier` means two things.** `lite|full` in artifact; `1|2|3` in feature-sdlc/prototype-sdlc/skill-sdlc. Same flag name, disjoint value sets, both in the same plugin.
4. **`--media` vs `--medium` — a collision inside one skill.** magazine has both: `--medium newsletter|podcast` (add-time disambiguation) and `--media newsletters|podcasts|both` (curate targeting). Near-identical names, different value sets, different verbs.
5. **The `--from*` family mixes two semantics.** Input-source: `--from-feedback`, `--from-reflect` (feature-sdlc), `--from-spec` (architecture), `add --from <file>` (magazine). Resume-point: `--from T<N>` (execute). Plus `--fix-from <task-id>` (plan), which is an input source spelled like a resume point.
6. **`--resume` arity drift.** Boolean in execute/feature-sdlc/prototype-sdlc; takes a `<path>` in ideate. Same name, different grammar.
7. **Filename/output override: four spellings.** `--label <slug>` (architecture), `--slug <slug>` (ideate), `--out <path|dir>` (diagram, design-crit, magazine curate), `--out-prefix` (architecture script layer).
8. **Headless-mode overlap.** Canonical `--non-interactive` (36 skills, lint-enforced) vs primer's `--autonomous` ("overlapping semantics, unpredictable difference" — per-skill review, confirmed) vs comments' skill-local `--non-interactive` whose semantics (defer clarifications into `deferred[]`) differ from the harness contract and need a one-sentence disambiguation.
9. **`--msf-auto-apply-threshold` — one name, three semantics.** requirements: tunes folded-MSF auto-apply (mechanism exists, default 80). spec: tunes folded *sim-spec* (the "msf" in the name is wrong). wireframes: dead (§A2.1).
10. **Guard-override family.** `--force` (simulate-spec — real and well-designed), `--force` (prototype — phantom), `--force-cleanup` (complete-dev), `--force-lock` (plan), `--restart` (execute). Five spellings of "override a safety check", one of which doesn't exist.

**Done well (credit):** `--feature <slug>` and `--backlog <id>` are uniform across all 13/8 consumers; `--audience` + `--depth brief|standard|deep` are genuinely shared between primer and learn-list (the D12 unification worked); the NI pair is byte-identical by lint. The repo *can* converge a flag family when a feature forces it — the rest were never forced.

## A4. Pocock comparison and recommended flag policy

Pocock ships **zero flags**. Invocation is natural language; configuration is externalized — a one-time setup skill writes per-repo docs that other skills read (criteria.md north-star #5). His repo can do this because nothing invokes his skills programmatically. This repo cannot go to zero: ~35 flags are *machine-passed* between skills (`--feature`, `--backlog`, `--scope phase`, `--bootstrap-design-only`, `--apply-edits`, `--on-failure`, `--from-spec`, `--since`, `--survey-json`, …) — an orchestrated pipeline needs a deterministic call surface that natural language can't provide. But the gap between "necessary machine surface" (~35) and "current surface" (137) is the finding: **~100 flags exist where natural language, a stored default, or nothing would do.**

### Proposed repo-wide flag policy

**A flag is justified only when at least one holds:**
1. **Machine coupling** — another skill, CI, or a script passes it programmatically. Mark these `(internal)` in the hint or demote to a reference file; humans should rarely type them.
2. **Destructive/costly opt-in** — `--force-cleanup`, `--restart`, `--clear-cache`, `--no-stress-test`. Explicitness is the feature; never naturalize these.
3. **Typed values NL can't carry unambiguously** — paths, commit ranges, sheet names, enum filters used non-interactively.
4. **Headless determinism** — needed so `--non-interactive` runs have a deterministic answer to a prompt the skill would otherwise ask (`--save`, `--scope`, `--sheet`).

**Everything else folds into natural language**, with the skill body stating canonical phrasings ("'make it brief' ⇒ depth=brief") — several skills (mytasks named views, polish's trigger phrases, ideate's "11-star this") already prove the pattern works.

**Naming conventions (adopt, then lint):**
- One effort dial: `--depth brief|standard|deep` repo-wide. Retire `--rigor`, boolean `--deep`, artifact's `--tier lite|full`. `--tier 1|2|3` stays reserved for pipeline scope.
- One negation prefix: `--no-<stage>` for "don't run stage X". Retire `--skip-*`; rename `--skip-folded-*` to user-vocabulary (`--no-ux-eval`, `--no-arch-check`).
- `--from-<source>` = input source only; resume points are `--from T<N>` → rename to `--start-at T<N>`.
- `--out <path>` is the only output-path override; `--slug`/`--label` fold into NL.
- `--resume` is always boolean; ideate's path variant becomes `--resume` + positional path.
- Thresholds and format preferences move to `~/.pmos` settings / product-context (Pocock's "config externalized") — `--msf-auto-apply-threshold` is the poster child.

**argument-hint contract (lint this):** every parsed flag appears in the hint or carries an explicit `(internal)` marker; no hint advertises a value the skill ignores (`both`); no body text names a flag the parser doesn't accept (`--force` in prototype, `--path` in readme). This is mechanically checkable — extend `skill-eval.md` with a flags-vs-hint cross-check; the same check would have caught all 12 dead flags and the `--deep`/`--depth` break.

---

# Part B — Phases

## B0. Headline numbers

| Metric | Value |
|---|---|
| Skills with phase structures | 36 of 38 (skill-sdlc, prototype-sdlc are thin aliases) |
| Total phase headings | ~370 |
| Max phases | **24 headings** (feature-sdlc — incl. a duplicated "Phase 0a"); complete-dev 23 |
| Median phases | ~9 |
| Skills with lettered/fractional insertions | **20** |
| Skills with verified orphan/ghost phase references | **15** (in-file) + **7** cross-skill phantom references |
| Numbering schemes in concurrent use | 5 (integer; lettered `4b`; fractional `0.5`; decimal-step `2.5c` / `3.4`; letter-flow `U.1`) — wireframes uses 3 of them simultaneously |

## B1. Per-skill phase inventory

Scheme: **int** = clean integers; **+ltr** = lettered insertions (0a, 4b); **+frac** = fractional (0.5); **+step** = decimal step-addressing (3.4); **mixed** = colliding schemes. Orphans verified this run unless marked (review) = verified by per-skill reviewer and re-confirmed where stated.

| Skill | Phases | Scheme | Orphan / ghost references |
|---|---|---|---|
| architecture | 9 (0–7, 4a) | int+ltr | — |
| artifact | 14 (0–6, 0a, U.1–U.6) | mixed | Body refs "Phase 2.0"/"Phase 2.7" (L75, L188) — decimal step-addresses with no headings; `templates/prd/eval.md` calls SKILL.md's "2.5" "Phase 2a" (label drift across files). U.x flow scheme itself is fine — distinct flows earn distinct schemes |
| backlog | 12 (0–11) | int | None — but "phases" are verb handlers with GOTO cross-refs ("Apply Phase 10"); structure misdescribes itself |
| changelog | 7 (0–6) | int | — |
| comments | 6 (0–5) | int | — |
| complete-dev | 23 (0–18, 0a, 7a, 15a, 16a; Phase 4 = tombstone stub) | int+ltr | **L25 enumerates "0.5, 7.5, 15.5, 16.5"** — four phantom names; headers are 0a/7a/15a/16a (the 2026-06-05 renumber commit `a76a5da` converted headers, missed this line + `lastrun-schema.md`'s "16.5" rows). L364: "per /push Phase 1a logic" — /push is retired. Phase 4 is a heading that exists to say it moved |
| creativity | 7 (1–7) | int | L48 NI-boilerplate: "On Phase 0 entry…" — skill has no Phase 0 |
| design-crit | 11 (0–8, 0a, 0b) | int+ltr | "Phase 2c"/"Phase 4a" refs (L180/317/422) resolve to `### 2c.`/`### 4a.` *subsections* — same content, two addressing vocabularies. Phase 5a points at `wireframes/reference/psych-output-format.md`, which moved to msf-wf (review, re-confirmed) |
| diagram | 11 (0–8, 6a, 6b) | int+ltr | Track Progress lists "(…6, **6.6**, 7, 8)" — no Phase 6.6 exists (spec called it 6.5; headings say 6a/6b). Phase 7 stdout still says "item 7" after the rubric's numeric→stable-ID migration (review, confirmed) |
| execute | 12 (0–7, 0a–0c, 2a) | int+ltr | **"Phase 0/0.4/0.5" at L101 and L178** — no 0.4/0.5 exist (they're 0b/0c); spec-internal numbering leaked and survived ≥1 revision |
| feature-sdlc | 24 headings (0–10, 0a–0e, 1a, 2a, 3a–3c, 6a, 8a) | int+ltr | **Duplicate "Phase 0a"** — L134 (output_format) and L191 (Worktree+Slug+Branch) are both Phase 0a. **Log-line contracts say "phase 1.5 ideate" ×3** (L515/520/523) while the heading is Phase 1a — the old decimal scheme survives inside mandated output strings. Cross-skill: requirements:620, spec:517, wireframes:549 all reference "/feature-sdlc Phase 11", which doesn't exist (max 10) |
| grill | 7 (0–4, 0a, 3b) | int+ltr | **Phase 3b with no Phase 3a** |
| ideate | 9 (0–8) | int | SKILL.md clean — but `pressure-test-battery.md` is off-by-one post-Amplify-insertion ("Phase 3 prompts"/"Phase 4 Refine"; 12- vs 13-section schema; names `/ideation`) (review, confirmed pattern) |
| msf-req | 10 (0–8, 0a) | int+ltr | — |
| msf-wf | 12 (0–10, 0a) | int+ltr | `reference/psych-output-format.md:104` cites "Phase 6g" — doesn't exist (apply-edits is Phase 8); pre-split residue |
| mytasks | 13 (0–12) | int | Clean numbers, scrambled file order: Phase 12 sits between Phases 1 and 2 |
| people | 9 (0–8) | int | Phase 8 sits between Phases 1 and 2 |
| plan | 10 (0–7 + 2 template) | mixed | "Phase 5: (folded into Phase 4 per FR-46)" — a tombstone heading; plan-doc *template* headings "## Phase 1: Tracer bullet"/"## Phase 2: Widen" (L259/266) collide with the skill's own phase namespace; spine out of execution order (Phases 6–7 after the closing report) |
| polish | 10 (0–8, 2a) | int+ltr | **L14 enumerates "(0, 1, 2, 2.5, 3…)"** — phase is named 2a everywhere else; L273: "Phase 6 apply → Phase 7 file write → Phase 8 reflection → Phase 7 summary" — Phase 8 executes *inside* Phase 7; `reference/chunking.md` cites "SKILL.md §5.2" (retired spec's section) |
| product-context | 4 (0–3) | int | — |
| prototype | 14 (0–12, 1a) | int+ltr | **L297: "after 1.5 confirms the overlay"** — no Phase 1.5 (means 1a). Body sub-steps (4b/4c/4d, 5c/5d, 9a/9b) are defined as steps, fine — but L33's "14 phases" count is ambiguous because the unnumbered comment-resolver section calls itself "this phase" |
| prototype-sdlc / skill-sdlc | 0 | — | thin aliases; n/a |
| readme | 3 (0, 0b, N) | mixed | **Phase 0b with no Phase 0a**; body is §-numbered (§7, §8, §10) instead of phased; "Phase N: Capture Learnings"; §8 references complete-dev "Phase 7.6" — never existed (§A2.9) |
| requirements | 11 (0–8, 0a, 5a) | int+ltr | Heading "Phase 5: Review (replaces former Phase 5 + Phase 6)" — tombstone language in a live heading; L109: "Add Phase 1a synthesis step" — Phase 1a never defined; L620 refs /feature-sdlc Phase 11 (max 10) |
| session-log | 7 (0–6) | int | — |
| simulate-spec | 12 (0–11, 0a) | int+ltr | — |
| spec | 12 (0–9, 0a, 6a, 6b) | int+ltr | L517 refs /feature-sdlc Phase 11 (max 10); Phase 6a targets retired `02_spec.md` (review) |
| survey-analyse | 10 (0–9) | int | Phase 8 contains learnings handoff AND Phase 9 is Capture Learnings — duplicated terminal phase (review) |
| survey-design | 10 (0–9) | int+step | "Phase 3.4" (L100/133) and "Phase 4.3" (L429–433) — decimal step-addresses; resolvable (steps exist) but a third addressing scheme |
| verify | 15 (0–10, 0a, 4a, 4b, 7a) | int+ltr | **L475: "longer than Phase 6b's 300s"** — verify has no 6b (it means /spec Phase 6b; the cross-skill qualifier was lost). Checked-in smoke test `tests/test-phase-4-7-*.sh` greps the pre-rename heading ('Folded /architecture --since' vs current '## Phase 4b:') — fails today, wired to nothing |
| wireframes | 13 (0–10, 2a, 2b) | **mixed ×3** | The worst file: Phase 2 contains subsections 2a-pre–2d, then a *top-level* "Phase 2a" follows with steps 2.5a–2.5f and "Phase 2b" with 2.6a–2.6c — "2a" names two different things and "Phase 2a" contains "2.5c". Cross-refs use a third concatenated scheme: "Phase 2ac" (L381), "Phase 2af" (L646), "Phase 2ba" (L27/75). L712: "Phase 3.5 screenshot ingestion" — no such phase; L25 excludes "Phase 7 polish" — Phase 7 is canvas aggregation; "polish" is pre-canvas residue. L231 documents the debt: "Decimal phase number is intentional — so external references still resolve" |
| critical-thinking | 6 (0–5) | int | — |
| frameworks | 7 (0–6) | int | — |
| learn-list | 8 (0–7) | int | — |
| magazine | 8 (0–7) | int | — |
| playbook | 8 (0–7) | int | — |
| primer | 8 (0–6, **0.5**) | int+frac | "Phase 0.5: Consolidated confirm" — the only live fractional heading in the repo |

## B2. Coherent vs accreted

**Coherent (17):** changelog, comments, session-log, product-context, backlog (numbering-wise), mytasks/people (numbering fine; file order scrambled), simulate-spec, msf-req, survey-analyse, survey-design, critical-thinking, frameworks, learn-list, magazine, playbook, ideate (SKILL.md only). Notably: **every pmos-learnkit skill is coherent** — they're newer, written in fewer sittings, and renumbered properly when edited (the Amplify insertion in ideate renumbered SKILL.md correctly; only its reference file was missed).

**Accreted (19):** architecture, artifact, complete-dev, creativity (minor), design-crit, diagram, execute, feature-sdlc, grill, msf-wf (reference), plan, polish, primer, prototype, readme, requirements, spec, verify, wireframes. The accretion signature is always the same: a phase was inserted (folded MSF, editorial pass, Amplify, worktree rework) and the *heading* got a letter or decimal while every other surface that mentions phase numbers — Track Progress enumerations, log-line string contracts, sidecar schemas, reference files, test regexes, sibling skills — kept the old numbers.

**The smoking gun is one commit.** `a76a5da` (2026-06-05, "standardize phase numbering") renamed decimal headings to lettered tree-wide (0.5→0a, 7.5→7a, 16.5→16a, 6.5→6a…) but missed at least **six non-heading surfaces**: complete-dev L25's enumeration, `lastrun-schema.md`'s "16.5" rows, diagram's "6.6" Track-Progress entry, polish L14's "2.5", execute's "0.4/0.5" ×2, and feature-sdlc's "phase 1.5" log-line contracts. A renumber that only greps `^## Phase` is exactly the failure mode the policy below must prevent.

**Worst three:** (1) **wireframes** — three concurrent schemes plus a comment that *documents* the debt rather than paying it; (2) **feature-sdlc** — a duplicated Phase 0a heading and old numbering baked into mandated output strings (the hardest kind to fix, because log lines are parsed by resume logic); (3) **complete-dev** — the first instruction the model reads (Track Progress) names four phases that don't exist.

## B3. Are the phases earning their keep? (structural observation)

Two distinct populations hide under the same `## Phase N` convention:

- **True pipelines** (execute, complete-dev, verify, feature-sdlc, primer, magazine): ordered stages with state, resume contracts, and cross-skill invocation points. Phase structure is load-bearing; numbering must be stable because `state.yaml`, log lines, and sibling skills address it.
- **Verb dispatchers** (backlog, mytasks, people, product-context, comments): "Phase 6: Set Field" is not a phase — it's a subcommand handler. The backlog review nailed it: GOTO-style "Apply Phase 10" refs imply a sequence that doesn't exist. These should use named sections (`## set`, `## refine`), reserving "Phase" for things that actually run in order.

A third group (grill, ideate, polish, msf-*) sits between: short genuine sequences where some "phases" are really principles ("Phase 7: Executive Summary in Chat" is one sentence of intent). Per criteria #6, several could collapse — but the orphan problem is more damaging than the count problem, so renumber-safety is the priority recommendation, not phase reduction.

## B4. Recommended repo-wide phase policy

1. **Integer top-level phases only.** No new fractional (0.5) or lettered (4b) top-level phases. Inserting a phase means renumbering the file — *and* the renumber checklist below. Sub-structure inside a phase is "step N" prose ("Phase 4, step 3"), never a pseudo-phase label ("4c"). Existing lettered phases get cleaned up opportunistically per-skill (the per-skill fix lists already sequence this).
2. **Stable anchors for every cross-reference.** Any reference that must survive renumbering — cross-skill references, log-line string contracts, sidecar/state schemas, test assertions, reference files — addresses phases by **slug, not number**: headings gain a stable id (`## Phase 9 — Version bump {#version-bump}`), and references say "the version-bump phase (`#version-bump`)". Numbers remain as ordering sugar for human readers within a single file. This single rule would have prevented all 22 verified orphans: `/feature-sdlc Phase 11` becomes `#final-summary` and survives forever; "phase 1.5 ideate" log lines become `phase ideate:` and never drift.
3. **Cross-skill phase references always carry the skill qualifier.** "Phase 6b's 300s" (verify L475) rotted because the `/spec` qualifier was dropped. Rule: a bare "Phase N" may only refer to the current file.
4. **Renumber checklist (make it a lint, not a discipline).** The `a76a5da` lesson: a renumber must grep beyond headings. Ship a ~30-line check in `skill-eval-check.sh` / `tools/`: extract every `Phase <label>` token from each skill's SKILL.md + reference/ + tests/, resolve in-file labels against that file's headings and `/skill … Phase <label>` forms against the target skill's headings, fail on misses. The detection script written for this analysis found all in-file ghosts and 7 cross-skill phantoms in two passes — it is cheap and deterministic, and it converts "renumbering is dangerous" (the explicit reason wireframes L231 refuses to renumber) into "renumbering is safe".
5. **Reserve the word "Phase" for the skill's own pipeline.** Verb dispatchers rename `## Phase N: <verb>` to `## <verb>` (backlog, mytasks, people, product-context, comments). Emitted-artifact templates (plan-doc "## Phase N" task groups) rename to "Stage"/"Part" to end the namespace collision inside /plan.
6. **No tombstone headings.** "Phase 5: (folded into Phase 4)" and "Phase 4 — deferred to Phase 16a" exist to say they don't exist. A one-line note inside the surviving phase suffices; with slug anchors (rule 2), even that becomes unnecessary.

---

## Appendix — verification commands used

- Flag extraction: `grep -oE '\-\-[a-z][a-z0-9-]+' plugins/*/skills/*/SKILL.md | sort -u` per skill, then manual classification against argument-hint frontmatter and body context (excluding embedded git/script/child-skill argv).
- Phase headings: `grep -nE '^#{2,4} *(Phase|Stage)' plugins/*/skills/*/SKILL.md`.
- Orphan detection: python pass extracting defined phase labels per file, then flagging in-file `Phase <X>` references with no matching heading, plus a second pass resolving `/skill … Phase <X>` cross-references against the target skill's headings. False positives (sub-step labels like prototype's "4d", subsection labels like design-crit's "### 2c.", template headings in /plan) were individually checked and excluded.
- Dead flags: each candidate grepped across its skill's SKILL.md + reference/ + scripts/ for a consuming mechanism; file:line evidence in §A2.
