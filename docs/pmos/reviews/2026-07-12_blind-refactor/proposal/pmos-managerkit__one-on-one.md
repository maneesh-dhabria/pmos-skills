# Proposal — pmos-managerkit__one-on-one (FINAL)

**Unit:** `plugins/pmos-managerkit/skills/one-on-one/`
**Status:** **CAPPED** — the review loop terminated at the pass cap after Pass 4 (reviewer 1 → author 1 → reviewer 2 → author 2 → reviewer 3 → author 3 → reviewer 4 → author closeout). Pass 4 still surfaced 2 material (Should-fix) findings — F20, F21 — so the unit did not converge; it capped with material findings in flight, all of which were accepted and folded below. Cumulative: **25 findings, 25 accepted, 0 rejected, 0 invalid**. Nothing has been implemented — every change is a described proposal only.

## Finding ledger

| ID | Severity | Disposition |
|---|---|---|
| one-on-one-F1 | Should-fix | Accepted (amended by F9, F11, F13, F16, F18, F21, F23) |
| one-on-one-F2 | Should-fix | Accepted (amended by F12, F13, F20, F22) |
| one-on-one-F3 | Should-fix | Accepted |
| one-on-one-F4 | Nit | Accepted (amended by F15) |
| one-on-one-F5 | Nit | Accepted (amended by F10, F14, F19) |
| one-on-one-F6 | Nit | Accepted |
| one-on-one-F7 | Nit | Accepted |
| one-on-one-F8 | Nit | Accepted |
| one-on-one-F9 | Should-fix | Accepted (folded into F1) |
| one-on-one-F10 | Should-fix | Accepted (folded into F5) |
| one-on-one-F11 | Should-fix | Accepted (folded into F1; zero-match rule amended by F21) |
| one-on-one-F12 | Should-fix | Accepted (folded into F2; synthetic key hardened by F22) |
| one-on-one-F13 | Nit | Accepted (standalone SKILL.md ruling; preserved-content list extended by F20) |
| one-on-one-F14 | Nit | Accepted (folded into F5) |
| one-on-one-F15 | Nit | Accepted (folded into F4) |
| one-on-one-F16 | Should-fix | Accepted (folded into F1) |
| one-on-one-F17 | Should-fix | Accepted (standalone: destructive-verb confirm + backup; trigger widened by F23) |
| one-on-one-F18 | Nit | Accepted (folded into F1/F9 guard) |
| one-on-one-F19 | Nit | Accepted (folded into F5/F10) |
| one-on-one-F20 | Should-fix | Accepted (folded into F2/F12: frontmatter preservation) |
| one-on-one-F21 | Should-fix | Accepted (folded into F1/F11: zero-match message tiers) |
| one-on-one-F22 | Nit | Accepted (folded into F2/F12: unproducible synthetic key) |
| one-on-one-F23 | Nit | Accepted (folded into F17 + F1: backup/echo on bulk close-clear) |
| one-on-one-F24 | Nit | Accepted (standalone: parseArgs value-typed flags) |
| one-on-one-F25 | Nit | Accepted (standalone: `_shared/non-interactive.md` bootstrap copy) |

No rejections; no invalid (ungrounded) findings — every quote across all four passes was verified verbatim against the current files (or, for F21/F22/F23, against this proposal's own prior text).

---

## Accepted changes (described, not implemented)

### F1 + F9 + F11 + F16 + F18 + F21 [Should-fix] — Give the stale-action loop a closing verb: reachable, safe, order-defined, symmetric with the Inbox, and honestly loud
**Finding (F1):** `log.mjs` mirrors every still-open action into the header's "Open action items" (log.mjs:48–51), but no verb ever removes or completes one (`set.mjs` FIELD_MAP has no such field; `--clear` only touches the Inbox). The stale-action flag becomes a one-way ratchet.
**Amendments:** F9 — the empty-body guard at log.mjs:21–23 would kill close-only invocations before close processing. F11 — the auto-close matching spec needed direction, a floor, a multi-match rule, and zero-match feedback. F16 — the spec never said whether auto-close scans the open-items list before or after this invocation's own mirrors land; a same-invocation done+open pair ("file the RFC" done + "file the RFC follow-up" open) could spuriously trip the ambiguity rule or close the just-created mirror. F18 — the guard carve-out covered `--close` but not `--clear`, an arbitrary asymmetry (an inbox item resolved between 1:1s is the same between-sessions record mutation). F21 — F11's zero-match `WARN: … — still open` line is factually false and chronically noisy in the most common zero-match case: a done action that was never mirrored (agreed and completed within the same week); WARN-blindness defeats the conservative-bias design.

**Change — `scripts/log.mjs`:**
- New repeatable `--close "<substr>"` flag that removes matching `- [ ]` lines from "Open action items" and reports the closed count in the summary line.
- **Guard carve-out (F9 + F18):** the "nothing to log" die fires only when topics+decisions+actions+questions+**close**+**growth** (see F5)+**clear** are ALL empty. Close-only and clear-only invocations are valid: they skip the session-block build entirely (no `### <date>` heading is written — a between-sessions mutation is not a session and must not pollute `parseSessions`/status-creep counts) and the summary reports "closed N open item(s)" / "cleared N inbox item(s)".
- **Auto-close:** when an `--action "owner|done|text"` is logged, close the mirrored open item — with these exact rules (F11, message tiers per F21):
  - *Direction:* the open-item line's TEXT PORTION (owner prefix and `— since <date>` suffix stripped before comparison) case-insensitively CONTAINS the done-action's text.
  - *Floor:* auto-close requires the done text to be ≥12 chars after trim; shorter texts skip auto-close with a stderr note ("done action '<t>' too short to auto-close — use --close"). Explicit `--close` has no floor (deliberate user intent, same as `--clear`).
  - *Multi-match:* auto-close closes at most ONE item; if ≥2 open items match, close none and print a stderr warning listing the candidates ("ambiguous — close explicitly with --close"). Explicit `--close` closes all matches (mirrors `--clear` semantics; see F23 under F17 for the backup/echo that accompanies bulk removal).
  - *Zero-match (F21):* split by intent — an explicit `--close` arg that matches nothing prints a loud `WARN: no open item matched '<t>'` (the user asserted a match exists; the false "— still open" clause is dropped); an auto-close zero-match prints an informational stderr line `note: no prior open item matched '<t>' — nothing auto-closed` (the benign never-mirrored case must not cry wolf). Never silence in either tier. Owner is NOT part of matching (mirrored lines may lack owners).
  - *Ordering (F16):* auto-close and `--close` match ONLY against the open-items list as it stood at invocation start — snapshot the section's lines before any mirroring, run all close matching against that snapshot, then apply removals + this invocation's new mirrors in one write. A just-mirrored item is never a close candidate.
  - *Recoverability (F23):* every line removed by `--close`/auto-close/`--clear` is echoed to stdout under a "closed:"/"cleared:" prefix; a removal of ≥2 lines total also triggers the F17 backup (see F17).

**Change — `SKILL.md` Phase 4 {#log}:**
- Step 2 documents both behaviors (auto-close rules in two–three sentences, including "done actions close only items that existed before this log"; `--close` semantics; the two zero-match message tiers). `--close` stays out of `argument-hint` (script-internal plumbing per §I, same treatment as `--clear`).
- Step 1 DEFER prose reconciled (F9 + F18): "an empty session body with no `--close` and no `--clear` DEFERs under `--non-interactive`; close-only and clear-only invocations are valid and write no session entry."

**Rationale:** the flag is a headline feature; closure must be reachable through the sanctioned verb surface (verbs are the primary interface per F13's ruling), including between sessions with nothing new to log — and the same between-sessions logic applies to the Inbox. Unconfirmed deletion riding every `done` action needs a conservative bias — close at most one, warn on genuine ambiguity, note (not WARN) the benign zero-match, and never treat this invocation's own mirrors as candidates.
**Blast radius:** log.mjs; SKILL.md Phase 4 (steps 1–2); tests/run-tests.sh (close + auto-close + close-only-exits-0-no-session-heading + clear-only-exits-0-no-session-heading + over-close-blocked + under-close-warned + strip-decoration-match + same-invocation-done-plus-open-pair [F16] + never-mirrored-done-gets-note-not-WARN [F21] cases). record-lib.mjs `staleActionFlags` unchanged. lint-flags-vs-hints: `--close` needs the internal-plumbing treatment.

### F2 + F12 + F20 + F22 [Should-fix] — Preserve ALL hand-added content through serialize: unknown sections, preamble, duplicate headings, AND frontmatter — with a collision-proof synthetic key
**Finding (F2):** `parseRecord` keeps unknown headings ("nothing is silently dropped", record-lib.mjs:82–83) but `serializeRecord` re-emits only the canonical SECTIONS set, so any write silently deletes a manager's hand-added section from a sensitive record in `~/.pmos/`. Empirically verified by the reviewer.
**Amendments:** F12 — two more silent-loss paths: (a) body text between the frontmatter and the first `## ` heading is dropped by the `continue` at record-lib.mjs:100; (b) a duplicate heading overwrites the earlier block at line 106. F20 — the frontmatter is a third instance of the same class: parseRecord captures EVERY `key: value` line (open-ended regex at line 91) but serializeRecord iterates only `FM_KEYS` (line 118), so a hand-added `pronouns: she/her` is deleted on the next write, and fm lines not matching the key shape (comments, continuations) are dropped at parse with no capture; F13's tolerance sentence would otherwise ship as a partial overclaim. F22 — the pass-3 spec's claim that `__preamble` is "impossible as a heading name" is false: `part.slice(3, nl).trim()` (line 102) parses a literal `## __preamble` heading to exactly that key, colliding with the synthetic slot (bytes would vanish through the hardening itself), and the spec permitted double-emission unless the unknown-section loop excludes the synthetic key.

**Change — `scripts/record-lib.mjs`:**
- `serializeRecord`: after emitting the canonical SECTIONS blocks in order, append every unknown section key (in parse insertion order) after `Sessions` — **skipping the synthetic keys below (F22)**.
- `parseRecord`: capture any non-empty pre-heading body part under a reserved synthetic key that no `.trim()`ed heading can produce — **`'\n__preamble'` (contains a newline; F22)** — and `serializeRecord` re-emits it verbatim, exactly once, between the frontmatter and the first section (never again in the unknown-section loop).
- `parseRecord`: duplicate headings MERGE — `sections[name]` becomes the concatenation of all blocks' lines in parse order, so no bytes vanish; serialize naturally emits one merged section (a normalization, not a loss — documented in the comment).
- **Frontmatter (F20):** `serializeRecord`, after the `FM_KEYS` loop, emits every fm key NOT in `FM_KEYS` in parse insertion order (`key: value`, same formatting as canonical keys). `parseRecord` captures frontmatter lines that don't match the `^([A-Za-z0-9_]+):` shape verbatim under a second unproducible synthetic key (`'\n__fm_raw'`), re-emitted after the unknown keys.
- Update the parse/serialize comment (lines 81–83) to claim preservation across the full read→write round-trip **including preamble, duplicate-heading content, and frontmatter** — the comment must never overclaim relative to the implementation.
- Selftest additions: (a) `## My custom notes` round-trips byte-stably; (b) preamble round-trips; (c) duplicate `## Inbox` merges with zero line loss; (d) a literal `## __preamble` heading round-trips as an ordinary unknown section, distinct from real preamble text above it (F22); (e) `pronouns: she/her` plus a non-key-shaped fm line round-trip byte-stably (F20); (f) canonical records (no unknowns, no preamble, no dups) serialize byte-identically to today (AC1 byte-stability preserved).

**Rationale:** silent data loss in a hand-ownable file holding sensitive employee content, directly contradicting the code's own claim; all loss paths — body sections, preamble, duplicate headings, frontmatter — are one defect class and land in one commit so F13's tolerance sentence is true on arrival. Merge (vs preserve-as-duplicate) because the name-keyed section map cannot represent duplicates and every helper (appendLine/prependLine) assumes one block per name. Preservation (vs refuse/warn) keeps `note` unattended-safe.
**Blast radius:** record-lib.mjs only; all verbs inherit via `writeRecord`. Selftest count grows. Canonical bytes unchanged → no downstream reader breaks.

### F3 [Should-fix] — Drop the false "commentable / annotate in browser" claim
**Finding:** SKILL.md:151 ("self-contained, commentable HTML prep artifact") and :152 ("annotate it in the browser") plus SKILL.md:32 claim the repo's inline-comments contract, but `reference/prep-skeleton.html` ships no `pmos-comments` block, no overlay JS, no write path — it is a static page.
**Change (drop the claim, do NOT wire the machinery):**
- `SKILL.md:32` — "emit a commentable HTML prep artifact" → "emit a self-contained HTML prep artifact".
- `SKILL.md:151–152` — remove "commentable"; "annotate it in the browser before the meeting" → "open it in the browser before the meeting".
- `scripts/plan.mjs:3` header comment — drop "commentable".
- `scripts/plan.mjs:55` terminal line — "open it to annotate before the meeting" → "open it before the meeting".
**Rationale:** "commentable" is a specific repo contract (inline pmos-comments JSON + overlay + localhost launcher write path). Wiring it would import the pmos-toolkit 14-surface fanout contract into managerkit, and the artifact lives under the INV-4 store (`~/.pmos/one-on-ones/prep/`), outside the docs/pmos world the comments flow assumes. The page's own footer already frames it as a throwaway prep aid.
**Blast radius:** SKILL.md (2 spots), plan.mjs (2 spots). prep-skeleton.html markup untouched. Grep for "commentable" in tests before shipping (none found at review time).

### F4 + F15 [Nit] — Scope the overview when a report handle is supplied, with a real error path
**Finding (F4):** SKILL.md:36 advertises "bare (`<report>` or nothing)", but `overview.mjs` accepts no handle — `/one-on-one sarah` prints the full roster and drops the argument.
**Amendment (F15):** the "existing 'no 1:1 record' error path" F4 referenced does not exist in overview.mjs — readRecord's thrown Error would surface as an uncaught stack trace for a user-supplied unknown handle.

**Change:**
- `scripts/overview.mjs` — accept optional `--handle <h>`; when present, print only that report's row plus expanded flag detail (stale item lines with ages, career-due basis). **Unknown handle (F15):** guard with `recordExists(h)` and on failure call `die("no 1:1 record for '<h>' — run /one-on-one add <h> first", 65)` — the same message shape and exit code 65 as log.mjs/career.mjs/note.mjs/set.mjs (requires importing `die` from cli-lib and `recordExists` from record-lib, neither currently imported).
- Skill body: Phase 0 already resolves the handle; the Overview phase passes it when the bare invocation named a report.
- `SKILL.md` Phase 7 {#overview} — document both forms: nothing = full roster, `<report>` = that report's due-status snapshot.
**Rationale:** accepting-and-ignoring an advertised argument is a surprising surface; sibling verbs establish the `die(…, 65)` contract and overview must match it rather than stack-tracing.
**Blast radius:** overview.mjs (imports + guard + scoped branch); SKILL.md Phase 7; tests/run-tests.sh (scoped-overview case + unknown-handle case asserting exit 65 and no stack trace). argument-hint unchanged.

### F5 + F10 + F14 + F19 [Nit] — Harden status-creep: structured growth field + regex scoped to non-status lines, without regressing career sessions, on data the parser actually retains
**Finding (F5):** HUMAN_RE (record-lib.mjs:178) matches `feedback`/`career`/etc. anywhere, so "Topics: feedback on the API spec" clears status-creep on a pure-status session; `log` has no structured way to record human content.
**Amendments:** F10 — career.mjs's Sessions marker is exactly one `**Topics:**` line (career.mjs:36), so F5's exclusion would make a just-recorded career conversation count toward creep. F14 — session action items are plain `- [ ]` bullets outside the `**Topics:**`/`**Decisions:**` exclusion, so status-y actions ("give feedback on the API doc") would still keyword-clear creep. F19 — F10's heading-suffix clause is checked against data `parseSessions` throws away: it captures only `m[1]` (the date; record-lib.mjs:172) and the heading line never enters `lines`, so a literal implementation of the suffix test silently matches nothing.

**Change:**
- `scripts/record-lib.mjs` `parseSessions` **(F19):** the return shape grows additively — each entry becomes `{date, heading, lines}` where `heading` is the full `### …` line (statusCreepFlag derives the career marker from it). No downstream consumer of `{date, lines}` breaks. The record-lib.mjs:165 comment ("Returns [{date, lines}]") is updated to the new shape.
- `scripts/log.mjs` — new repeatable `--growth "<text>"` field emitting a `**Growth:** …` line in the session block (also counts as non-empty for the F9/F18 guard).
- `scripts/record-lib.mjs` `statusCreepFlag` — a session is human if:
  - it has a `**Growth:**` line, OR
  - its **heading** carries the `(career conversation)` suffix (F10 belt-and-braces via F19's retained heading: keeps pre-existing records written by today's career.mjs clear without migration), OR
  - HUMAN_RE matches on a line that is NOT `**Topics:**`, NOT `**Decisions:**`, NOT the bare `**Actions:**` header, and NOT a checkbox bullet (`/^- \[[ x]\]/`) (F14) — i.e. keyword matching applies only to `**Questions:**` lines and free-form lines.
- `scripts/career.mjs` — the Sessions marker line becomes `**Growth:** Laraway career conversation — vision + short-term plan recorded in the header.` instead of a `**Topics:**` line (F10: the marker IS the human signal; Growth is the semantically honest field).
- `scripts/plan.mjs` — flag narration adds one honest clause ("based on logged session fields").
- `SKILL.md` Phase 4 step 1 — list growth/human moments as a gatherable field; Phase 3 flag prose states the contract honestly: "status-creep looks at Growth lines and human keywords in questions/free notes; topics, decisions, and action bullets never count."
- Selftest additions: a Topics line containing "feedback" must NOT clear creep; a `**Growth:**` line must clear it; an action bullet "give feedback on the API doc" must NOT clear it (F14); a legacy `### <date> (career conversation)` + `**Topics:** Laraway…` session (old format) must clear it, and the new `**Growth:**` career marker must clear it (F10; this case also enforces F19 — it fails if the heading isn't retained).
**Rationale:** keeps the flag deterministic (§H) while eliminating the systematic false-negative on status vocabulary across ALL structured status carriers, without flagging the single most human conversation the skill supports; the heuristic's boundary becomes describable in one sentence; and the spec is implementable against the parser's actual output (F19).
**Blast radius:** record-lib.mjs (parseSessions + shape comment + statusCreepFlag + ~5 selftest cases), log.mjs, career.mjs (one line), plan.mjs, SKILL.md Phases 3–4, tests/run-tests.sh (incl. a career-then-plan integration case). lint-flags-vs-hints: `--growth` needs the internal-plumbing treatment.

### F6 [Nit] — Delete dead code in parseRecord
**Finding:** record-lib.mjs:105 computes `const lines = …` with an always-true filter predicate and never uses it; line 106 recomputes the value from `rest`.
**Change:** delete line 105 (coordinate with F12's parseRecord edits — same function). No behavior change; selftest must still pass byte-identically.
**Blast radius:** none.

### F7 [Nit] — Resolve the dangling `02_design.html` cites
**Finding:** SKILL.md:153 cites "(02_design.html §5)" with no path; the same bare cite appears in record-lib.mjs:4,22, plan.mjs's header, and prep-skeleton.html:8. Unresolvable for a SKILL.md consumer.
**Change:**
- `SKILL.md:153` — drop the cite; state the human-first ordering as the skill's own contract (the section list that follows is the content).
- Code comments only (record-lib.mjs, plan.mjs, prep-skeleton.html HTML comment) — replace bare `02_design.html` with the resolvable repo path `docs/pmos/features/2026-07-02_one-on-ones/02_design.html`, keeping §N anchors.
**Rationale:** §K — the ordering's canonical home is the SKILL.md contract prose; code comments cite provenance via a real path. (The feature dir exists at that path.)
**Blast radius:** SKILL.md, record-lib.mjs, plan.mjs, prep-skeleton.html (comments only; no rendered output change). No phase anchors touched → lint-phase-refs unaffected.

### F8 [Nit] — Surface and parameterize the flag thresholds
**Finding:** SKILL.md:155 says "older than the threshold" / "no recent career conversation" without ever stating 21d / 90d / n=3, which live only as record-lib.mjs defaults with no override.
**Change:**
- `SKILL.md` Phase 3 {#plan} — state the defaults inline: stale-action = open item older than **21 days**; career-due = no career conversation in **90 days**; status-creep = last **3** sessions all topic-only (labeled as script defaults).
- `scripts/plan.mjs` + `scripts/overview.mjs` — internal `--stale-days <n>` / `--career-days <n>` / `--creep-n <n>` flags plumbed into the existing record-lib function parameters; NL forms ("use a 30-day stale window for X") map to them. Flags stay out of `argument-hint` (§I internal plumbing), noted in the Flags section alongside `--date` etc.
- Deliberately NOT adding per-record frontmatter overrides (schema change + migration for marginal gain; per-invocation flags cover the stated need).
**Rationale:** the thresholds are part of the user contract; record-lib already parameterizes them, so exposure is cheap.
**Blast radius:** SKILL.md (Phase 3 + Flags section), plan.mjs, overview.mjs, tests/run-tests.sh; record-lib.mjs unchanged. lint-flags-vs-hints: new body-defined flags need the internal-plumbing/nl-sugar treatment already used for `--date`.

### F13 [Nit] — One explicit ruling on the hand-edit posture
**Finding:** SKILL.md:105's "refuses to write there (INV-4). Do not hand-edit records or echo their raw contents into a repo, PR, or artifact" fuses two concerns; F1 read it as a hand-edit ban while F2 treats hand-added content as sanctioned and worth preserving — incoherent once both ship. The sentence also reads ambiguously (the prohibition may scope only to repo leakage).
**Change — `SKILL.md` Store & privacy (lines 103–107):** split into two sentences with distinct scopes:
1. *Leakage (hard rule):* "Never echo a record's raw contents into a repo, PR, or committable artifact; the prep artifact is written under the store's `prep/` dir for the same reason."
2. *Mutation posture (soft rule):* "The scripts are the sanctioned mutation path — they keep the record canonical and the flags accurate. Hand edits are tolerated (the parser and serializer preserve unfamiliar sections, preamble text, **frontmatter keys** (F20), and merge duplicate headings) but not the primary interface; prefer the verbs."

F1's rationale is restated against this ruling (closure must exist in the verb surface because verbs are primary, not because hand-editing is forbidden); F2/F12/F20/F22's hardening is what makes sentence 2's tolerance claim true — ship them together.
**Rationale:** privacy leakage vs mutation discipline are separate concerns; one ruling, stated once in Store & privacy (§K), aligns both fixes.
**Blast radius:** SKILL.md Store & privacy only (plus F17's one added backup sentence, below). No scripts, lints, or tests.

### F17 + F23 [Should-fix] — Destructive-verb friction + backup for `add --force`, `set --replace`, and bulk close/clear
**Finding (F17):** `add --force` rebuilds the record from `emptyRecord(...)` (add.mjs:18's own error message advertises "--force to re-scaffold") — every session, all feedback, the career plan, gone in one write. `set --replace` (set.mjs:32 `rec.sections[section] = [line]`) wipes a whole accreted section to one line. The store is deliberately un-versioned (INV-4): no git history, no undo. Yet the skill body carries no destructive confirm (the only defer-only tag is the Phase 1 free-form prompt at SKILL.md:122) and the scripts write no backup — while the F2/F12/F13 arc hardens the parser against losing single bytes.
**Amendment (F23):** the proposal's own new `--close` surface is a third destructive path — no floor plus close-all-matches means `--close e` can delete essentially every open item (including hand-added ones that exist nowhere else in the record), yet it got neither confirm nor backup.

**Change (two layers):**
- **Skill body confirm:** before the skill passes `--force` (Phase 1 add-existing path) or `--replace` (the set phase), it asks an AskUserQuestion confirm quoting what will be destroyed ("re-scaffolding erases N sessions" / "replacing wipes the current <section> content — proceed?"), tagged `<!-- defer-only: destructive -->` as the literal previous non-empty line (matching the tag contract SKILL.md:80 itself states). Under `--non-interactive` this DEFERs instead of destroying.
- **Script-side backup:** `scripts/add.mjs` and `scripts/set.mjs` — immediately before a `--force` re-scaffold or `--replace` swap, copy the current record to `<store>/backups/<handle>-<YYYYMMDD-HHMMSS>.md` (inside the INV-4 store, so no repo leakage; `mkdir -p` on first use) and print the backup path in the summary line. Non-destructive paths (fresh add, append-mode set) write no backup.
- **Bulk close/clear (F23):** `scripts/log.mjs` reuses the same backup helper — any log invocation whose close/clear matching removes **≥2 lines in total** writes the timestamped backup before the write and prints the path. Regardless of count, every removed line is echoed to stdout under a "closed:"/"cleared:" prefix so even a single-line removal is recoverable from the transcript. Non-removing log invocations write no backup.
- **SKILL.md Store & privacy:** one sentence noting destructive operations (re-scaffold, section replace, multi-line close/clear) write a timestamped backup under `backups/` and the user owns pruning it.
**Rationale:** destruction on an un-versioned sensitive store is final; the confirm covers the skill surface (and keeps unattended runs safe via DEFER), while the script-side backup covers direct CLI use and makes even a confirmed mistake recoverable. F23's harmonization costs one condition in the code path F17 already builds and leaves `--close`'s explicit-intent semantics (no floor, close all matches) intact. Consistent with the repo's non-interactive contract (destructive prompts must be defer-only-tagged, per audit-recommended.sh).
**Blast radius:** add.mjs, set.mjs, log.mjs (shared backup helper + echo lines), SKILL.md (Phase 1, set phase, Phase 4, Store & privacy), tests/run-tests.sh (backup-written-on-force, backup-written-on-replace, no-backup-on-append, backup-on-multi-close, no-backup-on-single-close-but-echoed cases), tools/audit-recommended.sh must stay green with the new tag. record-lib.mjs unchanged.

### F24 [Nit] — parseArgs must not corrupt values that begin with `--`
**Finding:** cli-lib.mjs:15 treats any value token starting with `--` as the next flag, so `note.mjs --handle sarah --text "--urgent: legal blocker"` sets `text = true`, passes the `!f.text` guard (truthy), and appends the literal line `- true` — the sensitive item's content is silently discarded and the trailing words re-parse as bogus flags. The proposal itself widens the free-text flag surface (`--close`, `--growth`), and dashes are natural in coaching prose.
**Change:**
- `scripts/cli-lib.mjs` — `parseArgs` gains an `opts.valued` Set (mirroring `opts.multi`); a flag in that set consumes the next token unconditionally. Each verb declares its value-typed flags (text, close, growth, topic, decision, action, question, handle, name, role, cadence, date, field, value, …). Existing bare-boolean flags (`--force`, `--replace`, `--selftest`) are unchanged.
- Belt-and-braces: string-consuming verbs reject a boolean `true` where a string is required, with `die(…, 64)` naming the flag ("--text requires a value") instead of serializing garbage.
- tests/run-tests.sh — the finding's exact case: `note --text "--urgent: legal blocker"` round-trips the full string into the Inbox.
**Rationale:** silently replacing a sensitive note's content with "true" is the same silent-loss class as F2/F12/F20; the valued-set fix is ~3 lines and mechanical at the call sites.
**Blast radius:** cli-lib.mjs, each verb's parseArgs call site (declaration only), tests/run-tests.sh (+1 case). No record-format change.

### F25 [Nit] — Bootstrap-copy `_shared/non-interactive.md` into this plugin; never edit the frozen block
**Finding:** SKILL.md:92's frozen non-interactive block cites "Section D of this file (`_shared/non-interactive.md`)", but `plugins/pmos-managerkit/skills/_shared/` contains only `interview-guidelines/` — the cite dangles for a managerkit reader. The canonical copy lives only in pmos-toolkit's `_shared/`; sync-shared.sh is intersection-only and cannot create the file here.
**Change:** create `plugins/pmos-managerkit/skills/_shared/non-interactive.md` as a **byte-identical copy** of pmos-toolkit's canonical `skills/_shared/non-interactive.md`. The frozen inline block in SKILL.md is NOT touched (byte-identity is enforced by lint-non-interactive-inline.sh — a text edit would break the repo-wide contract). After the one-time copy, the file is in sync-shared.sh's intersection and stays aligned automatically.
**Rationale:** this is exactly the repo's documented bootstrap gap for consumer plugins citing a canonical cross-plugin protocol; the release-time [J] coherence gate is the only other surface that would ever catch it.
**Blast radius:** one new file in managerkit's `_shared/`; zero edits to existing files.

---

## Rejections

None in any pass. All 25 findings across 4 reviewer passes were verified as grounded and accepted (several as amendments folded into earlier fixes).

## Open questions

None — no unresolved disagreements remain. All findings were accepted; the CAPPED status reflects only that the pass cap arrived while material findings were still being found (F20, F21 in Pass 4), not any open dispute.

## Notes for the implementer

- All changes are proposals only; the skill files are unmodified.
- Interdependencies to hold together at implementation time: the F9/F18 guard must count `--close`, `--growth`, AND `--clear`; F16's pre-mirror snapshot governs both auto-close and `--close`; F21's message tiers replace F11's single WARN rule; F13's "tolerated hand edits" sentence is only true once F2+F12+F20 land (one commit); F22's `'\n__preamble'` key convention also governs F20's `'\n__fm_raw'`; F10's career.mjs change, F19's parseSessions heading retention, and the legacy-heading clause in statusCreepFlag must land together with F5's exclusion (shipping the exclusion alone regresses career sessions; shipping the clause without F19 makes it a silent no-op); F14's checkbox-bullet exclusion applies to the same statusCreepFlag rewrite; F6's dead-code deletion touches the same parseRecord function as F12; F17's confirm text ("erases N sessions") reads session count via the same parseSessions F19 touches; F23's backup condition reuses F17's helper inside log.mjs; F24's valued-flag declarations must cover the new `--close`/`--growth` flags F1/F5 introduce.
- Cross-cutting checks once implemented: record-lib `--selftest` byte-stability (F2, F5, F6, F10, F12, F14, F19, F20, F22 all touch it — canonical AC1 bytes must be unchanged); tests/run-tests.sh coverage for the new log flags, ordering, and message tiers (F1/F9/F11/F16/F18/F21, F5), scoped overview + exit-65 (F4/F15), threshold overrides (F8), destructive-verb + bulk-close backups (F17/F23), and the `--`-value round-trip (F24); the four repo hygiene lints (lint-flags-vs-hints for `--close`/`--growth`/threshold flags; lint-phase-refs after the F7/F13/F17 SKILL.md edits; lint-non-interactive-inline.sh must stay green — F25 is a file copy, never a block edit); tools/audit-recommended.sh for F17's new defer-only-tagged prompt.
- F3 was resolved by removing a claim rather than adding machinery — if a future pass wants a genuinely commentable prep artifact, it must reconcile the inline-comments contract with the INV-4 store location first.
