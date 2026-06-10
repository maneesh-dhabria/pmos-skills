#!/usr/bin/env bash
# test-phase-6-6-smoke.sh — T12 unit smoke for /spec's folded /architecture
# --from-spec phase (slug: #folded-arch).
#
# Five grep assertions per plan §T12 step 2:
#   (1) SKILL.md has the folded-arch phase heading (slug-addressed)
#   (2) SKILL.md mentions --skip-folded-arch
#   (3) Tier-3 template (reference/spec-templates.md) carries <section id="modules">
#   (4) Tier-3 template carries <section id="architectural-assertions">
#   (5) Universal exit checklist mentions §Modules and §Architectural Assertions

set -u
set -o pipefail

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILL_MD="$SKILL_DIR/SKILL.md"
TEMPLATES_MD="$SKILL_DIR/reference/spec-templates.md"

PASS=0
FAIL=0

assert() {
  local desc="$1"; local cond="$2"
  if eval "$cond"; then
    echo "  PASS: $desc"
    PASS=$((PASS+1))
  else
    echo "  FAIL: $desc  (cond: $cond)"
    FAIL=$((FAIL+1))
  fi
}

echo "[skill.md] folded-arch phase + spec-template structural checks"
assert "SKILL.md has the folded-arch phase heading (slug-addressed)" \
  "grep -qE '^## Phase [0-9]+: Folded /architecture --from-spec \{#folded-arch\}' '$SKILL_MD'"
assert "SKILL.md documents --skip-folded-arch flag" \
  "grep -qE -- '--skip-folded-arch' '$SKILL_MD'"
assert "Tier-3 template carries <section id=\"modules\">" \
  "grep -qE '<section id=\"modules\">' '$TEMPLATES_MD'"
assert "Tier-3 template carries <section id=\"architectural-assertions\">" \
  "grep -qE '<section id=\"architectural-assertions\">' '$TEMPLATES_MD'"
assert "Universal exit checklist mentions §Modules and §Architectural Assertions" \
  "grep -qE '§Modules and §Architectural Assertions present and non-empty' '$SKILL_MD'"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
