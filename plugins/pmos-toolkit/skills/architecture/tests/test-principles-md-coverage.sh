#!/usr/bin/env bash
# test-principles-md-coverage.sh
# Asserts every rule ID in principles.yaml has a matching ## <id> H2 in principles.md,
# and vice versa (byte-equal sorted sets).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
YAML="$SKILL_DIR/principles.yaml"
MD="$SKILL_DIR/principles.md"

if [ ! -f "$YAML" ]; then
  echo "FAIL: principles.yaml not found at $YAML" >&2
  exit 1
fi
if [ ! -f "$MD" ]; then
  echo "FAIL: principles.md not found at $MD" >&2
  exit 1
fi

yaml_ids="$(grep -E '^[[:space:]]*-[[:space:]]*id:[[:space:]]*([A-Z]+[0-9]+)' "$YAML" \
  | sed -E 's/.*id:[[:space:]]*//' | tr -d "\"'" | sort -u)"

md_ids="$(grep -E '^## ([A-Z]+[0-9]+)' "$MD" \
  | sed -E 's/^## ([A-Z]+[0-9]+).*/\1/' | sort -u)"

if diff <(echo "$yaml_ids") <(echo "$md_ids") > /tmp/principles-coverage-diff.txt; then
  echo "PASS: principles.md covers all $(echo "$yaml_ids" | wc -l | tr -d ' ') rule IDs in principles.yaml"
  exit 0
else
  echo "FAIL: principles.md rule-ID coverage does not match principles.yaml" >&2
  echo "--- diff (yaml vs md) ---" >&2
  cat /tmp/principles-coverage-diff.txt >&2
  exit 1
fi
