# pnpm Stack

JavaScript / TypeScript projects using pnpm as the package manager. Detection signal: `package.json` + `pnpm-lock.yaml`.

## Prereq Commands

```bash
node --version
pnpm --version
pnpm install --frozen-lockfile
```

If `engines.node` or `.nvmrc` / `.node-version` is present, the planner asserts the running Node major matches it. `packageManager` field in `package.json` (e.g., `"packageManager": "pnpm@9.0.0"`) is authoritative for pnpm version when present.

## Lint/Test Commands

```bash
pnpm run lint
pnpm run format -- --check    # if formatter is wired
pnpm test                      # script per package.json#scripts.test
pnpm exec tsc --noEmit         # TypeScript projects only
```

In monorepo workspaces use `pnpm -r run lint` / `pnpm -r test` for recursive execution across packages.

## API Smoke Patterns

HTTP smoke:

```bash
curl -fsS http://localhost:3000/api/health | jq .
node -e 'fetch("http://localhost:3000/api/health").then(r=>r.json()).then(console.log)'
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

- Jest / Vitest fixtures co-located alongside the SUT or under `__fixtures__/`.
- Workspace-aware fixtures live under each package's own `tests/` to keep the reach scoped.
- Snapshot fixtures stored under `tests/fixtures/` (per-package or repo-root for cross-package).

## Common Preamble

This stack file inherits a shared preamble across the JS family (npm, pnpm, yarn-classic, yarn-berry, bun). Node version detection follows the precedence `.nvmrc` → `.node-version` → `engines.node` in `package.json`. TypeScript is detected by the presence of `tsconfig.json` at repo root; in TS projects, `tsc --noEmit` is part of the lint gate. Install commands run with a `--frozen-lockfile`-equivalent flag in CI contexts so a stale lockfile fails fast rather than silently mutating dependencies. The lint script `tools/lint-js-stack-preambles.sh` enforces byte-equivalence of this section across all five JS-family files.
