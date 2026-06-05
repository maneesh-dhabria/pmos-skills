#!/usr/bin/env bash
# T16 out-of-process test — inline-comments schema refuse-load.
#
# Embeds an inline pmos-comments block with schema: 99 (v2.58.0 — sidecar
# retired), invokes the CLI resolver, asserts:
#   (f1) exit code is 64
#   (f2) stderr matches /schema=99 is newer than \/comments/
#
# Spec refs: E4, S3, T16.

set -uo pipefail

# BASH_SOURCE fallback for non-canonical invocation.
SRC="${BASH_SOURCE[0]:-$0}"
if [ -n "$SRC" ] && [ -e "$SRC" ]; then
  HERE="$(cd "$(dirname "$SRC")" && pwd)"
  REPO="$(cd "$HERE/../.." && pwd)"
else
  REPO="$PWD"
  while [ "$REPO" != "/" ] && [ ! -d "$REPO/.git" ]; do
    REPO="$(dirname "$REPO")"
  done
  if [ ! -d "$REPO/.git" ]; then
    echo "FAIL: cannot resolve repo root (BASH_SOURCE empty, walk-up failed)" >&2
    exit 2
  fi
fi

CLI="$REPO/plugins/pmos-toolkit/skills/comments/scripts/cli.js"
FIXTURE_HTML="$REPO/plugins/pmos-toolkit/skills/spec/tests/fixtures/02_spec_mini.html"

if [ ! -f "$CLI" ]; then
  echo "FAIL: cli.js not found at $CLI" >&2
  exit 2
fi
if [ ! -f "$FIXTURE_HTML" ]; then
  echo "FAIL: fixture HTML not found at $FIXTURE_HTML" >&2
  exit 2
fi

# Create a temp directory for the test artifact + sidecar.
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

ARTIFACT="$TMP_DIR/test.html"
RESOLVER="$REPO/plugins/pmos-toolkit/skills/comments/scripts/resolver.js"

# Copy fixture HTML, inject pmos:skill meta if absent.
cp "$FIXTURE_HTML" "$ARTIFACT"
if ! grep -q 'name="pmos:skill"' "$ARTIFACT"; then
  # Replace legacy pmos-originating-skill with canonical pmos:skill.
  sed -i.bak 's/name="pmos-originating-skill"/name="pmos:skill"/g' "$ARTIFACT" && rm -f "$ARTIFACT.bak" || true
fi

# v2.58.0 — sidecar retired; embed an inline pmos-comments block declaring
# schema 99 (newer than the resolver's CURRENT_SCHEMA_VERSION) so the
# refuse-load gate fires. Built through the resolver's own block writer.
node -e '
  const fs = require("fs");
  const r = require(process.argv[1]);
  const p = process.argv[2];
  const html = fs.readFileSync(p, "utf8");
  const out = r._internal._injectCommentsBlock(html, {
    schema: 99, version: 0, generated_at: "2026-05-24T00:00:00Z", threads: [],
  });
  fs.writeFileSync(p, out);
' "$RESOLVER" "$ARTIFACT"

# Run cli.js end-to-end (exercises the cli.js catch handler → exitCode translation).
STDERR_FILE="$TMP_DIR/stderr.txt"
ACTUAL_EXIT=0
node "$CLI" resolve "$ARTIFACT" --confirm-each </dev/null 2>"$STDERR_FILE" || ACTUAL_EXIT=$?
STDERR_OUT="$(cat "$STDERR_FILE")"

PASS=true

# (f1) exit code must be 64.
if [ "$ACTUAL_EXIT" != "64" ]; then
  echo "FAIL (f1): expected exit code 64 but got $ACTUAL_EXIT" >&2
  echo "  stderr was: $STDERR_OUT" >&2
  PASS=false
fi

# (f2) stderr must match the required pattern.
if ! echo "$STDERR_OUT" | grep -q "schema=99 is newer than /comments"; then
  echo "FAIL (f2): stderr did not match 'schema=99 is newer than /comments'" >&2
  echo "  stderr was: $STDERR_OUT" >&2
  PASS=false
fi

if [ "$PASS" = "true" ]; then
  echo "PASS: (f) schema_version=99 → exit 64 + stderr matches pattern"
  exit 0
else
  exit 1
fi
