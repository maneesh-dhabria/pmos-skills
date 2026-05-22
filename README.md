# pmos-skills

> **Migration breadcrumb (2026-05):** previously distributed as the `pmos-toolkit`
> marketplace; now the `pmos-skills` multi-plugin marketplace hosting `pmos-toolkit`
> (and future `pmos-*` plugins). Install: `/plugin marketplace add maneesh-dhabria/pmos-skills`.
> Cached `v2.49.0` installs of the old `pmos-toolkit` repo continue read-only;
> new installs flow through `pmos-skills`.

## PMOS Toolkit

A Claude Code and Codex plugin for product builders. Turn fuzzy ideas into
shipped features, run user research, draft PRDs and design docs, critique UIs,
and track personal work — without leaving your terminal.

**What makes it different:** every workflow has built-in adversarial and
user-perspective checks, so the output survives contact with reality:

- `/grill` interviews you on shaky assumptions before you commit to a direction.
- `/msf-req` and `/msf-wf` simulate user friction against requirements and wireframes.
- `/simulate-spec` pressure-tests a technical design before any code is written.
- `/creativity` surfaces non-obvious alternatives you'd otherwise miss.
- `/ideate` runs premortem + inversion + assumption-mapping on a half-formed idea.

Skills are namespaced `/pmos-toolkit:<name>` — for brevity the rest of this
README drops the prefix.

## What do you want to do?

| I want to… | Use | Notes |
|---|---|---|
| Take an idea all the way to shipped code | `/feature-sdlc <idea>` | Drives the full pipeline: requirements → grill → spec → plan → execute → verify → ship |
| Pressure-test a half-formed idea before writing it up | `/ideate` | Frame → expand → premortem + inversion; outputs a one-page brief |
| Shape just requirements (no code yet) | `/requirements` | Stress-test with `/grill` or `/msf-req` after |
| Mock up the UI before specifying it | `/wireframes` → `/prototype` | Static HTML wireframes, then a clickable React prototype |
| Critique an existing UI, wireframes, or prototype | `/design-crit` | Nielsen + WCAG 2.2 + Gestalt + PSYCH/MSF rubric |
| Write a technical design doc | `/spec`, or `/artifact` for a standalone EDD/PRD | `/simulate-spec` to pressure-test |
| Break a spec into TDD tasks | `/plan` | Then `/execute` to implement |
| Implement an existing plan | `/execute` | `--subagent-driven` for parallel waves with per-task review |
| Verify and ship work | `/verify` → `/complete-dev` | Lint, test, multi-agent review, then merge + version + push |
| Generate a changelog entry after merging | `/changelog` | Invoked by `/complete-dev`; user-facing entries describing what the system can now do |
| Author a new skill (or revise one from feedback) | `/skill-sdlc` | Same pipeline, scored against a binary eval rubric before merge |
| Draft a PRD / EDD / Discovery Doc | `/artifact` | Section-level eval + writing-style presets |
| Tighten any prose | `/polish` | 14-check rubric; voice-preserving; optional editorial reduction pass |
| Audit, scaffold, or update a README | `/readme` | Rubric + 3-persona simulated reader |
| Design and field a survey | `/survey-design` | Then `/survey-analyse` on the responses |
| Generate a vector diagram | `/diagram` | Brainstorms framings, self-evaluates against a hybrid rubric |
| Audit a codebase against architectural principles | `/architecture` | L1 universal + L2 stack + L3 per-repo; promotes findings to ADRs |
| Track personal tasks (LNO, due dates, people) | `/mytasks` | Lives at `~/.pmos/tasks/` |
| Maintain a shared person / contact directory | `/people` | Handle, name, role, working relationship; consumed by `/mytasks` |
| Track a lightweight repo backlog | `/backlog` | Hybrid quick-capture + structured tracker |
| Persist context across sessions and repos | `/product-context` | Workstream / product / feature scope |
| Capture session learnings | `/session-log` | Decisions, gotchas, patterns |
| Send feedback to skill authors | `/retro` | Severity-tagged, per-skill, from the session transcript |
| Diagnose a slow / hot Mac | `/mac-health` | Background processes, extension leaks, sleep blockers |

## How it works

Five cross-cutting capabilities the whole toolkit is built on:

- **HTML-primary artifacts with Markdown sidecar.** Pipeline skills emit HTML
  by default (better for review and stakeholder sharing) with a Markdown
  sidecar for diffing. Controlled by `output_format` in `.pmos/settings.yaml`
  — set once per repo.
- **Resumable worktree pipelines.** `/feature-sdlc` runs each feature in its
  own git worktree with state persisted to `.pmos/feature-sdlc/state.yaml`.
  Crash, close the session, switch machines — `cd` back in and resume from the
  last checkpoint. `/feature-sdlc list` shows everything in flight across all
  `feat/*` worktrees.
- **Auto-tiering by scope.** Every pipeline skill detects whether you're doing
  a bug fix, an enhancement, or a feature, and adjusts depth automatically
  (Tier 1 = lightweight, Tier 3 = full ceremony). You don't pick the tier;
  the skill does.
- **Adversarial self-evaluation loops.** `/wireframes`, `/prototype`,
  `/diagram`, `/survey-design`, `/artifact`, `/readme` all dispatch a reviewer
  subagent against the draft, apply approved fixes, and loop up to two
  iterations before showing you anything. Built-in, not opt-in.
- **Persistent workstream context.** `~/.pmos/workstreams/` stores product /
  area / feature scope across repos and sessions. Pipeline skills read it as
  a context preamble so you stop re-explaining what you're building. Set via
  `/product-context`.

<details>
<summary>More platform features</summary>

- **Per-developer run defaults.** `/complete-dev` remembers your last release
  answers (`.pmos/complete-dev.lastrun.yaml`) and short-circuits the confirm
  prompts on subsequent runs. Destructive prompts still fire.
- **Parallel subagent execution.** `/execute --subagent-driven` runs
  independent tasks in parallel waves with two-stage review (spec compliance
  + code quality). `/readme`'s simulated-reader dispatches three reader
  personas concurrently. `/wireframes` and `/prototype` parallelise per-device
  generation.
- **User-extensible templates.** `/artifact` reads custom templates from
  `~/.pmos/artifacts/`; `/polish` reads custom checks from
  `~/.pmos/polish/custom-checks.yaml`. Bring your own writing-style preset or
  rubric.
- **Per-skill learnings capture.** Every skill appends session lessons to
  `~/.pmos/learnings.md` under `## /<skill-name>`, then reads them on next
  invocation. The toolkit gets smarter about your workflow over time.
- **Cross-platform, non-interactive ready.** The same skill bodies run under
  Claude Code and Codex CLI. A canonical `--non-interactive` mode auto-picks
  recommended answers and defers ambiguous or destructive choices to an
  open-questions log, so the pipeline runs unattended in headless CI agents.

</details>

## The build-a-feature pipeline

For the end-to-end "idea → shipped" flow, the skills compose like this:

```
/ideate? → /requirements → [/wireframes → /prototype] → /spec → /plan → /execute → /verify → /complete-dev
                              optional (UI work)

Adversarial passes are available at every stage:
  /grill          — interview on shaky assumptions
  /msf-req        — user-friction analysis on requirements
  /msf-wf         — user-friction analysis on wireframes
  /creativity     — non-obvious alternatives
  /simulate-spec  — pressure-test the design before code
```

`/feature-sdlc` runs this whole chain for you, auto-tiering each stage by
scope (bug fix vs. enhancement vs. feature) and persisting resumable state in
a worktree.

Every other skill is standalone — invoke at any point.

## Install

```bash
# Claude Code
/plugin marketplace add maneesh-dhabria/pmos-toolkit
/plugin install pmos-toolkit
```

Smoke test: run `/pmos-toolkit:mytasks` or `/pmos-toolkit:backlog` — both work
on a fresh install with no prior artifacts.

### Codex (recommended)

Tell Codex:

```
Fetch and follow instructions from https://raw.githubusercontent.com/maneesh-dhabria/pmos-toolkit/refs/heads/main/.codex/INSTALL.md
```

Then restart Codex.

<details>
<summary>Codex — manual install</summary>

```bash
git clone https://github.com/maneesh-dhabria/pmos-toolkit.git ~/.codex/pmos-toolkit
mkdir -p ~/.agents/skills
ln -s ~/.codex/pmos-toolkit/plugins/pmos-toolkit/skills ~/.agents/skills/pmos-toolkit
```

</details>

## Local development

```bash
git clone https://github.com/maneesh-dhabria/pmos-toolkit.git
claude --plugin-dir /path/to/pmos-toolkit
```

Changes take effect after restarting the session or running `/reload-plugins`.
Plugin caching is keyed by `version` in `plugin.json` — bump the version on
any skill content change. Both `.claude-plugin/plugin.json` and
`.codex-plugin/plugin.json` versions must match (enforced by
`.githooks/pre-push`).

Skills live under `plugins/pmos-toolkit/skills/<skill-name>/SKILL.md` — that
path is the only one the loader reads.

To add or revise a skill, use `/skill-sdlc <description>` (or
`/skill-sdlc --from-feedback <text|path>` to apply retro feedback).

## Updating

Claude Code updates automatically via the marketplace. For Codex:

```bash
cd ~/.codex/pmos-toolkit && git pull
```

## Requirements

- Claude Code or Codex CLI

## Contributing

This is a solo-maintained project. To keep the surface area honest:

- **Feedback is welcome** — open a GitHub issue, or run `/pmos-toolkit:retro`
  at the end of a session and paste the output. `/retro` produces
  severity-tagged, per-skill feedback that's the easiest signal for me to act
  on.
- **Bug reports are welcome** — issues with a reproducer get priority.
- **Unsolicited PRs are not accepted.** If you'd like to propose a skill
  change, run `/pmos-toolkit:skill-sdlc --from-feedback <description>` on your
  end, share the proposed diff in an issue, and we'll discuss before any code
  lands.
- **Forks are fine.** MIT means you can take the toolkit in any direction you
  want under your own name.

## License

[MIT](LICENSE) — use it however you want, please keep the copyright notice.
