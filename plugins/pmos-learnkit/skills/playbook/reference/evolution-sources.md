# Evolution sources — what to mine and how (reference)

How `/playbook` builds the **evolution story** of a repo (or a single skill inside it). Loaded on
demand by the Mining and Synthesize phases. The job is to reconstruct, in order, how the thing
came to be what it is today — the milestones it passed through and the decisions that bent its
arc — and to ground every milestone in the author's own words.

## Two co-equal sources

An evolution has two kinds of evidence, and a good article needs both:

1. **What was decided** — the durable record. The repo's *committed* history: the changelog,
   the per-feature design/spec docs under `docs/pmos/features/*`, and the git merge log. This is
   the **spine**: the ordered list of milestones, each with a date and a one-line "what shipped".
   It is authoritative for *sequence and outcome* but says little about *why it felt hard* or
   *what the author actually typed*.

2. **The raw author inputs** — the verbatim record. The author's own Claude Code **session
   logs** for this repo (resolved multi-signal — `reference/resolver.md` — so worktree and
   merged-and-deleted work is found, not just the main checkout). This is authoritative for
   *the opening prompt of each push*, the *pushbacks and course-corrections*, and *which pmos
   skills were used at each step*. It is the only place the author's actual voice survives.

Neither source alone tells the story. The spine without the sessions is a dry release log; the
sessions without the spine are an undated pile of chats. **Mine both, then map sessions onto the
spine** (§Mapping).

## The four spine inputs (what was decided)

Read these from the resolved `--repo` (cheap, deterministic — no LLM reading of session bodies):

| Input | Where | Gives |
|---|---|---|
| **Changelog** | `CHANGELOG.md` / `docs/**/CHANGELOG*` / per-plugin changelog | dated, human-written milestone titles |
| **Feature docs** | `docs/pmos/features/<date>_<slug>/` (design/spec/plan) | the decision record for each milestone |
| **Git merge log** | `git -C <repo> log --merges --pretty` | merge dates + branch slugs (fallback ordering when no changelog entry) |
| **Tags / releases** | `git -C <repo> tag` + dates | version cut points (group milestones into eras) |

The spine is the **union** of these, de-duplicated and sorted by date ascending. A milestone is
one inflection in the repo's history — usually one merged feature / one release line — not one
commit.

## The verbatim input (raw author inputs)

From the resolved interactive sessions, extract per the cheap-field contract in
`reference/session-log-format.md`:

- the **verbatim opening prompt** of each thread (the first genuine human message — not a
  compaction summary, not a `<command-name>` wrapper);
- **pushbacks / course-corrections** (free-prose redirects + `AskUserQuestion` answers) — the
  moments the author changed direction;
- the **pmos skills used**, in order (`<command-name>` tags), so the article can name where the
  pipeline mattered.

The LLM never reads raw session bodies at scout time — the scout emits only these cheap fields.
Deep-read happens only for the sessions mapped onto a milestone the article actually covers.

## Mapping sessions onto the spine

For each milestone on the spine, find the session(s) that produced it:

1. **By branch** — a milestone merged from `feat/<slug>` matches sessions whose `gitBranch` is
   that branch (the resolver already surfaces merged-and-deleted branches).
2. **By date proximity** — sessions whose mtime falls in the window between the previous
   milestone and this one, on `HEAD`/main, are candidates.
3. **By topic** — the milestone slug vs. the session's `aiTitle` + opening prompt.

A milestone with no attributable session still appears on the spine (dated, from the committed
record) — its section just leans on the design doc rather than a verbatim quote, and says so.
A session that maps to no milestone is exploration that did not ship; mention it only if it
explains a decision (e.g. an abandoned approach the author rejected).

## Mine everything — no window

Evolution is the *whole* arc, so there is **no time window and no session cap**. Scout reads every
attributed interactive session and every committed milestone from the repo's first commit to
today. (This is the deliberate difference from the retired per-problem mode, which sampled a
recent window. There is no `--days` / `--since` / `--sessions` knob any more.)

## Skill-scoped evolution

When `--skill <name>` is given (or chosen at the resolve-target prompt), narrow **both** sources
to that skill:

- **Spine** — keep only milestones whose feature doc / changelog entry / merged branch touches
  the skill's directory (`plugins/*/skills/<name>/` or the skill's known path). Use the design
  docs' file lists and `git log -- <skill-path>` to decide.
- **Sessions** — keep only sessions that used the skill, edited its files, or were branched for
  it. The opening prompt and decisions are filtered to that skill's arc.

The output is then "how `/<name>` evolved", a focused single-skill story, rather than the whole
repo's. Everything else (mining both sources, mapping, the schema) is identical.
