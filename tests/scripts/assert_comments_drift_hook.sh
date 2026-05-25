#!/usr/bin/env bash
# Assert: pre-commit comments-drift hook behaves correctly in all cases.
# T25, FR-15, S5.
#
# BASH_SOURCE fallback per CLAUDE.md invariant: BASH_SOURCE[0] may be empty
# when sourced from a non-canonical path; fall back to $0, then walk up from
# $PWD until a sentinel directory (.githooks) is found.
set -e

# --- resolve REPO_ROOT robustly ---
_self="${BASH_SOURCE[0]:-$0}"
if [ -n "$_self" ] && [ "$_self" != "bash" ]; then
  _dir="$(cd "$(dirname "$_self")" 2>/dev/null && pwd)"
else
  _dir="$PWD"
fi
# Walk up until we find the sentinel .githooks directory (repo root)
_walk="$_dir"
REPO_ROOT=""
while [ "$_walk" != "/" ]; do
  if [ -d "$_walk/.githooks" ]; then
    REPO_ROOT="$_walk"
    break
  fi
  _walk="$(dirname "$_walk")"
done
if [ -z "${REPO_ROOT}" ]; then
  echo "FATAL: could not locate repo root (no .githooks ancestor found)" >&2
  exit 2
fi

HOOK_REPO_PATH="${HOOK_REPO_PATH:-${REPO_ROOT}/.githooks/pre-commit-comments-drift}"
INSTALLER="${INSTALLER:-${REPO_ROOT}/scripts/install-comments-hooks.sh}"
MAIN_HOOK="${MAIN_HOOK:-${REPO_ROOT}/.githooks/pre-commit}"

pass_count=0
fail_count=0

pass() { echo "PASS: $1"; pass_count=$((pass_count + 1)); }
fail() { echo "FAIL: $1"; fail_count=$((fail_count + 1)); }

# Helper: create a minimal ephemeral git repo with docs/pmos/feat/ structure.
# Prints the path to the temp dir; caller must cd into it.
_make_repo() {
  local tmp
  tmp=$(mktemp -d)
  git -C "$tmp" init -q
  git -C "$tmp" config user.name t
  git -C "$tmp" config user.email t@t
  mkdir -p "$tmp/docs/pmos/feat"
  mkdir -p "$tmp/.githooks"
  cp "$HOOK_REPO_PATH" "$tmp/.githooks/pre-commit-comments-drift"
  chmod +x "$tmp/.githooks/pre-commit-comments-drift"
  echo "$tmp"
}

# -----------------------------------------------------------------------
# Case A: Stage only a.html (sibling a.comments.json exists on disk) →
#         hook must exit 1 with grep-able stderr.
# -----------------------------------------------------------------------
run_case_a() {
  local tmp exit_code out expected_msg
  tmp=$(_make_repo)
  # shellcheck disable=SC2064
  trap "rm -rf ${tmp}" RETURN

  printf '<html><body>hello</body></html>' > "${tmp}/docs/pmos/feat/a.html"
  printf '{}' > "${tmp}/docs/pmos/feat/a.comments.json"
  git -C "$tmp" add docs/pmos/feat/a.html docs/pmos/feat/a.comments.json
  git -C "$tmp" commit -q -m init --no-verify

  # Modify only the HTML and stage it; sidecar exists on disk but is not staged
  printf '<html><body>updated</body></html>' > "${tmp}/docs/pmos/feat/a.html"
  git -C "$tmp" add docs/pmos/feat/a.html

  # Capture both stdout/stderr and exit code without triggering set -e.
  # Must run from within the git repo so `git diff --cached` resolves correctly.
  set +e
  out=$(cd "$tmp" && bash .githooks/pre-commit-comments-drift 2>&1)
  exit_code=$?
  set -e

  if [ "$exit_code" -ne 1 ]; then
    fail "A: expected exit 1, got ${exit_code}"
    return
  fi
  expected_msg="comments-drift: docs/pmos/feat/a.html is staged but its sibling docs/pmos/feat/a.comments.json is not"
  if ! echo "$out" | grep -qF "$expected_msg"; then
    fail "A: stderr missing expected message. Got: ${out}"
    return
  fi
  pass "A: staged HTML with unstaged sibling sidecar → exit 1 + grep-able stderr"
}

# -----------------------------------------------------------------------
# Case B: Stage both a.html and a.comments.json → hook exits 0.
# -----------------------------------------------------------------------
run_case_b() {
  local tmp exit_code
  tmp=$(_make_repo)
  # shellcheck disable=SC2064
  trap "rm -rf ${tmp}" RETURN

  printf '<html><body>hello</body></html>' > "${tmp}/docs/pmos/feat/a.html"
  printf '{}' > "${tmp}/docs/pmos/feat/a.comments.json"
  git -C "$tmp" add docs/pmos/feat/a.html docs/pmos/feat/a.comments.json
  git -C "$tmp" commit -q -m init --no-verify

  # Modify and stage both
  printf '<html><body>updated</body></html>' > "${tmp}/docs/pmos/feat/a.html"
  printf '{"v":2}' > "${tmp}/docs/pmos/feat/a.comments.json"
  git -C "$tmp" add docs/pmos/feat/a.html docs/pmos/feat/a.comments.json

  set +e
  (cd "$tmp" && bash .githooks/pre-commit-comments-drift)
  exit_code=$?
  set -e

  if [ "$exit_code" -ne 0 ]; then
    fail "B: expected exit 0 when both siblings staged, got ${exit_code}"
    return
  fi
  pass "B: both siblings staged → exit 0"
}

# -----------------------------------------------------------------------
# Case C: --no-verify bypass is at the git layer, not hook layer.
#         Documented skip per T25 spec note.
# -----------------------------------------------------------------------
# (skipped per T25 spec note: --no-verify is fully handled by git, not the hook)

# -----------------------------------------------------------------------
# Case D: Installer idempotency — run install-comments-hooks.sh twice →
#         the string "pre-commit-comments-drift" appears exactly once in
#         .githooks/pre-commit.
# -----------------------------------------------------------------------
run_case_d() {
  local tmp count
  tmp=$(mktemp -d)
  # shellcheck disable=SC2064
  trap "rm -rf ${tmp}" RETURN

  git -C "$tmp" init -q
  git -C "$tmp" config user.name t
  git -C "$tmp" config user.email t@t
  git -C "$tmp" config core.hooksPath .githooks

  # Set up a minimal .githooks/pre-commit (mirrors real hook structure)
  mkdir -p "${tmp}/.githooks" "${tmp}/scripts"
  cat > "${tmp}/.githooks/pre-commit" <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
staged=$(git diff --cached --name-only)
echo "$staged" | grep -q '^plugins/[^/]\+/skills/_shared/' || exit 0
exit 0
HOOK
  chmod +x "${tmp}/.githooks/pre-commit"

  # Copy sub-hook and installer
  cp "$HOOK_REPO_PATH" "${tmp}/.githooks/pre-commit-comments-drift"
  chmod +x "${tmp}/.githooks/pre-commit-comments-drift"
  cp "$INSTALLER" "${tmp}/scripts/install-comments-hooks.sh"
  chmod +x "${tmp}/scripts/install-comments-hooks.sh"

  # Run installer twice from within the temp repo
  (cd "$tmp" && bash scripts/install-comments-hooks.sh > /dev/null)
  (cd "$tmp" && bash scripts/install-comments-hooks.sh > /dev/null)

  # Count how many times the unique source-block comment line appears — must be exactly 1.
  # The comment "# Source comments-drift sub-hook" is the single-line marker inserted once per install.
  count=$(grep -c "# Source comments-drift sub-hook" "${tmp}/.githooks/pre-commit")
  if [ "$count" -ne 1 ]; then
    fail "D: installer not idempotent — source-block comment appears ${count} times in .githooks/pre-commit (expected 1)"
    return
  fi
  pass "D: installer idempotent — source block appears exactly once after two runs"
}

# -----------------------------------------------------------------------
# Case E: Files outside docs/pmos/ are ignored → hook exits 0.
# -----------------------------------------------------------------------
run_case_e() {
  local tmp exit_code
  tmp=$(_make_repo)
  # shellcheck disable=SC2064
  trap "rm -rf ${tmp}" RETURN

  printf '# README\n' > "${tmp}/README.md"
  git -C "$tmp" add README.md
  git -C "$tmp" commit -q -m init --no-verify

  printf '# Updated README\n' > "${tmp}/README.md"
  git -C "$tmp" add README.md

  set +e
  (cd "$tmp" && bash .githooks/pre-commit-comments-drift)
  exit_code=$?
  set -e

  if [ "$exit_code" -ne 0 ]; then
    fail "E: expected exit 0 for file outside docs/pmos/, got ${exit_code}"
    return
  fi
  pass "E: non-docs/pmos/ staged file → exit 0 (hook is a no-op)"
}

# -----------------------------------------------------------------------
# Case F: Sidecar staged but HTML deleted on disk (artifact removed) →
#         no sibling exists on disk → hook exits 0 (no drift error).
# -----------------------------------------------------------------------
run_case_f() {
  local tmp exit_code
  tmp=$(_make_repo)
  # shellcheck disable=SC2064
  trap "rm -rf ${tmp}" RETURN

  printf '<html><body>hello</body></html>' > "${tmp}/docs/pmos/feat/a.html"
  printf '{}' > "${tmp}/docs/pmos/feat/a.comments.json"
  git -C "$tmp" add docs/pmos/feat/a.html docs/pmos/feat/a.comments.json
  git -C "$tmp" commit -q -m init --no-verify

  # Delete the HTML artifact from disk and stage only the sidecar change
  rm "${tmp}/docs/pmos/feat/a.html"
  printf '{"archived":true}' > "${tmp}/docs/pmos/feat/a.comments.json"
  git -C "$tmp" add docs/pmos/feat/a.comments.json

  set +e
  (cd "$tmp" && bash .githooks/pre-commit-comments-drift)
  exit_code=$?
  set -e

  if [ "$exit_code" -ne 0 ]; then
    fail "F: expected exit 0 when HTML deleted on disk and only sidecar staged, got ${exit_code}"
    return
  fi
  pass "F: sidecar staged but sibling HTML deleted on disk → exit 0 (no drift)"
}

# -----------------------------------------------------------------------
# Run all cases
# -----------------------------------------------------------------------
run_case_a
run_case_b
# Case C: skipped — --no-verify is fully handled by git, not the hook
run_case_d
run_case_e
run_case_f

echo ""
echo "Results: ${pass_count} passed, ${fail_count} failed"
if [ "$fail_count" -ne 0 ]; then
  exit 1
fi
exit 0
