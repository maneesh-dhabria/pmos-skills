#!/usr/bin/env bash
# T25 — installer for the comments-drift pre-commit hook.
# Idempotent: detects existing source line and skips append.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# Ensure .githooks is the git hooksPath (already configured by upstream
# pre-commit hook installation, but verify).
current_hooks_path=$(git config core.hooksPath || echo "")
if [ "$current_hooks_path" != ".githooks" ]; then
  echo "Setting git config core.hooksPath = .githooks"
  git config core.hooksPath .githooks
fi

# Make the sub-hook executable
chmod +x .githooks/pre-commit-comments-drift

# Insert source-block into .githooks/pre-commit if not already present.
# Uses awk to inject after the first `set -euo pipefail` line so the
# comments-drift check runs before the _shared/ drift check (both are
# commit-blockers; short-circuit order doesn't matter).
if grep -q "pre-commit-comments-drift" .githooks/pre-commit; then
  echo "Comments drift hook already installed in .githooks/pre-commit"
else
  awk '
    /^set -euo pipefail$/ && !done {
      print
      print ""
      print "# Source comments-drift sub-hook (T25, FR-15)"
      print "hook_dir=\"$(cd \"$(dirname \"${BASH_SOURCE[0]:-$0}\")\" && pwd)\""
      print "if [ -x \"${hook_dir}/pre-commit-comments-drift\" ]; then"
      print "  \"${hook_dir}/pre-commit-comments-drift\" || exit $?"
      print "fi"
      done = 1
      next
    }
    { print }
  ' .githooks/pre-commit > .githooks/pre-commit.new
  mv .githooks/pre-commit.new .githooks/pre-commit
  chmod +x .githooks/pre-commit
  echo "Installed comments-drift hook in .githooks/pre-commit"
fi

echo "T25 comments-drift hook installation complete."
