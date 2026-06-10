#!/usr/bin/env bash
# skill-eval-check.sh
#
# Runs the *deterministic* half of the skill-eval.md rubric against a skill
# directory. The [D]-tagged checks in ../reference/skill-eval.md are implemented
# here (DET_CHECKS below is the authoritative set, asserted against the rubric by
# --selftest); the gated [J] (llm-judge) checks and the advisory [J] signals are
# run separately by a reviewer subagent. Three [D] checks shell out to the host
# repo's root tools/ lints (lint-flags-vs-hints.sh, lint-phase-refs.sh), resolved
# by walking up from this script; when a lint is missing the check is skipped
# with a stderr WARN, never crashed (the rubric may be synced into a plugin that
# lacks the repo-root tools/).
#
# Exit codes: 0 = all applicable [D] checks pass (or bijection holds in --selftest);
#             1 = a [D] check failed (or the bijection is broken); 2 = invocation /
#             script error. Dependencies: bash >= 3.2, coreutils (grep, sed, awk,
#             wc, head, find, basename) — no Node, no jq. See full notes below.
#
# Usage:
#   skill-eval-check.sh [--target claude-code|codex|generic] [--plan <path>] [--selftest] <skill_dir>
#   skill-eval-check.sh --selftest <skill_dir>          # bijection self-check only
#
# --plan <path> enables 10.G (release-prereqs scope) checks. Without --plan the
# 10.G group is skipped per its group-skip rule (no 03_plan artifact → N/A).
#
# Modes:
#   scoring  (<skill_dir> given)  — emit one TSV line per applicable [D] check:
#                                   <check_id>\t<pass|fail>\t<evidence>  (on stdout)
#   selftest (--selftest)         — assert (1) the [D] check set in skill-eval.md
#                                   equals this script's DET_CHECKS array, (2) every
#                                   check row in skill-eval.md names a skill-patterns
#                                   §-rule (the FR-72 bijection), and (3) the rubric's
#                                   opening-line counts (total / gated / [D] / gated
#                                   [J] / advisory / pass floor = gated − 4) equal the
#                                   table reality — no hard-coded numbers; both sides
#                                   are parsed from skill-eval.md. Prints PASS/FAIL on
#                                   stderr. <skill_dir> is still required (it locates
#                                   ../reference/skill-eval.md is relative to this
#                                   script, but a target dir keeps the CLI uniform).
#
# Exit codes:
#   0 — all applicable [D] checks pass (scoring), or bijection holds (selftest)
#   1 — at least one [D] check fails (scoring), or the bijection is broken (selftest)
#   2 — invocation / script error (bad --target, unreadable SKILL.md, missing
#       skill-eval.md, no skill_dir, ...) — message on stderr
#
# Group-skip rules (part of the skill-eval.md contract):
#   - no scripts/ dir and no bundled executable scripts  → group E checks skipped
#   - no reference/ (or references/) dir                 → reference-only group-C
#                                                          checks N/A; c-body-size
#                                                          still runs
#   - --target generic                                  → group F checks skipped
#   - no --plan <path> given (or path missing)           → group G checks skipped
#   - repo-root tools/lint-flags-vs-hints.sh missing     → i-hint-contract-only +
#                                                          i-nl-sugar-marked skipped
#                                                          (stderr WARN, no fail)
#   - repo-root tools/lint-phase-refs.sh missing         → j-phase-refs-resolve
#                                                          skipped (stderr WARN)
#
# Dependencies: bash >= 3.2, coreutils (grep, sed, awk, wc, head, find, basename).
#               No Node, no jq.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
SKILL_EVAL_MD="${SCRIPT_DIR}/../reference/skill-eval.md"

# The deterministic checks this script implements. MUST equal the set of
# [D]-tagged rows in skill-eval.md (asserted by --selftest).
DET_CHECKS=(
  a-frontmatter-present a-name-present a-name-lowercase-hyphen a-name-len
  a-name-matches-dir a-desc-present a-desc-len
  c-body-size c-references-dir-name c-references-one-level c-reference-toc
  c-portable-paths c-asset-layout
  d-platform-adaptation d-learnings-load-line d-capture-learnings-phase
  d-progress-tracking
  e-scripts-dir
  f-cc-user-invocable f-codex-sidecar
  g-plan-grep-clean
  i-hint-contract-only i-nl-sugar-marked
  j-phase-refs-resolve
)

# Walk up from this script's directory looking for a repo-relative tool path
# (e.g. tools/lint-flags-vs-hints.sh). Prints the absolute path on success.
# Walking up (instead of a fixed ../../../../..) keeps the lookup correct when
# the skill tree is synced to a different depth, and returns non-zero (→ skip
# with WARN) when the host repo has no root tools/.
find_repo_tool() {
  local rel="$1" d="$SCRIPT_DIR"
  while [[ -n "$d" && "$d" != "/" ]]; do
    if [[ -f "$d/$rel" ]]; then printf '%s\n' "$d/$rel"; return 0; fi
    d="$(dirname "$d")"
  done
  return 1
}

die() { echo "ERROR: $*" >&2; exit 2; }

# ---- arg parsing -----------------------------------------------------------
TARGET="generic"
SELFTEST=0
SKILL_DIR=""
PLAN_FILE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) [[ $# -ge 2 ]] || die "--target needs a value"; TARGET="$2"; shift 2;;
    --target=*) TARGET="${1#*=}"; shift;;
    --plan) [[ $# -ge 2 ]] || die "--plan needs a path"; PLAN_FILE="$2"; shift 2;;
    --plan=*) PLAN_FILE="${1#*=}"; shift;;
    --selftest) SELFTEST=1; shift;;
    --) shift; [[ $# -gt 0 ]] && SKILL_DIR="$1" && shift; break;;
    -*) die "unknown flag $1";;
    *) SKILL_DIR="$1"; shift;;
  esac
done
case "$TARGET" in claude-code|codex|generic) ;; *) die "invalid --target '$TARGET' (expected claude-code|codex|generic)";; esac
[[ -n "$SKILL_DIR" ]] || die "no <skill_dir> given"
[[ -f "$SKILL_EVAL_MD" ]] || die "skill-eval.md not found at $SKILL_EVAL_MD"

# ---- skill-eval.md parsing helpers ----------------------------------------
# A check row in skill-eval.md looks like:  | <check-id> | [D] | ... | skill-patterns.md §X |
# Extract the [D] check ids:
eval_md_det_ids() {
  grep -E '^\|[[:space:]]*[a-z][a-z0-9-]*[[:space:]]*\|[[:space:]]*\[D\][[:space:]]*\|' "$SKILL_EVAL_MD" \
    | sed -E 's/^\|[[:space:]]*([a-z][a-z0-9-]*)[[:space:]]*\|.*/\1/' | sort -u
}
# Every check row (any tag), for the §-bijection check:
eval_md_all_rows() {
  grep -E '^\|[[:space:]]*[a-z][a-z0-9-]*[[:space:]]*\|[[:space:]]*\[[DJ]\][[:space:]]*\|' "$SKILL_EVAL_MD"
}

# ---- selftest mode ---------------------------------------------------------
if [[ $SELFTEST -eq 1 ]]; then
  fail=0
  want="$(printf '%s\n' "${DET_CHECKS[@]}" | sort -u)"
  have="$(eval_md_det_ids)"
  only_md="$(comm -13 <(printf '%s\n' "$want") <(printf '%s\n' "$have"))"
  only_sh="$(comm -23 <(printf '%s\n' "$want") <(printf '%s\n' "$have"))"
  if [[ -n "$only_md" ]]; then echo "SELFTEST FAIL: [D] checks in skill-eval.md not implemented in script: $(echo $only_md)" >&2; fail=1; fi
  if [[ -n "$only_sh" ]]; then echo "SELFTEST FAIL: DET_CHECKS entries not [D]-tagged in skill-eval.md: $(echo $only_sh)" >&2; fail=1; fi
  # every check row names exactly one skill-patterns §-rule
  while IFS= read -r row; do
    [[ -z "$row" ]] && continue
    id="$(printf '%s' "$row" | sed -E 's/^\|[[:space:]]*([a-z][a-z0-9-]*)[[:space:]]*\|.*/\1/')"
    n="$(printf '%s' "$row" | grep -oE 'skill-patterns\.md §[A-Z]' | sort -u | wc -l | tr -d ' ')"
    if [[ "$n" != "1" ]]; then echo "SELFTEST FAIL: check '$id' names $n skill-patterns §-rules (expected 1)" >&2; fail=1; fi
  done <<< "$(eval_md_all_rows)"

  # ---- count assertions: opening counts line vs table reality ----
  # The rubric states its counts exactly once (opening line); nothing here is
  # hard-coded — both sides are parsed from skill-eval.md so the assertion can't
  # go stale when the rubric grows.
  counts_line="$(grep -m1 'binary pass/fail checks' "$SKILL_EVAL_MD" || true)"
  adv_line="$(grep -nE -m1 '^##[[:space:]]+Advisory signals' "$SKILL_EVAL_MD" | cut -d: -f1 || true)"
  if [[ -z "$counts_line" ]]; then
    echo "SELFTEST FAIL: no '<N> binary pass/fail checks' counts line in skill-eval.md header" >&2; fail=1
  elif [[ -z "$adv_line" ]]; then
    echo "SELFTEST FAIL: no '## Advisory signals' section in skill-eval.md" >&2; fail=1
  else
    h_total="$(printf '%s' "$counts_line" | grep -oE '[0-9]+ binary pass/fail checks' | grep -oE '^[0-9]+' || true)"
    h_gated="$(printf '%s' "$counts_line" | grep -oE '[0-9]+ gated' | head -1 | grep -oE '^[0-9]+' || true)"
    h_d="$(printf '%s' "$counts_line" | grep -oE '[0-9]+ `\[D\]`' | head -1 | grep -oE '^[0-9]+' || true)"
    h_j="$(printf '%s' "$counts_line" | grep -oE '[0-9]+ `\[J\]`' | head -1 | grep -oE '^[0-9]+' || true)"
    h_adv="$(printf '%s' "$counts_line" | grep -oE '[0-9]+ advisory' | head -1 | grep -oE '^[0-9]+' || true)"
    h_floor="$(printf '%s' "$counts_line" | grep -oE 'pass floor [0-9]+' | grep -oE '[0-9]+' || true)"
    # table reality: rows above the advisory heading are gated, below are advisory
    row_re='^\|[[:space:]]*[a-z][a-z0-9-]*[[:space:]]*\|[[:space:]]*\[[DJ]\][[:space:]]*\|'
    t_total="$(eval_md_all_rows | wc -l | tr -d ' ')"
    t_adv="$(sed -n "${adv_line},\$p" "$SKILL_EVAL_MD" | grep -cE "$row_re" || true)"
    t_gated=$((t_total - t_adv))
    t_d="$(eval_md_det_ids | wc -l | tr -d ' ')"
    t_j=$((t_gated - t_d))
    adv_d="$(sed -n "${adv_line},\$p" "$SKILL_EVAL_MD" | grep -cE '^\|[[:space:]]*[a-z][a-z0-9-]*[[:space:]]*\|[[:space:]]*\[D\][[:space:]]*\|' || true)"
    if [[ "$adv_d" != "0" ]]; then echo "SELFTEST FAIL: advisory section contains $adv_d [D] row(s) — advisory checks must be [J]" >&2; fail=1; fi
    assert_count() { # label header table
      if [[ -z "$2" ]]; then echo "SELFTEST FAIL: could not parse '$1' from the counts line" >&2; fail=1
      elif [[ "$2" != "$3" ]]; then echo "SELFTEST FAIL: $1 — header says $2, table reality is $3" >&2; fail=1; fi
    }
    assert_count "total checks"      "$h_total" "$t_total"
    assert_count "gated checks"      "$h_gated" "$t_gated"
    assert_count "[D] checks"        "$h_d"     "$t_d"
    assert_count "gated [J] checks"  "$h_j"     "$t_j"
    assert_count "advisory checks"   "$h_adv"   "$t_adv"
    assert_count "pass floor (gated − 4)" "$h_floor" "$((t_gated - 4))"
  fi

  if [[ $fail -eq 0 ]]; then
    echo "SELFTEST PASS: ${#DET_CHECKS[@]} [D] checks ↔ skill-eval.md; every check names one §-rule; header counts match table (total=$t_total gated=$t_gated D=$t_d J=$t_j advisory=$t_adv floor=$((t_gated - 4)))." >&2
    exit 0
  fi
  exit 1
fi

# ---- scoring mode ----------------------------------------------------------
SKILL_DIR="${SKILL_DIR%/}"
[[ -d "$SKILL_DIR" ]] || die "not a directory: $SKILL_DIR"
SKILL_MD="$SKILL_DIR/SKILL.md"
[[ -f "$SKILL_MD" ]] || die "no SKILL.md in $SKILL_DIR"
SKILL_NAME_DIR="$(basename "$SKILL_DIR")"

# Frontmatter region: from line 1 to the 2nd '---' (inclusive), if line 1 is '---'.
FM_END=0
if [[ "$(sed -n '1p' "$SKILL_MD")" == "---" ]]; then
  FM_END="$(awk 'NR==1{next} /^---[[:space:]]*$/{print NR; exit}' "$SKILL_MD")"
  [[ -z "$FM_END" ]] && FM_END=0
fi
fm()   { [[ "$FM_END" -gt 0 ]] && sed -n "1,${FM_END}p" "$SKILL_MD" || true; }
body() { [[ "$FM_END" -gt 0 ]] && sed -n "$((FM_END+1)),\$p" "$SKILL_MD" || cat "$SKILL_MD"; }
fm_val() { fm | grep -m1 -E "^$1:[[:space:]]*" | sed -E "s/^$1:[[:space:]]*//" | sed -E 's/^"(.*)"$/\1/' | sed -E "s/^'(.*)'$/\1/"; }

NAME="$(fm_val name || true)"
DESC="$(fm_val description || true)"

# reference dir
REF_DIR=""
for d in reference references; do [[ -d "$SKILL_DIR/$d" ]] && REF_DIR="$SKILL_DIR/$d" && break; done
# scripts presence: a scripts/ dir, or *.sh/*.py/*.js outside reference*/ and assets/
HAS_SCRIPTS=0
[[ -d "$SKILL_DIR/scripts" ]] && HAS_SCRIPTS=1
if [[ $HAS_SCRIPTS -eq 0 ]]; then
  if find "$SKILL_DIR" -type f \( -name '*.sh' -o -name '*.py' -o -name '*.js' \) \
       -not -path "$SKILL_DIR/assets/*" -not -path "$SKILL_DIR/reference/*" -not -path "$SKILL_DIR/references/*" \
       -not -path "$SKILL_DIR/tests/*" | grep -q .; then HAS_SCRIPTS=1; fi
fi
# Cache the body once. `body | grep -q …` races under `set -o pipefail`: grep -q
# closes the pipe on its first match, the upstream `sed` gets SIGPIPE, and the
# pipeline reports failure even though the pattern *did* match — making the [D]
# body checks flaky on any skill whose body exceeds the pipe buffer. Read from a
# here-string (which bash fully buffers) instead.
BODY_TXT="$(body)"
# thin alias? body < ~30 lines AND mentions "alias" AND forwards to another skill
BODY_LINES="$(printf '%s\n' "$BODY_TXT" | wc -l | tr -d ' ')"
IS_ALIAS=0
if [[ "$BODY_LINES" -lt 30 ]] && grep -qi 'alias' <<<"$BODY_TXT" && grep -qiE 'invoke|forward' <<<"$BODY_TXT"; then IS_ALIAS=1; fi
# phase count
PHASE_COUNT="$(grep -cE '^##+[[:space:]]+Phase[[:space:]]' <<<"$BODY_TXT" || true)"

FAILS=0
emit() { printf '%s\t%s\t%s\n' "$1" "$2" "$3"; [[ "$2" == "fail" ]] && FAILS=$((FAILS+1)); return 0; }

# --- 10.A ---
if [[ "$FM_END" -gt 0 ]]; then emit a-frontmatter-present pass "frontmatter closes at line $FM_END"; else emit a-frontmatter-present fail "no --- delimited frontmatter at top"; fi
if [[ -n "$NAME" ]]; then emit a-name-present pass "name=$NAME"; else emit a-name-present fail "no name in frontmatter"; fi
if [[ "$NAME" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then emit a-name-lowercase-hyphen pass "name=$NAME"; else emit a-name-lowercase-hyphen fail "name '$NAME' !~ ^[a-z0-9]+(-[a-z0-9]+)*\$"; fi
if [[ "${#NAME}" -le 64 ]]; then emit a-name-len pass "${#NAME} chars"; else emit a-name-len fail "${#NAME} chars > 64"; fi
if [[ "$NAME" == "$SKILL_NAME_DIR" ]]; then emit a-name-matches-dir pass "name == dir ($NAME)"; else emit a-name-matches-dir fail "name '$NAME' != dir '$SKILL_NAME_DIR'"; fi
if [[ -n "$DESC" ]]; then emit a-desc-present pass "description present (${#DESC} chars)"; else emit a-desc-present fail "no description in frontmatter"; fi
if [[ "${#DESC}" -le 1024 ]]; then emit a-desc-len pass "${#DESC} chars"; else emit a-desc-len fail "${#DESC} chars > 1024"; fi

# --- 10.C ---
if [[ "$BODY_LINES" -le 500 ]]; then emit c-body-size pass "$BODY_LINES body lines (<=500)"
elif [[ "$BODY_LINES" -le 800 ]]; then emit c-body-size pass "$BODY_LINES body lines (501-800; verify progressive disclosure)"
else emit c-body-size fail "$BODY_LINES body lines (>800)"; fi

if [[ -n "$REF_DIR" ]]; then
  rdname="$(basename "$REF_DIR")"
  if [[ "$rdname" == "reference" || "$rdname" == "references" ]]; then emit c-references-dir-name pass "ref dir = $rdname/"; else emit c-references-dir-name fail "ref dir '$rdname' (expected reference/ or references/)"; fi
  # one-level: no reference file links to another reference file
  chained="$(grep -rlE '\]\([^)]*(reference|references)/[^)]*\.md' "$REF_DIR" 2>/dev/null || true)"
  if [[ -z "$chained" ]]; then emit c-references-one-level pass "no reference→reference links"; else emit c-references-one-level fail "reference files link to other reference files: $(echo $chained)"; fi
  # toc: every reference file >100 lines opens with a ToC heading or a jump-list in first ~15 lines
  toc_fail=""
  while IFS= read -r rf; do
    [[ -z "$rf" ]] && continue
    n="$(wc -l < "$rf")"
    if [[ "$n" -gt 100 ]]; then
      if head -15 "$rf" | grep -qE '^##+[[:space:]]+(Table of [Cc]ontents|Contents|Index)' || head -15 "$rf" | grep -qE '^[[:space:]]*[-*][[:space:]]'; then :; else toc_fail="$toc_fail $(basename "$rf")"; fi
    fi
  done <<< "$(find "$REF_DIR" -type f -name '*.md')"
  if [[ -z "$toc_fail" ]]; then emit c-reference-toc pass "all >100-line reference files have a ToC"; else emit c-reference-toc fail "reference file(s) >100 lines with no leading ToC:$toc_fail"; fi
fi
# portable-paths: SKILL.md + reference files must not hard-code absolute bundle paths
absrefs="$(grep -rnE '(/Users/|/home/)[A-Za-z0-9._-]+/' "$SKILL_MD" ${REF_DIR:+"$REF_DIR"} 2>/dev/null | grep -v '\${' || true)"
if [[ -z "$absrefs" ]]; then emit c-portable-paths pass "no hard-coded absolute bundle paths"; else emit c-portable-paths fail "hard-coded absolute path(s): $(printf '%s' "$absrefs" | head -1)"; fi
# asset-layout: non-doc bundled files live under scripts/ references*/ assets/
loose="$(find "$SKILL_DIR" -maxdepth 1 -type f ! -name 'SKILL.md' ! -name '*.md' ! -name '*.yaml' ! -name '*.yml' 2>/dev/null || true)"
if [[ -z "$loose" ]]; then emit c-asset-layout pass "no loose non-doc files in skill root"; else emit c-asset-layout fail "loose file(s) in skill root: $(echo $loose)"; fi

# --- 10.D ---
if grep -qE '^##+[[:space:]]+(Cross-)?Platform Adaptation' <<<"$BODY_TXT"; then emit d-platform-adaptation pass "## Platform Adaptation present"; else emit d-platform-adaptation fail "no ## Platform Adaptation section"; fi
if [[ $IS_ALIAS -eq 1 ]]; then
  : # d-learnings-load-line, d-capture-learnings-phase N/A for thin aliases (FR-81)
else
  if grep -qi 'learnings\.md' <<<"$BODY_TXT"; then emit d-learnings-load-line pass "learnings.md load line present"; else emit d-learnings-load-line fail "no ~/.pmos/learnings.md load instruction"; fi
  if grep -qE '^##+[[:space:]]+Phase[[:space:]]+[0-9N][^:]*:.*Capture Learnings' <<<"$BODY_TXT"; then emit d-capture-learnings-phase pass "numbered Capture Learnings phase present"; else emit d-capture-learnings-phase fail "no numbered Capture-Learnings phase"; fi
fi
if [[ "$PHASE_COUNT" -ge 3 ]]; then
  if grep -qE '^##+[[:space:]]+Track Progress' <<<"$BODY_TXT"; then emit d-progress-tracking pass "## Track Progress present ($PHASE_COUNT phases)"; else emit d-progress-tracking fail "$PHASE_COUNT phases but no ## Track Progress instruction"; fi
fi

# --- 10.E (skipped entirely if no scripts) ---
if [[ $HAS_SCRIPTS -eq 1 ]]; then
  bad="$(find "$SKILL_DIR" -type f \( -name '*.sh' -o -name '*.py' \) -not -path "$SKILL_DIR/scripts/*" -not -path "$SKILL_DIR/assets/*" -not -path "$SKILL_DIR/reference/*" -not -path "$SKILL_DIR/references/*" -not -path "$SKILL_DIR/tests/*" 2>/dev/null || true)"
  if [[ -z "$bad" ]]; then emit e-scripts-dir pass "scripts under scripts/"; else emit e-scripts-dir fail "executable script(s) outside scripts/: $(echo $bad)"; fi
fi

# --- 10.F (skipped entirely if --target generic) ---
if [[ "$TARGET" == "claude-code" ]]; then
  ui="$(fm_val user-invocable || true)"
  ah="$(fm | grep -cE '^argument-hint:' || true)"
  if [[ "$ui" == "true" && "$ah" -ge 1 ]]; then emit f-cc-user-invocable pass "user-invocable: true + argument-hint present"; else emit f-cc-user-invocable fail "needs 'user-invocable: true' (got '${ui:-<none>}') and an argument-hint (got $ah)"; fi
elif [[ "$TARGET" == "codex" ]]; then
  if [[ -f "$SKILL_DIR/agents/openai.yaml" ]]; then emit f-codex-sidecar pass "agents/openai.yaml present"; else emit f-codex-sidecar fail "no agents/openai.yaml sidecar"; fi
fi

# --- 10.G (skipped entirely if no --plan path given or the file is missing) ---
# Extracts the text of every "## Wave N" / "### Wave N" section from the plan
# (HTML chrome stripped for .html), with the preamble and any "## Release
# prerequisites" section excluded — then greps for release-prereq markers.
if [[ -n "$PLAN_FILE" && -f "$PLAN_FILE" ]]; then
  case "$PLAN_FILE" in
    *.html) plan_text="$(sed -E 's/<[^>]+>//g' "$PLAN_FILE")" ;;
    *)      plan_text="$(cat "$PLAN_FILE")" ;;
  esac
  wave_text="$(awk '
    BEGIN { in_wave = 0 }
    /^#+[[:space:]]+/ {
      lower = tolower($0)
      if (lower ~ /wave[[:space:]_-]*[0-9]+/) { in_wave = 1; print; next }
      else { in_wave = 0; next }
    }
    in_wave { print }
  ' <<<"$plan_text")"
  if [[ -z "$wave_text" ]]; then
    : # no wave blocks found — nothing to grep; treat as N/A (silent)
  else
    hits="$(grep -nEi 'version bump|bump.*plugin\.json|CHANGELOG\.md|docs/[^[:space:]]*changelog|README row|README\.md row|[0-9]+\.[0-9]+\.[0-9]+[[:space:]]*(->|→)[[:space:]]*[0-9]+\.[0-9]+\.[0-9]+' <<<"$wave_text" || true)"
    if [[ -z "$hits" ]]; then
      emit g-plan-grep-clean pass "no release-prereq markers in wave blocks of $(basename "$PLAN_FILE")"
    else
      first_hit="$(printf '%s' "$hits" | head -1 | tr '\t' ' ')"
      emit g-plan-grep-clean fail "wave block(s) contain release-prereq marker(s): $first_hit"
    fi
  fi
fi

# --- 10.I (deterministic half — i-hint-contract-only + i-nl-sugar-marked) ---
# One shared invocation of the repo-root flags-vs-hints lint: HINT-DEAD lines
# fail i-hint-contract-only, BODY-ONLY lines fail i-nl-sugar-marked. The lint
# resolves the repo root from its own location, so it runs correctly from any
# cwd. Missing/erroring lint → both checks skipped with a stderr WARN (N/A).
FLAGS_LINT="$(find_repo_tool tools/lint-flags-vs-hints.sh || true)"
if [[ -z "$FLAGS_LINT" ]]; then
  echo "WARN: tools/lint-flags-vs-hints.sh not found above $SCRIPT_DIR; skipping i-hint-contract-only / i-nl-sugar-marked" >&2
else
  flags_out="$(bash "$FLAGS_LINT" "$SKILL_DIR" 2>/dev/null)" && flags_rc=0 || flags_rc=$?
  if [[ "$flags_rc" -gt 1 ]]; then
    echo "WARN: lint-flags-vs-hints.sh exited $flags_rc (invocation error); skipping i-hint-contract-only / i-nl-sugar-marked" >&2
  else
    hint_dead="$(grep -E '^FAIL .*HINT-DEAD' <<<"$flags_out" || true)"
    body_only="$(grep -E '^FAIL .*BODY-ONLY' <<<"$flags_out" || true)"
    if [[ -z "$hint_dead" ]]; then
      emit i-hint-contract-only pass "no HINT-DEAD flags (every hinted flag is handled by the body)"
    else
      n_hd="$(printf '%s\n' "$hint_dead" | grep -c . || true)"
      emit i-hint-contract-only fail "$n_hd HINT-DEAD flag(s): $(printf '%s\n' "$hint_dead" | head -1 | tr '\t' ' ')"
    fi
    if [[ -z "$body_only" ]]; then
      emit i-nl-sugar-marked pass "no BODY-ONLY flags (body-defined flags are hinted or nl-sugar-marked)"
    else
      n_bo="$(printf '%s\n' "$body_only" | grep -c . || true)"
      emit i-nl-sugar-marked fail "$n_bo BODY-ONLY flag(s): $(printf '%s\n' "$body_only" | head -1 | tr '\t' ' ')"
    fi
  fi
fi

# --- 10.J (deterministic half — j-phase-refs-resolve) ---
# Repo-root phase-reference lint: exit 0 = every "Phase <label>" / #slug
# reference resolves; exit 1 = ghost reference(s). Missing/erroring lint →
# check skipped with a stderr WARN (N/A).
PHASE_LINT="$(find_repo_tool tools/lint-phase-refs.sh || true)"
if [[ -z "$PHASE_LINT" ]]; then
  echo "WARN: tools/lint-phase-refs.sh not found above $SCRIPT_DIR; skipping j-phase-refs-resolve" >&2
else
  phase_out="$(bash "$PHASE_LINT" "$SKILL_DIR" 2>/dev/null)" && phase_rc=0 || phase_rc=$?
  if [[ "$phase_rc" -eq 0 ]]; then
    emit j-phase-refs-resolve pass "every phase reference resolves"
  elif [[ "$phase_rc" -eq 1 ]]; then
    first_ghost="$(grep -E '^FAIL' <<<"$phase_out" | head -1 | tr '\t' ' ' || true)"
    emit j-phase-refs-resolve fail "ghost phase reference(s): ${first_ghost:-see tools/lint-phase-refs.sh output}"
  else
    echo "WARN: lint-phase-refs.sh exited $phase_rc (invocation error); skipping j-phase-refs-resolve" >&2
  fi
fi

if [[ $FAILS -eq 0 ]]; then exit 0; else exit 1; fi
