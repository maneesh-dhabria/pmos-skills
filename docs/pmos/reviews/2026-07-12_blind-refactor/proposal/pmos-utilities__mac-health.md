# Proposal — pmos-utilities__mac-health

- **Unit:** pmos-utilities__mac-health (`plugins/pmos-utilities/skills/mac-health/` — `SKILL.md` + `scripts/baseline_snapshot.sh`)
- **Status:** CAPPED (pass 2 of 2 complete — reviewer pass 1 + author response 1 + reviewer pass 2 + author response 2)
- **Score:** 13 findings (0 blocker / 5 should-fix / 8 nit) → 13 accepted, 0 rejected, 0 invalid

## Dispositions table

| ID | Severity | Disposition |
|---|---|---|
| mac-health-F1 | Should-fix | Accepted (amended in pass 2 by F13 — failure router retained) |
| mac-health-F2 | Should-fix | Accepted (modified: escape hatch stays in Step 1; amended in pass 2 by F10 — hatch inventory enlarged) |
| mac-health-F3 | Should-fix | Accepted |
| mac-health-F4 | Should-fix | Accepted |
| mac-health-F5 | Nit | Accepted |
| mac-health-F6 | Nit | Accepted — routed to canonical-block owner (pmos-toolkit); no mac-health-local edit |
| mac-health-F7 | Nit | Accepted |
| mac-health-F8 | Nit | Accepted |
| mac-health-F9 | Nit | Accepted (amended in pass 2 by F12 — all sed dispositions named) |
| mac-health-F10 | Should-fix | Accepted — amends C2 |
| mac-health-F11 | Nit | Accepted — new script-only fix (C10) |
| mac-health-F12 | Nit | Accepted — extends C9b |
| mac-health-F13 | Nit | Accepted — amends C1 |

All changes below are DESCRIBED, not implemented.

## Accepted changes (full detail)

### C1 — Fix bundled-script discovery (F1 Should-fix, amended by F13 Nit)
- **File/section:** `SKILL.md` · Step 1 "Capture a baseline", the fenced invocation at line 64.
- **Before:** `bash "$(dirname "$(find . -path '*/mac-health/scripts/baseline_snapshot.sh' -print -quit 2>/dev/null)")/baseline_snapshot.sh" 2>/dev/null || echo "Script not found — use manual commands below"` — a cwd-relative `find .` that misses when the skill is installed under the plugin cache (the normal case), walks the user's whole project tree on a no-match, and round-trips through `dirname` needlessly.
- **After (intent, final form per F13):** Invoke the script directly at its plugin-rooted path, RETAINING the explicit failure router: `bash "${CLAUDE_PLUGIN_ROOT:-}/skills/mac-health/scripts/baseline_snapshot.sh" 2>/dev/null || echo "Script not found — use manual commands below"`. The `:-` default keeps the expansion safe under `set -u`; the `|| echo` tail routes both the unset-var miss and any script failure to the escape hatch instead of a cryptic `No such file or directory`. Add one prose sentence: if `CLAUDE_PLUGIN_ROOT` is unset, resolve `scripts/baseline_snapshot.sh` relative to the directory this SKILL.md was loaded from (known to the model at load time) before falling back to the manual commands.
- **Rationale:** Installed skills don't live in the project cwd; the current line makes the bundled script dead weight and burns cycles on a machine the user just reported as hot/slow. F13 correctly flagged that the pass-1 After dropped the Before line's one good property — graceful failure must live in the fenced command (run verbatim), not only in prose.
- **Blast radius:** SKILL.md only. No lints/evals key on this line.

### C2 — Single home for the drift-prone diagnostic block; self-sufficient escape hatch (F2 Should-fix, amended by F10 Should-fix)
- **File/section:** `SKILL.md` · Steps 1 and 2; `scripts/baseline_snapshot.sh` unchanged in role (it is the single home for the category-count awk).
- **Before:** The category-count awk block (SKILL.md 90–101 = script 33–44), the orphan one-liner `ps -eo ppid=,pid=,%cpu=,%mem=,etime=,command= | awk '$1==1' | sort -k3 -nr | head -20` (SKILL.md 107 = script 48), and the top-CPU/top-mem `ps` invocations (SKILL.md 70–71 = script 21/25) appear byte-for-byte in BOTH files — a §K one-fact-two-homes drift trap, and Step 2 re-runs commands whose output the Step 1 script already printed.
- **After (intent, final form per F10):**
  - **Removed from SKILL.md:** only the large multi-line category-count awk block (the genuinely drift-prone artifact). Step 2 instead instructs interpreting the script's `=== process counts by category ===` and `=== orphaned processes ===` output sections (what the numbers mean, what counts as "excessive"), and carries a one-sentence manual approximation for the script-unavailable branch: per-category `ps -Ao command= | grep -c '<pattern>'`, adapting patterns to what's actually running.
  - **Retained in Step 1's escape hatch:** BOTH ps views — the cpu-sorted line (SKILL.md 70) AND the mem-sorted line (SKILL.md 71, the only memory-sorted view in the manual path, backing the "what's using so much memory" trigger; it is NOT a duplicate of line 70 — columns swapped, sorted by %mem) — plus the orphan one-liner, plus `pmset -g batt`, `pmset -g assertions`, `vm_stat`, `top -l 1 -o cpu -n 20` (sed-free per C9b). Each retained one-liner is annotated as a mirror of the script's like-named section, and the hatch is explicitly labeled "if the script is unavailable, run these".
- **Rationale:** §K single-home targets the drift-prone multi-line awk, not a mandate to make the fallback non-functional. F10 correctly showed the pass-1 trim was self-contradicting: in the exact branch the hatch exists for (`|| echo "Script not found"`), the model would have had no category command, no orphan one-liner, and no mem-sorted ps, while Step 2 pointed at script sections that were never emitted. The final shape keeps the fallback self-sufficient while single-homing the block that actually drifts.
- **Blast radius:** SKILL.md; makes C5/C10 (awk fixes) one-home edits. No lints touched.

### C3 — Guard Chrome tab inspection so it can't launch Chrome (F3, Should-fix)
- **File/section:** `SKILL.md` · Step 3 "Handle browser-extension leaks carefully", the osascript heredoc at line 117.
- **Before:** Bare `tell application "Google Chrome"` — launches Chrome if not running (state mutation during a "read-only" diagnosis; heaviest app on a hot machine) and can stall on a first-time Automation permission prompt.
- **After (intent):** Wrap the osascript in `if pgrep -xq "Google Chrome"; then … else echo "Chrome not running — skipping tab inspection"; fi` (or an in-script `if application "Google Chrome" is running` guard). Add one prose line warning that the first run may trigger a macOS Automation permission prompt.
- **Rationale:** Keeps the skill's own line-46 promise that "Diagnosis is read-only and always runs".
- **Blast radius:** SKILL.md only.

### C4 — Explicit tagged destructive-confirmation checkpoint (F4, Should-fix)
- **File/section:** `SKILL.md` · Step 4 "Safe cleanup rules"; the prose paragraph at line 46.
- **Before:** "never kills a process or stops a service without explicit confirmation" exists only as prose; Step 4's `kill -TERM` / `pkill` has no `AskUserQuestion` call site, no `(Recommended)` option, no `<!-- defer-only: destructive -->` tag — `audit-recommended.sh` passes vacuously and confirmation is ad-hoc model judgment.
- **After (intent):** Step 4 defines an explicit confirmation checkpoint before any kill: an `AskUserQuestion` presenting the proposed kill list (per-process or batch), with the literal `<!-- defer-only: destructive -->` tag on the adjacent previous non-empty line so the frozen block's classifier DEFERs it in non-interactive mode. The line-46 paragraph shrinks to one sentence citing the tagged checkpoint (and, per C7, the `{#safe-cleanup}` anchor) instead of restating the defer contract in bespoke prose.
- **Rationale:** Makes the skill's one genuinely dangerous moment auditable and deterministic, using the machinery the repo already ships for exactly this gate.
- **Blast radius:** SKILL.md; pmos-toolkit's `tools/audit-recommended.sh` (scans all plugins) will now see and classify one real call site — the destructive tag satisfies it. Frozen non-interactive block untouched.

### C5 — Fix awk double-count of Chrome renderers (F5, Nit)
- **File/section:** `scripts/baseline_snapshot.sh` · category awk at lines 33–44 (post-C2 the only home of the block).
- **Before:** `/Chrome Helper \(Renderer\)/ {chr++}` with no `next` — awk runs every pattern per line, so Chrome renderers also increment `ren` (`other_renderers`), overstating non-Chrome renderer load on the Chrome-heavy boxes the skill targets.
- **After (intent):** Append `; next` to the Chrome renderer action (and to `{chm++}`) so subsequent patterns skip Chrome lines; `other_renderers`/`plugins` then count only non-Chrome helpers, matching their labels.
- **Rationale:** Wrong numbers steer diagnosis toward the wrong app.
- **Blast radius:** baseline_snapshot.sh only. No script tests exist.

### C6 — Dangling `_shared/non-interactive.md` cite in the frozen block (F6, Nit) — cross-unit, routed to canonical owner
- **File/section:** NOT this unit. Canonical fix lands in pmos-toolkit's `skills/_shared/non-interactive.md`, step 5 of the block; then a hand re-paste into every consumer SKILL.md across all plugins (byte-identity enforced by pmos-toolkit `tools/lint-non-interactive-inline.sh`).
- **Before:** "sources the shared call-site extractor from Section D of this file (`_shared/non-interactive.md`)" — resolves to nothing inside pmos-utilities, which has no `skills/_shared/` at all.
- **After (intent):** Canonical wording names the owning plugin explicitly, e.g. "Section D of pmos-toolkit's `skills/_shared/non-interactive.md`", so the cite survives inlining into any plugin.
- **Rationale:** A mac-health-local reword is forbidden — it would break the byte-identity lint. The only correct fix is at the canonical source followed by the repo-wide re-paste the lint already expects to be manual.
- **Blast radius:** repo-wide but mechanical — canonical `_shared/non-interactive.md`, the lint's reference copy, and every user-invocable skill carrying the inlined block in all five plugins.

### C7 — Add §J kebab-slug anchors to workflow steps (F7, Nit)
- **File/section:** `SKILL.md` · the five `### N. …` workflow headings.
- **Before:** No `{#kebab-slug}` anchors — nothing can stably cite "the safe-cleanup rules".
- **After (intent):** `{#capture-baseline}`, `{#identify-offenders}`, `{#browser-extension-leaks}`, `{#safe-cleanup}`, `{#verify-impact}` appended to the respective headings; C4's checkpoint prose cites `{#safe-cleanup}`.
- **Rationale:** §J convention; cheap now, prevents ghost references later.
- **Blast radius:** SKILL.md; `tools/lint-phase-refs.sh` validates future refs against these (stays green today).

### C8 — Ground the "hot / fans loud" triggers with a thermal probe (F8, Nit)
- **File/section:** `scripts/baseline_snapshot.sh` (new section) + `SKILL.md` Step 1 "Look for" bullets.
- **Before:** Description triggers on "hot" and "fans are loud" but no probe reads thermal state; heat is inferred from CPU% alone.
- **After (intent):** Script gains a `=== thermal state ===` section running `pmset -g therm || true` (no sudo). Step 1's "Look for" list gains one bullet: CPU speed-limit below 100 = active thermal throttling.
- **Rationale:** Closes the promise/probe gap with a one-line addition.
- **Blast radius:** baseline_snapshot.sh + SKILL.md; description unchanged.

### C9 — Cover the Chromium family the findings already claim; drop ALL top-seds (F9 Nit, amended by F12 Nit)
- **File/section:** managed-profile python (SKILL.md Step 3 + `baseline_snapshot.sh` `=== managed chrome profiles ===`); every `top … | sed …` line — explicitly: SKILL.md line 72 (`sed -n '1,80p'`, no-op), SKILL.md line 188 (`sed -n '1,25p'`, a REAL truncation of ~7 rows), and script line 17 (`sed -n '1,80p'`, no-op).
- **Before:** (a) Line 204 asserts "Managed Chrome/Edge profiles can force-install extensions", but every probe hard-codes `~/Library/Application Support/Google/Chrome`. (b) Three near-identical `top -l 1 -o cpu -n 20` invocations carry inconsistent sed tails — two no-ops (output ~32 lines < 80) and one real trim at line 188 that cuts ~7 of the requested rows.
- **After (intent):** (a) The python iterates a base-path list over the identical Chromium Local State layout — Google/Chrome, Microsoft Edge, BraveSoftware/Brave-Browser, Arc/User Data — printing per-browser results; per C2's single-home rule the enriched python lives in the script, with SKILL.md interpreting its section. (b) **Disposition per F12: NORMALIZE — drop the sed tail from all three named lines**, including line 188's `'1,25p'`. The `-n 20` flag already bounds process rows, the trim was unexplained, and Step-1 vs Step-5 before/after comparisons should read identically-shaped output. (Behavior change at line 188: +7 rows — benign, improves parity.)
- **Rationale:** Either cover Edge or stop claiming it; parameterizing is cheaper and more useful. F12 correctly flagged that pass-1's plural "the top invocations" was ambiguous about the one non-no-op sed; the disposition is now explicit per line.
- **Blast radius:** SKILL.md + baseline_snapshot.sh; overlaps C2 (python moves to script-only home).

### C10 — Stop the category awk counting itself (F11, Nit — new in pass 2)
- **File/section:** `scripts/baseline_snapshot.sh` · category awk at lines 33–44 (the single home post-C2).
- **Before:** `ps -Ao command=` snapshots while the downstream awk of the pipeline is live, and the awk program text rides that process's command line — containing the literal substrings "node " (from `/node /`), "python", and "docker". Those three counters self-match and report +1 on every run. (The Chrome/Helper patterns escape only because the on-cmdline text has `\(` where the regex needs `(`.) C5's `; next` fix does not address this.
- **After (intent):** Prepend a self-exclusion first rule to the awk program: `/awk/ {next}` — the pipeline's own awk process never reaches the counters. Safe here because "awk" is not a counted category.
- **Rationale:** Same defect family as F5 — off-by-one in the exact numbers the skill treats as evidence.
- **Blast radius:** baseline_snapshot.sh only (with C2's final shape, the awk block no longer exists in SKILL.md). No script tests exist.

## Rejections

None across both passes. All 13 findings were spot-checked against the current files (every quote grounds at its cited file:line) and accepted. Modifications from the reviewers' exact proposals, all documented above: F2/F10 (escape hatch lives in Step 1 and retains the three one-liners; only the multi-line awk is single-homed), F6 (routed to the canonical block's owner — byte-identity lint forbids a local reword), F12 (disposition chosen: normalize, drop all three seds).

## Open questions

None — no unresolved disagreements at cap.

## Implementation notes for whoever applies this

- Order matters lightly: apply C2 (restructure Steps 1–2) before C5/C10 (awk fixes land in the script only) and before C9a (python moves script-only). C1+C13-amendment, C3, C4, C7, C8 are independent.
- After edits, run pmos-toolkit's `tools/audit-recommended.sh` (C4 introduces the skill's first real call site), `tools/lint-non-interactive-inline.sh` (frozen block must remain byte-identical — C6 is deliberately NOT applied locally), and `tools/lint-phase-refs.sh` (C7 anchors + C4's `{#safe-cleanup}` cite).
- C6 is a separate cross-unit workstream (canonical block edit in pmos-toolkit + repo-wide re-paste); do not attempt it inside this unit's diff.
