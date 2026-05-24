#!/usr/bin/env bash
# launcher.test.sh — exercise the platform-appropriate comments-open launcher.
# Covers: (a) node-missing exit 127, (b) cold start writes pid+port,
# (c) reuse path logs port reuse, (d) stale pid cleanup respawns fresh.
# Windows .bat: skipped on macOS/Linux with TODO note (FR-43).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ASSETS="$REPO_ROOT/plugins/pmos-toolkit/skills/_shared/html-authoring/assets"

case "$(uname)" in
  Darwin) LAUNCHER_SRC="$ASSETS/comments-open.command" ;;
  Linux)  LAUNCHER_SRC="$ASSETS/comments-open.sh" ;;
  MINGW*|MSYS*|CYGWIN*)
    echo "SKIP: Windows .bat launcher not exercised here (TODO: add WSL/cmd.exe harness)"
    exit 0
    ;;
  *) echo "SKIP: unknown platform $(uname)"; exit 0 ;;
esac

[[ -f "$LAUNCHER_SRC" ]] || { echo "FAIL: launcher missing at $LAUNCHER_SRC" >&2; exit 1; }
[[ -x "$LAUNCHER_SRC" ]] || { echo "FAIL: launcher not executable: $LAUNCHER_SRC" >&2; exit 1; }

WORK="$(mktemp -d -t launcher-test.XXXXXX)"
SERVE_PID=""
cleanup() {
  if [[ -n "$SERVE_PID" ]]; then kill "$SERVE_PID" 2>/dev/null || true; fi
  if [[ -f "$WORK/.pmos-serve.pid" ]]; then
    pid=$(node -e 'try{console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).pid)}catch(e){}' "$WORK/.pmos-serve.pid" 2>/dev/null || true)
    [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

# Stage the feature folder: launcher + assets/serve.js + sample artifact.
mkdir -p "$WORK/assets"
cp "$ASSETS/serve.js" "$WORK/assets/serve.js"
cp "$LAUNCHER_SRC" "$WORK/comments-open"
chmod +x "$WORK/comments-open"
cat >"$WORK/spec.html" <<'HTML'
<!doctype html><title>spec</title><body>hi</body>
HTML

# Stub browser opener so no real browser launches.
STUBDIR="$WORK/.stub-bin"
mkdir -p "$STUBDIR"
cat >"$STUBDIR/fake-open" <<'STUB'
#!/bin/sh
echo "fake-open: $*" >&2
exit 0
STUB
chmod +x "$STUBDIR/fake-open"

# (a) Node-missing path → exit 127, grep-able stderr.
echo "--- case (a) node-missing"
set +e
out=$(cd "$WORK" && PATH=/nowhere BROWSER="$STUBDIR/fake-open" "$WORK/comments-open" spec.html 2>&1)
rc=$?
set -e
if [[ "$rc" != "127" ]]; then echo "FAIL: (a) expected exit 127 got $rc — out: $out" >&2; exit 1; fi
echo "$out" | grep -qi "node not found" || { echo "FAIL: (a) stderr lacks 'node not found': $out" >&2; exit 1; }
echo "PASS: (a) node-missing exit 127"

# (b) Cold start → pid file with pid+port+started_at, browser stub invoked.
echo "--- case (b) cold start"
set +e
out=$(cd "$WORK" && BROWSER="$STUBDIR/fake-open" "$WORK/comments-open" spec.html 2>&1)
rc=$?
set -e
if [[ "$rc" != "0" ]]; then echo "FAIL: (b) expected exit 0 got $rc — out: $out" >&2; exit 1; fi
[[ -s "$WORK/.pmos-serve.pid" ]] || { echo "FAIL: (b) pid file missing" >&2; exit 1; }
node -e '
  const d=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
  if(!Number.isInteger(d.pid)||!Number.isInteger(d.port)||!d.started_at){
    console.error("bad pid json",JSON.stringify(d));process.exit(1);
  }
' "$WORK/.pmos-serve.pid" || { echo "FAIL: (b) pid json malformed" >&2; exit 1; }
SERVE_PID=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).pid)' "$WORK/.pmos-serve.pid")
echo "$out" | grep -q "fake-open:" || { echo "FAIL: (b) browser stub not invoked: $out" >&2; exit 1; }
echo "PASS: (b) cold start pid=$SERVE_PID"

# (c) Reuse path → second invocation logs reuse, same pid.
echo "--- case (c) reuse"
set +e
out=$(cd "$WORK" && BROWSER="$STUBDIR/fake-open" "$WORK/comments-open" spec.html 2>&1)
rc=$?
set -e
[[ "$rc" == "0" ]] || { echo "FAIL: (c) exit $rc — $out" >&2; exit 1; }
echo "$out" | grep -qi "reusing serve.js" || { echo "FAIL: (c) no reuse log: $out" >&2; exit 1; }
PID2=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).pid)' "$WORK/.pmos-serve.pid")
[[ "$PID2" == "$SERVE_PID" ]] || { echo "FAIL: (c) pid changed $SERVE_PID -> $PID2" >&2; exit 1; }
echo "PASS: (c) reuse same pid=$PID2"

# (d) Stale cleanup → SIGKILL serve (skip its cleanup handler so the pid file
# survives → genuinely stale), then invoke launcher → fresh spawn expected.
echo "--- case (d) stale cleanup"
kill -9 "$SERVE_PID" 2>/dev/null || true
for _ in $(seq 1 20); do
  kill -0 "$SERVE_PID" 2>/dev/null || break
  sleep 0.1
done
[[ -f "$WORK/.pmos-serve.pid" ]] || { echo "FAIL: (d) pid file vanished before stale-test" >&2; exit 1; }
set +e
out=$(cd "$WORK" && BROWSER="$STUBDIR/fake-open" "$WORK/comments-open" spec.html 2>&1)
rc=$?
set -e
[[ "$rc" == "0" ]] || { echo "FAIL: (d) exit $rc — $out" >&2; exit 1; }
PID3=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).pid)' "$WORK/.pmos-serve.pid")
[[ -n "$PID3" && "$PID3" != "$SERVE_PID" ]] || { echo "FAIL: (d) expected new pid, got '$PID3' (old=$SERVE_PID)" >&2; exit 1; }
kill -0 "$PID3" 2>/dev/null || { echo "FAIL: (d) new pid $PID3 not alive" >&2; exit 1; }
SERVE_PID="$PID3"
echo "PASS: (d) stale cleanup new pid=$PID3"

echo "ALL PASS"
