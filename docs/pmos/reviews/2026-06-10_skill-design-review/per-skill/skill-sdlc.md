# skill-sdlc — review

**Grade:** A (this is what a thin alias should look like — near-Pocock minimalism, explicit delegation, zero duplicated logic)
**Size:** SKILL.md 18 lines; references 0 files; target ~18 lines (no change).

## TL;DR

- Biggest win available: none worth the churn — at most, drop the duplicated `argument-hint` flag enumeration (it can drift from the orchestrator's; "forwards verbatim" already covers it).
- Biggest risk: the alias is only as correct as the orchestrator's token-1 dispatch grammar — unquoted multi-word descriptions forwarded as `skill a skill that lints YAML` mis-dispatch to feature mode *per the letter* of feature-sdlc FR-02 (see feature-sdlc Finding 4). The bug lives in the orchestrator, not here.
- Done well, keep: the `<!-- non-interactive: delegated … -->` self-documenting exemption marker; two concrete forwarding examples; "Do nothing else" — the whole file is an intent statement the model can't misread.

## Findings

1. **[F] `argument-hint` duplicates the orchestrator's flag list and will drift.** It already omits `--resume` and `--reset-defaults` (which `/feature-sdlc skill … --resume` honors via the verbatim pass-through). Low stakes — the body says "verbatim arguments" — but either sync it or shorten to `"<description> | --from-feedback <text|path|--from-reflect> [flags passed through to /feature-sdlc]"`.
2. **[X] Coupling note (not a defect):** correctness depends on feature-sdlc's dispatch accepting `skill <unquoted multi-word description>`. Today's token-1 grammar technically rejects that shape (condition (c) requires *one quoted argument*). Fix belongs in feature-sdlc; retest this alias after.

## Flags inventory

| flag | purpose | verdict |
|---|---|---|
| (all) | forwarded verbatim to `/feature-sdlc skill …` | keep; consider collapsing the hint to "passed through" (Finding 1) |

## Gates & rubrics inventory

| check | hard or soft | failure it catches | verdict |
|---|---|---|---|
| (none — delegated marker) | — | — | keep; the delegated-exemption marker is the correct lint posture |

## Fix list

| fix | type | impact | risk |
|---|---|---|---|
| Sync or collapse `argument-hint` to a pass-through note | quick-win | low | none |
