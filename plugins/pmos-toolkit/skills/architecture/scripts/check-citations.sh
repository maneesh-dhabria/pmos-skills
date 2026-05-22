#!/usr/bin/env bash
# check-citations.sh — assert every rule in principles.yaml has a non-empty `source:` (D9, FR-24).
# Exit codes: 0 = all rules cite a source; 1 = ≥1 rule missing source:; 64 = usage error.
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
  echo "ERROR: check-citations.sh requires python3 (with PyYAML)." >&2
  exit 64
}

python3 - "$YAML" <<'PY'
import sys, yaml
yaml_path = sys.argv[1]
with open(yaml_path) as f:
    data = yaml.safe_load(f)
rules = (data or {}).get("rules", []) or []
offenders = []
for r in rules:
    rid = r.get("id", "<unknown>")
    src = r.get("source", "")
    if not isinstance(src, str) or not src.strip():
        offenders.append(rid)
if offenders:
    print(f"FAIL: {len(offenders)} rule(s) missing non-empty source:", file=sys.stderr)
    for rid in offenders:
        print(f"  - {rid}", file=sys.stderr)
    sys.exit(1)
print(f"OK: all {len(rules)} rules cite a source.", file=sys.stderr)
PY
