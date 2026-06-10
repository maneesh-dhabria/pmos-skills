#!/usr/bin/env bash
# simulated_reader_contract.sh — FR-SR-3 substring-validation contract test.
# Asserts:
#   1. evaluator's valid quote substring-matches the fixture README → pass.
#   2. adopter's empty friction is parseable (theater-check input).
#   3. contributor's altered quote does NOT substring-match the fixture README.
# (The parent-side rejection of (3) — drop-with-warn — is documented in
# SKILL.md #simulated-reader; this harness verifies the stub itself produces
# the contract-triggering shape.)
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STUB="$HERE/../mocks/simulated_reader_stub.sh"
README="$HERE/../fixtures/rubric/strong/01_hero-line.md"

[[ -x "$STUB" ]] || { echo "FAIL: stub not executable"; exit 1; }
[[ -f "$README" ]] || { echo "FAIL: fixture README missing"; exit 1; }

readme_text=$(<"$README")

# Test 1: evaluator quote substring-matches README
eval_quote=$(bash "$STUB" --persona=evaluator "$README" | python3 -c "import json,sys; print(json.load(sys.stdin)['friction'][0]['quote'])")
if [[ "$readme_text" == *"$eval_quote"* ]]; then
  echo "PASS: evaluator quote substring-matches README"
else
  echo "FAIL: evaluator quote MISSING from README"; exit 1
fi

# Test 2: adopter empty friction is parseable
adopter_count=$(bash "$STUB" --persona=adopter "$README" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['friction']))")
if [[ "$adopter_count" == "0" ]]; then
  echo "PASS: adopter empty friction (theater-check trigger)"
else
  echo "FAIL: adopter friction not empty"; exit 1
fi

# Test 3: contributor altered quote does NOT substring-match
contrib_quote=$(bash "$STUB" --persona=contributor "$README" | python3 -c "import json,sys; print(json.load(sys.stdin)['friction'][0]['quote'])")
if [[ "$readme_text" == *"$contrib_quote"* ]]; then
  echo "FAIL: contributor altered quote unexpectedly substring-matches README"; exit 1
else
  echo "PASS: contributor altered quote does NOT match (parent will hard-fail FR-SR-3)"
fi

# Test 4 (T5/T9): the 4th persona returning-user-navigator dispatches and
# returns a valid quote.
ret_quote=$(bash "$STUB" --persona=returning-user-navigator "$README" | python3 -c "import json,sys; print(json.load(sys.stdin)['friction'][0]['quote'])")
if [[ "$readme_text" == *"$ret_quote"* ]]; then
  echo "PASS: returning-user-navigator quote substring-matches README"
else
  echo "FAIL: returning-user-navigator quote MISSING from README"; exit 1
fi

# Test 5 (T3/T9): 5-Task dispatch — reviewer is the 5th call, exercised via
# READMER_REVIEWER_STUB env path. Validate JSON shape + ≥40-char quotes.
REVIEWER_STUB="$HERE/../mocks/reviewer_stub.sh"
[[ -x "$REVIEWER_STUB" ]] || { echo "FAIL: reviewer_stub.sh missing"; exit 1; }
reviewer_json=$(bash "$REVIEWER_STUB" "$README")
reviewer_count=$(printf '%s' "$reviewer_json" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert isinstance(d, list)
for x in d:
    assert len(x['quote']) >= 40, f\"reviewer quote too short: {len(x['quote'])}\"
print(len(d))
")
if [[ "$reviewer_count" == "2" ]]; then
  echo "PASS: reviewer dispatch returns 2 [J] findings (5-Task dispatch: 4 personas + 1 reviewer)"
else
  echo "FAIL: reviewer dispatch returned $reviewer_count findings (expected 2)"; exit 1
fi

# Test 6: SKILL.md #simulated-reader declares 5-Task dispatch + 4th persona.
SKILL_MD="$HERE/../../SKILL.md"
grep -qF '5 `Task` tool calls in ONE assistant response' "$SKILL_MD" \
  || { echo "FAIL: SKILL.md missing 5-Task dispatch declaration"; exit 1; }
grep -qF 'returning-user-navigator' "$SKILL_MD" \
  || { echo "FAIL: SKILL.md missing returning-user-navigator persona name"; exit 1; }
echo "PASS: SKILL.md declares 5-Task dispatch + 4th persona"

echo "All 5 contract assertions pass."
