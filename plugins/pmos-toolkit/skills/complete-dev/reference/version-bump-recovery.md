# Version-bump recovery — stale speculative bump

Triggered by `/complete-dev` Phase 9 when the pre-flight detects a stale speculative bump (local plugin.json bumped past the branch point AND main shipped its own bump in the meantime).

## Recipe

1. **Restore both paired manifests** to main's HEAD version:

   ```bash
   git checkout origin/main -- \
     plugins/${plugin_name}/.claude-plugin/plugin.json \
     plugins/${plugin_name}/.codex-plugin/plugin.json
   ```

2. **Re-run the bump prompt** (Phase 9 Step 5) — baseline now reads correctly as `main_v`. Pick the bump kind (Patch / Minor / Major) on top of the new baseline.

3. **Validate JSON** parses for both files (Phase 9 already does this):

   ```bash
   python3 -c "import json; json.load(open('plugins/${plugin_name}/.claude-plugin/plugin.json'))"
   python3 -c "import json; json.load(open('plugins/${plugin_name}/.codex-plugin/plugin.json'))"
   ```

Phase 11 commits the corrected bump alongside the rest of the ceremony.

## Failure modes

- **`git checkout origin/main -- <file>` fails** → `origin/main` lacks the manifest at that path. Verify with `git ls-tree origin/main <path>`; fall back to manual edit.
- **User picks "Keep going anyway"** → pre-push hook will reject; recovery becomes a manual edit after the rejection.

## Manual fallback

Edit both `plugin.json` files by hand to a version strictly greater than `origin/main`'s. Both files MUST carry the same version (pre-push hook rejects mismatch).
