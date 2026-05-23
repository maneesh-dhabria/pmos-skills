# Non-Interactive Mode — Shared Contract

> Authoritative source for the `--non-interactive` flag. Pipeline and supporting skills inline **Section 0** verbatim into their own SKILL.md (Phase 0). They must `Read` this file when an edge case named in Section 0 fires.

This file has four sections:

- **Section 0** — Canonical inline non-interactive block (copy-pasted into each supporting SKILL.md)
- **Section A** — Refusal pattern + exit-64 contract
- **Section B** — Downstream Open-Questions parser snippet
- **Section C** — Subagent propagation prefix recipe

---

## Section 0 — Canonical inline non-interactive block

Supporting skills paste the block between the markers below into their own Phase 0 (after the `pipeline-setup-block`), **verbatim**. The lint script (`tools/lint-non-interactive-inline.sh`) diffs each skill's marked region against this canonical version and fails on drift. Do not edit the marked region in any SKILL.md without updating this section first.

<!-- non-interactive-block:start -->
1. **Mode resolution.** Compute `(mode, source)` with precedence: `cli_flag > parent_marker > settings.default_mode > builtin-default ("interactive")` (FR-01).
   - `cli_flag` is `--non-interactive` or `--interactive` parsed from this skill's argument string. Last flag wins on conflict (FR-01.1).
   - `parent_marker` is set if the original prompt's first line matches `^\[mode: (interactive|non-interactive)\]$` (FR-06.1).
   - `settings.default_mode` is `.pmos/settings.yaml :: default_mode` if present and one of `interactive`/`non-interactive`. Unknown values → warn on stderr `settings: invalid default_mode value '<v>'; ignoring` and fall through (FR-01.3).
   - If `.pmos/settings.yaml` is malformed (not parseable as YAML, or missing `version`): print to stderr `settings.yaml malformed; fix and re-run` and exit 64 (FR-01.5).
   - On Phase 0 entry, always print to stderr exactly: `mode: <mode> (source: <source>)` (FR-01.2).

2. **Per-checkpoint classifier.** Before issuing any `AskUserQuestion` call, classify it (FR-02):
   - Use the awk extractor below to find the line of this call's `question:` key in the live SKILL.md (FR-02.6).
   - The defer-only tag, if present, is the literal previous non-empty line: `<!-- defer-only: <reason> -->` where `<reason>` ∈ {`destructive`, `free-form`, `ambiguous`} (FR-02.5).
   - Decision (in order): tag adjacent → DEFER; multiSelect with 0 Recommended → DEFER; 0 options OR no option label ends in `(Recommended)` → DEFER; else AUTO-PICK the (Recommended) option (FR-02.2).

3. **Buffer + flush.** Maintain an append-only OQ buffer in conversation memory. On each AUTO-PICK or DEFER classification, append one entry per the schema in spec §11.2. At end-of-skill (or in a caught error before exit), flush (FR-03):
   - Primary artifact is single Markdown → append `## Open Questions (Non-Interactive Run)` section with one fenced YAML block per entry; update prose frontmatter (`**Mode:**`, `**Run Outcome:**`, `**Open Questions:** N` where N counts deferred only — see FR-03.4) (FR-03.1).
   - Skill produces multiple artifacts → write a single `_open_questions.md` aggregator at the artifact directory root; primary artifact's frontmatter `**Open Questions:** N — see _open_questions.md` (FR-03.5).
   - Primary artifact is non-MD (SVG, etc.) → write sidecar `<artifact>.open-questions.md` (FR-03.2).
   - No persistent artifact (chat-only) → emit buffer to stderr at end-of-run as a single block prefixed `--- OPEN QUESTIONS ---` (FR-03.3).
   - Mid-skill error → flush partial buffer under heading `## Open Questions (Non-Interactive Run — partial; skill errored)`; set `**Run Outcome:** error`; exit 1 (E13).

4. **Subagent dispatch.** When dispatching a child skill via Task tool or inline invocation, prepend the literal first line: `[mode: <current-mode>]\n` to the child's prompt (FR-06).

5. **Awk extractor.** The classifier and `tools/audit-recommended.sh` MUST both use the function below. Loaded at script init time; sourcing differs per consumer.

<!-- awk-extractor:start -->
```awk
# Find AskUserQuestion call sites and their adjacent defer-only tags.
# Input: a SKILL.md file (stdin or argv).
# Output (TSV): <line_no>\t<has_recommended:0|1>\t<defer_only_reason or "-">
# A "call site" is a line referencing `AskUserQuestion` in the SKILL's own prose
# (backtick mentions, prose instructions, multi-line invocation hints).
# `(Recommended)` is detected on the call site line OR any subsequent non-blank
# line (the option-list block) until a blank line, defer-only tag, or another
# AskUserQuestion call closes the pending call. Lines inside the inlined
# `<!-- non-interactive-block:... -->` region are canonical contract text and
# never count as call sites.
function emit_pending() {
  if (pending_call > 0) {
    out_tag = (pending_call_tag != "") ? pending_call_tag : "-";
    printf "%d\t%d\t%s\n", pending_call, pending_has_recc, out_tag;
    pending_call = 0;
    pending_has_recc = 0;
    pending_call_tag = "";
  }
}
/^<!-- non-interactive-block:start -->$/ { in_inlined=1; next }
/^<!-- non-interactive-block:end -->$/   { in_inlined=0; next }
in_inlined { next }
/^[[:space:]]*<!--[[:space:]]*defer-only:[[:space:]]*([a-z-]+)[[:space:]]*-->/ {
  emit_pending();
  match($0, /defer-only:[[:space:]]*[a-z-]+/);
  pending_tag = substr($0, RSTART + 12, RLENGTH - 12);
  sub(/^[[:space:]]+/, "", pending_tag);
  pending_line = NR;
  next;
}
/^[[:space:]]*$/ {
  emit_pending();
  pending_tag = "";
  next;
}
/AskUserQuestion/ {
  emit_pending();
  pending_call = NR;
  pending_has_recc = ($0 ~ /\(Recommended\)/) ? 1 : 0;
  pending_call_tag = (pending_tag != "" && NR == pending_line + 1) ? pending_tag : "";
  pending_tag = "";
  next;
}
{
  if (pending_call > 0 && $0 ~ /\(Recommended\)/) {
    pending_has_recc = 1;
  }
}
END { emit_pending() }
```
<!-- awk-extractor:end -->

6. **Refusal check.** If this SKILL.md contains a `<!-- non-interactive: refused; ... -->` marker (regex: `<!--[[:space:]]*non-interactive:[[:space:]]*refused`), and `mode` resolved to `non-interactive`: emit refusal per Section A and exit 64 (FR-07).

7. **Pre-rollout BC.** If the `--non-interactive` argument is present BUT this SKILL.md does NOT contain the `<!-- non-interactive-block:start -->` marker (i.e., this skill hasn't been rolled out yet): emit `WARNING: --non-interactive not yet supported by /<skill>; falling back to interactive.` to stderr; continue in interactive mode (FR-08).

8. **End-of-skill summary.** Print to stderr at exit: `pmos-toolkit: /<skill> finished — outcome=<clean|deferred|error>, open_questions=<N>` (NFR-07).
<!-- non-interactive-block:end -->

---

## Section A — Refusal pattern + exit-64 contract

Skills that structurally forbid `--non-interactive` declare it via a marker near the top of their SKILL.md:

    <!-- non-interactive: refused; reason: <one-line reason>; alternative: <one-line pointer> -->

When detected with `mode == non-interactive`, emit to stderr:

    --non-interactive not supported by /<skill>: <reason>. <alternative>

Then exit 64. The regex used by `tests/non-interactive/refusal.bats` to assert this:

    ^--non-interactive not supported by /[a-z-]+: .+\. .+

Refusal is one-directional: `<!-- non-interactive: refused; ... -->` does NOT block `--interactive` (the symmetric flag) (FR-07.2).

---

## Section B — Downstream Open-Questions parser snippet

Downstream pipeline skills (`/spec`, `/plan`, etc.) extract the previous artifact's `## Open Questions (Non-Interactive Run)` block as a JSON array. Inline this snippet in their Phase 1 input-loading:

<!-- parser-snippet:start -->
```bash
# Usage: parse_open_questions <artifact-path>
# Stdout: JSON array of OQ entries; [] if no block; exit 0 always (warns on malformed YAML)
parse_open_questions() {
  local artifact="$1"
  local docs
  docs="$(awk '
    /^## Open Questions \(Non-Interactive Run/ { in_section=1; next }
    in_section && /^```yaml$/                  { in_block=1; if (count++) print "---"; next }
    in_section && /^```$/ && in_block          { in_block=0; next }
    in_section && in_block                     { print }
  ' "$artifact")"
  if [[ -z "$docs" ]]; then
    echo '[]'
    return 0
  fi
  printf '%s\n' "$docs" | yq eval-all '[.]' --output-format=json 2>/dev/null || echo '[]'
}
```
<!-- parser-snippet:end -->

Parser handles missing block by emitting `[]`; malformed YAML in a block emits parsable entries with stderr warnings (FR-09.2).

---

## Section C — Subagent propagation prefix recipe

When a parent skill (running `--non-interactive`) dispatches a child skill, the parent prepends the marker as the literal first line of the child's prompt:

    [mode: non-interactive]
    <rest of child prompt as usual>

Marker grammar: `^\[mode: (interactive|non-interactive)\]$` on its own line (FR-06.1). Case-sensitive; followed immediately by `\n`.

The child's Phase 0 (instruction below) scans the original prompt's first 256 bytes for the marker before checking flags or settings. If the marker matches, the value enters the resolver as `parent_marker`.

Child entries merged into the parent's OQ buffer use id format `OQ-<child-skill-name>-NNN` (FR-06.2).

Anti-pattern: parent passes mode via natural-language argument ("invoke /verify in non-interactive mode"). Forbidden — depends on LLM faithfulness; use the marker.
