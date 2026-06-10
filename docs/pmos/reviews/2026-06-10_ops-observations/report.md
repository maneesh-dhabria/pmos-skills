# Ops-observations review — pmos-toolkit + pmos-learnkit + pmos-utilities

**Date:** 2026-06-10 · **Scope:** 7 maintainer observations about how the skills *operate* (subagent economics, integration seams, interface design, artifact model, backlog loops, self-verification value, browser verification) · **Method:** 7 independent investigator agents, each combining repo evidence with 15 days of real session transcripts (~925 files across agent-skills + the app repos where the skills get used). Detailed findings: `01_…` – `07_…` in this folder. Companion to the same-day [skill-design review](../2026-06-10_skill-design-review/report.md), which covered design quality; this one covers operations.

## Verdict in one paragraph

The architecture decisions you were unsure about are mostly **already right** — per-phase artifacts, the two-loop backlog mental model, subagent-based review isolation, fixing /verify rather than adding a post-deploy stage, and *not* building a mega-router all survive scrutiny. What the transcripts expose is an **operations layer that was never tuned**: zero of 640 real subagent dispatches in 15 days pinned a model (97 MB of Opus transcripts in one skill-sdlc run, including ~60 mechanical caption batches that were haiku work); self-verification iteration 2 produced new findings in **0 of 27** observed loop runs while primer's reviewer went 7-for-7 with zero findings ever; and /verify drove a browser unprompted in only **5 of 10** browser-relevant runs — in 3 of the 5 failures the work was already merged (once: tagged and released) before any browser interaction, and in one case you found the exact unverified-FR broken **3 minutes after** a bare PASS verdict. The connective tissue diagnosis from the design review extends cleanly: prose-narrated seams between skills are where contracts rot (one brand-new phantom found: `--from-reflect` reads an artifact /reflect deliberately never writes), while every typed seam (state.yaml, resolve-input, apply-edit JSON) had zero defects.

## Per-observation verdicts

| # | Observation | Verdict | Findings file |
|---|---|---|---|
| 1 | Subagents used properly with right models? | **Dispatch architecture healthy; model selection nonexistent.** 0/640 dispatches model-pinned; no policy anywhere; ~70–80% of reviewer traffic sits behind deterministic parent-side validators and is safe to downsize ~10× in price. | [01](01_subagents-models.md) |
| 2 | Integration / compose / decompose done right? | **Good with a pattern disease.** Typed seams: zero defects. Prose seams: every phantom lives there. Collapse 14 forked apply-edit shims (~2,700 LOC); script the FR-50/51/52 validator; feature-sdlc decomposes by *mode reference files*, not new skills. | [02](02_integration-composition.md) |
| 3 | Mega-router /pmos-toolkit skill? | **Don't pursue.** Descriptions already are the NL router; a hand-maintained routing table is the facts-stated-twice disease at maximum scale (feature-sdlc's 4-mode grammar already shipped 3 mis-dispatch bugs at 1/8 the size). Zero routing failures in 939 transcripts. Instead: boundary-sentence description tuning (~12 skills) + optional lightweight `/pmos` concierge for discovery only. | [03](03_interface-router.md) |
| 4 | Per-phase artifacts vs single evolving doc? | **Keep per-phase; add lifecycle + supersession layer.** Drift is real but localized: stale promises post-/verify scrubs, frozen specs cited as living contracts. Fix: /complete-dev stamps `status: Shipped`, /verify writes `superseded-by` markers, spec template cites-with-deltas instead of restating, runtime skills cite only living reference docs. ~1 day. | [04](04_sdlc-artifact-model.md) |
| 5 | Two abstractions for backlog vs execution? | **Right as a mental model — wrong as new skills.** ~80% exists. ~80 lines across 4 skills closes it: ideate→backlog capture (0 of 14 briefs ever became items), `/backlog next` picker, `--next-from-backlog`, /complete-dev writes back (today: zero backlog refs), `add --done` retro capture. Live data: 8 open items, all stuck at `inbox`, untouched 4 weeks. | [05](05_backlog-ideation-loop.md) |
| 6 | Self-verification loops adding value? | **Directionally right, over-built.** ~33% of 27 loop runs caught something real — concentrated in deterministic scripts and inline self-reviews. Iteration 2: 0/27 yield. Primer reviewer: 0 findings in 7 runs (~90s + 117 KB each). Collapse all 2-loop budgets to 1 + retry-on-hard-fail; delete /verify's fresh [J] re-run; script the checks that produced the LLM-judges' real catches. | [06](06_self-verification-value.md) |
| 7 | /verify skips browser verification? | **Confirmed: 5/10 unprompted, 3 after you pushed, 2 never.** Root causes: UI-surface *enumeration* is a judgment escape ("renders to disk ⇒ no surface"); unproven tool-unavailability claims; no verdict↔evidence coupling (bare PASS with FR marked Unverified, broken 3 min later). Fix inside /verify, not a new stage: deterministic trigger (frontend-file diff or HTML artifact ⇒ browser phase mandatory), tool-resolution ladder, PASS requires screenshot evidence via a ~30-line hard-gate script; skip ⇒ PASS-WITH-GAPS, which /complete-dev treats as confirmation-required. | [07](07_verify-browser.md) |

## Systemic findings (ranked)

### 1. Model selection is the single biggest pure win — and it's a policy gap, not a refactor
The Task tool's `model` param exists and works (22 ad-hoc pins observed); skills simply never specify it, so 96.6% of dispatches inherit the frontier model. The one local policy table (`execute/subagent-driven.md:23-34`) is qualitative and never names the param. Because most pmos reviewers sit behind deterministic parent-side validators (quote-grounding greps, set-equality checks), they are exactly the dispatches a cheaper model can't silently break. Fix: a model-tier policy paragraph in `skill-patterns.md` (haiku = mechanical/parent-validated, sonnet = bounded generation, inherit = genuine judgment), then pin the high-volume fan-outs first (magazine per-item, reflect per-transcript, readme ×5 reader, frameworks ingestion, caption batches). The skill-eval rubric should check for it so /skill-sdlc-authored skills stop inheriting the blindness.

### 2. The prose-seam rule: typed seams had zero defects, narrated seams had all of them
Every phantom/stale contract found this round lives where skill A *describes* skill B instead of invoking or citing it: the new `--from-reflect` phantom (feature-sdlc:90 reads "the newest /reflect artifact"; reflect:257 by design never writes one), the ≥10-skill `.comments.json` sidecar boilerplate retired in v2.58.0, readme→polish's "Suggest:" theater. The design review's lint program (phase-ref resolver, flag cross-check) should gain a third member: a **seam lint** — every `/skill-name` mention in another skill's body resolves against that skill's actual contract surface.

### 3. Verification machinery: trust the deterministic half, demote the ceremonial half
Three findings triangulate the same shape. Loops: value concentrates in [D] scripts + inline self-review; LLM-judge second passes are latency. /verify: the missing browser gate is precisely a deterministic check nobody wrote. Skill-eval: one taste check produced 3/3 of observed [J] false positives with inconsistent verdicts. This is the design review's adopted gates policy (*deterministic = hard, judgment = advisory, arithmetic = script*) re-confirmed by live data — the remaining work is applying it to the loop budgets and the /verify verdict.

### 4. Revealed preference is design feedback
Transcripts show the system already routing around its own ceremony: all 4 wireframes runs chose medium/low rigor (the high-rigor 2-loop fan-out never executed); /prototype, /diagram, /polish, /artifact, /readme, /msf-wf loops ran zero times in-window; controllers economized below spec (1–3 verify reviewers instead of 5). When the defaults are consistently overridden in one direction, move the defaults.

### 5. The capture seam leaks ideas; the execution seam can't self-feed
0 of 14 ideate briefs became backlog items; all 8 open backlog items sit at `inbox`; /complete-dev never closes the loop. The two-loop workflow needs no new abstractions — it needs the existing ones connected: capture-to-backlog at ideate close, a deterministic `next` picker, status write-back at release. After that, `/loop 1d "/feature-sdlc --next-from-backlog --non-interactive"` works with machinery that already exists (worktrees, W14 non-interactive contract).

## What's genuinely good (keep)
- Subagent *roles* (fresh-eyes reviewers, bounded fan-outs, bulk work out of main context) — the dispatch architecture needed no fixes, only pricing.
- Typed seam machinery: state-schema.md, resolve-input.md, apply-edit JSON, execution_mode frontmatter — zero defects across ~30 seams.
- Per-phase artifacts as decision records (the org-mirror instinct was right); the newest feature folder already converged on cite-don't-restate unprompted.
- Inline self-review loops (spec/plan loop-1: 8 + 5 real findings at zero dispatch cost) and deterministic [D] gates (caught the agent's own silently-failed edits twice in one session).
- The decision not to bolt on post-deployment verification: the gap is pre-merge; half the observed failures had no "deployment" to hook.

## Prioritized program

**P0 — correctness / safety (small, mechanical):**
- Fix or delete the `--from-reflect` phantom (decision needed: make /reflect write an artifact vs re-point the flag at conversation context).
- Scrub the 10-skill `.comments.json` sidecar boilerplate to the inline-JSON contract.
- /verify browser hard gate: deterministic trigger rule + tool-resolution ladder + `check-browser-evidence.sh` + PASS-WITH-GAPS verdict tier (07's diff sketch).

**P1 — economics (mechanical at scale):**
- Model-tier policy into skill-patterns.md + skill-eval check; pin models on the top-5 high-volume fan-outs; fix paste-vs-path in readme/skill-eval prompts.
- Collapse 2-loop budgets to "1 pass + retry on hard-fail" repo-wide; delete /verify's fresh [J] re-run; demote primer's reviewer to opt-in.
- Add the seam lint to the design review's lint program.

**P2 — design changes (each a /skill-sdlc run):**
- Backlog two-loop change set (~80 lines, 4 skills) — bundle with the design review's approved backlog NL-routing P3 item.
- Artifact lifecycle layer: Shipped stamps, superseded-by markers, cite-with-deltas spec template, living-docs-only citation rule (+ backfill script).
- Description boundary-tuning across ~12 ambiguous skills (the 3 collision clusters in 03).
- Collapse the 14 apply-edit-at-anchor shims into one shared module; script the FR-50/51/52 reviewer-return validator.
- feature-sdlc per-mode reference-file decomposition.

**P3 — strategic (decide, then schedule):**
- `/pmos` concierge skill (discovery-only, runtime catalog, dispatches via Skill tool) — pmos-utilities charter.
- Fresh-subagent stage dispatch for feature-sdlc (the file-based briefs already make stages self-contained; blocker is mid-stage interactivity, partially solved by the non-interactive contract).
- /primer adopting /learn-list's research fan-out at standard/deep.

## Decisions (2026-06-10, with maintainer)

1. **Applied this session (4 batches):** /verify browser hard gate (deterministic trigger + tool ladder + evidence gate + PASS-WITH-GAPS); sidecar-boilerplate scrub across the ~10 stale skills; model-tier policy (skill-patterns.md + skill-eval check + pins on the high-volume fan-outs); loop collapse ("1 pass + retry on hard-fail", /verify fresh-[J] re-run deleted, primer reviewer demoted to opt-in).
2. **`--from-reflect` phantom: re-pointed, not implemented** — the flag accepts pasted text or an explicit path; the "newest /reflect artifact" auto-resolution claim is removed. /reflect stays artifact-free by design (consistent with the design review's delete-don't-implement precedent for phantoms).
3. **`/pmos` concierge: maintainer will explore the idea separately** — design sketch preserved in [03](03_interface-router.md); mega-router itself rejected.
4. **Backlog two-loop change set: needs discussion and review before implementing** — not applied; full design in [05](05_backlog-ideation-loop.md) is the input for that conversation.
5. **repo-audit skill extended** with the durable methodology from this review: seam-map cross-cutting pass, transcript-grounded operations passes (model economics / loop value / instruction adherence), revealed-preference calibration note.

## Apply wave (same session) — what landed

- **/verify** — deterministic browser-mandatory trigger (frontend-file patterns or HTML deliverable ⇒ 4d–4f mandatory, "no UI surface" unavailable); "an HTML file IS a browser surface" rule; 4-rung browser-tool resolution ladder (Playwright MCP w/ deferred-tool loading → chrome-devtools → headless `npx playwright screenshot` → proven failure required); 3-tier verdict vocabulary in Phase 8 (bare PASS needs a screenshot under `{feature_folder}/verify/` + zero UI-FRs Unverified; otherwise PASS-WITH-GAPS with enumerated gaps); new `scripts/check-browser-evidence.sh` wired into Phase 7 Hard Gates; two new rationalization-table rows.
- **/complete-dev** — Phase 1 PASS-WITH-GAPS check (always runs, never short-circuited by lastrun defaults; defer-only destructive prompt); lastrun-schema destructive-prompt allowlist updated.
- **Model-tier policy** — new §L in skill-patterns.md (haiku=validator-checked mechanical, sonnet=bounded generation/rubric review, inherit=judgment; dispatches name the Task `model` param); mirrored as gated [J] check `l-dispatch-model-tier` in skill-eval.md (counts updated 52→53; selftest green); execute's subagent-driven table generalized; pins applied at readme (×5 fan-out, sonnet), survey-analyse coder (sonnet), magazine Stage-B per-item (haiku), frameworks derivation batches (haiku), learn-list per-topic sourcer (haiku), reflect per-transcript scanner (haiku). Judgment-shaped sites deliberately left inherited (frameworks SVG gen, primer reviewer).
- **Paste→path** — readme's 5 concurrent prompts and feature-sdlc Phase 6a's eval dispatch now pass file paths, not pasted artifact text.
- **Loop collapse** — wireframes/prototype/polish loop 2 now fires only on unresolved deterministic hard-fails (advisory findings → rollup, never re-loop); diagram/artifact/readme/msf-wf and all learnkit loops verified already compliant (no-ops); primer's reviewer demoted to opt-in (`--depth deep` or on request) after 7/7 observed zero-finding runs; feature-sdlc Phase 6a/7 + skill-eval.md now state [J] runs once at 6a, /verify re-runs the [D] half only.
- **Sidecar scrub** — 12 files (learnkit `_shared/apply-edit-at-anchor.md` re-aligned byte-identical to toolkit's + 11 SKILL.md boilerplate lines) moved from retired `.comments.json` sidecar language to the inline `pmos-comments` contract.
- **`--from-reflect` re-point** — resolves from the current conversation's /reflect output; phantom file-resolution claim removed. Plus small stragglers: feature-sdlc's three `§A–§F` citations → `§A–§L`; primer's FR-RECOVERY step-15→16 cross-ref bug.
- **Gates after the wave:** lint-non-interactive 36/36 PASS · audit-recommended PASS · skill-eval-check --selftest PASS (53/47/24/23) · check-browser-evidence.sh tested (pass/fail/no-trigger cases). `tools/lint-phase-refs.sh` remains red with ghosts that all pre-exist at HEAD (verify Phase 6b ×2, complete-dev Phase 1a, feature-sdlc Phase 5a/1.5, skill-eval Phase 7.5 ×2, wireframes/prototype/execute) — none introduced today; they belong to the in-flight design-review remediation.
