#!/usr/bin/env bash
# tools/dispatch-deep-pass.sh — assemble the Task-subagent prompt for the
# --deep pass (FR-24/29) and provide the NFR-09 layer-2 denylist wrapper.
#
# Contract: this wrapper CANNOT call the Task tool from bash — Task dispatch
# lives at the SKILL.md / orchestrator layer (T23). Its real job is to
# assemble the system + user prompt from the payload tmpfile and write a
# prompt sidecar (<payload>.prompt). SKILL.md then invokes the Task tool with
# that prompt and writes the subagent response to <payload>.result, which
# run-audit.sh consumes via --deep-finalize-result <path>.
#
# NFR-09 has two mechanisms:
#   (a) layer-1: metadata-build-time denylist filter in run-audit.sh (T17).
#   (b) layer-2: read_with_denylist() defined here — the orchestrator wraps
#       subagent Read calls through this function so a path matching any of
#       the 8 secret-file globs returns a stub instead of file contents. The
#       same 8 patterns are also appended to the system prompt as advisory
#       text so the subagent does not retry around the wrapper.
#
# Usage as script: dispatch-deep-pass.sh <payload_tmpfile>
#   Effects: writes <payload_tmpfile>.prompt.
#   Exits 0 on success; exits 64 if the deepening-vocabulary reference is missing.
# Usage as library: `source dispatch-deep-pass.sh` then call read_with_denylist <path>.

set -euo pipefail

# 8 secret-file globs from spec NFR-09 (kept in sync with T17's jq filter).
read_with_denylist() {
  local path="$1"
  case "$path" in
    .env|*/.env|.env.*|*/.env.*) echo "path matched secret-file denylist; not read"; return 0 ;;
    *.pem|*.key) echo "path matched secret-file denylist; not read"; return 0 ;;
    credentials.json|*/credentials.json) echo "path matched secret-file denylist; not read"; return 0 ;;
    credentials.yaml|*/credentials.yaml) echo "path matched secret-file denylist; not read"; return 0 ;;
    .ssh/*|*/.ssh/*) echo "path matched secret-file denylist; not read"; return 0 ;;
    secrets/*|*/secrets/*) echo "path matched secret-file denylist; not read"; return 0 ;;
  esac
  cat "$path"
}

# When sourced as a library, stop here — the caller only needs the function.
if [ "${BASH_SOURCE[0]}" != "${0}" ]; then
  return 0
fi

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

DENYLIST_ADVISORY='The orchestrator wraps your Read calls. Paths matching any of the following globs return a stub ("path matched secret-file denylist; not read") instead of file contents. Do not fabricate evidence from files you could not read; skip them.'

{
  printf '%s\n\n' "=== SYSTEM ==="
  printf '%s\n\n' "$SYSTEM_PROMPT"
  printf '%s\n' "=== DENYLIST ==="
  printf '%s\n' '**/.env'
  printf '%s\n' '**/.env.*'
  printf '%s\n' '**/*.pem'
  printf '%s\n' '**/*.key'
  printf '%s\n' '**/credentials.json'
  printf '%s\n' '**/credentials.yaml'
  printf '%s\n' '**/.ssh/**'
  printf '%s\n' '**/secrets/**'
  printf '%s\n\n' "$DENYLIST_ADVISORY"
  printf '%s\n\n' "=== USER ==="
  printf 'module_metadata:\n%s\n\n' "$MODULE_METADATA"
  printf 'seed_hint:\n%s\n\n' "$SEED_HINT"
  printf 'Return JSON matching exactly this shape:\n%s\n\n' "$RETURN_SHAPE"
  printf '%s\n' "$INSTRUCTION"
} > "$PROMPT_OUT"

exit 0
