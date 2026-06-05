#!/usr/bin/env bats
load test_helper

@test "non-interactive.md exists" {
  [ -f "$SHARED_FILE" ]
}

@test "non-interactive.md has Section 0 markers" {
  grep -q '<!-- non-interactive-block:start -->' "$SHARED_FILE"
  grep -q '<!-- non-interactive-block:end -->' "$SHARED_FILE"
}

@test "non-interactive.md has awk-extractor markers" {
  grep -q '<!-- awk-extractor:start -->' "$SHARED_FILE"
  grep -q '<!-- awk-extractor:end -->' "$SHARED_FILE"
}

@test "Section 0 prescribes resolver precedence" {
  awk '/<!-- non-interactive-block:start -->/,/<!-- non-interactive-block:end -->/' "$SHARED_FILE" \
    | grep -qE 'flag.*parent.*settings.*default|flag > parent_marker > settings'
}

@test "Section 0 references the call-site auditor (not the inlined extractor)" {
  awk '/<!-- non-interactive-block:start -->/,/<!-- non-interactive-block:end -->/' "$SHARED_FILE" \
    | grep -q 'audit-recommended.sh'
}

@test "awk extractor lives outside the inlined Section 0 block (in Section D)" {
  # The inlined block must NOT carry the extractor — it would bloat every skill.
  ! { awk '/<!-- non-interactive-block:start -->/,/<!-- non-interactive-block:end -->/' "$SHARED_FILE" \
      | grep -q 'awk-extractor:start'; }
  # Section D must carry the extractor between its markers.
  awk '/^## Section D/,0' "$SHARED_FILE" | grep -q '<!-- awk-extractor:start -->'
}

@test "Section A defines refusal regex and exit 64" {
  awk '/^## Section A/,/^## Section B/' "$SHARED_FILE" \
    | grep -qE 'exit[[:space:]]+64'
  awk '/^## Section A/,/^## Section B/' "$SHARED_FILE" \
    | grep -qE '\^--non-interactive not supported by'
}

@test "Section B contains parser markers" {
  awk '/^## Section B/,/^## Section C/' "$SHARED_FILE" \
    | grep -q '<!-- parser-snippet:start -->'
  awk '/^## Section B/,/^## Section C/' "$SHARED_FILE" \
    | grep -q '<!-- parser-snippet:end -->'
}

@test "Section C documents [mode: ...] prefix marker" {
  awk '/^## Section C/,0' "$SHARED_FILE" \
    | grep -qE '\[mode: (interactive|non-interactive)\]'
}
