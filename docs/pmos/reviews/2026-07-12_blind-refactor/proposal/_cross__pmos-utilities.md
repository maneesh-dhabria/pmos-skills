# Proposal — pmos-utilities__cross

**Unit:** pmos-utilities__cross (whole plugin: `plugins/pmos-utilities/skills/` — converter, mac-health, reflect, to-notion-doc)
**Status:** CAPPED (pass 2 — hard cap reached). Passes: reviewer 1 → author 1 → reviewer 2 → author 2.
**Score:** 14 findings raised / 14 accepted / 0 rejected / 0 invalid. Pass-2 findings F10/F12/F13 amend the pass-1 fix designs for F3/F1/F7 respectively; the amended designs below are final.

This document is self-contained: it carries every finding's disposition and the full accepted change design. Changes are DESCRIBED, never implemented — the plugin files are untouched.

## Disposition table

| ID | Severity | Title (short) | Disposition |
|---|---|---|---|
| F1 | Should-fix | Charter/manifest name 2 skills; 4 exist, 2 fail the stated membership test | Accepted (design amended by F12) |
| F2 | Should-fix | /converter prose claims 2 conversion pairs; 4 are shipped and auto-registered | Accepted |
| F3 | Should-fix | /reflect duplicate phase numbers (two Phase 1/2/4/5) + zero anchors (§J) | Accepted (design amended by F10) |
| F4 | Should-fix | /reflect names two drifted transcript roots for one fact (§K + live bug) | Accepted |
| F5 | Should-fix | /mac-health resolves its script via `find .` from cwd — dead for installed plugins | Accepted |
| F6 | Nit | Frozen W14 block misbrands utilities skills as `pmos-toolkit:` + dangling `_shared/` cite | Accepted (canonical-home fix, cross-unit) |
| F7 | Nit | No "prompt-free" W14 exemption → /converter carries ~28 lines of self-admitted dead contract | Accepted (contract change, cross-unit; design amended by F13) |
| F8 | Nit | /reflect argument-hint carries two spellings of the same skill filter (§I) | Accepted |
| F9 | Nit | /converter cites repo-only design doc that doesn't ship with the plugin | Accepted |
| F10 | Should-fix | F3's "Phase M1–M4" scheme fails the gated `j-phases-integer` rubric check | Accepted (amends F3) |
| F11 | Should-fix | /reflect ships a dead contract flag — `--msf-auto-apply-threshold` has no consumer | Accepted |
| F12 | Should-fix | F1's replacement charter is mechanism-phrased — any local tool would "fit" | Accepted (amends F1) |
| F13 | Nit | F7's FR-08 fallback story is self-referential; honesty gate's "call site" undefined | Accepted (amends F7) |
| F14 | Nit | /reflect enumeration computes `skill-invocation-count` nothing consumes, at full-corpus scan cost | Accepted |

All quotes were spot-checked against the current files by the author in both passes — every finding is grounded; none invalid. (Pass-2 verification notes: F10's quote is verbatim at `plugins/pmos-toolkit/skills/feature-sdlc/reference/skill-eval.md:241`; F11 confirmed — "msf" appears in reflect/SKILL.md only at l.5 and l.41 (l.177 is an unrelated article-stripping example); F14 confirmed — `skill-invocation-count` is built at l.88 and never read by steps 2–5 or the dispatch phase.)

---

## Accepted changes (full detail)

### F1 + F12 [Should-fix] — Purpose-phrased charter covering all 4 skills
- **Files:** repo-root `CLAUDE.md` (## Plugin charters table, pmos-utilities row); `plugins/pmos-utilities/.claude-plugin/plugin.json` `.description`; `plugins/pmos-utilities/.codex-plugin/plugin.json` `.description`; both `marketplace.json` entry descriptions.
- **Before:** charter Holds column names only mac-health + reflect ("standalone diagnostics, cleanup, and meta-tooling that aren't part of a feature pipeline or a learning artifact (mac-health, reflect — a cross-plugin session retrospective)"); manifest description is "Environment utilities — keep your machine and working setup healthy…". Neither covers /converter (local file-format conversion) or /to-notion-doc (publish a local doc to Notion) — yet CLAUDE.md declares "The charters are the membership test, not just a description."
- **After (intent, final per F12):** charter question becomes purpose-phrased — "help me… **get a one-off job done — on my machine or my content**" — with explicit exclusions mirroring the sibling rows' style: Holds = "standalone utilities that **ship no feature, teach no topic, and play no game**: environment diagnostics and meta-tooling (mac-health, reflect — a cross-plugin session retrospective) plus local content tools (converter — file-format conversion; to-notion-doc — publish a local doc to Notion)". All 4 skills named so the membership test matches the inventory. Mirror the purpose+exclusions wording into both plugin.json descriptions and both marketplace.json entries.
- **Why F12's amendment:** the author's pass-1 wording ("run a standalone local utility") described form, not need — by mechanism every pmos-gamekit skill is also a standalone local utility (same zero-dependency local-server launch pattern converter uses), so the pass-1 wording would have re-created the arbitrary-placement problem. The ships-nothing/teaches-nothing/plays-nothing exclusion triple keeps the table a genuine membership test.
- **Rationale (F1 branch choice):** amend-charter over relocating converter/to-notion-doc — moving them would churn canonical skill paths, marketplace entries, `~/.pmos/learnings.md` section headers, and /reflect's plugin-namespace matchers for zero user benefit. The defect is that the stated membership test rejects half the plugin.
- **Blast radius:** CLAUDE.md charter row; 2 plugin.json descriptions (description-only; rides next pmos-utilities release); 2 marketplace.json descriptions. No skill bodies, lints, evals, or tests.

### F2 [Should-fix] — Make /converter's capability claims registry-derived
- **File:** `plugins/pmos-utilities/skills/converter/SKILL.md`, three sites.
- **Before:** frontmatter (l.3) defers HTML↔Markdown / PDF↔Markdown to "as the skill grows"; body (l.18) claims "v1 ships two bidirectional pure pairs — **JSON ↔ YAML** and **CSV ↔ JSON**"; Phase 0 step 4 (l.93) hard-codes "the supported conversions (JSON↔YAML, CSV↔JSON)". Reality: `lib/converters/` holds 4 descriptor modules (json-yaml, csv-json, html-md, pdf-md) and `lib/registry.js` `discover()` auto-registers all of them; `html-md.js` self-documents as live proof of the registry.
- **After (intent):** (a) frontmatter lists the four shipped pairs as current capability (verify html-md/pdf-md directionality by reading the modules before wording — they may be one-way) and adds trigger phrases for HTML→MD and PDF→MD; (b) body intro states the shipped conversions are whatever descriptors exist under `lib/converters/` (currently 4 named), with server startup output as the authoritative list; (c) Phase 0 step 4 tells the model to report the conversion list **as printed by the server at startup**, never a restated hard-coded list.
- **Rationale:** enumerated-set drift — the inventory grew, the prose didn't; the skill misreports its own capabilities at runtime and under-triggers on HTML/PDF requests. Sites (b)/(c) are fixed structurally so future converters can't re-drift them.
- **Blast radius:** converter/SKILL.md only; registry/server/UI untouched. Standard hygiene lints re-run on the skill dir.

### F3 + F10 [Should-fix] — De-phase /reflect's multi-session spine + add §J anchors
- **File:** `plugins/pmos-utilities/skills/reflect/SKILL.md`, all phase headings + every cross-reference.
- **Before:** two interleaved spines share integers — "## Phase 1 (multi-session prelude)" (l.82) vs "## Phase 1: Locate the Session Transcript" (l.124); same for Phase 2 (l.109/134), Phase 4 (l.159/196), Phase 5 (l.208/255). Zero `{#kebab-slug}` anchors in the file. Cross-refs are bare ambiguous numbers ("this seeds Phase 2 dispatch" l.107; "goes directly to Phase 1 below" l.84) — an executor resolving "Phase 2" has a coin-flip between two procedures.
- **After (intent, final per F10):** the multi-session spine **loses the `Phase` keyword entirely** — headings become non-phase sections with anchors: "## Multi-session prelude: enumerate candidates + D18 cap {#ms-enumerate}", "## Multi-session dispatch {#ms-dispatch}", "## Multi-session aggregation {#ms-aggregate}", "## Multi-session emission {#ms-emit}". The single-session spine remains the **sole** integer `Phase 0–6` namespace, each heading gaining a `{#slug}` anchor ({#locate-transcript}, {#detect-invocations}, {#peek-frontmatter}, {#analyze}, {#emit-retro}, {#capture-learnings}). Sweep every cross-reference to slugs: l.84 → {#locate-transcript}; l.107/161/163/243 → {#ms-dispatch}; l.115 "Phase 4 standalone rubric" → {#analyze}; l.120 → {#ms-emit}; l.212 → {#ms-aggregate}; any prose saying "Phase N (multi-session)" is reworded to "the multi-session <stage> ({#ms-…})".
- **Why F10's amendment:** the author's pass-1 "Phase M1–M4" scheme is exactly the "lettered (0c-style) top-level phases" shape the gated `j-phases-integer` [J] check (skill-eval.md:241) names as a fail — it traded one §J defect for a rubric-failing one. Dropping the `Phase` keyword exits that check's jurisdiction (it judges phase headings only) while the slugs — the real address per §J — do the work.
- **Blast radius:** reflect/SKILL.md only; `tools/lint-phase-refs.sh` must pass afterwards (the designed backstop for exactly this edit). Pre-check: grep repo-wide for external cites of reflect phases by number (`reflect/SKILL.md#`, "reflect.*Phase"); feature-sdlc's `--from-reflect` consumes /reflect's output shape, not phase numbers — expected clean.

### F4 [Should-fix] — One canonical transcript-root, derived from the active config dir
- **File:** `plugins/pmos-utilities/skills/reflect/SKILL.md`.
- **Before:** multi-session path globs `~/.claude-personal/projects/<project>/*.jsonl` (l.88; also the `--project` flag row l.38) while the single-session path lists `~/.claude/projects/<slug>/*.jsonl` (l.129) — one fact, two homes, drifted values (§K). On per-alias `CLAUDE_CONFIG_DIR` machines these are genuinely different corpora: single- vs multi-session runs would silently scan different sessions.
- **After (intent):** one canonical "Transcript root resolution" definition, stated once near the flag parser with a {#transcript-root} anchor: root = `${CLAUDE_CONFIG_DIR:-~/.claude}/projects/`. All three sites (l.38, l.88, l.129) cite {#transcript-root} instead of any literal path.
- **Rationale:** §K violation with a live behavioral bug on exactly the environments this repo's own global CLAUDE.md documents (per-alias config trees). Deriving from `CLAUDE_CONFIG_DIR` is the only value correct for all aliases.
- **Blast radius:** reflect/SKILL.md only; folds into the same edit pass as F3/F10/F14 (same section). lint-phase-refs.sh re-run covers the new anchor.

### F5 [Should-fix] — /mac-health resolves its script skill-dir-relative
- **File:** `plugins/pmos-utilities/skills/mac-health/SKILL.md`, "### 1. Capture a baseline" (l.59–76).
- **Before:** `bash "$(dirname "$(find . -path '*/mac-health/scripts/baseline_snapshot.sh' -print -quit 2>/dev/null)")/baseline_snapshot.sh" 2>/dev/null || echo "Script not found — use manual commands below"` — a downward search from the caller's cwd, which can never see the marketplace plugin cache, so the fallback fires on essentially every installed run; the "Or run manually" list reads as a peer option, inviting a double-run of ps/top.
- **After (intent):** adopt the sibling /converter pattern (converter/SKILL.md:79): a step-0 "Resolve paths relative to this skill's directory (`<skill-dir>`)" instruction, then `bash <skill-dir>/scripts/baseline_snapshot.sh`. Keep the manual command list but reframe it as the explicit fallback branch ("if the script is missing or errors"), not a peer alternative.
- **Rationale:** the bundled script is dead weight in the skill's normal deployment; the fix pattern is already proven in the same plugin.
- **Blast radius:** mac-health/SKILL.md only; `scripts/baseline_snapshot.sh` unchanged; no lints/evals affected.

### F6 [Nit] — Fix the frozen W14 block in its canonical home, then re-paste everywhere
- **Files:** canonical `plugins/pmos-toolkit/skills/_shared/non-interactive.md` (the block's ONE home — never edit the pasted copies directly), then byte-identical re-paste into every W14-inlined SKILL.md across all 5 plugins (incl. the 4 pmos-utilities skills).
- **Before:** frozen step 8 prints `pmos-toolkit: /<skill> finished — outcome=… (NFR-07)` — misbranding every non-toolkit skill; frozen step 5 cites "`_shared/non-interactive.md`" as "this file", but pmos-utilities ships no `skills/_shared/` at all (reflect/SKILL.md:288 says so itself), so standalone installs carry a dangling substrate cite.
- **After (intent):** (a) step 8 prefix → plugin-neutral `pmos-skills:`; (b) step 5 parenthetical reworded to name the canonical home explicitly ("Section D of the canonical contract file — pmos-toolkit `skills/_shared/non-interactive.md` in the pmos-skills repo") so no local `_shared/` is implied. Re-paste + `lint-non-interactive-inline.sh` green.
- **Rationale:** both defects live in the canonical block; the byte-identical lint faithfully replicates them and can never surface them — only a canonical-home edit works. A stable `pmos-skills:` literal beats a parameterized `/<plugin>:` inside a frozen-byte contract.
- **Blast radius:** LARGE / cross-unit — canonical file, repo-wide re-paste, lint run, plus any spec/eval/test asserting the exact `pmos-toolkit: /<skill> finished` NFR-07 string (grep repo-wide before landing). Must be coordinated as a repo-level change owned with pmos-toolkit (candidate: its own story, paired with F7/F13), not smuggled into a utilities-only patch. Severity stays Nit.

### F7 + F13 [Nit] — Add a `prompt-free` W14 exemption marker; /converter uses it
- **Files:** canonical `plugins/pmos-toolkit/skills/_shared/non-interactive.md` (exemption vocabulary); `plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh`; `plugins/pmos-toolkit/tools/audit-recommended.sh` (+ extractor selftest); then `plugins/pmos-utilities/skills/converter/SKILL.md`.
- **Before:** converter self-documents its largest block as inert — "The non-interactive contract block below is inlined only to satisfy the repo-wide W14 lint; no checkpoint ever fires." (l.31–32) — ~28 lines (~a quarter of a 104-line skill) of dead contract, because the exemption vocabulary covers only `refused` and `delegated`.
- **After (intent, final per F13):** add `<!-- non-interactive: prompt-free; <justification> -->` meaning: zero `AskUserQuestion` call sites by design; the inlined block is omitted. The marker's spec text states the actual behavior directly — **"a stray `--non-interactive` flag is inert: the skill issues no prompts, so it runs identically with or without it; no warning is emitted"** — with NO cite of FR-08 (FR-08 lives inside the block the marker replaces; citing it from a skill that omits the block is self-referential dead text — its condition is only testable where the block exists). The honesty gate in audit-recommended.sh **binds to the existing shared call-site extractor** (which already skips the two provably-never-a-prompt line shapes: the canonical platform-adaptation degradation bullet and negative prose), NOT raw `AskUserQuestion` token grep — hard-fail iff the extractor finds ≥1 real call site in a `prompt-free`-marked skill. Named acceptance test: converter itself (whose l.29 Platform Adaptation bullet contains the literal token) must pass the gate. Converter then swaps block + apology for the one-line marker.
- **Why F13's amendment:** two implement-it-wrong traps in the pass-1 design — the FR-08 fallback story could only execute where its condition is false, and a naive grep gate would hard-fail the first marker user on its own degradation bullet (the same token-vs-call-site distinction the repo's zero-match-gate lesson codifies).
- **Rationale:** the gap is in the lint/rubric contract, not the skill; the extractor-bound audit makes the marker as safe as `refused`/`delegated` — a later-added prompt can't hide behind it.
- **Blast radius:** cross-unit — canonical non-interactive.md, two pmos-toolkit tool scripts (+ extractor selftest), converter/SKILL.md, and skill-eval.md / skill-patterns.md if they restate the exemption list (§K check: grep the feature-sdlc reference docs for "refused"/"delegated" before editing). Coordinate with the pmos-toolkit owner; natural companion story to F6.

### F8 [Nit] — /reflect hint keeps only `--skill`; positional becomes nl-sugar
- **File:** `plugins/pmos-utilities/skills/reflect/SKILL.md`, frontmatter l.5 + flag table.
- **Before:** argument-hint carries both `[skill-name to filter, optional]` and `[--skill <name>]` — two spellings of one filter; only `--skill` is defined in the flag table while Phase 2 (l.144) honors "the skill name argument".
- **After (intent):** drop the positional from the hint; keep accepting a bare positional skill name in the body, documented as a silent alias with an adjacent `<!-- nl-sugar -->` marker per §I.
- **Rationale:** §I — the hint lists contract flags only; the positional form is already a de-facto nl-sugar alias.
- **Blast radius:** reflect/SKILL.md frontmatter + one body marker; `tools/lint-flags-vs-hints.sh` re-run (the nl-sugar marker keeps the body-handled positional green). Note: the same hint edit also removes `--msf-auto-apply-threshold` per F11 — one frontmatter pass.

### F9 [Nit] — /converter's extension contract cites a shipped home
- **Files:** `plugins/pmos-utilities/skills/converter/SKILL.md` (l.21–23); possibly a comment-only extension to `lib/registry.js` header.
- **Before:** the skill's one pointer to "the registry shape, the text/binary descriptor modes, the pure-vs-llm backend split" is `docs/pmos/features/2026-06-17_converter/02_design.html` — repo history, absent from every installed copy.
- **After (intent):** re-point the load-bearing extension facts at `<skill-dir>/lib/registry.js`'s header comment (verify/extend that comment so it actually carries all three facts — it already documents discover() and the descriptor shape). Keep the design-doc mention only as a trailing parenthetical explicitly labeled repo-only development provenance.
- **Rationale:** §K — the facts an extender needs must live in a shipped canonical home cited from the skill; the design doc dangles everywhere except this dev repo.
- **Blast radius:** converter/SKILL.md + comment-only registry.js header; no code, lints, evals, or tests.

### F11 [Should-fix] — Delete /reflect's dead `--msf-auto-apply-threshold` flag
- **File:** `plugins/pmos-utilities/skills/reflect/SKILL.md`, frontmatter argument-hint (l.5) + flag table (l.41).
- **Before:** the flag is hinted and defined ("Confidence threshold for any folded MSF apply-loops invoked by /reflect (per FR-RETRO-MSF integration).") but no phase in the body ever invokes an MSF apply-loop — "msf" appears only at l.5 and l.41 (l.177 is an unrelated article-stripping example). A user tuning the threshold gets a silent no-op; the row passes `lint-flags-vs-hints.sh` while promising behavior the skill cannot deliver.
- **After (intent):** delete the flag from both surfaces, including the "per FR-RETRO-MSF integration" cite. No consuming phase is written: /reflect is recommendations-only by design (paste-back retro blocks; it never applies edits), so a folded-MSF apply-loop has no place in its contract — the flag was aspirational scaffolding that never got a consumer.
- **Rationale:** the flag name is machine-coupled where it is real (spec/requirements/wireframes → pmos-toolkit `_shared/folded-phase.md`); deleting an inert copy from reflect renames nothing and breaks no consumer — reflect was never wired into that mechanism. Delete beats point-at-real-consumer because reflect has no folded phase for the row to describe.
- **Blast radius:** reflect/SKILL.md only (hint + one table row; same frontmatter pass as F8). `tools/lint-flags-vs-hints.sh` re-run. Grep repo-wide for "FR-RETRO-MSF" before landing to confirm no doc promises the integration (only hit today is this flag row).

### F14 [Nit] — Drop the dead `skill-invocation-count` field from /reflect's candidate rows
- **File:** `plugins/pmos-utilities/skills/reflect/SKILL.md`, multi-session prelude step 1 (l.88).
- **Before:** "Build candidate rows: `(date, size, skill-invocation-count, project-slug)`" — computing the count requires opening and content-scanning every candidate jsonl **before** the D18 cap trims the set (with `--project all`, potentially hundreds of files), yet nothing consumes it: step 2 filters on date, step 4 counts rows, dispatch takes the trimmed list and does its own in-transcript detection.
- **After (intent):** row shape becomes `(date, size, project-slug)` — enumeration touches only filesystem metadata (mtime/size/path), no file opens. If a per-transcript invocation count is ever wanted for display, compute it lazily for the trimmed post-cap set only (≤20 files); default fix is plain deletion.
- **Rationale:** a dead tuple field that mandates exactly the unbounded up-front corpus scan the 20-transcript cap and NFR-02 wall-clock budget exist to prevent.
- **Blast radius:** reflect/SKILL.md one line; folds into the same edit pass as F3/F4/F10 over the multi-session section. No lints/evals/tests affected.

---

## Rejections
None — all 14 findings accepted across both passes.

## Open questions
None — no unresolved disagreements. Every pass-2 challenge to a pass-1 fix design (F10 vs F3, F12 vs F1, F13 vs F7) was accepted and folded into the final designs above.

## Notes for implementation
- **One reflect edit pass:** F3/F10 (headings+anchors+ref sweep), F4 (transcript-root), F8+F11 (frontmatter hint + flag table), F14 (row shape) all touch reflect/SKILL.md — land as one pass, then run `tools/lint-phase-refs.sh` and `tools/lint-flags-vs-hints.sh` on the skill dir.
- **Cross-unit story:** F6 + F7/F13 fix files living in pmos-toolkit (`skills/_shared/non-interactive.md`, `tools/lint-non-interactive-inline.sh`, `tools/audit-recommended.sh`) with a repo-wide byte-identical re-paste. They are accepted here because the defects manifest in pmos-utilities, but landing must be coordinated as its own repo-level story with the pmos-toolkit owner.
- **F1/F12 rides a release:** the plugin.json description edits ride the next pmos-utilities version bump per release policy.
