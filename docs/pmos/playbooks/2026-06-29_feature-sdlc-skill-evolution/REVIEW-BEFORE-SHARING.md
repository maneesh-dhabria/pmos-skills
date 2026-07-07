# REVIEW BEFORE SHARING

## ⚠️ NOT cleared for sharing until you complete this checklist.

`/playbook` **detects and flags** — it never auto-scrubs and never marks anything "safe."
Concreteness is the teaching value, so *you* are the gate. Nothing in the pipeline has cleared
this. Work through every row, then sign off at the bottom.

---

## 1. Flagged text — keep or redact?

| Item | Type | Where | Keep / Redact? |
|---|---|---|---|
| `maneeshdhabria` (your username) | Personal identifier | **Embedded in the screenshot** (worktree path) + footer GitHub links (`maneesh-dhabria`) | ☐ |
| `/Users/maneeshdhabria/Desktop/Projects/agent-skills-feature-sdlc-skill-mode` | Local filesystem path | Screenshot (pipeline-status "Worktree:" line) | ☐ |
| `origin + github + github-work` (remote names) | Infra / org hint — "github-work" implies an employer remote | Screenshot (complete-dev artifact line) | ☐ |
| `feat/feature-sdlc-skill-mode` | Branch name | Screenshot | ☐ |
| github.com/maneesh-dhabria/pmos-skills | Public repo URL | Header + footer wordmark/attribution links | ☐ |
| Claude Code · Claude | Product names (Anthropic) | Throughout | ☐ |
| pmos-toolkit · pmos-learnkit | Your project/product names | Throughout | ☐ |
| macOS | Platform name | "Surviving a context reset" | ☐ |
| Notion | Product name (referenced obliquely; the private DB URL was truncated out of the quote) | "The pipeline starts building itself" (the `@docs/…` path only) | ☐ |
| `2.31.0`, `2.38.0`, `53 checks`, `Phase 6a` | Version / quantitative claims | Multiple milestones | ☐ |
| "seven weeks", "1h cron", "3-4 random sub-page samples" | Quantitative / cadence claims | Lede, milestones | ☐ |

> Highest-priority rows are the top three: the screenshot bakes a **local username path and a
> work-remote name (`github-work`) into a PNG that cannot be text-scrubbed.** If you don't want
> your machine path or employer hint public, re-crop or re-shoot that image (or drop the figure)
> before posting.

## 2. Screenshots — eyeball each (images can't be text-flagged)

- ☐ `screenshots/feature-sdlc-skill-mode-pipeline.png` — I have eyeballed this image for sensitive
  content. **Specifically confirm:** the "Worktree:" path (your username + local dir) and the
  "pushed to origin+github+github-work" line are OK to share, or I have redacted/replaced them.

## 3. Verbatim prompts — confirm they're yours to share

The article quotes your own opening prompts verbatim (the `/frameworks` brief, the `/case-study`
origin, the loop-control lines, the INDEX-file question). They contain no third-party content,
but confirm you're comfortable publishing your own phrasing:

- ☐ The five quoted prompts are mine and contain nothing I want kept private.

---

## ✅ Sign-off

- ☐ **Reviewed; cleared to share.**
