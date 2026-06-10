#!/usr/bin/env bash
# cross_file_rules.sh — assert R1-R4 fire correctly against the
# monorepo-mixed-readmes fixture; R3 produces warn-with-override
# (not blocker) per FR-CF-3 / FR-CF-5 / A9.
#
# /readme's cross-file rule pass is documented in SKILL.md #monorepo and lives at
# reference/cross-file-rules.md. The slash-command itself is un-mockable; we
# exercise the detection logic directly:
#
#   R1 — root README references every workspace package
#   R2 — every package README links back to root
#   R3 — Install/Contributing/License at root only (warn-with-override)
#   R4 — no duplicate hero text between root and any package
#
# Bash 3.2-safe.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPTS="$HERE/../../scripts"
CF_REF="$HERE/../../reference/cross-file-rules.md"
FIX="$HERE/../fixtures/monorepo-mixed-readmes"

tmp="$(mktemp -d -t readme-cross-file.XXXXXX)"
# shellcheck disable=SC2329  # invoked indirectly via trap
cleanup() { rm -rf "$tmp"; }
trap cleanup EXIT

[ -d "$FIX" ] || { echo "FAIL: fixture missing: $FIX"; exit 1; }
[ -f "$CF_REF" ] || { echo "FAIL: cross-file-rules.md missing"; exit 1; }

# Discover packages via workspace-discovery.
disc=$(bash "$SCRIPTS/workspace-discovery.sh" "$FIX" 2>/dev/null)
pkg_paths=$(printf '%s\n' "$disc" | python3 -c '
import json, sys
d = json.load(sys.stdin)
for p in d.get("packages", []):
    print(p["path"])
')
if [ -z "$pkg_paths" ]; then
  echo "FAIL: workspace-discovery returned zero packages on fixture"
  printf '%s\n' "$disc"
  exit 1
fi

root_readme="$FIX/README.md"
[ -f "$root_readme" ] || { echo "FAIL: root README missing in fixture"; exit 1; }

# --- R1: every package referenced from root contents-table -------------------
# Expectation: alpha referenced, beta NOT referenced -> R1 must FIRE on beta.
r1_misses=""
for p in $pkg_paths; do
  if ! grep -qE "\[[^]]+\]\($p/README\.md\)" "$root_readme"; then
    r1_misses="$r1_misses $p"
  fi
done
if [ -z "$r1_misses" ]; then
  echo "FAIL: R1 did not fire — expected at least one package missing from root contents-table"
  exit 1
fi
case "$r1_misses" in
  *plugins/beta*) : ;;
  *) echo "FAIL: R1 fired but not on the expected target (plugins/beta); fired on:$r1_misses"; exit 1 ;;
esac

# --- R2: every package README links back to root ----------------------------
# Expectation: alpha README does NOT link to root -> R2 fires on alpha (beta
# has no README — R2 is skipped for packages without a README per FR-CF-2).
r2_misses=""
for p in $pkg_paths; do
  pkg_readme="$FIX/$p/README.md"
  [ -f "$pkg_readme" ] || continue
  if ! grep -qE '\[[^]]+\]\((\.\./)+README\.md\)' "$pkg_readme"; then
    r2_misses="$r2_misses $p"
  fi
done
if [ -z "$r2_misses" ]; then
  echo "FAIL: R2 did not fire — expected at least one package without an up-link"
  exit 1
fi
case "$r2_misses" in
  *plugins/alpha*) : ;;
  *) echo "FAIL: R2 fired but not on the expected target (plugins/alpha); fired on:$r2_misses"; exit 1 ;;
esac

# --- R3: Install/Contributing/License root-only, warn-with-override ---------
# Expectation: alpha's README contains its own `## Install` section diverging
# from root's. R3 must fire AS WARN, not blocker (FR-CF-3 / A9 3-valued).
r3_hits=""
for p in $pkg_paths; do
  pkg_readme="$FIX/$p/README.md"
  [ -f "$pkg_readme" ] || continue
  if grep -qE '^##[[:space:]]+(Install|Contributing|License)\b' "$pkg_readme"; then
    r3_hits="$r3_hits $p"
  fi
done
if [ -z "$r3_hits" ]; then
  echo "FAIL: R3 did not fire — expected at least one package with Install/Contributing/License heading"
  exit 1
fi
# Verify the reference doc tier-tags R3 as warn-with-override, not blocker.
if ! grep -qE 'R3.*warn-with-override' "$CF_REF"; then
  echo "FAIL: cross-file-rules.md does not tag R3 as warn-with-override"
  exit 1
fi
if grep -qE 'R3.*blocker' "$CF_REF"; then
  echo "FAIL: cross-file-rules.md tags R3 as blocker (must be warn-with-override per FR-CF-3 / H5)"
  exit 1
fi

# --- R4: no duplicate hero text between root and any package ----------------
# Hero = first non-empty, non-heading line after the H1 (per opening-shapes §1).
hero_of() {
  awk '
    NR==1 && /^# / {h1=1; next}
    h1 && NF && !/^#/ && !/^[-*+] / && !/^[0-9]+\. / && !/^>/ && !/^```/ && !/^    / {print; exit}
  ' "$1"
}
root_hero=$(hero_of "$root_readme")
r4_hits=""
for p in $pkg_paths; do
  pkg_readme="$FIX/$p/README.md"
  [ -f "$pkg_readme" ] || continue
  pkg_hero=$(hero_of "$pkg_readme")
  if [ -n "$root_hero" ] && [ "$pkg_hero" = "$root_hero" ]; then
    r4_hits="$r4_hits $p"
  fi
done
if [ -z "$r4_hits" ]; then
  echo "FAIL: R4 did not fire — expected duplicate hero between root and at least one package"
  echo "root_hero='$root_hero'"
  exit 1
fi
case "$r4_hits" in
  *plugins/alpha*) : ;;
  *) echo "FAIL: R4 fired but not on the expected target (plugins/alpha); fired on:$r4_hits"; exit 1 ;;
esac

echo "PASS: cross_file_rules — R1 fired (beta), R2 fired (alpha), R3 fired (alpha; warn-with-override), R4 fired (alpha duplicate hero)"
exit 0
