#!/usr/bin/env bash
# T3 inline verification — nanoid8 uniqueness across 1000 calls.
# Refs: FR-14, S4.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"

cd "$REPO"
node plugins/pmos-toolkit/skills/comments/tests/id.test.js
echo "PASS: 1000 unique ids"
