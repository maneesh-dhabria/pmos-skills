# Run manifest — 2026-07-12 blind-refactor adversarial review

Goal: repo-wide skill-refactoring PROPOSAL via adversarial blind-review loop. READ-ONLY for `plugins/`, `.claude-plugin/`, `.codex-plugin/`. All writes under this directory only.

## Scope reconciliation

The goal statement said "69 skills (toolkit 44, learnkit 9, gamekit 8, managerkit 4, utilities 4)". Actual on-disk skill directories at run start (excluding `_shared/` and toolkit's hidden `.system/`):

| Plugin | On disk | Goal said |
|---|---|---|
| pmos-toolkit | 43 | 44 |
| pmos-learnkit | 8 | 9 |
| pmos-gamekit | 7 | 8 |
| pmos-managerkit | 3 | 4 |
| pmos-utilities | 4 | 4 |
| **Total** | **65** | 69 |

Every skill directory that exists is reviewed. `plugins/pmos-toolkit/skills/.system/` (imagegen, openai-docs, plugin-creator, skill-creator, skill-installer) is not a registered skill path — flagged in Open questions, not given full review units.

Units: 65 skills + 4 `_shared/` substrate units (toolkit, learnkit, gamekit, managerkit — utilities has none) + 5 cross-skill coherence units (one per plugin) = **74 units**.

## Protocol

- Scratchpads: `scratchpad/<plugin>__<skill>.md` (append-only), `scratchpad/_shared.md` (all 4 substrate units, plugin-prefixed headings), `scratchpad/_cross/<plugin>.md`.
- Cumulative author proposal per unit: `proposal/<unit>.md` — the ONLY prior-round context a pass-N≥2 reviewer sees.
- Convergence: zero new [Blocker]/[Should-fix] in a reviewer pass (trailing [Nit]s folded without another round). Hard cap: 5 passes for the pmos-managerkit pilot; **reduced to 2 passes for all later batches on user instruction (2026-07-13, "cap at 2 iterations")**. Capped units carry their open questions in the proposal file.
- Findings grounded: ≥40-char verbatim quote + file:line, else invalid.

## Status (unit → passes → status)

| Batch | Workflow run | Status |
|---|---|---|
| pmos-managerkit (3 skills + shared + cross = 5 units) | wf_56d857fd-654 + closeout wf_0848441f-36f | DONE — interview-feedback CONVERGED (23 acc/0 rej), interview-guide CONVERGED (17/0), one-on-one CAPPED (25/0), shared CONVERGED (19/0), cross CAPPED (22/0). Ran under original 5-pass cap; interrupted by session limit at tail, closed out with a final author pass. |
| pmos-utilities (4 skills + cross = 5 units) | wf_a2bda14f-22d | DONE (2-pass cap) — all 5 units CAPPED at pass 2 with final author response: converter 12 findings (1B), mac-health 13, reflect 20 (1B), to-notion-doc 19 (3B), cross 14. All accepted/argued in proposals. |
| pmos-gamekit (7 skills + shared + cross = 9 units) | wf_d58980bc-5d4 (+resume for sudoku) | 8/9 units CAPPED at pass 2 with full dispositions; sudoku re-running after a transient API error at author pass 1. |
| pmos-learnkit (8 skills + shared + cross = 10 units) | wf_af7e3800-c90 | running (2-pass cap) |
| pmos-toolkit (43 skills + shared + cross = 45 units) | — | pending |
| Synthesis → REFACTORING-PROPOSAL.md | — | pending |

Per-unit results are appended below as each batch completes.
