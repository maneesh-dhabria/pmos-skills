#!/usr/bin/env bash
# T8 — entrypoint wrapper for template_comments_bake.test.sh.
# Exits 0 on success, 1 on failure.

set -u

_script="${BASH_SOURCE[0]:-$0}"
if [[ -n "$_script" && -e "$_script" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "$_script")" && pwd)"
else
  SCRIPT_DIR=""
  _walk="$PWD"
  while [[ "$_walk" != "/" ]]; do
    if [[ -f "$_walk/CLAUDE.md" && -d "$_walk/plugins/pmos-toolkit" ]]; then
      SCRIPT_DIR="$_walk/tests/scripts"
      break
    fi
    _walk="$(dirname "$_walk")"
  done
  if [[ -z "$SCRIPT_DIR" ]]; then
    echo "FAIL: unable to resolve script directory" >&2
    exit 1
  fi
fi

exec bash "$SCRIPT_DIR/template_comments_bake.test.sh"
