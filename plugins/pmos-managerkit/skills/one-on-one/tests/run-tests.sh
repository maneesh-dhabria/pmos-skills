#!/usr/bin/env bash
# run-tests.sh — the /one-on-one skill test suite. Runs every script's --selftest, a full end-to-end
# verb lifecycle against a throwaway store, and the independence grep (INV-2/3). Zero deps beyond bash
# + node. Run from anywhere.
#   tests/run-tests.sh            # full suite
#   tests/run-tests.sh --selftest # smoke: assert the scripts exist and self-test
set -euo pipefail
export LC_ALL=C

# Resolve dirs with a BASH_SOURCE fallback (repo bash-portability rule).
SRC="${BASH_SOURCE[0]:-$0}"
if [ -n "$SRC" ] && [ -f "$SRC" ]; then
  HERE="$(cd -- "$(dirname -- "$SRC")" && pwd)"
else
  HERE="$PWD"; while [ "$HERE" != "/" ] && [ ! -f "$HERE/run-tests.sh" ]; do HERE="$(dirname "$HERE")"; done
  [ -f "$HERE/run-tests.sh" ] || { echo "cannot locate test dir" >&2; exit 2; }
fi
SKILL="$(cd -- "$HERE/.." && pwd)"
S="$SKILL/scripts"
fail=0
ok()   { echo "  ok: $1"; }
bad()  { echo "  FAIL: $1" >&2; fail=1; }

# --- unit selftests ---
for lib in record-lib coach-lib plan; do
  node "$S/$lib.mjs" --selftest >/dev/null 2>&1 && ok "$lib --selftest" || bad "$lib --selftest"
done
for v in add note set log career overview; do
  node "$S/$v.mjs" --selftest >/dev/null 2>&1 && ok "$v --selftest" || bad "$v --selftest"
done

if [ "${1:-}" = "--selftest" ]; then
  [ "$fail" -eq 0 ] && { echo "run-tests.sh: SELFTEST PASS"; exit 0; } || { echo "run-tests.sh: SELFTEST FAIL" >&2; exit 1; }
fi

# --- end-to-end lifecycle against a throwaway store (never inside the repo) ---
STORE="$(mktemp -d -t oneonone-test.XXXXXX)"
trap 'rm -rf "$STORE"' EXIT
export PMOS_ONEONONES_DIR="$STORE"
H=jordan-lee
node "$S/add.mjs"  --handle $H --name "Jordan Lee" --role PM --cadence weekly --started 2026-04-01 --goal "Ship billing" >/dev/null
node "$S/note.mjs" --handle $H --text "wants a promotion path" --tag growth >/dev/null
node "$S/note.mjs" --handle $H --text "stuck on design review" --tag blocker >/dev/null
node "$S/set.mjs"  --handle $H --field perf --text "strong Q2" --date 2026-06-30 >/dev/null
node "$S/log.mjs"  --handle $H --date 2026-06-01 --topic "sprint" --action "jordan|open|file the RFC" >/dev/null
node "$S/log.mjs"  --handle $H --date 2026-06-08 --topic "bugs" >/dev/null
node "$S/log.mjs"  --handle $H --date 2026-06-15 --topic "roadmap" >/dev/null
REC="$STORE/$H.md"

# byte-stable round-trip of the live record via the lib
node -e 'import("'"$S"'/record-lib.mjs").then(m=>{const fs=require("fs");const t=fs.readFileSync(process.argv[1],"utf8");const r=m.serializeRecord(m.parseRecord(t));process.exit(r===m.serializeRecord(m.parseRecord(r))?0:1)})' "$REC" \
  && ok "live record round-trips byte-stably (AC1)" || bad "live record not byte-stable"

# note tag rendered, inbox populated
grep -q '^- \[growth\] wants a promotion path' "$REC" && ok "note --tag rendered (AC3)" || bad "note tag missing"
# perf feedback dated in header
grep -q '^- 2026-06-30: strong Q2' "$REC" && ok "set perf dated + honored --date (AC6)" || bad "set perf date wrong"
# sessions newest-first
[ "$(grep -n '### 2026-06-15' "$REC" | cut -d: -f1)" -lt "$(grep -n '### 2026-06-01' "$REC" | cut -d: -f1)" ] \
  && ok "sessions newest-first (AC5)" || bad "session order wrong"
# open action mirrored for stale tracking
grep -q '^- \[ \] (jordan) file the RFC — since 2026-06-01' "$REC" && ok "open action mirrored + dated" || bad "open action not mirrored"

# plan emits flags + a self-contained HTML artifact, human-first ordering, no token leak
PLAN_OUT="$(node "$S/plan.mjs" --handle $H --today 2026-07-05)"
echo "$PLAN_OUT" | grep -q 'status-creep' && echo "$PLAN_OUT" | grep -q 'stale action' && echo "$PLAN_OUT" | grep -q 'career-due' \
  && ok "plan raised all three deterministic flags (AC4/§H)" || bad "plan flags missing"
ART="$STORE/prep/$H-2026-07-05.html"
[ -f "$ART" ] && ok "plan wrote HTML prep artifact under store (AC4)" || bad "no prep artifact"
grep -q 'pmos:skill' "$ART" && ok "prep artifact carries pmos:skill meta" || bad "no pmos:skill meta"
! grep -q '{{' "$ART" && ok "prep artifact has no unsubstituted tokens" || bad "token leak in artifact"
[ "$(grep -n 'Human first' "$ART" | head -1 | cut -d: -f1)" -lt "$(grep -n 'Coached suggestions' "$ART" | head -1 | cut -d: -f1)" ] \
  && ok "prep artifact human-first ordering (§5)" || bad "prep ordering wrong"
# artifact is self-contained (offline): no external link/script/@import
grep -Eq '<(link|script)[^>]+(src|href)="https?:|@import' "$ART" && bad "prep artifact not offline (external ref)" || ok "prep artifact self-contained/offline"

# career stamps career_last_reviewed and clears the career-due flag
node "$S/career.mjs" --handle $H --date 2026-07-04 --vision "Staff PM" --short-term "own the migration" >/dev/null
grep -q '^career_last_reviewed: 2026-07-04' "$REC" && ok "career stamped review date (AC7)" || bad "career date not stamped"
node "$S/plan.mjs" --handle $H --today 2026-07-05 --no-html | grep -q 'career-due' && bad "career-due not cleared after career convo" || ok "career-due cleared after career convo"

# log with an empty body is refused (the NI DEFER is the skill's job; the script must not fabricate)
node "$S/log.mjs" --handle $H --date 2026-07-05 >/dev/null 2>&1 && bad "empty log did not error" || ok "empty session log refused (AC5 / no fabrication)"

# INV-4: a store inside the repo is refused
if PMOS_ONEONONES_DIR="$SKILL/scripts" node "$S/note.mjs" --handle $H --text x >/dev/null 2>&1; then
  bad "INV-4: write inside repo was NOT refused"
else ok "INV-4: refuses to write inside the repo working tree"; fi

# --- independence grep (AC9 / INV-2, INV-3): no coupling to interview-feedback or /mytasks ---
# Scan the shippable surface (scripts + SKILL.md + reference corpus); exclude THIS test file, whose
# grep pattern literally contains the search terms. SKILL.md prose that *documents* the independence
# (INV-2/INV-3, "independent of", "reads no scorecard") is whitelisted below — only real coupling fails.
if grep -rniE 'interview-feedback|interview_feedback|scorecard|mytasks|my-tasks' "$SKILL" \
     --include=*.mjs --include=*.md --include=*.html --include=*.sh --exclude=run-tests.sh \
     | grep -viE 'independent|INV-2|INV-3|independence|not.*touch|never touch|no .*/mytasks|reads no scorecard|decoupled|imports nothing' ; then
  bad "independence grep: a real coupling to /interview-feedback or /mytasks was found"
else
  ok "independence grep clean (INV-2/INV-3): no interview-feedback/mytasks/scorecard coupling"
fi

echo ""
[ "$fail" -eq 0 ] && { echo "run-tests.sh: PASS"; exit 0; } || { echo "run-tests.sh: FAIL" >&2; exit 1; }
