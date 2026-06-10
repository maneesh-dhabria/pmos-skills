# Findings protocol — /polish deltas

Present surfaced findings per `_shared/findings-dispositions.md` — the four dispositions (Fix as proposed / Modify / Skip / Defer), ≤4 per batch grouped by category, the structural-finding escape, non-interactive classification, and the platform-fallback table are all canonical there. This file holds only what `/polish` does differently.

## Two lanes (risk classification per `reference/rubric.md`)

- **Auto-apply (low-risk: checks 1, 5, 6a, 6b, 9, 10):** applied silently in a single batch per iteration — these findings never reach the dispositions protocol. Record aggregate counts in the Phase 8 summary, e.g. `Auto-fixed: 8 clutter words, 3 em-dashes, 2 hedging stacks`. Custom checks default to high-risk unless they declare `risk: low`.
- **Surface (everything else):**
  - High-risk checks **2, 3, 4, 7, 8, 11, 12, 13, 14** (check 8 is regex-detected but its patch deletes a claim — meaning-altering, so it is surfaced, never silent)
  - Any patch that emitted `PRESERVE_VOICE_CONFLICT` (shown with the conflict reason)
  - Any patch flagged `partial fix — introduces X` — even if the original check was low-risk
  - Any `risk: high` editorial-pass note (`reorder`, large `merge`) and any rewriter voice-conflict from Phase 3 (`reference/editorial-pass.md`) — these enter exactly like high-risk rubric findings
  - All structural changes (lede moves, paragraph merges) — NEVER auto-applied regardless of underlying check risk

## Question shape

`header` is `<check-id> L<line>` (max 12 chars). The **Fix as proposed** option carries `(Recommended)` because every surfaced patch has already passed local rubric re-check (the substrate's "deterministic, safe fix" branch). **Modify** triggers the substrate's free-form follow-up: *"What's your preferred wording for the span at line N?"*

## Defer target (delta from the substrate default)

`/polish` does not defer to Open Questions. **Defer** inserts a marker comment immediately above the deferred span:

```
<!-- POLISH: <check-id> kept by user — "<one-line excerpt of the deferred prose>" -->
```

NO line numbers in the comment — they go stale immediately. The excerpt makes the comment self-locating. (For HTML inputs the comment is itself a lock zone on later runs, so it stays put.)

## Structural changes

When the proposed patch for checks 4 (throat-clearing), 11 (header inflation), 12 (bullet abuse), or 14 (weak lede) moves or merges content (not just rewording in place): always surface individually, never bundle, never auto-apply, and state explicitly what moves — *"Lede 'X is Y because Z' is buried at line 42. Move it to paragraph 1?"*

Platform fallback (no `AskUserQuestion`) and the prose-dump anti-pattern: per the substrate. Never silently apply high-risk fixes — wait for user input.
