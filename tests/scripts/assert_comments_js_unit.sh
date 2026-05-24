#!/usr/bin/env bash
# T3 inline verification — comments.js pure-data helper unit tests.
# Refs: FR-01, FR-02, FR-10, FR-11, FR-14, FR-16, S3, S4, §10.1.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"

cd "$REPO"
node tests/scripts/comments-js.test.js
echo "PASS: comments.js helpers"
