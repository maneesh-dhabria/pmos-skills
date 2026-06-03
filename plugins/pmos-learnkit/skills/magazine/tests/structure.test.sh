#!/usr/bin/env bash
# structure.test.sh — aggregate structural gate for the /magazine skill.
# Asserts SKILL.md conformance, reference + script presence, and runs every
# bundled script's --selftest. Exit 0 = all pass.
#
# Dependencies: bash, node. Run: bash tests/structure.test.sh
set -u

DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
SKILL="$DIR/SKILL.md"
fail=0
pass=0
chk() { if eval "$2"; then pass=$((pass+1)); else echo "FAIL: $1"; fail=$((fail+1)); fi; }

# --- SKILL.md frontmatter + body (§A/§D) ---
chk "frontmatter opens with ---"           "[ \"\$(head -1 '$SKILL')\" = '---' ]"
chk "name: magazine"                        "grep -q '^name: magazine\$' '$SKILL'"
chk "user-invocable: true"                  "grep -q '^user-invocable: true\$' '$SKILL'"
chk "argument-hint present"                 "grep -q '^argument-hint:' '$SKILL'"
chk "Platform Adaptation section"           "grep -qE '^## +Platform Adaptation' '$SKILL'"
chk "Track Progress section"                "grep -qE '^## +Track Progress' '$SKILL'"
chk "learnings-load line"                   "grep -q 'learnings.md' '$SKILL'"
chk "## /magazine learnings ref"            "grep -q '## /magazine' '$SKILL'"
chk "numbered Capture Learnings phase"      "grep -qE '^## +Phase [0-9N].*Capture Learnings' '$SKILL'"
chk "non-interactive block present"         "grep -q '<!-- non-interactive-block:start -->' '$SKILL'"
chk "no hard-coded /Users path"             "! grep -qE '/Users/|/home/' '$SKILL'"
chk "portable CLAUDE_SKILL_DIR token"       "grep -q 'CLAUDE_SKILL_DIR' '$SKILL'"

# --- reference files (§C) ---
for r in config-schema pipeline issue-format import; do
  chk "reference/$r.md exists"              "[ -f '$DIR/reference/$r.md' ]"
  chk "reference/$r.md has a ToC"           "grep -qiE '^## +(Contents|Table of contents)' '$DIR/reference/$r.md'"
done

# --- scripts present + self-test (§E) ---
chk "scripts/magazine-state.js"             "[ -f '$DIR/scripts/magazine-state.js' ]"
chk "scripts/fetch-feed.js"                 "[ -f '$DIR/scripts/fetch-feed.js' ]"
chk "scripts/extract-article.js"            "[ -f '$DIR/scripts/extract-article.js' ]"
chk "scripts/transcribe.sh"                 "[ -f '$DIR/scripts/transcribe.sh' ]"
chk "scripts/render-issue.js"               "[ -f '$DIR/scripts/render-issue.js' ]"

chk "magazine-state --selftest"             "node '$DIR/scripts/magazine-state.js' --selftest >/dev/null"
chk "fetch-feed --selftest"                 "node '$DIR/scripts/fetch-feed.js' --selftest >/dev/null"
chk "extract-article --selftest"            "node '$DIR/scripts/extract-article.js' --selftest >/dev/null"
chk "transcribe --selftest"                 "bash '$DIR/scripts/transcribe.sh' --selftest >/dev/null"
chk "render-issue --selftest"               "node '$DIR/scripts/render-issue.js' --selftest >/dev/null"

# --- no loose files in skill root (§C asset layout) ---
loose="$(find "$DIR" -maxdepth 1 -type f ! -name 'SKILL.md' | wc -l | tr -d ' ')"
chk "no loose files in skill root"          "[ \"$loose\" = '0' ]"

echo "structure.test.sh: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
