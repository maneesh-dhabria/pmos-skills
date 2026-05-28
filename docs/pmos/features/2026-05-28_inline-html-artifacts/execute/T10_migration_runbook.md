# T10 — sidecar→inline migration runbook

Operator guidance for the one-shot migration that promotes per-artifact
`<artifact>.comments.json` sidecars into the inline `<script id="pmos-comments">`
block introduced by this feature. After every artifact has been migrated, the
sidecar files are gone and pre-commit drift-hook is no longer needed (T10
deletes `scripts/install-comments-hooks.sh`; this runbook is the operator
handoff so /complete-dev can include the local uninstall step).

## Pre-flight

The migration is **filesystem-mutating** (deletes sidecar JSONs, edits
HTML in place). Run from a clean working tree on a branch, so a `git diff`
shows exactly what changed and a `git checkout -- .` rolls everything back.

```bash
git status   # expect: clean
git switch -c migrate/sidecars-to-inline    # ad-hoc branch is fine
```

## Dry-run first

Always dry-run before mutating the repo. The output lists every
`*.comments.json` that would either be migrated (block injection + sidecar
delete) or cleaned (sidecar removed because the artifact already carries an
inline block from an earlier partial run).

```bash
bash scripts/migrate-sidecars-to-inline.sh --dry-run docs/pmos
```

**Spot-check guidance:** sample 3–5 of the listed artifacts after the dry-run
and confirm the sidecar content is what you expect to land inline:

```bash
# For each spot-checked artifact path printed by the dry-run:
cat path/to/artifact.html.comments.json | head -30
```

If anything looks wrong (corrupted JSON, threads that should have been
resolved/deleted upstream, schema_version mismatch), fix it via the comments
overlay or hand-edit first — once the migration runs, the sidecar is gone.

## Real run

When the dry-run output is reviewed and clean:

```bash
bash scripts/migrate-sidecars-to-inline.sh docs/pmos
```

The script prints one line per artifact (`migrating: <path>` /
`cleaned-sidecar: <path>` / `skipped: <path>`) and a final
`summary: N migrated, M skipped` line. Skipped lines mean an orphaned
sidecar — investigate manually.

## Commit

```bash
git add -A
git diff --cached --stat | head -40   # sanity-check the artifact + sidecar churn
git commit -m "docs(migration): inline sidecars into per-artifact <script id=pmos-comments>"
```

## Verify idempotency

A second run on the same tree should report `summary: 0 migrated, 0 skipped`
because there are no sidecar files left to process:

```bash
bash scripts/migrate-sidecars-to-inline.sh docs/pmos
# Expect: summary: 0 migrated, 0 skipped
```

## Uninstall the pre-commit drift hook (local-machine step)

The drift hook used to refuse commits that touched `<artifact>.html` without
its `.comments.json` sibling (and vice versa). With the sidecar contract
retired, the hook is dead weight. The installer script (`install-comments-hooks.sh`)
is deleted by T10 itself, but any operator who ran the installer in the past
still has `.git/hooks/pre-commit` on their machine. Each operator runs:

```bash
# In every clone that ever ran install-comments-hooks.sh:
if grep -q "pmos comments drift hook" .git/hooks/pre-commit 2>/dev/null; then
  rm -f .git/hooks/pre-commit
  echo "removed pmos comments drift hook"
fi
```

If a clone had a richer pre-commit that included the drift block plus other
hooks, edit `.git/hooks/pre-commit` by hand and remove only the
"pmos comments drift hook" section — keeping the rest of the file intact.
The `.git/hooks/` directory is per-clone and not tracked by git; this step
cannot be automated by the migration script.

## Rollback

If the migration commit needs to be undone before merge:

```bash
git revert HEAD                # revert the migration commit
# OR for an unpushed branch:
git reset --hard HEAD~1
```

After revert, the sidecar files are back and the inline block is gone.
The drift hook (if anyone still has it locally) will once again pass.
