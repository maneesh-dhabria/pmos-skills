#!/usr/bin/env bash
# setup.sh — materialise the 01_feat-only git fixture deterministically.
# Range under test (first-commit..HEAD) contains feat commits only →
# classifier sections == {Features, Usage, Quickstart} (set-equality).
# Re-runnable: wipes and re-creates .git/ (gitignored) + f.txt on every run.
# Bash 3.2-safe.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"
rm -rf .git
export GIT_AUTHOR_NAME="readme-fixture" GIT_AUTHOR_EMAIL="fixture@pmos.local"
export GIT_COMMITTER_NAME="readme-fixture" GIT_COMMITTER_EMAIL="fixture@pmos.local"
export GIT_AUTHOR_DATE="2026-01-01T00:00:00Z" GIT_COMMITTER_DATE="2026-01-01T00:00:00Z"
git init -q
printf 'init\n' > f.txt
git add f.txt
git -c commit.gpgsign=false commit -qm "chore: initial scaffold"
printf 'one\n' >> f.txt
git add f.txt
git -c commit.gpgsign=false commit -qm "feat: add the frobnicator"
printf 'two\n' >> f.txt
git add f.txt
git -c commit.gpgsign=false commit -qm "feat(cli): wire frobnicator into the CLI"
