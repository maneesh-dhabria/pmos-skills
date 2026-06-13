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

## PMOS LearnKit

A companion plugin for ramp-up. Skills namespaced `/pmos-learnkit:<name>`.

| Skill | What it does |
|---|---|
| `/primer <topic>` | Produces a verified-source, audience-shaped HTML primer on any topic — researched, outlined, drafted with inline SVG diagrams where a visual aids comprehension, and self-evaluated into a single teachable artifact. Use before a meeting, a scope, or a doc review when you need citations you can trust. |
| `/critical-thinking [quick\|standard\|deep\|marathon]` | Runs a low-friction, time-boxed critical-thinking practice session for PMs — a varied mix of reasoning exercises (pick-and-defend, assumption-hunt, spot-the-bias, calibration, second-order mapping, reframing, metric-choice) generated fresh at runtime, graded on reasoning moves rather than the answer, with an accumulating per-muscle + calibration scorecard. Standalone; optionally pulls scenarios from the current repo (`--no-repo` to disable). |
| `/learn-list <topic> [--depth brief\|standard\|deep] [--audience senior-pms\|all-pms]` | Turns any topic into a verified, anti-slop, multi-format curated reading list for product managers — organized by a canon-derived topic outline, every link fetched and verified before it ships, each ranked and annotated with a ≤2-sentence why, audience-shaped, closing with a follow-list of people, newsletters, books (with summaries) and practitioners' signature writings plus a copy-ready paste-block. Verification-first; shares the topic-research front half with `/primer`; effort scales by `--depth`. |
| `/frameworks [\"\<problem>\" \| browse \| list \| situations \| sync] [--json] [--floor N]` | Your searchable offline library of ~270 PM frameworks — describe a problem and get the 2–5 most relevant (RICE, JTBD, Kano, regret-minimization, …), each with a one-line "why it fits", a PM's-take commentary, and owned SVG diagram(s) placed inline at the point in the body they illustrate. `browse` opens a self-contained `file://` library with three listing views (compact / detailed cards / list), group-by area or tag, tag filtering, and a sidebar reader that shifts the layout (not an overlay) — plus per-framework share + copy-markdown. Frameworks carry problem-tags, a cognitive-job decision-type, and when-to-use / when-not-to-use guidance so matching is precise; a `--json` mode lets other skills ask "which framework for this?" programmatically. Ships a pre-built corpus sourced from a Notion framework database; re-ingest with `sync`. |
| `/magazine [add \<url\> \| add --from \<file\> \| remove \<name\> \| list] [--days N] [--feed \<name\>]` | Turns your scattered public RSS subscriptions (newsletters + podcasts) into one filterable, self-contained HTML digest of what's new since last time. A resumable local pipeline crawls each article, transcribes podcasts (whisper-if-installed), summarizes every item into 3–5 trustworthy bullets with a read/listen link, auto-tags from a closed registry, and ranks a Top-picks lane — saved as a durable issue plus a searchable cross-issue library, all offline from `file://`. Assisted import from CSV/OPML/screenshot. v1 public feeds only. |
| `/playbook [--repo \<path>] [--days N \| --sessions N \| --since \<date>] [--include-headless] [--format \<html\|md\|both>]` | Turns your own Claude Code session history for one repo into focused, self-sufficient case-study articles that teach fellow PMs how you used AI to solve a real problem — mining your starting prompts, how you refined the idea, the trade-offs you decided, and the skills you used, then emitting a shareable HTML article + tweet thread per problem with a safety-review checklist. Repo-scoped; finds work scattered across worktrees (even merged-and-deleted ones); filters out headless/subprocess noise. Never posts anything — you are the share gate. |
| `/book-summary \<book title> [--depth \<brief\|standard\|deep>] [--audience \<senior-pms\|all-pms>]` | Curates publicly available material about a named book — author interviews, podcasts, talks, reputable reviews, corroborating social posts — and distils it into verified, theme-grouped, PM-framed takeaways in a single self-contained HTML artifact. Use when a PM wants the durable ideas of a book translated into product practice without reading it cover-to-cover. Every emitted source is fetched and identity-matched this run; nothing ships from memory. Shapes depth and vocabulary to the audience; curates *public material about a book* — it does not summarize a user PDF, reproduce the text, or transcribe audio. |

## PMOS Utilities

Standalone environment diagnostics — neither a feature-delivery step nor a learning artifact. Skills namespaced `/pmos-utilities:<name>`.

| Skill | What it does |
|---|---|
| `/mac-health [--non-interactive \| --interactive]` | Diagnoses a hot, slow, battery-hungry, or memory-pressured Mac before recommending cleanup — orphaned (`ppid 1`) processes, browser-extension/helper leaks, stale dev services, and sleep-assertion blockers — with a read-first, diagnose-then-confirm posture (never kills a process or stops a service without explicit confirmation) and a before/after impact summary. |

## What do you want to do?

| I want to… | Use | Notes |
|---|---|---|
| Take an idea all the way to shipped code | `/feature-sdlc <idea>` | Drives the full pipeline: requirements → grill → spec → plan → execute → verify → ship |
| Pressure-test a half-formed idea before writing it up | `/ideate` | Frame → expand → premortem + inversion; outputs a one-page brief |
| Shape just requirements (no code yet) | `/requirements` | Stress-test with `/grill` or `/msf-req` after |
| Mock up the UI before specifying it | `/wireframes` → `/prototype` | Static HTML wireframes, then a clickable React prototype |
| Run the discovery half of the pipeline only (no /plan or /execute) | `/prototype-sdlc <seed>` | requirements → grill → spec → wireframes → prototype, then stop. Branch left intact for the user to extend (`--resume`) or discard. Thin alias of `/feature-sdlc prototype …` |
| Critique an existing UI, wireframes, or prototype | `/design-crit` | Nielsen + WCAG 2.2 + Gestalt + PSYCH/MSF rubric |
| Write a technical design doc | `/spec`, or `/artifact` for a standalone EDD/PRD | `/simulate-spec` to pressure-test |
| Break a spec into TDD tasks | `/plan` | Then `/execute` to implement |
| Implement an existing plan | `/execute` | `--subagent-driven` for parallel waves with per-task review |
| Verify and ship work | `/verify` → `/complete-dev` | Lint, test, multi-agent review, then merge + version + push |
| Generate a changelog entry after merging | `/changelog` | Invoked by `/complete-dev`; user-facing entries describing what the system can now do |
| Author a new skill (or revise one from feedback) | `/skill-sdlc` | Same pipeline, scored against a binary eval rubric before merge |
| Draft a PRD / EDD / Discovery Doc | `/artifact` | Section-level eval + writing-style presets |
| Tighten any prose | `/polish` | 14-check rubric; voice-preserving; optional editorial reduction pass |
| Summarize any source into a faithful TL;DR | `/summary-tldr` | Any input (text / PDF / image / URL / email / tweet / podcast / video) → grounded, compression-confirmed summary; hybrid extract-then-generate, first-time-reader review pass, meta-description is a hard fail; saves a self-contained HTML artifact |
| Audit, scaffold, or update a README | `/readme` | Rubric + 3-persona simulated reader |
| Annotate any pmos-emitted HTML artifact in the browser | `/comments` | Highlight → comment → resolve via `/comments resolve <artifact>`; sidecar `<artifact>.comments.json` pairs to the HTML |
| Design and field a survey | `/survey-design` | Then `/survey-analyse` on the responses |
| Generate a vector diagram | `/diagram` | Brainstorms framings, self-evaluates against a hybrid rubric |
| Generate on-brand SVG logo candidates from a brief | `/logos` | Decomposes a brief (text / URL / assets) into N logo needs → 2–3 self-contained `.svg` variants per need → hybrid eval (deterministic metrics + renderer-backed vision) → `logos.html` showcase; `$0` in-session, sibling of `/diagram` (same renderer hard-gate) |
| Audit a codebase against architectural principles | `/architecture` | L1 universal + L2 stack + L3 per-repo; promotes findings to ADRs; `--from-spec` mode audits spec architectural assertions against code (folded into `/spec` Phase 6.6 + `/verify` Phase 4.7) |
| Track personal tasks (LNO, due dates, people) | `/mytasks` | Lives at `~/.pmos/tasks/` |
| Maintain a shared person / contact directory | `/people` | Handle, name, role, working relationship; consumed by `/mytasks` |
| Track a lightweight repo backlog | `/backlog` | Hybrid quick-capture + a three-queue tracker (`groom` / `next` / `releases`) over epics and stories |
| Run the three-loop backlog (define → build → release) | `/feature-sdlc define <epic>` → `/feature-sdlc build --next` → `/complete-dev --epic <id>` | Loop 1 shapes an epic into ready stories; Loop 2 builds one story per (optionally unattended) iteration — `/backlog next` picks, an O_EXCL lock claims; Loop 3 merges the epic's story branches as one release train |
| Persist context across sessions and repos | `/product-context` | Workstream / product / feature scope |
| Capture session learnings | `/session-log` | Decisions, gotchas, patterns |
| Send feedback to skill authors | `/reflect` | Severity-tagged, per-skill, from the session transcript |
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
  /ripple-effects — simulate 1st/2nd/3rd-order effects, then refine
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

- **Feedback is welcome** — open a GitHub issue, or run `/pmos-utilities:reflect`
  at the end of a session and paste the output. `/reflect` produces
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
