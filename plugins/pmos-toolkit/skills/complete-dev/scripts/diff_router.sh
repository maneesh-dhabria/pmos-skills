#!/usr/bin/env bash
# diff_router.sh — auto-detect / refuse-ambiguous / substrate-smart-detect
# for /complete-dev Phase 0 --plugin resolution. FR-51, FR-52, FR-53, FR-54.
#
# Diff sources: staged + working tree + branch scope (merge-base..HEAD against
# origin/main, falling back to local main). The branch union matters in the
# canonical post-/verify flow, where all feature work is already committed and
# the staged/working diffs are empty — without it, auto-detect silently
# degrades to the ask-the-user fallback exactly when it is most useful
# (2026-06-10 skill-design review, complete-dev finding 7).
set -euo pipefail
base=$(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null || true)
files=$( { git diff --cached --name-only; git diff --name-only HEAD; [ -n "$base" ] && git diff --name-only "$base" HEAD; } 2>/dev/null | sort -u || true)
[ -z "$files" ] && exit 0
plugin_paths=$(printf '%s\n' "$files" | grep -oE '^plugins/[^/]+/[^[:space:]]*' || true)
[ -z "$plugin_paths" ] && exit 0
non_shared=$(printf '%s\n' "$plugin_paths" | grep -v '/skills/_shared/' | sed -E 's|^plugins/([^/]+)/.*|\1|' | sort -u || true)
shared=$(printf '%s\n' "$plugin_paths" | grep '/skills/_shared/' | sed -E 's|^plugins/([^/]+)/.*|\1|' | sort -u || true)
n_non_shared=$( [ -z "$non_shared" ] && echo 0 || printf '%s\n' "$non_shared" | wc -l | tr -d ' ')
n_shared=$( [ -z "$shared" ] && echo 0 || printf '%s\n' "$shared" | wc -l | tr -d ' ')
if [ "$n_non_shared" -ge 2 ]; then
  a=$(printf '%s\n' "$non_shared" | sed -n '1p')
  b=$(printf '%s\n' "$non_shared" | sed -n '2p')
  echo "Diff spans plugins/$a/ AND plugins/$b/ with non-_shared changes. Either pass --plugin <name> explicitly (and re-invoke once per plugin), or split the merge into per-plugin commits first." >&2
  exit 64
fi
if [ "$n_non_shared" -eq 1 ]; then
  echo "Auto-detected --plugin $non_shared from diff. Proceed? (Recommended)"
  exit 0
fi
if [ "$n_shared" -ge 1 ]; then
  list=$(printf '%s\n' "$shared" | sed 's|^|plugins/|;s|$|/|' | paste -sd, - | sed 's|,|, |g')
  echo "Substrate-only change detected across $list. Ride which plugin's next release?"
  exit 0
fi
exit 0
