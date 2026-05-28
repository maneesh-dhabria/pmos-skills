#!/usr/bin/env bash
# Test: judge-prompt-template.md presence and required content.
# Covers FR-32, FR-33, FR-35 — verifies the template carries every substitution
# token, the §13 output-schema field set, and the verbatim-quote instruction.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
TEMPLATE="${SCRIPT_DIR}/../reference/judge-prompt-template.md"

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "PASS: $*"; }

# 1. file exists
[[ -f "$TEMPLATE" ]] || fail "template file missing at $TEMPLATE"
pass "template file exists"

# 2. substitution tokens
for tok in '{{principles}}' '{{artifact}}' '{{rule_id_set}}' '{{mode}}'; do
  grep -qF "$tok" "$TEMPLATE" || fail "missing substitution token: $tok"
done
pass "all 4 substitution tokens present"

# 3. verbatim-quote instruction (UTF-8 ≥ U+2265)
grep -qF 'quote ≥40 chars verbatim' "$TEMPLATE" \
  || fail "missing instruction string: 'quote ≥40 chars verbatim'"
pass "verbatim-quote instruction present"

# 4. §13 output schema — all 7 field identifiers
for field in 'rule_id' 'severity' 'confidence' 'spec_section_id' 'file_path' 'quote' 'finding' 'recommendation'; do
  grep -qE "(^|[^a-zA-Z_])${field}([^a-zA-Z_]|$)" "$TEMPLATE" \
    || fail "missing schema field identifier: $field"
done
pass "all 7 schema field identifiers present (rule_id, severity, confidence, spec_section_id, file_path, quote, finding, recommendation)"

echo "ALL CHECKS PASSED"
