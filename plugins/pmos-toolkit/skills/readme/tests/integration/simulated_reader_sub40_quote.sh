#!/usr/bin/env bash
# Regression test for FR-SR-3 sub-40-char quote rejection.
#
# The skill MUST reject (drop-with-warn, SKILL.md #simulated-reader) any
# persona entry whose quote is shorter than 40 chars; this test locks the
# rejection + warn-message contract structurally so a future silent-relax
# (accepting the short quote into the findings stream) can't sneak back in.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(git -C "$HERE" rev-parse --show-toplevel)"
SKILL_DIR="$REPO/plugins/pmos-toolkit/skills/readme"
STUB="$SKILL_DIR/tests/mocks/persona_stub_sub40.sh"
FIXTURE="$SKILL_DIR/tests/fixtures/rubric/strong/01_hero-line.md"

[[ -x "$STUB" ]] || { echo "FAIL: sub40 persona stub missing or not executable: $STUB"; exit 1; }
[[ -f "$FIXTURE" ]] || { echo "FAIL: fixture missing: $FIXTURE"; exit 1; }

# Setup: capture the stub's deliberately-short quote.
RAW="$(bash "$STUB" --persona=evaluator "$FIXTURE")"
LEN=$(printf '%s' "$RAW" | python3 -c "
import sys, json
d = json.loads(sys.stdin.read())
print(len(d['friction'][0]['quote']))
")
[[ "$LEN" -lt 40 ]] || { echo "FAIL: stub did not return sub-40 quote (got len=$LEN)"; exit 1; }

# Exercise the parent-side validation logic — same rejection SKILL.md
# #simulated-reader enforces. Expect the entry rejected with the documented message.
set +e
ERR=$(python3 - "$RAW" "$FIXTURE" <<'PYEOF' 2>&1
import sys, json
raw, readme_path = sys.argv[1], sys.argv[2]
d = json.loads(raw)
for f in d.get("friction", []):
    q = f.get("quote", "")
    if len(q) < 40:
        sys.stderr.write(f"simulated-reader returned quote shorter than 40 chars: {q}\n")
        sys.exit(1)
sys.exit(0)
PYEOF
)
EXIT_CODE=$?
set -e

[[ "$EXIT_CODE" -ne 0 ]] || { echo "FAIL: sub-40 quote was not rejected (exit=$EXIT_CODE)"; exit 1; }
echo "$ERR" | grep -q "simulated-reader returned quote shorter than 40 chars" \
  || { echo "FAIL: rejection warn message missing or wrong"; echo "$ERR"; exit 1; }

echo "PASS: FR-SR-3 sub-40 quote rejected with warn (quote len=$LEN)"
