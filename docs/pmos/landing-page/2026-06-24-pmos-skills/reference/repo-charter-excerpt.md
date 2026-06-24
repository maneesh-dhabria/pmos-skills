# agent-skills — repo invariants

Project-level rules that aren't obvious from the directory structure. Skills and tools loaded from this repo trust these invariants; violating them produces silent failures (skills don't load, releases get stuck).

## Plugin charters

Each plugin answers one question. A new skill belongs to the plugin whose charter it serves — if it fits none, it probably needs a new plugin (see "## New-plugin scaffolding"), not a forced fit.

| Plugin | Charter — "help me…" | Holds |
|---|---|---|
| **pmos-toolkit** | …**ship a feature** | the delivery pipeline (requirements → spec → plan → execute → verify → complete-dev) and its supporting authoring/release skills (artifact, diagram, wireframes, prototype, grill, polish, backlog, mytasks, people, changelog, session-log, feature-sdlc, …). |
| **pmos-learnkit** | …**learn a topic** | verified-source, audience-shaped teachable artifacts (primer, learn-list, magazine) and the shared topic-research substrate. |
| **pmos-utilities** | …**maintain my environment** | standalone diagnostics, cleanup, and meta-tooling that aren't part of a feature pipeline or a learning artifact (mac-health, reflect — a cross-plugin session retrospective). |
| **pmos-gamekit** | …**play a casual game** | pre-bundled single-player browser games, each a self-contained HTML file launched from a skill via a zero-dependency local server (solitaire). |
| **pmos-managerkit** | …**do manager work** | manager-facing skills for hiring, team, and reviews (interview-feedback — a grounded candidate scorecard + per-interviewer coaching notes from interview inputs). |

The charters are the membership test, not just a description. `mac-health` lives in `pmos-utilities` (not `pmos-toolkit`) because diagnosing a hot Mac maintains your environment — it neither ships a feature nor teaches a topic.

## Canonical skill path

Each plugin manifest loads skills from exactly one directory:

```
plugins/<plugin>/skills/<skill-name>/SKILL.md
```

Anywhere else (root `skills/`, a feature folder, `docs/`, a sibling plugin's directory) is invisible to that plugin's loader. A skill saved at the wrong path will not register and will not error — it just silently doesn't exist as a slash command.

When creating, moving, copying, or renaming a skill:
- Target path must be `plugins/<plugin>/skills/<skill-name>/SKILL.md`.
- `<skill-name>` is lowercase-hyphenated (e.g., `create-skill`, `verify`, not `CreateSkill`).
- After any move, run `ls plugins/<plugin>/skills/` to confirm the new directory is present and named correctly.

`/feature-sdlc skill` enforces this — its skill-eval rubric's `a-name-matches-dir` check fails when the frontmatter `name` doesn't match the directory. Manual edits do not get that check — this rule is the backstop.

## Skill-authoring conventions

How to author or revise a skill in any plugin in this repo:

- **Canonical path** — new skills go at `plugins/<plugin>/skills/<skill-name>/SKILL.md` and nowhere else (see "## Canonical skill path" above — each plugin's loader reads only its own directory; a skill anywhere else silently doesn't register). `<skill-name>` is lowercase-hyphenated.
