# prototype-sdlc — review

**Grade:** B (a well-built thin alias whose own documented forwarding examples mis-dispatch under the orchestrator's letter-of-the-law token grammar)
**Size:** SKILL.md 26 lines; references 0 files; target ~22 lines.

## TL;DR

- Biggest win available: fix the `list` and `--resume` forwarding seams with feature-sdlc — the alias's own examples produce wrong dispatch or a warning per the orchestrator's contract.
- Biggest risk: `/prototype-sdlc list` → `/feature-sdlc prototype list` is, per feature-sdlc's FR-02 token-1 grammar, **feature mode with seed "prototype list"** (none of conditions a/b/c hold; and `list` is a token-1-only selector, so even a quoted forward starts a discovery pipeline for the literal idea "list"). A sensible model will do the right thing anyway — which is exactly the evidence that the grammar, not the model, is the liability.
- Done well, keep: the extend-or-discard exit instructions (`state.yaml.pipeline_mode` → `feature` + `--resume`, or `git worktree remove`) — the single most useful thing a user needs after a discovery run, stated in two lines.

## Findings

1. **[R/X] `list` forwarding is broken by contract.** Line 18 documents `/prototype-sdlc list` → `/feature-sdlc prototype list`, but feature-sdlc's `list` short-circuit fires only when `list` is token 1. Fix on this side (cheap): forward `list` *as* `list` (drop the `prototype` prefix — feature-sdlc `list` already shows all `feat/*` worktrees, prototype runs included), or drop `[list]` from this alias's `argument-hint` entirely.
2. **[R] `--resume` forwarding triggers a warning by design.** `/prototype-sdlc --resume` → `/feature-sdlc prototype --resume` hits feature-sdlc's FR-05 rule "subcommand ignored on `--resume`; mode read from state.yaml" — every alias resume emits a spurious warning. Fix: forward `--resume` without the `prototype` prefix (mode comes from state.yaml anyway), and say so in the example.
3. **[V] Minor: the closing two paragraphs partially restate the orchestrator's prototype-mode contract** (which phases don't run, worktree-left-intact). The description frontmatter already says it once. Trimming to the extend/discard instructions alone saves ~4 lines; keep the extend/discard part.

## Flags inventory

| flag | purpose | verdict |
|---|---|---|
| `--resume` | resume a discovery run | keep; forward without the `prototype` prefix (Finding 2) |
| `list` | show in-flight worktrees | rename forwarding to bare `list` or delete from hint (Finding 1) |
| (rest) | forwarded verbatim | keep |

## Gates & rubrics inventory

| check | hard or soft | failure it catches | verdict |
|---|---|---|---|
| (none — delegated marker) | — | — | keep |

## Fix list

| fix | type | impact | risk |
|---|---|---|---|
| Forward `list` and `--resume` without the `prototype` prefix; update the two examples | quick-win | med | none — strictly removes mis-dispatch |
| Trim the duplicated prototype-mode recap (keep extend/discard) | quick-win | low | none |
