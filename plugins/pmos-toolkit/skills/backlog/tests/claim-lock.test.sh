#!/usr/bin/env bash
# claim-lock.test.sh — structural + behavioral checks for the backlog story-claim lock.
# Mirrors the /magazine structure-test pattern. Run: bash claim-lock.test.sh
set -uo pipefail

DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]:-$0}")/.." &>/dev/null && pwd)"
LOCK="$DIR/scripts/claim-lock.cjs"
fail=0
chk() { # name, command
  if eval "$2" >/dev/null 2>&1; then printf 'ok   %s\n' "$1"; else printf 'FAIL %s\n' "$1"; fail=1; fi
}

chk "claim-lock.cjs exists"           "[ -f '$LOCK' ]"
chk "uses O_EXCL ('wx') open"         "grep -q \"'wx'\" '$LOCK'"
chk "default 4h stale-lease TTL"      "grep -q 'DEFAULT_STALE_MS = 4 \* 60 \* 60 \* 1000' '$LOCK'"
chk "exposes acquire/release/status/steal" "grep -q 'module.exports = {' '$LOCK' && grep -q 'acquire, steal, release, status' '$LOCK'"
chk "exposes reclaimableByHolder (own-holder reclaim)" "grep -q 'reclaimableByHolder' '$LOCK'"
chk "--selftest passes"               "node '$LOCK' --selftest"

# CLI smoke: acquire is exit 0, second acquire is exit 3 (contended), release is exit 0.
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
node "$LOCK" acquire "$TMP/claims" 0099 >/dev/null 2>&1
chk "CLI acquire exits 0"             "[ \$? -eq 0 ]"
node "$LOCK" acquire "$TMP/claims" 0099 >/dev/null 2>&1; rc=$?
chk "CLI second acquire exits 3 (contended)" "[ $rc -eq 3 ]"
node "$LOCK" release "$TMP/claims" 0099 >/dev/null 2>&1
chk "CLI release exits 0"             "[ \$? -eq 0 ]"

# CLI smoke: own-holder reclaim (epic 0612-w4e D3). A fresh lock held by MY OWN
# holder is reclaimed immediately (exit 0, no TTL wait — the crashed-loop-tick
# self-resume); a fresh lock held by a FOREIGN holder is still contended (exit 3).
node "$LOCK" acquire "$TMP/claims" 0100 --holder loop:sess-1 >/dev/null 2>&1
node "$LOCK" acquire "$TMP/claims" 0100 --holder loop:sess-1 >/dev/null 2>&1; rc=$?
chk "CLI own-holder re-acquire exits 0 (reclaimed, no TTL wait)" "[ $rc -eq 0 ]"
node "$LOCK" acquire "$TMP/claims" 0100 --holder loop:sess-OTHER >/dev/null 2>&1; rc=$?
chk "CLI foreign-holder acquire exits 3 (contended)" "[ $rc -eq 3 ]"
node "$LOCK" release "$TMP/claims" 0100 >/dev/null 2>&1

# ESM-host regression (epic 260613-7tm D3). Node decides a script's module system
# from the nearest package.json to the SCRIPT FILE, not cwd. A host repo whose
# package.json declares {"type":"module"} parses a bare `.js` lock as ESM and it
# dies with "require is not defined in ES module scope" — silently disabling the
# Loop-2 claim/reconcile machinery. Reproduce by copying the lock into a temp tree
# rooted by an ESM package.json and running it there. basename("$LOCK") follows the
# .js->.cjs rename automatically: a `.cjs` extension is CommonJS under any host type.
ESMTMP="$(mktemp -d)"; trap 'rm -rf "$TMP" "$ESMTMP"' EXIT
printf '{"type":"module"}\n' > "$ESMTMP/package.json"
mkdir -p "$ESMTMP/scripts"
cp "$LOCK" "$ESMTMP/scripts/$(basename "$LOCK")"
ESMLOCK="$ESMTMP/scripts/$(basename "$LOCK")"
node "$ESMLOCK" --selftest >/dev/null 2>&1
chk "ESM-host --selftest exits 0 (.cjs immune to host type:module)" "[ \$? -eq 0 ]"
node "$ESMLOCK" acquire "$ESMTMP/claims" 0199 >/dev/null 2>&1
chk "ESM-host CLI acquire exits 0"   "[ \$? -eq 0 ]"
node "$ESMLOCK" release "$ESMTMP/claims" 0199 >/dev/null 2>&1
chk "ESM-host CLI release exits 0"   "[ \$? -eq 0 ]"

# Structural guard (epic 260613-7tm D4): every scaffolded backlog script carries an
# explicit module-system extension — no bare `.js` may survive in scripts/.
chk "no bare .js in backlog/scripts/ (explicit module-system ext)" "! ls '$DIR/scripts/'*.js >/dev/null 2>&1"

if [ "$fail" -eq 0 ]; then echo "claim-lock.test.sh: PASS"; else echo "claim-lock.test.sh: FAIL"; exit 1; fi
