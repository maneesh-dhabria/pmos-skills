# yarn-classic Stack

JavaScript / TypeScript projects using Yarn 1.x ("classic") as the package manager. Detection signal: `package.json` + `yarn.lock` AND no `.yarnrc.yml` (which would indicate Berry).

## Prereq Commands

```bash
node --version
yarn --version              # expect 1.x
yarn install --frozen-lockfile
```

Node version detection follows the same chain as other JS stacks (`.nvmrc` → `.node-version` → `engines.node`).

## Lint/Test Commands

```bash
yarn lint
yarn format --check         # if formatter is wired
yarn test
yarn tsc --noEmit           # TypeScript projects
```

Scripts in Yarn 1 are invoked via `yarn <script-name>` (no `run` prefix needed when the script is unambiguous).

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

- Jest / Mocha / Vitest fixtures co-located alongside SUT or under `__fixtures__/`.
- Workspace fixtures live per-workspace; root-only fixtures under `tests/fixtures/`.
- Yarn 1 workspaces (`workspaces` array in root `package.json`) — fixtures stay scoped to each workspace's own tests.

## Common Preamble

This stack file inherits a shared preamble across the JS family (npm, pnpm, yarn-classic, yarn-berry, bun). Node version detection follows the precedence `.nvmrc` → `.node-version` → `engines.node` in `package.json`. TypeScript is detected by the presence of `tsconfig.json` at repo root; in TS projects, `tsc --noEmit` is part of the lint gate. Install commands run with a `--frozen-lockfile`-equivalent flag in CI contexts so a stale lockfile fails fast rather than silently mutating dependencies. The lint script `tools/lint-js-stack-preambles.sh` enforces byte-equivalence of this section across all five JS-family files.
