# Stack Libraries

Per-stack reference material consumed by `/plan` v2 to produce stack-aware tasks (lint commands, test commands, API smoke patterns, fixture conventions). Pipeline skills read these files at run-time; they are reference material, not executable code.

## Purpose

Centralize the conventions a planner needs to write a verifiable task in any given stack. Without this directory, every plan would re-invent the lint/test/smoke commands. With it, `/plan` v2 can detect a stack signal in the host repo (`package.json`, `pyproject.toml`, `go.mod`, etc.) and inline the stack-specific commands directly into per-task verification steps.

## Required Sections per Stack File

Every `<stack>.md` MUST contain the following H2 sections (lint enforced by `tools/lint-stack-libraries.sh`):

- `## Prereq Commands` — version probes and dependency-install commands the planner emits in T0.
- `## Lint/Test Commands` — canonical lint, format-check, and test invocations for the stack.
- `## API Smoke Patterns` — HTTP/gRPC/CLI smoke recipes a per-task verification step can adopt.
- `## Common Fixture Patterns` — testing-fixture idioms (fixture libraries, directory conventions, `tmp_path` analogues).

JS-family stack files (npm, pnpm, yarn-classic, yarn-berry, bun) MUST additionally contain a `## Common Preamble` section whose content is byte-equivalent across all 5 files (see policy below).

## JS-Stack Common Preamble

The 5 JS-stack files (`npm.md`, `pnpm.md`, `yarn-classic.md`, `yarn-berry.md`, `bun.md`) share an identical `## Common Preamble` region. The lint script `tools/lint-js-stack-preambles.sh` diffs the 5 preambles and fails on any drift. When the preamble needs updating, the maintainer MUST edit all 5 files in the same commit; partial edits are caught by CI.

The preamble describes detection signals shared by all JS package managers (node version probing, TS-vs-JS detection, `--frozen-lockfile`-equivalent install discipline). Per-manager differences live in the other sections, not in the preamble.

## Maintenance Policy

(Resolves Open Question #3 from `02_spec.md` §11.)

- The toolkit maintainer owns major-version bumps to stack-conventions (e.g., dropping a deprecated stack file, switching the canonical lint).
- Community PRs are welcome for incremental updates: new stack additions, refreshed commands when an ecosystem deprecates a flag, additional fixture patterns. Approval criteria: the change matches the four-section schema, all lints stay green, and at least one consumer skill (`/plan` v2) is shown to render the new content correctly.
- Preamble changes (JS family) MUST touch all 5 files in the same commit. CI lint enforces.
- Adding a new stack (e.g., `swift.md`, `dotnet.md`): update `tools/lint-stack-libraries.sh` STACKS list in the same PR.

## Index

| Stack | File | Notes |
|-------|------|-------|
| npm | `npm.md` | JS family — shares Common Preamble |
| pnpm | `pnpm.md` | JS family — shares Common Preamble |
| yarn-classic | `yarn-classic.md` | JS family — shares Common Preamble |
| yarn-berry | `yarn-berry.md` | JS family — shares Common Preamble; zero-installs caveat |
| bun | `bun.md` | JS family — shares Common Preamble |
| python | `python.md` | pytest / poetry / uv / pip variants |
| rails | `rails.md` | RSpec / minitest variants |
| go | `go.md` | `go test`, `gofmt -l`, `go vet` |
| static | `static.md` | Jekyll / Astro / 11ty / Hugo / plain HTML |
