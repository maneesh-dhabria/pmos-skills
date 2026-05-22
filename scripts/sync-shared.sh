#!/usr/bin/env bash
# Sync one plugin's skills/_shared/ to every peer plugin. FR-20..FR-25.
# Usage: scripts/sync-shared.sh --from=<plugin> [--dry-run] [--help]
set -euo pipefail
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
SRC="plugins/$FROM/skills/_shared/"
[ -d "$SRC" ] || { echo "$0: '$SRC' does not exist" >&2; exit 64; }
peers=0
for d in plugins/*/; do
  p=$(basename "$d"); [ "$p" = "$FROM" ] && continue
  peers=$((peers+1)); DEST="plugins/$p/skills/_shared/"
  if [ "$DRY" -eq 1 ]; then echo "rsync -a --delete $SRC $DEST"
  else mkdir -p "$DEST"; rsync -a --delete "$SRC" "$DEST"; fi
done
[ "$peers" -gt 0 ] || echo "sync-shared.sh: only one plugin, nothing to sync." >&2
