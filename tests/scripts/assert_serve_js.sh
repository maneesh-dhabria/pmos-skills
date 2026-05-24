#!/usr/bin/env bash
# assert_serve_js.sh — smoke-test the html-authoring serve.js shim.
# Boots serve.js against a tiny fixture, validates Content-Type + 200 on a
# couple of file shapes, and shuts it down. Exits 0 on PASS, non-zero on FAIL.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVE="$REPO_ROOT/plugins/pmos-toolkit/skills/_shared/html-authoring/assets/serve.js"

if [[ ! -f "$SERVE" ]]; then
  echo "FAIL: serve.js not found at $SERVE" >&2
  exit 1
fi

FIX="$(mktemp -d -t serve-js-fixture.XXXXXX)"
trap 'rm -rf "$FIX"; if [[ -n "${SERVE_PID:-}" ]]; then kill "$SERVE_PID" 2>/dev/null || true; fi' EXIT

# Fixture: a tiny html doc, a json, an svg, an unknown extension.
cat >"$FIX/index.html" <<'HTML'
<!doctype html><html><body>fixture</body></html>
HTML
cat >"$FIX/_index.json" <<'JSON'
{"artifacts":[]}
JSON
cat >"$FIX/diagram.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>
SVG
echo "raw" >"$FIX/notes.txt"

cd "$FIX"
PID_FILE="$(mktemp -t serve-pid.XXXXXX)"
# Use --pid-file (FR-44 JSON format). --port-file remains a deprecated alias.
node "$SERVE" --pid-file "$PID_FILE" >/dev/null 2>&1 &
SERVE_PID=$!

# Wait up to 3s for the pid file to materialize (port-fallback may scan a few).
for _ in $(seq 1 30); do
  [[ -s "$PID_FILE" ]] && break
  sleep 0.1
done
# Extract port from JSON {pid, port, started_at} without requiring jq.
PORT="$(node -e "const fs=require('fs');try{const d=JSON.parse(fs.readFileSync('$PID_FILE','utf8'));process.stdout.write(String(d.port||''));}catch(e){}" 2>/dev/null || true)"
if [[ -z "$PORT" ]]; then
  echo "FAIL: serve.js did not write a port to $PID_FILE within 3s" >&2
  exit 1
fi

base="http://127.0.0.1:$PORT"

check() {
  local label="$1" path="$2" want_code="$3" want_ctype_substr="$4"
  local hdr code ctype
  hdr="$(curl -sIm 5 "$base$path" || true)"
  code="$(printf '%s\n' "$hdr" | awk 'NR==1{print $2}')"
  ctype="$(printf '%s\n' "$hdr" | awk -F': ' 'tolower($1)=="content-type"{print $2}' | tr -d '\r' | head -1)"
  if [[ "$code" != "$want_code" ]]; then
    echo "FAIL: $label expected $want_code got '$code' for $path" >&2; return 1
  fi
  if [[ -n "$want_ctype_substr" && "$ctype" != *"$want_ctype_substr"* ]]; then
    echo "FAIL: $label expected Content-Type to contain '$want_ctype_substr', got '$ctype'" >&2; return 1
  fi
  echo "PASS: $label ($code, $ctype)"
}

check "index.html" "/index.html" "200" "text/html"
check "_index.json" "/_index.json" "200" "application/json"
check "svg" "/diagram.svg" "200" "image/svg+xml"
check "txt fallback" "/notes.txt" "200" "text/plain"
check "404" "/missing" "404" ""

echo "ALL PASS (port=$PORT)"
