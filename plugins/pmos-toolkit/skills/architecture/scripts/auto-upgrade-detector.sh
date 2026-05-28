#!/usr/bin/env bash
# auto-upgrade-detector.sh — T10 (FR-18) auto-upgrade detector for /spec Phase 6.6.
#
# Given a spec path, parses §Modules names, computes the repo's current top-level
# module set via `git ls-tree --name-only HEAD -- <configured-roots>`, and emits
# JSON {upgrade: bool, new_modules: [...], reason: "..."} to stdout.
#
# Roots configurable via .pmos/settings.yaml :: architecture.module_roots
# (simple flat YAML list). Defaults: ["plugins/*/skills/", "src/"].
#
# Exit codes:
#   0  — all heuristic paths (upgrade=true|false; both are valid decisions)
#   64 — usage error (no spec path / file not found)

set -u
set -o pipefail

# ── Bash portability (CLAUDE.md ## Bash portability) ──────────────────────────
SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
if [ -n "$SCRIPT_PATH" ] && [ -e "$SCRIPT_PATH" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
else
  # Walk up from $PWD looking for the sentinel.
  d="$PWD"
  while [ "$d" != "/" ] && [ ! -f "$d/scripts/auto-upgrade-detector.sh" ]; do
    d="$(dirname "$d")"
  done
  if [ -f "$d/scripts/auto-upgrade-detector.sh" ]; then
    SCRIPT_DIR="$d/scripts"
  else
    echo "auto-upgrade-detector: cannot resolve script directory" >&2
    exit 64
  fi
fi
PARSE_SPEC="$SCRIPT_DIR/parse-spec.js"

# ── Args ──────────────────────────────────────────────────────────────────────
SPEC_PATH="${1:-}"
if [ -z "$SPEC_PATH" ]; then
  echo "usage: auto-upgrade-detector.sh <spec-path>" >&2
  exit 64
fi
if [ ! -f "$SPEC_PATH" ]; then
  echo "auto-upgrade-detector: spec not found: $SPEC_PATH" >&2
  exit 64
fi

# ── Resolve module_roots ──────────────────────────────────────────────────────
CONFIG_PRESENT=0
ROOTS=""
if [ -f ".pmos/settings.yaml" ]; then
  ROOTS_FROM_CONFIG="$(awk '
    /^architecture:/ { in_arch=1; next }
    in_arch && /^[^[:space:]]/ { in_arch=0 }
    in_arch && /^[[:space:]]+module_roots:/ { in_roots=1; next }
    in_roots && /^[[:space:]]+-/ {
      sub(/^[[:space:]]+-[[:space:]]*/, "");
      gsub(/^["'\'']/, "");
      gsub(/["'\'']$/, "");
      print;
      next
    }
    in_roots && /^[[:space:]]+[^[:space:]-]/ { in_roots=0 }
  ' .pmos/settings.yaml)"
  if [ -n "$ROOTS_FROM_CONFIG" ]; then
    CONFIG_PRESENT=1
    ROOTS="$ROOTS_FROM_CONFIG"
  fi
fi
if [ "$CONFIG_PRESENT" -eq 0 ]; then
  ROOTS=$'plugins/*/skills/\nsrc/'
fi

# ── Parse spec modules (parse-spec.js exit 65 → no modules declared) ─────────
set +e
SPEC_JSON="$(node "$PARSE_SPEC" "$SPEC_PATH" 2>/dev/null)"
PARSE_RC=$?
set -e
if [ "$PARSE_RC" -eq 65 ]; then
  echo '{"upgrade":false,"new_modules":[],"reason":"no modules declared"}'
  exit 0
fi
if [ "$PARSE_RC" -ne 0 ]; then
  printf '{"upgrade":false,"new_modules":[],"reason":"parse-spec failed (exit %d)"}\n' "$PARSE_RC"
  exit 0
fi

SPEC_NAMES="$(printf '%s' "$SPEC_JSON" | node -e '
  const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
  for (const m of (data.modules || [])) { if (m && m.name) console.log(m.name); }
' | sort -u)"

if [ -z "$SPEC_NAMES" ]; then
  echo '{"upgrade":false,"new_modules":[],"reason":"no modules declared"}'
  exit 0
fi

# ── git repo check (E13: not-a-git-repo → "git ls-tree failed") ──────────────
set +e
git rev-parse --is-inside-work-tree >/dev/null 2>&1
GIT_REPO=$?
set -e
if [ "$GIT_REPO" -ne 0 ]; then
  echo '{"upgrade":false,"new_modules":[],"reason":"git ls-tree failed"}'
  exit 0
fi

# ── Expand roots via shell glob, keep trailing slash so git ls-tree descends ─
ROOT_ARGS=()
shopt -s nullglob 2>/dev/null || true
while IFS= read -r r; do
  [ -z "$r" ] && continue
  r="${r%/}"
  for path in $r; do
    [ -e "$path" ] && ROOT_ARGS+=("${path}/")
  done
done <<< "$ROOTS"

if [ "${#ROOT_ARGS[@]}" -eq 0 ]; then
  if [ "$CONFIG_PRESENT" -eq 0 ]; then
    echo '{"upgrade":false,"new_modules":[],"reason":"module_roots config absent and defaults found no modules"}'
  else
    echo '{"upgrade":false,"new_modules":[],"reason":"configured module_roots found no entries"}'
  fi
  exit 0
fi

# ── git ls-tree (any failure → E13 path) ─────────────────────────────────────
set +e
REPO_RAW="$(git ls-tree --name-only HEAD -- "${ROOT_ARGS[@]}" 2>/dev/null)"
GIT_RC=$?
set -e
if [ "$GIT_RC" -ne 0 ]; then
  echo '{"upgrade":false,"new_modules":[],"reason":"git ls-tree failed"}'
  exit 0
fi

# Extract basenames (immediate child name under each root)
REPO_NAMES="$(printf '%s\n' "$REPO_RAW" | awk -F/ 'NF>0 { print $NF }' | sort -u)"

# A spec module "exists" if its basename matches a known top-level dir OR
# the path itself resolves in HEAD's tree (spec authors may write either
# bare names like "architecture" or full paths like "plugins/.../architecture/").
NEW=""
while IFS= read -r name; do
  [ -z "$name" ] && continue
  bare="${name%/}"
  base="${bare##*/}"
  if printf '%s\n' "$REPO_NAMES" | grep -qxF "$base"; then
    continue  # basename match
  fi
  if git ls-tree HEAD -- "$bare" 2>/dev/null | grep -q .; then
    continue  # path resolves in git tree
  fi
  NEW="${NEW}${name}
"
done <<< "$SPEC_NAMES"
NEW="${NEW%$'\n'}"

if [ -z "$NEW" ]; then
  echo '{"upgrade":false,"new_modules":[],"reason":"no new modules"}'
  exit 0
fi

ARR="$(printf '%s' "$NEW" | node -e '
  const lines = require("fs").readFileSync(0, "utf8").trim().split("\n").filter(Boolean);
  process.stdout.write(JSON.stringify(lines));
')"
REASON_LIST="$(printf '%s' "$NEW" | tr '\n' ',' | sed 's/,$//')"
printf '{"upgrade":true,"new_modules":%s,"reason":"new modules declared in spec but absent from repo: %s"}\n' \
  "$ARR" "$REASON_LIST"
exit 0
