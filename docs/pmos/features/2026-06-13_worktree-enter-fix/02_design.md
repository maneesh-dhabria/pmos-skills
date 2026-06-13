# feature-sdlc — worktree-enter deferred-tool fix

**Skill:** `pmos-toolkit/feature-sdlc` · **Route:** skill-feedback (monolithic) · **Tier:** 1 (surgical bug fix, one SKILL.md, no new files/UI)
**Acceptance criteria:** `reference/skill-patterns.md §A–§L` + host `CLAUDE.md` skill-authoring conventions.

## Problem (Phase 0c triage — 1 finding, blocker, classification=bug, already_handled=no, recommendation=fix-as-proposed)

`/feature-sdlc` Phase 0a Step 3 tells the model to `Call EnterWorktree(path=$ABS_PATH)` and to hand off on any error. In real sessions the worktree gets created (`git worktree add`) but the session **never enters it** — bash stays in the main checkout and the pipeline is driven via absolute `git -C <abs>` paths. Two compounding causes:

1. **`EnterWorktree`/`ExitWorktree` are DEFERRED harness tools** — their schema is not preloaded, so a naked call fails with `InputValidationError`. The skill never says to load the schema first.
2. **The tools' own usage guard** says "use ONLY when explicitly instructed to work in a worktree (user or project instructions)… never unless 'worktree' is mentioned by the **user** or CLAUDE.md/memory." In a `define`/`skill` run it is the *skill* asking, not the end user — so the model self-vetoes.

Result: the model takes an **unspecified third path** — skips both the `EnterWorktree` call and the mandated handoff, and remote-controls the worktree from main.

### Evidence
- `git worktree list` shows define/build worktrees as plain `git worktree add` sibling dirs (`~/Desktop/Projects/agent-skills-<id>`), never under harness-managed `.claude/worktrees/`; session `pwd` stays on `main`.
- Recurring memory gotchas: "bash cwd snaps back to main (scope `git -C <wt>`)"; "concurrent release uncommitted in working tree — never `git add -A`".

### Consequences
1. Write-back / docs-merge run in the **shared main checkout** → cross-contamination across parallel `define` sessions (the `git add -A` near-miss).
2. `--resume` is broken — Phase 0b drift check compares `realpath(pwd)=main` vs `state.worktree_path=sibling-dir` → hard-fails.
3. No real sandbox isolation despite the worktree existing on disk.

## Solution (Phase 4 spec — FRs)

Canonical home for the contract = **Phase 0a Step 3** (`#worktree`). Cited (not restated) from define-mode teardown and build-mode worktree create-or-reuse (§K one-fact-one-home).

- **FR-1 (load-before-call).** Before calling `EnterWorktree`/`ExitWorktree`, load their schema (`ToolSearch` `select:EnterWorktree,ExitWorktree` on Claude Code; equivalent deferred-tool load elsewhere). If the tool cannot be loaded / is absent on this harness → the **handoff** case (not remote-control).
- **FR-2 (authorization).** State explicitly that **reaching Step 3 IS the authorizing instruction** to call `EnterWorktree` (worktree is non-optional, Anti-pattern #2) — the model must not self-veto because the end user never typed "worktree".
- **FR-3 (hard post-enter assertion).** Immediately after a successful `EnterWorktree`, assert `realpath($PWD) == $ABS_PATH` (log the comparison). Pass → continue. **Fail (cwd still main) → handoff**, never continue against `git -C`/`cd` from main. Closes the unspecified third path.
- **FR-4 (anti-pattern).** Add Anti-pattern #15: improvising remote-control of the worktree after a failed/absent `EnterWorktree` is forbidden — enter or hand off are the only moves.
- **FR-5 (teardown symmetry).** Define-mode step 5 `ExitWorktree` teardown cites the same load-first contract. Build-mode worktree create-or-reuse cites the Phase 0a Step 3 enter+assert contract.

Non-goals: redesigning to `EnterWorktree(name=…)` (its `fresh` baseRef would branch from stale `origin/main`, here 22 commits behind local HEAD — the add-then-enter-by-path pattern is deliberate and retained). No script/reference-file additions.

## Plan (Phase 5 — TDD-lite; SKILL.md prose edits, verified by lints + skill-eval)

- T1: Rewrite Phase 0a Step 3 — heading, load-first step, authorization note, split enter vs assert, handoff branches. (FR-1/2/3)
- T2: Add Anti-pattern #15. (FR-4)
- T3: Add citations from define teardown (`ExitWorktree`) + build step 3 worktree create-or-reuse. (FR-5)
- T4: Verify — `tools/lint-phase-refs.sh`, `tools/lint-flags-vs-hints.sh`, `tools/lint-non-interactive-inline.sh`, `tools/audit-recommended.sh`, `skill-eval-check.sh`. Then skill-eval [D]+[J].

## Self-demonstration

This very run executed the fix against itself: ToolSearch-loaded `EnterWorktree`, called `EnterWorktree(path=…)`, asserted `realpath(pwd)==worktree` (PASS) — proving the contract before writing it.
