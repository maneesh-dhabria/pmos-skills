# Session-log format (reference)

What `/playbook` reads. Loaded on demand by the Resolve/Scout phases.

## Roots & path encoding

Claude Code writes one directory per working-directory path under:

- `~/.claude/projects/`
- `~/.claude-personal/projects/`

Either may be absent; read both. Each child directory name is the working-directory path
with every `/` replaced by `-` (e.g. `/Users/me/Desktop/Projects/foo` →
`-Users-me-Desktop-Projects-foo`). **Do not decode the directory name** to recover the path —
it is lossy (a real `-` in a path is indistinguishable from a separator). Instead read the
authoritative `cwd` field recorded inside the session records; fall back to name-decode only
when no record carries `cwd`.

Each directory contains one `*.jsonl` file per session. One JSONL line = one record.

## Record types used

| `type` | Meaning | Field(s) used |
|---|---|---|
| `user` | A user (or wrapper) message | `message.content` (string or blocks), `cwd`, `gitBranch`, `userType` |
| `assistant` | An assistant message | `message.content` blocks — including `tool_use` blocks |
| `ai-title` | Cheap session title | `aiTitle` |
| `permission-mode` / `mode` | Interactive-TUI permission/mode state | presence only |

## Fields

- **`cwd`** — the session's working directory (authoritative for repo attribution). Present on most message records.
- **`gitBranch`** — the git branch at record time (`HEAD` when detached/main-checkout). Used for thread grouping and merge-history matching.
- **`userType`** — present on all sessions as `external`. **NOT a discriminator** — do not use it to separate interactive from headless.
- **`aiTitle`** — a short auto-generated title; the cheapest topic signal.

## Interactive vs headless (the discriminator)

A session is **interactive** iff it contains ≥1 record of `type: permission-mode` (or `type: mode`).
These are emitted only by the interactive TUI. Headless/subprocess runs (`claude -p`, the SDK)
do not emit them. Validated: interactive repos carry it ~50/50 sessions; a subprocess-heavy
repo carried it in ~2/200. Corroborating (boundary-rescue only): headless sessions tend to be
very short, open with a templated system-style prompt, and contain no `<command-name>` tag.

## Skill / command extraction

A real slash-command invocation appears in user-message text as a tag:

```
<command-name>/pmos-toolkit:feature-sdlc</command-name>
```

Extract with a regex that requires the **full tag and a leading slash**:
`/<command-name>\s*(\/[A-Za-z0-9:_-]+)\s*<\/command-name>/g`. Do **not** match on the bare
substring `command-name>` — prose that merely discusses the tag (docs, this very file) would
otherwise be captured as a fake skill.

## Decision signals

Load-bearing decisions live in two places (prose-first; structured as anchors):

1. **`AskUserQuestion` tool_use blocks** — in `assistant` records, `message.content[]` blocks
   with `type: "tool_use"`, `name: "AskUserQuestion"`. High-confidence structured anchors.
2. **Free-prose pushbacks** — user messages with redirect language ("instead", "rather",
   "let's …", "actually", "no,", "don't"). These outnumber AskUserQuestion calls in practice.

## Starting prompt

The first **genuine human** message of the earliest session in a thread — i.e. the first
`type: user` record whose text is neither a compaction-injected summary
("continued from a previous conversation…", "Caveat:") nor a `<command-name>` wrapper.
