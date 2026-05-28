#!/usr/bin/env bash
# install-arch-hooks.sh — install pre-commit drift guard. Idempotent.
# Bypassable via `git commit --no-verify` per D9.
set -eu

MARKER='# pmos-architecture-drift-hook'
hooks_dir="$(git rev-parse --git-path hooks 2>/dev/null)" || {
  echo "install-arch-hooks: not inside a git repo" >&2; exit 2; }
mkdir -p "$hooks_dir"
hook="$hooks_dir/pre-commit"

if [ -f "$hook" ] && grep -qF "$MARKER" "$hook"; then
  echo "install-arch-hooks: already installed (marker present)"
  exit 0
fi

if [ ! -f "$hook" ]; then
  printf '#!/usr/bin/env bash\nset -e\n' > "$hook"
fi

cat >> "$hook" <<'HOOK'

# pmos-architecture-drift-hook
_pmos_arch_drift() {
  local staged
  staged="$(git diff --cached --name-only 2>/dev/null || true)"
  case "$staged" in
    *plugins/pmos-toolkit/skills/architecture/principles.yaml*|\
    *plugins/pmos-toolkit/skills/architecture/principles.md*)
      ;;
    *) return 0 ;;
  esac
  local repo script
  repo="$(git rev-parse --show-toplevel)"
  script="$repo/plugins/pmos-toolkit/skills/architecture/scripts/check-principles-drift.sh"
  [ -x "$script" ] || return 0
  "$script" || {
    echo "pre-commit: principles.yaml/md drift (bypass via --no-verify)" >&2
    return 1
  }
}
_pmos_arch_drift || exit $?
HOOK

chmod +x "$hook"
echo "install-arch-hooks: installed at $hook"
