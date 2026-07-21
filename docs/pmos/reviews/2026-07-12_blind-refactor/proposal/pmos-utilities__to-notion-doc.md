# Proposal — pmos-utilities__to-notion-doc

**Status:** CAPPED (pass 2 — hard cap reached). Passes: pass 1 (11 findings, all accepted) + pass 2 (8 findings, all accepted). No changes implemented; this document describes intended changes only and is the complete, self-contained record.

**Unit files:** `plugins/pmos-utilities/skills/to-notion-doc/` — `SKILL.md`, `reference/notion-blocks.md`, `scripts/{parse-doc,map-to-notion,upload-image,chunk-blocks,verify-page}.mjs`.

## Disposition table (all findings, both passes)

| Finding | Severity | Disposition |
|---|---|---|
| F1 — `allowed-tools: Bash, Read` locks out the skill's actual tool surface | Blocker | Accepted |
| F2 — resume cursor keyed on `lastSi` is unsound for deferred batches | Blocker | Accepted |
| F3 — write plan is REST-model but write path is NFM; no batch→NFM renderer; non-PAGE `parentRef` undefined | Should-fix | Accepted |
| F4 — verification's `fetchedSi` is model-asserted, not derived | Should-fix | Accepted |
| F5 — annexure "scoped toggle re-map" promises an operation no script performs | Should-fix | Accepted |
| F6 — paragraph gatherer swallows adjacent tables/images/bookmarks/equations | Should-fix | Accepted |
| F7 — "four zero-dependency Node scripts" but five ship | Should-fix | Accepted |
| F8 — `--update-mode` contract flag has no defined effect at its consumption point | Should-fix | Accepted |
| F9 — upload-image header comment describes the retired dual-write stub | Nit | Accepted |
| F10 — selftest label asserts the rejected table-width semantics | Nit | Accepted |
| F11 — buildStub model block and its NFM diverge (color + line joining) | Nit | Accepted |
| F12 — F6's table stop-guard diverges from the main-loop table start → infinite loop on a lone pipe row | Blocker | Accepted (amends F6) |
| F13 — F3's plan defines only the create path; `--into` update modes have no batch mapping / mechanisms | Should-fix | Accepted (folds into F3) |
| F14 — verify-page.mjs and upload-image.mjs are library-only; SKILL.md's prescribed invocations cannot run | Should-fix | Accepted |
| F15 — F4's substring containment false-fails on numbered lists (renderer emits `1.` for every item; fetch renumbers) | Should-fix | Accepted (amends F4) |
| F16 — F5's si-RANGE flag encoding assumes cluster contiguity `detectClusters` never checks | Should-fix | Accepted (amends F5) |
| F17 — resume cursor has no source fingerprint; "same source" is asserted by nobody | Should-fix | Accepted |
| F18 — MAX_BLOCKS counts blocks on a path whose real constraint is NFM payload size | Nit | Accepted |
| F19 — frozen non-interactive block cites `_shared/non-interactive.md`; pmos-utilities ships no `_shared/` | Nit | Accepted (plugin-scope remedy; ownership flagged to `_cross__pmos-utilities`) |

**Totals:** 19 accepted / 0 rejected / 0 invalid. All quotes were spot-checked against current files across both passes and ground correctly.

**Sequencing:** F3 (+ F13, F18 folded in) must land before F4 (+ F15 folded in; F14 shares the verify-page CLI). F2 + F17 land with F3's rewrite of SKILL.md Phase 3 step 2 (same paragraph). F12 amends F6 (same guard). F16 amends F5 (same flag). F1, F7–F11 are independent. F19 is a plugin-level file placement, independent of all skill-level work.

## Accepted changes (full detail)

### F1 [Blocker] — remove `allowed-tools` from frontmatter
- **File/section:** `SKILL.md` frontmatter, line 6.
- **Before → after:** `allowed-tools: Bash, Read` → line deleted entirely (no `allowed-tools` key). The skill then inherits the session's full tool surface: Bash, Read, Write/Edit (`settings.yaml`, `~/.pmos/learnings.md`), `AskUserQuestion` (~8 prompts across Phases 0–3), TaskCreate/TodoWrite ("Track Progress"), and the Notion MCP tools (`notion-create-pages`, `notion-update-page`, `notion-fetch`, `notion-search`).
- **Rationale:** The declared pair is the gamekit launch-a-server boilerplate. Where `allowed-tools` is enforced as a restriction, every MCP write, every prompt, and preference persistence are blocked — the skill cannot perform its core function. Deletion is preferred over enumeration because Notion MCP tool names are host-prefixed and vary by environment; an enumerated allowlist would be host-fragile.
- **Blast radius:** SKILL.md frontmatter only. skill-eval frontmatter checks re-run; no script/reference/substrate touched.

### F2 [Blocker] — resume cursor keyed on batch `seq`, not max si
- **Files/sections:** `SKILL.md` Phase 3 step 2 (lines ~218–223); `scripts/chunk-blocks.mjs` header comment (lines 10–11), `planWrite` (line-126 comment + `lastSi` field), selftest.
- **Before → after:** cursor contract `{ page_id, last_si }` + "skip every batch whose `lastSi ≤` the cursor" → `{ page_id, last_seq }` (extended by F17 with `plan_hash` + `batch_count`) + "skip every batch whose `seq ≤` the cursor". `planWrite` already emits monotone `seq`; the `lastSi` field is dropped so no future reader re-keys on it. Header + inline comments reworded from "last source-index written" to "seq of the last batch written". Selftest: replace `lastSi === 199` with seq-monotonicity assertions plus a regression fixture (3-level list si 0–2 followed by paragraph si 3) asserting the deferred batch's `seq` exceeds all prior batches' even though its max si is lower.
- **Rationale:** `emitGroup` emits deferred create-then-append batches after all flat batches (chunk-blocks.mjs:111–115), so a deferred batch's max si can be lower than an earlier batch's. An si-keyed cursor then either permanently skips the deferred batch after a crash (unwritable si, verification fails forever) or rolls backward and re-appends (duplicate blocks). `seq` reflects true write order.
- **Blast radius:** SKILL.md Phase 3; chunk-blocks.mjs comments, field, selftest. Nothing else imports `lastSi`. F3's redesign removes the si-inversion source, but the seq cursor is kept regardless — batch order is the only sound resume key.

### F3 [Should-fix] — NFM-native write plan; retire the REST-era create-then-append machinery (incorporates F13, F18)
- **Files/sections:** `scripts/map-to-notion.mjs` (NFM renderer), `scripts/chunk-blocks.mjs` (`planWrite`/`emitGroup`/`trimToDepth2`/`emitTableRows` + selftests), `SKILL.md` Phase 3, `reference/notion-blocks.md` §6 (+ a §0 cross-cite).
- **Before → after:**
  1. map-to-notion additionally emits per-top-level-block NFM segments keyed by si (`nfmBySi`) alongside the whole-doc `nfm`, so any contiguous run of top-level blocks has a deterministic NFM rendering by concatenation — the model never hand-serializes NFM.
  2. chunk-blocks retires `trimToDepth2`, the ≤2-nesting deferral, non-PAGE `parentRef` targeting, and row-append batches: the MCP write path is hierarchical NFM where the REST 2-level limit does not apply and there is no mechanism to target a Notion block by an si placeholder. New plan: split at top-level block boundaries only; each batch = a contiguous run of top-level source blocks with full subtrees; each batch carries its concatenated `nfm`. **Budget (F18):** primary ceiling is `MAX_NFM_CHARS` (a conservative per-call payload constant, documented in reference §6) computed on each batch's `nfm`; `MAX_BLOCKS` retained as a secondary cap. Any single top-level block whose own NFM exceeds the ceiling (500-row table, multi-MB code fence) stays whole in its own batch with a stderr WARN — fragmenting a table/fence across calls is not valid NFM.
  3. **Create path:** batch 0 = `notion-create-pages` content; later batches = `notion-update-page insert_content` position `end` against the page. The sentence "create-then-append batches target the parent block returned by the prior step" is removed (unimplementable step).
  4. **Update path — `--into`, per mode (F13):** the three mode glosses are narrowed to what the MCP commands can express, with per-mode batch semantics in reference §6 (one home; SKILL.md cites it):
     - *Rewrite* — batch 0 = `replace_content` with batch 0's NFM (clears + writes in one call); later batches = `insert_content` position `end`. Destructive; option text already says so.
     - *Archive then write* — made explicit as fetch + wrap + replace, and disclosed as such in the option text (before: "move the page's existing top-level blocks under a new collapsed toggleable `heading_1`" — a "move" no MCP command performs; after: "re-writes the page with your current content preserved under a collapsed Archive toggle (fetch + wrap + rewrite; content is preserved but block identities/comments may not survive)"). Mechanism: (a) `notion-fetch` → old NFM; (b) mint a unique archive anchor heading line (e.g. `# Archive — <ISO date> <short-hash>`); (c) one `replace_content` whose `new_str` = batch 0's NFM + the anchor heading rendered toggleable with the old NFM tab-indented under it; (d) every later batch inserts ABOVE the archive via `update_content` with `old_str` = the minted anchor line and `new_str` = batch NFM + newline + the anchor line. The minted anchor is unique by construction, so the search/replace is deterministic; new content lands above the archive as promised (fixes the position-`end`-lands-below contradiction).
     - *In-place* — gloss narrowed from "(append / reconcile)" to "(append to the end of the existing page)"; every batch (including batch 0) is `insert_content` position `end`. "Reconcile" is dropped — it was defined nowhere and is not expressible without a diff engine this skill does not ship.
  5. reference §6 re-scoped from "REST limits the mapper plans against" to "MCP write-batching: why we split, the char + block budgets, oversize-block posture, per-update-mode batch verbs", reconciling with §0's "MCP-only — no REST" posture.
  6. Selftests: coverage/no-gap/no-overlap assertions retained; nesting fixtures assert full-subtree batches carrying `nfm`; create-then-append fixtures deleted; giant-code-fence fixture → own batch + WARN; 100 one-word paragraphs → NOT split when under the char ceiling.
- **Rationale:** Batches currently carry REST-model `blocks`/`rows` with no `nfm` field and no renderer from batch to NFM, so any multi-batch doc forces the model to hand-write NFM — a §H violation and the exact `<callout><br>` regression class the reference documents. Non-PAGE `parentRef` has no defined MCP mechanism. The update path additionally had promises without mechanisms (F13): nothing said what replaces the create on `--into`, archive mode's "write above" contradicted position-`end`, and "reconcile" was undefined. Block-count budgeting (F18) tracked a REST limit, not the MCP path's real payload constraint.
- **Blast radius:** Largest change in the unit: map-to-notion.mjs, chunk-blocks.mjs, SKILL.md Phase 3, reference §6/§0. verify-page.mjs structurally unaffected; F4 consumes the new `nfmBySi`. chunk-blocks' batch list stays mode-agnostic (the mode chooses the verb per batch at orchestration time, stated in SKILL.md). No other skill or substrate consumes these scripts.

### F4 [Should-fix] — derive `fetchedSi` deterministically (incorporates F15; CLI shared with F14)
- **Files/sections:** `scripts/verify-page.mjs` (new export + CLI + normalizer + selftests); `SKILL.md` Phase 4 (line ~229).
- **Before → after:** Phase 4's "Re-fetch the page … Derive the set of source-indices that landed" (model judgment) → verify-page gains `deriveFetchedSi(fetchedNfm, nfmBySi)`: normalize both sides, then per si test whether its rendered NFM segment appears in the fetched NFM (normalized substring containment, with a minimum-length floor; trivially short segments like dividers match by counted occurrence). Emits the derived `fetchedSi` set + per-si miss list. **Normalizer (F15):** (a) unescape NFM entities; (b) collapse whitespace; (c) canonicalize list markers line-by-line — `^\s*\d+[.)]\s` → a fixed ordered-list token and non-checkbox `^\s*[-*+]\s` → a fixed bullet token — so the renderer's uniform `1.` (map-to-notion.mjs:233 emits the literal `1.` for every numbered item) matches Notion's renumbered `3.`; (d) canonicalize checkbox spellings `- [x]`/`- [X]`; (e) treat `<empty-block/>` as blank. SKILL.md states the model never asserts coverage by eye. Selftests: exact match; escaping normalization; deliberate-drop fixture; renumbering fixture (list rendered `1./1./1.`, "fetched" side `1./2./3.` → all si accounted for); plus one fixture captured from a REAL `notion-fetch` round-trip of a seeded page, checked in as a fixture string (selftests stay offline).
- **Rationale:** As shipped, `checkCompleteness` verifies whatever `fetchedSi` the model asserts — the headline "verifies the result block-for-block" rests on the fuzziest judgment step; a hallucinated coverage set passes cleanly. Both inputs are strings the pipeline already has, so the diff is scriptable per the §H deterministic-gate posture. Without marker canonicalization (F15), the gate would false-fail on every numbered item after the first, poisoning trust in it on day one.
- **Blast radius:** verify-page.mjs, SKILL.md Phase 4. Depends on F3's `nfmBySi`. No lint/eval changes.

### F5 [Should-fix] — real cluster-scoped grouping via `--group-cluster` (amended by F16: explicit si list, not a range)
- **Files/sections:** `scripts/map-to-notion.mjs` (new flag + grouper + selftests); `scripts/parse-doc.mjs` (`detectClusters` + selftest); `SKILL.md` Phase 1 step 5 (line ~165).
- **Before → after:**
  1. map-to-notion gains repeatable `--group-cluster <prefix>:<si,si,si,...>` — comma-separated heading si's taken verbatim from the parse signal's `headingSis` (NOT a `<first>-<last>` range). Synthesizes one toggleable `heading_1` (text from the cluster `prefix`) and nests exactly the listed headings' section runs (each listed heading + its body up to the next same-or-higher-level heading) as its children, splicing around interlopers: non-listed sections falling between cluster members keep top-level position, ordered after the synthesized toggle in original document order (deterministic rule, stated in the flag's header comment). Non-cluster headings keep the run's resolved `--headings` mode — no global toggle flip.
  2. parse-doc `detectClusters` additionally emits `contiguous: true|false` (members are adjacent same-level siblings with nothing between).
  3. SKILL.md's option text "re-map with `--headings toggle` scoped to the cluster" → "re-map passing `--group-cluster <prefix>:<si list>` (from the parse `clusters` signal)". When `contiguous: false`, the option text discloses the reordering ("N sections are interleaved with M other sections; grouping will pull the N together above the others") so the AUTO-PICKed Recommended option never silently reorders.
  4. Selftests: interleaved discriminating fixture (Annexure A / References / Annexure B / Glossary / Annexure C → toggle contains exactly the 3 annexures; References + Glossary survive at top level; all si preserved) plus the 3-adjacent fixture (one synthesized toggle parent, 3 nested sections, other headings untouched).
- **Rationale:** The `(Recommended)` option — AUTO-PICKed in every unattended run — currently promises an operation no script performs: `--headings toggle` is global (`nestUnderHeadings`, map-to-notion.mjs:67) and nothing synthesizes the parent heading. Per §H, ship the deterministic path. And because `detectClusters` groups by `level|token` across the whole document with no adjacency check (parse-doc.mjs:418), a range encoding would swallow interleaved foreign sections into the toggle — silent structural corruption committed unattended (F16); the explicit si list + splice + disclosure closes that.
- **Blast radius:** map-to-notion.mjs, parse-doc.mjs, SKILL.md Phase 1. Extra nesting level is harmless on the F3 NFM-native path. `--group-cluster` is script-internal orchestration, not a skill contract flag — argument-hint untouched, flags-vs-hints lint unaffected.

### F6 [Should-fix] — paragraph gatherer stops at table/image/bookmark/equation starts (amended by F12: full table-start test + progress guarantee)
- **File/section:** `scripts/parse-doc.mjs`, paragraph gather loop (lines 144–150) + selftests.
- **Before → after:** add four stop conditions to the while-guard, mirroring the main loop's block starts at lines 102/129–143 — with the table stop replicating the FULL two-line table-start test the main loop uses at line 102 (`/^\s*\|.*\|\s*$/.test(lines[i]) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes('-')`), NOT the bare pipe-row regex; plus standalone image `/^\s*!\[[^\]]*\]\([^)\s]+\)\s*$/`, bare-URL bookmark `/^\s*<?https?:\/\/[^\s>]+>?\s*$/`, and `$$` fence `/^\s*\$\$\s*$/` (those three main-loop branches consume unconditionally, so bare-regex stops are safe). **Progress guarantee (F12):** after the gather loop, if `para.length === 0`, consume the current line into `para` and advance `i` before pushing the paragraph — the outer loop can then never re-enter the gather at the same index having consumed nothing.
- **Selftests:** `"Intro line\n| A | B |\n| - | - |\n| 1 | 2 |"` → paragraph + 3-column table; `"Intro\n![alt](https://x/y.png)"` → paragraph + image; bare-URL and `$$` variants; **F12 regressions:** a lone `| a | b |` with NO delimiter line → parses as paragraph text and the parser terminates; a doc ending in a single pipe row → terminates.
- **Rationale:** The gatherer stops only on blank/heading/hr/quote/list/fence, so a table with no preceding blank line — common Markdown — is silently flattened into prose, bypassing the §3 fidelity contract and the description's "never drops table columns/rows"; the completeness census cannot see the loss. But the naive pipe-row stop breaks the guard's progress invariant (the guard must mirror only line shapes the main loop ALWAYS consumes): a lone pipe row would be rejected by the conditional table branch, match the stop with `para=[]`, push an empty paragraph, and never advance `i` — an unbounded loop (F12). The two-line test restores the mirror; the empty-para guard makes progress structural.
- **Blast radius:** parse-doc.mjs only; downstream scripts consume the corrected node types with no interface change.

### F7 [Should-fix] — fix the script count; name the set once
- **File/section:** `SKILL.md` intro (line 14) and Platform Adaptation "No Bash tool" bullet (line 35).
- **Before → after:** "lives in four zero-dependency Node scripts" → "lives in five zero-dependency Node scripts (`parse-doc`, `map-to-notion`, `upload-image`, `chunk-blocks`, `verify-page`)"; the bullet's "the four `node scripts/*.mjs` invocations" → "the `node scripts/*.mjs` invocations" (count dropped there; one enumerated home per §K).
- **Rationale:** Five scripts ship, each with `--selftest`. Classic enumerated-set count drift (the [J]-gate lesson class); state the set by name in one home.
- **Blast radius:** SKILL.md prose only.

### F8 [Should-fix] — wire `--update-mode` to its prompt
- **File/section:** `SKILL.md` Phase 3 step 1, `--into` branch (line ~211).
- **Before → after:** "Ask the update mode:" → "Ask the update mode (`--update-mode` overrides and skips this prompt):" — the exact wiring pattern `--toc` already uses in Phase 1 step 2.
- **Rationale:** An advertised contract flag with no defined effect at its sole consumption point; a user passing it still gets the ask (or the model improvises). The flags-vs-hints lint sees the token and passes — presence ≠ wiring; the override must be stated. (The modes the flag selects among gain real mechanisms via F13 — see F3.)
- **Blast radius:** one SKILL.md clause; lints unaffected.

### F9 [Nit] — fix the stale dual-write header comment
- **File/section:** `scripts/upload-image.mjs` header, lines 8–9.
- **Before → after:** "(copy to ./to-notion-doc-assets/<slug>/, emit a callout naming the path + an empty image placeholder)" → "(copy to ./to-notion-doc-assets/<slug>/, emit a SINGLE caption-inline callout naming the copied path — no separate image placeholder block)".
- **Rationale:** Line 71 of the same file and the selftests assert single-callout; the first-screen header still describes the retired dual-write shape.
- **Blast radius:** comment only.

### F10 [Nit] — correct the table-width selftest label
- **File/section:** `scripts/map-to-notion.mjs` selftest, line 306.
- **Before → after:** `'table_width = max col count (3)'` → `'table_width = header/first-row col count (3), not max (fixture max is 4)'`.
- **Rationale:** The contract (reference §3, mapTable comment at line 151) is width-from-first-row, explicitly not max. The fixture's third row has 4 cells, so max-semantics would give 4 — the assertion passes only under the correct semantics, but the label documents the rejected behavior and invites a future "fix" reintroducing the widening bug.
- **Blast radius:** one selftest string.

### F11 [Nit] — make buildStub's model block mirror its NFM
- **File/section:** `scripts/upload-image.mjs`, `buildStub` (line 77) + the one-home comment (lines 38–39) + selftests.
- **Before → after:** the model callout currently carries `color: 'gray_background'` and a single `' — '`-joined rich line while `stubCalloutNfm` emits no color and a multi-line tab-indented body → derive the model block from the same `lines` array (one rich entry per line), drop the color (matching the NFM; minimal-style default), and reword the "agree byte-for-byte (no dual-write)" comment to state precisely what agrees: the NFM string is single-home via `stubCalloutNfm` and the model block is its faithful mirror. Selftest: model lines == NFM body lines; model carries no attribute absent from the NFM.
- **Rationale:** Any integrity check walking `blocks` (verify-page's `checkIntegrity` does) sees a different callout than the page received; divergent twins of one artifact is the dual-write bug class in miniature.
- **Blast radius:** upload-image.mjs + selftests. map-to-notion imports `stubCalloutNfm` (signature unchanged) — no change there.

### F12 [Blocker] — table stop-guard must replicate the two-line table start + progress guarantee
Folded into F6 above (see the amended guard, progress guarantee, and lone-pipe-row regression selftests). Recorded separately here so the finding id is traceable: F6-as-originally-proposed would infinite-loop on a pipe row with no delimiter line; the amendment fixes the proposal before any implementation.

### F13 [Should-fix] — `--into` update modes get real batch semantics and mechanisms
Folded into F3 above (item 4: per-mode batch verbs; the archive fetch-wrap-replace recipe with a minted unique anchor and `update_content` insert-above; the honest disclosure in the option text; "reconcile" dropped from In-place). Reference §6 is the one home for the per-mode table.

### F14 [Should-fix] — real argv CLI contracts for the library-only scripts
- **Files/sections:** `scripts/verify-page.mjs` (line 134 usage + new CLI), `scripts/upload-image.mjs` (line 180 usage + new CLI), `SKILL.md` Phase 2 step 2 + Phase 4 step 2 + Platform Adaptation "No Bash tool" bullet.
- **Before → after:** both scripts' only CLI mode is `--selftest` (anything else prints a "library module" usage line and exits 64), yet SKILL.md prescribes `node scripts/verify-page.mjs` with four inputs and "`scripts/upload-image.mjs` `resolveRung` decides the rung" → (1) verify-page gains `node verify-page.mjs --plan <plan.json> --resolutions <res.json> --map <map.json> --fetched <fetched.txt>`: runs `deriveFetchedSi` (F4) then `verifyPage`, prints `{completeness, integrity, unaccountedFor, misses}` JSON to stdout, exit 0 pass / 1 fail (F4's `--fetched/--map` mode folds into this single contract). (2) upload-image gains `node upload-image.mjs --resolve-rung --image <image-node.json> --image-mode <mcp-only|rest-upload> --token-env <VAR>`: prints the resolved rung + planned ops JSON (token PRESENCE checked via `process.env`; value never printed). (3) Both usage strings updated; SKILL.md Phases 2/4 state the exact invocations; the paste-the-JSON-back story in Platform Adaptation becomes true for all five scripts. Library exports retained.
- **Rationale:** The Phase-4 deterministic gate as written is uninvokable — the model must hand-roll `node -e` import glue or silently skip the script, exactly the §H judgment leak the gate exists to prevent; same for `resolveRung` in Phase 2.
- **Blast radius:** verify-page.mjs + upload-image.mjs (CLI shims, usage strings, arg-parsing selftests), SKILL.md Phases 2/4 + Platform Adaptation. Sequences with F4 (shared CLI). Script CLIs, not skill contract flags — flags-vs-hints lint unaffected.

### F15 [Should-fix] — normalizer must canonicalize list markers (and other fetch-side respellings)
Folded into F4 above (normalizer items c–e + the renumbering fixture + the checked-in real notion-fetch round-trip fixture). Recorded separately for traceability: without it, the F4 gate false-fails on every numbered item after the first, because map-to-notion.mjs:233 renders every `numbered_list_item` with the literal marker `1.` while Notion's fetch renders true sequence numbers.

### F16 [Should-fix] — cluster grouping must not assume contiguity
Folded into F5 above (explicit si-list flag shape; splice-around-interlopers grouper; `contiguous` signal from detectClusters; disclosure in the AUTO-PICKed option text; interleaved discriminating fixture). Recorded separately for traceability: `detectClusters` (parse-doc.mjs:418) groups by `level|token` with no adjacency requirement, so a `<first>-<last>` range would swallow interleaved foreign sections into the synthesized toggle.

### F17 [Should-fix] — resume cursor carries a plan fingerprint; mismatch invalidates
- **Files/sections:** `scripts/chunk-blocks.mjs` `planWrite` (+ selftests); `SKILL.md` Phase 3 step 2 (folds into the F2/F3 rewrite of the same paragraph).
- **Before → after:** `planWrite` additionally emits `planHash` (zero-dependency hash, e.g. FNV, over the concatenated batch `nfm` strings + batch count). Cursor file becomes `{ page_id, plan_hash, batch_count, last_seq }`. Resume rule gains a precondition: resume ONLY if the cursor's `page_id` AND `plan_hash` match the current plan; on mismatch, the cursor is stale — delete it, warn ("source or plan changed since the interrupted run; cannot resume — starting the write decision fresh"), and re-enter target resolution; never silently skip batches of a different plan. Selftests: same-input determinism (equal hashes) + any-edit sensitivity (one changed word → different hash).
- **Rationale:** The most likely reason a crashed run is re-run is that the user edited the source; with no fingerprint, "on a re-run with the same source" is a precondition nobody checks, and a seq-keyed skip over a DIFFERENT plan writes old-head/new-tail chimera pages that Phase 4 then reports as a wall of misses with no cause. F2 fixed the ordering key; this makes the same-source precondition machine-checkable.
- **Blast radius:** chunk-blocks.mjs (+selftests), SKILL.md Phase 3 step 2. verify-page unaffected.

### F18 [Nit] — budget by NFM payload size, not block count
Folded into F3 above (item 2: `MAX_NFM_CHARS` primary ceiling on each batch's already-in-hand `nfm`, `MAX_BLOCKS` secondary; oversize-single-block WARN generalized from tables to any block, e.g. a multi-MB code fence; giant-fence and 100-light-paragraph selftests; documented in reference §6). Recorded separately for traceability: 100 blocks is the REST request limit, not the MCP path's constraint.

### F19 [Nit] — dangling `_shared/non-interactive.md` cite within pmos-utilities (plugin-scope remedy)
- **File/section:** NEW file `plugins/pmos-utilities/skills/_shared/non-interactive.md` — a byte-identical copy of pmos-toolkit's `skills/_shared/non-interactive.md`. NO change to any SKILL.md: the inline non-interactive block is repo-frozen byte-identical (lint-enforced, `tools/lint-non-interactive-inline.sh`), so editing the cite inside this skill is explicitly off the table.
- **Before → after:** pmos-utilities ships no `skills/_shared/` at all (verified: converter, mac-health, reflect, to-notion-doc are the only children), so the frozen block's "Section D of this file (`_shared/non-interactive.md`)" cite (SKILL.md:60) dangles within the plugin → place the canonical file per the repo's bootstrap-gap rule (`sync-shared.sh` is intersection-only and cannot create it; first placement is manual, after which it stays in the sync intersection).
- **Rationale:** Same defect class as the documented `/book-summary` dangling-cite discovery (2026-06-12). The fix benefits all four pmos-utilities skills equally.
- **Blast radius / ownership:** one new file under `plugins/pmos-utilities/skills/_shared/`; lints and inline blocks untouched; future `sync-shared.sh` runs pick it up. This remedy properly belongs to the `_cross__pmos-utilities` unit's proposal — accepted here so the finding is not dropped, with ownership flagged to that unit for the actual placement.

## Rejections

None — all 19 findings across both passes accepted.

## Open questions

No unresolved disagreements. One ownership handoff (not a disagreement): F19's remedy is plugin-level (a new `plugins/pmos-utilities/skills/_shared/non-interactive.md`) and should be implemented/deduplicated via the `_cross__pmos-utilities` unit rather than this skill's unit, to avoid two units placing the same file.
