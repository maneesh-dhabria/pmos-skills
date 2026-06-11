# cross-file-rules.md — R1–R4 + A9 design-time clarity-test results

Canonical reference for the `/readme` monorepo cross-file rule pass (FR-CF-1..5,
spec §7.8). Four rules (R1–R4) fire when a workspace is detected; each is
evaluated against assumption **A9** (the *binary-decidability* clarity test)
at skill-design time. This file records the per-rule A9 outcome, the fixture
used, and the resulting tier (blocker / friction / warn-with-override).

## Table of contents

- [§R1: Link existence](#r1-link-existence)
- [§R2: Link-up presence](#r2-link-up-presence)
- [§R3: Install/Contributing/License root-only (warn-with-override)](#r3-installcontributinglicense-root-only-warn-with-override)
- [§R4: No duplicate hero text](#r4-no-duplicate-hero-text)
- [§Methodology: how A9 was evaluated](#methodology-how-a9-was-evaluated)
- [§Summary table](#summary-table)

---

## §R1 Link existence

**Rule.** The root `README.md` references every detected workspace package's
`README.md` by **relative link** from its contents-table (FR-CF-1).

**Decision shape.** Binary. For each package `p` in
`workspace-discovery.sh` output, either the root README contains a markdown
link whose resolved target equals `p/README.md` (PASS) or it does not (FAIL).
No human judgement; no edge cases requiring tone or voice.

**A9 result.** **PASS** (binary-decidable).

**Tier on fail.** Friction. Auto-fix is *create-or-update*: when a
contents-table exists, append missing entries inline; when no table exists,
surface an explicit AskUserQuestion ("root README has no contents-table —
add one? [show preview]") before any structural rewrite (M2).

**Fixture tested.** `tests/fixtures/workspaces/01_pnpm` (2 packages: `foo`,
`bar`) — root README with a contents-table referencing only `foo` → R1
correctly fired on `bar` with a single FAIL finding. Re-run after auto-fix
produced zero findings (NFR-2 idempotency holds).

---

## §R2 Link-up presence

**Rule.** Every package README contains a relative-link reference back to the
root README (FR-CF-2).

**Decision shape.** Binary. For each package README, either a markdown link
resolving to the root `README.md` is present (PASS) or absent (FAIL). Link
position and surrounding prose are out-of-scope for R2; only existence is
checked.

**A9 result.** **PASS** (binary-decidable).

**Tier on fail.** Friction. Auto-fix appends the link-up line at end-of-readme
(default: appended bare; target section name overridable via
`.pmos/readme.config.yaml :: link_up_section`).

**Fixture tested.** `tests/fixtures/workspaces/03_lerna` — `packages/foo`
contained `[root](../../README.md)` (PASS); `packages/bar` had no upward
link (FAIL). Auto-fix appended `> Part of [the monorepo](../../README.md).`
and a re-run produced zero findings.

---

<a id="r3-install-contributing-license-root-only"></a>
## §R3 Install/Contributing/License root-only (warn-with-override)

**Rule.** Package READMEs should not duplicate the root `Install`,
`Contributing`, or `License` sections (FR-CF-3). When they do, two
sub-cases apply:

- (a) Package section matches root **byte-for-byte** → friction; auto-fix
      replaces with a link-up to the root section.
- (b) Package section **legitimately diverges** (the package genuinely
      installs differently, has its own contributing flow, or carries a
      different license) → **warn-with-override**, not a blocker. The
      override is persisted in
      `.pmos/readme.config.yaml :: package_variance: [<rel-path>]`.

**Decision shape.** **Three-valued** — `clean` / `divergent-byte-for-byte`
/ `legitimately-divergent`. The first two are mechanically decidable
(section-extract + `sha256sum` compare); the third requires either a prior
config entry or an explicit user choice at audit time.

**A9 result.** **PASS as 3-valued** (legitimately so). A9 admits non-binary
rules when (1) the value space is fully enumerated, (2) at most one branch
requires human input, and (3) the human input is captured in persisted
config so subsequent runs are binary against the override list. R3 meets
all three: enumerated 3-valued output, single human branch
(`legitimately-divergent`), persisted via `package_variance` (FR-CF-3).

**Tier on fail.** Friction (case a) OR warn-with-override (case b). Never
blocker — real monorepos legitimately diverge (H5).

**Fixture tested.** Two cases were modelled at design time:

- **kubernetes/kubernetes** (case b) — `staging/src/k8s.io/*` packages
  carry their own license headers. Persisted as `package_variance` on
  first audit; subsequent runs binary-skip these paths.
- **babel/babel** (case b) — most `packages/babel-*` link up to root
  install; a handful (e.g. `babel-standalone`) ship their own
  install-from-CDN section → legitimately divergent.

Synthetic byte-for-byte case (a) was constructed by copying root
`## Install` into `tests/fixtures/workspaces/01_pnpm/packages/bar/README.md`
verbatim — R3 fired with `divergent-byte-for-byte: false` and the auto-fix
collapsed it to a link-up.

---

## §R4 No duplicate hero text

**Rule.** No package README's hero line (first non-heading content line) is
byte-for-byte identical to the root README's hero line (FR-CF-4).

**Decision shape.** Binary. Extract hero per `opening-shapes.md` §1; compare
strings; PASS or FAIL.

**A9 result.** **PASS** (binary-decidable).

**Tier on fail.** Friction. **No auto-fix** — hero lines are voice-sensitive
and rewriting them brushes the structural-vs-prose boundary (FR-V-1).
Finding emits a `Suggest: /polish <package-readme> --target=sections=hero`
follow-up (FR-V-2) and leaves the edit to the maintainer.

**Fixture tested.** `tests/fixtures/workspaces/02_npm-workspaces` — both
`packages/foo/README.md` and the root README originally opened with
"A modern toolkit for the modern web." R4 fired one FAIL with both line
numbers; no auto-fix attempted; the `/polish` suggestion was emitted.

---

## §Methodology — how A9 was evaluated

A9 (from spec §5 / requirements §3.A9): *A cross-file rule passes the
clarity test iff its output value-space is fully enumerated AND every
non-PASS branch is either (i) mechanically decidable from file content
alone, or (ii) decidable from persisted config without re-asking the user.*

For each rule, the design-time procedure was:

1. **Enumerate the output space.** R1, R2, R4 → `{PASS, FAIL}`. R3 →
   `{clean, divergent-byte-for-byte, legitimately-divergent}`.
2. **Trace each branch to its decision source.** For R1/R2/R4, every
   branch resolves to a string-match or byte-compare on file content. For
   R3, two branches are mechanical (`clean` from absence of section;
   `divergent-byte-for-byte` from `sha256sum` compare) and one is
   config-backed (`legitimately-divergent` via `package_variance`).
3. **Construct an adversarial fixture.** For each rule, build a minimal
   workspace fixture (or cite a real-world repo) that exercises every
   branch. Run the rule by hand; record PASS/FAIL alignment with the
   enumerated space.
4. **Demote on ambiguity.** Per FR-CF-5: any rule whose adversarial
   fixture surfaced a branch that required *new* human judgement (i.e.
   not capturable in `package_variance` or equivalent) is demoted to a
   friction-tier *advisory* finding. None of R1–R4 demoted under this
   step.

**Fixtures cited above:** `01_pnpm` (R1, R3 synthetic case a),
`02_npm-workspaces` (R4), `03_lerna` (R2). Real-world R3 cases:
kubernetes/kubernetes (staging packages), babel/babel
(`babel-standalone`).

---

## §Summary table

| Rule | Output space | A9 result | Tier on fail | Auto-fix? |
|------|--------------|-----------|--------------|-----------|
| R1   | binary       | PASS      | friction     | create-or-update (with AskUserQuestion when no table) |
| R2   | binary       | PASS      | friction     | append link-up at EOF |
| R3   | 3-valued     | PASS (3v) | friction OR warn-with-override | replace-with-link-up OR persist `package_variance` |
| R4   | binary       | PASS      | friction     | none (delegate to /polish) |

All four rules pass A9 at design time; none demoted to advisory. R3 is the
only legitimately non-binary rule, and its third branch is captured in
persisted config so subsequent runs are binary against the override list.
