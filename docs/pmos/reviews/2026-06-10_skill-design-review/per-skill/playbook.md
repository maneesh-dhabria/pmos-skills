# playbook — review

**Grade:** B
**Size:** SKILL.md 159 lines (159 excluding non-interactive block — it has none, despite shipping `--non-interactive`); references 6 files / 375 lines (session-log-format 76, clustering 66, artifact-template 65, article-schema 63, resolver 55, anonymizer 50); target ~105 lines.

## TL;DR

- **Biggest win available:** SKILL.md restates its own reference files. Phases 1, 2, and 5 each re-summarize resolver.md, clustering.md, and anonymizer.md content that the model is told to load anyway; stripping the restatements plus the FR-number soup gets to ~105 lines with zero behavior change.
- **Biggest risk in current design:** the "Apply comment-resolver edit" contract at the bottom is not backed by the template. `reference/artifact-template.html` is a private template that bypasses `_shared/html-authoring/template.html` and contains **no `pmos-comments` inline block and no viewer/comments script includes** — yet Phase 6 copies `comments.*` assets that nothing loads, and the skill claims `/comments resolve` routes to emitted articles. The contract only works if the model improvises the wiring at emit time.
- **Done well, worth keeping:** the cheap-scout architecture. "Never read raw session bodies at scout time" is a real, empirically validated failure mode (context blowout on thousands-of-sessions repos), the deterministic work lives in zero-dep scripts, and every anti-pattern names the concrete failure it prevents (the multi-signal resolver exists because path-prefix resolution silently missed 10 of ~29 sessions on `poker-coach` — resolver.md cites the validation). This is "long because the domain is complex," not "long because it distrusts the model" — mostly.

## Findings

1. **[S][G] Comments contract drift — the template can't deliver what the SKILL.md promises.** SKILL.md §"Apply comment-resolver edit" declares emitted articles carry the comments-overlay routing, and Phase 6 / article-schema.md FR-70 copy `assets/` "(style.css, viewer.js, comments.*, launchers)". But `reference/artifact-template.html` links only `assets/style.css` — no `<script id="pmos-comments">` sentinel block, no `{{inline_js}}` equivalent, no comments.js/viewer.js include (compare `_shared/html-authoring/template.html` lines 10–11/49, which bake all three in). An emitted playbook is therefore *not* annotatable and `/comments resolve` has nothing to resolve, unless the model silently merges two templates. This is exactly the silent-failure class the repo's 14-surface emit contract exists to prevent — and playbook is a 15th surface outside the fanout test. Fix (pick one): (a) render through the shared template + render.js with the article CSS as `{{inline_css}}` (watch the render.js leading-doc-comment token gotcha), (b) add the comments wiring to artifact-template.html, or (c) delete the comment-resolver section and stop copying comments assets. (a) is the right answer; (c) is the honest cheap one.

2. **[P][R] FR-number soup addresses a reader who isn't there.** The body cites FR-13, FR-22, FR-30–35, FR-50–53, FR-60–62, FR-70/71, D10, D11 — pointers into `docs/pmos/features/2026-06-03_playbook/02_spec.html`, which the executing model never loads. For the runtime reader they're noise; for the colleague reading it as prose they're a register shift into spec-ese mid-sentence ("**Dry-run confirm (FR-35):**"). The provenance is valuable — keep it in the reference files (where it already lives) and drop every FR/D tag from SKILL.md. ~20 tags removed, every sentence gets shorter, nothing changes.

3. **[V] Phases restate their reference files.** Phase 1's three bullets re-summarize resolver.md (multi-signal, ambiguous-handling, coverage line); Phase 2's three numbered items re-summarize clustering.md (ranking, merge_suggestion, dry-run confirm); Phase 5 re-summarizes anonymizer.md (detect-and-flag, REVIEW-BEFORE-SHARING.md contents, never auto-scrub). Pocock's `improve-codebase-architecture` shows the target shape: one sentence of WHAT + the pointer; details live one hop away and are loaded when the branch is taken. The duplication also creates two places to drift (e.g., the coverage-line example appears in both SKILL.md Phase 1 and resolver.md with slightly different field lists). Each phase can be 3–4 lines: intent, the command or pointer, the one rule that must not be violated.

4. **[S] Non-interactive contract is referenced but not honored the way siblings honor it.** The skill ships `--non-interactive`/`--interactive` flags and Phase 0.4 resolves mode "per `_shared/non-interactive.md`" — but unlike its learnkit siblings frameworks, magazine, and primer, it does not inline the canonical sentinel block. The toolkit lint doesn't cover learnkit, so nothing catches this, but the plugin now has two postures (3 skills inline, playbook references, critical-thinking ignores). Either inline the block or adopt an explicit delegated/refused marker; silent middle ground is the worst option. Note also: a fully non-interactive run conflicts with FR-35's "REQUIRES an explicit confirm before any deep-read" — the SKILL.md never says what the dry-run confirm does under `--non-interactive` (auto-pick top candidate? refuse?). One sentence needed.

5. **[X] Honest platform posture, one hard wall.** "Node absent → report it and stop" is the right call and refreshingly honest (the cheap-scout contract genuinely can't be met by hand). Playwright and subagent degradations are real degradations, not hand-waves. No change — flagged only so nobody "fixes" the Node wall into a fake fallback.

6. **[F] The window flags are really script arguments — keep them, but say the default in one place.** `--days/--sessions/--since` map 1:1 onto `scout.mjs` CLI args, so they're not model-interpreted flags and natural language ("last two weeks") still works because the model translates. The 30-day default (D11) is stated in Phase 0.5; fine. `--include-headless` is the textbook good flag: an explicit escape hatch tied to a named anti-pattern (#3). `--format` follows the substrate convention. No deletions warranted.

7. **[R] Scope vs `/primer` and `/frameworks` is clear — and the file says so itself.** Line 13: "sibling-shaped with `/learn-list` and `/primer`"; the input domains are disjoint (own session logs vs web canon vs Notion-sourced corpus) and the outputs don't compete (case study vs primer vs framework match). The only stretch is the charter: learnkit is "help me **learn** a topic" and playbook is "help me **teach others** from my work" — it qualifies via "teachable artifacts" but is the furthest skill from the charter's center. Not a defect; worth one line in the plugin charter table the next time it's edited, so the membership test stays honest.

8. **[Ph] Phase structure earns its keep.** Eight integer phases, each a genuinely distinct stage with different cost profiles (cheap-deterministic → human pick → expensive deep-read → synth → gate → emit), and the ordering IS the safety property (no deep-read before pick; no emit before gate). No fractional phases. Keep the skeleton; thin the flesh (finding 3).

## Flags inventory

| Flag | Purpose | Verdict |
|---|---|---|
| `--repo <path>` | mine a repo other than cwd | keep |
| `--days N` / `--sessions N` / `--since <date>` | scope window, passed through to scout.mjs | keep — script args surfaced; natural language also works |
| `--include-headless` | re-admit filtered headless/subprocess sessions | keep — explicit escape hatch for Anti-Pattern 3 |
| `--format <html\|md\|both>` | output_format override | keep — substrate convention |
| `--non-interactive` / `--interactive` | mode resolution per `_shared/non-interactive.md` | keep, but define FR-35 dry-run-confirm behavior under it + align block posture with siblings |

## Gates & rubrics inventory

| Check | Hard or soft | Failure it catches | Verdict |
|---|---|---|---|
| Never-post / never-mark-safe + REVIEW-BEFORE-SHARING.md (FR-60/61) | hard | leaking client names, metrics, secrets in a shared artifact — the catastrophic failure | keep-hard; this is the skill's one rule |
| Cheap-scout / no raw bodies before pick (FR-30, Anti-Pattern 1) | hard | context blowout on thousands-of-sessions repos | keep-hard |
| Quality gate: ≥3 real prompts + ≥1 decision row (FR-51) | hard | padded articles with invented prompts/decisions | keep-hard; thresholds are cheap and the alternative (LLM judging "enough substance") is worse |
| Instructiveness floor + suppressed-count reporting (FR-32) | hard (in script) | thin /exit-only threads proposed as case studies | keep — lives in scout.mjs, costs SKILL.md nothing |
| Ambiguous-attribution confirm (FR-22) | hard | another repo's sessions silently mined into your article | keep-hard |
| Coverage line before deep-read (FR-13) | hard | silent undercount (the poker-coach failure) | keep-hard |
| Screenshot via localhost-only Playwright, degrade to excerpt (FR-52) | soft | hard-failing on a missing browser | keep-soft as is |
| structure.test.sh (name=dir, ≥5 trigger phrases, required files, zero-dep scripts) | hard (CI-ish) | loader/eval-rubric regressions | keep — skill-eval conformance, not prose ballast |

## Fix list

| Fix | Type | Impact | Risk |
|---|---|---|---|
| Fix comments contract: render via shared template + render.js (or delete the comment-resolver claim + asset copying) | structural | high | med — touch emit path; test one article end-to-end with /comments |
| Strip FR/D tags from SKILL.md body (provenance stays in reference/) | quick-win | med | none |
| Thin Phases 1/2/5 to intent + pointer + one inviolable rule (~35 lines saved) | quick-win | med | low — references already carry the detail |
| Define dry-run-confirm behavior under `--non-interactive` (one sentence) | quick-win | med | none |
| Align non-interactive block posture with frameworks/magazine/primer (inline or explicit marker) | quick-win | low | none |
