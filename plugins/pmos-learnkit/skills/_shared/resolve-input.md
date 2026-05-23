# Resolve Input — Format-Aware Artifact Resolver

> **Shared contract for pipeline skills that read upstream artifacts.** Skill prompts inline a call to this resolver instead of `Read`-ing a fixed `<NN>_<artifact>.md` path. The resolver prefers `.html` (the post-html-artifacts default), falls back to `.md` (legacy folders + `output_format: both` sidecars), and errors when neither exists.

This file is the source of truth for the resolver contract (per spec FR-30..FR-33, D21). Skills cite it by path:

```
Follow `_shared/resolve-input.md` with phase=<requirements|spec|plan> (or label="…")
```

---

## Resolver contract

**Inputs:**
- `feature_folder` — absolute path to the resolved `{docs_path}/features/<YYYY-MM-DD>_<slug>/` directory.
- `phase_or_label` — one of:
  - `phase=<requirements|spec|plan>` — maps to a numbered prefix (see below).
  - `label="<free-form description>"` — used in chat-facing error messages and disambiguation prompts.

**Output:** absolute path to the resolved artifact file.

**Resolution order (FR-31):**
1. Try `{feature_folder}/<NN>_<phase>.html` — return on hit.
2. Else try `{feature_folder}/<NN>_<phase>.md` — return on hit.
3. Else error: `resolve-input: no <label> artifact found at <feature_folder>/<NN>_<phase>.{html,md}`.

**Phase → prefix mapping:**

| `phase` | Prefix | Filename glob |
|---|---|---|
| `requirements` | `01` | `01_requirements.{html,md}` |
| `spec` | `02` | `02_spec.{html,md}` |
| `plan` | `03` | `03_plan.{html,md}` |

Other artifacts use their existing path conventions (no numbered prefix) — see "Label-based lookup" below.

---

## Label-based lookup (FR-32)

For non-numbered artifacts, callers pass `phase=<key>` where `<key>` is one of:

| `phase` key | Path pattern | Notes |
|---|---|---|
| `msf-findings` | `{feature_folder}/msf-findings.{html,md}` | One per feature folder. |
| `grills` | `{feature_folder}/grills/<YYYY-MM-DD>_<target>.{html,md}` | Caller passes `target=<artifact-stem>`; latest date wins on multi-match. |
| `simulate-spec` | `{feature_folder}/simulate-spec/<YYYY-MM-DD>-trace.{html,md}` | Latest date wins on multi-match. |
| `verify` | `{feature_folder}/verify/<YYYY-MM-DD>-<scope>/review.{html,md}` | `<scope>` is `phase-<N>` or `final`; caller specifies. |

Resolution order is identical (`.html` → `.md` → error). Multi-match disambiguation is by lexicographic-max filename (latest date).

`label` is informational — it surfaces in the error message when neither format exists, e.g.:

```
resolve-input: no requirements doc found at <feature_folder>/01_requirements.{html,md}
```

---

## Ambiguous-feature edge cases (FR-32)

When the caller hasn't yet resolved `feature_folder` (e.g., `--feature <slug>` glob returned 0 or 2+ matches), delegate to `_shared/pipeline-setup.md` **Section B** — Feature-folder rules. Do not attempt slug fuzzy-matching inside the resolver; that's a Section B responsibility.

---

## Fixture-folder examples

### Example 1 — post-html-artifacts feature (default)

```
docs/pmos/features/2026-05-09_html-artifacts/
├── 01_requirements.html
├── 01_requirements.sections.json
├── 02_spec.html
├── 02_spec.sections.json
├── 03_plan.html
├── 03_plan.sections.json
└── ...
```

Resolver call: `phase=spec` → returns `…/02_spec.html`.

### Example 2 — legacy MD-only feature (NFR-10 regression)

```
docs/pmos/features/2025-11-12_legacy-feature/
├── 01_requirements.md
├── 02_spec.md
└── 03_plan.md
```

Resolver call: `phase=spec` → tries `02_spec.html` (miss) → returns `…/02_spec.md`.

### Example 3 — `output_format: both` mixed sidecars

```
docs/pmos/features/2026-05-09_html-artifacts/
├── 01_requirements.html        ← primary
├── 01_requirements.md          ← sidecar (FR-12.1)
├── 02_spec.html
├── 02_spec.md
└── ...
```

Resolver call: `phase=requirements` → returns `…/01_requirements.html` (primary; .md sidecar is ignored on read).

### Example 4 — neither exists

```
docs/pmos/features/2026-05-09_brand-new/
└── 00_pipeline.html
```

Resolver call: `phase=requirements`, `label="requirements doc"` → error: `resolve-input: no requirements doc found at <feature_folder>/01_requirements.{html,md}`.

---

## Caller pattern

Skill prompts inline the resolver call rather than calling a function — there is no executable resolver, this file documents the discipline. Canonical wording in a skill body:

> **Locate the upstream spec.** Follow `_shared/resolve-input.md` with `phase=spec`, `label="spec doc"`. Use the returned path with the `Read` tool.

The resolver is purely a path-resolution discipline: prefer `.html`, fall back to `.md`, error on neither. Skills MUST NOT bypass it by directly `Read`-ing a hard-coded `<NN>_<artifact>.md` path (FR-33). Per-skill verification is the `tests/scripts/assert_no_md_to_html.sh` grep (T20) which catches direct hard-coded `.md` artifact paths.
