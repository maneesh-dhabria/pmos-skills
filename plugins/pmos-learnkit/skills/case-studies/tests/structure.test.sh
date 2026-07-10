#!/usr/bin/env bash
# structure.test.sh — skill-patterns §A–§F structural checks for /case-studies.
# Deterministic; bash-3.2-safe; run ≥2× for SIGPIPE robustness.
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

# §A description is a single logical line
desc_lines="$(grep -c '^description:' "$SKILL" || true)"
[ "$desc_lines" = "1" ] && ok "single-line description" || bad "expected 1 description line, got $desc_lines"

# key trigger phrases present
for trig in "/case-studies" "browse case studies" "how did companies"; do
  grep -qi -- "$trig" "$SKILL" && ok "trigger present: $trig" || bad "missing trigger: $trig"
done

# §D required body sections
for sec in "## Platform Adaptation" "## Track Progress" "## When NOT to use" "## Anti-Patterns"; do
  grep -qF "$sec" "$SKILL" && ok "section: $sec" || bad "missing section: $sec"
done

# §D Capture Learnings heading (literal: ## Phase N: Capture Learnings)
grep -Eq '^## Phase [0-9]+: Capture Learnings' "$SKILL" && ok "Capture Learnings heading" || bad "missing '## Phase N: Capture Learnings'"

# non-interactive block markers present (byte-identical enforced separately by the repo lint)
grep -qF '<!-- non-interactive-block:start -->' "$SKILL" \
  && grep -qF '<!-- non-interactive-block:end -->' "$SKILL" \
  && ok "non-interactive block markers" || bad "missing non-interactive block markers"

# retrieve AskUserQuestion offer carries a (Recommended) option (audit-recommended parity)
grep -qF '(Recommended)' "$SKILL" && ok "a (Recommended) option is present" || bad "no (Recommended) option in SKILL.md"

# §C reference docs present (from this story + a2b)
for ref in corpus-schema corpus-expansion matching; do
  f="$SK/reference/$ref.md"
  [ -f "$f" ] && ok "reference/$ref.md present" || bad "missing reference/$ref.md"
done

# §E every runtime script has a --selftest mode
for s in match build-library; do
  f="$SK/scripts/$s.mjs"
  [ -f "$f" ] || { bad "missing scripts/$s.mjs"; continue; }
  grep -qF -- '--selftest' "$f" && ok "scripts/$s.mjs --selftest" || bad "scripts/$s.mjs missing --selftest"
done

# build-library imports the shared substrate (NOT a standalone template), and does not edit lib.mjs (D1/INV-6)
grep -qF "_shared/library-viewer/lib.mjs" "$SK/scripts/build-library.mjs" \
  && ok "build-library imports the shared substrate" || bad "build-library.mjs does not import _shared/library-viewer/lib.mjs"

# corpus present (dep-merged from a2b)
[ -f "$SK/data/case-studies.json" ] && ok "data/case-studies.json present" || bad "missing data/case-studies.json"

if [ "$fail" -ne 0 ]; then echo "structure.test.sh: FAILED" >&2; exit 1; fi
echo "structure.test.sh: PASS (skill-patterns §A–§F structural checks)"
