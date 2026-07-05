#!/usr/bin/env bash
# retheme-corpus.test.sh — the /primer corpus re-theme CLI: refreshes each bundled primer's INLINED
# html-authoring substrate CSS to the current style.css (+ comments.css), marker-scoped so the primer
# body <main> stays byte-identical, and idempotent. Asserts the four AC5 cases:
#   (a) the marker-matched substrate block is replaced with the CURRENT style.css;
#   (b) the body <main>…</main> bytes are unchanged;
#   (c) a second run is byte-idempotent (no-op);
#   (d) a file lacking the substrate marker triggers a LOUD non-zero error.
# Cases (a)-(d) are exercised in-memory by the CLI's own --selftest; this wrapper additionally proves
# them end-to-end against a real corpus file + a synthetic missing-marker fixture. Run from anywhere.
# Deps: bash >= 3.2, node.
set -euo pipefail

# Resolve this script's dir with a BASH_SOURCE fallback (repo bash-portability rule).
SRC="${BASH_SOURCE[0]:-$0}"
if [ -n "$SRC" ] && [ -f "$SRC" ]; then
  HERE="$(cd -- "$(dirname -- "$SRC")" && pwd)"
else
  HERE="$PWD"
  while [ "$HERE" != "/" ] && [ ! -f "$HERE/retheme-corpus.test.sh" ]; do HERE="$(dirname "$HERE")"; done
  [ -f "$HERE/retheme-corpus.test.sh" ] || { echo "cannot locate test dir" >&2; exit 2; }
fi
SKILL_DIR="$(cd -- "$HERE/.." && pwd)"
SCRIPT="$SKILL_DIR/scripts/retheme-corpus.mjs"
PRIMERS="$SKILL_DIR/data/primers"

if [ "${1:-}" = "--selftest" ]; then
  [ -f "$SCRIPT" ] && echo "SELFTEST PASS: found $SCRIPT" && exit 0
  echo "SELFTEST FAIL: no retheme-corpus.mjs at $SCRIPT" >&2; exit 1
fi
[ -f "$SCRIPT" ] || { echo "ERROR: no retheme-corpus.mjs at $SCRIPT" >&2; exit 2; }
[ -d "$PRIMERS" ] || { echo "ERROR: no data/primers dir at $PRIMERS (corpus not transplanted?)" >&2; exit 2; }

fail=0

# --- the CLI's own in-memory selftest: the four AC5 cases (a)-(d) ---
node "$SCRIPT" --selftest >/dev/null || { echo "  FAIL: retheme-corpus.mjs --selftest failed" >&2; fail=1; }

# --- it must rebuild the substrate block with the render.js assembly (marker-scoped, not first <style>) ---
grep -q "pmos-toolkit html-authoring substrate" "$SCRIPT" \
  || { echo "  FAIL: CLI does not key off the substrate header-comment marker" >&2; fail=1; }
grep -q "/\* --- comments.css --- \*/" "$SCRIPT" \
  || { echo "  FAIL: CLI does not assemble style.css + comments.css the way render.js does" >&2; fail=1; }

# --- (a)+(b)+(c) end-to-end on a SYNTHETIC stale fixture (a real file plus a stale substrate block).
#     We do NOT assume the shipped corpus is stale — after this story it is on the current theme, and
#     stays so (idempotent). So build a known-stale file on disk, whose <main> carries a sentinel, and
#     drive the real CLI over it: current theme lands, <main> byte-unchanged, second run a no-op. ---
WORK="$(mktemp -d -t primer-retheme.XXXXXX)"
trap 'rm -rf "$WORK"' EXIT

BODY_SENTINEL='<main class="pmos-artifact-body" data-pmos-role="body">
<h1>Fixture body — must survive © 2026 &amp; verbatim</h1>
<p>#f8f5ef appears here in prose and must NOT be treated as CSS.</p>
</main>'
{
  printf '<!doctype html>\n<head>\n  <style>\n'
  printf '/* pmos-toolkit html-authoring substrate — STALE Mono Minimal snapshot */\n'
  printf ':root { --pmos-bg: #fafafa; --pmos-accent: #c2410c; }\n'
  printf '/* --- comments.css --- */\n/* stale comments.css */\n</style>\n</head>\n'
  printf '%s\n' "$BODY_SENTINEL"
} > "$WORK/stale.html"

# --check must NOT mutate the file and must flag the pending change.
node "$SCRIPT" --check "$WORK/stale.html" | grep -q "WOULD-CHANGE" \
  || { echo "  FAIL: --check did not flag the stale fixture" >&2; fail=1; }
grep -q 'STALE Mono Minimal' "$WORK/stale.html" \
  || { echo "  FAIL: --check mutated the file (must be a dry run)" >&2; fail=1; }

# body <main>…</main> extractor
body_of() { node -e 'const fs=require("fs");const h=fs.readFileSync(process.argv[1],"utf8");const a=h.indexOf("<main");const b=h.indexOf("</main>");process.stdout.write(a<0||b<0?"":h.slice(a,b+7))' "$1"; }
BODY_BEFORE="$(body_of "$WORK/stale.html")"

# real transform (writes the file)
node "$SCRIPT" "$WORK/stale.html" >/dev/null
grep -q '#f8f5ef' "$WORK/stale.html" || { echo "  FAIL: current Editorial Technical theme (#f8f5ef) not present after retheme" >&2; fail=1; }
grep -Eq -- '--pmos-bg:[[:space:]]*#fafafa' "$WORK/stale.html" && { echo "  FAIL: stale Mono Minimal --pmos-bg #fafafa still present" >&2; fail=1; }
grep -q 'STALE Mono Minimal' "$WORK/stale.html" && { echo "  FAIL: stale substrate marker text survived the retheme" >&2; fail=1; }
BODY_AFTER="$(body_of "$WORK/stale.html")"
[ -n "$BODY_BEFORE" ] && [ "$BODY_BEFORE" = "$BODY_AFTER" ] \
  || { echo "  FAIL: primer body <main> changed during retheme (INV-5 violated)" >&2; fail=1; }

# --- (c) idempotence: a second run is a byte-for-byte no-op ---
cp "$WORK/stale.html" "$WORK/after1.html"
node "$SCRIPT" "$WORK/stale.html" >/dev/null
cmp -s "$WORK/after1.html" "$WORK/stale.html" \
  || { echo "  FAIL: second run was not byte-idempotent" >&2; fail=1; }

# --- AC6 guard: the SHIPPED corpus is already on the current theme — a --check over all 61 must
#     report zero pending changes and zero missing markers (proves the committed refresh + idempotence). ---
CHECK_OUT="$(node "$SCRIPT" --check "$PRIMERS"/*.html)"
echo "$CHECK_OUT" | grep -q "WOULD-CHANGE" \
  && { echo "  FAIL: shipped corpus is not fully on the current theme (--check flagged a file)" >&2; fail=1; }
echo "$CHECK_OUT" | grep -Eq "0 missing-marker" \
  || { echo "  FAIL: some shipped corpus file lacks the substrate marker" >&2; fail=1; }

# --- (d) a file with NO substrate marker must fail loud (non-zero) and name the file ---
printf '<!doctype html><head><style>/* unrelated */body{}</style></head><main>x</main>' > "$WORK/nomarker.html"
if node "$SCRIPT" "$WORK/nomarker.html" >/dev/null 2>"$WORK/err.txt"; then
  echo "  FAIL: missing-marker file did not cause a non-zero exit" >&2; fail=1
else
  grep -q "nomarker.html" "$WORK/err.txt" || { echo "  FAIL: missing-marker error did not name the offending file" >&2; fail=1; }
fi

if [ "$fail" -eq 0 ]; then
  echo "retheme-corpus.test.sh: PASS"
else
  echo "retheme-corpus.test.sh: FAIL" >&2
  exit 1
fi
