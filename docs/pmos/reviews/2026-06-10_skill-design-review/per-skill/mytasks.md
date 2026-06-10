# mytasks — review

**Grade:** C (a meaningful rewrite would pay off — the reference architecture is right, but SKILL.md doesn't trust it)
**Size:** SKILL.md 630 lines (601 excluding non-interactive block); references 2 files / 163 lines (`schema.md` 104, `inference-heuristics.md` 59) + shared `tracker-crudl.md` 65 and `interactive-prompts.md` 75; target ~250 lines.

## TL;DR

- **Biggest win available:** SKILL.md re-inlines its own reference layer. Enums are stated three times (schema.md, the Phase 4 flag table, the Phase 7 validation table), the INDEX format twice (Phase 12 + schema.md), id/slug rules twice (Phase 2 Steps 2/4 + `tracker-crudl.md` §2). Citing the refs instead of restating them removes ~150 lines with zero behavior change and kills a silent-drift hazard.
- **Biggest risk in current design:** strict first-token routing with quick-capture as the fall-through turns natural-language queries into junk tasks — `/mytasks what's due this week` captures a task titled "what's due this week". The command grammar fights the natural-language triggers the description itself advertises ("what's on my plate").
- **Done well, keep:** the quick-capture mandate — "MUST complete in a single tool-call sequence with NO clarifying questions. Wrong inference is acceptable; capture friction is not" (Phase 2). That is this skill's "**This is the skill.**" sentence, it has a documented origin (spec §"Design Principles" pt 1 and Decision Log D8 in `docs/pmos/features/2026-04-25_mytasks-skill/02_spec.md`), and it names the failure mode it prevents. Also: zero reviewer-subagent loops or self-eval rubrics — the right amount of machinery for CRUD.

## Is 630 lines defensible?

Partly — but for the wrong reason. The domain *does* carry a real contract (closed enums, a regenerable INDEX, a cross-skill `/people find` protocol, file-shape invariants other invocations must re-parse), so this can never be a 40-line `obsidian-vault`: obsidian-vault is short because Obsidian and the human own the format; here the skill owns the format, so the schema must live *somewhere*. But it already lives in the right somewhere — `schema.md`, `inference-heuristics.md`, `_shared/tracker-crudl.md`. The 630 lines come from restating that layer plus ~60 lines of exact output templates, not from domain complexity. The length is distrust of the references, not the domain.

## Findings

1. **[S][V] Reference layer re-inlined into SKILL.md.** Concretely: (a) enum value lists appear in `schema.md`'s enum table, again in Phase 4's flag table (`--status <pending|in-progress|waiting|completed|dropped>` etc.), again in Phase 7 Step 3's validation table; (b) Phase 12 Step 4 reproduces the full INDEX.md template that `schema.md` already shows; (c) Phase 2 Step 2 (id allocation) and Step 4 (slug rules) restate `tracker-crudl.md` §2 nearly verbatim. Three copies of an enum list *will* eventually disagree, and nothing lints them. Fix: each phase validates "per `schema.md`" / writes "the INDEX format in `schema.md`" / allocates "per `tracker-crudl.md` §2". ~150 lines saved; the refs become load-bearing instead of decorative.
2. **[P][R] Token routing + capture fall-through misfires on natural language.** Phase 0: "(any other free text not matching a verb) → Phase 2 (quick capture)". The skill's own description promises triggers like "what's on my plate" / "what's due this week", but typed as `/mytasks` arguments those become captured tasks. Fix: one routing principle above the table — *interpret intent: text that reads as a query or view request routes to the matching view; only text that reads like a thing-to-do is captured. When unsure, capture (per the friction principle) but say which view the user may have meant.* The verb table stays as the canonical grammar; the principle absorbs the NL gap. This is the place where the command-surface pattern most fights the model.
3. **[V][P] ~60 lines of exact output templates.** Every phase ends with a literal report string ("Captured #{id} ({type}, {importance}): ...", "Refined #{id}.", "Checked in on #{id}. Next checkin: ..."), Phase 2 carries two worked examples, Phase 12/11 carry success-count formats. Only one output format in the whole pair of skills is a programmatic contract (`/people find`, consumed by this skill) — none of these are. A principle would survive better: *confirm every mutation in one line carrying the id and any inferred/changed fields; list each unresolved `@token` with the exact fix command.* **Coupling flag:** `tests/scenarios.md` asserts the literal strings (e.g. line 57 `Captured #0001 (call, neutral): ...`), so this fix must relax the test assertions in the same change.
4. **[F] `--due this-week` and `--due next-7` are the same filter.** Phase 4 Step 3 defines both as `today <= due <= today + 7`. Either delete `next-7` or make `this-week` mean the calendar week (through Sunday) — two names for one window is a trap for users and a drift seed for future edits.
5. **[P] Phase 4's "INDEX-served?" column micromanages the read strategy.** The flag table's third column plus Step 1 ("Choose source") prescribe when to read INDEX.md vs glob item files. For a personal store of dozens of files this is premature optimization; the model can pick a source. The spec's own D14 frames INDEX-served views as a performance nicety, not a contract. Fix: delete the column and Step 1; keep one advisory line ("INDEX answers most filters; person/label/include-done need the item files").
6. **[Ph][R] Phase numbers are subcommand labels, and Phase 12 sits between Phases 1 and 2.** The placement is deliberate (every write phase invokes it) but unexplained, so the file reads as shuffled. No fractional phases — good. Fix: either rename "Phase N" → plain subcommand headings (`## rebuild-index`, `## Quick capture`...) since there is no sequential pipeline here, or add one line: "defined early because every mutating subcommand applies it."
7. **[R] Spec register leaks: "v1" references.** Phase 4 Step 3: "not a v1 feature"; the spec's voice ("v1", "design Q8") belongs in the feature folder, not the skill. Two small edits.
8. **[X] Cross-platform posture is fine.** The only interactive surfaces route through `_shared/interactive-prompts.md`, which carries a real numbered-text fallback; the Platform Adaptation note matches actual behavior. The Phase 10 `[Y/n]` prompt correctly carries a `<!-- defer-only: ambiguous -->` tag.
9. **[G] Positive finding worth recording:** the gate set is data-integrity machinery, all cheap, all naming real failures (see inventory). No self-eval loops, no rubrics, no subagents. This is what right-sized machinery looks like in this repo — several pipeline skills could learn from it.

## Flags inventory

| Flag | Purpose | Verdict |
|---|---|---|
| `--non-interactive` / `--interactive` | repo-wide mode contract | keep (global contract, assessed once) |
| `list --status/--type/--importance/--workstream/--due` | canonical filter vocabulary | keep — but add one line stating NL phrasings map onto them ("show waiting tasks" ⇒ `--status waiting`) |
| `list --person` / `--label` | filters needing item files | keep |
| `list --checkin-due` | check-ins due view | keep (also reachable as `/mytasks checkins`) |
| `list --include-done` | include completed/dropped | fold into natural language ("including done") — flag adds nothing |
| `--due next-7` | identical to `this-week` | delete (or redefine `this-week` as calendar week) — finding 4 |
| `archive --quarter Q` | force destination quarter | keep (precise, rare, validated) |

Named views (`today`, `week`, `overdue`, `waiting`, `checkins`, `for`, `in`) are the natural-language surface over the flags — good design; keep, and collapse the Phase 5 alias table into the Phase 4 section.

## Gates & rubrics inventory

| Check | Hard or soft | Failure it catches | Verdict |
|---|---|---|---|
| Quick-capture single-tool-call, no questions | hard | capture friction / blocking the user mid-thought (spec D8) | keep-hard |
| Enum validation on set/list/add | hard | corrupt store, unfilterable values (tracker-crudl §4) | keep-hard |
| Skill-managed field rejection (`id`, `created`, `updated`) | hard | broken invariants, unstable keys | keep-hard |
| INDEX freshness check + regen-on-write | hard | stale view after manual file edits | keep-hard (shared §5) |
| Fail-soft on INDEX regen failure (never roll back item) | soft | losing a captured task to a cache error | keep |
| Malformed-frontmatter skip + warn | soft | one bad file aborting every read | keep |
| `--quarter` regex `^[0-9]{4}-Q[1-4]$` | hard | malformed archive dirs | keep (1 line) |
| Monthly check-in clamp (Jan 31 → Feb 28) | hard | invalid computed dates | keep — genuinely a known trap |
| `schema_version` refuse-if-higher | hard | misparsing future-version records | keep (lives in shared, correctly) |
| Exact report-string formats | hard (test-asserted) | none a principle wouldn't catch | soften-to-advisory (with test update — finding 3) |
| Phase 4 source-selection rules | hard | a slow read, at worst | delete (finding 5) |

## Fix list

| Fix | Type | Impact | Risk |
|---|---|---|---|
| Replace restated enums/INDEX/id-slug blocks with citations to `schema.md` / `tracker-crudl.md` (finding 1) | quick-win | high | low — refs already authoritative; verify scenarios still walk |
| Add intent-routing principle above Phase 0 table (finding 2) | structural | high | low-med — changes behavior for ambiguous inputs, by design |
| Collapse output templates to a one-line principle; relax `tests/scenarios.md` literal assertions to shape assertions (finding 3) | structural | med | med — touches tests; do as one change |
| Delete `--due next-7` or redefine `this-week` (finding 4) | quick-win | med | low |
| Drop "INDEX-served?" column + Phase 4 Step 1 (finding 5) | quick-win | med | low |
| Rename Phase headings to subcommand headings; explain rebuild-index placement (finding 6) | quick-win | low | none |
| Remove "v1" register leaks (finding 7) | quick-win | low | none |
