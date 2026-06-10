#!/usr/bin/env bash
# workspace-discovery.sh <repo-root> | --selftest
# Probes the 8 supported workspace-manifest formats at <repo-root>, applies
# F15 precedence on multi-manifest single-stack repos, and emits JSON.
#
# F15 precedence chain (FR-WS-3):
#   User-override -> Cargo.toml#workspace -> pnpm-workspace.yaml ->
#   package.json#workspaces -> go.work -> pyproject.toml#tool.uv.workspace
# Lerna defers to package.json#workspaces when both are present; alone it
# is the primary.
# nx.json and turbo.json are descriptors only — never enumeration sources;
# they appear as secondaries when present alongside a real source.
#
# Detects the `primary` manifest, lists `secondaries`, and enumerates
# `packages` for the primary manifest via glob resolution (FR-WS-2).
# `repo_type` is `monorepo-root` when any workspace manifest is present,
# else `unknown`.
#
# Bash 3.2 portable (macOS default): no associative arrays, no mapfile,
# no `${var^^}`, no `read -d`, no `[[ -v ]]`.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
. "$HERE/_lib.sh"

# --- detectors ----------------------------------------------------------------

has_pnpm_workspace() { [ -f "$1/pnpm-workspace.yaml" ]; }

has_pkg_json_workspaces() {
  # package.json with a `workspaces` key (array OR object form per FR-WS-2)
  local pj="$1/package.json"
  [ -f "$pj" ] || return 1
  python3 - "$pj" <<'PY' >/dev/null 2>&1
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(1)
w = d.get("workspaces")
if w is None:
    sys.exit(1)
# Either list form or object form with `packages`
if isinstance(w, list) and w:
    sys.exit(0)
if isinstance(w, dict) and w.get("packages"):
    sys.exit(0)
sys.exit(1)
PY
}

has_lerna() { [ -f "$1/lerna.json" ]; }
has_nx() { [ -f "$1/nx.json" ]; }
has_turbo() { [ -f "$1/turbo.json" ]; }

has_cargo_workspace() {
  local f="$1/Cargo.toml"
  [ -f "$f" ] || return 1
  grep -q '^\[workspace\]' "$f"
}

has_go_work() { [ -f "$1/go.work" ]; }

has_uv_workspace() {
  local f="$1/pyproject.toml"
  [ -f "$f" ] || return 1
  # Bracket-class avoids shell quoting trouble; matches [tool.uv.workspace]
  grep -q '^\[tool\.uv\.workspace\]' "$f"
}

# --- probe + precedence -------------------------------------------------------

probe_manifests() {
  # Emits one manifest name per line, in detection order.
  local root="$1"
  has_pnpm_workspace      "$root" && printf '%s\n' "pnpm-workspace.yaml"
  has_pkg_json_workspaces "$root" && printf '%s\n' "package.json#workspaces"
  has_lerna               "$root" && printf '%s\n' "lerna.json"
  has_nx                  "$root" && printf '%s\n' "nx.json"
  has_turbo               "$root" && printf '%s\n' "turbo.json"
  has_cargo_workspace     "$root" && printf '%s\n' "Cargo.toml#workspace"
  has_go_work             "$root" && printf '%s\n' "go.work"
  has_uv_workspace        "$root" && printf '%s\n' "pyproject.toml#tool.uv.workspace"
  return 0
}

apply_f15_precedence() {
  # stdin: detected manifest names (one per line)
  # stdout: line 1 = primary (or empty), line 2... = secondaries
  local detected
  detected="$(cat)"

  has_in_list() {
    # $1 = needle, stdin = haystack
    local n="$1"
    printf '%s\n' "$detected" | grep -Fxq "$n"
  }

  local primary=""
  # F15 chain (user-override is plumbed by /readme; not handled here)
  if has_in_list "Cargo.toml#workspace"; then
    primary="Cargo.toml#workspace"
  elif has_in_list "pnpm-workspace.yaml"; then
    primary="pnpm-workspace.yaml"
  elif has_in_list "package.json#workspaces"; then
    primary="package.json#workspaces"
  elif has_in_list "go.work"; then
    primary="go.work"
  elif has_in_list "pyproject.toml#tool.uv.workspace"; then
    primary="pyproject.toml#tool.uv.workspace"
  elif has_in_list "lerna.json"; then
    # Lerna defers to package.json#workspaces — only primary when alone.
    primary="lerna.json"
  fi

  printf '%s\n' "$primary"
  # Secondaries: every detected manifest except the primary.
  printf '%s\n' "$detected" | while IFS= read -r m; do
    [ -n "$m" ] || continue
    [ "$m" = "$primary" ] && continue
    printf '%s\n' "$m"
  done
}

# --- package enumeration (T9, FR-WS-2) ---------------------------------------
#
# Per-manifest semantics:
#   pnpm-workspace.yaml          : top-level `packages:` only. catalog/overrides/
#                                  patchedDependencies are NOT enumeration sources.
#                                  Supports `!pattern` negation.
#   package.json#workspaces      : array form OR object form (`{"packages":[...]}`).
#                                  Negation supported (yarn/npm parity).
#   Cargo.toml#workspace         : `members` glob + optional `exclude` array.
#   go.work                      : `use ./path` lines, no globs.
#   pyproject.toml#tool.uv.workspace : `members` glob.
#   lerna.json                   : top-level `packages` array.
#   nx.json / turbo.json         : descriptors only — never enumerate.

emit_patterns_pnpm() {
  # stdout: include patterns (one per line, `!`-prefixed for negations).
  # Reads ONLY the top-level `packages:` array (filters catalog/overrides/...).
  local f="$1/pnpm-workspace.yaml"
  [ -f "$f" ] || return 0
  readme::yaml_get packages "$f" 2>/dev/null | python3 -c '
import sys, json
raw = sys.stdin.read().strip()
if not raw:
    sys.exit(0)
try:
    arr = json.loads(raw)
except Exception:
    sys.exit(0)
if isinstance(arr, list):
    for p in arr:
        if isinstance(p, str):
            print(p)
'
}

emit_patterns_pkg_json() {
  # Array form: workspaces=[...]. Object form: workspaces.packages=[...].
  local pj="$1/package.json"
  [ -f "$pj" ] || return 0
  python3 - "$pj" <<'PY'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(0)
w = d.get("workspaces")
arr = None
if isinstance(w, list):
    arr = w
elif isinstance(w, dict):
    arr = w.get("packages")
if isinstance(arr, list):
    for p in arr:
        if isinstance(p, str):
            print(p)
PY
}

emit_patterns_lerna() {
  local f="$1/lerna.json"
  [ -f "$f" ] || return 0
  python3 - "$f" <<'PY'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(0)
arr = d.get("packages")
if isinstance(arr, list):
    for p in arr:
        if isinstance(p, str):
            print(p)
PY
}

emit_patterns_cargo() {
  # Reads [workspace] members + exclude. Prefers tomllib (Python 3.11+);
  # falls back to a regex parser sufficient for the conventional shape.
  local f="$1/Cargo.toml"
  [ -f "$f" ] || return 0
  python3 - "$f" <<'PY'
import sys, re
path = sys.argv[1]
members, excludes = [], []
try:
    import tomllib
    with open(path, "rb") as fh:
        d = tomllib.load(fh)
    ws = d.get("workspace") or {}
    members = ws.get("members") or []
    excludes = ws.get("exclude") or []
except Exception:
    # Regex fallback: find [workspace] section and parse members=/exclude= arrays.
    txt = open(path).read()
    m = re.search(r"^\[workspace\][^\[]*", txt, re.M)
    if m:
        body = m.group(0)
        def grab(key):
            mm = re.search(rf"^\s*{key}\s*=\s*\[(.*?)\]", body, re.M | re.S)
            if not mm:
                return []
            inner = mm.group(1)
            return [s.strip().strip('"').strip("'") for s in inner.split(",") if s.strip()]
        members = grab("members")
        excludes = grab("exclude")
for p in members:
    if isinstance(p, str):
        print(p)
for p in excludes:
    if isinstance(p, str):
        print("!" + p)
PY
}

emit_patterns_go_work() {
  # `use ./path` (single) or `use ( ./a ./b )` block. No globs.
  local f="$1/go.work"
  [ -f "$f" ] || return 0
  python3 - "$f" <<'PY'
import sys, re
txt = open(sys.argv[1]).read()
# Single-line: use ./mod
for m in re.finditer(r"^\s*use\s+(\./[^\s\(]+)\s*$", txt, re.M):
    print(m.group(1).lstrip("./"))
# Block form: use ( ./a ./b )
for blk in re.finditer(r"use\s*\(([^)]*)\)", txt, re.S):
    for line in blk.group(1).splitlines():
        line = line.strip()
        if line.startswith("./"):
            print(line.lstrip("./"))
PY
}

emit_patterns_uv() {
  local f="$1/pyproject.toml"
  [ -f "$f" ] || return 0
  python3 - "$f" <<'PY'
import sys, re
path = sys.argv[1]
members = []
try:
    import tomllib
    with open(path, "rb") as fh:
        d = tomllib.load(fh)
    ws = (d.get("tool") or {}).get("uv", {}).get("workspace") or {}
    members = ws.get("members") or []
except Exception:
    txt = open(path).read()
    m = re.search(r"^\[tool\.uv\.workspace\][^\[]*", txt, re.M)
    if m:
        mm = re.search(r"^\s*members\s*=\s*\[(.*?)\]", m.group(0), re.M | re.S)
        if mm:
            members = [s.strip().strip('"').strip("'") for s in mm.group(1).split(",") if s.strip()]
for p in members:
    if isinstance(p, str):
        print(p)
PY
}

enumerate_packages() {
  # $1 = repo root, $2 = primary manifest name.
  # stdout: relative directory paths, one per line, deduped + sorted.
  # Matches are filtered to dirs containing the per-manifest member-manifest
  # file (e.g., package.json for JS, Cargo.toml for Rust) — this matches
  # real pnpm/cargo/uv behavior and naturally drops empty intermediate dirs
  # like `packages/private/` whose children are excluded by negation.
  local root="$1" primary="$2"
  local patterns="" member_file=""
  case "$primary" in
    "pnpm-workspace.yaml")              patterns="$(emit_patterns_pnpm     "$root")"; member_file="package.json" ;;
    "package.json#workspaces")          patterns="$(emit_patterns_pkg_json "$root")"; member_file="package.json" ;;
    "lerna.json")                       patterns="$(emit_patterns_lerna    "$root")"; member_file="package.json" ;;
    "Cargo.toml#workspace")             patterns="$(emit_patterns_cargo    "$root")"; member_file="Cargo.toml" ;;
    "go.work")                          patterns="$(emit_patterns_go_work  "$root")"; member_file="go.mod" ;;
    "pyproject.toml#tool.uv.workspace") patterns="$(emit_patterns_uv       "$root")"; member_file="pyproject.toml" ;;
    *) return 0 ;;
  esac
  [ -n "$patterns" ] || return 0
  # Convert newline-separated patterns into argv for glob_resolve.
  # Bash 3.2-portable: build an array via a `while read` loop.
  local -a pat_argv
  pat_argv=()
  while IFS= read -r p; do
    [ -n "$p" ] || continue
    pat_argv+=("$p")
  done <<EOF
$patterns
EOF
  [ "${#pat_argv[@]}" -gt 0 ] || return 0
  # go.work entries are literal paths, not globs — but glob_resolve handles
  # both (a non-glob is just a single-match glob, provided the dir exists).
  local resolved
  resolved="$(readme::glob_resolve "$root" "${pat_argv[@]}")"
  [ -n "$resolved" ] || return 0
  # Filter to dirs containing the per-manifest member file.
  printf '%s\n' "$resolved" | while IFS= read -r rel; do
    [ -n "$rel" ] || continue
    if [ -f "$root/$rel/$member_file" ]; then
      printf '%s\n' "$rel"
    fi
  done
}

# --- JSON emit ----------------------------------------------------------------

emit_json() {
  # $1 = primary, $2 = repo_root, $3 = packages_json (JSON array string),
  # $4..$N = secondaries.
  local primary="$1"; shift
  local packages_json="$1"; shift
  local repo_type="unknown"
  [ -n "$primary" ] && repo_type="monorepo-root"
  python3 - "$primary" "$repo_type" "$packages_json" "$@" <<'PY'
import json, sys
primary = sys.argv[1]
repo_type = sys.argv[2]
packages_json = sys.argv[3]
secondaries = sys.argv[4:]
try:
    packages = json.loads(packages_json) if packages_json else []
except Exception:
    packages = []
out = {
    "primary": primary if primary else None,
    "secondaries": secondaries,
    "packages": packages,
    "repo_type": repo_type,
}
json.dump(out, sys.stdout)
sys.stdout.write("\n")
PY
}

is_enumerable_manifest() {
  # nx.json + turbo.json are descriptors only (FR-WS-3 / A8): never enumerate.
  case "$1" in
    "nx.json"|"turbo.json") return 1 ;;
    *) return 0 ;;
  esac
}

discover() {
  local root="$1"
  [ -d "$root" ] || readme::die "not a directory: $root"
  local detected
  detected="$(probe_manifests "$root")"

  # T10 FR-WS-6 long-tail fallback: no supported manifest detected -> emit
  # advisory `unknown layout` envelope and exit 0. (Marketplace probe is a
  # future hook; for now "no supported manifest" is the sole gate.)
  if [ -z "$detected" ]; then
    python3 - <<'PY'
import json, sys
json.dump({
    "detected": "unknown layout",
    "primary": None,
    "secondaries": [],
    "packages": [],
    "repo_type": "unknown",
}, sys.stdout)
sys.stdout.write("\n")
PY
    return 0
  fi

  local ranked
  ranked="$(printf '%s\n' "$detected" | apply_f15_precedence)"
  local primary=""
  local -a secondaries
  secondaries=()
  local first=1
  # Bash 3.2-portable line iteration (no mapfile, no read -d).
  while IFS= read -r line; do
    if [ "$first" = "1" ]; then
      primary="$line"
      first=0
    else
      [ -n "$line" ] && secondaries+=("$line")
    fi
  done <<EOF
$ranked
EOF
  # T9: enumerate packages for the primary manifest (FR-WS-2).
  local pkg_lines=""
  if [ -n "$primary" ]; then
    pkg_lines="$(enumerate_packages "$root" "$primary")" || true
  fi

  # T10 MS01 multi-stack: for each enumerable secondary, run enumeration and
  # append its packages IFF the path set is disjoint from the primary's. A
  # non-disjoint secondary (e.g. lerna.json sitting next to package.json
  # workspaces, both pointing at packages/*) is treated as an alias of the
  # primary and contributes no extra rows. nx.json / turbo.json are
  # descriptors only and never enumerate.
  local primary_pkgs="$pkg_lines"
  local -a multi_stack_blocks
  multi_stack_blocks=()
  if [ "${#secondaries[@]}" -gt 0 ]; then
    local sec
    for sec in "${secondaries[@]}"; do
      if is_enumerable_manifest "$sec"; then
        local sec_pkgs
        sec_pkgs="$(enumerate_packages "$root" "$sec" 2>/dev/null)" || true
        if [ -n "$sec_pkgs" ]; then
          # Disjoint check: any overlap with primary set -> skip enumeration.
          local overlap
          overlap="$(printf '%s\n---\n%s\n' "$primary_pkgs" "$sec_pkgs" | python3 -c '
import sys
raw = sys.stdin.read().split("\n---\n", 1)
prim = set([l for l in raw[0].splitlines() if l.strip()])
sec  = set([l for l in (raw[1] if len(raw) > 1 else "").splitlines() if l.strip()])
print("1" if (prim & sec) else "0")
')"
          if [ "$overlap" = "0" ]; then
            # Encode as "<manifest_source>\n<path1>\n<path2>..." block, then a
            # blank-line separator. Consumed by the python emitter below.
            multi_stack_blocks+=("$sec")
            multi_stack_blocks+=("$sec_pkgs")
          fi
        fi
      fi
    done
  fi

  # Build a JSON array of {path, manifest_source} rows. Primary rows first
  # (preserving T9 order), then each disjoint secondary's rows tagged with
  # its own manifest_source (MS01).
  local packages_json
  # Bash 3.2 + `set -u` quirk: expanding an empty array with `${arr[@]}` is
  # an "unbound variable" error. Use `${arr[@]+"${arr[@]}"}` to no-op when
  # empty. (Same idiom as readme::glob_resolve's argv expansion.)
  packages_json="$(python3 - "$primary" "$primary_pkgs" ${multi_stack_blocks[@]+"${multi_stack_blocks[@]}"} <<'PY'
import sys, json
args = sys.argv[1:]
primary = args[0]
primary_pkgs = args[1]
pairs = args[2:]  # alternating: sec_name, sec_pkgs_block
pkgs = []
for line in primary_pkgs.splitlines():
    line = line.strip()
    if line:
        pkgs.append({"path": line, "manifest_source": primary})
for i in range(0, len(pairs), 2):
    sec_name = pairs[i]
    block = pairs[i+1] if i+1 < len(pairs) else ""
    for line in block.splitlines():
        line = line.strip()
        if line:
            pkgs.append({"path": line, "manifest_source": sec_name})
print(json.dumps(pkgs))
PY
)"
  if [ "${#secondaries[@]}" -eq 0 ]; then
    emit_json "$primary" "$packages_json"
  else
    emit_json "$primary" "$packages_json" "${secondaries[@]}"
  fi
}

# --- selftest -----------------------------------------------------------------

selftest() {
  # T10 real gate: compare each fixture's `discover` output to its
  # sibling expected.json (sort-keys-normalized). Pass gate is ≥19/20.
  local fixroot="$HERE/../tests/fixtures/workspaces"
  local pass=0 fail=0 total=0
  local -a misses
  misses=()
  local fixture_dir fname expected_file actual
  for fixture_dir in "$fixroot"/*/; do
    [ -d "$fixture_dir" ] || continue
    total=$((total + 1))
    fname="$(basename "$fixture_dir")"
    expected_file="$fixture_dir/expected.json"
    if [ ! -f "$expected_file" ]; then
      printf '  FAIL %s (no expected.json)\n' "$fname"
      fail=$((fail + 1))
      misses+=("$fname:no-expected")
      continue
    fi
    actual="$(discover "$fixture_dir" 2>/dev/null)" || {
      printf '  FAIL %s (script error)\n' "$fname"
      fail=$((fail + 1))
      misses+=("$fname:script-error")
      continue
    }
    if python3 - "$actual" "$expected_file" <<'PY'
import json, sys
a = json.loads(sys.argv[1])
b = json.load(open(sys.argv[2]))
sys.exit(0 if json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True) else 1)
PY
    then
      printf '  OK   %s\n' "$fname"
      pass=$((pass + 1))
    else
      printf '  FAIL %s (diff)\n' "$fname"
      fail=$((fail + 1))
      misses+=("$fname:diff")
    fi
  done
  printf 'selftest: %d/%d pass (gate >=19/20)\n' "$pass" "$total"
  if [ "${#misses[@]}" -gt 0 ]; then
    printf 'misses: %s\n' "${misses[*]}"
  fi
  [ "$pass" -ge 19 ]
}

# --- main ---------------------------------------------------------------------

main() {
  if [ "$#" -lt 1 ]; then
    readme::die "usage: workspace-discovery.sh <repo-root> | --selftest"
  fi
  case "$1" in
    --selftest) selftest ;;
    -h|--help) printf 'usage: workspace-discovery.sh <repo-root> | --selftest\n' ;;
    *) discover "$1" ;;
  esac
}

main "$@"
