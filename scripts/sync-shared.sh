#!/usr/bin/env bash
# Sync one plugin's skills/_shared/ to every peer plugin — INTERSECTION ONLY.
#
# Copies only files that exist in BOTH the source plugin's _shared/ and the
# destination plugin's _shared/. Never deletes anything, never creates new
# files or directories in a destination, and skips peers that have no
# skills/_shared/ at all (e.g. pmos-utilities). Source-only files are
# reported as skipped so divergent membership (learnkit's topic-research/,
# toolkit's learnings-capture.md, ...) is visible but untouched.
#
# Usage: scripts/sync-shared.sh --from=<plugin> [--dry-run] [--help]
set -euo pipefail

# Resolve repo root. BASH_SOURCE[0] is not always populated (see CLAUDE.md
# "Bash portability") — fall back to $0, then walk up from $PWD until a
# plugins/ sentinel directory is found.
ROOT=""
src_path="${BASH_SOURCE[0]:-$0}"
if [ -n "$src_path" ]; then
  cand="$(cd "$(dirname "$src_path")/.." 2>/dev/null && pwd || true)"
  if [ -n "$cand" ] && [ -d "$cand/plugins" ]; then ROOT="$cand"; fi
fi
if [ -z "$ROOT" ]; then
  cand="$PWD"
  while [ "$cand" != "/" ] && [ ! -d "$cand/plugins" ]; do
    cand="$(dirname "$cand")"
  done
  if [ -d "$cand/plugins" ]; then ROOT="$cand"; fi
fi
[ -n "$ROOT" ] || { echo "$0: cannot locate repo root (no plugins/ directory found)" >&2; exit 64; }

DRY=0; FROM=""
for arg in "$@"; do
  case "$arg" in
    --help) echo "Usage: $0 --from=<plugin> [--dry-run]"; exit 0 ;;
    --dry-run) DRY=1 ;;
    --from=*) FROM="${arg#--from=}" ;;
    *) echo "$0: unknown arg '$arg'" >&2; exit 64 ;;
  esac
done
[ -n "$FROM" ] || { echo "$0: --from=<plugin> required" >&2; exit 64; }
SRC="$ROOT/plugins/$FROM/skills/_shared"
[ -d "$SRC" ] || { echo "$0: '$SRC' does not exist" >&2; exit 64; }

peers=0
for d in "$ROOT"/plugins/*/; do
  p="$(basename "$d")"
  [ "$p" = "$FROM" ] && continue
  peers=$((peers+1))
  DEST="${d}skills/_shared"
  if [ ! -d "$DEST" ]; then
    echo "peer $p: no skills/_shared/ — skipped (never created)"
    continue
  fi

  synced=0; identical=0; skipped_only=0
  echo "peer $p:"
  # Process substitution (not a pipe) so the counters survive the loop —
  # bash-3.2-safe; no mapfile / associative arrays.
  while IFS= read -r f; do
    rel="${f#"$SRC"/}"
    if [ -f "$DEST/$rel" ]; then
      if cmp -s "$f" "$DEST/$rel"; then
        identical=$((identical+1))
      elif [ "$DRY" -eq 1 ]; then
        echo "  would sync: $rel"
        synced=$((synced+1))
      else
        cp -p "$f" "$DEST/$rel"
        echo "  synced: $rel"
        synced=$((synced+1))
      fi
    else
      echo "  skipped (source-only, not in $p): $rel"
      skipped_only=$((skipped_only+1))
    fi
  done < <(find "$SRC" -type f | LC_ALL=C sort)
  echo "  summary: $synced synced, $identical identical, $skipped_only source-only skipped (never deletes)"
done
[ "$peers" -gt 0 ] || echo "sync-shared.sh: only one plugin, nothing to sync." >&2
