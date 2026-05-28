#!/usr/bin/env bash
# test-drift-hook-installer.sh — T15 E2E test for install-arch-hooks.sh.
#
# Asserts the R2-mitigation drift guard works end-to-end under real commit flow:
#   (1) installer is idempotent (re-run on installed repo is a no-op)
#   (2) pre-commit hook exists, is executable, and contains the drift marker
#   (3) staging principles.yaml alone (creating drift vs. principles.md) refuses
#       the commit
#   (4) aligning principles.md so it cites the new rule lets the commit through
#   (5) `git commit --no-verify` bypasses the hook (per D9, accepted risk)
#
# Uses a throwaway git repo under mktemp -d so it never mutates the host repo.

set -u
set -o pipefail

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"

INSTALLER="$REPO_ROOT/plugins/pmos-toolkit/skills/architecture/scripts/install-arch-hooks.sh"
DRIFT_CHECK="$REPO_ROOT/plugins/pmos-toolkit/skills/architecture/scripts/check-principles-drift.sh"

PASS=0
FAIL=0
assert() {
  local desc="$1"; local cond="$2"
  if eval "$cond"; then echo "  PASS: $desc"; PASS=$((PASS+1))
  else echo "  FAIL: $desc  (cond: $cond)"; FAIL=$((FAIL+1)); fi
}

[ -x "$INSTALLER" ] || { echo "FATAL: installer missing or not executable: $INSTALLER" >&2; exit 2; }
[ -x "$DRIFT_CHECK" ] || { echo "FATAL: drift-check script missing or not executable: $DRIFT_CHECK" >&2; exit 2; }

TMPDIR_REPO="$(mktemp -d -t pmos-drift-hook-test.XXXXXX)"
trap 'rm -rf "$TMPDIR_REPO"' EXIT

cd "$TMPDIR_REPO"
git init -q
git config user.email "test@example.com"
git config user.name "Test"

# Mirror the in-repo path layout so the hook's path-detection works.
PLUG_DIR="plugins/pmos-toolkit/skills/architecture"
mkdir -p "$PLUG_DIR/scripts"
# Copy real check-principles-drift.sh so the installed hook has a real check
cp "$DRIFT_CHECK" "$PLUG_DIR/scripts/check-principles-drift.sh"
chmod +x "$PLUG_DIR/scripts/check-principles-drift.sh"

# Seed principles.yaml + .md aligned (single rule)
cat > "$PLUG_DIR/principles.yaml" <<'YAML'
rules:
  - id: T001
    layer: L1
    severity: must_fix
    description: Test rule for drift hook coverage.
YAML
cat > "$PLUG_DIR/principles.md" <<'MD'
# Principles

## T001
Test rule for drift hook coverage.
MD
git add . && git commit -q -m "seed: aligned principles"

echo "[1] installer is executable + leaves hook in place"
bash "$INSTALLER" >/dev/null
HOOK="$TMPDIR_REPO/.git/hooks/pre-commit"
assert "pre-commit hook exists" "[ -f '$HOOK' ]"
assert "pre-commit hook is executable" "[ -x '$HOOK' ]"
assert "pre-commit hook contains drift marker" "grep -qF '# pmos-architecture-drift-hook' '$HOOK'"

echo
echo "[2] installer is idempotent (re-run is a no-op)"
OUT2="$(bash "$INSTALLER" 2>&1)"
assert "second run logs 'already installed'" \
  "echo '$OUT2' | grep -qE 'already installed'"

echo
echo "[3] drift: adding a yaml rule with no md citation refuses commit"
cat >> "$PLUG_DIR/principles.yaml" <<'YAML'
  - id: T002
    layer: L1
    severity: should_fix
    description: A drift rule not yet cited in principles.md.
YAML
git add "$PLUG_DIR/principles.yaml"
set +e
git commit -q -m "drift: yaml only" 2>/tmp/drift-stderr.$$
RC_DRIFT=$?
set -e
assert "drifted commit refused (non-zero exit)" "[ '$RC_DRIFT' -ne '0' ]"

echo
echo "[4] aligning principles.md → commit succeeds"
cat >> "$PLUG_DIR/principles.md" <<'MD'

## T002
A drift rule not yet cited in principles.md.
MD
git add "$PLUG_DIR/principles.md"
set +e
git commit -q -m "align: md cites T002" 2>/tmp/align-stderr.$$
RC_ALIGN=$?
set -e
assert "aligned commit succeeds (exit 0)" "[ '$RC_ALIGN' = '0' ]"

echo
echo "[5] --no-verify bypasses hook (per D9)"
cat >> "$PLUG_DIR/principles.yaml" <<'YAML'
  - id: T003
    layer: L1
    severity: consider
    description: Bypass rule, intentionally absent from md.
YAML
git add "$PLUG_DIR/principles.yaml"
set +e
git commit --no-verify -q -m "bypass: --no-verify"
RC_BYPASS=$?
set -e
assert "--no-verify commit succeeds despite drift (exit 0)" "[ '$RC_BYPASS' = '0' ]"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
