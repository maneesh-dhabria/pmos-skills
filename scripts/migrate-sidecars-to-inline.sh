#!/usr/bin/env bash
# migrate-sidecars-to-inline.sh — one-shot migration per FR-19/20/21.
#
# Usage: migrate-sidecars-to-inline.sh [--dry-run] [<target-dir>]
#   --dry-run     Announce work but do not mutate the filesystem.
#   <target-dir>  Directory to scan recursively (default: docs/pmos).
#
# Behaviour:
#   For each <artifact>.html.comments.json under <target-dir>:
#     - If the sibling <artifact>.html already has an inline pmos-comments
#       block, just delete the sidecar (sidecar→inline already done; this
#       is the idempotency-recovery path).
#     - Otherwise inject an inline block carrying the sidecar's threads
#       before </body> in <artifact>.html, then delete the sidecar.
#     - If <artifact>.html doesn't exist (orphaned sidecar), skip + warn.
#
# Honors FR-19 (inject), FR-20 (idempotent), FR-21 (delete sidecar on success).
# Re-runs after a clean migration report "summary: 0 migrated, 0 skipped".

set -euo pipefail

DRY_RUN=0
TARGET="docs/pmos"
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) TARGET="$arg" ;;
  esac
done

if [[ ! -d "$TARGET" ]]; then
  echo "error: target directory not found: $TARGET" >&2
  exit 64
fi

MIGRATED=0
SKIPPED=0

while IFS= read -r -d '' sidecar; do
  artifact="${sidecar%.comments.json}"
  if [[ ! -f "$artifact" ]]; then
    echo "skipped: $sidecar (no sibling html)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  if grep -q "pmos-comments:start" "$artifact"; then
    # Already migrated — recover by dropping the lingering sidecar.
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "would cleanup sidecar: $sidecar"
    else
      rm -f "$sidecar"
      echo "cleaned-sidecar: $sidecar"
    fi
    MIGRATED=$((MIGRATED + 1))
    continue
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "would migrate: $artifact"
    continue
  fi

  echo "migrating: $artifact"
  # Node helper does the JSON read, escape, and inject in one pass.
  node \
    --input-type=module \
    -e "
      import { readFileSync, writeFileSync, renameSync } from 'node:fs';
      const sidecarPath = process.argv[1];
      const artifactPath = process.argv[2];
      const sidecar = JSON.parse(readFileSync(sidecarPath, 'utf8'));
      const html = readFileSync(artifactPath, 'utf8');
      const payload = {
        schema: 1,
        version: typeof sidecar.version === 'number' ? sidecar.version : 0,
        generated_at: sidecar.generated_at || new Date().toISOString(),
        threads: Array.isArray(sidecar.threads) ? sidecar.threads : []
      };
      // Escape </ to avoid premature script termination in the inline block.
      const escaped = JSON.stringify(payload).replace(/<\//g, '\\\\u003c/');
      const block = [
        '<!-- pmos-comments:start -->',
        '<script id=\"pmos-comments\" type=\"application/json\">',
        escaped,
        '</script>',
        '<!-- pmos-comments:end -->'
      ].join('\\n');
      let out;
      if (html.includes('</body>')) {
        out = html.replace('</body>', block + '\\n</body>');
      } else {
        // E13: pre-feature artifact with no </body> — append at EOF.
        out = html.replace(/\\s*$/, '\\n') + block + '\\n';
      }
      const tmp = artifactPath + '.tmp';
      writeFileSync(tmp, out);
      renameSync(tmp, artifactPath);
    " \
    "$sidecar" "$artifact"
  rm -f "$sidecar"
  MIGRATED=$((MIGRATED + 1))
done < <(find "$TARGET" -type f -name '*.comments.json' -print0)

echo "summary: $MIGRATED migrated, $SKIPPED skipped"
