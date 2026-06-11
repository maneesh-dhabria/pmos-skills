# Gap-Map Rationale — per-rule `delegate_to:` assignment

The `delegate_to:` field on every rule names the evaluator that produces findings for that rule. v2 ships 24 rules: 11 L1 (universal, all `grep` — U001–U010 plus U011's AST-aware grep special case), 4 L2 TypeScript (all `dependency-cruiser`), 8 L2 Python (PY001–PY008, all `ruff`), and 1 L2 Python cycle rule (PY009, `cycle-py`). That yields `delegated_pct = 13/24 = 0.542` — below the 70% G2 stretch goal, which is documented as a stretch in spec §7.4 (not a release blocker).

The ratio is a documentation-time observation, not a gate — nothing computes or enforces it at runtime (the report-only `check-gap-map.sh` was retired in the 2026-06-10 design-review cleanup).

This file justifies each rule's evaluator choice. The decision tree is roughly:

1. Is there a battle-tested linter that already implements this check? → delegate to it.
2. If not, does the check reduce to a regex over file content (with optional path/blame filters)? → `grep`.
3. Otherwise → would need a custom evaluator (out of scope for v1).

---

## L1 universal rules (U001–U010) — all `delegate_to: grep`

**U001 — file LOC > 500.** Why grep, not dep-cruiser: dependency-cruiser models the *graph* of modules; it does not measure file line counts. ESLint has `max-lines` but is TS-only. A 2-line `wc -l` is universal and stack-agnostic.

**U002 — function LOC > 100.** Why grep: same reason as U001 — measuring function line spans is a textual property; the harness walks function/method openers and counts to the matching close brace / dedent. Cross-language (TS, Python, Vue) without per-stack tooling.

**U003 — positional args > 4.** Why grep: counting commas inside a function signature, excluding kwargs / typed-options-objects. Universal across TS/Python.

**U004 — debug logs in `src/`.** Why grep: it's a literal regex (`console.log` / `print(`) with a path filter. ESLint has `no-console`; flake8 has `T201`; but those are stack-bound. A single grep covers both.

**U005 — stale TODOs.** Why grep + `git blame`: regex finds the marker; `git blame --line-porcelain` provides the age filter (`blame_older_than_days:90`). No linter does the cross-cut.

**U006 — path depth > 4.** Why grep: counts `/` segments after `src/`. Purely a path operation; no tool involved.

**U007 — missing top-of-file purpose comment.** Why grep: reads the first non-empty line of every source file; checks if it is a comment. Cross-language convention enforcement.

**U008 — commented-out code blocks > 5 lines.** Why grep: regex over consecutive comment lines, heuristically classifying as "code" (presence of `=`, `(`, `{`) vs "prose". ESLint plugins exist but are noisy and TS-only.

**U009 — hardcoded credentials.** Why grep: pattern-match well-known secret prefixes (`AKIA…`, `-----BEGIN …PRIVATE KEY-----`, `api_key = "…"`). Specialised tools (truffleHog, gitleaks) exist; for v1, a high-precision regex set covers the 80% case without an extra dependency. Future versions can delegate to gitleaks if installed (FR-32 graceful-degrade pattern).

**U010 — NotImplementedError / TBD on main path.** Why grep: regex over source files excluding `tests/`. Linter rules don't cover this idiom across languages.

---

## L2 TypeScript rules (TS001–TS004) — all `delegate_to: dependency-cruiser`

**TS001 — no circular imports.** Why dep-cruiser: cycle detection requires building the full import graph. Dep-cruiser computes the graph once and reports SCCs (strongly-connected components) > 1. A regex can't see indirect cycles.

**TS002 — layer boundary `src/ui/` ↛ `src/db/`.** Why dep-cruiser: the `forbidden` rule type in `.depcruise.cjs` expresses arbitrary forbidden edges between path globs. Drop-in for hexagonal-architecture enforcement.

**TS003 — no orphan modules.** Why dep-cruiser: an orphan is a module imported by nothing. Computed from the import graph; no other tool offers it built-in.

**TS004 — no imports of devDependencies from production code.** Why dep-cruiser: native `not-to-dev-dep` rule type. Reads `package.json` `dependencies` vs `devDependencies` and validates every edge.

(Vue SFC limitation: dep-cruiser does not parse `<script setup>` blocks in `.vue` files. Coverage gap surfaces via `coverage_gaps[].vue_sfc_unanalyzed` per FR-50/51/52 — the user sees the gap; we do not silently misreport.)

---

## L2 Python rules (PY001–PY004) — all `delegate_to: ruff`

**PY001 — unused imports.** Why ruff: native rule `F401` (Pyflakes). Fast, accurate, the de-facto standard. No grep heuristic competes.

**PY002 — wildcard imports.** Why ruff: native rule `F403`. Wildcard imports break static analysis and pollute namespaces; ruff handles the AST walk.

**PY003 — mutable default arguments.** Why ruff: native rule `B006` (flake8-bugbear). Classic Python footgun; an AST-aware check is needed (a regex can't tell `def f(x=[]):` from `def f(x=DEFAULT_LIST):`).

**PY004 — exec/eval (BLOCK).** Why ruff: native rule `S102` / `S307` (bandit-derived). Security-relevant; AST-aware to avoid false-positives inside string literals.

**PY005–PY008 — ruff extensions.** Same `delegate_to: ruff` rationale as PY001–PY004. These four cover McCabe complexity, branch count, magic-value comparisons, and unused function arguments — all native ruff selectors (`C901`, `PLR0912`, `PLR2004`, `ARG001`). The delegate choice is mechanical: no new tool prerequisite, ruff is already on the prereq list, and the checks are AST-aware where a regex would be brittle (e.g., distinguishing a magic numeric literal in a comparison from the same number inside a string or default argument).

---

## L2 Python rule PY009 — `delegate_to: cycle-py`

**PY009 — no circular imports.** Why cycle-py, not regex or ruff: cycle detection requires building the full import graph and finding strongly-connected components > 1; a regex cannot see indirect cycles (A → B → C → A), and ruff has no equivalent of dependency-cruiser's graph analysis. Pylint ships `cyclic-import` but pulling pylint in would add a second Python linter prerequisite alongside ruff for one check. Instead, `scripts/cycle-py.py` is a small repo-local tool (~50 LOC, a Tarjan SCC walker over `ast.parse` import edges) — same shape as the existing `dependency-cruiser` integration for TS001, but kept inside the skill so no extra prereq is imposed on Python repos. (See PD2 in the plan for the decision rationale.)

---

## L1 rule U011 — `delegate_to: grep` (special-cased AST in harness)

**U011 — duplicate cross-file signature.** Why grep, with an AST-aware special case: the check is grep-like in scope — find function signatures that appear in ≥2 files — but raw text matching fails the moment formatting varies (whitespace, default-value expressions, decorator order, type-annotation aliases). The harness handles this inline in `run-audit.sh` as a Python heredoc that parses each source file, canonicalises every function signature (strip whitespace, sort decorators, normalise default-value forms), and hashes the canonical form. Files contributing the same hash from ≥2 paths produce a finding. This follows the same shape as the existing inline checks for `file_loc_gt` and `function_loc_gt` — kept inside the audit script rather than promoted to a standalone tool because the check has no other consumer and the inline cost is low. (See PD3 in the plan for the inline-vs-standalone decision.)

---

## Delegation ratio — why 0.542 is fine for v1

L1 rules are universal; they cannot delegate to a stack-bound linter without losing the universality. The ratio is mechanically capped by the L1 set size — even with U011 added, L1 stays on grep-family evaluators by construction. As more L2 stacks land (Rust → clippy, Go → staticcheck, Ruby → rubocop, …) the ratio rises automatically. The 70% G2 goal is a long-run target measured across the full L1 + L2 set, not a v1 gate.
