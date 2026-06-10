# Slug derivation rules (`/feature-sdlc`)

Used in Phase 0.a to turn the initial-context input into a kebab-case identifier that becomes both the feature slug and the branch name (`feat/<slug>`). The slug ends up in directory names (`<feature_folder>`), branch names, and `state.yaml`, so it must be stable across the lifetime of a feature.

The skill proposes a slug; the user confirms or edits via `AskUserQuestion`. Heuristics here only bias the proposal — the user always sees and can override.

---

## Rules

A valid slug satisfies all of:

- **Charset:** ASCII lowercase letters, digits, hyphens. No underscores, no dots, no spaces.
- **Length:** 3–40 characters total.
- **Boundaries:** must start with a letter (no leading digit, no leading hyphen). Must not end with a hyphen.
- **No `--` runs:** collapse any double-hyphen back to a single one.
- **No reserved prefixes:** must not start with `feat/`, `fix/`, `chore/` (those go in the branch name, not the slug).
- **Stopword stripping (length-pressed only):** when the proposed slug exceeds 40 chars, drop common stopwords (`a`, `an`, `the`, `of`, `for`, `to`, `with`, `and`, `or`, `but`, `in`, `on`, `at`, `from`) starting from the end until the slug fits.

If the user-supplied or LLM-derived slug fails any rule, regenerate (length-pressed) or surface to the user with the violation.

---

## Branch collision

The branch is `feat/<slug>`. Before creating it, check for collisions:

```bash
git branch --list "feat/<slug>" "feat/<slug>-*"
```

- **No matches:** create `feat/<slug>` and proceed.
- **Match on `feat/<slug>` exactly:** trigger the branch-collision prompt — `Use existing branch (Recommended)` / `Pick new slug` / `Abort`. "Use existing" enters resume mode if the worktree's `state.yaml` is present; otherwise initializes state.yaml fresh on top of the existing branch with a warning logged.
- **Match on numbered variants only:** propose `feat/<slug>-2` (or next free integer); show the user via `AskUserQuestion` to confirm.

---

## Worked examples

| Initial context | Proposed slug | Notes |
|-----------------|---------------|-------|
| "Add OAuth refresh tokens for the dashboard" | `oauth-refresh-tokens` | Stopwords (`add`, `for`, `the`) dropped; "dashboard" dropped because the feature is auth-centric, not dashboard-centric. |
| "Build a `/feature-sdlc` skill that runs the whole pipeline" | `feature-sdlc-skill` | Strip slash, kebab-case, append `-skill` (the noun the user is creating). |
| "Fix bug where users can't reset password" | `fix-password-reset` | Anti-pattern guarded: the slug embeds "fix-" because the user said "fix bug"; if branching policy uses `fix/` prefix, the prefix would be added at branch-creation time as `fix/fix-password-reset` → in that case prefer slug `password-reset` and let the prefix carry the verb. Surface this to the user. |
| "Add /feature-sdlc skill to trigger the entire sdlc pipeline" | `feature-sdlc-skill` | Same as the second example (this is the slug for the very feature this skill is being built under). |

---

## Anti-patterns

- **Don't auto-accept** the LLM proposal without showing the user. The branch name lives forever; one second of confirmation is cheap insurance.
- **Don't include a date or timestamp** in the slug — the feature folder gets a date prefix automatically (`<YYYY-MM-DD>_<slug>/`); duplicating it is noise.
- **Don't pluralize when the feature targets a single thing** — `add-feature-flag` not `add-feature-flags` unless the feature genuinely adds multiple flags.
- **Don't auto-delete** an existing `feat/<slug>` branch on collision. Investigate (it may be a previous in-flight `/feature-sdlc` run) — surface the G7 (d) prompt instead.
