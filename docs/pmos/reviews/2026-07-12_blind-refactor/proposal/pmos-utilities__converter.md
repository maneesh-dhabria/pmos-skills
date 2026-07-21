# Refactor proposal — pmos-utilities__converter

**Unit:** `plugins/pmos-utilities/skills/converter/`
**Status:** CAPPED (pass 2 of 2 complete — reviewer findings + author responses on both passes). No changes implemented; this document *describes* every accepted change and is the complete, self-contained record.

## Findings ledger

| ID | Severity | Disposition |
|---|---|---|
| converter-F1 | Blocker | Accepted (C1) |
| converter-F2 | Should-fix | Accepted (C2, amended by F10) |
| converter-F3 | Should-fix | Accepted (C3, amended by F12) |
| converter-F4 | Should-fix | Accepted (C4) |
| converter-F5 | Should-fix | Accepted (C5 — upstream-first; no converter-local edit until the W14 lint gains a `prompt-free` marker) |
| converter-F6 | Nit | Accepted (C6, amended by F11) |
| converter-F7 | Nit | Accepted (C7) |
| converter-F8 | Nit | Accepted (C8, amended by F10) |
| converter-F9 | Should-fix | Accepted (C9 — new server-side guard) |
| converter-F10 | Should-fix | Accepted (folded into C8 + C2) |
| converter-F11 | Nit | Accepted (folded into C6) |
| converter-F12 | Nit | Accepted (folded into C3) |

12 accepted / 0 rejected / 0 invalid across both passes. All quotes were spot-checked against the current files and ground correctly.

---

## Accepted changes (full detail, cumulative — pass-2 amendments folded in)

### C1 — Scope the privacy claim; stop mandating misinformation (F1, Blocker)

- **File/section:** `SKILL.md` — frontmatter `description` (line 3), intro paragraph (lines 15–16), Phase 0 step 4 (line 96).
- **Before:** three absolute claims — description: "everything runs offline on your machine, no npm install, no account, no upload"; intro: "nothing is ever uploaded off your machine"; step 4 (spoken verbatim by the agent): "Nothing is uploaded or persisted — it is a local single-user tool." Yet the shipped registry includes `pdf→md` with `kind: 'llm'` (`lib/converters/pdf-md.js:26`) whose primary backend hands the PDF's extracted text to the host `claude` CLI (`lib/claude-pdf.js`), i.e. document content leaves the machine for Anthropic's API whenever the CLI is available. The UI already badges it "Uses Claude" (`ui/converter.html:126`).
- **After (intent):** all three spots scoped: pure conversions run fully offline and nothing is persisted; the Claude-badged PDF→Markdown conversion sends the PDF's **extracted text** — never the file or any path — to the Claude API via the user's `claude` CLI, with a fully local fallback when the CLI is absent. Intro also points at the UI's per-conversion `offline · deterministic` vs `Uses Claude` badges. The honest strong parts of the story (`--allowedTools ''`, text-only, no path in argv) are preserved as the reassurance.
- **Rationale:** the skill body is what the agent speaks from; as shipped it mandates a false statement about the exact property (data privacy) the skill markets. The UI is honest; the prose must match it.
- **Blast radius:** SKILL.md only (3 spots). Description change affects trigger matching (positively, jointly with C2). No code/tests. Re-run skill-eval + hygiene lints after edit.

### C2 — Fix the stale conversion inventory; make the registry the single home (F2, Should-fix; step-4 wording amended per F10)

- **File/section:** `SKILL.md` — frontmatter `description` (line 3), intro (line 18), Phase 0 step 4 (line 93).
- **Before:** intro says "v1 ships two bidirectional pure pairs — **JSON ↔ YAML** and **CSV ↔ JSON**"; step 4 hardcodes "the supported conversions (JSON↔YAML, CSV↔JSON)"; the description hedges HTML↔MD / PDF↔MD as future ("and, as the skill grows, …"). `lib/converters/` actually ships four pairs (json-yaml, csv-json, html-md, pdf-md), fully built, tested, and served.
- **After (intent):** (a) description enumerates all four shipped pairs (frontmatter must stay static prose, so it carries the list for trigger matching — "convert HTML to markdown", "PDF to markdown" now match confidently); (b) intro says "four bidirectional pairs — JSON↔YAML, CSV↔JSON, HTML↔Markdown, PDF↔Markdown", noting PDF→MD is the one `llm`-kind conversion (dovetails with C1); (c) **[amended per F10]** step 4 stops enumerating and instead tells the agent to report "the URL and the conversion list from the two startup lines you captured in step 3" (`Converter ready at …` and `Conversions: <ids>` — `scripts/server.js:180–181`) — the registry/server output stays the canonical home (§K), and the report step names its data source (the step-3 stdout capture defined in C8) instead of assuming a visible terminal.
- **Rationale:** classic enumerated-set count-claim drift — prose written for the v1 story, never updated when the PDF/HTML story landed. The registry was explicitly designed as the single source of truth. The F10 amendment ensures step 4 is executable in every launch mode.
- **Blast radius:** SKILL.md only. Improves skill triggering. Re-run skill-eval + the 2 hygiene lints.

### C3 — Desynchronized UI file/conversion state (F3, Should-fix; re-ingest precondition added per F12)

- **File/section:** `ui/converter.html` — conversion `change` handler (line 147), `loadFile` (lines 150–162), `doConvert` (lines 176–189).
- **Before:** the change handler only re-renders badges; `loadFile` decides binary-vs-text by the conversion selected *at load time*. Failure paths: (1) load a PDF under pdf→md, switch to a text conversion, Convert → the literal placeholder string `[binary file loaded: x.pdf]` is converted as the document; (2) select pdf→md, paste text (no file) → `fileBuffer` is null so the client sends the JSON envelope, and the server's binary path feeds those envelope bytes to the PDF extractor producing a misleading "no extractable text layer" caveat.
- **After (intent):** (a) on conversion change, when the new descriptor's `inputMode` differs from how the current file was ingested, reset file state — clear `fileBuffer`, `fileMeta`, and the placeholder, re-enable the textarea. **[amended per F12]** Auto-re-ingest of `fileEl.files[0]` via `loadFile` under the new descriptor is allowed ONLY when the retained file plausibly matches the new descriptor's `from` format, checked by extension/MIME (e.g. `.pdf`/`application/pdf` required for pdf→md; a file ingested as binary, or of a known-binary type, is never fed to a text-mode descriptor's `readAsText` branch). When the plausibility check fails: do not re-ingest — also clear `fileEl.value` and `setStatus('re-choose your file for this conversion')`. This puts the canonical pass-1 path (PDF loaded under pdf→md → switch to md→html) in the clear-and-prompt branch, not a mojibake `readAsText`. (b) `doConvert` refuses when a binary-input descriptor has no `fileBuffer` ("this conversion needs a file — choose or drop a PDF") instead of falling through to the JSON envelope. Note: guard (b) is the friendly-UX layer only; the authoritative backstop for path (2) is server-side (C9).
- **Rationale:** both failure paths are ordinary interactions that silently produce garbage. F12 caught that the unconditioned auto-re-ingest would have recreated the garbage-input class on its own motivating example; clear-and-prompt is the safe floor, auto-re-ingest a convenience allowed only when provably type-compatible.
- **Blast radius:** `ui/converter.html` only. No automated UI harness exists — verification is a manual dogfood pass covering three paths (PDF→switch-conversion→expect clear+prompt not mojibake; pdf→md + pasted text → expect client refusal; normal happy path) + screenshot into `tests/dogfood/`.

### C4 — Origin/Host guard on the localhost server (F4, Should-fix)

- **File/section:** `scripts/server.js` — request handler, before route dispatch (~line 143); plus `tests/server.test.mjs`.
- **Before:** the server binds loopback but accepts any cross-origin POST — no Origin or Host validation anywhere. Browsers deliver cross-origin POSTs to 127.0.0.1 (response opaque, side effect runs), and `pdf→md` shells out to the user's authenticated `claude` CLI, so a drive-by web page open while the converter runs can port-scan localhost and repeatedly burn the user's API credits with attacker-chosen text. Blast radius bounded to credit/CPU burn by the prompt sandbox (`--allowedTools ''`, no paths — `lib/claude-pdf.js:69`), hence Should-fix not Blocker.
- **After (intent):** (a) if `req.headers.origin` is present and not `http://127.0.0.1:<port>` / `http://localhost:<port>`, respond 403 for non-GET requests; requests with **no** Origin header (curl, tests, CLI clients) stay allowed. (b) Validate `Host` is loopback (`127.0.0.1:<port>` / `localhost:<port>`), 403 otherwise (DNS-rebinding guard). Add checks to `tests/server.test.mjs` (foreign Origin → 403; loopback Origin → 200; no Origin → 200) and bump its `EXPECTED_CHECKS` (jointly with C9's check).
- **Rationale:** standard hardening for localhost tool servers with side-effecting endpoints; ~10 lines.
- **Blast radius:** `scripts/server.js` + `tests/server.test.mjs` (check-count bump changes `tests/run.mjs` aggregate output). UI is same-origin — unaffected. No SKILL.md change.

### C5 — Dead 28-line non-interactive block + dangling `_shared/` cite (F5, Should-fix — upstream-first)

- **Files/sections:** Part 1 (upstream, separate story via `/skill-sdlc`): `plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh`, `plugins/pmos-toolkit/skills/_shared/non-interactive.md`, the CLAUDE.md "Non-interactive contract (W14 posture)" bullet, and `skill-eval.md` if it asserts block presence. Part 2 (this skill, only after Part 1 lands): `SKILL.md` lines 40–68.
- **Before:** the converter is prompt-free (states so at SKILL.md:31: "The non-interactive contract block below is inlined only to satisfy the repo-wide W14 lint; no checkpoint ever fires") yet must carry the frozen ~28-line byte-identical block, including its step-5 cite to "`_shared/non-interactive.md`" (SKILL.md:61) — a file pmos-utilities does not have, i.e. a policy-inherited dangling substrate cite. The W14 exemption vocabulary has only `refused` and `delegated` markers; there is no `prompt-free` option.
- **After (intent):** Part 1 — the lint gains a third self-documenting marker, `<!-- non-interactive: prompt-free; <reason> -->`, accepted only for skills whose body contains zero `AskUserQuestion` call sites (mechanically verifiable with the same extractor `audit-recommended.sh` uses). Part 2 — converter's frozen block is replaced by the marker plus one sentence ("This skill issues no prompts; a free port is auto-selected and missing Node is a hard error."), deleting ~28 dead lines and the dangling cite. **Until Part 1 ships, no converter-local change** — the byte-identical block is mandated and the skill already documents it as inert (the least-bad current posture).
- **Rationale:** every invocation pays several hundred tokens of procedure that provably cannot execute; the byte-identical requirement bakes a dangling cite into every non-toolkit consumer. The marker mirrors the existing `refused`/`delegated` pattern: exemptions stay self-documenting in the skill file, never a hidden allowlist.
- **Blast radius:** cross-plugin — lint script, `_shared/non-interactive.md` (rides `sync-shared.sh`), CLAUDE.md authoring bullet, possibly `skill-eval.md`; every prompt-free skill in any plugin becomes eligible (opt-in). Must be its own story, not part of this unit's refactor commit.

### C6 — Stale test-order comment / ORDER list (F6, Nit; rationale corrected per F11)

- **File/section:** `tests/run.mjs` — comment (line 14) + `ORDER` (line 15).
- **Before:** comment claims "server test last (it spawns a subprocess of its own)" but the four suites added with the PDF/HTML pairs (`pdf-text`, `pdf-writer`, `pdf-descriptors`, `claude-seam`) are absent from ORDER, fall to rank 99, and run *after* server. Moreover — per F11 — the stated invariant was always void: the harness is strictly sequential (`for (const s of suites) results.push(await runSuite(s));`, line 38), so ordering never protected any subprocess from collision.
- **After (intent):** ORDER lists all 14 suites explicitly with `claude-seam` and `server` last. **[amended per F11]** The comment states the honest rationale — deterministic order for stable output; cheap pure-unit suites first, slow integration suites (claude-seam, server — each spawns and waits on a subprocess) last for fast feedback on failures — with no subprocess-*safety* claim. Unknown-suite fallback rank sorts new suites *before* the final slow ranks (not after everything), preserving fast-feedback self-healingly for the next forgotten suite.
- **Rationale:** miniature of the F2 drift class; F11 additionally caught that the original fix would have baked a fictional invariant in more firmly — the mechanical change survives, its stated justification is corrected to one the sequential code actually supports.
- **Blast radius:** `tests/run.mjs` only — execution order + comment; results unchanged.

### C7 — Delete the `void crypto` dead import (F7, Nit)

- **File/section:** `scripts/server.js` — line 18 (`require('node:crypto')`), lines 210–211 (`void crypto;` + comment), header comment line 10 (drop `crypto` from the "Node built-ins ONLY" list).
- **Before:** crypto is imported solely to be `void`ed, with a comment reserving it "for future request-id tagging"; the header overstates the module's actual built-in surface.
- **After (intent):** all three references deleted; re-add with the feature if request-id tagging ever exists.
- **Rationale:** speculative-generality noise kept alive by an escape hatch.
- **Blast radius:** `scripts/server.js`. Check `tests/deps.test.mjs` — if it enumerates crypto among expected built-ins, update it in the same edit.

### C8 — Honest launch/stop instructions, with stdout capture as part of the launch contract (F8, Nit; capture mechanism added per F10)

- **File/section:** `SKILL.md` — Phase 0 step 3 (lines 85–88), step 4 (lines 95–96).
- **Before:** step 3 says "**Launch** in the background" but the fenced command is a plain foreground `node <skill-dir>/scripts/server.js` — a literal agent runs it foreground and blocks/times out the Bash tool; step 4's "**Ctrl-C** in the launch terminal stops the server" references a terminal that doesn't exist when the agent launched it as a background task. Additionally (F10): the server listens on port 0 (`server.listen(0, '127.0.0.1', …)` — `scripts/server.js:176`), so the URL and the `Conversions: <ids>` line exist **only on stdout** — a background launch that captures only a PID makes step 4 unexecutable.
- **After (intent):** step 3 names both the background mechanism AND the output capture: preferred — launch via the Bash tool's `run_in_background: true` and read the background task's captured output to obtain the two load-bearing lines (`Converter ready at http://127.0.0.1:<port>/`, `Conversions: <ids>`); fallback (no run_in_background) — `node <skill-dir>/scripts/server.js > <scratch>/converter.log 2>&1 &`, capture the PID, poll the log until the ready line appears, then read both lines from it. Explicit warning that a foreground run blocks the Bash tool. Step 4's stop story covers both modes: "ask me to stop it (I'll kill the background node process), or Ctrl-C if you launched it in your own terminal." The no-Bash platform-adaptation path (user self-launches → Ctrl-C) stays intact, as does server.js's own "Press Ctrl-C to stop" stdout line. No `--port` flag is added to server.js (YAGNI — log capture covers headless).
- **Rationale:** prose requirement with no mechanism = a launch that fails in the most common (agent-launched) mode; and F10 caught that the pass-1 C8 + C2 fixes, composed literally, lost the only channel carrying the port and conversion list on the `&`+PID path.
- **Blast radius:** SKILL.md only; re-run `lint-phase-refs` after edit (headings unchanged). server.js untouched.

### C9 — Server-side 400 for JSON-envelope posts to binary-input conversions (F9, Should-fix — NEW)

- **File/section:** `scripts/server.js` — `handleConvert` input-resolution branch (line 93: `if (descriptor.inputMode === 'binary') { convertInput = raw; …`); plus `tests/server.test.mjs`.
- **Before:** for a binary-input descriptor the server uses the raw request body unconditionally — a `POST /convert` with `Content-Type: application/json` and `{id:'pdf→md', input:…}` (the documented envelope for every other conversion) hands the envelope bytes to the PDF extractor, returning a misleading "no extractable text layer" caveat instead of an error. The pass-1 fix (C3(b)) guarded only the bundled UI; C4 deliberately keeps no-Origin CLI clients allowed, so the non-UI API surface is real and unprotected.
- **After (intent):** when `descriptor.inputMode === 'binary'` and the request `Content-Type` is `application/json`, respond 400 with a corrective message: "conversion '<id>' takes raw binary input: POST the file bytes (e.g. Content-Type: application/pdf) with ?id=<id>, not the JSON envelope." No base64-`input` path is added (no client needs it; the error documents the supported shape). One new check in `tests/server.test.mjs` (JSON-envelope post to pdf→md → 400 with that message), `EXPECTED_CHECKS` bumped jointly with C4's additions.
- **Rationale:** the invariant (binary conversions take raw bytes, never the envelope) belongs where the contract lives — the server — for every current and future client; a self-explaining 400 beats a silent garbage conversion. C3(b) remains as the friendly client-side layer; this is the authoritative backstop.
- **Blast radius:** `scripts/server.js` + `tests/server.test.mjs` (same files C4 touches — one combined edit). `ui/converter.html` unaffected. No SKILL.md change.

---

## Rejections

None — all 12 findings across both passes were grounded and accepted.

## Open questions

None — no unresolved disagreements. Every pass-2 finding was accepted as an amendment to (or backstop for) a pass-1 change.

## Suggested implementation grouping

- One converter-local change set: C1 + C2 + C8 (SKILL.md, including the F10 stdout-capture contract), C3 (UI, including the F12 re-ingest precondition), C4 + C7 + C9 (server + server tests, one combined edit), C6 (test harness, F11-corrected comment). Run `tests/run.mjs`, skill-eval, and the 4 hygiene lints; manual dogfood for C3's three paths.
- One separate upstream story (`/skill-sdlc`): C5 Part 1 (W14 `prompt-free` marker), then C5 Part 2 lands in converter as a follow-up.
