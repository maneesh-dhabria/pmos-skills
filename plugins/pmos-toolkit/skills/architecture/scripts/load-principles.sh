#!/usr/bin/env bash
# load-principles.sh — T5 / FR-04, FR-13, FR-14, E4, E15.
#
# Loads the plugin's L1+L2 principles (principles.yaml + principles.md) and
# merges per-repo L3 overrides from <repo>/.pmos/architecture/principles.{yaml,md}.
# Last-wins on rule-ID collision; logs override events to stderr; emits the
# merged ruleset as a JSON array on stdout.
#
# Usage:
#   load-principles.sh [--l3-root <path>]
#
# Default --l3-root is <git-toplevel>/.pmos/architecture/.
#
# Output schema (stdout JSON array, one entry per rule):
#   { id, tier, stack, disposition, delegate_to, check, source, message, why,
#     prose_summary, prose_why, prose_static_tools }
# `prose_*` fields come from the md layer; YAML fields are authoritative for
# all machine-readable attributes. L3 wins on any field it provides.
#
# Hard error (exit 1) per E15: an L3 principles.md file containing duplicate
# `## <RULE_ID>` H2 headings.

set -euo pipefail

# ── Bash portability fallback (CLAUDE.md ## Bash portability) ────────────────
SOURCE="${BASH_SOURCE[0]:-$0}"
SENTINEL_REL="plugins/pmos-toolkit/skills/architecture"
if [ -n "$SOURCE" ] && [ -f "$SOURCE" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$SOURCE")" && pwd)"
else
  _walk="$PWD"
  while [ "$_walk" != "/" ] && [ ! -d "$_walk/$SENTINEL_REL" ]; do
    _walk="$(dirname "$_walk")"
  done
  if [ "$_walk" = "/" ]; then
    echo "FATAL: cannot resolve script dir — BASH_SOURCE empty and no sentinel ancestor of \$PWD ($PWD) contains $SENTINEL_REL/" >&2
    exit 2
  fi
  SCRIPT_DIR="$_walk/$SENTINEL_REL/scripts"
fi

SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PLUGIN_YAML="$SKILL_DIR/principles.yaml"
PLUGIN_MD="$SKILL_DIR/principles.md"

[ -f "$PLUGIN_YAML" ] || { echo "FATAL: plugin yaml missing: $PLUGIN_YAML" >&2; exit 2; }
[ -f "$PLUGIN_MD" ]   || { echo "FATAL: plugin md missing: $PLUGIN_MD"   >&2; exit 2; }

# ── arg parse ────────────────────────────────────────────────────────────────
L3_ROOT=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --l3-root)
      L3_ROOT="${2:-}"; shift 2 ;;
    --l3-root=*)
      L3_ROOT="${1#--l3-root=}"; shift ;;
    -h|--help)
      sed -n '1,30p' "$0"; exit 0 ;;
    *)
      echo "unknown arg: $1" >&2; exit 64 ;;
  esac
done

if [ -z "$L3_ROOT" ]; then
  if REPO_TOP=$(git rev-parse --show-toplevel 2>/dev/null); then
    L3_ROOT="$REPO_TOP/.pmos/architecture"
  else
    L3_ROOT=""  # no repo & no explicit root — treated as absent
  fi
fi

L3_YAML=""
L3_MD=""
if [ -n "$L3_ROOT" ] && [ -d "$L3_ROOT" ]; then
  [ -f "$L3_ROOT/principles.yaml" ] && L3_YAML="$L3_ROOT/principles.yaml"
  [ -f "$L3_ROOT/principles.md" ]   && L3_MD="$L3_ROOT/principles.md"
fi

if [ -z "$L3_YAML" ] && [ -z "$L3_MD" ]; then
  echo "no L3 overrides found; using plugin defaults" >&2
fi

# ── merge via inline Node helper ────────────────────────────────────────────
# Node receives the 4 file paths via env. It hand-rolls a minimal YAML parser
# keyed on `- id:` line + sibling fields, an awk-style md parser per H2 block,
# performs last-wins merging on rule-id collision, logs override events to
# stderr, hard-errors on duplicate H2 in a single md file, emits merged JSON
# array on stdout.
PLUGIN_YAML="$PLUGIN_YAML" PLUGIN_MD="$PLUGIN_MD" L3_YAML="$L3_YAML" L3_MD="$L3_MD" \
node -e '
  "use strict";
  const fs = require("fs");

  // ── minimal YAML parser for principles.yaml shape ──────────────────────
  // The file is a flat `rules:` list of entries; each entry has a leading
  // `- id: VALUE` then sibling `  key: value` lines. Values may be bare or
  // quoted. `null` literal → JS null. Strings keep escapes raw.
  function parseRulesYaml(text, label) {
    const lines = text.split(/\r?\n/);
    const rules = [];
    let inRules = false;
    let current = null;
    let entryIndent = -1;

    function stripComment(s) {
      // Strip `#` comments outside of quoted strings (rules file uses no
      // inline-# inside values — keep this simple).
      let inSingle = false, inDouble = false;
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c === "\"" && !inSingle) inDouble = !inDouble;
        else if (c === "\x27" && !inDouble) inSingle = !inSingle;
        else if (c === "#" && !inSingle && !inDouble) return s.slice(0, i);
      }
      return s;
    }
    function unquote(v) {
      v = v.trim();
      if (v.length >= 2 && (v[0] === "\"" && v[v.length-1] === "\"")) {
        return v.slice(1, -1)
          .replace(/\\"/g, "\"")
          .replace(/\\\\/g, "\\");
      }
      if (v.length >= 2 && (v[0] === "\x27" && v[v.length-1] === "\x27")) {
        return v.slice(1, -1);
      }
      if (v === "null" || v === "~" || v === "") return null;
      if (v === "true") return true;
      if (v === "false") return false;
      if (/^-?\d+$/.test(v)) return parseInt(v, 10);
      return v;
    }

    for (let raw of lines) {
      const line = stripComment(raw).replace(/\s+$/, "");
      if (line.trim() === "") continue;
      if (/^rules\s*:\s*$/.test(line)) { inRules = true; continue; }
      if (!inRules) continue;

      // Entry start: `  - id: VALUE`
      const dashM = line.match(/^(\s*)-\s+id\s*:\s*(.*)$/);
      if (dashM) {
        if (current) rules.push(current);
        current = { id: unquote(dashM[2]) };
        entryIndent = dashM[1].length + 2; // continuation indent = dash col + 2
        continue;
      }
      if (current === null) continue;
      // Continuation: `    key: value` at entryIndent
      const kvM = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
      if (kvM && kvM[1].length >= entryIndent) {
        current[kvM[2]] = unquote(kvM[3]);
        continue;
      }
      // If we hit a top-level (un-indented) non-rules construct, stop.
      if (/^\S/.test(line) && !/^rules\s*:/.test(line)) {
        inRules = false;
      }
    }
    if (current) rules.push(current);
    return rules.filter(r => r && r.id);
  }

  // ── md parser: per-rule H2 blocks ──────────────────────────────────────
  // Returns { id → { summary, why, static_tools, raw } }. Hard-errors on
  // duplicate `## <ID>` in a single file (E15).
  function parseRulesMd(text, label) {
    const out = {};
    const lines = text.split(/\r?\n/);
    let curId = null;
    let buf = [];
    function flush() {
      if (curId === null) return;
      const body = buf.join("\n");
      const summary = (body.match(/\*\*Summary:\*\*\s*([^\n]+)/) || [,""])[1].trim();
      const why = (body.match(/\*\*Why:\*\*\s*([\s\S]*?)(?:\n\*\*|$)/) || [,""])[1].trim();
      const tools = (body.match(/\*\*Static tools:\*\*\s*([^\n]+)/) || [,""])[1].trim();
      out[curId] = { summary, why, static_tools: tools, raw: body };
    }
    const idHeading = /^##\s+([A-Z]+[0-9]+)\s*$/;
    for (const line of lines) {
      const m = line.match(idHeading);
      if (m) {
        const newId = m[1];
        if (Object.prototype.hasOwnProperty.call(out, newId) || newId === curId) {
          // duplicate within this file → E15
          process.stderr.write("FATAL: duplicate H2 \x27## " + newId + "\x27 in " + label + " (E15)\n");
          process.exit(1);
        }
        flush();
        curId = newId;
        buf = [];
      } else if (curId !== null) {
        buf.push(line);
      }
    }
    flush();
    return out;
  }

  function loadFile(p) {
    if (!p) return null;
    try { return fs.readFileSync(p, "utf8"); }
    catch (e) { return null; }
  }

  const pluginYamlText = loadFile(process.env.PLUGIN_YAML);
  const pluginMdText   = loadFile(process.env.PLUGIN_MD);
  const l3YamlText     = loadFile(process.env.L3_YAML || "");
  const l3MdText       = loadFile(process.env.L3_MD || "");

  const baseYaml = parseRulesYaml(pluginYamlText, process.env.PLUGIN_YAML);
  const baseMd   = parseRulesMd(pluginMdText, process.env.PLUGIN_MD);

  // Build base merged map.
  const merged = new Map();
  for (const r of baseYaml) {
    const m = baseMd[r.id] || {};
    merged.set(r.id, Object.assign({}, r, {
      prose_summary: m.summary || "",
      prose_why: m.why || "",
      prose_static_tools: m.static_tools || ""
    }));
  }

  // Apply L3 yaml (last-wins on field).
  if (l3YamlText) {
    const l3Rules = parseRulesYaml(l3YamlText, process.env.L3_YAML);
    for (const r of l3Rules) {
      if (merged.has(r.id)) {
        process.stderr.write("L3 override applied: " + r.id + "\n");
        const cur = merged.get(r.id);
        merged.set(r.id, Object.assign({}, cur, r));
      } else {
        // New rule from L3: accept (L3 may extend, not just override).
        process.stderr.write("L3 rule added: " + r.id + "\n");
        merged.set(r.id, Object.assign({}, r, {
          prose_summary: "", prose_why: "", prose_static_tools: ""
        }));
      }
    }
  }

  // Apply L3 md (replaces prose fields only).
  if (l3MdText) {
    const l3Md = parseRulesMd(l3MdText, process.env.L3_MD);
    for (const id of Object.keys(l3Md)) {
      if (merged.has(id)) {
        // Already logged at yaml stage if id collided there; emit if md-only.
        // (For our purposes the per-collision log line is at the rule-id grain.)
        const cur = merged.get(id);
        merged.set(id, Object.assign({}, cur, {
          prose_summary: l3Md[id].summary,
          prose_why: l3Md[id].why,
          prose_static_tools: l3Md[id].static_tools
        }));
      }
    }
  }

  // Emit array preserving plugin-yaml ordering for base; L3-added rules append.
  const order = baseYaml.map(r => r.id);
  const seen = new Set(order);
  const extras = [...merged.keys()].filter(id => !seen.has(id));
  const final = [...order, ...extras].map(id => merged.get(id)).filter(Boolean);

  process.stdout.write(JSON.stringify(final, null, 2));
'
