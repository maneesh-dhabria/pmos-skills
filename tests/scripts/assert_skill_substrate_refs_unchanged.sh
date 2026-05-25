#!/usr/bin/env bash
set -e
# Token-ref floor: substrate asset paths (style.css, viewer.js, html-authoring/, etc.)
# MUST use ${CLAUDE_PLUGIN_ROOT}/skills/_shared/... — these are runtime-resolved at
# tool execution time.
n_token=$(grep -rE '\$\{CLAUDE_PLUGIN_ROOT\}/skills/_shared' plugins/pmos-toolkit/skills/ | wc -l | tr -d ' ')
if [ "$n_token" -lt 28 ]; then echo "FAIL: token-ref count $n_token below floor 28"; exit 1; fi

# Hardcoded-ref guard: forbid hardcoded substrate ASSET paths. Allowed exceptions:
#   - apply-edit-at-anchor.md contract-pointer citations (NFR-08 of inline-doc-comments
#     mandates the literal repo path so the 14 surfaces converge on one canonical
#     contract doc).
#   - comments.js user-facing UI string (the file:// fallback modal shows a literal
#     bash command users paste into a shell; ${CLAUDE_PLUGIN_ROOT} is unresolvable
#     outside Claude Code's tool runtime).
n_hard=$(grep -rE 'plugins/pmos-toolkit/skills/_shared' plugins/pmos-toolkit/skills/ \
  | grep -v 'apply-edit-at-anchor\.md' \
  | grep -v '_shared/html-authoring/assets/comments\.js:.*comments-open\.sh' \
  | wc -l | tr -d ' ')
if [ "$n_hard" -ne 0 ]; then
  echo "FAIL: $n_hard hardcoded plugins/pmos-toolkit/skills/_shared/ asset refs introduced"
  grep -rE 'plugins/pmos-toolkit/skills/_shared' plugins/pmos-toolkit/skills/ \
    | grep -v 'apply-edit-at-anchor\.md' \
    | grep -v '_shared/html-authoring/assets/comments\.js:.*comments-open\.sh'
  exit 1
fi
echo "PASS: assert_skill_substrate_refs_unchanged.sh ($n_token token refs, 0 hardcoded asset refs; contract-pointer + UI-string exceptions per NFR-08 + comments-open.sh fallback)"
