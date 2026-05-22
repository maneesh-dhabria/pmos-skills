#!/usr/bin/env bash
# tools/dispatch-deep-pass.sh — assemble the Task-subagent prompt for the
# --deep pass (FR-24/29).
#
# Contract: this wrapper CANNOT call the Task tool from bash — Task dispatch
# lives at the SKILL.md / orchestrator layer (T23). Its real job is to
# assemble the system + user prompt from the payload tmpfile and write a
# prompt sidecar (<payload>.prompt). SKILL.md then invokes the Task tool with
# that prompt and writes the subagent response to <payload>.result, which
# run-audit.sh consumes via --deep-finalize-result <path>.
#
# NFR-09 layer 2 (denylist enforcement at the subagent Read-call wrapper) is
# not implementable from a bash wrapper — the Task tool's Read calls are not
# interceptable from outside the harness. T17's layer-1 denylist filter at
# metadata-build time (run-audit.sh) remains the binding contract; this is
# the spec's NFR-09 "platform does not expose mid-tool-call interception"
# degradation path.
#
# Usage: dispatch-deep-pass.sh <payload_tmpfile>
# Effects: writes <payload_tmpfile>.prompt.
# Exits 0 on success; exits 64 if the deepening-vocabulary reference is missing.

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: dispatch-deep-pass.sh <payload_tmpfile>" >&2
  exit 64
fi

PAYLOAD="$1"
PROMPT_OUT="${PAYLOAD}.prompt"

if [ ! -s "$PAYLOAD" ]; then
  echo "ERROR: payload tmpfile missing or empty: $PAYLOAD" >&2
  exit 64
fi

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VOCAB_PATH="$SKILL_DIR/reference/deepening-vocabulary.md"

if [ ! -f "$VOCAB_PATH" ]; then
  echo "ERROR: deepening-vocabulary reference not found at $VOCAB_PATH" >&2
  exit 64
fi

SYSTEM_PROMPT="$(cat "$VOCAB_PATH")"

# Body of the user prompt: module_metadata[] + seed_hint[] from the payload
# plus the verbatim return-shape template per spec section 6.2, then the
# expand-from-seed instruction.
MODULE_METADATA="$(jq -c '.module_metadata' "$PAYLOAD")"
SEED_HINT="$(jq -c '.seed_hint' "$PAYLOAD")"

RETURN_SHAPE='{"candidates":[{"module":"<path>","classification":"deep|shallow|leaky","rationale":"<one-paragraph reshape thesis>","deletion_test":{"outcome":"vanishes|reappears","estimate":"low|medium|high"},"cross_module_patterns":[{"evidence":"<verbatim substring from a file>"}],"proposed_reshape":"<one-sentence proposed change>","affected_files":["<path>","<path>"]}]}'

INSTRUCTION='Start with seed_hint; expand to other modules in the graph if cross-module patterns lead you there.'

{
  printf '%s\n\n' "=== SYSTEM ==="
  printf '%s\n\n' "$SYSTEM_PROMPT"
  printf '%s\n\n' "=== USER ==="
  printf 'module_metadata:\n%s\n\n' "$MODULE_METADATA"
  printf 'seed_hint:\n%s\n\n' "$SEED_HINT"
  printf 'Return JSON matching exactly this shape:\n%s\n\n' "$RETURN_SHAPE"
  printf '%s\n' "$INSTRUCTION"
} > "$PROMPT_OUT"

exit 0
