# L1 Universal Rules — Rationales

## Contents

- [U001 — file LOC > 500](#u001--file-loc--500)
- [U002 — function LOC > 100](#u002--function-loc--100)
- [U003 — positional args > 4](#u003--positional-args--4)
- [U004 — debug logs in src/](#u004--debug-logs-in-src)
- [U005 — stale TODOs](#u005--stale-todos)
- [U006 — path depth > 4](#u006--path-depth--4)
- [U007 — missing file-purpose comment](#u007--missing-file-purpose-comment)
- [U008 — commented-out code blocks](#u008--commented-out-code-blocks)
- [U009 — hardcoded credentials (must_fix)](#u009--hardcoded-credentials-must_fix)
- [U010 — NotImplementedError on main path (must_fix)](#u010--notimplementederror-on-main-path-must_fix)
- [U011 — duplicate cross-file signature](#u011--duplicate-cross-file-signature)

The L1 set is plugin-owned (`principles.yaml`), capped at 15 rules (FR-21), and applies to every repo regardless of stack. v1 ships 10 rules. Each section below carries the rule statement, the *why*, the source citation, and an example violation. Rules surface via the `grep`-family evaluators in `tools/run-audit.sh`.

L3 (project-owned, at `<repo>/.pmos/architecture/principles.yaml`) may relax disposition (to `should_fix` or `wont_fix`) or add exemption rows, but may NOT silently drop a universal rule (FR-11).

---

## U001 — file LOC > 500

**Rule:** No file > 500 LOC (excluding generated).
**Check:** `file_loc_gt:500;exclude_generated`
**Disposition:** should_fix · **Delegate:** grep

**Why:** Files past ~500 LOC are hard to load mentally. A reader has to scroll multiple times to see the file's surface area, which slows every code review and every refactor. The cure is usually splitting by responsibility — extract a collaborator class, move helpers to a sibling file.

**Source:** "A Philosophy of Software Design" (Ousterhout, 2018) §4 — small files compose; large files calcify. Mirrored by the SOLID-S principle (single responsibility).

**Example violation:** `src/orchestrator.py` is 812 LOC. Three responsibilities live inside (dispatch, retry, telemetry). Split into `orchestrator.py` (≤200), `retry.py`, `telemetry.py`.

---

## U002 — function LOC > 100

**Rule:** No function > 100 LOC.
**Check:** `function_loc_gt:100`
**Disposition:** should_fix · **Delegate:** grep

**Why:** 100-LOC functions almost always do more than one thing. Reading them requires holding multiple intermediate variables in working memory; testing them requires constructing improbable inputs to reach internal branches. Extract collaborators.

**Source:** "Clean Code" (Martin, 2008) §3 — functions should fit on a screen. Refactoring catalog: "Extract Function" (Fowler, 1999).

**Example violation:** `handle_webhook()` is 142 LOC; it parses, validates, dispatches, retries, and logs. Extract `parse_webhook`, `dispatch_event`, `retry_with_backoff` — `handle_webhook` shrinks to ~30 LOC.

---

## U003 — positional args > 4

**Rule:** No constructor / function with > 4 positional args.
**Check:** `positional_args_gt:4`
**Disposition:** should_fix · **Delegate:** grep

**Why:** Long positional lists are call-site bugs waiting to happen — swap two same-typed parameters and the type-checker says nothing. Use a named-options object / dataclass / typed dict so call sites read like prose.

**Source:** "Clean Code" §3 — "the ideal number of arguments is zero; three is the maximum"; mirrored by Python PEP 8 and the "introduce parameter object" refactoring (Fowler).

**Example violation:** `def create_user(first, last, email, phone, dob, role): ...` — 6 positionals. Refactor to `def create_user(profile: UserProfile, role: Role): ...`.

---

## U004 — debug logs in src/

**Rule:** No `console.log` / `print()` in `src/` (allowed in `scripts/`, `tests/`).
**Check:** `regex:console\.log|print\(;paths:src/;exclude:tests/,scripts/`
**Disposition:** should_fix · **Delegate:** grep

**Why:** Stray print/log statements leak into production and signal abandoned debugging. Replace with a structured logger that respects log levels.

**Source:** OWASP A09:2021 (Security Logging and Monitoring Failures); 12-factor app §XI — treat logs as event streams.

**Example violation:** `src/api/users.ts` has `console.log("got here", req.body)` — replace with `logger.debug("got here", { body: req.body })` or delete.

---

## U005 — stale TODOs

**Rule:** No TODO / FIXME / XXX older than 90 days.
**Check:** `regex:TODO|FIXME|XXX;blame_older_than_days:90`
**Disposition:** should_fix · **Delegate:** grep (via `git blame`)

**Why:** TODOs older than a quarter are decisions, not reminders. If the work mattered, it would have happened; if it didn't, the marker is noise. File the ticket and delete the comment, or just delete it.

**Source:** "Clean Code" §17 — comment smells: "TODO comments are not an excuse to leave bad code".

**Example violation:** `// TODO: handle empty input` blamed to a commit 230 days ago. Either implement the handling or delete the comment.

---

## U006 — path depth > 4

**Rule:** No file path > 4 directory levels deep from `src/`.
**Check:** `path_depth_from_src_gt:4`
**Disposition:** should_fix · **Delegate:** grep

**Why:** Deep nesting hides scope creep. `src/features/admin/users/edit/forms/validators/email.ts` is a smell: the directory tree has become a substitute for module boundaries. Flatten by feature, not by category.

**Source:** "Screaming Architecture" (Martin, 2011) — directory structure should communicate intent at a glance; mirrored by Hexagonal Architecture's "package by feature" guidance.

**Example violation:** `src/services/admin/users/profile/edit/validators.py` — collapse to `src/users/profile_validators.py`.

---

## U007 — missing file-purpose comment

**Rule:** Every file should carry a top-of-file purpose comment (warn-only).
**Check:** `missing_top_of_file_purpose_comment`
**Disposition:** wont_fix · **Delegate:** grep

**Why:** A one-line purpose comment at the top of the file makes the file's job legible to a cold reader before they read the code. Lowest-cost documentation that doesn't rot, because it sits above the code that proves or disproves it.

**Source:** "A Philosophy of Software Design" §13 — comments should describe what the code does at a higher level than the code itself.

**Example violation:** `src/utils/dates.py` starts at `import datetime` with no top comment. Add `"""Date helpers — parse, format, and compare ISO-8601 strings."""`.

---

## U008 — commented-out code blocks

**Rule:** No commented-out code blocks > 5 lines.
**Check:** `commented_code_block_gt:5_lines`
**Disposition:** should_fix · **Delegate:** grep

**Why:** Dead code in comments rots. Git remembers — `git log --all -S '<the deleted code>'` recovers anything you might want back. Commented blocks are noise that future readers must decide whether to trust.

**Source:** "Clean Code" §17 — "Commented-out code is an abomination". Mirrored by Refactoring catalog: "Remove Dead Code".

**Example violation:** A 12-line `// const oldImpl = () => { ... }` block above the new implementation — delete it; git knows.

---

## U009 — hardcoded credentials (must_fix)

**Rule:** No hardcoded credentials / API-key patterns.
**Check:** `regex:(AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]+PRIVATE KEY-----|api[_-]?key\s*=\s*['"][A-Za-z0-9_\-]{16,}['"])`
**Disposition:** **must_fix** · **Delegate:** grep

**Why:** Secrets in source are an incident. Once committed, they live forever in git history and trigger credential-rotation work even if "fixed" in a later commit. Use a secret manager (AWS Secrets Manager, Vault, 1Password) or env vars loaded at runtime.

**Source:** OWASP A02:2021 (Cryptographic Failures) + A07:2021 (Identification and Auth Failures); CWE-798 (Use of Hard-coded Credentials).

**Example violation:** `const apiKey = "sk_live_abc123def456ghi789"` in `src/billing.ts` — rotate the key immediately, move to env var, then treat as a release blocker.

---

## U010 — NotImplementedError on main path (must_fix)

**Rule:** No `NotImplementedError` / `throw new Error('TBD')` on a main code path.
**Check:** `regex:NotImplementedError|throw\s+new\s+Error\(['"]TBD['"];exclude:tests/`
**Disposition:** **must_fix** · **Delegate:** grep

**Why:** Stubs on main paths ship as 500s. The stub looked harmless during local dev (you never hit that branch) but production traffic hits the unhappy path within minutes. Either implement the case or remove the call site entirely.

**Source:** "Defensive Programming" (McConnell, "Code Complete" §8) — fail fast, but at boundaries, not in the middle of a request.

**Example violation:** `def refund(self, order_id): raise NotImplementedError` is exposed via the public API. must_fix disposition → implement the case or remove the call site before merge.

---

## U011 — duplicate cross-file signature

**Rule:** No identical function / method signature appearing in ≥2 files (excluding tests, generated).
**Check:** `duplicate_signature_cross_file;exclude:tests/,generated/`
**Disposition:** should_fix · **Delegate:** grep (special-cased AST) (see [gap-map-rationale.md](gap-map-rationale.md) for delegate rationale)

**Why:** The same signature recurring across files is almost always one of two smells. Either the function was copy-pasted — two implementations now drift independently and bug-fixes apply to only one — or a shared abstraction is missing and each caller re-implemented the same shape because there was no obvious home for it. Both lead to the same cure: hoist the function to a shared module, leave one call site that owns the canonical implementation, and migrate the others to import it.

U011 differs from U002 (function size) — U002 flags individual functions that have grown too large; U011 flags structural duplication across the file boundary, regardless of size. A 6-line function duplicated four times is invisible to U002 but loud under U011.

**Source:** "Refactoring" (Fowler, 1999) §3 — "Duplicated Code" listed as the first and most pervasive code smell. Mirrored by DRY (Hunt & Thomas, *The Pragmatic Programmer*, 1999).

**Example violation:** `def normalize_email(addr: str) -> str:` appears verbatim in `src/auth/signup.py` and `src/billing/invoice.py`. Hoist to `src/shared/email.py`; both call sites import it.

