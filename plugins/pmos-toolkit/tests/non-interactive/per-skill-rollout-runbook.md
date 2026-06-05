# Per-Skill Non-Interactive Rollout — Runbook

Canonical procedure for inlining the non-interactive contract into a SKILL.md and tagging every `AskUserQuestion` call site so audit passes (`exit 0`) and lint reports `OK:` for the skill.

> Authored in T15 (supersedes T6 stub). Pilot results from `/requirements` (T6) and `/artifact` (T15) appear under "Pilot Findings".

---

## Inputs

- Canonical block source: `plugins/pmos-toolkit/skills/_shared/non-interactive.md` between `<!-- non-interactive-block:start -->` and `<!-- non-interactive-block:end -->` (lines 18–101 at time of writing).
- Tools: `tools/lint-non-interactive-inline.sh`, `tools/audit-recommended.sh`.
- Awk extractor: embedded inside the canonical block; the audit script reuses it.

## Procedure (10 steps)

### 1. Read the SKILL.md end-to-end

Identify Phase 0 location and decide the insertion anchor (Step 2 below).

### 2. Insert the non-interactive block

**Anchor A (preferred — block already inlined)**: paste verbatim immediately after `<!-- pipeline-setup-block:end -->`.

**Anchor B (fallback — pipeline-setup-block not inlined)**: paste verbatim at the end of `## Phase 0 — …` (or whichever section explicitly references `_shared/pipeline-setup.md`), right before the next `## ` heading. ~17 of the 26 user-invokable skills use Anchor B at the time of T15.

The content between the two markers MUST byte-for-byte match the canonical source. Use `awk '/<!-- non-interactive-block:start -->/,/<!-- non-interactive-block:end -->/' plugins/pmos-toolkit/skills/_shared/non-interactive.md` to capture it.

### 3. Extend the `argument-hint` frontmatter

Append `[--non-interactive | --interactive]` to the existing `argument-hint:` line. If `argument-hint:` is missing, add it.

### 4. Run the extractor on this skill

```bash
EXTRACTOR_AWK="$(awk '/<!-- awk-extractor:start -->/,/<!-- awk-extractor:end -->/' plugins/pmos-toolkit/skills/_shared/non-interactive.md \
  | awk '/^```awk$/{flag=1;next}/^```$/{flag=0}flag')"
awk "$EXTRACTOR_AWK" plugins/pmos-toolkit/skills/<skill>/SKILL.md
```

Output is TSV: `<line>\t<has_recc>\t<tag>`. `has_recc=1` means a `(Recommended)` option appears on the call line or in the open option-list block that follows. `tag != "-"` means an adjacent `<!-- defer-only: <reason> -->` was found on the literal previous non-empty line.

### 5. Strip false positives in prose

Some lines containing the literal `AskUserQuestion` are documentation about the call mechanism — not actual call sites. Examples seen during pilots:

- Platform Adaptation bullet: `**No AskUserQuestion:**`
- Parenthetical asides: `(skip if --quick or user opts out via AskUserQuestion)`
- Phase headings: `# P.1 — Intake (one AskUserQuestion batch)`
- Alternate-input descriptions: `Free-text or AskUserQuestion preset list.`

The cleanest fix is to **rephrase** these so the literal token `AskUserQuestion` no longer appears. Substitutions used in /artifact (T15):

| Before | After |
|---|---|
| `**No AskUserQuestion:**` | `**No interactive prompt tool:**` |
| `via AskUserQuestion` (in parenthetical) | `interactively` |
| `(one AskUserQuestion batch)` | `(one interactive batch)` |
| `Free-text or AskUserQuestion preset list.` | `Free-text or preset list.` |

Tagging false positives with `defer-only:ambiguous` would also silence the audit, but it pollutes the runtime OQ buffer with entries for non-existent calls (the classifier would dutifully DEFER each phantom call). Rephrasing avoids that.

### 6. Classify each remaining call site

Re-run Step 4. For each row:

- **`has_recc=1` AND `tag=-`** — already passes audit. Verify the call doesn't gate a destructive op; if it does, add `<!-- defer-only: destructive -->` (FR-04.1: destructive tag wins over Recommended).
- **`has_recc=0` AND `tag=-`** — pick one of:
  1. **Add `(Recommended)` to one option** — preferred when the SKILL.md spells out the option list and a sensible default exists. Keeps the call interactive-equivalent in non-interactive mode.
  2. **Add `<!-- defer-only: free-form -->`** — when the call accepts user-authored content (paste, free-text, dynamic option list).
  3. **Add `<!-- defer-only: ambiguous -->`** — when the call is a confirm / picker that requires human judgement and there's no defensible auto-pick.
  4. **Add `<!-- defer-only: destructive -->`** — when the call gates a destructive op (overwrite, delete, reset, force).

### 7. Tag placement rules

The awk extractor matches a defer-only tag only when it sits on the **literal previous non-empty line** (NR == call_line − 1). A blank line between the tag and the call clears the pending tag.

For prose paragraphs this is straightforward: drop the comment as its own line directly above the call line. For ordered/unordered list items the HTML comment will visually break the list in strict CommonMark renderers, but SKILL.md is consumed by the agent as raw text — rendering correctness is not the contract. If you need to preserve rendered numbering for documentation purposes, prefer Step 6 option (1) over (2)/(3)/(4).

### 8. Re-run extractor — verify zero unmarked rows

```bash
awk "$EXTRACTOR_AWK" plugins/pmos-toolkit/skills/<skill>/SKILL.md \
  | awk -F'\t' '$2=="0" && $3=="-"'
```

No output = success.

### 9. Run lint and audit

```bash
bash plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh 2>&1 | grep <skill>
# expect: OK: <skill>/SKILL.md

bash plugins/pmos-toolkit/tools/audit-recommended.sh plugins/pmos-toolkit/skills/<skill>/SKILL.md
# expect: exit 0; line: <N> calls, <M> Recommended, <K> defer-only, 0 unmarked
```

### 10. Commit

Two commits per skill (or one if you batch the tagging with the block insert):

```bash
git add plugins/pmos-toolkit/skills/<skill>/SKILL.md
git commit -m "feat(T<N>): non-interactive rollout for /<skill>"
```

The `T<N>` prefix is required by `/execute`'s resume resolver.

---

## Common pitfalls

1. **List-numbering breakage.** HTML comments between ordered-list items can reset numbering in CommonMark renderers. Accepted as-is for SKILL.md (read by agent, not rendered). If the skill's docs render anywhere user-facing, prefer Step 6 option (1) (add `(Recommended)`) over inserting a tag.
2. **Multi-line `AskUserQuestion` calls.** The extractor opens a "pending call" on the line containing `AskUserQuestion` and keeps it open until a blank line, defer-only tag, or another `AskUserQuestion` line closes it. `(Recommended)` may appear on any of those open lines. If your call spans many lines (e.g., 4 options each ≥4 lines), make sure the option-list block stays continuous (no blank lines mid-block) so the awk lookahead works.
3. **Conditional destructive calls.** If a call is destructive only on one branch (e.g., `if user picks "overwrite": rm -rf …`), tag it `defer-only:destructive`. The runtime classifier will DEFER and stop-the-run; that's safer than auto-picking the non-destructive branch.
4. **Ambiguous "describe X" prompts.** Free-text intake (paste, file path, dictate, free-form name) → `defer-only:free-form`. Confirm/picker with no defensible auto-pick → `defer-only:ambiguous`.
5. **Pipeline-setup-block missing.** Use Anchor B in Step 2. The skill's lint pass does not depend on pipeline-setup-block presence.
6. **Refusal marker.** If a skill genuinely cannot run non-interactively (e.g., human-creativity-required), add `<!-- non-interactive: refused; reason: ... -->` at the top of the SKILL.md and **skip steps 2, 3, 6** — the lint script auto-excludes refused skills, the audit script reports REFUSED and exits 0 for that skill.

---

## Pilot Findings

### `/requirements` (T6, foundation pilot)

- AskUserQuestion call count from awk extractor: **16** (raw was 20; 4 false positives inside the canonical block were eliminated by the inlined-region skip).
- Block size inserted: **62 lines** (canonical Section 0 between markers).
- Frontmatter argument-hint extension: appended `[--non-interactive | --interactive]`.
- Defer-only tagging: **deferred to T22** — T6 was block-only.
- Plan deviations surfaced and fixed in T6: refusal-marker grep tightened; awk extractor gained inlined-region skip.

### `/artifact` (T15, runbook pilot)

- AskUserQuestion mentions in raw SKILL.md: **22** (matches plan estimate).
- After Step 5 prose rephrases (4 false positives removed): **18 real call sites**.
- Classification breakdown (Step 6):
  - Add-`(Recommended)` rewrites: **0** — /artifact's prose describes calls semantically; option-lists are not enumerated inline. Going through 18 prose sites to invent inline options would be a meaningful skill rewrite, out of scope.
  - `defer-only:destructive`: **2** (refine overwrite-vs-`.refined.md`; template remove confirm).
  - `defer-only:free-form`: **7** (type picker; gap interview; update intake; clarifying batches; template intake; template frontmatter authoring; preset rendering rules).
  - `defer-only:ambiguous`: **9** (tier confirm; preset selection; findings batch; workstream enrichment; refine missing-frontmatter; update findings; update re-run; template section approval; template dry-run).
- Block insertion: **Anchor B** (no pre-existing inlined pipeline-setup-block in `/artifact`).
- Audit final line: `plugins/pmos-toolkit/skills/artifact/SKILL.md: 18 calls, 0 Recommended, 18 defer-only, 0 unmarked`.
- Time taken: ~25 minutes.

### Plan deviations surfaced in T15

1. **Plan estimate "≤4 defer-only tags after manual review"** assumed most calls would already have `(Recommended)` in the SKILL.md prose. None of /artifact's 18 real calls do — the skill describes calls semantically. Realistic per-skill estimate: most skills will need `defer-only:*` for the majority of calls, with `(Recommended)`-add rewrites reserved for skills that already enumerate their option lists inline (e.g., `/spec`, `/plan`, `/verify` recovery prompts). T16–T39 should expect higher tag counts than originally projected.
2. **Anchor B is the common case (17 of 26 skills)**, not the exception. The plan's runbook step originally only mentioned Anchor A.
3. **Step 5 prose rephrasing** was not in the plan — false-positive `AskUserQuestion` mentions in headings, parentheticals, and Platform Adaptation bullets must be rephrased to avoid polluting the runtime OQ buffer with phantom DEFERs. Adopted as a runbook step.

---

## Per-skill addendum: /diagram `--on-failure`

`/diagram` extends the standard non-interactive contract with a `--on-failure {drop|ship-with-warning|exit-nonzero}` flag that gates Phase 6a (Terminal failure handler) disposition deterministically when `mode == non-interactive`. Interactive mode is unchanged — the existing `AskUserQuestion` (`Ship-with-warning / Try-alt / Abandon`) remains the source of truth.

Exit-code contract (canonical source: `plugins/pmos-toolkit/skills/diagram/SKILL.md` Phase 6a):

| Exit | When |
|---|---|
| 0 | Success (incl. `ship-with-warning` path with leading XML warning comment) |
| 2 | Environmental — renderer / theme / mode-combo |
| 3 | Non-interactive `--on-failure drop` — caller dropped the slot |
| 4 | Non-interactive `--on-failure exit-nonzero` (default) |
| 64 | Argument error |

Default when `mode == non-interactive` and the flag is absent: `exit-nonzero` (caller-decides — safest default for automated callers like `/rewrite`).

Contract is locked in by `plugins/pmos-toolkit/tests/non-interactive/diagram-on-failure.bats` (7 grep-based assertions over SKILL.md). Future skills with deterministic-disposition flags should follow the same pattern: a separate `### Per-skill addendum: /<skill>` section here, plus a `<skill>-<flag>.bats` contract file.

**Note for runbook step 5 (false-positive rephrasing):** when adding per-skill prose that *describes* the AUQ surface, avoid the literal token `AskUserQuestion` in non-tagged lines — use "interactive prompt" or "AUQ" instead. The audit script's awk extractor counts every literal-token line as a call site, so prose mentions inflate the unmarked-count. /diagram T2 hit this and was reworded inline.
