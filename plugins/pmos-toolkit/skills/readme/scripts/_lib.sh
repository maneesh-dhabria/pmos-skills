#!/usr/bin/env bash
# _lib.sh — shared helpers for /readme bundled scripts. Bash 3.2-safe (macOS default).
readme::log() { printf '[/readme] %s\n' "$*" >&2; }
readme::die() { readme::log "ERROR: $*"; exit 2; }

readme::yaml_get() {
  # Usage: readme::yaml_get <dot.path> <yaml-file>
  # Emits the value at <dot.path>. For lists/maps, emits JSON; for scalars, the value as a string.
  # Empty string + return 1 if path not found OR python3/PyYAML missing.
  command -v python3 >/dev/null || { readme::log "warn: python3 absent; yaml_get returns nothing"; return 1; }
  python3 - "$1" "$2" <<'PY'
import sys, json
try:
    import yaml
except ImportError:
    sys.exit(1)
path, file = sys.argv[1], sys.argv[2]
try:
    data = yaml.safe_load(open(file))
except Exception as e:
    sys.stderr.write(f"[/readme] yaml_get parse error in {file}: {e}\n")
    sys.exit(1)
v = data
for key in path.split("."):
    if isinstance(v, dict) and key in v:
        v = v[key]
    else:
        sys.exit(1)
if isinstance(v, (dict, list)):
    print(json.dumps(v))
elif v is None:
    print("")
else:
    print(v)
PY
}

readme::glob_resolve() {
  # Usage: readme::glob_resolve <repo-root> <pattern> [<pattern> ...]
  # Expands each pattern relative to <repo-root>. Patterns prefixed with `!`
  # are negations applied against the accumulated match set. Emits matching
  # paths relative to <repo-root>, one per line, deduped, in deterministic
  # (sorted) order. Only directories are matched (workspace members are dirs).
  #
  # Bash 3.2-portable: uses python3 + glob.glob/fnmatch for portable globbing
  # (avoids `shopt -s globstar`, which is bash 4+ only).
  local root="$1"; shift
  [ -d "$root" ] || return 1
  command -v python3 >/dev/null || { readme::log "warn: python3 absent; glob_resolve returns nothing"; return 1; }
  python3 - "$root" "$@" <<'PY'
import sys, os, glob, fnmatch
root = sys.argv[1]
patterns = sys.argv[2:]
includes = []   # ordered, deduped relative dir paths
excludes = []   # raw negation patterns (without the leading !)
for p in patterns:
    if p.startswith("!"):
        excludes.append(p[1:])
        continue
    # Resolve against root. Support `**` only if user provided it explicitly,
    # but our supported manifests use shallow globs (packages/*, crates/*).
    abs_pat = os.path.join(root, p)
    matches = sorted(glob.glob(abs_pat))
    for m in matches:
        if not os.path.isdir(m):
            continue
        rel = os.path.relpath(m, root)
        if rel not in includes:
            includes.append(rel)
# Apply negations: remove any include whose relpath matches any exclude pattern
# (fnmatch against the relpath; also support exact-path excludes like
# "crates/legacy" from Cargo's `exclude` array).
def excluded(rel):
    for ex in excludes:
        if rel == ex or fnmatch.fnmatch(rel, ex):
            return True
    return False
for rel in includes:
    if not excluded(rel):
        print(rel)
PY
}
