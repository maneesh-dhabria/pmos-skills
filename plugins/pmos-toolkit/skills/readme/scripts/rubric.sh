#!/usr/bin/env bash
# rubric.sh <readme-path> [--variant <type>] [--auto-apply] | --selftest
# Runs the binary checks defined in reference/rubric.yaml against a README.
# Exit 0 (all active checks pass), 1 (any fail / selftest agreement <85%), 2 (script error).
#
# Bash 3.2-safe (macOS default). No associative arrays, no ${var^^}, no `read -d ''`.
# YAML parsing via python3 + PyYAML (see readme::yaml_get in _lib.sh).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_lib.sh
source "$HERE/_lib.sh"

RUBRIC_YAML="$HERE/../reference/rubric.yaml"
SCHEMA_YAML="$HERE/../reference/section-schema.yaml"

# ---------------------------------------------------------------------------
# Check implementations. Each emits one TSV line:
#   <check-id>\t<PASS|FAIL>\tHEAD\t<line-or-1>\t<msg>
# and returns 0 (pass) or 1 (fail). Bash 3.2-safe throughout.
# ---------------------------------------------------------------------------

check_hero_line_presence() {
  local path="$1" hero
  hero=$(awk '
    NR==1 && /^# / {h1=1; next}
    h1 && NF && !/^#/ && !/^[-*+] / && !/^[0-9]+\. / && !/^>/ && !/^```/ && !/^    / {print; exit}
  ' "$path")
  if [ -z "$hero" ] || [ "${#hero}" -lt 30 ]; then
    printf 'hero-line-presence\tFAIL\tHEAD\t1\tNo hero line (≥30 chars) found after H1\n'
    return 1
  fi
  printf 'hero-line-presence\tPASS\tHEAD\t1\t\n'
}

check_install_or_quickstart_presence() {
  local path="$1"
  # Find a heading matching Install/Quickstart/Getting Started/Download, then a fenced
  # code block within 10 lines.
  # BSD awk lacks \b word-boundary; use portable boundary class (mirror L60).
  awk '
    /^##[[:space:]]+(Install|Quickstart|Getting Started|Download)($|[^A-Za-z])/ {found_h=NR; next}
    found_h && NR <= found_h+10 && /^```/ {found_c=1; exit}
    END {exit (found_c?0:1)}
  ' "$path" && {
    printf 'install-or-quickstart-presence\tPASS\tHEAD\t1\t\n'
    return 0
  }
  printf 'install-or-quickstart-presence\tFAIL\tHEAD\t1\tNo Install/Quickstart/Download section with fenced code\n'
  return 1
}

check_what_it_does_in_60s() {
  local path="$1"
  # First 25 lines after H1 contain ≥1 hero line + ≥1 use-case clause (for|to|when|if).
  local hero usecase
  hero=$(awk '
    NR==1 && /^# / {h1=1; next}
    h1 && NF && !/^#/ && !/^[-*+] / && !/^[0-9]+\. / && !/^>/ && !/^```/ && !/^    / {print; exit}
  ' "$path")
  # BSD awk lacks \< / \> word boundaries; use a portable boundary class.
  usecase=$(awk 'NR>=2 && NR<=25 && /(^| |\t)(for|to|when|if)( |,|\.|$)/' "$path" | head -n1)
  if [ -n "$hero" ] && [ -n "$usecase" ]; then
    printf 'what-it-does-in-60s\tPASS\tHEAD\t1\t\n'
    return 0
  fi
  printf 'what-it-does-in-60s\tFAIL\tHEAD\t1\tOpening lacks hero + use-case clause in first 25 lines\n'
  return 1
}

check_no_banned_phrases() {
  local path="$1" phrases_json
  phrases_json=$(readme::yaml_get banned_phrases "$RUBRIC_YAML" 2>/dev/null || echo "[]")
  # python3 to iterate phrases (avoids bash array parsing of json)
  local matches
  matches=$(python3 - "$path" "$phrases_json" <<'PY' 2>/dev/null
import sys, json, re
path, phrases_json = sys.argv[1], sys.argv[2]
phrases = json.loads(phrases_json)
text = open(path).read()
# Strip strikethrough-wrapped occurrences before scanning, so auto-apply's
# ~~phrase~~ markers count as "fixed".
text_stripped = re.sub(r'~~[^~]+~~', '', text)
hits = []
for p in phrases:
    if re.search(re.escape(p), text_stripped, re.IGNORECASE):
        hits.append(p)
print("|".join(hits))
PY
)
  if [ -n "$matches" ]; then
    printf 'no-banned-phrases\tFAIL\tHEAD\t1\tBanned phrases present: %s\n' "$matches"
    return 1
  fi
  printf 'no-banned-phrases\tPASS\tHEAD\t1\t\n'
}

check_tldr_fits_screen() {
  local path="$1" count
  # Lines from H1 (inclusive) to first ## (exclusive).
  count=$(awk '
    /^# / && !h1 {h1=1; n=1; next}
    h1 && /^## / {exit}
    h1 {n++}
    END {print n+0}
  ' "$path")
  if [ "${count:-0}" -le 25 ]; then
    printf 'tldr-fits-screen\tPASS\tHEAD\t1\t%d lines\n' "$count"
    return 0
  fi
  printf 'tldr-fits-screen\tFAIL\tHEAD\t1\tOpening is %d lines (>25)\n' "$count"
  return 1
}

check_code_example_runnable_as_shown() {
  local path="$1"
  # First fenced code block under an Install/Quickstart heading should not contain
  # '...', '<TODO>', '<placeholder>'.
  local block
  # BSD awk lacks \b word-boundary; use portable boundary class (mirror L60).
  block=$(awk '
    /^##[[:space:]]+(Install|Quickstart|Getting Started|Download)($|[^A-Za-z])/ {h=1; next}
    h && /^```/ {if (incode) {exit} else {incode=1; next}}
    h && incode {print}
  ' "$path")
  if [ -z "$block" ]; then
    # No Install code block to test → vacuously pass.
    printf 'code-example-runnable-as-shown\tPASS\tHEAD\t1\tno Install code block to evaluate\n'
    return 0
  fi
  if printf '%s\n' "$block" | grep -qE '(\.\.\.|<TODO>|<placeholder>)'; then
    printf 'code-example-runnable-as-shown\tFAIL\tHEAD\t1\tInstall code block contains placeholder tokens\n'
    return 1
  fi
  printf 'code-example-runnable-as-shown\tPASS\tHEAD\t1\t\n'
}

check_links_resolve() {
  local path="$1" root broken=0 links
  root=$(cd "$(dirname "$path")" && pwd)
  # Extract [text](path) where path is not http/https and not anchor-only.
  links=$(grep -oE '\[[^]]+\]\([^)]+\)' "$path" 2>/dev/null \
    | sed -E 's/.*\(([^)]+)\)/\1/' \
    | grep -v '^https\?://' \
    | grep -v '^#' \
    | grep -v '^mailto:' || true)
  if [ -z "$links" ]; then
    printf 'links-resolve\tPASS\tHEAD\t1\tno relative links\n'
    return 0
  fi
  local missing=""
  while IFS= read -r lnk; do
    [ -z "$lnk" ] && continue
    # Strip any #anchor suffix from the path.
    local fpath="${lnk%%#*}"
    [ -z "$fpath" ] && continue
    if [ ! -e "$root/$fpath" ]; then
      broken=$((broken+1))
      missing="$missing $fpath"
    fi
  done <<EOF
$links
EOF
  if [ "$broken" -gt 0 ]; then
    printf 'links-resolve\tFAIL\tHEAD\t1\tbroken: %s\n' "$missing"
    return 1
  fi
  printf 'links-resolve\tPASS\tHEAD\t1\t\n'
}

check_no_marketing_hyperbole() {
  local path="$1" count
  count=$(grep -ciE '\<(amazing|awesome|incredible|stunning|revolutionary)\>' "$path" || true)
  if [ "${count:-0}" -le 2 ]; then
    printf 'no-marketing-hyperbole\tPASS\tHEAD\t1\t%d hits\n' "$count"
    return 0
  fi
  printf 'no-marketing-hyperbole\tFAIL\tHEAD\t1\t%d hyperbolic adjectives (cap=2)\n' "$count"
  return 1
}

check_sections_in_recommended_order() {
  local path="$1" spine_json
  spine_json=$(readme::yaml_get spine "$SCHEMA_YAML" 2>/dev/null || echo "[]")
  # Headings list (## only, lowercase, first token-run).
  local result
  result=$(python3 - "$path" "$spine_json" <<'PY' 2>/dev/null
import sys, json, re
path, spine_json = sys.argv[1], sys.argv[2]
spine = [s.lower() for s in json.loads(spine_json)]
headings = []
for line in open(path):
    m = re.match(r'^##\s+(.+?)\s*$', line)
    if m:
        headings.append(m.group(1).strip().lower())
# Filter headings to those that match a spine entry (case-insensitive).
seen = [h for h in headings if h in spine]
# Check seen is a subsequence of spine.
i = 0
for s in spine:
    if i < len(seen) and seen[i] == s:
        i += 1
print("OK" if i == len(seen) else "BAD")
PY
)
  if [ "$result" = "OK" ]; then
    printf 'sections-in-recommended-order\tPASS\tHEAD\t1\t\n'
    return 0
  fi
  printf 'sections-in-recommended-order\tFAIL\tHEAD\t1\tSections not a subsequence of canonical spine\n'
  return 1
}

check_contributing_link_or_section() {
  local path="$1"
  if grep -qE '^##[[:space:]]+Contributing\b' "$path" || grep -qE '\[[^]]+\]\([^)]*CONTRIBUTING\.md[^)]*\)' "$path"; then
    printf 'contributing-link-or-section\tPASS\tHEAD\t1\t\n'
    return 0
  fi
  printf 'contributing-link-or-section\tFAIL\tHEAD\t1\tNo Contributing section or link to CONTRIBUTING.md\n'
  return 1
}

check_license_present() {
  local path="$1"
  if grep -qE '^##[[:space:]]+License\b' "$path" || grep -qE '\[[^]]+\]\([^)]*LICENSE(\.md)?[^)]*\)' "$path"; then
    printf 'license-present\tPASS\tHEAD\t1\t\n'
    return 0
  fi
  printf 'license-present\tFAIL\tHEAD\t1\tNo License section or LICENSE link\n'
  return 1
}

check_badges_not_stale() {
  local path="$1"
  if grep -qE 'shields\.io.*cacheSeconds=-1' "$path"; then
    printf 'badges-not-stale\tFAIL\tHEAD\t1\tFound stale-cache badge pattern\n'
    return 1
  fi
  printf 'badges-not-stale\tPASS\tHEAD\t1\t\n'
}

check_anchor_links_resolve() {
  local path="$1"
  local result
  result=$(python3 - "$path" <<'PY' 2>/dev/null
import sys, re
path = sys.argv[1]
text = open(path).read()
# Collect heading slugs (## and ###).
slugs = set()
for m in re.finditer(r'^#{2,3}\s+(.+?)\s*$', text, re.MULTILINE):
    title = m.group(1).strip().lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', title)
    slug = re.sub(r'\s+', '-', slug)
    slugs.add(slug)
# Find [text](#anchor) and check.
bad = []
for m in re.finditer(r'\[[^\]]+\]\(#([^)]+)\)', text):
    a = m.group(1).strip().lower()
    if a not in slugs:
        bad.append(a)
print("|".join(bad))
PY
)
  if [ -n "$result" ]; then
    printf 'anchor-links-resolve\tFAIL\tHEAD\t1\tUnresolved anchors: %s\n' "$result"
    return 1
  fi
  printf 'anchor-links-resolve\tPASS\tHEAD\t1\t\n'
}

check_image_alt_text() {
  local path="$1"
  # ![alt](url) where alt is empty.
  if grep -oE '!\[\]\([^)]+\)' "$path" >/dev/null 2>&1; then
    printf 'image-alt-text\tFAIL\tHEAD\t1\tImage(s) missing alt text\n'
    return 1
  fi
  printf 'image-alt-text\tPASS\tHEAD\t1\t\n'
}

check_line_length_soft_cap() {
  local path="$1"
  local result
  result=$(awk '
    /^```/ {incode = !incode; next}
    !incode {
      total++
      if (length($0) > 120) long++
    }
    END {
      if (total == 0) {print "0.00"; exit}
      printf "%.4f\n", long/total
    }
  ' "$path")
  # Compare result <= 0.05 in awk (bash 3.2 has no float compare).
  local ok
  ok=$(awk -v r="$result" 'BEGIN {print (r+0 <= 0.05) ? "Y" : "N"}')
  if [ "$ok" = "Y" ]; then
    printf 'line-length-soft-cap\tPASS\tHEAD\t1\tratio=%s\n' "$result"
    return 0
  fi
  printf 'line-length-soft-cap\tFAIL\tHEAD\t1\t>120-char line ratio %s exceeds 0.05\n' "$result"
  return 1
}

check_cross_cutting_capabilities_surfaced() {
  local path="$1"
  # FR-08: ≥1 of {HTML, MD, worktree, auto-tier, self-eval, monorepo, subagent,
  # manifest} appears (case-insensitive substring) in any text after the first
  # ## heading.
  local body line_no
  line_no=$(awk '/^## / {print NR; exit}' "$path")
  if [ -z "$line_no" ]; then
    # No ## heading — vacuously fail (cross-cutting surface should appear in a
    # non-hero section, which requires at least one ## heading).
    printf 'cross-cutting-capabilities-surfaced\tFAIL\tHEAD\t1\tno ## heading; cross-cutting capability would have no home\n'
    return 1
  fi
  body=$(awk -v start="$line_no" 'NR>=start' "$path")
  if printf '%s' "$body" | grep -qiE '(HTML|\bMD\b|worktree|auto-tier|self-eval|monorepo|subagent|manifest)'; then
    printf 'cross-cutting-capabilities-surfaced\tPASS\tHEAD\t1\t\n'
    return 0
  fi
  printf 'cross-cutting-capabilities-surfaced\tFAIL\tHEAD\t1\tNo cross-cutting capability keyword (HTML/MD/worktree/auto-tier/self-eval/monorepo/subagent/manifest) after first ## heading\n'
  return 1
}

# ---------------------------------------------------------------------------
# Active check set resolution (base + variant overrides).
# Emits one check-id per line on stdout.
# ---------------------------------------------------------------------------

# Base check ids in declaration order.
ALL_CHECKS="hero-line-presence
install-or-quickstart-presence
what-it-does-in-60s
no-banned-phrases
tldr-fits-screen
code-example-runnable-as-shown
links-resolve
no-marketing-hyperbole
sections-in-recommended-order
contributing-link-or-section
license-present
badges-not-stale
anchor-links-resolve
image-alt-text
line-length-soft-cap
cross-cutting-capabilities-surfaced"

resolve_active_checks() {
  local variant="$1"
  if [ -z "$variant" ] || [ "$variant" = "library" ]; then
    printf '%s\n' "$ALL_CHECKS"
    return 0
  fi
  # Read variants.<v>.overrides as JSON list of {drop|add: id}.
  local overrides_json
  overrides_json=$(readme::yaml_get "variants.$variant.overrides" "$RUBRIC_YAML" 2>/dev/null || echo "[]")
  python3 - "$variant" "$overrides_json" "$ALL_CHECKS" <<'PY'
import sys, json
variant, overrides_json, all_checks = sys.argv[1], sys.argv[2], sys.argv[3].split("\n")
defined = set(all_checks)
try:
    overrides = json.loads(overrides_json) or []
except Exception:
    overrides = []
active = list(all_checks)
for o in overrides:
    if not isinstance(o, dict):
        continue
    if "drop" in o:
        i = o["drop"]
        active = [c for c in active if c != i]
    elif "add" in o:
        i = o["add"]
        if i not in defined:
            sys.stderr.write(f"[/readme] warn: variant '{variant}' adds undefined check '{i}'; skipping\n")
            continue
        if i not in active:
            active.append(i)
for c in active:
    print(c)
PY
}

dispatch_check() {
  local id="$1" path="$2"
  case "$id" in
    hero-line-presence)               check_hero_line_presence "$path" ;;
    install-or-quickstart-presence)   check_install_or_quickstart_presence "$path" ;;
    what-it-does-in-60s)              check_what_it_does_in_60s "$path" ;;
    no-banned-phrases)                check_no_banned_phrases "$path" ;;
    tldr-fits-screen)                 check_tldr_fits_screen "$path" ;;
    code-example-runnable-as-shown)   check_code_example_runnable_as_shown "$path" ;;
    links-resolve)                    check_links_resolve "$path" ;;
    no-marketing-hyperbole)           check_no_marketing_hyperbole "$path" ;;
    sections-in-recommended-order)    check_sections_in_recommended_order "$path" ;;
    contributing-link-or-section)     check_contributing_link_or_section "$path" ;;
    license-present)                  check_license_present "$path" ;;
    badges-not-stale)                 check_badges_not_stale "$path" ;;
    anchor-links-resolve)             check_anchor_links_resolve "$path" ;;
    image-alt-text)                   check_image_alt_text "$path" ;;
    line-length-soft-cap)             check_line_length_soft_cap "$path" ;;
    cross-cutting-capabilities-surfaced) check_cross_cutting_capabilities_surfaced "$path" ;;
    *)
      printf '%s\tFAIL\tHEAD\t1\tunknown check id\n' "$id"
      return 1
      ;;
  esac
}

# ---------------------------------------------------------------------------
# Auto-apply (FR-RUB-3): mechanical fixes only.
# ---------------------------------------------------------------------------

auto_apply() {
  local path="$1" phrases_json
  phrases_json=$(readme::yaml_get banned_phrases "$RUBRIC_YAML" 2>/dev/null || echo "[]")
  python3 - "$path" "$phrases_json" <<'PY'
import sys, json, re
path, phrases_json = sys.argv[1], sys.argv[2]
phrases = json.loads(phrases_json)
text = open(path).read()
applied = []
def strike(m):
    applied.append(m.group(0))
    return "~~" + m.group(0) + "~~"
for p in phrases:
    pattern = re.compile(r'(?i)(?<!~)' + re.escape(p) + r'(?!~)')
    text = pattern.sub(strike, text)
open(path, "w").write(text)
sys.stderr.write(f"[/readme] auto-apply: struck-through {len(applied)} banned phrase occurrence(s)\n")
for a in applied[:10]:
    sys.stderr.write(f"[/readme]   - {a}\n")
PY
  readme::log "auto-apply: sections-in-recommended-order is structural; manual reorder required"
  readme::log "auto-apply: line-length-soft-cap requires reflow; manual fix required"
}

# ---------------------------------------------------------------------------
# Selftest: 5 strong + 5 slop fixtures, assert ≥85% A2 agreement.
# ---------------------------------------------------------------------------

run_fixture() {
  # Echoes "PASS_COUNT FAIL_COUNT" for the fixture, running ALL_CHECKS (library variant).
  local path="$1" pass=0 fail=0 check_id
  while IFS= read -r check_id; do
    [ -z "$check_id" ] && continue
    if dispatch_check "$check_id" "$path" >/dev/null 2>&1; then
      pass=$((pass+1))
    else
      fail=$((fail+1))
    fi
  done <<EOF
$ALL_CHECKS
EOF
  printf '%d %d\n' "$pass" "$fail"
}

_selftest_awk_lint() {
  # Drift-guard: scan rubric.sh for word-boundary atoms (\b, \<, \>) inside
  # awk '...' blocks. BSD awk lacks these; we use a portable boundary class.
  # Two-pass scan — Pass A: single-line `awk '...\b...'`. Pass B: multi-line
  # awk blocks, tracked across lines by counting unmatched single quotes.
  local script="$1"
  local lint_failed=0
  # Pass A: single-line awk-quoted regex containing \b, \<, or \>.
  # Skip shell-comment lines (leading whitespace + #) — they may legitimately
  # reference these tokens in lint-self-description text.
  local hits_a
  hits_a=$(grep -nE "awk[[:space:]]+'[^']*\\\\(b|<|>)" "$script" \
    | grep -vE '^[0-9]+:[[:space:]]*#' || true)
  if [ -n "$hits_a" ]; then
    while IFS= read -r line; do
      readme::log "[lint] FAIL: \\b at $line"
      lint_failed=1
    done <<EOF
$hits_a
EOF
  fi
  # Pass B: multi-line awk blocks. Track state via awk itself.
  local hits_b
  hits_b=$(awk '
    {
      line=$0
      if (!in_awk) {
        # Enter awk block: line has `awk ` followed by single-quote and no closing quote yet.
        if (match(line, /awk[[:space:]]+'\''/)) {
          rest = substr(line, RSTART + RLENGTH)
          if (index(rest, "'\''") == 0) { in_awk=1; awk_start=NR }
        }
      } else {
        # Inside awk block; closes when a single quote appears.
        if (index(line, "'\''") > 0) { in_awk=0; next }
        # Skip shell-comment lines (defensive; awk-quoted regex never starts with #).
        if (line ~ /^[[:space:]]*#/) next
        if (line ~ /\\b|\\<|\\>/) {
          printf "%s:%d\n", FILENAME, NR
        }
      }
    }
  ' "$script" || true)
  if [ -n "$hits_b" ]; then
    while IFS= read -r line; do
      readme::log "[lint] FAIL: \\b at $line (multi-line awk block)"
      lint_failed=1
    done <<EOF
$hits_b
EOF
  fi
  if [ "$lint_failed" -eq 0 ]; then
    readme::log "selftest: lint: PASS"
  else
    readme::log "selftest: lint: FAIL"
  fi
  return $lint_failed
}

selftest() {
  local script_path="$HERE/rubric.sh"
  local lint_rc=0
  _selftest_awk_lint "$script_path" || lint_rc=1

  local strong_dir="$HERE/../tests/fixtures/rubric/strong"
  local slop_dir="$HERE/../tests/fixtures/rubric/slop"
  local agreement=0 total=0 f counts pass
  local total_checks
  total_checks=$(printf '%s\n' "$ALL_CHECKS" | grep -c .)

  for f in "$strong_dir"/*.md; do
    [ -f "$f" ] || continue
    total=$((total+1))
    counts=$(run_fixture "$f")
    pass=$(printf '%s\n' "$counts" | awk '{print $1}')
    if [ "$pass" -ge 12 ]; then
      agreement=$((agreement+1))
      readme::log "selftest: strong $(basename "$f") PASS=$pass/$total_checks [AGREE]"
    else
      readme::log "selftest: strong $(basename "$f") PASS=$pass/$total_checks [MISS — expected ≥12]"
    fi
  done

  for f in "$slop_dir"/*.md; do
    [ -f "$f" ] || continue
    total=$((total+1))
    counts=$(run_fixture "$f")
    pass=$(printf '%s\n' "$counts" | awk '{print $1}')
    if [ "$pass" -le 8 ]; then
      agreement=$((agreement+1))
      readme::log "selftest: slop $(basename "$f") PASS=$pass/$total_checks [AGREE]"
    else
      readme::log "selftest: slop $(basename "$f") PASS=$pass/$total_checks [MISS — expected ≤8]"
    fi
  done

  local pct
  pct=$(awk -v a="$agreement" -v t="$total" 'BEGIN {if (t==0) print 0; else printf "%d", (a*100)/t}')
  readme::log "selftest: $agreement/$total fixtures agree (${pct}%)"
  local agree_rc=0
  if [ "$pct" -ge 85 ]; then
    readme::log "selftest: fixture-agreement: PASS (${pct}%)"
  else
    readme::log "selftest: fixture-agreement: FAIL (${pct}% < 85%)"
    agree_rc=1
  fi
  if [ "$lint_rc" -eq 0 ] && [ "$agree_rc" -eq 0 ]; then
    readme::log "selftest: PASS (15 checks; A2 agreement ${pct}% on $total fixtures)"
    exit 0
  fi
  exit 1
}

# ---------------------------------------------------------------------------
# main()
# ---------------------------------------------------------------------------

_validate_yaml() {
  # FR-04: validate rubric.yaml schema. Every checks[*] row must carry
  # {id, severity, type, description, pass_when}; type ∈ {[D], [J]}.
  python3 - "$RUBRIC_YAML" <<'PYEOF'
import sys, yaml
path = sys.argv[1]
with open(path) as f:
    d = yaml.safe_load(f)
required = {"id", "severity", "type", "description", "pass_when"}
allowed_types = {"[D]", "[J]"}
exit_code = 0
for row in d.get("checks", []) or []:
    rid = row.get("id", "<unknown>")
    missing = required - row.keys()
    for k in missing:
        sys.stderr.write(f"[validate] FAIL: {rid} missing {k}\n")
        exit_code = 1
    if "type" in row and row["type"] not in allowed_types:
        sys.stderr.write(f"[validate] FAIL: {rid} invalid type: {row['type']!r} (expected [D] or [J])\n")
        exit_code = 1
sys.exit(exit_code)
PYEOF
}

main() {
  if [ "${1:-}" = "--selftest" ]; then
    selftest
  fi
  if [ "${1:-}" = "--validate-yaml" ]; then
    _validate_yaml
    exit $?
  fi

  local readme="" variant="" autoapply=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --variant) variant="$2"; shift 2 ;;
      --auto-apply) autoapply=1; shift ;;
      --selftest) selftest ;;
      --validate-yaml) _validate_yaml; exit $? ;;
      -h|--help)
        echo "usage: rubric.sh <readme-path> [--variant <type>] [--auto-apply] | --selftest | --validate-yaml"
        exit 0 ;;
      *) readme="$1"; shift ;;
    esac
  done

  [ -f "$readme" ] || readme::die "usage: rubric.sh <readme-path> [--variant <type>] [--auto-apply] | --selftest"

  if [ "$autoapply" -eq 1 ]; then
    auto_apply "$readme"
  fi

  local active any_fail=0 check_id
  active=$(resolve_active_checks "$variant")
  while IFS= read -r check_id; do
    [ -z "$check_id" ] && continue
    if ! dispatch_check "$check_id" "$readme"; then
      any_fail=1
    fi
  done <<EOF
$active
EOF

  exit "$any_fail"
}

main "$@"
