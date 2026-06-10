# Commit message style reference

Used by `/complete-dev` Phase 11. Always run `git log --oneline -3` first to match the repo's actual style — this file is the fallback when the log is sparse or inconsistent.

## Detection priority

1. **Read last 3 commits.** Match prefix style (`feat(scope):`, `fix:`, etc.), tense, and trailer conventions.
2. If sparse / inconsistent / first-commit-on-branch, use the templates below.

## Conventional Commits (default)

```
<type>(<scope>): <summary in present tense, lowercase, no trailing period>

<optional body — what and why, not how>

<co-author trailer — see "Trailer" below>
```

### Type cheat-sheet

| Type | When |
|------|------|
| `feat` | New user-facing feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `chore` | Tooling, deps, version bumps |
| `refactor` | Code restructure, no behavior change |
| `test` | Tests only |
| `perf` | Performance improvement |
| `build` | Build system / CI changes |

## agent-skills repo convention

This repo uses an extended pattern (observable from `git log`):

```
feat(scope): summary — pmos-toolkit X.Y.Z

<body>

<co-author trailer — see "Trailer" below>
```

The `— pmos-toolkit X.Y.Z` suffix is appended on version-bump commits. Skip the suffix if the commit is unrelated to a version change.

## Subject-line rules

- Imperative mood: "add X" not "added X".
- ≤ 72 chars hard cap; ≤ 50 chars preferred.
- No trailing period.
- Lowercase first word after the colon.
- Reference the actual change, not the task ID or PR number (those go in the body if at all).

## Body rules

- Wrap at 72 chars.
- Focus on **why** the change was made, not what (the diff shows what).
- Bullet points are fine for multi-faceted commits.
- No marketing language. No emojis unless the user explicitly requests them.

## Trailer

Always append a `Co-Authored-By:` trailer. Use the model identity your host environment specifies (most platforms mandate the exact line in their git guidance); if the user specifies a different identity in their personal settings, that wins. Never hardcode a model name here — model identities rot:

```
Co-Authored-By: <identity your host environment specifies> <noreply@anthropic.com>
```

## $ARGUMENTS hint handling

If `$ARGUMENTS` contains free-form text (not a `--flag`), treat it as a starting draft for the subject line. Show it to the user in the AskUserQuestion options; let them edit.
