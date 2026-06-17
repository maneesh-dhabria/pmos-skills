#!/usr/bin/env bash
# structure.test.sh — skill-patterns §A–§F structural checks for /frameworks.
# Deterministic; run ≥2× for SIGPIPE robustness.
set -euo pipefail

SRC="${BASH_SOURCE[0]:-$0}"
if [ -n "$SRC" ] && [ -f "$SRC" ]; then
  HERE="$(cd -- "$(dirname -- "$SRC")" && pwd)"
else
  HERE="$PWD"
  while [ "$HERE" != "/" ] && [ ! -f "$HERE/structure.test.sh" ]; do HERE="$(dirname "$HERE")"; done
  [ -f "$HERE/structure.test.sh" ] || { echo "cannot locate test dir" >&2; exit 2; }
fi
SK="$(cd -- "$HERE/.." && pwd)"
SKILL="$SK/SKILL.md"

fail=0
ok()   { echo "  ok: $1"; }
bad()  { echo "  FAIL: $1" >&2; fail=1; }

# §A frontmatter: name matches directory
dir_name="$(basename "$SK")"
fm_name="$(awk -F': *' '/^name:/{print $2; exit}' "$SKILL" | tr -d '[:space:]')"
[ "$fm_name" = "$dir_name" ] && ok "frontmatter name matches dir ($fm_name)" || bad "name '$fm_name' != dir '$dir_name'"

# §A user-invocable + argument-hint present
grep -q '^user-invocable: true' "$SKILL" && ok "user-invocable: true" || bad "missing user-invocable: true"
grep -q '^argument-hint:' "$SKILL" && ok "argument-hint present" || bad "missing argument-hint"

# §A description is a single logical line (one 'description:' key, not multi-line block)
desc_lines="$(grep -c '^description:' "$SKILL" || true)"
[ "$desc_lines" = "1" ] && ok "single-line description" || bad "expected 1 description line, got $desc_lines"

# description carries ≥5 trigger phrases (rough proxy: ≥5 double-quoted or comma'd cues) — check key triggers
for trig in "/frameworks" "which framework" "framework for"; do
  grep -qi -- "$trig" "$SKILL" && ok "trigger present: $trig" || bad "missing trigger: $trig"
done

# §D required body sections
for sec in "## Platform Adaptation" "## Track Progress" "## When NOT to use" "## Anti-Patterns"; do
  grep -qF "$sec" "$SKILL" && ok "section: $sec" || bad "missing section: $sec"
done

# §D Capture Learnings heading (literal: ## Phase N: Capture Learnings)
grep -Eq '^## Phase [0-9]+: Capture Learnings' "$SKILL" && ok "Capture Learnings heading" || bad "missing '## Phase N: Capture Learnings'"

# non-interactive block markers present (byte-identical enforced separately)
grep -qF '<!-- non-interactive-block:start -->' "$SKILL" \
  && grep -qF '<!-- non-interactive-block:end -->' "$SKILL" \
  && ok "non-interactive block markers" || bad "missing non-interactive block markers"

# §C reference docs each have a ## Contents TOC
for ref in corpus-schema situation-taxonomy corpus-expansion matching; do
  f="$SK/reference/$ref.md"
  [ -f "$f" ] || { bad "missing reference/$ref.md"; continue; }
  grep -qF '## Contents' "$f" && ok "reference/$ref.md has ## Contents" || bad "reference/$ref.md missing ## Contents"
done

# §E every script has a --selftest mode
for s in corpus-vocab validate-corpus match build-library; do
  f="$SK/scripts/$s.mjs"
  [ -f "$f" ] || { bad "missing scripts/$s.mjs"; continue; }
  grep -qF -- '--selftest' "$f" && ok "scripts/$s.mjs --selftest" || bad "scripts/$s.mjs missing --selftest"
done

# Notion sync pipeline removed (story 260617-kac) — these must be GONE
for gone in scripts/split-corpus.mjs scripts/apply-rederive.mjs scripts/derive-fields.mjs reference/ingestion.md; do
  [ ! -e "$SK/$gone" ] && ok "removed: $gone" || bad "$gone still present (sync pipeline should be gone)"
done

# data corpus + taxonomy present
[ -f "$SK/data/frameworks.json" ] && ok "data/frameworks.json present" || bad "missing data/frameworks.json"
[ -f "$SK/data/situations.json" ] && ok "data/situations.json present" || bad "missing data/situations.json"

if [ "$fail" -ne 0 ]; then echo "structure.test.sh: FAILED" >&2; exit 1; fi
echo "structure.test.sh: PASS (skill-patterns §A–§F structural checks)"
