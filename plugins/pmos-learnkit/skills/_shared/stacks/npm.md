# npm Stack

JavaScript / TypeScript projects using npm as the package manager. Detection signal: `package.json` + `package-lock.json` (no `pnpm-lock.yaml` / `yarn.lock` / `bun.lockb`).

## Prereq Commands

T0 prereqs the planner emits before any per-task verification:

```bash
node --version
npm --version
npm ci          # frozen-lockfile install
```

If `engines.node` is set in `package.json`, the planner asserts the running Node major matches it. If `.nvmrc` or `.node-version` exists, prefer those for the version probe.

## Lint/Test Commands

Canonical invocations (project-defined script names — cite the actual script if `package.json#scripts.lint`/`scripts.test` exist):

```bash
npm run lint
npm run format -- --check    # if formatter is wired (prettier --check, biome format --check)
npm test                      # script per package.json#scripts.test
npx tsc --noEmit              # TypeScript projects only (presence of tsconfig.json)
```

## API Smoke Patterns

HTTP smoke (after starting the dev server):

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

- Jest: `__tests__/` directory or `*.test.ts` co-located; fixtures under `__fixtures__/`.
- Vitest: same conventions; `vi.fn()` for mocks; `tmp` via `node:fs.mkdtemp`.
- node:test (built-in): `*.test.mjs`; `assert.strict` from `node:assert`.
- Snapshot fixtures: stored under `tests/fixtures/` at repo root; never under `node_modules/`.

## Common Preamble

This stack file inherits a shared preamble across the JS family (npm, pnpm, yarn-classic, yarn-berry, bun). Node version detection follows the precedence `.nvmrc` → `.node-version` → `engines.node` in `package.json`. TypeScript is detected by the presence of `tsconfig.json` at repo root; in TS projects, `tsc --noEmit` is part of the lint gate. Install commands run with a `--frozen-lockfile`-equivalent flag in CI contexts so a stale lockfile fails fast rather than silently mutating dependencies. The lint script `tools/lint-js-stack-preambles.sh` enforces byte-equivalence of this section across all five JS-family files.
