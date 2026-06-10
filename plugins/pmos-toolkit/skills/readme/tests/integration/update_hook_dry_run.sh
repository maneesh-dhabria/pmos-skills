#!/usr/bin/env bash
# update_hook_dry_run.sh — assert update-mode hook contracts without
# invoking the live /readme slash-command.
#
# Exercises:
#   (a) FR-UP-2 — empty/no-conv-commit range emits warn + zero sections.
#   (b) FR-UP-3 — patch-fail guard documented in SKILL.md §7 step 5 with
#       atomic-write + revert + patch_dropped JSONL contract.
#
# (The former case (c) asserted the FR-UP-4 dual-gate prose; that gate was
# removed — manual --update is gated only by its per-section prompts and the
# FR-UP-3 guard — so the case was deleted with it.)
#
# /readme itself is un-mockable from bash; we substitute SKILL.md contract
# greps (FR-UP-3) for the runtime patch-drop path and run the
# commit-classifier substrate directly for FR-UP-2.
#
# Bash 3.2-safe.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPTS="$HERE/../../scripts"
SKILL_MD="$HERE/../../SKILL.md"
FIX_DIR="$HERE/../fixtures/commits"

tmp="$(mktemp -d -t readme-update-hook.XXXXXX)"
# shellcheck disable=SC2329  # invoked indirectly via trap
cleanup() { rm -rf "$tmp"; }
trap cleanup EXIT

[ -f "$SKILL_MD" ] || { echo "FAIL: SKILL.md missing"; exit 1; }
[ -d "$FIX_DIR/02_no-conv-commit" ] || { echo "FAIL: no-conv-commit fixture missing"; exit 1; }

# --- (a) FR-UP-2 — no-conv-commit range -> empty sections + warn -------------
dir="$FIX_DIR/02_no-conv-commit"
# Materialise the fixture's .git if not present.
if [ ! -d "$dir/.git" ] && [ -f "$dir/setup.sh" ]; then
  ( bash "$dir/setup.sh" >/dev/null 2>&1 )
fi
first=$( cd "$dir" && git rev-list --max-parents=0 HEAD | head -n1 )
range="${first}..HEAD"
classifier_out=$(bash "$SCRIPTS/commit-classifier.sh" "$dir" "$range" 2>"$tmp/cls.err")

empty_secs=$(printf '%s' "$classifier_out" | python3 -c '
import json, sys
d = json.load(sys.stdin)
print("yes" if d.get("sections") == [] else "no")
')
has_warn=$(printf '%s' "$classifier_out" | python3 -c '
import json, sys
d = json.load(sys.stdin)
print("yes" if "warn" in d else "no")
')
if [ "$empty_secs" != "yes" ] || [ "$has_warn" != "yes" ]; then
  echo "FAIL: FR-UP-2 no-conv-commit short-circuit broken (sections-empty=$empty_secs, warn=$has_warn)"
  printf '%s\n' "$classifier_out"
  exit 1
fi

# --- (b) FR-UP-3 — patch-fail guard documented + JSONL event shape ----------
# SKILL.md §7 step 5 must document: revert via git checkout, append JSONL
# `patch_dropped` event with `failed_checks`, /reflect finding, release proceeds.
if ! grep -q '"event":"patch_dropped"' "$SKILL_MD"; then
  echo "FAIL: SKILL.md missing FR-UP-3 patch_dropped JSONL event contract"
  exit 1
fi
if ! grep -q 'rubric_blocker_fail' "$SKILL_MD"; then
  echo "FAIL: SKILL.md missing FR-UP-3 rubric_blocker_fail reason code"
  exit 1
fi
if ! grep -q 'git checkout -- .*readme-path' "$SKILL_MD"; then
  echo "FAIL: SKILL.md missing FR-UP-3 working-tree revert contract"
  exit 1
fi

echo "PASS: update_hook_dry_run — FR-UP-2 warn+empty-sections and FR-UP-3 patch-drop contract hold"
exit 0
