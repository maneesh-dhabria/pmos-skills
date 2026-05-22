#!/usr/bin/env bash
# check-gap-map.sh — compute the delegation ratio for the loaded ruleset (FR-24, G2 stretch).
# `delegated_pct` = fraction of rules whose delegate_to is a third-party linter (not "grep").
# Report-only: exits 0 always; never gates CI. Spec §7.4 / D13 frames the 70% G2 as stretch.
# Argv:    [path-to-principles.yaml]   default: <skill_dir>/principles.yaml
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
YAML="${1:-$SKILL_DIR/principles.yaml}"

if [ ! -f "$YAML" ]; then
  echo "ERROR: principles.yaml not found at: $YAML" >&2
  echo "usage: $0 [path-to-principles.yaml]" >&2
  exit 64
fi

command -v python3 >/dev/null 2>&1 || {
  echo "ERROR: check-gap-map.sh requires python3 (with PyYAML)." >&2
  exit 64
}

python3 - "$YAML" <<'PY'
import sys, yaml
yaml_path = sys.argv[1]
with open(yaml_path) as f:
    data = yaml.safe_load(f)
rules = (data or {}).get("rules", []) or []
total = len(rules)
delegated = sum(1 for r in rules if (r.get("delegate_to") or "grep") not in ("grep", "", None))
ratio = (delegated / total) if total else 0.0
print(f"gap-map: {delegated}/{total} rules delegated to a third-party linter "
      f"(delegated_pct = {ratio:.3f}; G2 stretch target = 0.70, not enforced).",
      file=sys.stderr)
PY
