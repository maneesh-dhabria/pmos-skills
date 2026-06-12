#!/usr/bin/env bash
# build-library.test.sh — the built index.html is self-contained (no external asset
# refs, diagrams inlined as SVG, filter controls present). Run ≥2× for SIGPIPE noise.
set -euo pipefail

# Resolve this script's dir with a BASH_SOURCE fallback (repo bash-portability rule).
SRC="${BASH_SOURCE[0]:-$0}"
if [ -n "$SRC" ] && [ -f "$SRC" ]; then
  HERE="$(cd -- "$(dirname -- "$SRC")" && pwd)"
else
  HERE="$PWD"
  while [ "$HERE" != "/" ] && [ ! -f "$HERE/build-library.test.sh" ]; do HERE="$(dirname "$HERE")"; done
  [ -f "$HERE/build-library.test.sh" ] || { echo "cannot locate test dir" >&2; exit 2; }
fi
SKILL_DIR="$(cd -- "$HERE/.." && pwd)"

OUT="$(mktemp -t fw-lib.XXXXXX).html"
trap 'rm -f "$OUT" "$OUT.tmp"' EXIT

node "$SKILL_DIR/scripts/build-library.mjs" \
  --out "$OUT" \
  --corpus "$HERE/fixtures/mini-corpus.json" \
  --diagrams "$HERE/fixtures/diagrams"

fail=0
need()    { grep -q -- "$1" "$OUT" || { echo "  FAIL: expected to find: $1" >&2; fail=1; }; }
forbid()  { if grep -Eq -- "$1" "$OUT"; then echo "  FAIL: forbidden pattern present: $1" >&2; fail=1; fi; }

# self-contained
forbid '<link[^>]+href="https?:'        # no external stylesheet
forbid '<script[^>]+src="https?:'       # no external script
forbid '<img '                          # diagrams are inlined, never <img>
forbid '(href|src)="https?://[^"]*amazonaws'  # no expiring S3 refs

# features present
need 'id="search"'
need 'id="superFilter"'
need 'data-dd="dt"'                      # decision-type multi-select dropdown trigger (D4)
need 'data-dd="tags"'                    # tags multi-select dropdown trigger (D4)
need 'id="tagSearch"'                    # tag type-to-filter search input (D4)
need 'id="applied"'                      # applied-filters bar (D4b)
need 'data-clear-all'                    # Clear all control (D4b)
need '>Product Management<'             # area display label via SUPER_CATEGORY_LABELS (D5)
need 'value="Product"'                  # ...while the option VALUE stays the raw super_category (D5)
need '<svg'                             # the rice diagram inlined
need 'Reach × Impact × Confidence'      # primary diagram content inlined
need 'Effort sizing sub-model'          # second-pass extra diagram (diagrams[]) inlined
need "PM&#39;s take"                    # commentary block

# old browse-UI affordances removed (D4)
forbid 'id="dtFilter"'                   # single-select decision-type filter gone
forbid 'id="tagrow"'                     # inline tag-chip cloud gone
forbid 'class="morefilters"'            # More-filters disclosure gone

if [ "$fail" -ne 0 ]; then echo "build-library.test.sh: FAILED" >&2; exit 1; fi
echo "build-library.test.sh: PASS (self-contained, inlined SVG, dropdown filters, applied bar, area rename)"
