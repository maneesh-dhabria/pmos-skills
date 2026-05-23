# yarn-berry Stack

JavaScript / TypeScript projects using Yarn 2+ ("Berry") as the package manager. Detection signal: `package.json` + `yarn.lock` + `.yarnrc.yml` (or `yarnPath` set in `.yarnrc.yml`).

## Prereq Commands

```bash
node --version
yarn --version              # expect 2.x or higher
yarn install --immutable
```

Node version detection: `.nvmrc` → `.node-version` → `engines.node`. The `packageManager` field in `package.json` (when present) is authoritative for the Yarn version. Yarn Berry checks in its own runtime under `.yarn/releases/`; the planner does NOT add this to `.gitignore` checks (zero-installs may legitimately commit `.yarn/cache/`).

## Lint/Test Commands

```bash
yarn lint
yarn format --check
yarn test
yarn tsc --noEmit
```

For workspaces use `yarn workspaces foreach -A run lint` / `... run test` to fan out across packages.

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

- Jest / Vitest fixtures co-located or under `__fixtures__/`.
- Plug'n'Play caveat: tests that require Node's `require.resolve` semantics may need `nodeLinker: node-modules` in `.yarnrc.yml`; the planner emits a one-line note when PnP is detected.
- Zero-installs caveat: `.yarn/cache/` may be checked in; tests should not assume an empty cache directory.

## Common Preamble

This stack file inherits a shared preamble across the JS family (npm, pnpm, yarn-classic, yarn-berry, bun). Node version detection follows the precedence `.nvmrc` → `.node-version` → `engines.node` in `package.json`. TypeScript is detected by the presence of `tsconfig.json` at repo root; in TS projects, `tsc --noEmit` is part of the lint gate. Install commands run with a `--frozen-lockfile`-equivalent flag in CI contexts so a stale lockfile fails fast rather than silently mutating dependencies. The lint script `tools/lint-js-stack-preambles.sh` enforces byte-equivalence of this section across all five JS-family files.
