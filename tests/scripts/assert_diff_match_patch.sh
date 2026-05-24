#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
node tests/scripts/diff_match_patch_smoke.test.js
echo "PASS: diff-match-patch smoke"
