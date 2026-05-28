#!/usr/bin/env bash
# check-principles-drift.sh — FR-36..FR-39 rule-ID set-equality check
# between principles.yaml and principles.md. Exit 0 aligned, 1 drift.
set -eu

# Bash portability: resolve script dir even when BASH_SOURCE[0] is unset.
SOURCE="${BASH_SOURCE[0]:-$0}"
if [ -n "$SOURCE" ] && [ -f "$SOURCE" ]; then
  HERE="$(cd "$(dirname "$SOURCE")" && pwd)"
else
  HERE="$PWD"
  while [ "$HERE" != "/" ] && [ ! -d "$HERE/plugins/pmos-toolkit/skills/architecture" ]; do
    HERE="$(dirname "$HERE")"
  done
  if [ "$HERE" = "/" ]; then
    echo "check-principles-drift: cannot locate plugin root" >&2; exit 2
  fi
  HERE="$HERE/plugins/pmos-toolkit/skills/architecture/scripts"
fi

YAML="$HERE/../principles.yaml"
MD="$HERE/../principles.md"
while [ $# -gt 0 ]; do
  case "$1" in
    --yaml) YAML="$2"; shift 2;;
    --md)   MD="$2";   shift 2;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac
done
[ -f "$YAML" ] || { echo "missing YAML: $YAML" >&2; exit 2; }
[ -f "$MD" ]   || { echo "missing MD: $MD" >&2; exit 2; }

tmp_y="$(mktemp)"; tmp_m="$(mktemp)"
trap 'rm -f "$tmp_y" "$tmp_m"' EXIT
grep -E '^[[:space:]]*-[[:space:]]*id:[[:space:]]*([A-Z]+[0-9]+)' "$YAML" \
  | sed -E 's/.*id:[[:space:]]*//' | tr -d "\"'" | sort -u > "$tmp_y"
grep -E '^## ([A-Z]+[0-9]+)$' "$MD" | sed -E 's/^## //' | sort -u > "$tmp_m"
if diff -u "$tmp_y" "$tmp_m" >&2; then exit 0; else exit 1; fi
