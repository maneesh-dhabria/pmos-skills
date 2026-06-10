#!/usr/bin/env bash
# check-browser-evidence.sh — /verify Phase 7 hard gate: couple the verdict to browser evidence.
#
# Usage:
#   check-browser-evidence.sh <feature_folder> [changed_files_list]
#
#   <feature_folder>      pmos feature folder (screenshots live under <feature_folder>/verify/)
#   [changed_files_list]  file with one changed path per line (e.g. `git diff --name-only main...HEAD`).
#                         When omitted, derived via `git diff --name-only $(git merge-base HEAD main)...HEAD`.
#
# Behavior: if the changed files match the browser-mandatory trigger patterns (Phase 4 entry gate:
# *.html *.tsx *.jsx *.vue *.svelte *.css *.scss, or files under frontend/ static/ public/ app/
# components/ pages/ src/ui/), at least one screenshot (*.png/*.jpg/*.jpeg/*.webp) must exist under
# <feature_folder>/verify/ (any subdirectory — date dirs and phase dirs both count).
#
# Exit codes: 0 = trigger did not fire, or fired with evidence present.
#             1 = trigger fired but no screenshot evidence found (verdict cannot be bare PASS).
#             2 = usage / input error.
set -u

SCRIPT_NAME="$(basename "${BASH_SOURCE[0]:-$0}")"

usage() {
  echo "usage: $SCRIPT_NAME <feature_folder> [changed_files_list]" >&2
  exit 2
}

[ "$#" -ge 1 ] && [ "$#" -le 2 ] || usage
feature_folder="${1%/}"
[ -d "$feature_folder" ] || { echo "$SCRIPT_NAME: feature folder not found: $feature_folder" >&2; exit 2; }

if [ "$#" -eq 2 ]; then
  [ -f "$2" ] || { echo "$SCRIPT_NAME: changed-files list not found: $2" >&2; exit 2; }
  changed="$(cat "$2")"
else
  base="$(git merge-base HEAD main 2>/dev/null)" || {
    echo "$SCRIPT_NAME: cannot derive changed files (git merge-base HEAD main failed); pass changed_files_list explicitly" >&2
    exit 2
  }
  changed="$(git diff --name-only "$base"...HEAD)"
fi

# Browser-mandatory trigger — mirrors the Phase 4 entry gate in SKILL.md. Keep the two in sync.
trigger_hits="$(printf '%s\n' "$changed" | grep -E -i \
  -e '\.(html|tsx|jsx|vue|svelte|css|scss)$' \
  -e '(^|/)(frontend|static|public|app|components|pages)/' \
  -e '(^|/)src/ui/' || true)"

if [ -z "$trigger_hits" ]; then
  echo "$SCRIPT_NAME: OK — browser-mandatory trigger did not fire (no UI-pattern files in the change set)."
  exit 0
fi

shots="$(find "$feature_folder/verify" -type f \
  \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' \) 2>/dev/null)"

if [ -n "$shots" ]; then
  echo "$SCRIPT_NAME: OK — trigger fired and screenshot evidence found under $feature_folder/verify/:"
  printf '%s\n' "$shots" | head -5
  exit 0
fi

echo "$SCRIPT_NAME: FAIL — browser-mandatory trigger fired but no screenshot evidence exists." >&2
echo "  Trigger-matching changed files (first 5):" >&2
printf '%s\n' "$trigger_hits" | head -5 | sed 's/^/    /' >&2
echo "  Expected >=1 *.png/*.jpg/*.jpeg/*.webp under: $feature_folder/verify/" >&2
echo "  Run Phase 4d-4f (browser verification) and save screenshots to the evidence dir," >&2
echo "  or downgrade the Phase 8 verdict to PASS-WITH-GAPS with every gap enumerated." >&2
exit 1
