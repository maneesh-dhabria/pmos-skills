---
task_id: T9
detected_at: 2026-05-23T00:00:00Z
detected_by: /execute (resume from compact, Phase 4 entry)
---

## Defect

The plan assumes a baseline of all four manifest entries at `2.49.0`, with T11's `/complete-dev` bumping them to `2.50.0` atomically. Reality on the feature branch:

| Manifest | Actual version | Plan expected |
|---|---|---|
| `plugins/pmos-toolkit/.claude-plugin/plugin.json` | **2.50.0** | 2.49.0 |
| `plugins/pmos-toolkit/.codex-plugin/plugin.json` | **2.50.0** | 2.49.0 |
| `.claude-plugin/marketplace.json` plugins[pmos-toolkit].version | **2.49.0** | 2.49.0 |
| `.codex-plugin/marketplace.json` plugins[pmos-toolkit].version | **2.49.0** | 2.49.0 |

**Root cause.** Commit `58a130d — chore: release pmos-toolkit 2.50.0 — /architecture deep-pass v2` landed on `main` BEFORE the feature branch was created (it precedes `fb8a9a2 docs: add requirements for multi-plugin marketplace migration`). That release bumped both `plugin.json` files to `2.50.0` and tagged `v2.50.0` (legacy unnamespaced tag, pre-cutover convention). The feature branch inherited the bumped `plugin.json` but T1 created the new `marketplace.json` entries at the stale `2.49.0` baseline the plan authored against.

**Symptoms surfaced by T9.**

- `tests/scripts/assert_marketplace_json_schema.sh` exits 1 with: `FAIL: <marketplace>.json plugins[pmos-toolkit].version='2.49.0' != plugin.json version='2.50.0' (3-way invariant)` — for both `.claude-plugin` and `.codex-plugin`.
- The pre-push hook will reject any push of the current branch state on the same invariant.
- `git tag -l '*2.50*'` shows `v2.50.0` already exists — T11 cannot tag `pmos-toolkit/v2.50.0` (same SHA on the same version is OK; cutting a different SHA as the same version is not).

**Test sweep result.** 17/18 PASS; the failing one is the invariant gate above. All other assertions (sync-shared × 4, pre-commit × 2, pre-push × 4, complete-dev × 3, claude-md × 1, release-policy × 1, hardcoded-path × 1, substrate-refs × 1) are green.

## Suggested fix

The plan's release version + tag assumption are the load-bearing wrong bit. Two coherent resolutions, each a self-contained edit to `03_plan.html`:

**Option A — Bump release target to v2.51.0 (recommended).**

1. **Inline fixup commit on feature branch** (before T10): bump both marketplace.json entries from `2.49.0` → `2.50.0` to restore the 3-way invariant. This unblocks the pre-push hook and re-greens `assert_marketplace_json_schema.sh`. Commit subject: `fix(T9): sync marketplace.json entries to 2.50.0 baseline (plugin.json shipped 2.50.0 on main pre-branch)`.
2. **Revise T11** in `03_plan.html`:
   - Change tag from `pmos-toolkit/v2.50.0` → `pmos-toolkit/v2.51.0`.
   - Change "bumps 4 manifest entries to 2.50.0" → "bumps 4 manifest entries from 2.50.0 → 2.51.0".
   - Change Step 3 verification expectations (`refs/tags/pmos-toolkit/v2.50.0`) to `refs/tags/pmos-toolkit/v2.51.0`.
   - Change Step 4a/4b install-verify expected version `2.50.0` → `2.51.0`.
3. **Update T9's Step 3 expected output** in `03_plan.html` to read `all four show 2.50.0` (post-fixup baseline).
4. **Update CHANGELOG framing**: the `2.51.0` release entry should be authored by `/complete-dev` as "Multi-plugin marketplace migration to pmos-skills" — same semantic content the plan envisioned for the `2.50.0` slot.

Pro: minimal plan rewrite, doesn't reuse a shipped version, monotonic. Con: the released `v2.50.0` had `/architecture` deep-pass content but no multi-plugin migration — the migration ships as `2.51.0` instead, which is correct semver (additive features over 2.50.0).

**Option B — Roll back the pre-existing 2.50.0 on the feature branch.**

1. On feature branch, downgrade both `plugin.json` files `2.50.0` → `2.49.0` (one commit, undoes the bump from 58a130d ONLY on this branch — main keeps 2.50.0). Sync ALL changelog entries too. Then T9–T11 run unchanged.

Pro: zero plan revision. Con: leaves `v2.50.0` tag on main pointing at the `/architecture` release while the feature branch ships as `2.50.0` *replacing* that semantic content at merge time — version-collision footgun, breaks the cached-install promise in CLAUDE.md `## Old repo posture`, and likely fails the pre-push tag-version-match test. Not recommended.

**Recommendation:** Option A. Re-run `/plan --fix-from T9` (or apply the four edits manually) and re-invoke `/execute --resume`.

## Reproducer

```bash
# Show the broken invariant:
echo "marketplace claude:    $(jq -r '.plugins[] | select(.name==\"pmos-toolkit\") | .version' .claude-plugin/marketplace.json)"
echo "marketplace codex:     $(jq -r '.plugins[] | select(.name==\"pmos-toolkit\") | .version' .codex-plugin/marketplace.json)"
echo "plugin.json claude:    $(jq -r '.version' plugins/pmos-toolkit/.claude-plugin/plugin.json)"
echo "plugin.json codex:     $(jq -r '.version' plugins/pmos-toolkit/.codex-plugin/plugin.json)"
# Expected (plan): all four 2.49.0.   Actual: marketplace=2.49.0, plugin.json=2.50.0.

# Show the test failure:
bash tests/scripts/assert_marketplace_json_schema.sh; echo "exit=$?"
# exit=1 with two FAIL lines.

# Show v2.50.0 is already taken on main:
git tag -l '*2.50*'
# v2.50.0
git log --oneline main -1 --grep='2.50.0'
# 58a130d chore: release pmos-toolkit 2.50.0 — /architecture deep-pass v2
```
