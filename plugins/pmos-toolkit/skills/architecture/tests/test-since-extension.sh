#!/usr/bin/env bash
# test-since-extension.sh — T11 unit tests for the --since mode extension.
#
# What this verifies:
#   (1) SKILL.md authors the merged judge-modes section ({#judge-modes}) covering --since
#   (2) SKILL.md documents the empty-diff skip log line
#   (3) SKILL.md wires the emitter with --mode since
#   (4) Empty-diff pre-flight bash semantic returns empty CHANGED in a temp repo
#   (5) 1-commit-ahead pre-flight returns a non-empty CHANGED in a temp repo
#   (6) Round-trip through validate-findings → apply-knobs → emit-findings with
#       --mode since produces a §13-conforming triplet whose JSON carries
#       file_path on every finding (not spec_section_id).

set -u
set -o pipefail

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILL_MD="$SKILL_DIR/SKILL.md"
VALIDATOR="$SKILL_DIR/scripts/validate-findings.js"
KNOBS="$SKILL_DIR/scripts/apply-knobs.js"
EMITTER="$SKILL_DIR/scripts/emit-findings.js"
FIX="$SCRIPT_DIR/fixtures/judge-output-since-mode.json"

PASS=0
FAIL=0

assert() {
  local desc="$1"; local cond="$2"
  if eval "$cond"; then
    echo "  PASS: $desc"
    PASS=$((PASS+1))
  else
    echo "  FAIL: $desc  (cond: $cond)"
    FAIL=$((FAIL+1))
  fi
}

# ── SKILL.md content checks (FR-09/FR-10/FR-11 surfaces) ─────────────────────
echo "[skill.md] structural checks"
assert "SKILL.md has the merged judge-modes heading covering --since" \
  "grep -qE '^## Judge modes: --from-spec / --since \{#judge-modes\}' '$SKILL_MD'"
assert "SKILL.md documents the empty-diff skip log" \
  "grep -qE 'architecture: no changes since' '$SKILL_MD'"
assert "SKILL.md wires the emitter with --mode since" \
  "grep -qE '\-\-mode since' '$SKILL_MD'"
assert "SKILL.md mentions the §13 schema with file_path for since mode" \
  "grep -qE 'file_path' '$SKILL_MD'"

# ── Pre-flight bash semantic in a temp git repo ──────────────────────────────
echo "[temp repo] empty-diff pre-flight"
TMP1="$(mktemp -d)"
(
  cd "$TMP1"
  git init -q
  git config user.email "test@example.com"
  git config user.name "test"
  echo "seed" > a.txt
  git add a.txt
  git commit -q -m "seed"
)
set +e
CHANGED1="$(cd "$TMP1" && git diff --name-only HEAD..HEAD 2>/dev/null)"
RC1=$?
set -e
assert "empty-diff: git diff returns empty CHANGED" "[ -z '$CHANGED1' ] && [ '$RC1' -eq 0 ]"
rm -rf "$TMP1"

echo "[temp repo] 1-commit-ahead pre-flight"
TMP2="$(mktemp -d)"
(
  cd "$TMP2"
  git init -q
  git config user.email "test@example.com"
  git config user.name "test"
  echo "seed" > a.txt
  git add a.txt
  git commit -q -m "seed"
  BASE="$(git rev-parse HEAD)"
  echo "test" > foo.ts
  git add foo.ts
  git commit -q -m "add foo.ts"
  echo "$BASE" > "$TMP2/.base"
)
BASE="$(cat "$TMP2/.base")"
CHANGED2="$(cd "$TMP2" && git diff --name-only "$BASE"..HEAD)"
assert "1-ahead: foo.ts appears in CHANGED" "echo '$CHANGED2' | grep -qx 'foo.ts'"
rm -rf "$TMP2"

# ── End-to-end pipeline: validate → knobs → emit (--mode since) ──────────────
echo "[pipeline] validate → knobs → emit (--mode since)"
# The validator's quote-in-source rule requires the source artifact to contain
# the quote text. Compose a synthetic source that includes both fixture quotes.
SRC="$(mktemp).source.txt"
node -e '
  const fs = require("fs");
  const a = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  fs.writeFileSync(process.argv[2], a.map(f => f.quote).join("\n") + "\n");
' "$FIX" "$SRC"

PREFIX="/tmp/test-since-extension_out"
rm -f "$PREFIX".{json,html,md} "$PREFIX".*.tmp.* 2>/dev/null || true

# Rule-id set must include both fixture rule_ids for the validator to keep them.
set +e
KEPT="$(cat "$FIX" | node "$VALIDATOR" --rule-id-set "U001,U007" --source "$SRC" 2>/dev/null)"
RC_V=$?
set -e
assert "validator exits 0"                     "[ '$RC_V' -eq 0 ]"
assert "validator kept >= 1 finding"           "echo '$KEPT' | node -e 'process.exit(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).length>=1?0:1)'"

set +e
echo "$KEPT" | node "$KNOBS" --top-n 8 --min-confidence 70 --evidence-required \
  | node "$EMITTER" --out-prefix "$PREFIX" --mode since --source-path "$SRC"
RC_E=$?
set -e
assert "emit (since mode) exits 0"             "[ '$RC_E' -eq 0 ]"
assert "since mode: json file exists"          "[ -s '$PREFIX.json' ]"
assert "since mode: html file exists"          "[ -s '$PREFIX.html' ]"
assert "since mode: md file exists"            "[ -s '$PREFIX.md' ]"

# §13 schema for --mode since: every finding has file_path, none has spec_section_id
assert "since mode: every finding has file_path" "node -e '
  const a=JSON.parse(require(\"fs\").readFileSync(\"'$PREFIX'.json\",\"utf8\"));
  for (const f of a){ if (typeof f.file_path !== \"string\" || !f.file_path) process.exit(1); }
  process.exit(0)'"
assert "since mode: no finding carries spec_section_id" "node -e '
  const a=JSON.parse(require(\"fs\").readFileSync(\"'$PREFIX'.json\",\"utf8\"));
  for (const f of a){ if (\"spec_section_id\" in f) process.exit(1); }
  process.exit(0)'"
assert "since mode: html carries pmos:skill meta" \
  "grep -q '<meta name=\"pmos:skill\" content=\"architecture\">' '$PREFIX.html'"
assert "since mode: md has '## Finding 1'" \
  "grep -q '^## Finding 1' '$PREFIX.md'"

rm -f "$SRC" "$PREFIX".{json,html,md} 2>/dev/null || true

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
