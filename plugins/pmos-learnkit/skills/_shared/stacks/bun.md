# bun Stack

JavaScript / TypeScript projects using Bun as the runtime and package manager. Detection signal: `package.json` + `bun.lockb` (or `bunfig.toml` present).

## Prereq Commands

```bash
bun --version
bun install --frozen-lockfile
```

Bun is its own runtime (no separate `node --version` probe required), but the planner still records the `engines.node` value for compatibility documentation. If a project mixes Node and Bun (e.g., Bun for tests, Node for build), surface this as a per-task constraint in the plan.

## Lint/Test Commands

```bash
bun run lint
bun run format -- --check
bun test                       # built-in test runner
bun x tsc --noEmit             # TypeScript projects (use `bunx` or `bun x`)
```

Bun's built-in test runner is the default; if a project pins `vitest` / `jest` in `package.json`, prefer the project-defined `bun run test` over `bun test`.

## API Smoke Patterns

HTTP smoke:

```bash
curl -fsS http://localhost:3000/api/health | jq .
bun -e 'console.log(await (await fetch("http://localhost:3000/api/health")).json())'
```

GraphQL smoke:

```bash
curl -fsS -H 'content-type: application/json' \
  -d '{"query":"{ __typename }"}' http://localhost:3000/graphql | jq .
```

gRPC smoke (if `grpcurl` is installed):

```bash
grpcurl -plaintext localhost:50051 list
```

## Common Fixture Patterns

- Bun's built-in test runner uses `*.test.ts` / `*.test.tsx` colocated; assertions via `expect` from `bun:test`.
- For Jest/Vitest compatibility, use `bun run test` and follow that runner's fixture conventions.
- Snapshot fixtures stored under `tests/fixtures/`; Bun's `Bun.file()` API is convenient for fixture loading.

## Common Preamble

This stack file inherits a shared preamble across the JS family (npm, pnpm, yarn-classic, yarn-berry, bun). Node version detection follows the precedence `.nvmrc` → `.node-version` → `engines.node` in `package.json`. TypeScript is detected by the presence of `tsconfig.json` at repo root; in TS projects, `tsc --noEmit` is part of the lint gate. Install commands run with a `--frozen-lockfile`-equivalent flag in CI contexts so a stale lockfile fails fast rather than silently mutating dependencies. The lint script `tools/lint-js-stack-preambles.sh` enforces byte-equivalence of this section across all five JS-family files.
