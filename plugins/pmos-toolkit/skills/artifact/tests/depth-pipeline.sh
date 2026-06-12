#!/usr/bin/env bash
# depth-pipeline.sh — structure tests for the --depth document-pipeline deepening.
# Asserts SKILL.md advertises the dial, declares each new phase, gates them by
# depth, and documents the subagent-degradation fallback. Bash 3.2-safe.
# Materialize-then-here-string (never `cmd | grep -q`) to avoid the SIGPIPE/
# pipefail flake (see /execute learnings 2026-05-13, 2026-06-03).
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
SKILL="$DIR/SKILL.md"
BODY="$(cat "$SKILL")"
REF="$DIR/reference"
fail=0
ok()  { printf 'ok   - %s\n' "$1"; }
bad() { printf 'FAIL - %s\n' "$1"; fail=1; }
has() { grep -qF -- "$2" <<<"$BODY" && ok "$1" || bad "$1"; }
hasre() { grep -qE -- "$2" <<<"$BODY" && ok "$1" || bad "$1"; }

# --- the dial ---
has  "argument-hint advertises --depth"            '--depth brief|standard|deep'
has  "Phase 0 resolves {depth} with default standard" 'builtin default **`standard`**'
hasre "--tier kept as nl-sugar alias"               'nl-sugar'
has  "depth stderr line documented"                 'depth: <value> (source:'

# --- create-flow inserts ---
has  "Step 1.5 propose-template-when-none"          'Step 1.5 — Propose a template when none matches'
has  "Step 2 routes no-match to 1.5"                'No match → route to Step 1.5'
has  "Step 7.5 research gate (deep)"                'Step 7.5 — Research phase (gated on `--depth deep`)'
has  "Step 8 length_target informational steering"  'informational steering'

# --- post-draft phases ---
has  "Phase 3.5 persona panel"                      '## Phase 3.5: Persona Panel'
has  "Phase 3.7 diagram pass"                        '## Phase 3.7: Diagram Pass'
has  "Phase 3.8 polish"                              '## Phase 3.8: Polish'
has  "Phase 3.9 grill"                               '## Phase 3.9: Grill'

# --- gating semantics ---
has  "persona gated standard+deep"                  '{depth} ∈ {standard, deep}'
has  "diagram gated deep / pref"                     'artifact.diagram_pass == true'
has  "polish always"                                 '**Gate:** always (every `{depth}`).'
has  "grill mandatory (no skip)"                     'Grill is mandatory'

# --- the #1 risk: subagent degradation ---
has  "subagent skip-with-note degradation"          'pmos:deferred-pass'
has  "degradation cites child skills"               'cannot be invoked by a subagent'

# --- reference contracts exist with ToCs ---
for f in research-phase persona-panel diagram-pass new-template-guidelines; do
  if [ -f "$REF/$f.md" ]; then
    grep -qF '## Contents' "$REF/$f.md" && ok "reference/$f.md has ToC" || bad "reference/$f.md missing ToC"
  else
    bad "reference/$f.md missing"
  fi
done

# --- templates carry personas + length_target ---
for t in prd experiment-design eng-design discovery; do
  TF="$DIR/templates/$t/template.md"
  FM="$(cat "$TF")"
  grep -qE '^personas:' <<<"$FM" && grep -qE '^length_target:' <<<"$FM" \
    && ok "template $t has personas + length_target" \
    || bad "template $t missing personas/length_target"
done

if [ "$fail" -eq 0 ]; then printf '\nPASS: all depth-pipeline structure checks\n'; else printf '\nFAILURES present\n'; exit 1; fi
