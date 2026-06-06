# Plan — /magazine feed bundles & curation

**Tier:** 3 · `execution_mode: inline` · Derived from `02_spec.md`.
TDD where it bites (bundles.js + data integrity). Release-prereq tasks are listed
under "## Release prerequisites" only — NOT in any wave (/complete-dev owns them).

## Wave 1 — Bundled data (independent)

- **T1** — Create `data/catalog/`; copy verified `pm-newsletters.tsv` +
  `pm-podcasts.tsv` from the research source. Verify hygiene:
  `awk -F'\t' 'NF!=9' file` empty; no dup col-1 names.
- **T2** — Generate `data/catalog/feeds.opml` (OPML 2.0, Active feeds only, foldered
  Newsletters/Podcasts) from the two TSVs. Assert well-formed XML.
- **T3** — Derive the 8 bundles from the catalog (Active only):
  - newsletters: `essentials` (hand-pick ~12 canon), `growth-monetization`
    (tags growth|plg|monetization|pricing|retention), `ai-for-pms`
    (ai|genai|llms|ai-pm|ai-tools), `strategy-leadership` (strategy|product-strategy|
    leadership|career).
  - podcasts: `essentials` (~12 canon), `ai-and-tech` (ai|ai-news|tech|engineering),
    `founders-business` (founders|startups|investing|markets|business),
    `leadership-career` (leadership|career|management).
  Write per-bundle OPML under `data/bundles/<medium>/<id>.opml` (cap ~15–20; thematic
  ordered by catalog position). Each feed's `xmlUrl` = catalog working URL.
- **T4** — Write `data/bundles/bundles.yaml` manifest (8 entries; id/medium/title/
  description/rule/file/count). `count` must equal each OPML's outline count.

## Wave 2 — Tooling + tests (depends on Wave 1)

- **T5 [test-first]** — Write `tests/bundles.test.sh` per spec §7 (9 checks). Run →
  it should fail until `bundles.js` exists + data is correct.
- **T6** — Implement `scripts/bundles.js` (zero-dep): `list [--json]`,
  `resolve <id> [--medium]`, `validate-data`. OPML regex/stack parse; TSV split.
  Exit codes: unknown id → 3, ambiguous → 4.
- **T7** — Run `tests/bundles.test.sh` → green. Fix data/manifest drift until all 9
  checks pass. (Also confirm `bundles.js validate-data` exit 0.)

## Wave 3 — Skill wiring (depends on Wave 2)

- **T8** — `reference/feed-curation.md`: refine the research method (4 phases +
  bundle-generation Phase 5 + curate-wrapper pointer + write-target note).
- **T9** — `reference/import.md`: document `bundles` / `add --bundle <id>` / `curate`
  dispatch + bundle file layout + medium→type inference + dedup-on-import.
- **T10** — `SKILL.md`: extend Phase 1 dispatch (bundles/add --bundle/curate), add
  `curate` behavior (§5, write-target safety), add bundle offer to first-run
  onboarding, update `argument-hint` + `description` frontmatter. Keep body lean
  (progressive disclosure — mechanics stay in reference/).
- **T11** — Update `tests/structure.test.sh` to also assert the new
  reference/data/scripts files exist (or invoke bundles.test.sh).

## Wave 4 — Self-check (depends on Wave 3)

- **T12** — Full local gate: `bash tests/structure.test.sh && bash
  tests/bundles.test.sh` green; `node scripts/bundles.js list` sane; spot-check
  `resolve` + dedup. Confirm no `${CLAUDE_SKILL_DIR}` write in `curate`.

## Risks
- R1 — Bundle membership subjectivity → mitigated by documented `rule` per bundle.
- R2 — Catalog tag strings vary (singular/plural) → match tag tokens
  case-insensitively, allow a small synonym set per bundle.
- R3 — OPML attribute escaping → escape `& < > "`; test asserts well-formed XML.

## Release prerequisites (NOT in waves — /complete-dev only)
- Bump both `plugin.json` manifests (claude + codex) to 0.14.0, in sync.
- Changelog entry (newest-first).
- README update if a learnkit skills table lists /magazine capabilities.
- `~/.pmos/learnings.md` `## /magazine` header bootstrap if missing.
- No marketplace.json version fields.
