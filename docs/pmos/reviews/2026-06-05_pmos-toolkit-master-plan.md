# pmos-toolkit Remediation — Master Implementation Plan

**Date:** 2026-06-05
**Consolidates:** the 14 work items in `2026-06-05_pmos-toolkit-remediation-program.md` into one ordered task list.
**Owner legend:** `[me]` = I edit files directly · `[me/skill]` = I implement, optionally via `/feature-sdlc skill --from-feedback` for the eval gate · `[you-decide]` = your call, gates downstream · `[you-authorize]` = I stage it, you approve before it runs.

Each wave is one branch + one verify pass + (where noted) one release. Waves are ordered by dependency, not just priority — W2 settles the non-interactive block *before* the skill-revision wave so we don't re-paste twice.

---

## Wave 0 — Decisions (LOCKED 2026-06-05)

| Task | Item | Decision |
|---|---|---|
| T0.1 | **D1** — plugin scope | ✅ **Create `pmos-utilities`, move `mac-health` into it, keep `architecture` in pmos-toolkit.** Add per-plugin charters to CLAUDE.md (toolkit = ship a feature; learnkit = learn a topic; utilities = maintain your environment). |
| T0.2 | **D2** — visual direction | ✅ **Draft 2–3 concrete styled options first, then implement the chosen one** (Wave 5). |
| T0.3 | **D3** — creativity/msf-req | ✅ **Merge into `requirements-review --mode friction\|creativity\|both`** (with aliases for the old names). |

**Execution mode (locked):** start W1 immediately, checkpoint at each wave boundary, releases require explicit go-ahead, flag `/compact` points before heavy waves.

---

## Wave 1 — P0 correctness (ship immediately) — ✅ DONE (uncommitted, on branch `feat/toolkit-remediation-substrate`)

| Task | Item | Owner | Status |
|---|---|---|---|
| T1.1 | Branch `feat/toolkit-remediation-substrate` | `[me]` | ✅ created |
| T1.2 | **W1** repoint **9** stale `.shared/resolve-input.md` → `_shared/` (verify, spec, plan, execute, wireframes, creativity, simulate-spec, prototype, **backlog**); delete `.shared/`; add `tools/lint-no-dot-shared.sh` | `[me]` | ✅ 9 files, lint green, dir deleted |
| T1.3 | Verify Wave 1 | `[me]` | ✅ zero dot-shared refs; canonical resolver intact (html-aware) |
| T1.4 | Release pmos-toolkit (patch bump) | `[you-authorize]` | ⏸ batch with Wave 2 |

**Note:** the drift was 9 inconsistent refs (not the whole spine — most skills already cited `_shared/`). A 10th candidate was found and fixed (backlog:410, hidden from the first grep because that line also contains `_shared/pipeline-setup.md`).

---

## Wave 2 — Shared-substrate refactor (mechanical, one branch)

| Task | Item | Owner | Acceptance |
|---|---|---|---|
| T2.1 | **W2** relocate awk extractor → **Section D** of `_shared/non-interactive.md` (NOT `tools/` — see note); shrink the inline block from 83→27 lines across 28 block-carrying skills | `[me]` | ✅ DONE — no awk in any SKILL.md; inline lint resolves all block drift (residual 5 = pre-existing missing-block); audit + 59 bats unchanged |
| T2.2 | **W4** create `_shared/tracker-crudl.md`; refactor backlog/mytasks/people onto it; add schema-version field | `[me]` | ✅ DONE — shared contract created; 3 `schema.md` cite it + drop duplicated invariants; `schema_version: 1` added (absent==1); SKILL refs updated; people declared as handle-keyed/no-archive deviation; scenarios markdown-only (no exec tests broken); inline lint unchanged (5 pre-existing) |
| T2.3 | **W7** create `_shared/writing-principles.md`; cite from artifact-emitting skills; point polish's rubric at it | `[me]` | ✅ DONE — principles file (12 principles ↔ 14 polish checks); cited via `conventions.md §12` (single fan-out to all 21 html-authoring skills); polish `rubric.md` declared as the enforcement (two-way link); fanout + bytestable tests green |
| T2.4 | **W5-prep** extract `_shared/persona-journey-alignment.md`; cite from creativity/msf-req/msf-wf | `[me]` | ✅ DONE — source-parameterized persona+journey ceremony; msf-heuristics "Persona Alignment" redirects to it (converges msf-req/msf-wf automatically); creativity's inlined Phase 1/2 repointed; journey phases cite Step 2; audit unchanged (creativity/msf-wf 0 unmarked, msf-req exempt); inline lint unchanged |
| T2.5 | **W13** move `learnings-capture.md` → `_shared/`; repoint 20 citations; make requirements cite (not inline) | `[me]` | ✅ DONE — `git mv` to `_shared/`; 20 skills cite it; fixed 2 pre-existing broken paths (polish `~/.pmos/learnings/…`, diagram's mangled parenthetical); empty `learnings/` dir removed; requirements now **cites** the shared ceremony **and keeps** its one-line-output gate (uniform mechanics, no gate regression); lints unchanged |
| T2.6 | **W12** standardize phase numbering (integer + lettered sub-phases) + `requirements_ref` frontmatter key | `[me]` | ✅ DONE — all decimal/addendum sub-phases → integer+letter (`6.5`→`6a`, `0 addendum`→`0a`, etc.) tree-wide (SKILL.md + reference/tests/fixtures/eval/py + 2 `_shared/` execute helpers); `Phase 0.5` disambiguated per-owner (execute→0c, complete-dev→0a, **primer/pipeline-setup left untouched** — different plugin); spec frontmatter `requirements:` → `requirements_ref` (matches plan); 7 phase smoke tests + diagram/polish tests + 59 bats + all lints green |
| T2.7 | `/verify` Wave 2 + release pmos-toolkit (minor bump, changelog, tag, push) | `[you-authorize]` | ⏸ **DEFERRED per your call** — continue to Wave 3 unreleased; release a larger batch later. (You'll `/compact` before Wave 3.) |

**T2.1 design note (divergence from plan wording):** the awk was relocated to a new **Section D of `_shared/non-interactive.md`**, not to a standalone `tools/*.awk` file. Rationale: `audit-recommended.sh` and three bats suites (`classifier`, `perf`, `destructive`) already source the extractor from this file's `<!-- awk-extractor:start/end -->` markers. Keeping it in the same file (just outside the inlined block) removed it from all 28 runtime prompts **with zero changes to those 4 consumers** — strictly lower blast radius than a `tools/` move, same acceptance criteria met. One test (`structure.bats`) updated to assert the new layout (block references the auditor; extractor lives in Section D). Pre-existing, out-of-scope: 5 skills (architecture, comments, ideate, prototype-sdlc, skill-sdlc) carry no non-interactive block at all (FR-08 not-yet-rolled-out / aliases) — they keep the inline lint at exit 1 independent of W2.

---

## Wave 3 — Skill revisions (eval-gated)

These get value from the binary `skill-eval` rubric. I implement; we run `skill-eval-check.sh` per skill (or you trigger `/feature-sdlc skill --from-feedback` with the paste blocks from the remediation doc).

| Task | Item | Owner | Acceptance |
|---|---|---|---|
| T3.1 | **W9a** changelog — triggers, learnings phase, track-progress, platform-adaptation, marker fix | `[me/skill]` | ✅ DONE — 14/14 [D]; restructured to phases; non-interactive block byte-stable; marker already fixed by W2 |
| T3.2 | **W9b** comments — resolve identity (recommend: first-class skill), add gates | `[me/skill]` | ✅ DONE — first-class (`user-invocable: true`), 15/15 [D], prose thinned to defer to scripts. **Flagged:** resolver.js still sidecar-based; CLAUDE.md says inline — separate item |
| T3.3 | **W9c** session-log — triggers, phases, fold instructions.md, clarify vs reflect | `[me/skill]` | ✅ DONE — 14/14 [D]; `instructions.md` folded in + deleted; clarified vs /reflect |
| T3.4 | **W5** discovery-cluster description disambiguation (+ execute D3 outcome) | `[me/skill]` | ✅ **DONE (merge SUPERSEDED — your call 2026-06-05)** — see note below |
| T3.5 | **W8** move inline templates → `reference/` in spec, plan, design-crit, survey-design | `[me/skill]` | ✅ DONE — spec 1019→695, plan 861→636 (both via new `reference/*-templates.md`); survey-design ToC + Track-Progress + numbered Capture-Learnings; design-crit already under ceiling (left as-is). All 4 fully [D]-green |
| T3.6 | **W10** extend theater-check to design-crit + survey-design | `[me/skill]` | ✅ DONE — FR-SR-5 single-retry guard added to design-crit Phase 4 per-journey pass + survey-design Phase 6 respondent pass |
| T3.7 | `/verify` + release pmos-toolkit | `[you-authorize]` | ⏸ awaiting go-ahead |

**T3.4 note — D3 merge superseded (decision 2026-06-05):** investigation found the D3 premise ("creativity + msf-req are functionally redundant — same input, same pipeline slot") is stale. A deliberate **v2.34.0 pipeline-consolidation** already achieved D3's de-duplication goal: `/msf-req` is folded into `/requirements` Phase 5a (MSF friction via `_shared/msf-heuristics.md`, auto-apply loop, `msf-req-findings.md` contract consumed by `/verify` + `/complete-dev` FR-68), `/simulate-spec` is folded into `/spec` Phase 6a, and `/creativity` remains the lone soft gate (feature-sdlc Phase 3a). Post-v2.34.0 the two are **not** in the same slot, so the merge would re-litigate a working design across feature-sdlc/requirements/spec/verify + ~11 cross-refs. **Decision (you, 2026-06-05): skip the merge; do not create `requirements-review`; keep `/creativity` and `/msf-req` as-is.** The description-disambiguation half of W5 was already satisfied by earlier waves — every cluster description (grill, ideate, simulate-spec, creativity, msf-req, msf-wf) leads with method + object and names its pipeline stage; the remaining "stress-test"/"friction" trigger overlaps are separated by object (plan vs idea vs spec; requirements vs wireframes). No description edits were manufactured. The architecture review's D3 rationale should be treated as superseded by v2.34.0.

---

## Wave 4 — Scope / new plugin (depends T0.1)

| Task | Item | Owner | Acceptance |
|---|---|---|---|
| T4.1 | **W6** scaffold `pmos-utilities` (2 manifests @0.1.0, marketplace entries, Plugins-list); move `mac-health`; add charters to CLAUDE.md | `[me]` | ✅ **DONE** — `git mv` mac-health → `plugins/pmos-utilities/skills/mac-health` (canonical path, name==dir); both `plugin.json` @0.1.0; both marketplace catalogs gain a `pmos-utilities` entry **with no `version` field**; CLAUDE.md gains a **## Plugin charters** table (ship-a-feature / learn-a-topic / maintain-my-environment) + Plugins-list entry. All 6 manifests valid JSON. Toolkit baselines unchanged (inline lint 5 fail, audit 37) — mac-health was a passing block-carrier with 0 audit call-sites. See note below. |
| T4.2 | Release **pmos-utilities** (0.1.0) + pmos-toolkit (mac-health removal) | `[you-authorize]` | ⏸ awaiting go-ahead — two releases per per-plugin policy |

**T4.1 note — deferred follow-up (non-interactive framework port):** mac-health carries the full pmos-toolkit non-interactive block verbatim (FR-01..08, `.pmos/settings.yaml`, the `pmos-toolkit: /<skill> finished` stderr prefix, and a CI-context line pointing at `tools/audit-recommended.sh` + Section D of `_shared/non-interactive.md`). pmos-utilities has none of that substrate/tooling. The block is **self-contained inline instructions** — it runs correctly standalone — so the move is a clean lift-and-shift. But the stderr prefix now names the wrong plugin and the CI-context references are dangling. Deciding whether pmos-utilities **adopts** the non-interactive framework (port the substrate + lint + audit, fix the prefix) or **drops** the block (mac-health is chat-only/read-only — arguably doesn't need it) is one coherent decision, deliberately **not** piecemeal-edited inside W6's move-and-register scope. Tracked for a future wave.

---

## Wave 5 — Features

| Task | Item | Owner | Acceptance |
|---|---|---|---|
| T5.1 | **W3** feature-sdlc Phase 0.5 lastrun consolidation | `[me/skill]` | ✅ DONE — new **Phase 0e** consolidates the 5 non-destructive soft gates (ideate/creativity/wireframes/prototype/retro) into one confirm seeded from `.pmos/feature-sdlc.lastrun.yaml` (main-repo-root anchored, gitignored), mirroring complete-dev Phase 0a; per-gate short-circuits on 1a/3a/3b/3c/8a (wireframes re-fires on frontend-signal change); written at Phase 9; destructive/judgement prompts (slug, base-drift, merge, push, failures, 6a residuals) always fire; skipped on first-run/resume/prototype/--minimal/--non-interactive; `--reset-defaults` added; schema at `reference/soft-gate-lastrun-schema.md`. Baselines unchanged (inline-lint 5, audit 37); `apply-edit-at-anchor` test green. (Pre-existing `c-body-size`/`a-desc-len` [D] fails predate this — W8 territory.) |
| T5.2 | **W11** implement visual identity (depends T0.2) — accent, wordmark, type, section signature, unify diagram palette | `[me/skill]` | ✅ DONE — **D2 → Direction G "Mono Minimal"** chosen by user after 7 browsable mockups (`reviews/2026-06-05_w11-mockups/`). Shipped in the single substrate → fans out to all 14 surfaces: burnt-orange `#C2410C` accent + stone neutrals (light+dark) in `style.css`; bundled **JetBrains Mono 700** subset, base64-inlined (~5KB woff2 / ~6.8KB b64, self-contained, no CDN) as the display face; `pmos` masthead wordmark + CSS accent caret in `template.html` toolbar+footer and the viewer mast (index-generator); `[NN]` zero-padded section counter on every content h2 (CSS `::before`, not in DOM — anchors/quotes unaffected); branded footer (dropped 0.65-opacity italic). Diagram **technical** theme + atoms reconverged on the doc palette; shared bridge `diagram/themes/_shared-palette.yaml`; `editorial` theme intentionally keeps its alternate palette. Reproducible font build at `assets/fonts/build-display-font.sh`. Tests green: diagram 64 pytest + selftest, fanout 14-surface, render, template-bytestable, comments-coverage; theme assertions updated to new palette. Real substrate emit verified. **Follow-up (noted, out of W11 file-scope):** wireframes `wireframe.css`/`canvas-template.html` still carry Tailwind-blue (low-fi wireframe palette is deliberately separate) — decide whether to re-theme. |
| T5.3 | `/verify` + release | `[you-authorize]` | ⏸ awaiting go-ahead — would release Waves 1–5 (pmos-toolkit minor + pmos-utilities 0.1.0) |

---

## Wave 6 — Close-out

| Task | Item | Owner |
|---|---|---|
| T6.1 | **W14** decide inline-block sync posture (add `tools/sync-inline-blocks.sh` or document the tax) | `[you-decide]` + `[me]` |
| T6.2 | Final changelog + confirm both plugins' versions/tags pushed to all remotes | `[you-authorize]` |

---

## Critical-path notes
- **T0.1–T0.3 first** — Wave 4 blocks on T0.1, Wave 5.2 on T0.2, T3.4 on T0.3.
- **W2 (T2.1) before Wave 3** — it rewrites the non-interactive region the skill-revision tasks also touch; sequencing avoids double work.
- **W1 ships independently** — don't let the P0 wait on anything.
- **Releases are per-plugin** — Wave 4 produces two releases (toolkit + utilities); never bump `marketplace.json` versions.
