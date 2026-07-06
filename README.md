# pmos-skills

A marketplace of Claude Code and Codex plugins for product builders. Take a
fuzzy idea all the way to shipped code, learn a topic from verified sources,
keep your machine healthy, run the manager parts of your job, or take a
five-minute break — all without leaving your terminal.

Five plugins, each answering one question:

| Plugin | Helps you… | Headline skills |
|---|---|---|
| **pmos-toolkit** | ship a feature | `/feature-sdlc`, `/requirements` → `/spec` → `/plan` → `/execute` → `/verify` → `/complete-dev`, `/grill`, `/artifact` |
| **pmos-learnkit** | learn a topic | `/primer`, `/learn-list`, `/frameworks`, `/magazine`, `/playbook`, `/book-summary`, `/critical-thinking` |
| **pmos-utilities** | maintain your environment | `/mac-health`, `/reflect`, `/converter`, `/to-notion-doc` |
| **pmos-managerkit** | do manager work | `/interview-feedback` |
| **pmos-gamekit** | take a break | `/solitaire`, `/2048`, `/tetris`, `/sudoku`, `/snake`, `/poker`, `/flappy-bird` |

**What makes it different:** every workflow has built-in adversarial and
user-perspective checks, so the output survives contact with reality —
`/grill` interviews you on shaky assumptions, `/msf-req` and `/msf-wf`
simulate user friction, `/simulate-spec` pressure-tests a design before any
code is written, and verified-source skills never ship a link or claim they
didn't fetch this run.

## What do you want to do?

Skills are namespaced `/<plugin>:<name>` — for brevity the table drops the
prefix. The plugin each skill belongs to is in the last column.

| I want to… | Use | Plugin |
|---|---|---|
| Take an idea all the way to shipped code | `/feature-sdlc <idea>` | toolkit |
| Pressure-test a half-formed idea before writing it up | `/ideate` | toolkit |
| Shape a fuzzy problem before any solution or requirements | `/shape` | toolkit |
| Fast gut-check: am I solving the right thing? (2-min inversion) | `/wayrttd` | toolkit |
| Shape just requirements (no code yet) | `/requirements` | toolkit |
| Mock up the UI before specifying it | `/wireframes` → `/prototype` | toolkit |
| Run the discovery half only (no /plan or /execute) | `/prototype-sdlc <seed>` | toolkit |
| Critique an existing UI, wireframes, or prototype | `/design-crit` | toolkit |
| Write a technical design doc | `/spec`, or `/artifact` for a standalone EDD/PRD | toolkit |
| Break a spec into TDD tasks | `/plan` → `/execute` | toolkit |
| Implement an existing plan | `/execute` | toolkit |
| Verify and ship work | `/verify` → `/complete-dev` | toolkit |
| Generate a changelog entry after merging | `/changelog` | toolkit |
| Author a new skill (or revise one from feedback) | `/skill-sdlc` | toolkit |
| Draft a PRD / EDD / Discovery Doc | `/artifact` | toolkit |
| Critique a PRD / strategy doc like a product leader | `/artifact-critique` | toolkit |
| Tighten any prose | `/polish` | toolkit |
| Summarize any source into a faithful TL;DR | `/summary-tldr` | toolkit |
| Run deep, decision-framed research on a topic | `/research` | toolkit |
| Generate a high-converting product landing page | `/landing-page` | toolkit |
| Build a living wiki from scattered team docs | `/wiki` | toolkit |
| Audit, scaffold, or update a README | `/readme` | toolkit |
| Annotate any pmos-emitted HTML artifact in the browser | `/comments` | toolkit |
| Design and field a survey | `/survey-design` → `/survey-analyse` | toolkit |
| Generate a vector diagram | `/diagram` | toolkit |
| Generate on-brand SVG logo candidates | `/logo` | toolkit |
| Turn a doc/artifact/URL into a narrated explainer video | `/explainer-video` | toolkit |
| Audit a codebase against architectural principles | `/architecture` | toolkit |
| Track personal tasks (LNO, due dates, people) | `/mytasks` | toolkit |
| Maintain a shared person / contact directory | `/people` | toolkit |
| Track a lightweight repo backlog | `/backlog` | toolkit |
| Run the three-loop backlog (define → build → release) | `/feature-sdlc define` → `build --next` → `/complete-dev --epic` | toolkit |
| Persist context across sessions and repos | `/product-context` | toolkit |
| Capture session learnings | `/session-log` | toolkit |
| Send feedback to skill authors | `/reflect` | utilities |
| Convert files between formats (JSON/YAML/CSV/HTML/MD/PDF) | `/converter` | utilities |
| Turn a local doc into a faithful Notion page | `/to-notion-doc` | utilities |
| Ramp up on a topic with cited sources | `/primer <topic>` | learnkit |
| Get a verified, anti-slop reading list | `/learn-list <topic>` | learnkit |
| Find the right PM framework for a decision | `/frameworks "<problem>"` | learnkit |
| Digest your newsletter + podcast backlog | `/magazine` | learnkit |
| Turn your AI sessions into shareable case studies | `/playbook` | learnkit |
| Get the durable ideas of a book, PM-framed | `/book-summary <title>` | learnkit |
| Practice product judgment / critical thinking | `/critical-thinking` | learnkit |
| Diagnose a slow / hot / battery-hungry Mac | `/mac-health` | utilities |
| Score interview rounds into a grounded scorecard | `/interview-feedback` | managerkit |
| Play a quick browser game | `/solitaire`, `/2048`, `/tetris`, `/sudoku`, `/snake`, `/poker`, `/flappy-bird` | gamekit |

## How it works

Five cross-cutting capabilities the toolkit is built on:

- **HTML-primary artifacts with Markdown sidecar.** Pipeline skills emit HTML
  by default (better for review and stakeholder sharing) with a Markdown
  sidecar for diffing. Controlled by `output_format` in `.pmos/settings.yaml`
  — set once per repo.
- **Resumable worktree pipelines.** `/feature-sdlc` runs each feature in its
  own git worktree with state persisted to `.pmos/feature-sdlc/state.yaml`.
  Crash, close the session, switch machines — `cd` back in and resume from the
  last checkpoint. `/feature-sdlc list` shows everything in flight.
- **Auto-tiering by scope.** Every pipeline skill detects whether you're doing
  a bug fix, an enhancement, or a feature, and adjusts depth automatically
  (Tier 1 = lightweight, Tier 3 = full ceremony). The skill picks the tier.
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
  independent tasks in parallel waves with two-stage review. `/readme`'s
  simulated-reader dispatches four reader personas concurrently. `/wireframes`
  and `/prototype` parallelise per-device generation.
- **User-extensible templates.** `/artifact` reads custom templates from
  `~/.pmos/artifacts/`; `/polish` reads custom checks from
  `~/.pmos/polish/custom-checks.yaml`.
- **Per-skill learnings capture.** Every skill appends session lessons to
  `~/.pmos/learnings.md` under `## /<skill-name>`, then reads them on next
  invocation.
- **Cross-platform, non-interactive ready.** The same skill bodies run under
  Claude Code and Codex CLI. A canonical `--non-interactive` mode auto-picks
  recommended answers and defers ambiguous or destructive choices to an
  open-questions log, so the pipeline runs unattended in headless CI agents.

</details>

## Build a feature, end to end

For the "idea → shipped" flow, the toolkit skills compose like this:

```
/ideate? → /requirements → [/wireframes → /prototype] → /spec → /plan → /execute → /verify → /complete-dev
                              optional (UI work)

Adversarial passes are available at every stage:
  /grill          — interview on shaky assumptions
  /ripple-effects — simulate 1st/2nd/3rd-order effects, then refine
  /msf-req        — user-friction analysis on requirements
  /msf-wf         — user-friction analysis on wireframes
  /creativity     — non-obvious alternatives
  /simulate-spec  — pressure-test the design before code
```

`/feature-sdlc` runs this whole chain for you, auto-tiering each stage by
scope and persisting resumable state in a worktree. Every other skill is
standalone — invoke at any point.

## The plugins

Each plugin versions and installs independently. See each plugin's own README
for its full skill reference.

- **[pmos-toolkit](plugins/pmos-toolkit/README.md)** — the feature-delivery
  pipeline plus authoring and release skills.
- **[pmos-learnkit](plugins/pmos-learnkit/README.md)** — verified-source,
  audience-shaped learning artifacts (primers, reading lists, framework
  library, feed digest, case-study playbooks).
- **[pmos-utilities](plugins/pmos-utilities/README.md)** — standalone
  diagnostics and meta-tooling (`/mac-health`, `/reflect`, `/converter`,
  `/to-notion-doc`).
- **[pmos-managerkit](plugins/pmos-managerkit/README.md)** — manager-facing
  skills for hiring, team, and reviews, starting with `/interview-feedback`.
- **[pmos-gamekit](plugins/pmos-gamekit/README.md)** — pre-bundled,
  offline single-player browser games launched from a skill.

## Install

```bash
# Claude Code — add the marketplace, then install the plugins you want
/plugin marketplace add maneesh-dhabria/pmos-skills
/plugin install pmos-toolkit@pmos-skills
/plugin install pmos-learnkit@pmos-skills
/plugin install pmos-utilities@pmos-skills
/plugin install pmos-managerkit@pmos-skills
/plugin install pmos-gamekit@pmos-skills
```

Smoke test: run `/pmos-toolkit:mytasks` or `/pmos-toolkit:backlog` — both work
on a fresh install with no prior artifacts.

> **Migration note (2026-05):** this marketplace was previously distributed as
> the single-plugin `pmos-toolkit` repo. It is now the `pmos-skills`
> multi-plugin marketplace. Cached `v2.49.0` installs of the old repo continue
> read-only; new installs flow through `pmos-skills`.

### Codex

For each plugin you want, clone the repo once and symlink that plugin's skills
into Codex's discovery path:

```bash
git clone https://github.com/maneesh-dhabria/pmos-skills.git ~/.codex/pmos-skills
mkdir -p ~/.agents/skills
# repeat the symlink per plugin you want (pmos-toolkit shown):
ln -s ~/.codex/pmos-skills/plugins/pmos-toolkit/skills ~/.agents/skills/pmos-toolkit
```

Then restart Codex.

## Develop locally

```bash
git clone https://github.com/maneesh-dhabria/pmos-skills.git
claude --plugin-dir /path/to/pmos-skills
```

Changes take effect after restarting the session or running `/reload-plugins`.
Plugin caching is keyed by `version` in `plugin.json` — bump the version on any
skill content change. Each plugin carries the version in **both**
`.claude-plugin/plugin.json` and `.codex-plugin/plugin.json`, and the two must
match.

Skills live under `plugins/<plugin>/skills/<skill-name>/SKILL.md` — that path
is the only one each plugin's loader reads. To add or revise a skill, use
`/skill-sdlc <description>` (or `/skill-sdlc --from-feedback <text|path>` to
apply retro feedback).

## Update

Claude Code updates automatically via the marketplace. For Codex:

```bash
cd ~/.codex/pmos-skills && git pull
```

## Requirements

- Claude Code or Codex CLI

## Contributing

This is a solo-maintained project. To keep the surface area honest:

- **Feedback is welcome** — open a GitHub issue, or run `/pmos-utilities:reflect`
  at the end of a session and paste the output. `/reflect` produces
  severity-tagged, per-skill feedback that's the easiest signal to act on.
- **Bug reports are welcome** — issues with a reproducer get priority.
- **Unsolicited PRs are not accepted.** To propose a skill change, run
  `/pmos-toolkit:skill-sdlc --from-feedback <description>` on your end, share
  the proposed diff in an issue, and we'll discuss before any code lands.
- **Forks are fine.** MIT means you can take the toolkit in any direction you
  want under your own name.

## License

[MIT](LICENSE) — use it however you want, please keep the copyright notice.
