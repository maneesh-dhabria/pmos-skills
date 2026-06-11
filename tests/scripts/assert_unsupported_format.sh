#!/usr/bin/env bash
# Assert: each affected SKILL.md enumerates the valid output_format set
# `{html, md}` (legacy `both` is treated as `html` per the FR-12.1 retirement
# note in _shared/html-authoring/README.md step 6), by-construction excluding
# `markdown` and other invalid tokens. Static-check harness — see task-19.md
# "Why static-check" for the OQ-3-style rationale (live skill-runtime
# invocation isn't shell-callable).
#
# Plan T19 plain reading: "When `output_format: markdown` is in
# settings.yaml, every affected skill exits 64". The valid set was
# {html, md, both} per FR-12; v2.59.0 retired `both` (FR-12.1), so the live
# set is {html, md} with `both` accepted as a legacy alias for `html`. We
# verify the valid-set is enumerated in each SKILL.md; that, combined with
# the FR-01.5 settings.yaml-malformed → exit-64 contract already inlined in
# every skill's non-interactive block, gives the live refusal. (Updated
# 2026-06-11, design-review P1/P2 Wave 3 — per-skill enumerations converged
# on the post-retirement wording.)
#
# Spec refs: FR-82, FR-12, FR-12.1; spec §14.1.
TARGET=${1:-plugins/pmos-toolkit/skills}
AFFECTED="requirements spec plan msf-req grill artifact verify simulate-spec msf-wf design-crit"
fail=0
for s in $AFFECTED; do
  f="$TARGET/$s/SKILL.md"
  if [ ! -f "$f" ]; then
    echo "FAIL: $s — SKILL.md not found at $f"
    fail=1
    continue
  fi
  # Valid-set enumeration: literal `html`, `md` near "valid values" (the
  # legacy-`both` alias note is allowed after it). This is the
  # by-construction refusal — any token outside the set (including
  # `markdown`) falls through the resolution gate and is rejected.
  set_enum=$(grep -cE 'valid values: ?\`html\`,? ?\`md\`' "$f")
  if [ "$set_enum" -lt 1 ]; then
    echo "FAIL: $s — missing valid-set enumeration of {html, md}"
    fail=1
  else
    echo "OK:   $s — valid-set=$set_enum"
  fi
done
[ $fail -eq 0 ] || exit 1
echo "PASS: assert_unsupported_format.sh (10 skills)"
