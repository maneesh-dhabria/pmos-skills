#!/usr/bin/env bash
# from-spec-tracer.sh — T1 tracer-bullet entrypoint for /architecture --from-spec.
#
# End-to-end pipeline (FR-01, FR-02, FR-05, FR-06, FR-08, FR-31; D11):
#   (a) parse the fixture spec via _shared/html-authoring/assets/build_sections_json.js
#       + a small inline body-extractor (regex on <section id="modules"> /
#       <section id="architectural-assertions">) → JSON
#   (b) cat the tracer principles.md into a prompt buffer
#   (c) dispatch the judge subagent (TRACER STUB — see below)
#   (d) capture the JSON-array response
#   (e) orchestrator-side validation: drop rule_id ∉ {U001,U002}, drop quotes
#       that are not verbatim substrings of the cited spec_section_id body,
#       drop quotes shorter than 40 chars (FR-06)
#   (f) write the validated array to /tmp/architecture-tracer-findings.json
#
# TRACER STUB — T9 replaces step (c) with a real Task-tool dispatch of the
# judge subagent at temperature=0. The stub returns a hand-authored finding
# array intentionally containing one VALID finding (cites the verbatim
# assertion bullet in §architectural-assertions, rule_id U001) and two
# INVALID findings (bad rule_id; quote not in source) so the orchestrator
# validation in step (e) is genuinely exercised — that is what this tracer
# bullet derisks.

set -euo pipefail

START_TS=$(date +%s)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SHARED_ASSETS="$(cd "$SKILL_DIR/../_shared/html-authoring/assets" && pwd)"
PRINCIPLES_MD="$SKILL_DIR/tests/fixtures/principles-tracer.md"
OUT="/tmp/architecture-tracer-findings.json"

SPEC_PATH="${1:-}"
if [ -z "$SPEC_PATH" ]; then
  echo "usage: from-spec-tracer.sh <spec.html>" >&2
  exit 64
fi
if [ ! -f "$SPEC_PATH" ]; then
  echo "spec not found: $SPEC_PATH" >&2
  exit 66
fi
[ -f "$PRINCIPLES_MD" ] || { echo "principles md missing: $PRINCIPLES_MD" >&2; exit 66; }
[ -f "$SHARED_ASSETS/build_sections_json.js" ] || { echo "substrate missing: $SHARED_ASSETS/build_sections_json.js" >&2; exit 66; }

# ── (a) parse spec → JSON ────────────────────────────────────────────────────
PARSED_JSON=$(
  SPEC_PATH="$SPEC_PATH" \
  BUILD_SECTIONS_JS="$SHARED_ASSETS/build_sections_json.js" \
  node -e '
    const fs = require("fs");
    const { execFileSync } = require("child_process");
    const path = process.env.SPEC_PATH;
    const html = fs.readFileSync(path, "utf8");

    // Wire the substrate as a CLI (its module-level side effects read argv/stdin)
    // — proves the pipe is plumbed for T9; output is consumed but its detailed
    // index is not needed by this tracer (we only need §modules/§assertions
    // bodies, extracted inline below).
    try {
      const idx = execFileSync(process.execPath, [process.env.BUILD_SECTIONS_JS, path], { encoding: "utf8" });
      const parsedIdx = JSON.parse(idx);
      process.stderr.write("substrate sections_idx: " + parsedIdx.length + " headings\n");
    } catch (e) {
      process.stderr.write("substrate sections_idx failed: " + e.message + "\n");
      process.exit(65);
    }

    function extractSectionBody(html, id) {
      // Match <section id="ID"> ... </section> with greedy-but-balanced
      // approximation: assumes no nested <section> with same id (true for
      // tracer fixture).
      const re = new RegExp(
        "<section\\b[^>]*\\bid\\s*=\\s*\"" + id + "\"[^>]*>([\\s\\S]*?)<\\/section>",
        "i"
      );
      const m = html.match(re);
      return m ? m[1] : "";
    }
    function stripTags(s) {
      return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }

    const modulesBodyHtml = extractSectionBody(html, "modules");
    const assertionsBodyHtml = extractSectionBody(html, "architectural-assertions");

    if (!modulesBodyHtml) { console.error("missing <section id=modules>"); process.exit(65); }
    if (!assertionsBodyHtml) { console.error("missing <section id=architectural-assertions>"); process.exit(65); }

    // Extract module rows: <tr><td>name</td><td>deps</td><td>role</td></tr>
    const modules = [];
    const trRe = /<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/g;
    let m2;
    while ((m2 = trRe.exec(modulesBodyHtml)) !== null) {
      const name = stripTags(m2[1]);
      if (name === "name") continue; // header row (defensive)
      const depsRaw = stripTags(m2[2]);
      const deps = (depsRaw === "" || /^\(none\)$/i.test(depsRaw))
        ? []
        : depsRaw.split(/[,\s]+/).filter(Boolean);
      modules.push({ name, deps, role: stripTags(m2[3]) });
    }

    // Extract assertion bullets: <li>...</li> inside the section.
    const assertions = [];
    const liRe = /<li>([\s\S]*?)<\/li>/g;
    let m3;
    while ((m3 = liRe.exec(assertionsBodyHtml)) !== null) {
      assertions.push(stripTags(m3[1]));
    }

    // Keep stripped-text bodies for validator quote-substring check in step (e).
    const modulesBodyText = stripTags(modulesBodyHtml);
    const assertionsBodyText = stripTags(assertionsBodyHtml);

    process.stdout.write(JSON.stringify({
      modules,
      assertions,
      section_bodies: {
        "modules": modulesBodyText,
        "architectural-assertions": assertionsBodyText
      }
    }));
  '
)

# ── (b) prompt buffer (principles prose + parsed spec) ───────────────────────
PRINCIPLES_BUF=$(cat "$PRINCIPLES_MD")
# Buffer is constructed here for parity with T9 dispatch shape; not used by stub
# beyond proving the wire-up. Keep visible to stderr for debuggability.
echo "tracer prompt-buffer: principles=$(printf '%s' "$PRINCIPLES_BUF" | wc -c | tr -d ' ')B, spec_json=$(printf '%s' "$PARSED_JSON" | wc -c | tr -d ' ')B" >&2

# ── (c) judge dispatch — TRACER STUB ────────────────────────────────────────
# TRACER STUB — T9 replaces with real Task dispatch (temperature=0) of the
# judge subagent. The stub emits a 3-element array deliberately mixing
# (1 valid, 1 unknown rule_id, 1 fabricated quote) so the orchestrator
# validation in step (e) is exercised end-to-end on stub output.
JUDGE_OUTPUT=$(
  SPEC_PATH="$SPEC_PATH" node -e '
    const fs = require("fs");
    const html = fs.readFileSync(process.env.SPEC_PATH, "utf8");
    // Verbatim substring of the §architectural-assertions bullet — must be
    // ≥40 chars and substring-grep-clean (no normalization tolerance per FR-06).
    const validQuote =
      "Module foo must not import from bar — the orchestration boundary is unidirectional and importing the downstream sibling would introduce a cycle that the tracer asserts cannot exist in any vertical slice.";
    // Sanity: confirm the stub quote is actually substring of source.
    if (html.indexOf(validQuote) < 0) {
      console.error("STUB BUG: valid quote not substring of fixture; fix the stub.");
      process.exit(70);
    }
    const out = [
      {
        rule_id: "U001",
        severity: "should_fix",
        confidence: 90,
        spec_section_id: "architectural-assertions",
        quote: validQuote,
        finding: "Spec asserts foo must not import from bar; no architectural mechanism in §modules guarantees this — relies on convention only.",
        recommendation: "Encode the foo↛bar ban as an import-linter contract or dependency-cruiser rule pinned to the module graph."
      },
      // INVALID — unknown rule_id; orchestrator MUST drop.
      {
        rule_id: "U999",
        severity: "should_fix",
        confidence: 80,
        spec_section_id: "architectural-assertions",
        quote: validQuote,
        finding: "Bogus finding under unknown rule.",
        recommendation: "Should be dropped."
      },
      // INVALID — quote not substring of cited section; orchestrator MUST drop.
      {
        rule_id: "U002",
        severity: "should_fix",
        confidence: 75,
        spec_section_id: "modules",
        quote: "This sentence does not appear anywhere in the modules section body of the fixture spec doc.",
        finding: "Fabricated multi-role module claim.",
        recommendation: "Should be dropped."
      }
    ];
    process.stdout.write(JSON.stringify(out));
  '
)

# ── (d)(e) capture + validate ────────────────────────────────────────────────
VALIDATED=$(
  PARSED_JSON_ENV="$PARSED_JSON" JUDGE_OUTPUT_ENV="$JUDGE_OUTPUT" node -e '
    const parsed = JSON.parse(process.env.PARSED_JSON_ENV);
    const findings = JSON.parse(process.env.JUDGE_OUTPUT_ENV);
    const RULE_ID_SET = new Set(["U001", "U002"]);
    const out = [];
    let dropped = 0;
    for (const f of findings) {
      if (!RULE_ID_SET.has(f.rule_id)) {
        process.stderr.write("drop: unknown rule_id " + JSON.stringify(f.rule_id) + "\n");
        dropped++; continue;
      }
      if (typeof f.quote !== "string" || f.quote.length < 40) {
        process.stderr.write("drop: quote too short (rule " + f.rule_id + ")\n");
        dropped++; continue;
      }
      const body = parsed.section_bodies[f.spec_section_id];
      if (typeof body !== "string" || body.indexOf(f.quote) < 0) {
        process.stderr.write("drop: quote not in source (rule " + f.rule_id + ", section " + f.spec_section_id + ")\n");
        dropped++; continue;
      }
      out.push(f);
    }
    process.stderr.write("validator: kept=" + out.length + " dropped=" + dropped + "\n");
    process.stdout.write(JSON.stringify(out, null, 2));
  '
)

# ── (f) emit ─────────────────────────────────────────────────────────────────
printf '%s\n' "$VALIDATED" > "$OUT"
echo "tracer findings written: $OUT" >&2

END_TS=$(date +%s)
ELAPSED=$(( END_TS - START_TS ))
echo "tracer wall-clock: ${ELAPSED}s" >&2

if [ "$ELAPSED" -ge 90 ]; then
  echo "FAIL: tracer wall-clock ${ELAPSED}s exceeds 90s budget (R4 / NFR-01)" >&2
  exit 67
fi

exit 0
