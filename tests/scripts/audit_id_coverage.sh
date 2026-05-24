#!/usr/bin/env bash
# audit_id_coverage.sh — T1 spike for inline-doc-comments
#
# Audits every historical pipeline HTML artifact under docs/pmos/features/*/
# for the kebab-case-id convention on <h2> / <h3> tags. Emits TSV:
#
#   <file>\t<h2_total>\t<h2_with_id>\t<h3_total>\t<h3_with_id>
#
# Used as a regression check for the id-first anchor resolution strategy
# (S8 / FR-23). Pure bash + grep + awk — no external deps.

set -euo pipefail

# cd to repo root from $(dirname "$0")/../..
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
cd "$SCRIPT_DIR/../.."

shopt -s nullglob

# Top-level pipeline artifacts (00_pipeline / 01_requirements / 02_spec /
# 03_plan / index) live one level deep under docs/pmos/features/<feature>/.
# Nested grills/verify/wireframes per-screen files are intentionally excluded
# — they're either ephemeral session logs or per-screen mocks, not the
# h2/h3-structured corpus that comments anchor against.
for f in docs/pmos/features/*/*.html; do
  # Count opening <h2 / <h3 tags (with or without attrs). The regex matches
  # `<h2 ` (with attrs) and `<h2>` (no attrs) — same for h3.
  # grep returns 1 on zero matches — swallow with `|| true` so pipefail
  # doesn't trip the loop on files that have no h2/h3 or no ids.
  h2_total=$({ grep -oE '<h2[[:space:]>]' "$f" 2>/dev/null || true; } | wc -l | tr -d ' ')
  h3_total=$({ grep -oE '<h3[[:space:]>]' "$f" 2>/dev/null || true; } | wc -l | tr -d ' ')

  # Count those that carry an id= attribute. Greedy match within the opening
  # tag — `<h2 ... id="..." ...>`.
  h2_with_id=$({ grep -oE '<h2[^>]*\bid=' "$f" 2>/dev/null || true; } | wc -l | tr -d ' ')
  h3_with_id=$({ grep -oE '<h3[^>]*\bid=' "$f" 2>/dev/null || true; } | wc -l | tr -d ' ')

  printf '%s\t%s\t%s\t%s\t%s\n' "$f" "$h2_total" "$h2_with_id" "$h3_total" "$h3_with_id"
done
