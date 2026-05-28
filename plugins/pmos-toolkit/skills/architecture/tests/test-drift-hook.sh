#!/usr/bin/env bash
# test-drift-hook.sh — T4 TDD test: drift checker + installer.
# Cases:
#   (a) drifted YAML vs MD  → check-principles-drift.sh exits 1
#   (b) aligned YAML vs MD  → check-principles-drift.sh exits 0
#   (c) installer creates pre-commit hook (idempotent), noop commit skips
set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SCRIPTS="$HERE/../scripts"
DRIFT="$SCRIPTS/check-principles-drift.sh"
INSTALL="$SCRIPTS/install-arch-hooks.sh"

pass=0
fail=0
log() { printf '[test-drift-hook] %s\n' "$*"; }
ok()  { pass=$((pass+1)); log "PASS: $*"; }
no()  { fail=$((fail+1)); log "FAIL: $*"; }

# Pre-flight: scripts must exist
if [ ! -x "$DRIFT" ] || [ ! -x "$INSTALL" ]; then
  log "scripts missing or not executable: $DRIFT / $INSTALL"
  exit 1
fi

tmp_root="$(mktemp -d)"
trap 'rm -rf "$tmp_root"' EXIT

# ---- Case (a): drifted ----
yaml_a="$tmp_root/a.yaml"
md_a="$tmp_root/a.md"
cat > "$yaml_a" <<'YAML'
principles:
  - id: U001
    name: foo
YAML
cat > "$md_a" <<'MD'
## U001
text
## U999
text
MD
if "$DRIFT" --yaml "$yaml_a" --md "$md_a" >/dev/null 2>&1; then
  no "(a) drifted set should exit non-zero"
else
  rc=$?
  if [ "$rc" -eq 1 ]; then ok "(a) drift detected → exit 1"
  else no "(a) drift exit was $rc, expected 1"; fi
fi

# ---- Case (b): aligned ----
yaml_b="$tmp_root/b.yaml"
md_b="$tmp_root/b.md"
cat > "$yaml_b" <<'YAML'
principles:
  - id: U001
    name: foo
YAML
cat > "$md_b" <<'MD'
## U001
text
MD
if "$DRIFT" --yaml "$yaml_b" --md "$md_b" >/dev/null 2>&1; then
  ok "(b) aligned set → exit 0"
else
  no "(b) aligned set exited non-zero"
fi

# ---- Case (c): installer in temp git repo ----
repo="$tmp_root/repo"
mkdir -p "$repo"
(
  cd "$repo"
  git init -q
  git config user.email "t@t"
  git config user.name "t"
) || { no "(c) git init failed"; }

(
  cd "$repo"
  "$INSTALL" >/dev/null 2>&1
) || { no "(c) installer failed"; }

hook="$repo/.git/hooks/pre-commit"
if [ -x "$hook" ] && grep -q 'pmos-architecture-drift-hook' "$hook"; then
  ok "(c) pre-commit installed with marker"
else
  no "(c) pre-commit missing marker or not executable"
fi

# Idempotent: second install must not duplicate marker
(
  cd "$repo"
  "$INSTALL" >/dev/null 2>&1
)
marker_count=$(grep -c 'pmos-architecture-drift-hook' "$hook" 2>/dev/null || echo 0)
if [ "$marker_count" -eq 1 ]; then
  ok "(c) installer idempotent (marker count=1)"
else
  no "(c) installer not idempotent (marker count=$marker_count)"
fi

# Noop commit (no principles file) → hook exits 0 silently
(
  cd "$repo"
  git commit --allow-empty -q -m "noop" >/dev/null 2>&1
)
rc=$?
if [ "$rc" -eq 0 ]; then
  ok "(c) noop commit succeeds (hook skips silently)"
else
  no "(c) noop commit failed with rc=$rc"
fi

log "summary: pass=$pass fail=$fail"
[ "$fail" -eq 0 ]
