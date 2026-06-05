# Findings Presentation Protocol

Two paths after Phase 4: auto-apply (silent) and surface (per-finding approval). The split is determined by check risk classification.

## Auto-apply path (low-risk)

Low-risk checks: **1, 5, 6a, 6b, 8, 9, 10**.

Apply silently in a single batch per iteration. Do NOT prompt the user for each fix. Record aggregate counts in the Phase 7 summary:

```
Auto-fixed: 8 clutter words, 3 em-dashes, 2 hedging stacks, 4 AI-vocab terms
```

Custom checks default to high-risk unless they declare `risk: low` in YAML.

## Surface path (high-risk + voice-conflict + partial-fix)

Surfaced findings:
- High-risk checks: **2, 3, 4, 7, 11, 12, 13, 14**
- High-risk editorial-pass notes (Phase 2a): any `risk: high` note in `editor_notes.json` (`reorder`, large `merge`) the rewriter declined to auto-apply, plus any `PRESERVE_VOICE_CONFLICT` the rewriter emitted. These enter this surface path exactly like a high-risk rubric finding; structural reorders follow the "Structural changes" rule below (individually surfaced, never bundled, never auto-applied). See `reference/editorial-pass.md`.
- Any patch that emitted `PRESERVE_VOICE_CONFLICT`
- Any patch flagged `partial fix — introduces X`
- All structural changes (lede moves, paragraph merges) — NEVER auto-applied regardless of underlying check risk

### AskUserQuestion shape

Group findings by check category. Batch ≤4 questions per `AskUserQuestion` call. For each finding:

```
question: "<one-sentence finding> → <one-sentence proposed fix>"
header: "<check-id> L<line>"  (max 12 chars)
multiSelect: false
options:
  - label: "Fix as proposed (Recommended)"
    description: "Apply the rewrite shown above. Patch has passed local rubric re-check."
  - label: "Modify"
    description: "I'll write the replacement myself in a follow-up."
  - label: "Skip — keep as-is"
    description: "Leave the original text untouched. Will not surface again."
  - label: "Defer — leave a comment for me"
    description: "Insert a marker comment above the span so I can revisit later."
```

If user picks **Modify** → follow-up open-ended ask: *"What's your preferred wording for the span at line N?"*

If user picks **Defer** → insert this comment immediately above the deferred span:

```
<!-- POLISH: <check-id> kept by user — "<one-line excerpt of the deferred prose>" -->
```

NO line numbers in the comment — they go stale immediately. The excerpt makes the comment self-locating.

## Structural changes

Special handling for checks 4 (throat-clearing), 11 (header inflation), 12 (bullet abuse), 14 (weak lede) when the proposed patch involves moving or merging content (not just rewording in place):

- ALWAYS surface individually as a high-risk finding
- NEVER bundle with other findings in a single approval
- NEVER auto-apply
- The `question` should explicitly state what's being moved/merged: *"Lede 'X is Y because Z' is buried at line 42. Move it to paragraph 1?"*

## Platform fallback (no `AskUserQuestion`)

When `AskUserQuestion` is unavailable, print a numbered findings table:

```markdown
## Findings requiring your input

| # | Check | Line | Finding | Proposed fix | Disposition (default) |
|---|-------|------|---------|--------------|------------------------|
| 1 | weak-lede | 12 | Buried lede | Move "X is Y because Z" to ¶1 | Fix |
| 2 | tricolon | 47 | 4 tricolons in 200 words | Replace 2 with prose | Fix |
| 3 | bullet-abuse | 78 | List of full sentences | Convert to prose | Fix |

Reply with: `1=fix, 2=skip, 3=defer "stays as bullets for emphasis"` etc.
```

Do NOT silently apply high-risk fixes. Wait for user input.

## Anti-patterns

- ❌ Dumping findings as prose ending in *"Let me know what you'd like to fix."*
- ❌ Applying any high-risk fix without explicit approval
- ❌ Bundling structural changes with rewording fixes in a single approval
- ❌ Embedding line numbers in defer comments
- ❌ Asking the user to disposition more than 4 findings in one `AskUserQuestion` call
