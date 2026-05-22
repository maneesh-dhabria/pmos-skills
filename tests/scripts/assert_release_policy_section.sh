#!/usr/bin/env bash
set -e
grep -qE '^## Release policy' CLAUDE.md || { echo "FAIL: missing ## Release policy heading"; exit 1; }
for sub in 'Plugins list' 'Tag convention' '/complete-dev invocation' 'Drift hook contract' 'Tri-remote topology' 'Old repo posture'; do
  grep -qE "$sub" CLAUDE.md || { echo "FAIL: missing subsection '$sub'"; exit 1; }
done
grep -q 'pmos-toolkit' CLAUDE.md || { echo "FAIL: Plugins list does not mention pmos-toolkit"; exit 1; }
echo "PASS: assert_release_policy_section.sh"
