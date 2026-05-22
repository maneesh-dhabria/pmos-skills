#!/usr/bin/env bash
# /architecture audit — entrypoint.
# T1 shipped a hardcoded U004 grep; T3 added the 3-tier rule loader + L1 cap (FR-21)
# + stack detection (FR-22) + L3 presence (FR-23); T4 adds L3 override merge
# (FR-11/20) + exemption parsing (FR-13) + config keys (FR-14); T5 adds the file
# scanner with gitignore + hardcoded deny-list + extension filter (FR-40/41/42/43,
# D15). Findings still come from the T1 U004 grep, but now driven by the
# enumerated file list, until T6+ wire the rest of the L1 rules.

set -euo pipefail

# Arg parsing (T14, FR-67; selector + --non-interactive added in /verify pass).
# FR-01: first positional MUST be the `audit` selector; absence/unknown selector → exit 64.
# --no-adr suppresses ADR writes; --non-interactive defaults the ADR-promotion prompt
# to "promote within cap" (no-op at the shell level — run-audit.sh always emits JSON
# without prompting; the flag is parsed for forward-compat with FR-04 + SKILL.md L48).
NO_ADR=0
NONINTERACTIVE=0
INCLUDE_INFO_COMMENTS=0
MONOREPO=0
LABEL=""
SORT_MODE="risk"
SINCE=""
SCAN_ROOT="."
POSITIONALS=()
prev=""
for arg in "$@"; do
  if [ "$prev" = "--label" ]; then
    LABEL="$arg"
    prev=""
    continue
  fi
  if [ "$prev" = "--sort" ]; then
    SORT_MODE="$arg"
    if [ "$SORT_MODE" != "risk" ]; then
      echo "unknown sort mode: $SORT_MODE (only 'risk' supported)" >&2
      exit 64
    fi
    prev=""
    continue
  fi
  if [ "$prev" = "--since" ]; then
    SINCE="$arg"
    prev=""
    continue
  fi
  case "$arg" in
    --no-adr) NO_ADR=1 ;;
    --non-interactive) NONINTERACTIVE=1 ;;
    --include-info-comments) INCLUDE_INFO_COMMENTS=1 ;;
    --monorepo) MONOREPO=1 ;;
    --label) prev="--label" ;;
    --sort) prev="--sort" ;;
    --since) prev="--since" ;;
    -*)
      echo "ERROR: unknown flag: $arg" >&2
      echo "usage: /architecture audit [path] [--no-adr] [--non-interactive] [--include-info-comments] [--monorepo] [--since <ref>]" >&2
      exit 64
      ;;
    *) POSITIONALS+=("$arg") ;;
  esac
done
# FR-01: require the `audit` selector as the first positional.
if [[ ${#POSITIONALS[@]} -eq 0 || "${POSITIONALS[0]}" != "audit" ]]; then
  echo "ERROR: /architecture requires the 'audit' selector as the first argument." >&2
  echo "usage: /architecture audit [path] [--no-adr] [--non-interactive] [--include-info-comments] [--monorepo] [--since <ref>]" >&2
  exit 64
fi
if [[ ${#POSITIONALS[@]} -ge 2 ]]; then
  SCAN_ROOT="${POSITIONALS[1]}"
fi
if [[ ${#POSITIONALS[@]} -gt 2 ]]; then
  echo "ERROR: too many positional arguments (got ${#POSITIONALS[@]}, max 2)." >&2
  echo "usage: /architecture audit [path] [--no-adr] [--non-interactive] [--include-info-comments] [--monorepo] [--since <ref>]" >&2
  exit 64
fi
# T5 (FR-33, D7) — exported for the L1 evaluator's U007 gate.
export INCLUDE_INFO_COMMENTS
# T7 (FR-34/35, D8) — exported for the monorepo detection gate in Phase 1.
export MONOREPO
export LABEL
# NFR-06 observability: log non-interactive mode to stderr (also keeps shellcheck
# from flagging NONINTERACTIVE as unused — it IS read here, not just written).
if [[ "$NONINTERACTIVE" -eq 1 ]]; then
  echo "[mode] non-interactive: ADR-promotion prompt defaulted to 'promote within cap' (FR-04)." >&2
fi

command -v jq >/dev/null 2>&1 || {
  echo "ERROR: /architecture requires jq. Install via brew/apt/dnf, then re-run." >&2
  exit 64
}

command -v python3 >/dev/null 2>&1 || {
  echo "ERROR: /architecture requires python3 (with PyYAML). Install, then re-run." >&2
  exit 64
}

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PLUGIN_YAML="${RUN_AUDIT_PLUGIN_YAML:-$SKILL_DIR/principles.yaml}"

# ── Loader (FR-11/12/13/14/20/21/22/23/34/35) ────────────────────────────────
# Emits JSON: {
#   tier_1, tier_2_ts, tier_2_py, tier_3, total_loaded,
#   l3_present, stacks_detected,
#   monorepo_detected: [{name, stack, manifest_path}],
#   rule_overrides: [{id, fields:{<field>:{before,after}}}],
#   exemptions: [{rule, file, line?, adr, expires?, note?}],
#   config: {adr_path, scan_root, extra_ignore},
#   effective_severity: {<rule_id>: <severity>},
#   scanned: {total, by_ext, excluded_by_gitignore, excluded_by_fallback,
#             files_for_rules: [<rel-path>, ...]}
# }
# File scanner (FR-40/41/42/43, D15):
#   In a git repo  → enumerate via `git ls-files --cached --others --exclude-standard`
#                    (.gitignore is honored by `--exclude-standard`); a separate
#                    `find` pass counts files dropped by gitignore.
#   Non-git tree   → enumerate via `find -type f -not -path '*/\.git/*'`.
#   Hardcoded deny-list (14 entries from D15): node_modules, .venv, __pycache__,
#     dist, build, .pytest_cache, .ruff_cache, .mypy_cache, coverage, .next,
#     .nuxt, .git, target, vendor — applied as path-segment match.
#   extra_ignore from L3 config (FR-14) unions with the deny-list.
#   Files for the rule pipeline are filtered to .ts .tsx .js .jsx .mjs .cjs .vue .py;
#   all other survivors count toward scanned.total but are not handed to evaluators.
# Merge precedence (FR-20): project L3 > stack L2 > universal L1.
# L1 cap (FR-21): >15 tier=1 plugin rules → exit 64 with exact message.
# Stack detection (FR-22): package.json+tsconfig.json → ts; pyproject/setup/requirements → py.
# L3 (FR-11/23): <scan-root>/.pmos/architecture/principles.yaml — missing → l3_present=false;
#   malformed → exit 64.
# T4 only parses exemptions; reconciliation against ADRs lands in T15.
LOADER_JSON="$(
  python3 - "$PLUGIN_YAML" "$SCAN_ROOT" <<'PY'
import json, os, subprocess, sys, yaml

plugin_path, scan_root = sys.argv[1], sys.argv[2]

try:
    with open(plugin_path) as f:
        plugin = yaml.safe_load(f) or {}
except Exception as exc:
    print(f"ERROR: plugin principles.yaml at {plugin_path} failed to parse: {exc}", file=sys.stderr)
    sys.exit(64)

plugin_rules = plugin.get("rules", []) or []

# T1 — v2 schema uses `disposition` (must_fix/should_fix/wont_fix); map to the
# harness internal `severity` vocab (block/warn/info) so the rest of the
# pipeline keeps working unchanged. JSON emit at the end remaps back to
# disposition before writing the sidecar.
_DISP_TO_SEV = {"must_fix": "block", "should_fix": "warn", "wont_fix": "info"}
for _r in plugin_rules:
    if "disposition" in _r and "severity" not in _r:
        _r["severity"] = _DISP_TO_SEV.get(_r["disposition"], _r["disposition"])

tier_1_rules = [r for r in plugin_rules if r.get("tier") == 1]

# FR-21 — L1 cap.
if len(tier_1_rules) > 15:
    print(f"ERROR: L1 has {len(tier_1_rules)} rules; cap is 15. Demote rules to L2 or remove.", file=sys.stderr)
    sys.exit(64)

# FR-22 — stack detection.
stacks = []
has_pkg = os.path.isfile(os.path.join(scan_root, "package.json"))
has_tsc = os.path.isfile(os.path.join(scan_root, "tsconfig.json"))
if has_pkg and has_tsc:
    stacks.append("ts")
has_py = (
    os.path.isfile(os.path.join(scan_root, "pyproject.toml"))
    or os.path.isfile(os.path.join(scan_root, "setup.py"))
    or any(
        n.startswith("requirements") and n.endswith(".txt")
        for n in (os.listdir(scan_root) if os.path.isdir(scan_root) else [])
    )
)
if has_py:
    stacks.append("py")

# FR-34/35 (T7) — depth-2 monorepo detection.
# When scan-root has no stack markers, walk each direct child dir to find
# sub-stacks. Populates monorepo_detected[{name, stack, manifest_path}].
# Skip ignored dirs so node_modules/.venv do not cause false-positive monorepo detection.
_DEPTH2_DENY = {
    ".git", "node_modules", ".venv", "venv", "dist", "build",
    ".next", ".nuxt", "__pycache__", ".pytest_cache", ".ruff_cache",
    ".mypy_cache", "coverage", "target",
}
monorepo_detected = []
if not stacks and os.path.isdir(scan_root):
    for child_name in sorted(os.listdir(scan_root)):
        child_path = os.path.join(scan_root, child_name)
        if not os.path.isdir(child_path):
            continue
        # Skip ignored dirs and hidden dirs (e.g. .git, .venv).
        if child_name in _DEPTH2_DENY or child_name.startswith("."):
            continue
        c_has_pkg = os.path.isfile(os.path.join(child_path, "package.json"))
        c_has_tsc = os.path.isfile(os.path.join(child_path, "tsconfig.json"))
        c_has_py = (
            os.path.isfile(os.path.join(child_path, "pyproject.toml"))
            or os.path.isfile(os.path.join(child_path, "setup.py"))
            or any(
                n.startswith("requirements") and n.endswith(".txt")
                for n in os.listdir(child_path)
            )
        )
        if c_has_pkg and c_has_tsc:
            monorepo_detected.append({
                "name": child_name,
                "stack": "ts",
                "manifest_path": os.path.join(child_name, "package.json").replace("\\", "/"),
            })
        elif c_has_py:
            manifest = (
                os.path.join(child_name, "pyproject.toml") if os.path.isfile(os.path.join(child_path, "pyproject.toml"))
                else os.path.join(child_name, "setup.py") if os.path.isfile(os.path.join(child_path, "setup.py"))
                else next(
                    (os.path.join(child_name, n) for n in os.listdir(child_path)
                     if n.startswith("requirements") and n.endswith(".txt")),
                    os.path.join(child_name, "requirements.txt"),
                )
            )
            monorepo_detected.append({
                "name": child_name,
                "stack": "py",
                "manifest_path": manifest.replace("\\", "/"),
            })

tier_2_rules = [r for r in plugin_rules if r.get("tier") == 2 and r.get("stack") in stacks]
tier_2_ts = sum(1 for r in tier_2_rules if r.get("stack") == "ts")
tier_2_py = sum(1 for r in tier_2_rules if r.get("stack") == "py")

# Start the merged set from plugin L1 + filtered L2.
merged = {r["id"]: dict(r) for r in tier_1_rules + tier_2_rules}

# FR-11/14/23 — L3 file.
l3_path = os.path.join(scan_root, ".pmos", "architecture", "principles.yaml")
l3_present = False
l3 = {}
if os.path.isfile(l3_path):
    try:
        with open(l3_path) as f:
            l3 = yaml.safe_load(f) or {}
    except Exception as exc:
        print(f"ERROR: {l3_path} malformed: {exc}", file=sys.stderr)
        sys.exit(64)
    if not isinstance(l3, dict):
        print(f"ERROR: {l3_path} malformed: top-level must be a mapping", file=sys.stderr)
        sys.exit(64)
    l3_present = True

# FR-14 — config keys (defaults when absent).
# T5 (FR-33, D7): flags.include_info_comments mirrors the shell flag
# --include-info-comments via $INCLUDE_INFO_COMMENTS so the JSON sidecar
# records the run-mode.
_risk_score = l3.get("risk_score", {}) or {}
config = {
    "adr_path": l3.get("adr_path", "docs/adr/"),
    "scan_root": l3.get("scan_root", "."),
    "extra_ignore": list(l3.get("extra_ignore", []) or []),
    "flags": {
        "include_info_comments": os.environ.get("INCLUDE_INFO_COMMENTS", "0") == "1",
    },
    "risk_score": {
        "churn_window_days": int(_risk_score.get("churn_window_days", 90)),
    },
}

# FR-13 — exemptions passthrough; reconciliation lives in T15.
# PyYAML auto-coerces unquoted ISO dates (e.g. `expires: 2025-01-01`) to
# datetime.date objects, which json.dumps refuses. Coerce to ISO strings so
# the JSON pipeline downstream stays string-typed regardless of quoting.
import datetime as _dt
def _stringify_dates(v):
    if isinstance(v, (_dt.date, _dt.datetime)):
        return v.isoformat()
    if isinstance(v, dict):
        return {k: _stringify_dates(val) for k, val in v.items()}
    if isinstance(v, list):
        return [_stringify_dates(x) for x in v]
    return v
exemptions = _stringify_dates(list(l3.get("exemptions", []) or []))

# FR-20 — merge L3 rule overrides onto merged set; track diffs.
# T1 — v2: L3 rules use `disposition`. Loud-fail on legacy `severity:` keys (E7).
rule_overrides = []
tier_3_new = 0
for r in (l3.get("rules", []) or []):
    if "severity" in r and "disposition" not in r:
        print(
            "principles.yaml uses legacy 'severity:' key; rename to 'disposition:' (block->must_fix, warn->should_fix, info->wont_fix).",
            file=sys.stderr,
        )
        sys.exit(64)
    if "disposition" in r and "severity" not in r:
        r["severity"] = _DISP_TO_SEV.get(r["disposition"], r["disposition"])
    rid = r.get("id")
    if not rid:
        continue
    if rid in merged:
        base = merged[rid]
        diff = {}
        for field, new_val in r.items():
            if field == "id":
                continue
            old_val = base.get(field)
            if old_val != new_val:
                diff[field] = {"before": old_val, "after": new_val}
                base[field] = new_val
        if diff:
            rule_overrides.append({"id": rid, "fields": diff})
    else:
        # New L3-only rule — adopt as tier 3.
        new_rule = dict(r)
        new_rule.setdefault("tier", 3)
        merged[rid] = new_rule
        tier_3_new += 1

effective_severity = {rid: r.get("severity") for rid, r in merged.items() if r.get("severity")}

# FR-71 — declarative_delegated_pct = count(rules with delegate_to in
# {dependency-cruiser, ruff}) / count(rules where tier in {1, 2}). L3-only
# tier-3 rules are excluded from the denominator: the metric tracks the
# health of the *shipped* rule pack, not project add-ons. Rounded to 3
# decimals (plan §T16 step 4).
declarative_tools = {"dependency-cruiser", "ruff"}
tier_12_rules = [r for r in merged.values() if r.get("tier") in (1, 2)]
tier_12_count = len(tier_12_rules)
delegated_count = sum(1 for r in tier_12_rules if r.get("delegate_to") in declarative_tools)
if tier_12_count > 0:
    declarative_delegated_pct = round(delegated_count / tier_12_count, 3)
else:
    declarative_delegated_pct = 0.0

# FR-40/41/42/43, D15 — file enumeration.
DENY_SEGMENTS = (
    "node_modules", ".venv", "__pycache__", "dist", "build",
    ".pytest_cache", ".ruff_cache", ".mypy_cache", "coverage",
    ".next", ".nuxt", ".git", "target", "vendor",
)
SUPPORTED_EXTS = (".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".py")

extra_ignore_segments = []
for raw in config["extra_ignore"]:
    seg = str(raw).strip().strip("/")
    if seg:
        extra_ignore_segments.append(seg)

deny_set = set(DENY_SEGMENTS) | set(extra_ignore_segments)

def has_denied_segment(rel_path):
    parts = rel_path.replace("\\", "/").split("/")
    return any(p in deny_set for p in parts)

def find_all_files(root):
    out = []
    for dirpath, dirnames, filenames in os.walk(root):
        # Always skip .git internals; deny-list filtering runs on the rel path.
        dirnames[:] = [d for d in dirnames if d != ".git"]
        for name in filenames:
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, root).replace("\\", "/")
            out.append(rel)
    return out

def in_git_repo(root):
    try:
        r = subprocess.run(
            ["git", "-C", root, "rev-parse", "--is-inside-work-tree"],
            capture_output=True, text=True, check=False,
        )
        return r.returncode == 0 and r.stdout.strip() == "true"
    except FileNotFoundError:
        return False

scanned_total = 0
by_ext = {}
excluded_by_gitignore = 0
excluded_by_fallback = 0
files_for_rules = []

if os.path.isdir(scan_root):
    is_repo = in_git_repo(scan_root)
    all_files = find_all_files(scan_root)

    if is_repo:
        r = subprocess.run(
            ["git", "-C", scan_root, "ls-files", "--cached", "--others",
             "--exclude-standard"],
            capture_output=True, text=True, check=False,
        )
        kept_by_git = set(
            line for line in r.stdout.splitlines() if line.strip()
        )
        # Files visible to `find` but not in the git keep-set are gitignored.
        for rel in all_files:
            if rel not in kept_by_git:
                excluded_by_gitignore += 1
        post_gitignore = [rel for rel in all_files if rel in kept_by_git]
    else:
        post_gitignore = list(all_files)

    for rel in post_gitignore:
        if has_denied_segment(rel):
            excluded_by_fallback += 1
            continue
        ext = os.path.splitext(rel)[1].lower()
        if ext not in SUPPORTED_EXTS:
            # Non-supported survivors (dotfiles, configs, docs) are not handed
            # to evaluators and not counted in scanned.total (per plan §T5
            # inline verification: total counts only the rule-pipeline set).
            continue
        scanned_total += 1
        by_ext[ext] = by_ext.get(ext, 0) + 1
        files_for_rules.append(rel)

print(json.dumps({
    "tier_1": len(tier_1_rules),
    "tier_2_ts": tier_2_ts,
    "tier_2_py": tier_2_py,
    "tier_3": tier_3_new,
    "total_loaded": len(merged),
    "declarative_delegated_pct": declarative_delegated_pct,
    "l3_present": l3_present,
    "stacks_detected": stacks,
    "monorepo_detected": monorepo_detected,
    "rule_overrides": rule_overrides,
    "exemptions": exemptions,
    "config": config,
    "effective_severity": effective_severity,
    "scanned": {
        "total": scanned_total,
        "by_ext": by_ext,
        "excluded_by_gitignore": excluded_by_gitignore,
        "excluded_by_fallback": excluded_by_fallback,
        "files_for_rules": files_for_rules,
    },
}))
PY
)"

START="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
START_EPOCH="$(date -u +%s)"

# ── T7 (FR-34/35, D8, E8) — early monorepo warn-mode gate ──────────────────
# Computed immediately after LOADER_JSON is captured so we can skip the
# T3 idiom walker, L1 evaluator, and L2 delegated tools entirely on monorepos
# (wasted work — their findings get discarded by warn-mode anyway).
MONOREPO_DETECTED_LEN=$(echo "$LOADER_JSON" | jq '.monorepo_detected | length')
STACKS=$(echo "$LOADER_JSON" | jq -r '.stacks_detected | join(",")')
WARN_MODE=0
if [ "$MONOREPO_DETECTED_LEN" -gt 0 ] && [ "$MONOREPO" -eq 0 ]; then
  MONOREPO_NAMES=$(echo "$LOADER_JSON" | jq -r '[.monorepo_detected[] | .name + "(" + .stack + ")"] | join(", ")')
  echo "No stack markers at scan root; found ${MONOREPO_DETECTED_LEN} candidate stacks under direct children: ${MONOREPO_NAMES}. Re-run with --monorepo to fan out." >&2
  WARN_MODE=1
  findings_json='[]'
  STACKS=""
fi
findings_with_risk_json='[]'

FANOUT_MODE=0
if [ "$MONOREPO_DETECTED_LEN" -gt 0 ] && [ "$MONOREPO" -eq 1 ]; then
  FANOUT_MODE=1
fi
if [ "$FANOUT_MODE" = "1" ]; then
  LOADER_JSON_ENV="$LOADER_JSON" \
  SKILL_DIR_ENV="$SKILL_DIR" \
  SCAN_ROOT_ENV="$SCAN_ROOT" \
  AUDIT_SH="$0" \
  NO_ADR_ENV="${NO_ADR:-0}" \
  NONINTERACTIVE_ENV="${NONINTERACTIVE:-0}" \
  python3 <<'PY' 1>&2
import json, os, sys, subprocess, pathlib, datetime, re, html, shutil

loader = json.loads(os.environ["LOADER_JSON_ENV"])
skill_dir = pathlib.Path(os.environ["SKILL_DIR_ENV"])
scan_root_str = os.environ["SCAN_ROOT_ENV"]
scan_root = pathlib.Path(scan_root_str).resolve()
audit_sh = os.environ["AUDIT_SH"]
substrate_dir = skill_dir.parent / "_shared" / "html-authoring"
substrate_assets = substrate_dir / "assets"

# 1. Resolve parent docs_path from .pmos/settings.yaml under scan_root.
docs_path = pathlib.Path("docs/pmos")
settings_path = scan_root / ".pmos" / "settings.yaml"
if settings_path.is_file():
    try:
        import yaml
        s = yaml.safe_load(settings_path.read_text()) or {}
        if s.get("docs_path"):
            docs_path = pathlib.Path(str(s["docs_path"]).rstrip("/"))
    except Exception:
        pass
# Resolve relative docs_path against scan_root so the env var we pass to
# children is absolute (children may cwd into stack subdirs).
if not docs_path.is_absolute():
    docs_path = (scan_root / docs_path).resolve()
arch_dir = docs_path / "architecture"
arch_dir.mkdir(parents=True, exist_ok=True)

# Plugin version for cache-bust.
plugin_version = "0"
plugin_json = skill_dir.parent.parent / ".claude-plugin" / "plugin.json"
if plugin_json.is_file():
    try:
        plugin_version = json.loads(plugin_json.read_text()).get("version", "0")
    except Exception:
        pass

# Propagate parent flags so children inherit non-interactive / no-adr behavior
# when the parent had them — never silently strip ADR work the user expected.
parent_no_adr = os.environ.get("NO_ADR_ENV", "0") == "1"
parent_noninteractive = os.environ.get("NONINTERACTIVE_ENV", "0") == "1"

detected = loader.get("monorepo_detected") or []
stack_entries = []
failed_stacks = []
for entry in detected:
    name = entry.get("name") or "stack"
    sanitized = re.sub(r"[^A-Za-z0-9._-]", "-", name)
    manifest_path = entry.get("manifest_path") or ""
    stack_dir = (scan_root / pathlib.Path(manifest_path).parent).resolve()
    child_env = dict(os.environ)
    child_env["ARCH_DOCS_PATH"] = str(docs_path)
    # Child must not re-fan-out — it sees its own stack markers as single-stack.
    child_env.pop("MONOREPO", None)
    argv = ["bash", audit_sh, "audit", str(stack_dir), "--label", sanitized]
    if parent_no_adr:
        argv.append("--no-adr")
    if parent_noninteractive:
        argv.append("--non-interactive")
    try:
        subprocess.run(argv, env=child_env, check=True)
    except subprocess.CalledProcessError as exc:
        print(f"fan-out: child audit for {name} failed rc={exc.returncode}", file=sys.stderr)
        failed_stacks.append(name)
    stack_entries.append({
        "name": name,
        "sanitized": sanitized,
        "stack": entry.get("stack"),
        "manifest_path": manifest_path,
    })

# 3. Same-day collision: pick index stem before reading children (the children
# emit on their own collision logic; index just needs its own free slot).
date_s = datetime.date.today().isoformat()
def index_stem(idx):
    return f"{date_s}_index" if idx == 0 else f"{date_s}_index-{idx + 1}"
idx = 0
while (arch_dir / f"{index_stem(idx)}.html").exists():
    idx += 1
stem = index_stem(idx)

# 4. Collect per-stack triplet summaries by globbing the latest matching JSON
# for each stack (children handle their own -2/-3 suffixing).
stacks = []
total_must = total_should = total_wont = total_files = 0
for ent in stack_entries:
    san = ent["sanitized"]
    # Match exactly {date}_{san}.json or {date}_{san}-N.json (N>=2). Excludes
    # .sections.json sidecars and unrelated stacks whose names share a prefix.
    stem_re = re.compile(r"^" + re.escape(f"{date_s}_{san}") + r"(?:-\d+)?\.json$")
    candidates = sorted(
        p for p in arch_dir.iterdir()
        if p.is_file() and stem_re.match(p.name)
    )
    triplet_html = None
    triplet_json = None
    summary = {"must_fix": 0, "should_fix": 0, "wont_fix": 0, "files": 0}
    if candidates:
        latest = candidates[-1]
        triplet_json = latest.name
        triplet_html = latest.with_suffix(".html").name
        try:
            r = json.loads(latest.read_text())
            findings = r.get("findings") or []
            for f in findings:
                d = f.get("disposition", "wont_fix")
                if d in summary:
                    summary[d] += 1
            summary["files"] = (r.get("scanned") or {}).get("total", 0) or 0
        except Exception as exc:
            print(f"fan-out: failed reading {latest}: {exc}", file=sys.stderr)
    total_must += summary["must_fix"]
    total_should += summary["should_fix"]
    total_wont += summary["wont_fix"]
    total_files += summary["files"]
    stacks.append({
        "name": ent["name"],
        "stack": ent["stack"],
        "manifest_path": ent["manifest_path"],
        "triplet_html": triplet_html,
        "triplet_json": triplet_json,
        "summary": summary,
    })

index_obj = {
    "schema_version": 2,
    "date": date_s,
    "scan_root": str(scan_root),
    "stacks": stacks,
    "summary": {
        "total_must_fix": total_must,
        "total_should_fix": total_should,
        "total_wont_fix": total_wont,
        "total_files": total_files,
    },
}

# 5. Asset substrate (idempotent cp -n) — mirrors the canonical-emit logic.
assets_dst = arch_dir / "assets"
assets_dst.mkdir(exist_ok=True)
if substrate_assets.is_dir():
    for src in substrate_assets.iterdir():
        if not src.is_file():
            continue
        dst = assets_dst / src.name
        if not dst.exists():
            shutil.copy2(src, dst)

# 6. Render index HTML from substrate template (with inline fallback).
template_html = ""
template_path = substrate_dir / "template.html"
if template_path.is_file():
    template_html = template_path.read_text()
else:
    template_html = (
        "<!DOCTYPE html><html><head><meta charset=\x22utf-8\x22>"
        "<title>{{title}}</title></head><body><main>{{content}}</main></body></html>"
    )

rows = []
for s in stacks:
    sm = s["summary"]
    link = s.get("triplet_html") or ""
    report_cell = (
        f'<a href=\x22{html.escape(link)}\x22>{html.escape(link)}</a>'
        if link else "<em>missing</em>"
    )
    rows.append(
        "<tr>"
        f"<td><code>{html.escape(str(s.get('name','')))}</code></td>"
        f"<td>{html.escape(str(s.get('stack','')))}</td>"
        f"<td>{sm['must_fix']}</td>"
        f"<td>{sm['should_fix']}</td>"
        f"<td>{sm['wont_fix']}</td>"
        f"<td>{report_cell}</td>"
        "</tr>"
    )

content_html = "\n".join([
    f'<h2 id=\x22monorepo-index\x22>Monorepo audit index ({len(stacks)} stacks)</h2>',
    '<table><thead><tr>'
    '<th>Stack</th><th>Type</th><th>Must Fix</th><th>Should Fix</th>'
    '<th>Won\x27t Fix</th><th>Report</th>'
    '</tr></thead>',
    f'<tbody>\n{chr(10).join(rows) if rows else ""}\n</tbody></table>',
    '<h2 id=\x22index-summary\x22>Summary</h2>',
    f'<p>scan_root: <code>{html.escape(str(scan_root))}</code> · '
    f'total must_fix: {total_must} · total should_fix: {total_should} · '
    f'total won\x27t_fix: {total_wont} · total files: {total_files}</p>',
])

asset_prefix = "assets/"
final_html = (template_html
    .replace("{{title}}", f"/architecture audit — monorepo index")
    .replace("{{asset_prefix}}", asset_prefix)
    .replace("{{plugin_version}}", str(plugin_version))
    .replace("{{content}}", content_html)
    .replace("{{source_path}}", f"{stem}.html"))

# Guard: every <h2>/<h3> we emit must carry an id= attribute.
for m in re.finditer(r"<(h[23])\b([^>]*)>", final_html):
    if 'id="' not in m.group(2):
        print(f"fan-out: missing id on <{m.group(1)}>: {m.group(0)}", file=sys.stderr)
        sys.exit(1)

def atomic_write(path, content):
    tmp = path.with_suffix(path.suffix + f".tmp.{os.getpid()}")
    tmp.write_text(content)
    tmp.rename(path)

html_path = arch_dir / f"{stem}.html"
json_path = arch_dir / f"{stem}.json"
atomic_write(html_path, final_html)
atomic_write(json_path, json.dumps(index_obj, indent=2))

print(
    f"Wrote {html_path}: {len(stacks)} stacks "
    f"({total_must} must, {total_should} should, {total_wont} won\x27t) "
    f"over {total_files} files",
    file=sys.stderr,
)
if failed_stacks:
    print(f"fan-out: {len(failed_stacks)} child audit(s) failed: {failed_stacks}", file=sys.stderr)
    sys.exit(1)
PY
  exit 0
fi

# Skipped entirely in warn-mode (monorepo detected without --monorepo flag).
idiomatic_exemptions_json='[]'
if [ "$WARN_MODE" != "1" ]; then
# ── Idiom AST walker — Typer/Click/Fire/argparse (T3/T4, FR-30/31/32, D13, E9) ─
# Runs BEFORE the L1 evaluator so the U004 rule can consume exempt_ranges
# to suppress idiomatic CLI-handler prints (FR-32) and record the
# suppressed provenance under exemptions.idiomatic[*].suppressed[] (NFR-08).
# Shape: [ { file: <rel>, framework: <typer|click|fire|argparse>,
#           exempt_ranges: [{start, end}, ...] }, ... ]
# Sorted by file asc, ranges sorted by start asc — idempotent across runs.
# Range start = min(decorator_list[*].lineno, FunctionDef.lineno), end = end_lineno.
# T4 (FR-32, NFR-08): the suppressed[] key is filled in below from the L1
# evaluator's U004 pass; T3 emits only file/framework/exempt_ranges here.
idiomatic_exemptions_json=$(
  python3 - "$LOADER_JSON" "$SCAN_ROOT" <<'PY'
import ast, json, os, sys

loader = json.loads(sys.argv[1])
scan_root = sys.argv[2]
files = loader["scanned"]["files_for_rules"]

CLI_FRAMEWORKS = {"typer", "click", "fire", "argparse"}

def attr_root(node):
    """Return the leftmost ast.Name id of a (possibly nested) Attribute chain,
    or None if the chain doesn't bottom out at a Name."""
    cur = node
    while isinstance(cur, ast.Attribute):
        cur = cur.value
    if isinstance(cur, ast.Name):
        return cur.id
    return None

def resolve_to_framework(root_name, name_map, assign_map):
    """Walk root_name through assignment_map and name_resolution_map until a
    CLI framework is hit or no further resolution is possible. Returns the
    framework string or None."""
    seen = set()
    cur = root_name
    while cur and cur not in seen:
        seen.add(cur)
        if cur in CLI_FRAMEWORKS:
            return cur
        # Assignment first (e.g. app = typer.Typer() → app → typer).
        if cur in assign_map:
            cur = assign_map[cur]
            continue
        # Then aliased / from-imports.
        if cur in name_map:
            mapped = name_map[cur]
            # mapped may be a dotted path ("click.command") — take the head.
            head = mapped.split(".")[0]
            if head == cur:
                # Self-referential (e.g. import click → click→click); check
                # framework membership directly then stop to avoid infinite loop.
                if head in CLI_FRAMEWORKS:
                    return head
                return None
            cur = head
            continue
        return None
    return None

def decorator_root(dec):
    """Unwrap @foo(...) → foo, then return the root Name id of foo or foo.bar."""
    if isinstance(dec, ast.Call):
        dec = dec.func
    if isinstance(dec, ast.Name):
        return dec.id
    if isinstance(dec, ast.Attribute):
        return attr_root(dec)
    return None

results = []

for rel in files:
    if not rel.endswith(".py"):
        continue
    abs_path = os.path.join(scan_root, rel)
    try:
        with open(abs_path, "r", encoding="utf-8") as fh:
            source = fh.read()
    except (OSError, UnicodeDecodeError):
        continue
    try:
        tree = ast.parse(source, filename=abs_path)
    except SyntaxError:
        continue

    # Build name_resolution_map from Import / ImportFrom nodes.
    name_map = {}  # local_name → fully_qualified_module (or module.attr)
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                local = alias.asname or alias.name.split(".")[0]
                # alias.name may be dotted ("foo.bar"); local resolves to head.
                name_map[local] = alias.name.split(".")[0]
        elif isinstance(node, ast.ImportFrom):
            mod = node.module or ""
            if not mod:
                continue
            for alias in node.names:
                local = alias.asname or alias.name
                # e.g. from click import command → command → click.command
                name_map[local] = mod

    # Build assignment_map: target_name → root_name of RHS attribute chain.
    # Captures `app = typer.Typer()` → app → typer; ignores complex RHS.
    assign_map = {}
    for node in ast.walk(tree):
        if not isinstance(node, ast.Assign):
            continue
        # Only single-target Name assignments with a Call/Attribute/Name RHS.
        if len(node.targets) != 1 or not isinstance(node.targets[0], ast.Name):
            continue
        target = node.targets[0].id
        rhs = node.value
        if isinstance(rhs, ast.Call):
            rhs = rhs.func
        root = None
        if isinstance(rhs, ast.Attribute):
            root = attr_root(rhs)
        elif isinstance(rhs, ast.Name):
            root = rhs.id
        if root:
            assign_map[target] = root

    # Walk FunctionDef / AsyncFunctionDef collecting CLI-decorated ranges.
    ranges = []
    framework_hit = None
    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        if not node.decorator_list:
            continue
        for dec in node.decorator_list:
            root_name = decorator_root(dec)
            if not root_name:
                continue
            fw = resolve_to_framework(root_name, name_map, assign_map)
            if fw:
                # D13: function-scoped range. Start = decorator line (earliest
                # decorator); end = FunctionDef.end_lineno (Py 3.8+).
                dec_linenos = [d.lineno for d in node.decorator_list
                               if hasattr(d, "lineno")]
                start = min(dec_linenos + [node.lineno]) if dec_linenos else node.lineno
                end = getattr(node, "end_lineno", node.lineno)
                ranges.append({"start": start, "end": end})
                if framework_hit is None:
                    framework_hit = fw
                break  # one decorator hit is enough for this function

    if ranges:
        ranges.sort(key=lambda r: r["start"])
        results.append({
            "file": rel,
            "framework": framework_hit,
            "exempt_ranges": ranges,
        })

results.sort(key=lambda e: e["file"])
print(json.dumps(results))
PY
)

# ── L1 evaluator (T6 size/shape + T7 debug/hygiene) ──────────────────────────
# Single python pass over scanned.files_for_rules. Severity is rewritten in the
# final jq -n via effective_severity, so L3 demotes/promotes flow through.
# T6 rules: U001 (file>500), U002 (TS fn>100), U003 (args>4), U006 (path depth).
# T7 rules: U004 (console.log|print( in src/, excl tests/,scripts/),
#           U005 (TODO/FIXME/XXX with git-blame committer-time > 90d),
#           U007 (file lacks top-of-file purpose comment, info-severity),
#           U008 (commented-out code blocks > 5 lines, code-like heuristic).
# T4 (FR-32, NFR-08): argv[3] = idiomatic_exemptions_json (from the AST
# walker above). U004 drops matches inside any exempt_range and records
# the suppressed provenance into argv[3]'s suppressed[] key, which is
# re-emitted on stdout as the second JSON line.
# Bash 3.2 (default macOS) miscounts double quotes across a quoted heredoc
# embedded inside "$(...)" — workaround: assign without the outer quotes.
# The variable value is preserved verbatim; quote $findings_json at use site.
l1_pass_json=$(
  python3 - "$LOADER_JSON" "$SCAN_ROOT" "$idiomatic_exemptions_json" <<'PY'
import ast, json, os, re, subprocess, sys, time

loader = json.loads(sys.argv[1])
scan_root = sys.argv[2]
idiomatic = json.loads(sys.argv[3])  # T4: [{file, framework, exempt_ranges:[…]}]
# Build {rel_file → [(start, end), …]} lookup for inclusive-bounds membership
# tests during U004 evaluation, plus a parallel {rel_file → [suppressed-entry]}
# dict so we can stamp NFR-08 audit-trail provenance back onto the
# idiomatic_exemptions JSON.
exempt_ranges_by_file = {}
suppressed_by_file = {}
for e in idiomatic:
    exempt_ranges_by_file[e["file"]] = [(r["start"], r["end"]) for r in e["exempt_ranges"]]
    suppressed_by_file[e["file"]] = []
files = loader["scanned"]["files_for_rules"]

CONSOLE_LOG_OR_PRINT = re.compile(r'console\.log|print\(')
TS_FN_START = re.compile(r'^\s*(?:export\s+)?(?:async\s+)?function\s+\w+')
TS_FN_OR_CTOR_SIG = re.compile(r'(?:function\s+\w+|constructor)\s*\(([^)]*)\)')
TODO_RE = re.compile(r'\b(TODO|FIXME|XXX)\b')
COMMENT_LINE_RE = re.compile(r'^\s*(//|#)')
CODE_CHARS = set('(){};=')
HEX = set('0123456789abcdef')
# U009 hardcoded-credential patterns (block). Use \x22 / \x27 for the quote
# class instead of literal ["'] — bash 3.2 (default macOS) miscounts unbalanced
# single quotes across a $(... <<'PY' ...) heredoc once the body grows past a
# threshold; \xNN keeps the literal quote count in the body even.
U009_RE = re.compile(
    r'AKIA[0-9A-Z]{16}'
    r'|sk-[a-zA-Z0-9]{20,}'
    r'|(?:api[-_]?key|secret|password|token)\s*=\s*[\x22\x27][A-Za-z0-9_\-]{16,}[\x22\x27]'
    r'|-----BEGIN [A-Z ]+PRIVATE KEY-----',
    re.IGNORECASE,
)
# U010 stub-on-main-path patterns (block). main-code-path = NOT under
# tests/ or scripts/ — same path-segment rule as U004.
U010_RE = re.compile(r'raise\s+NotImplementedError|throw\s+new\s+Error\([\x22\x27]TBD')

def find_ts_function_spans(lines):
    """Return list of (start_line_1idx, end_line_1idx) for top-level functions."""
    spans = []
    i = 0
    n = len(lines)
    while i < n:
        if TS_FN_START.match(lines[i]):
            start = i
            depth = 0
            saw_open = False
            j = i
            while j < n:
                for ch in lines[j]:
                    if ch == '{':
                        depth += 1
                        saw_open = True
                    elif ch == '}':
                        depth -= 1
                if saw_open and depth <= 0:
                    break
                j += 1
            spans.append((start + 1, j + 1))
            i = j + 1
        else:
            i += 1
    return spans

def run_git_blame(rel):
    """Return dict[line_no_1idx -> committer-time unix int], or None on failure
    (FR-32 graceful-degrade: file untracked, no git, not a repo, timeout)."""
    try:
        r = subprocess.run(
            ["git", "-C", scan_root, "blame", "--line-porcelain", rel],
            capture_output=True, text=True, timeout=10,
        )
        if r.returncode != 0:
            return None
    except (OSError, subprocess.TimeoutExpired):
        return None
    line_to_time = {}
    sha_to_time = {}
    current_sha = None
    current_final_line = None
    for bl in r.stdout.splitlines():
        if not bl:
            continue
        if bl.startswith('\t'):
            if current_sha is not None and current_final_line is not None:
                t = sha_to_time.get(current_sha)
                if t is not None:
                    line_to_time[current_final_line] = t
            current_sha = None
            current_final_line = None
            continue
        parts = bl.split(' ')
        if parts and len(parts[0]) >= 7 and all(c in HEX for c in parts[0].lower()) and len(parts) >= 3:
            current_sha = parts[0]
            try:
                current_final_line = int(parts[2])
            except (ValueError, IndexError):
                current_final_line = None
        elif bl.startswith('committer-time ') and current_sha is not None:
            try:
                sha_to_time[current_sha] = int(bl.split(' ', 1)[1])
            except ValueError:
                pass
    return line_to_time

cutoff_unix = int(time.time()) - (90 * 86400)
findings = []

for rel in files:
    full = os.path.join(scan_root, rel)
    if not os.path.isfile(full):
        continue
    try:
        with open(full, encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
    except OSError:
        continue

    rel_segs = rel.replace("\\", "/").split("/")
    in_excluded_path = any(seg in ("tests", "scripts") for seg in rel_segs)
    is_ts = rel.endswith((".ts", ".tsx"))

    # U001 — file > 500 LOC (all supported exts)
    if len(lines) > 500:
        findings.append({
            "rule_id": "U001",
            "severity": "warn",
            "file": rel,
            "line": 1,
            "message": f"file is {len(lines)} lines; exceeds 500-line cap",
            "source_citation": "principles.yaml#U001",
            "suppressed_by": None,
        })

    # U006 — path depth > 4 after src/
    if rel_segs and rel_segs[0] == "src" and (len(rel_segs) - 1) > 4:
        findings.append({
            "rule_id": "U006",
            "severity": "warn",
            "file": rel,
            "line": 1,
            "message": f"path depth {len(rel_segs) - 1} after src/ exceeds 4",
            "source_citation": "principles.yaml#U006",
            "suppressed_by": None,
        })

    # U004 — console.log | print( (T7 formalised: applies to all exts under
    # the rule pipeline; excludes paths under tests/ or scripts/ per
    # principles.yaml#U004 `paths:src/;exclude:tests/,scripts/`).
    # T4 (FR-32): drop matches whose line falls inside any idiomatic
    # exempt_range for this file (inclusive bounds: start <= line <= end);
    # record the suppression under suppressed_by_file[rel] for NFR-08
    # audit-trail provenance, NOT appended to findings.
    if not in_excluded_path:
        ranges = exempt_ranges_by_file.get(rel, [])
        for idx, line in enumerate(lines, 1):
            if CONSOLE_LOG_OR_PRINT.search(line):
                msg = "console.log / print( forbidden outside scripts/, tests/"
                if any(start <= idx <= end for (start, end) in ranges):
                    suppressed_by_file[rel].append({
                        "rule_id": "U004",
                        "line": idx,
                        "message": msg,
                    })
                    continue
                findings.append({
                    "rule_id": "U004",
                    "severity": "warn",
                    "file": rel,
                    "line": idx,
                    "message": msg,
                    "source_citation": "principles.yaml#U004",
                    "suppressed_by": None,
                })

    # U009 — hardcoded credential / API-key patterns (block-severity).
    # All files in the rule pipeline; no path exclusion (secrets are an
    # incident wherever they appear).
    for idx, line in enumerate(lines, 1):
        if U009_RE.search(line):
            findings.append({
                "rule_id": "U009",
                "severity": "block",
                "file": rel,
                "line": idx,
                "message": "hardcoded credential / API-key pattern detected",
                "source_citation": "principles.yaml#U009",
                "suppressed_by": None,
            })

    # U010 — NotImplementedError / throw new Error('TBD') on main code path
    # (block-severity). Excludes paths under tests/ or scripts/.
    if not in_excluded_path:
        for idx, line in enumerate(lines, 1):
            if U010_RE.search(line):
                findings.append({
                    "rule_id": "U010",
                    "severity": "block",
                    "file": rel,
                    "line": idx,
                    "message": "stub on main code path: NotImplementedError / TBD",
                    "source_citation": "principles.yaml#U010",
                    "suppressed_by": None,
                })

    # U005 — TODO/FIXME/XXX with blame committer-time > 90 days old.
    # Run blame only when the file has at least one matching line. Graceful
    # degrade: if blame is unavailable (no git / untracked / timeout), skip.
    todo_lines = [(idx, line) for idx, line in enumerate(lines, 1) if TODO_RE.search(line)]
    if todo_lines:
        blame = run_git_blame(rel)
        if blame:
            for idx, line in todo_lines:
                t = blame.get(idx)
                if t is not None and t < cutoff_unix:
                    age_days = (int(time.time()) - t) // 86400
                    findings.append({
                        "rule_id": "U005",
                        "severity": "warn",
                        "file": rel,
                        "line": idx,
                        "message": f"TODO/FIXME/XXX is {age_days} days old; > 90 days threshold",
                        "source_citation": "principles.yaml#U005",
                        "suppressed_by": None,
                    })

    # U007 — file lacks top-of-file purpose comment.
    # T5 (FR-33, D7): default-off + carve-outs. U007 plugin disposition is
    # wont_fix; skip unless --include-info-comments OR an L3 override
    # promoted U007 to should_fix/must_fix. When enabled, fire only when
    # ALL three carve-outs fail: non-blank LOC gt 100; no module docstring
    # of stripped length ge 40 chars; basename ne __init__.py.
    u007_eff_sev = loader.get("effective_severity", {}).get("U007", "info")
    u007_enabled = (u007_eff_sev != "info") or (
        os.environ.get("INCLUDE_INFO_COMMENTS", "0") == "1"
    )
    if u007_enabled:
        non_blank_loc = sum(1 for l in lines if l.strip())
        basename = os.path.basename(rel)
        has_long_docstring = False
        # Docstring carve-out is Py-only — JS/TS/Vue have no equivalent construct.
        if rel.endswith(".py"):
            try:
                _mod = ast.parse("".join(lines))
                _doc = ast.get_docstring(_mod) or ""
                if len(_doc.strip()) >= 40:
                    has_long_docstring = True
            except (SyntaxError, ValueError):
                pass
        if non_blank_loc > 100 and basename != "__init__.py" and not has_long_docstring:
            findings.append({
                "rule_id": "U007",
                "severity": "info",
                "file": rel,
                "line": 1,
                "message": "file lacks a top-of-file purpose comment",
                "source_citation": "principles.yaml#U007",
                "suppressed_by": None,
            })

    # U008 — > 5 consecutive commented lines whose content looks like code.
    run_start = None
    run_len = 0
    code_like = False
    def maybe_emit_run(start, length, ok):
        if start is not None and length > 5 and ok:
            findings.append({
                "rule_id": "U008",
                "severity": "warn",
                "file": rel,
                "line": start,
                "message": f"commented-out code block: {length} consecutive lines",
                "source_citation": "principles.yaml#U008",
                "suppressed_by": None,
            })
    for idx, line in enumerate(lines, 1):
        if COMMENT_LINE_RE.match(line):
            if run_start is None:
                run_start = idx
                run_len = 0
                code_like = False
            run_len += 1
            if any(c in line for c in CODE_CHARS):
                code_like = True
        else:
            maybe_emit_run(run_start, run_len, code_like)
            run_start = None
            run_len = 0
            code_like = False
    maybe_emit_run(run_start, run_len, code_like)

    if is_ts:
        # U002 — TS function body > 100 LOC
        for start, end in find_ts_function_spans(lines):
            if (end - start + 1) > 100:
                findings.append({
                    "rule_id": "U002",
                    "severity": "warn",
                    "file": rel,
                    "line": start,
                    "message": f"function body is {end - start + 1} lines; exceeds 100-line cap",
                    "source_citation": "principles.yaml#U002",
                    "suppressed_by": None,
                })

        # U003 — function or constructor with > 4 args
        # Plan §goal: ">4 args" (≥5 args). 5 args = 4 commas, so commas > 3.
        text = "".join(lines)
        for m in TS_FN_OR_CTOR_SIG.finditer(text):
            args = m.group(1).strip()
            if not args:
                continue
            commas = args.count(",")
            arg_count = commas + 1
            if arg_count > 4:
                line_no = text[:m.start()].count("\n") + 1
                findings.append({
                    "rule_id": "U003",
                    "severity": "warn",
                    "file": rel,
                    "line": line_no,
                    "message": f"function/constructor has {arg_count} args; exceeds 4",
                    "source_citation": "principles.yaml#U003",
                    "suppressed_by": None,
                })

# T4 (NFR-08): re-emit idiomatic with the suppressed[] audit trail attached.
# Preserves T3's shape (file/framework/exempt_ranges) and only adds the
# `suppressed` key — entries with no suppressions get an empty array.
idiomatic_out = []
for e in idiomatic:
    out = dict(e)
    out["suppressed"] = suppressed_by_file.get(e["file"], [])
    idiomatic_out.append(out)

print(json.dumps({"findings": findings, "idiomatic": idiomatic_out}))
PY
)

# Split the combined L1 pass output back into the two consumers (findings
# stream + suppression-stamped idiomatic exemptions).
findings_json=$(echo "$l1_pass_json" | jq '.findings')
idiomatic_exemptions_json=$(echo "$l1_pass_json" | jq '.idiomatic')

# E13 carve-out: same-file matches don't fire (distinct_files < 2 short-circuits).
u011_json=$(
LOADER_JSON_ENV="$LOADER_JSON" \
SCAN_ROOT_ENV="$SCAN_ROOT" \
python3 <<'PY'
import ast, json, os, pathlib
from collections import defaultdict

loader = json.loads(os.environ["LOADER_JSON_ENV"])
scan_root = pathlib.Path(os.environ["SCAN_ROOT_ENV"]).resolve()
files = [f for f in loader["scanned"]["files_for_rules"] if f.endswith(".py")]

def sig_key(node):
    args = node.args
    def ann(a):
        return ast.unparse(a.annotation) if a.annotation is not None else ""
    parts = []
    for a in args.posonlyargs + args.args:
        parts.append(f"_:{ann(a)}")
    if args.vararg is not None:
        parts.append(f"*:{ann(args.vararg)}")
    for a in args.kwonlyargs:
        parts.append(f"_:{ann(a)}")
    if args.kwarg is not None:
        parts.append(f"**:{ann(args.kwarg)}")
    ret = ast.unparse(node.returns) if node.returns is not None else ""
    return f"{node.name}({','.join(parts)})->{ret}"

sig_map = defaultdict(list)
for rel in files:
    abspath = scan_root / rel
    try:
        tree = ast.parse(abspath.read_text())
    except (SyntaxError, ValueError, OSError):
        continue
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            sig_map[sig_key(node)].append((rel, node.lineno))

u011_findings = []
for key, occurrences in sig_map.items():
    distinct_files = {f for (f, _ln) in occurrences}
    if len(distinct_files) < 2:
        continue
    for (rel, ln) in occurrences:
        peers = sorted({f for f in distinct_files if f != rel})
        u011_findings.append({
            "rule_id": "U011",
            "file": rel,
            "line": ln,
            "message": f"Cross-file duplicate signature: {key}",
            "severity": "warn",
            "source": "principles.yaml#U011",
            "cross_refs": peers,
        })
print(json.dumps(u011_findings))
PY
)

findings_json=$(jq -n \
  --argjson a "$findings_json" \
  --argjson b "$u011_json" \
  '$a + $b')

fi  # end WARN_MODE guard for T3 + L1

# ── L2 delegated tool: dependency-cruiser (T9, FR-30/32/33) ──────────────────
# Runs only when stacks_detected includes "ts". Graceful-degrade per FR-32:
# missing npx/depcruise → tools_skipped += "dependency-cruiser", findings=[].
# Invocation: `npx --no-install depcruise --output-type json --config <cfg> $SCAN_ROOT`
# from within $SCAN_ROOT so the project's own typescript peer is picked up.
# Violations are mapped name → rule_id (.depcruise.cjs names rules TS001-TS004
# 1:1 with principles.yaml); severity is rewritten downstream via effective_severity.
TOOLS_SKIPPED=()
TOOLS_ERRORED_JSON='[]'  # appended via jq when a delegated tool exits non-zero

tools_skipped_json='[]'
cycles_json='[]'
module_metrics_json='[]'
godmodule_candidates_json='[]'
if [ "$WARN_MODE" != "1" ]; then  # skip L2 delegated tools in warn-mode
depcruise_findings='[]'
if echo ",$STACKS," | grep -q ',ts,'; then
  echo "[delegated] dependency-cruiser: check available" 1>&2
  # Run from $SCAN_ROOT first to honour project-local typescript; fall back to
  # $SKILL_DIR (which ships dep-cruiser + typescript as devDeps) so the skill
  # works on projects that don't install typescript themselves.
  dc_cwd=""
  if (cd "$SCAN_ROOT" && npx --no-install depcruise --version >/dev/null 2>&1); then
    dc_cwd="$SCAN_ROOT"
  elif (cd "$SKILL_DIR" && npx --no-install depcruise --version >/dev/null 2>&1); then
    dc_cwd="$SKILL_DIR"
  fi
  if [ -n "$dc_cwd" ]; then
    dc_cfg="$SKILL_DIR/tools/.depcruise.cjs"
    scan_abs="$(cd "$SCAN_ROOT" && pwd)"
    # `timeout` is GNU; macOS ships `gtimeout` only when coreutils is installed.
    # Fall through to a no-timeout invocation if neither is present.
    dc_timeout=""
    if command -v timeout >/dev/null 2>&1; then dc_timeout="timeout 60"
    elif command -v gtimeout >/dev/null 2>&1; then dc_timeout="gtimeout 60"
    fi
    echo "[delegated] $dc_timeout npx --no-install depcruise --output-type json --config $dc_cfg $scan_abs (cwd=$dc_cwd)" 1>&2
    dc_start=$(date +%s)
    set +e
    dc_out=$(cd "$dc_cwd" && $dc_timeout npx --no-install depcruise \
      --output-type json --config "$dc_cfg" "$scan_abs" 2>/tmp/depcruise.err)
    dc_rc=$?
    set -e
    dc_end=$(date +%s)
    echo "[delegated] duration: $((dc_end-dc_start))s rc=$dc_rc" 1>&2
    # depcruise rc: 0=clean, non-zero=violations or genuine error. We treat
    # a non-zero rc with NO stdout as an error (capture in tools_errored).
    if [ "$dc_rc" -ne 0 ] && [ -z "$dc_out" ]; then
      dc_err_excerpt=$(head -c 200 /tmp/depcruise.err 2>/dev/null || true)
      TOOLS_ERRORED_JSON=$(echo "$TOOLS_ERRORED_JSON" | jq \
        --arg tool "dependency-cruiser" \
        --arg rc "$dc_rc" \
        --arg err "$dc_err_excerpt" \
        '. + [{tool: $tool, exit_code: ($rc|tonumber), stderr: $err}]')
      echo "[warn] dependency-cruiser exited rc=$dc_rc with no output; recorded to tools_errored (FR-32)" 1>&2
    fi
    if [ -n "$dc_out" ]; then
      depcruise_findings=$(echo "$dc_out" | jq '[.summary.violations[] | {
        rule_id: .rule.name,
        file: (.from // "<unknown>"),
        line: 1,
        severity: (if .rule.severity == "error" then "block"
                   elif .rule.severity == "warn" then "warn"
                   else "info" end),
        message: (.comment // (.rule.name + " — see principles.yaml")),
        source_citation: ("principles.yaml#" + .rule.name),
        suppressed_by: null
      }]')
    fi
  else
    echo "[warn] dependency-cruiser not available; skipping TS L2 declarative checks (FR-32)" 1>&2
    TOOLS_SKIPPED+=("dependency-cruiser")
  fi
fi

# Merge depcruise findings into the unified findings array.
findings_json=$(jq -n \
  --argjson a "$findings_json" \
  --argjson b "$depcruise_findings" \
  '$a + $b')

# ── L2 delegated tool: ruff (T10, FR-31/32/33) ───────────────────────────────
# Runs only when stacks_detected includes "py". Graceful-degrade per FR-32:
# missing `ruff` on PATH → tools_skipped += "ruff", findings=[].
# Invocation: `ruff check --output-format=json --quiet --select=TID252,F401,F403,F405,B006,C901,PLR0911,PLR0912,PLR0913,PLR0915,PLR2004,ARG001,ARG002 $SCAN_ROOT`
# from within $SCAN_ROOT so a project's own pyproject (e.g. ban-relative-imports
# setting for TID252) is honoured. `--quiet` suppresses the trailing status
# line that ruff 0.15+ otherwise prints to stdout (would corrupt JSON parse).
# Code mapping per principles.yaml: TID252→PY001, F401→PY002,
# F403/F405→PY003, B006→PY004, C901→PY005,
# PLR0911/PLR0912/PLR0913/PLR0915→PY006, PLR2004→PY007, ARG001/ARG002→PY008.
ruff_findings='[]'
if echo ",$STACKS," | grep -q ',py,'; then
  echo "[delegated] ruff: check available" 1>&2
  if command -v ruff >/dev/null 2>&1 && ruff --version >/dev/null 2>&1; then
    rf_timeout=""
    if command -v timeout >/dev/null 2>&1; then rf_timeout="timeout 60"
    elif command -v gtimeout >/dev/null 2>&1; then rf_timeout="gtimeout 60"
    fi
    scan_abs="$(cd "$SCAN_ROOT" && pwd)"
    echo "[delegated] $rf_timeout ruff check --output-format=json --quiet --select=TID252,F401,F403,F405,B006,C901,PLR0911,PLR0912,PLR0913,PLR0915,PLR2004,ARG001,ARG002 $scan_abs" 1>&2
    rf_start=$(date +%s)
    set +e
    rf_out=$(cd "$SCAN_ROOT" && $rf_timeout ruff check \
      --output-format=json --quiet \
      --select=TID252,F401,F403,F405,B006,C901,PLR0911,PLR0912,PLR0913,PLR0915,PLR2004,ARG001,ARG002 \
      "$scan_abs" 2>/tmp/ruff.err)
    rf_rc=$?
    set -e
    rf_end=$(date +%s)
    echo "[delegated] duration: $((rf_end-rf_start))s rc=$rf_rc" 1>&2
    # ruff rc: 0=no violations, 1=violations found (expected), 2=error.
    if [ "$rf_rc" -ge 2 ] && [ -z "$rf_out" ]; then
      rf_err_excerpt=$(head -c 200 /tmp/ruff.err 2>/dev/null || true)
      TOOLS_ERRORED_JSON=$(echo "$TOOLS_ERRORED_JSON" | jq \
        --arg tool "ruff" \
        --arg rc "$rf_rc" \
        --arg err "$rf_err_excerpt" \
        '. + [{tool: $tool, exit_code: ($rc|tonumber), stderr: $err}]')
      echo "[warn] ruff exited rc=$rf_rc with no output; recorded to tools_errored (FR-32)" 1>&2
    fi
    if [ -n "$rf_out" ]; then
      ruff_findings=$(echo "$rf_out" | jq --arg root "$scan_abs" '[.[] | {
        rule_id: (
          if .code == "TID252" then "PY001"
          elif .code == "F401" then "PY002"
          elif .code == "F403" or .code == "F405" then "PY003"
          elif .code == "B006" then "PY004"
          elif .code == "C901" then "PY005"
          elif .code == "PLR0911" or .code == "PLR0912" or .code == "PLR0913" or .code == "PLR0915" then "PY006"
          elif .code == "PLR2004" then "PY007"
          elif .code == "ARG001" or .code == "ARG002" then "PY008"
          else ("PY-" + .code) end
        ),
        file: (.filename | sub("^" + $root + "/?"; "")),
        line: (.location.row // 1),
        severity: (if .severity == "error" then "warn" else "info" end),
        message: .message,
        source_citation: (
          if .code == "TID252" then "principles.yaml#PY001"
          elif .code == "F401" then "principles.yaml#PY002"
          elif .code == "F403" or .code == "F405" then "principles.yaml#PY003"
          elif .code == "B006" then "principles.yaml#PY004"
          elif .code == "C901" then "principles.yaml#PY005"
          elif .code == "PLR0911" or .code == "PLR0912" or .code == "PLR0913" or .code == "PLR0915" then "principles.yaml#PY006"
          elif .code == "PLR2004" then "principles.yaml#PY007"
          elif .code == "ARG001" or .code == "ARG002" then "principles.yaml#PY008"
          else ("ruff#" + .code) end
        ),
        suppressed_by: null
      }]')
    fi
  else
    echo "[warn] ruff not available; skipping Py L2 declarative checks (FR-32)" 1>&2
    TOOLS_SKIPPED+=("ruff")
  fi
fi

# Merge ruff findings.
findings_json=$(jq -n \
  --argjson a "$findings_json" \
  --argjson b "$ruff_findings" \
  '$a + $b')

# ── L2 delegated tool: cycle-py (PY009) ──────────────────────────────────────
cycle_py_findings='[]'
if echo ",$STACKS," | grep -q ',py,'; then
  if command -v python3 >/dev/null 2>&1 && [ -f "$SKILL_DIR/tools/cycle-py.py" ]; then
    set +e
    cycles_json=$(python3 "$SKILL_DIR/tools/cycle-py.py" "$SCAN_ROOT" 2>/tmp/cycle-py.err)
    cp_rc=$?
    set -e
    if [ "$cp_rc" -ne 0 ] || [ -z "$cycles_json" ]; then
      cycles_json='[]'
    fi
    cycle_py_findings=$(CYCLES_JSON="$cycles_json" python3 <<'PY'
import json, os
cycles = json.loads(os.environ["CYCLES_JSON"])
out = []
for c in cycles:
    members = c.get("members", [])
    if not members:
        continue
    chain = members + [members[0]]
    out.append({
        "rule_id": "PY009",
        "severity": "warn",
        "file": members[0],
        "line": 1,
        "message": " -> ".join(chain),
        "source_citation": "principles.yaml#PY009",
        "cross_refs": members[1:],
        "suppressed_by": None,
    })
print(json.dumps(out))
PY
)
  else
    cycle_py_findings=$(jq -n '[{
      rule_id: "PY009",
      severity: "info",
      message: "cycle-py probe failed — Python 3 or tools/cycle-py.py unavailable",
      file: null,
      line: null,
      source_citation: "principles.yaml#PY009",
      suppressed_by: null
    }]')
  fi
fi

findings_json=$(jq -n \
  --argjson a "$findings_json" \
  --argjson b "$cycle_py_findings" \
  '$a + $b')

if echo ",$STACKS," | grep -q ',py,'; then
  if command -v python3 >/dev/null 2>&1; then
    set +e
    module_data=$(SCAN_ROOT="$SCAN_ROOT" python3 <<'PY'
import ast, json, os

scan_root = os.environ["SCAN_ROOT"]

files = []
for dirpath, dirnames, filenames in os.walk(scan_root):
    dirnames[:] = [d for d in dirnames if d != ".git"]
    for n in filenames:
        if n.endswith(".py"):
            files.append(os.path.relpath(os.path.join(dirpath, n), scan_root).replace("\\", "/"))

def rel_to_module(rel):
    parts = rel.split("/")
    if parts[-1] == "__init__.py":
        parts = parts[:-1]
    else:
        parts[-1] = parts[-1][:-3]
    return ".".join(parts)

def rel_to_package(rel):
    parts = rel.split("/")
    if parts[-1] == "__init__.py":
        parts = parts[:-1]
    else:
        parts = parts[:-1]
    return ".".join(parts)

mod_to_file = {}
for rel in files:
    mod_to_file[rel_to_module(rel)] = rel
known_modules = set(mod_to_file.keys())

public_symbols = {}
loc = {}
adj = {m: set() for m in known_modules}

for rel in files:
    abs_path = os.path.join(scan_root, rel)
    try:
        with open(abs_path, encoding="utf-8") as fh:
            src = fh.read()
        tree = ast.parse(src, filename=abs_path)
    except (SyntaxError, ValueError, OSError):
        public_symbols[rel_to_module(rel)] = 0
        loc[rel_to_module(rel)] = 0
        continue

    this_mod = rel_to_module(rel)
    this_pkg = rel_to_package(rel)

    pub = 0
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            if not node.name.startswith("_"):
                pub += 1
    public_symbols[this_mod] = pub
    loc[this_mod] = sum(1 for ln in src.splitlines() if ln.strip())

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name in known_modules and alias.name != this_mod:
                    adj[this_mod].add(alias.name)
        elif isinstance(node, ast.ImportFrom):
            mod = node.module or ""
            level = node.level or 0
            if level > 0:
                pkg_parts = this_pkg.split(".") if this_pkg else []
                if level - 1 > len(pkg_parts):
                    continue
                base = pkg_parts[: len(pkg_parts) - (level - 1)]
                target_parts = base + ([mod] if mod else [])
                target = ".".join(p for p in target_parts if p)
            else:
                target = mod
            if not target:
                continue
            if target in known_modules and target != this_mod:
                adj[this_mod].add(target)
            for alias in node.names:
                sub = f"{target}.{alias.name}" if target else alias.name
                if sub in known_modules and sub != this_mod:
                    adj[this_mod].add(sub)

inbound = {m: 0 for m in known_modules}
for src_mod, targets in adj.items():
    for t in targets:
        if t != src_mod:
            inbound[t] += 1

metrics = []
for mod, rel in mod_to_file.items():
    metrics.append({
        "path": rel,
        "fanin": inbound[mod],
        "fanout": len(adj[mod]),
        "public_symbols": public_symbols.get(mod, 0),
        "loc": loc.get(mod, 0),
    })
metrics.sort(key=lambda e: e["path"])

scored = []
for e in metrics:
    score = (e["fanin"] + 1) * (e["public_symbols"] + 1) - 1
    scored.append({
        "path": e["path"],
        "fanin": e["fanin"],
        "fanout": e["fanout"],
        "public_symbols": e["public_symbols"],
        "loc": e["loc"],
        "score": score,
    })
scored.sort(key=lambda e: (-e["score"], e["path"]))
candidates = scored[:10]

print(json.dumps({"module_metrics": metrics, "godmodule_candidates": candidates}))
PY
)
    md_rc=$?
    set -e
    if [ "$md_rc" -eq 0 ]; then
      module_metrics_json=$(echo "$module_data" | jq '.module_metrics')
      godmodule_candidates_json=$(echo "$module_data" | jq '.godmodule_candidates')
    fi
  fi
fi

# Build tools_skipped JSON array (empty when no tool was skipped).
if [ "${#TOOLS_SKIPPED[@]}" -gt 0 ]; then
  tools_skipped_json=$(printf '%s\n' "${TOOLS_SKIPPED[@]}" | jq -R . | jq -s .)
fi
fi  # end WARN_MODE guard for L2 delegated tools


# ── Exemption reconciliation (T15, FR-65/66) ─────────────────────────────────
# For each exemption row in project principles.yaml, locate the corresponding
# ADR file under <scan-root>/<adr_path>/ and classify into three buckets:
#   - applied:  exemption row + ADR file whose ## Suppresses block lists the
#               same {rule, file[, line]} → finding suppressed silently
#   - orphan:   exemption row but no matching ADR file (or ADR missing the
#               Suppresses entry) → finding still suppressed (user-explicit
#               intent), but warn surfaced + counted (FR-65 / E10)
#   - expired:  exemption row whose `expires:` date is < today → treated as
#               not-present; finding surfaces (FR-66 / E11); stderr summary
#               enumerates the count
# Informational ADRs (Suppresses block, no matching exemption row) emit an
# info-level note; the finding still surfaces (ADR alone is documentation —
# the principles.yaml row is what mutes).
#
# Runs BEFORE ADR write so already-exempted findings do not spawn new ADRs.
ADR_PATH_REL_FOR_RECONCILE="$(echo "$LOADER_JSON" | jq -r '.config.adr_path')"
ADR_PATH_REL_FOR_RECONCILE="${ADR_PATH_REL_FOR_RECONCILE%/}"
RECONCILE_ADR_DIR="$SCAN_ROOT/$ADR_PATH_REL_FOR_RECONCILE"
exemptions_in_json="$(echo "$LOADER_JSON" | jq '.exemptions')"
today_iso="$(date -u +%Y-%m-%d)"

reconcile_json=$(
  EXEMPTIONS_JSON="$exemptions_in_json" \
  FINDINGS_JSON="$findings_json" \
  RECONCILE_ADR_DIR="$RECONCILE_ADR_DIR" \
  TODAY_ISO="$today_iso" \
  python3 <<'PY'
import json, os, re, sys
from datetime import date

exemptions_in = json.loads(os.environ["EXEMPTIONS_JSON"])
findings_in = json.loads(os.environ["FINDINGS_JSON"])
adr_dir = os.environ["RECONCILE_ADR_DIR"]
today = date.fromisoformat(os.environ["TODAY_ISO"])

# Scan ADR_DIR for ADR files and parse their ## Suppresses blocks.
# adr_records: { "ADR-NNNN": { "name": <filename>, "suppresses": [{rule,file,line}, ...] } }
adr_records = {}
if os.path.isdir(adr_dir):
    for name in sorted(os.listdir(adr_dir)):
        m = re.match(r"^(ADR-\d{4})-.*\.md$", name)
        if not m:
            continue
        adr_id = m.group(1)
        path = os.path.join(adr_dir, name)
        try:
            with open(path) as f:
                content = f.read()
        except OSError:
            continue
        # Take everything after the LAST `## Suppresses` heading to EOF; per
        # adr-template.md the block is the trailing section.
        sup_match = re.search(
            r"^##\s*Suppresses\s*\n(.+?)(?=^##\s|\Z)",
            content, re.MULTILINE | re.DOTALL,
        )
        suppresses = []
        if sup_match:
            block = sup_match.group(1)
            # Match each "- rule: X\n  file: Y\n  line: Z" triple.
            for item in re.finditer(
                r"-\s*rule:\s*(\S+)\s*\n\s*file:\s*(\S+)\s*\n\s*line:\s*(\S+)",
                block,
            ):
                suppresses.append({
                    "rule": item.group(1),
                    "file": item.group(2),
                    "line": item.group(3),
                })
        adr_records[adr_id] = {"name": name, "suppresses": suppresses}

def is_expired(row):
    raw = row.get("expires")
    if not raw:
        return False
    try:
        return date.fromisoformat(str(raw)) < today
    except ValueError:
        return False

# Classify exemption rows. Build a suppress set for filtering findings.
rows_out = []
applied = orphan = expired = 0
# suppress_set: { (rule, file, line_or_None) }
suppress_set = set()

for row in exemptions_in:
    annotated = dict(row)
    rid = row.get("rule")
    rfile = row.get("file")
    rline = row.get("line")
    rline_str = str(rline) if rline is not None else None

    if is_expired(row):
        annotated["status"] = "expired"
        expired += 1
        rows_out.append(annotated)
        continue

    adr_ref = row.get("adr")
    adr = adr_records.get(adr_ref) if adr_ref else None
    matched = False
    if adr:
        for s in adr["suppresses"]:
            if s["rule"] == rid and s["file"] == rfile:
                if rline_str is None or str(s["line"]) == rline_str:
                    matched = True
                    break
    if matched:
        annotated["status"] = "applied"
        applied += 1
    else:
        annotated["status"] = "orphan"
        orphan += 1
        print(
            "warn: orphan exemption: {} {}{} (no matching ADR at {}/{})".format(
                rid, rfile,
                ":" + rline_str if rline_str else "",
                adr_dir.rstrip("/"),
                (adr_ref or "<no adr field>") + "-*.md",
            ),
            file=sys.stderr,
        )

    # Both applied and orphan suppress the finding.
    suppress_set.add((rid, rfile, rline_str))
    rows_out.append(annotated)

# Filter findings: drop those matching any suppress key.
filtered = []
suppressed_by_log = []
for f in findings_in:
    fid = f.get("rule_id")
    ffile = f.get("file")
    fline_str = str(f.get("line")) if f.get("line") is not None else None
    hit = False
    for (rid, rfile, rline_str) in suppress_set:
        if rid == fid and rfile == ffile:
            if rline_str is None or rline_str == fline_str:
                hit = True
                break
    if hit:
        suppressed_by_log.append({"rule_id": fid, "file": ffile, "line": fline_str})
    else:
        filtered.append(f)

# Informational ADRs: ## Suppresses entries that no non-expired exemption row claims.
active_keys = set()
for row in exemptions_in:
    if is_expired(row):
        continue
    active_keys.add((row.get("rule"), row.get("file")))

informational = []
for adr_id in sorted(adr_records.keys()):
    for s in adr_records[adr_id]["suppresses"]:
        if (s["rule"], s["file"]) not in active_keys:
            informational.append(
                "{} documents suppression but no exemption row in principles.yaml".format(adr_id)
            )

result = {
    "exemptions_summary": {
        "applied": applied,
        "orphan": orphan,
        "expired": expired,
        "informational": informational,
        "rows": rows_out,
    },
    "filtered_findings": filtered,
    "expired_count": expired,
}
print(json.dumps(result))
PY
)

# The python block emits warn lines + final JSON on stdout. The JSON is the
# LAST line; everything before it is the warn stream (already on stderr).
exemptions_summary_json=$(echo "$reconcile_json" | jq '.exemptions_summary')
# T3 (FR-30/31) — merge idiomatic AST-walker exemptions into the summary.
# Surfaces in final report as exemptions.idiomatic[]. U004 suppression
# against these ranges lands in T4.
exemptions_summary_json=$(jq -n \
  --argjson s "$exemptions_summary_json" \
  --argjson i "$idiomatic_exemptions_json" \
  '$s + {idiomatic: $i}')
findings_json=$(echo "$reconcile_json" | jq '.filtered_findings')
expired_count=$(echo "$reconcile_json" | jq '.expired_count')

if [ "$expired_count" -gt 0 ]; then
  echo "note: $expired_count exemption(s) expired; suppression lifted. Re-affirm via ADR or remove the row." >&2
fi

# ── ADR write (T13, FR-60/61/62) ─────────────────────────────────────────────
# For each block-severity finding (post-effective_severity rewrite), stamp a
# Nygard ADR at <scan-root>/<adr_path>/ADR-NNNN-<kebab-title>.md. Numbering is
# monotonic across runs (highest existing +1) and never recycles. Writes are
# atomic (tmp + mv). No cap yet — T14 adds the 5/run ceiling and --no-adr.
ADR_PATH_REL="$(echo "$LOADER_JSON" | jq -r '.config.adr_path')"
# Strip any trailing slash so the joined path stays clean.
ADR_PATH_REL="${ADR_PATH_REL%/}"
ADR_DIR="$SCAN_ROOT/$ADR_PATH_REL"
ADR_TEMPLATE="$SKILL_DIR/reference/adr-template.md"
ADR_CAP=5
adrs_written_json='[]'
adrs_truncated_json='[]'

# Sort block findings per FR-63: severity desc (block only here, so moot) →
# rule_id asc → file asc → line asc. Take top ADR_CAP for ADR write; the
# remainder lands in adrs_truncated[].
block_findings_json=$(jq -n --argjson f "$findings_json" --argjson loader "$LOADER_JSON" '
  $f
  | map(. + { severity: ($loader.effective_severity[.rule_id] // .severity) })
  | map(select(.severity == "block"))
  | sort_by(.rule_id, .file, .line)
')
block_count=$(echo "$block_findings_json" | jq 'length')

# Split into to-write and to-truncate slices (only when at/over cap).
# --no-adr (FR-67) short-circuits the split before the stderr note fires:
# no "promoted vs not promoted" distinction when nothing is promoted at all.
# Findings still emit normally; adrs_truncated stays [].
if [ "$NO_ADR" -eq 1 ]; then
  to_write_json='[]'
  adrs_truncated_json='[]'
else
  to_write_json=$(echo "$block_findings_json" | jq --argjson cap "$ADR_CAP" '.[:$cap]')
  if [ "$block_count" -gt "$ADR_CAP" ]; then
    adrs_truncated_json=$(echo "$block_findings_json" | jq --argjson cap "$ADR_CAP" '
      .[$cap:] | map({rule_id, file, line})
    ')
    trunc_count=$((block_count - ADR_CAP))
    echo "note: $trunc_count additional block findings not promoted to ADR (cap $ADR_CAP/run). See report.adrs_truncated." >&2
  fi
fi

to_write_count=$(echo "$to_write_json" | jq 'length')

if [ "$to_write_count" -gt 0 ] && [ -f "$ADR_TEMPLATE" ]; then
  mkdir -p "$ADR_DIR"
  highest=0
  shopt -s nullglob
  for f in "$ADR_DIR"/ADR-[0-9][0-9][0-9][0-9]-*.md; do
    base=$(basename "$f")
    num=$(echo "$base" | sed -nE 's/^ADR-([0-9]{4})-.*\.md$/\1/p')
    if [ -n "$num" ]; then
      n=$((10#$num))
      [ "$n" -gt "$highest" ] && highest=$n
    fi
  done
  shopt -u nullglob

  TODAY="$(date -u +%Y-%m-%d)"
  template_content=$(cat "$ADR_TEMPLATE")

  i=0
  while [ "$i" -lt "$to_write_count" ]; do
    rule_id=$(echo "$to_write_json" | jq -r ".[$i].rule_id")
    file_path=$(echo "$to_write_json" | jq -r ".[$i].file")
    line_no=$(echo "$to_write_json" | jq -r ".[$i].line")
    msg=$(echo "$to_write_json" | jq -r ".[$i].message // .[$i].rule_id")
    severity=$(echo "$to_write_json" | jq -r ".[$i].severity")

    title_slug=$(printf '%s' "$msg" | tr '[:upper:]' '[:lower:]' \
      | sed 's/[^a-z0-9]/-/g; s/--*/-/g; s/^-//; s/-$//' \
      | cut -c1-60 | sed 's/-$//')
    [ -z "$title_slug" ] && title_slug="$(printf '%s' "$rule_id" | tr '[:upper:]' '[:lower:]')-finding"

    # Collision-safe monotonic increment (E14: scan picks +1; loop guards
    # against a same-run duplicate when two block findings produce the same
    # title_slug or NNNN somehow gets pre-occupied).
    while :; do
      highest=$((highest + 1))
      nnnn=$(printf '%04d' "$highest")
      target="$ADR_DIR/ADR-$nnnn-$title_slug.md"
      [ -e "$target" ] || break
    done

    body="$template_content"
    body="${body//\{NNNN\}/$nnnn}"
    body="${body//\{title\}/$msg}"
    body="${body//\{date\}/$TODAY}"
    body="${body//\{rule_id\}/$rule_id}"
    body="${body//\{severity\}/$severity}"
    body="${body//\{file\}/$file_path}"
    body="${body//\{line\}/$line_no}"

    tmp="$ADR_DIR/.tmp-$$-$nnnn"
    printf '%s\n' "$body" > "$tmp"
    mv "$tmp" "$target"

    rel="$ADR_PATH_REL/ADR-$nnnn-$title_slug.md"
    adrs_written_json=$(echo "$adrs_written_json" | jq \
      --arg path "$rel" --arg rid "$rule_id" --arg file "$file_path" \
      --arg nnnn "$nnnn" --arg title "$title_slug" \
      '. + [{nnnn: $nnnn, path: $path, rule_id: $rid, file: $file, title: $title}]')

    i=$((i + 1))
  done
fi

# ── Frontend declarative coverage (T12, FR-50/51/52) ─────────────────────────
# Coverage = (TS/JS frontend files) / (TS/JS + Vue SFC files), 2-decimal.
# Vue files run only L1 grep rules (declarative L2 via dep-cruiser doesn't
# cover .vue's <script> blocks today — surfaced as the F3 gap). The field is
# emitted only when the denominator is non-zero (i.e. a frontend tree); on
# pure-Py or empty trees the field is omitted (null), keeping back-compat.
# When coverage < 1.0, an F3 stderr note flags the gap to the operator.
fde_json='null'
fde_num=$(echo "$LOADER_JSON" | jq '.scanned.by_ext as $e
  | (($e[".ts"]//0) + ($e[".tsx"]//0) + ($e[".js"]//0)
     + ($e[".jsx"]//0) + ($e[".mjs"]//0) + ($e[".cjs"]//0))')
fde_den=$(echo "$LOADER_JSON" | jq '.scanned.by_ext as $e
  | (($e[".ts"]//0) + ($e[".tsx"]//0) + ($e[".js"]//0)
     + ($e[".jsx"]//0) + ($e[".mjs"]//0) + ($e[".cjs"]//0)
     + ($e[".vue"]//0))')
if [ "$fde_den" -gt 0 ]; then
  fde_json=$(jq -n --argjson n "$fde_num" --argjson d "$fde_den" \
    '($n / $d * 100 | round / 100)')
  # F3 stderr note: emit only when coverage is strictly below 1.0.
  fde_lt_one=$(jq -n --argjson c "$fde_json" '$c < 1.0')
  if [ "$fde_lt_one" = "true" ]; then
    vue_count=$(echo "$LOADER_JSON" | jq '.scanned.by_ext[".vue"]//0')
    echo "[F3] frontend_declarative_coverage=$fde_json — $vue_count .vue file(s) get L1-semantic treatment only (no L2 dep-cruiser pipeline)" 1>&2
  fi
fi

# Filter runs BEFORE risk-score computation so we don't spawn per-file
# git subprocesses for findings we're about to drop.
if [ -n "$SINCE" ]; then
  # `.git` is a directory in a normal repo and a file in a git-worktree checkout;
  # either counts as "scan root is its own repo" for `--since`.
  if [ ! -e "$SCAN_ROOT/.git" ]; then
    echo "scan root is not a git repo; --since unavailable" >&2
    exit 64
  fi
  if ! since_files=$( cd "$SCAN_ROOT" && git diff --name-only "$SINCE"...HEAD 2>&1 ); then
    echo "--since ref unknown or invalid: $since_files" >&2
    exit 64
  fi
  findings_json=$(SINCE_FILES="$since_files" FINDINGS_JSON="$findings_json" python3 <<'PY'
import json, os
files = set(line for line in os.environ["SINCE_FILES"].splitlines() if line)
findings = json.loads(os.environ["FINDINGS_JSON"])
print(json.dumps([f for f in findings if f.get("file") in files]))
PY
)
fi

CHURN_WINDOW_DAYS=$(echo "$LOADER_JSON" | jq -r '.config.risk_score.churn_window_days // 90')

findings_with_risk_json=$(FINDINGS_JSON="$findings_json" \
  MODULE_METRICS_JSON="$module_metrics_json" \
  EFFECTIVE_SEVERITY_JSON="$(echo "$LOADER_JSON" | jq -c '.effective_severity')" \
  SCAN_ROOT_ENV="$SCAN_ROOT" \
  CHURN_WINDOW_DAYS="$CHURN_WINDOW_DAYS" \
  python3 <<'PY'
import json, os, subprocess
findings = json.loads(os.environ["FINDINGS_JSON"])
module_metrics = json.loads(os.environ["MODULE_METRICS_JSON"])
eff_sev = json.loads(os.environ["EFFECTIVE_SEVERITY_JSON"])
scan_root = os.environ["SCAN_ROOT_ENV"]
N = int(os.environ.get("CHURN_WINDOW_DAYS", "90"))

sev_to_disp = {"block": "must_fix", "warn": "should_fix", "info": "wont_fix"}
disp_weight = {"must_fix": 1000, "should_fix": 100, "wont_fix": 1}

try:
    r = subprocess.run(["git", "rev-parse", "--git-dir"], cwd=scan_root,
                       capture_output=True, text=True, check=False)
    is_git = (r.returncode == 0)
except Exception:
    is_git = False

fanin_by_path = {m["path"]: m.get("fanin", 0) for m in module_metrics}
churn_cache = {}

def churn_for(file):
    if not is_git or not file:
        return 0
    if file in churn_cache:
        return churn_cache[file]
    try:
        cp = subprocess.run(
            ["git", "rev-list", "--count", f"--since={N} days ago", "HEAD", "--", file],
            cwd=scan_root, capture_output=True, text=True, check=False)
        n = int((cp.stdout or "0").strip() or "0") if cp.returncode == 0 else 0
    except Exception:
        n = 0
    churn_cache[file] = n
    return n

out = []
for f in findings:
    rid = f.get("rule_id")
    sev = eff_sev.get(rid, f.get("severity"))
    disp = sev_to_disp.get(sev, sev) if sev else "wont_fix"
    weight = disp_weight.get(disp, 1)
    file = f.get("file")
    c = min(50, churn_for(file))
    coup = min(50, 5 * fanin_by_path.get(file, 0))
    cc = min(100, c + coup)
    g = dict(f)
    g.pop("severity", None)
    g["disposition"] = disp
    g["risk_score"] = weight + cc
    out.append(g)

print(json.dumps(out))
PY
)

END="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
END_EPOCH="$(date -u +%s)"
DURATION_S=$((END_EPOCH - START_EPOCH))

# Build the final report JSON. Sort findings per FR-73: severity desc (block
# < warn < info via 0/1/2 numeric key), then rule_id asc, file asc, line asc.
REPORT_JSON=$(jq -n \
  --argjson f "$findings_with_risk_json" \
  --argjson loader "$LOADER_JSON" \
  --argjson tools_skipped "$tools_skipped_json" \
  --argjson tools_errored "$TOOLS_ERRORED_JSON" \
  --argjson fde "$fde_json" \
  --argjson adrs_written "$adrs_written_json" \
  --argjson adrs_truncated "$adrs_truncated_json" \
  --argjson exemptions_summary "$exemptions_summary_json" \
  --argjson cycles "$cycles_json" \
  --argjson module_metrics "$module_metrics_json" \
  --argjson godmodule_candidates "$godmodule_candidates_json" \
  --arg start "$START" \
  --arg end "$END" \
  --argjson duration_s "$DURATION_S" \
  --arg root "$SCAN_ROOT" \
  '{
    schema_version: 2,
    run: { started_at: $start, finished_at: $end, duration_s: $duration_s },
    scan_root: $root,
    rules_loaded: {
      tier_1: $loader.tier_1,
      tier_2: ($loader.tier_2_ts + $loader.tier_2_py),
      tier_3: $loader.tier_3,
      total: $loader.total_loaded
    },
    declarative_delegated_pct: $loader.declarative_delegated_pct,
    l3_present: $loader.l3_present,
    stacks_detected: $loader.stacks_detected,
    monorepo_detected: ($loader.monorepo_detected // []),
    config: $loader.config,
    rule_overrides: $loader.rule_overrides,
    exemptions: $exemptions_summary,
    scanned: ($loader.scanned | del(.files_for_rules)),
    tools_skipped: $tools_skipped,
    tools_errored: $tools_errored,
    frontend_declarative_coverage: $fde,
    adrs_written: $adrs_written,
    adrs_truncated: $adrs_truncated,
    cycles: $cycles,
    module_metrics: $module_metrics,
    godmodule_candidates: $godmodule_candidates,
    findings: ($f
      | sort_by({must_fix:0, should_fix:1, wont_fix:2}[.disposition] // 9, (-.risk_score), .file, .line))
  }')

# T1 — emit HTML+MD+JSON triplet to {docs_path}/architecture/.
# Stdout stays empty (FR-66 / D17); stderr emits a single-line summary.
REPORT_JSON_FOR_TRIPLET="$REPORT_JSON" \
SKILL_DIR_ENV="$SKILL_DIR" \
SCAN_ROOT_ENV="$SCAN_ROOT" \
LABEL="${LABEL:-}" \
ARCH_DOCS_PATH="${ARCH_DOCS_PATH:-}" \
python3 <<'PY' 1>&2
import json, os, sys, shutil, subprocess, pathlib, datetime, re, html

report = json.loads(os.environ["REPORT_JSON_FOR_TRIPLET"])
skill_dir = pathlib.Path(os.environ["SKILL_DIR_ENV"])
scan_root_str = os.environ["SCAN_ROOT_ENV"]
scan_root = pathlib.Path(scan_root_str).resolve()
substrate_dir = skill_dir.parent / "_shared" / "html-authoring"
substrate_assets = substrate_dir / "assets"

template_html = ""
template_path = substrate_dir / "template.html"
if template_path.is_file():
    template_html = template_path.read_text()
else:
    # Minimal inline template fallback (substrate missing → still emit a file).
    template_html = (
        "<!DOCTYPE html><html><head><meta charset=\"utf-8\">"
        "<title>{{title}}</title></head><body><main>{{content}}</main></body></html>"
    )

# ARCH_DOCS_PATH wins over settings.yaml so fan-out children land under the
# parent's resolved docs_path; expanduser+resolve in case a future direct
# caller sets a relative or ~-relative path.
_arch_docs_env = os.environ.get("ARCH_DOCS_PATH", "").strip()
if _arch_docs_env:
    docs_path = pathlib.Path(_arch_docs_env).expanduser().resolve()
else:
    docs_path = pathlib.Path("docs/pmos")
    settings_path = pathlib.Path(".pmos/settings.yaml")
    if settings_path.is_file():
        try:
            import yaml
            s = yaml.safe_load(settings_path.read_text()) or {}
            if s.get("docs_path"):
                docs_path = pathlib.Path(str(s["docs_path"]).rstrip("/"))
        except Exception:
            pass

arch_dir = docs_path / "architecture"
arch_dir.mkdir(parents=True, exist_ok=True)

# Plugin version for cache-bust.
plugin_version = "0"
plugin_json = skill_dir.parent.parent / ".claude-plugin" / "plugin.json"
if plugin_json.is_file():
    try:
        plugin_version = json.loads(plugin_json.read_text()).get("version", "0")
    except Exception:
        pass

date_s = datetime.date.today().isoformat()
_label_env = os.environ.get("LABEL", "").strip()
slug = _label_env or (pathlib.Path(os.getcwd()).name or "audit")
slug = re.sub(r"[^A-Za-z0-9._-]", "-", slug)

# FR-60 — same-day collision: append -2, -3, ...
def stem_for(idx):
    return f"{date_s}_{slug}" if idx == 0 else f"{date_s}_{slug}-{idx + 1}"

idx = 0
while (arch_dir / f"{stem_for(idx)}.html").exists():
    idx += 1
stem = stem_for(idx)
html_path = arch_dir / f"{stem}.html"
md_path = arch_dir / f"{stem}.md"
json_path = arch_dir / f"{stem}.json"
sections_path = arch_dir / f"{stem}.sections.json"

# Copy substrate assets idempotently (cp -n equivalent).
assets_dst = arch_dir / "assets"
assets_dst.mkdir(exist_ok=True)
if substrate_assets.is_dir():
    for src in substrate_assets.iterdir():
        if not src.is_file():
            continue
        dst = assets_dst / src.name
        if not dst.exists():
            shutil.copy2(src, dst)

findings = report.get("findings") or []
by_disp = {"must_fix": [], "should_fix": [], "wont_fix": []}
for f in findings:
    by_disp.setdefault(f.get("disposition", "wont_fix"), []).append(f)

def render_section(title, items, heading_id):
    head = f'<h2 id="{heading_id}">{html.escape(title)} ({len(items)})</h2>'
    if not items:
        return f"{head}\n<p><em>none</em></p>"
    rows = []
    for it in items:
        rows.append(
            f"<tr><td><code>{html.escape(it.get('rule_id',''))}</code></td>"
            f"<td><code>{html.escape(str(it.get('file','')))}:{it.get('line','')}</code></td>"
            f"<td>{html.escape(str(it.get('message','')))}</td></tr>"
        )
    return (
        f"{head}\n"
        '<table><thead><tr><th>Rule</th><th>Location</th><th>Message</th></tr></thead>\n'
        f"<tbody>\n{chr(10).join(rows)}\n</tbody></table>"
    )

scanned = report.get("scanned") or {}
total_files = scanned.get("total", 0)
stacks = ", ".join(report.get("stacks_detected") or []) or "none"

# T4 (FR-32) — Won't Fix > Idiomatic exemptions sub-section. Renders one
# row per exemptions.idiomatic[] entry (framework | file | exempt_ranges
# count). Suppressed when the list is empty so empty-fixtures' HTML byte
# output stays unchanged.
idiomatic_list = ((report.get("exemptions") or {}).get("idiomatic") or [])
idiomatic_html = ""
if idiomatic_list:
    irows = []
    for e in idiomatic_list:
        irows.append(
            f"<tr><td><code>{html.escape(str(e.get('framework','')))}</code></td>"
            f"<td><code>{html.escape(str(e.get('file','')))}</code></td>"
            f"<td>{len(e.get('exempt_ranges') or [])}</td></tr>"
        )
    idiomatic_html = (
        '<h3 id="idiomatic-exemptions">Idiomatic exemptions</h3>\n'
        '<table><thead><tr><th>Framework</th><th>File</th>'
        '<th>Exempt ranges</th></tr></thead>\n'
        f"<tbody>\n{chr(10).join(irows)}\n</tbody></table>"
    )

godmodule_top5 = (report.get("godmodule_candidates") or [])[:5]
if godmodule_top5:
    grows = []
    for g in godmodule_top5:
        grows.append(
            f"<tr><td><code>{html.escape(str(g.get('path','')))}</code></td>"
            f"<td>{g.get('fanin',0)}</td>"
            f"<td>{g.get('fanout',0)}</td>"
            f"<td>{g.get('public_symbols',0)}</td>"
            f"<td>{g.get('loc',0)}</td></tr>"
        )
    arch_metrics_html = (
        '<h2 id="architecture-metrics">Architecture metrics</h2>\n'
        '<table><thead><tr><th>Path</th><th>fanin</th><th>fanout</th>'
        '<th>public_symbols</th><th>LOC</th></tr></thead>\n'
        f"<tbody>\n{chr(10).join(grows)}\n</tbody></table>"
    )
else:
    arch_metrics_html = (
        '<h2 id="architecture-metrics">Architecture metrics</h2>\n'
        '<p>No Python modules detected.</p>'
    )

content_html = "\n".join([
    render_section("Must Fix", by_disp.get("must_fix", []), "must-fix"),
    render_section("Should Fix", by_disp.get("should_fix", []), "should-fix"),
    render_section("Won't Fix", by_disp.get("wont_fix", []), "wont-fix")
        + (("\n" + idiomatic_html) if idiomatic_html else ""),
    arch_metrics_html,
    '<h2 id="run-metadata">Run metadata</h2>'
    f'<p>scan_root: <code>{html.escape(str(scan_root))}</code> · stacks: {html.escape(stacks)} · '
    f'files scanned: {total_files} · schema_version: 2</p>',
])

asset_prefix = "assets/"
final_html = (template_html
    .replace("{{title}}", f"/architecture audit — {html.escape(slug)}")
    .replace("{{asset_prefix}}", asset_prefix)
    .replace("{{plugin_version}}", str(plugin_version))
    .replace("{{content}}", content_html)
    .replace("{{source_path}}", f"{stem}.html"))

# Guard: every <h2>/<h3> we emit must carry an id= attribute.
for m in re.finditer(r"<(h[23])\b([^>]*)>", final_html):
    if 'id="' not in m.group(2):
        print(f"emit_triplet: missing id on <{m.group(1)}>: {m.group(0)}", file=sys.stderr)
        sys.exit(1)

def atomic_write(path, content):
    tmp = path.with_suffix(path.suffix + f".tmp.{os.getpid()}")
    tmp.write_text(content)
    tmp.rename(path)

# PD5: HTML → MD → JSON order.
atomic_write(html_path, final_html)

bsj = substrate_assets / "build_sections_json.js"
if bsj.is_file():
    try:
        sj = subprocess.check_output(["node", str(bsj), str(html_path)], text=True)
        atomic_write(sections_path, sj)
    except Exception as exc:
        print(f"emit_triplet: sections.json generation failed: {exc}", file=sys.stderr)

h2m = substrate_assets / "html-to-md.js"
md_ok = False
if h2m.is_file():
    try:
        md = subprocess.check_output(["node", str(h2m), str(html_path)], text=True)
        atomic_write(md_path, md)
        md_ok = True
    except Exception as exc:
        print(f"emit_triplet: MD conversion failed ({exc}); writing fallback", file=sys.stderr)
if not md_ok:
    atomic_write(md_path, f"# /architecture audit — {slug}\n\nSee {html_path.name} for the rendered report.\n")

atomic_write(json_path, json.dumps(report, indent=2))

n_must = len(by_disp.get("must_fix", []))
n_should = len(by_disp.get("should_fix", []))
n_wont = len(by_disp.get("wont_fix", []))
print(
    f"Wrote {html_path}: {n_must} Must Fix, {n_should} Should Fix, {n_wont} Won't Fix in {total_files} files",
    file=sys.stderr,
)
PY
