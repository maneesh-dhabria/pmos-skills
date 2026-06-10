# modes.md — mode-resolution table, repo-miner contract, monorepo overlay mechanics

Detail reference for `/readme`'s `SKILL.md`. The skill body states each contract's intent and points here for the exact tables and shapes.

## Mode-resolution table {#mode-resolution-table}

Resolved by `SKILL.md`'s mode-resolution phase (`#mode-resolution`). Exactly one mode — or the `audit+scaffold` composition — is active per invocation.

| Input | README present? | Flags | Resolved mode | Source label |
|---|---|---|---|---|
| `/readme path/to/file.md` | yes | none | `audit` | `default-readme-present` |
| `/readme` (no path, monorepo root) | depends per package | none | per-package composition | `default-readme-absent` (where absent) |
| `/readme` (greenfield repo) | no | none | `scaffold` | `default-readme-absent` |
| `/readme` | yes | `--scaffold` | `audit+scaffold` (composition) | `cli` |
| `/readme` | no | `--audit` | exit 64: `--audit requires a README; pass --scaffold or omit flags` | — |
| `/readme` | any | `--update <range>` | `update` | `cli` |
| `/readme` | any | `--update <range> --audit` (or `--scaffold`) | exit 64: `--update is mutually exclusive with --audit/--scaffold` | — |

## Repo-miner contract {#repo-miner-contract}

Dispatched by the scaffold phase (`#scaffold`, step 1). The subagent reads manifests, code entry points, license files, and contributor history, and MUST return JSON matching:

```json
{
  "name": "<package-name>",
  "entry_point": "<bin path | importable module | null>",
  "license": "<SPDX-id | UNLICENSED | null>",
  "contributors": ["<gh-handle>", ...],
  "repo_type_hint": "library|cli|plugin|app|monorepo-root|monorepo-package|unknown",
  "manifest_source": "<one-of-the-8-supported>",
  "evidence": {
    "name_from": "<file:line>",
    "entry_point_from": "<file:line | null>",
    "license_from": "<file:line | null>"
  }
}
```

**Parent-side validation** (every non-null required field; a miss hard-fails and pauses with the failure dialog):

- Field types match the schema (string/array/object): `repo-miner: field <name> has wrong type (expected <T>, got <U>)`.
- `name` non-empty after `.strip()`.
- `repo_type_hint` ∈ the 7-value enum above: `repo-miner: unknown repo_type_hint '<value>'`.
- `evidence.*_from` paths exist on disk and the named file substring-greps the field value: `repo-miner: evidence missing — <field>='<value>' not found in <file>`.

The validated result seeds the scaffold draft; the `evidence.*_from` paths flow into the README's footnote section so the user can audit where each fact came from. Fields returned `null` (genuinely uninferable) fall through to the capped user-question path in `SKILL.md` — license is always asked, never auto-picked.

## Monorepo overlay mechanics {#monorepo-overlay}

Invoked from `SKILL.md`'s monorepo phase (`#monorepo`).

**Findings roll-up.** Group by severity across the whole workspace (blockers, then friction, then nits); within each severity, a per-package one-liner: `<pkg_path>: N blockers, M friction, K nits` (zero counts omitted from the line; all-zero lines omitted entirely). Drill-down for a package lists every finding with `rule_id`, `path`, `severity`, `auto_fix_path` — the same shape as the single-file audit table.

**Unified diff.** One diff body covers every patched file across every package + root. Per-file header, immediately before the standard `--- a/<path>` / `+++ b/<path>` pair:

```
=== package: <pkg_path> (audit|scaffold) ===
```

`audit` = patch against an existing README; `scaffold` = new-file create against `/dev/null`. Files appear in package-discovery order, root last, so reviewers land on the highest-level file at end-of-scroll.

**Atomic multi-write rollback.** Before any rename, capture each target to a per-file `.bak`. On a mid-batch rename failure, restore every already-renamed file from its `.bak` and report: `monorepo write rolled back: <failed-path> — <N> files reverted, no partial state on disk`. All-or-nothing — workspace consistency wins over partial progress.

**Composition wiring.** The overlay wraps the per-file flows rather than replacing them: audit delegates iteration + roll-up + diff here and consumes the unified diff as its output; scaffold delegates missing-package detection and reuses the same approval gate; update applies the diff-and-stage contract per package so a workspace-scope update lands as one staged batch for /complete-dev. `composition=single` repos never enter the overlay.
