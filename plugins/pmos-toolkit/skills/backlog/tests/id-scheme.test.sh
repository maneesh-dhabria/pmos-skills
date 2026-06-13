#!/usr/bin/env bash
# id-scheme.test.sh — behavioral checks for the concurrency-safe id scheme
# (epic 0020 / story 0021, extended by 0612-jjs / story 0612-d14): coordination-
# free year-prefixed <YYMMDD>-<rand3> minting, the triple-accept validator (legacy
# 4-digit + prior <MMDD>-<rand3> + current <YYMMDD>-<rand3>), the round-trip
# through filename/branch/claim-lock, and the define-merge id-uniqueness gate.
# Run: bash id-scheme.test.sh
set -uo pipefail

DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]:-$0}")/.." &>/dev/null && pwd)"          # backlog skill dir
ROOT="$(cd -- "$DIR/../../../.." &>/dev/null && pwd)"                                  # repo root
MINT="$DIR/scripts/mint-id.mjs"
GATE="$ROOT/plugins/pmos-toolkit/skills/feature-sdlc/scripts/check-id-uniqueness.mjs"
fail=0
chk() { if eval "$2" >/dev/null 2>&1; then printf 'ok   %s\n' "$1"; else printf 'FAIL %s\n' "$1"; fail=1; fi }
chkfail() { if eval "$2" >/dev/null 2>&1; then printf 'FAIL %s (expected non-zero)\n' "$1"; fail=1; else printf 'ok   %s\n' "$1"; fi }

# --- existence ---
chk "mint-id.mjs exists"                 "[ -f '$MINT' ]"
chk "check-id-uniqueness.mjs exists"     "[ -f '$GATE' ]"
chk "minter makes no banned PRNG call"   "! grep -qE 'Math\\.random\\(' '$MINT'"
chk "minter sources crypto"              "grep -q \"from 'node:crypto'\" '$MINT'"

# --- format (AC1) ---
ID1="$(node "$MINT")"
chk "minted id matches <YYMMDD>-<rand3>"  "printf '%s' '$ID1' | grep -Eq '^[0-9]{6}-[0-9a-hj-km-np-tv-z]{3}$'"
chk "minted id excludes look-alikes iou" "! printf '%s' '${ID1#*-}' | grep -q '[ilou]'"

# --- two parallel mints differ (AC1: coordination-free, no shared counter) ---
A="$(node "$MINT")"; B="$(node "$MINT")"; C="$(node "$MINT")"
chk "parallel mints differ (A!=B!=C)"    "[ \"$A\" != \"$B\" ] && [ \"$B\" != \"$C\" ] && [ \"$A\" != \"$C\" ]"

# --- triple-accept validator accepts all three forms, rejects garbage (AC2/AC3) ---
chk "validator accepts legacy 0019"      "node '$MINT' validate 0019"
chk "validator accepts legacy 0001"      "node '$MINT' validate 0001"
chk "validator accepts current MMDD-rand3" "node '$MINT' validate 0612-k3f"   # regression guard: the prior <MMDD>-<rand3> arm must survive the 4→6 extension
chk "validator accepts new id"           "node '$MINT' validate '$ID1'"
chkfail "validator rejects look-alike iou" "node '$MINT' validate 0612-iou"
chkfail "validator rejects 3-digit"      "node '$MINT' validate 012"
chkfail "validator rejects bare word"    "node '$MINT' validate garbage"
chkfail "validator rejects empty"        "node '$MINT' validate ''"

# --- round-trip: id → filename / branch / claim-lock (AC5) ---
chk "id is git-branch-safe (define/feat)" "git check-ref-format --branch 'define/$ID1' && git check-ref-format --branch 'feat/$ID1'"
SLUG="concurrency-safe-ids"
chk "id round-trips into {id}-{slug}.md"  "printf '%s' '$ID1-$SLUG.md' | grep -Eq '^[0-9]{6}-[0-9a-hj-km-np-tv-z]{3}-[a-z0-9-]+\.md$'"
chk "claim-lock filename is opaque-safe"  "printf '%s' '$ID1.lock' | grep -Eq '^[0-9]{6}-[0-9a-hj-km-np-tv-z]{3}\.lock$'"

# --- id-uniqueness gate: clean vs duplicate (AC3) ---
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
# legacy + new coexistence, all unique → clean
: > "$TMP/0019-book-summary.md"; : > "$TMP/$ID1-$SLUG.md"; : > "$TMP/0612-k3f-other.md"
chk "post-merge clean on unique legacy+new" "node '$GATE' post-merge '$TMP'"
# reproduce the 0016 incident: two files declare the same id → loud refusal (exit 3)
: > "$TMP/0016-frameworks-browse-ux.md"; : > "$TMP/0016-book-summary-skill.md"
chkfail "post-merge refuses duplicate id 0016" "node '$GATE' post-merge '$TMP'"
# capture first (pipefail would otherwise let the gate's exit-3 poison the grep pipeline)
GATE_OUT="$(node "$GATE" post-merge "$TMP" 2>&1 || true)"
chk "refusal names the offending id 0016" "printf '%s' \"\$GATE_OUT\" | grep -q 0016"

[ "$fail" -eq 0 ] && printf '\nPASS — id-scheme checks green\n' || printf '\nFAIL — id-scheme checks have failures\n'
exit "$fail"
