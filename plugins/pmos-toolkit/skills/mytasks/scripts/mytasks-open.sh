#!/bin/sh
# mytasks-open.sh — Linux launcher for the /mytasks web UI.
# Precheck node, reuse a live serve.js via .pmos-serve.pid, else spawn fresh, open the browser.
# Zero-dep; uses node (already prechecked) for the tiny JSON parse. bash-3.2-safe (POSIX sh).
set -eu
# Resolve the script dir robustly (sourced/relative/symlinked invocations).
SELF="${0:-}"
[ -n "$SELF" ] || SELF="$PWD/mytasks-open.sh"
cd "$(dirname "$SELF")"
if ! command -v node >/dev/null 2>&1; then
  echo "mytasks-open: node not found — install Node >=18 (https://nodejs.org)" >&2
  exit 127
fi
PID_FILE=".pmos-serve.pid"
PORT=""
if [ -f "$PID_FILE" ]; then
  pid=$(node -e 'try{console.log(JSON.parse(require("fs").readFileSync(".pmos-serve.pid","utf8")).pid)}catch(e){}' 2>/dev/null || true)
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    PORT=$(node -e 'try{console.log(JSON.parse(require("fs").readFileSync(".pmos-serve.pid","utf8")).port)}catch(e){}' 2>/dev/null || true)
    echo "mytasks-open: reusing serve.js at port $PORT" >&2
  else
    rm -f "$PID_FILE"
  fi
fi
if [ -z "$PORT" ]; then
  nohup node serve.js --port=0 --pid-file="$PID_FILE" --idle=300 >/dev/null 2>&1 &
  for i in 1 2 3 4 5 6 7 8 9 10; do [ -s "$PID_FILE" ] && break; sleep 0.2; done
  PORT=$(node -e 'try{console.log(JSON.parse(require("fs").readFileSync(".pmos-serve.pid","utf8")).port)}catch(e){}' 2>/dev/null || true)
  [ -z "$PORT" ] && { echo "mytasks-open: serve.js did not write pid file" >&2; exit 1; }
fi
URL="http://127.0.0.1:$PORT/"
echo "mytasks-open: opening $URL" >&2
OPENER="${BROWSER:-}"
[ -z "$OPENER" ] && { command -v xdg-open >/dev/null 2>&1 && OPENER=xdg-open || OPENER=sensible-browser; }
"$OPENER" "$URL"
