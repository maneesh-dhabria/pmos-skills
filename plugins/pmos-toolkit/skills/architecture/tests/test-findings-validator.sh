#!/usr/bin/env bash
# Test: validate-findings.js (FR-06 orchestrator-side judge-output validator).
#
# Feeds the invalid-mix fixture (5 entries: 1 valid, 4 distinct invalid kinds)
# through `node validate-findings.js --rule-id-set "U001,U002" --source <spec>`
# and asserts:
#   - stdout JSON contains exactly 1 finding (the valid one, rule_id U001 conf 85).
#   - stderr carries 4 distinct drop log lines, one per invalid kind.
#
# Spec refs: FR-06, FR-01, §9.1, §9.3.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
VALIDATOR="${SKILL_DIR}/scripts/validate-findings.js"
FIXTURE="${SCRIPT_DIR}/fixtures/judge-output-invalid-mix.json"
SOURCE="${SCRIPT_DIR}/fixtures/spec-canonical.html"

fail() { echo "FAIL: $*" >&2; exit 1; }

[ -f "${VALIDATOR}" ] || fail "validator not found at ${VALIDATOR}"
[ -f "${FIXTURE}" ] || fail "fixture not found at ${FIXTURE}"
[ -f "${SOURCE}" ] || fail "source not found at ${SOURCE}"

STDOUT_FILE="$(mktemp)"
STDERR_FILE="$(mktemp)"
trap 'rm -f "${STDOUT_FILE}" "${STDERR_FILE}"' EXIT

if ! node "${VALIDATOR}" --rule-id-set "U001,U002" --source "${SOURCE}" \
      < "${FIXTURE}" > "${STDOUT_FILE}" 2> "${STDERR_FILE}"; then
  echo "--- stderr ---" >&2
  cat "${STDERR_FILE}" >&2
  fail "validator exited non-zero"
fi

# Stdout: parse and assert exactly 1 kept finding.
KEPT_COUNT="$(node -e '
  const fs = require("fs");
  const arr = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (!Array.isArray(arr)) { console.error("stdout not an array"); process.exit(2); }
  console.log(arr.length);
' "${STDOUT_FILE}")"

if [ "${KEPT_COUNT}" != "1" ]; then
  echo "--- stdout ---" >&2
  cat "${STDOUT_FILE}" >&2
  fail "expected 1 kept finding, got ${KEPT_COUNT}"
fi

# Stdout: that finding must be rule_id U001 with confidence 85.
KEPT_RULE="$(node -e '
  const fs = require("fs");
  const arr = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  console.log(arr[0].rule_id + ":" + arr[0].confidence);
' "${STDOUT_FILE}")"

if [ "${KEPT_RULE}" != "U001:85" ]; then
  fail "kept finding shape wrong: expected U001:85, got ${KEPT_RULE}"
fi

# Stderr: assert 4 distinct drop kinds present.
assert_stderr_contains() {
  local needle="$1"
  if ! grep -F -- "${needle}" "${STDERR_FILE}" > /dev/null; then
    echo "--- stderr ---" >&2
    cat "${STDERR_FILE}" >&2
    fail "stderr missing drop log: ${needle}"
  fi
}

assert_stderr_contains 'dropped finding: unknown rule_id "U999"'
assert_stderr_contains 'dropped finding: confidence out of range (rule_id U001, value 150)'
assert_stderr_contains 'dropped finding: missing quote (rule_id U002)'
assert_stderr_contains 'dropped finding: quote not in source (rule_id U001)'

# Sanity: 4 distinct "dropped finding:" lines.
DROP_LINE_COUNT="$(grep -c '^dropped finding:' "${STDERR_FILE}" || true)"
if [ "${DROP_LINE_COUNT}" -lt 4 ]; then
  echo "--- stderr ---" >&2
  cat "${STDERR_FILE}" >&2
  fail "expected ≥4 drop log lines, got ${DROP_LINE_COUNT}"
fi

echo "PASS: test-findings-validator.sh"
