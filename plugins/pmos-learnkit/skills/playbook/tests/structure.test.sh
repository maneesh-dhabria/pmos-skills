#!/usr/bin/env bash
# structure.test.sh — structural assertions for the /playbook skill (FR-90, FR-93, FR-94, FR-96).
# Zero-dependency; usable under `bash structure.test.sh`. Exit 0 = pass, 1 = fail.
set -uo pipefail

# Resolve skill dir with the repo's BASH_SOURCE fallback invariant.
SRC="${BASH_SOURCE[0]:-$0}"
TESTS_DIR="$(cd "$(dirname "$SRC")" 2>/dev/null && pwd)"
if [ -z "$TESTS_DIR" ] || [ ! -f "$TESTS_DIR/structure.test.sh" ]; then
  d="$PWD"; while [ "$d" != "/" ]; do [ -f "$d/SKILL.md" ] && break; d="$(dirname "$d")"; done
  TESTS_DIR="$d/tests"
fi
SKILL_DIR="$(cd "$TESTS_DIR/.." && pwd)"
SKILL="$SKILL_DIR/SKILL.md"

fail=0
ok()   { printf 'ok   - %s\n' "$1"; }
bad()  { printf 'FAIL - %s\n' "$1"; fail=1; }
has()  { grep -q "$1" "$SKILL"; }

# 1. name == dir
DIR_NAME="$(basename "$SKILL_DIR")"
NAME="$(awk -F': *' '/^name:/{print $2; exit}' "$SKILL")"
[ "$NAME" = "$DIR_NAME" ] && ok "frontmatter name ('$NAME') == dir" || bad "name '$NAME' != dir '$DIR_NAME'"

# 2. required frontmatter keys
for key in '^name:' '^description:' '^user-invocable:' '^argument-hint:'; do
  has "$key" && ok "frontmatter has ${key#^}" || bad "missing frontmatter key ${key#^}"
done

# 3. description carries >=5 trigger phrases (count quoted "..." phrases on the description line)
DESC="$(awk '/^description:/{p=1} p{print} /^user-invocable:/{p=0}' "$SKILL")"
PHRASES="$(printf '%s' "$DESC" | grep -o '"[^"]*"' | wc -l | tr -d ' ')"
[ "$PHRASES" -ge 5 ] && ok "description has >=5 trigger phrases ($PHRASES)" || bad "description has only $PHRASES trigger phrases (<5)"

# 4. body sections
has '\*\*Announce at start:\*\*' && ok "has Announce line" || bad "missing Announce line"
has '## Platform Adaptation'    && ok "has Platform Adaptation" || bad "missing Platform Adaptation"
has '## Anti-Patterns'          && ok "has Anti-Patterns" || bad "missing Anti-Patterns"
has 'Capture Learnings'         && ok "has Capture Learnings phase" || bad "missing Capture Learnings"
grep -q 'No new learnings this session because' "$SKILL" && ok "has learnings one-line contract" || bad "missing learnings one-line contract"

# 5. required reference + script files exist
for f in reference/session-log-format.md reference/resolver.md reference/clustering.md \
         reference/article-schema.md reference/anonymizer.md reference/artifact-template.html \
         scripts/resolve_repo_sessions.mjs scripts/scout.mjs \
         tests/resolver.test.mjs tests/scout.test.mjs tests/render-surface.test.sh; do
  [ -f "$SKILL_DIR/$f" ] && ok "exists: $f" || bad "missing: $f"
done

# 6. scripts are zero-dep ESM (no require/import of npm packages — only node: builtins)
if grep -REn "from ['\"][^.]" "$SKILL_DIR/scripts" | grep -v "from ['\"]node:" >/dev/null 2>&1; then
  bad "a script imports a non-node: dependency"
else
  ok "scripts import only node: builtins (zero-dep)"
fi

[ "$fail" -eq 0 ] && { echo "ALL STRUCTURE CHECKS PASSED"; exit 0; } || { echo "STRUCTURE CHECKS FAILED"; exit 1; }
