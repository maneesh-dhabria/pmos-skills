#!/usr/bin/env bash
# setup.sh — materialise the 03_breaking git fixture deterministically.
# Range under test (first-commit..HEAD) contains breaking changes (bang type
# + BREAKING CHANGE footer) → classifier sections ⊇ {Migration, Changelog}.
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
git -c commit.gpgsign=false commit -qm "feat!: drop the v1 config format"
printf 'two\n' >> f.txt
git add f.txt
git -c commit.gpgsign=false commit -qm "fix: rename env var" -m "BREAKING CHANGE: FOO_TOKEN is now BAR_TOKEN"
