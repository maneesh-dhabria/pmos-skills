#!/usr/bin/env bash
# run-tests.sh — aggregate test harness for /interview-feedback (pmos-managerkit).
# Runs every script's --selftest plus a skill-level smoke (anchors + DOM-contract coherence).
# bash-3.2-safe. Exits non-zero on the first failing suite.
set -euo pipefail

SELF="${BASH_SOURCE[0]:-$0}"
# Resolve the skill dir (parent of tests/), with a fallback if BASH_SOURCE is empty.
TESTS_DIR="$(cd "$(dirname "$SELF")" 2>/dev/null && pwd || true)"
if [ -z "$TESTS_DIR" ] || [ ! -f "$TESTS_DIR/run-tests.sh" ]; then
  d="$PWD"
  while [ "$d" != "/" ]; do
    if [ -f "$d/tests/run-tests.sh" ] && [ -f "$d/SKILL.md" ]; then TESTS_DIR="$d/tests"; break; fi
    d="$(dirname "$d")"
  done
fi
SKILL_DIR="$(cd "$TESTS_DIR/.." && pwd)"
SCRIPTS="$SKILL_DIR/scripts"
REF="$SKILL_DIR/reference"
# The guidelines corpus + skeletons + rubric live in the plugin-shared substrate (story 260702-cqf).
GUIDE="$SKILL_DIR/../_shared/interview-guidelines"

fail() { echo "FAIL: $*" >&2; exit 1; }
pass=0

echo "== script selftests =="
bash    "$SCRIPTS/storage.sh"           --selftest || fail "storage.sh selftest";          pass=$((pass+1))
bash    "$SCRIPTS/transcribe.sh"        --selftest || fail "transcribe.sh selftest";       pass=$((pass+1))
node    "$SCRIPTS/check-citations.mjs"  --selftest || fail "check-citations.mjs selftest"; pass=$((pass+1))
node    "$SCRIPTS/fill-scorecard.mjs"   --selftest || fail "fill-scorecard.mjs selftest";  pass=$((pass+1))
node    "$SCRIPTS/questionnaire.mjs"    --selftest || fail "questionnaire.mjs selftest";   pass=$((pass+1))

echo "== transcribe clobber guard: a real run never destroys a curated transcript =="
# Without whisper/ffmpeg the script degrades (exit 3) before writing anything;
# with them it routes to transcript.whisper.txt (resolve_transcript_target,
# unit-tested in transcribe.sh --selftest). Either way a pre-existing curated
# transcript.refined.txt must survive byte-identical (F2/INV-4).
guard_tmp="$(mktemp -d 2>/dev/null || mktemp -d -t ifb-guard)"
mkdir -p "$guard_tmp/out"
printf 'Interviewer: shall we begin?\nCandidate: yes, thanks.\n' > "$guard_tmp/out/transcript.refined.txt"
before="$(shasum "$guard_tmp/out/transcript.refined.txt" | awk '{print $1}')"
IFB_MODEL_DIRS="$guard_tmp/empty" bash "$SCRIPTS/transcribe.sh" "$guard_tmp/nope.mp4" "$guard_tmp/out" >/dev/null 2>&1 || true
after="$(shasum "$guard_tmp/out/transcript.refined.txt" | awk '{print $1}')"
[ "$before" = "$after" ] || fail "transcribe clobbered an existing transcript.refined.txt"
rm -rf "$guard_tmp"
pass=$((pass+1))

echo "== skill-level smoke: DOM contract coherence =="
# The scorecard skeleton is THE contract; the rubric + notes skeleton must instantiate it.
grep -q 'data-card="scorecard"' "$GUIDE/scorecard-skeleton.html"        || fail "scorecard skeleton missing data-card anchor"
grep -q 'data-ref="round"'       "$GUIDE/reference-skeleton.html"        || fail "reference skeleton missing data-ref anchor"
grep -q 'data-card="scorecard"'  "$GUIDE/interviewer-effectiveness.html" || fail "rubric does not instantiate the scorecard contract"
grep -q 'data-output="interviewer-notes"' "$REF/interviewer-notes-skeleton.html" || fail "notes skeleton missing output anchor"
pass=$((pass+1))

echo "== skill-level smoke: absent-duration-anchor regression guard (story 260709-d0w, INV-5) =="
# A bundled guidelines/<archetype>/scorecard.html is the natural no-migration fixture for the
# absent-anchor path: it carries NO data-duration and NO data-budget, so Phase Score's duration
# prompt asks cold (header/inferred proposal) and coverage falls back to the round total exactly
# as it did before the anchor existed. Guard that these stay anchor-free so the degradation path
# cannot silently regress. (The duration/budget anchors are OPTIONAL + additive — story 260709-qfn.)
for card in "$GUIDE"/guidelines/*/scorecard.html; do
  ! grep -q 'data-duration' "$card" || fail "bundled scorecard unexpectedly carries data-duration: $card"
  ! grep -q 'data-budget'   "$card" || fail "bundled scorecard unexpectedly carries data-budget: $card"
done
# Phase Score must still read the anchor as PROPOSED-not-authority and preserve the defer-only prompt.
grep -q 'data-duration' "$SKILL_DIR/SKILL.md"          || fail "Phase Score does not read the data-duration anchor"
grep -q 'data-budget'   "$SKILL_DIR/SKILL.md"          || fail "Phase Score does not read per-dim data-budget anchors"
grep -q '<!-- defer-only: free-form -->' "$SKILL_DIR/SKILL.md" || fail "duration prompt lost its defer-only tag"
pass=$((pass+1))

echo "== skill-level smoke: rubric has 8 weighted dimensions summing to 100 =="
ndim="$(grep -o 'data-dim="[^"]*"' "$GUIDE/interviewer-effectiveness.html" | wc -l | tr -d ' ')"
[ "$ndim" = "8" ] || fail "rubric expected 8 data-dim sections, found $ndim"
sum="$(grep -o 'data-weight="[0-9]*"' "$GUIDE/interviewer-effectiveness.html" | grep -o '[0-9]*' | awk '{s+=$1} END{print s}')"
[ "$sum" = "100" ] || fail "rubric weights expected to sum to 100, got $sum"
pass=$((pass+1))

echo "== skill-level smoke: SKILL.md non-interactive contract =="
grep -q '<!-- non-interactive-block:start -->' "$SKILL_DIR/SKILL.md" || fail "SKILL.md missing non-interactive block"
grep -q 'non-interactive: refused'              "$SKILL_DIR/SKILL.md" || fail "SKILL.md missing tier-3 refused marker"
pass=$((pass+1))

echo "interview-feedback tests: $pass/$pass PASS"
