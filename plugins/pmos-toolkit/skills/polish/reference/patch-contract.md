# Patch generation contract

For each failed check (per chunk if chunked), generate a patch using the template below.

> **Reuse by the editorial rewriter.** The Phase 2a editorial-pass *rewriter* subagent (`reference/editorial-pass.md`) reuses the `PRESERVE_VOICE_CONFLICT` token, its JSON shape (`conflicting_marker` + `reason`), and its handling defined in this file: a conflict is never auto-applied — it is promoted to a high-risk finding and surfaced via `reference/findings-protocol.md`.

## Patch prompt template

```
You are a prose editor. Rewrite the offending span to fix the cited violation while preserving the author's voice markers.

VOICE MARKERS (anchored to original doc):
<voice marker JSON from Phase 1>

ACTIVE PRESET: <preset name>
ACTIVE THRESHOLDS:
<threshold key>: <value>
<threshold key>: <value>
...

PRESET INSTRUCTION:
<one of the per-preset instructions from reference/presets.md>

CITED VIOLATION:
Check: <check id>
Rationale: <check's rationale>
Span (lines <start>-<end>):
<verbatim span text>

CONSTRAINTS:
- Output the rewritten span ONLY. Do not add commentary.
- Do not modify text outside the cited span.
- Do not introduce any check listed below as a NEW failure: <list of all 15 check ids>
- If preserving the voice markers conflicts with fixing the violation, output the literal token PRESERVE_VOICE_CONFLICT followed by JSON:
  PRESERVE_VOICE_CONFLICT
  {"conflicting_marker": "<one of: avg_sentence_length | sentence_length_stddev | register | person | idiomatic_phrases | contraction_rate>", "reason": "<one-sentence justification>"}
- Use temperature 0.

Output:
```

Use `temperature: 0` on the call.

## Per-patch QA flow

1. **Locked-zone check.** If the rewritten span intersects any locked zone byte range → reject (count as patch failure → retry).
2. **Local check re-run.** Run the LOCAL checks (1, 5, 6a, 6b, 8, 9, 10, 13) on the patched span only. If a NEW local check fails:
   - Regenerate the patch, adding the new failure to the prompt's CONSTRAINTS list as an additional cited violation
   - Cap at **2 retries**
   - If still failing after retries → mark patch as `partial fix — introduces <check id>` and surface to user, even if the original check was low-risk
3. **Global checks NOT re-run.** They run once per iteration in Phase 6 on the whole doc.
4. **`PRESERVE_VOICE_CONFLICT` handling.**
   - Validate the JSON justification (must include `conflicting_marker` from the allowed set + `reason` ≤ 200 chars)
   - Malformed → treat as patch failure, retry once
   - Valid → do NOT auto-apply; promote the finding to high-risk and surface to user with the conflict reason shown
   - Track conflict count for the run

## Voice-conflict abort cap

After all patch attempts in an iteration:

```
conflict_rate = preserve_voice_conflicts / patches_attempted
```

If `conflict_rate > 0.30` AND the run is NOT `low_confidence` (per voice-sampling.md):

**Abort the run** with:
```
Voice constraints too strict for this doc — re-run with `--preset concise` or `--preset narrative`.
<conflict_rate>% of patches conflicted with the preserve-voice markers.
```

Low-confidence runs (small docs with <200 polishable words) are exempt — their markers are unreliable, so conflicts shouldn't trigger an abort.

## Examples

### Successful patch (no conflict)

Input span:
> "It is important to note that we should perhaps consider whether the new framework might possibly be more robust."

Patch output:
> "The new framework is more robust."

Voice markers preserved: same register (technical), same person (third), sentence length within ±25%.

### `PRESERVE_VOICE_CONFLICT` example

Input span (from a chatty blog post, voice markers: register=conversational, idiomatic_phrases=["the trick is", "as it turns out"]):
> "The trick is, as it turns out, that the system might possibly be a bit too clever for its own good."

If asked to fix the hedging stack (`might possibly`), removing both hedges flattens the conversational rhythm. The patch model should emit:

```
PRESERVE_VOICE_CONFLICT
{"conflicting_marker": "register", "reason": "Removing the hedge changes the chatty tone the author uses elsewhere."}
```

This becomes a high-risk finding for the user to decide.
