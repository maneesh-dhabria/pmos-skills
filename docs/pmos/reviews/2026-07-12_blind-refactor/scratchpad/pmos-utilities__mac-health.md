## Pass 1 — reviewer findings

### mac-health-F1 [Should-fix] Bundled-script discovery is cwd-relative and dead in the common case
- Where: plugins/pmos-utilities/skills/mac-health/SKILL.md:64
- Quote: "bash "$(dirname "$(find . -path '*/mac-health/scripts/baseline_snapshot.sh' -print -quit 2>/dev/null)")/baseline_snapshot.sh" 2>/dev/null || echo "Script not found — use manual commands below""
- Problem: `find .` searches the user's *current working directory*, but installed plugin skills live under the Claude config/plugin cache, not the project cwd — so in the normal invocation the find returns nothing, `dirname ""` yields `.`, the bash call fails, and the skill silently falls to "Script not found". The bundled script is effectively dead weight for most runs. Worse, on a no-match the find walks the entire cwd tree (`-quit` only fires on a hit) — an expensive scan on a machine the user just told you is hot and slow. The model already knows the skill's own absolute path when it loads SKILL.md; the instruction should reference `scripts/baseline_snapshot.sh` relative to this skill's directory (or `${CLAUDE_PLUGIN_ROOT}`), not a filesystem hunt. Also `dirname $(find …)` + `/baseline_snapshot.sh` is a needless round-trip — `bash "$(find …)"` would do.

### mac-health-F2 [Should-fix] Diagnostic commands duplicated verbatim between SKILL.md and the script (one fact, two homes)
- Where: plugins/pmos-utilities/skills/mac-health/SKILL.md:99 (and scripts/baseline_snapshot.sh:42)
- Quote: "printf(\"chrome_renderers=%d chrome_main=%d other_renderers=%d plugins=%d node=%d python=%d docker=%d\\n\","
- Problem: The category-count awk block, the orphan `ps -eo ppid= … awk '$1==1'` one-liner, and the top-CPU/top-mem `ps` invocations appear byte-for-byte in BOTH SKILL.md (Steps 1–2) and baseline_snapshot.sh. Step 1 runs the script (which already prints "process counts by category" and "orphaned processes" sections), then Step 2 instructs re-running the exact same commands — redundant work at runtime and a classic §K drift trap at authoring time: change a pattern in one home and the other silently disagrees. The script should be the single home; SKILL.md's Step 2 should interpret the script's output sections, keeping only a short "adapt patterns manually if the script is unavailable" escape hatch.

### mac-health-F3 [Should-fix] Chrome tab inspection via AppleScript launches Chrome if it isn't running
- Where: plugins/pmos-utilities/skills/mac-health/SKILL.md:117
- Quote: "osascript <<'APPLESCRIPT'
tell application \"Google Chrome\""
- Problem: An AppleScript `tell application "Google Chrome"` LAUNCHES Chrome when it isn't already running — a diagnostic step that mutates system state and spins up one of the heaviest apps on a machine being diagnosed for heat/battery drain. It also triggers a first-time Automation permission prompt that can stall a run. The snippet needs a guard (`if application "Google Chrome" is running` / check `pgrep -x "Google Chrome"` first) so a read-only diagnosis stays read-only, consistent with the skill's own "Diagnosis is read-only and always runs" promise at line 46.

### mac-health-F4 [Should-fix] The destructive kill-confirmation exists only as prose — no auditable checkpoint
- Where: plugins/pmos-utilities/skills/mac-health/SKILL.md:46
- Quote: "never kills a process or stops a service without explicit confirmation"
- Problem: The skill's one genuinely dangerous moment — Step 4's `kill -TERM` / `pkill` — has no explicit `AskUserQuestion` call site, no `(Recommended)` option, and no `<!-- defer-only: destructive -->` tag. The repo's whole confirmation machinery (per-checkpoint classifier, audit-recommended.sh) is designed to make exactly this gate auditable, yet here it passes the audit vacuously because there are zero call sites; the actual confirmation is left to ad-hoc model judgment, and line 46 hand-restates the defer contract in bespoke prose instead of letting the tagged checkpoint drive it. Step 4 should define an explicit confirmation checkpoint (per-process or batch) carrying the defer-only destructive tag — that makes interactive behavior consistent and lets the non-interactive paragraph shrink to a citation.

### mac-health-F5 [Nit] `other_renderers` counter double-counts Chrome renderers — mislabeled bucket
- Where: plugins/pmos-utilities/skills/mac-health/scripts/baseline_snapshot.sh:34
- Quote: "/Chrome Helper \\(Renderer\\)/    {chr++}
/Chrome.app.*\\/Google Chrome$/  {chm++}"
- Problem: awk runs every pattern against every line, so a "Chrome Helper (Renderer)" process increments BOTH `chr` and `ren` — `other_renderers` is actually *all* renderers including Chrome's, contradicting its label. On a Chrome-heavy box (the skill's headline scenario) the printed numbers imply far more non-Chrome renderer load than exists, steering diagnosis toward the wrong app. Add a `next` after the Chrome match or subtract in END.

### mac-health-F6 [Nit] Frozen block cites `_shared/non-interactive.md` — no `_shared/` exists in pmos-utilities
- Where: plugins/pmos-utilities/skills/mac-health/SKILL.md:37
- Quote: "sources the shared call-site extractor from Section D of this file (`_shared/non-interactive.md`)"
- Problem: The inlined block's self-reference "Section D of this file (`_shared/non-interactive.md`)" resolves to nothing inside pmos-utilities — the plugin has no `skills/_shared/` directory at all; the canonical file lives only in pmos-toolkit. Byte-identity of the frozen block forces this dangling cite on every consumer plugin, so the defect is in the canonical block's wording (it assumes the reader sits in pmos-toolkit), not in this skill — but a reader following the cite from here hits a dead path. The canonical text should name the owning plugin explicitly (e.g., "pmos-toolkit's skills/_shared/non-interactive.md") so the cite survives inlining anywhere.

### mac-health-F7 [Nit] Workflow steps lack the §J kebab-slug anchors
- Where: plugins/pmos-utilities/skills/mac-health/SKILL.md:110
- Quote: "### 3. Handle browser-extension leaks carefully"
- Problem: The five numbered workflow steps carry no `{#kebab-slug}` anchors, contra the repo's §J phase convention. Today nothing cross-references them (so lint-phase-refs passes vacuously), but the first future skill or doc that wants to cite "the safe-cleanup rules" has no stable anchor to point at. Cheap to add now.

### mac-health-F8 [Nit] Triggers promise heat/fan diagnosis but no thermal probe exists in the workflow
- Where: plugins/pmos-utilities/skills/mac-health/SKILL.md:3
- Quote: "Use when a Mac seems hot, slow, battery-hungry, or memory-pressured."
- Problem: "hot" and "fans are loud" are two of the description's five trigger phrases, yet neither the workflow nor baseline_snapshot.sh ever reads thermal state — `pmset -g therm` (CPU speed-limit / thermal pressure, no sudo) is a one-line addition that would directly ground those triggers instead of inferring heat from CPU% alone. Small product gap between the promise and the diagnostic surface.

### mac-health-F9 [Nit] Edge named in findings, but every probe is Chrome-only
- Where: plugins/pmos-utilities/skills/mac-health/SKILL.md:204
- Quote: "Managed Chrome/Edge profiles can force-install extensions the user cannot disable"
- Problem: Common Findings asserts Edge managed-profile behavior, but the tab-inspection AppleScript, the awk categories, and the managed-profile python all hard-code Chrome paths (`~/Library/Application Support/Google/Chrome`). Edge (and Brave/Arc) use the identical Chromium Local State layout — either parameterize the base path list or drop "Edge" from the claim so the skill doesn't imply coverage it lacks. (Also minor: SKILL.md:72's `top -l 1 -o cpu -n 20 | sed -n '1,80p'` — the sed is a no-op, since `-n 20` output is ~32 lines.)

**Pass 1 verdict:** 0 blockers / 4 should-fix / 5 nits — material findings

## Pass 1 — author response

### mac-health-F1 — Accepted
- Fix: SKILL.md · Step 1 "Capture a baseline" · Replace the cwd-relative `find .` invocation with a direct plugin-rooted path: `bash "${CLAUDE_PLUGIN_ROOT}/skills/mac-health/scripts/baseline_snapshot.sh"`, plus one prose sentence telling the model that if `CLAUDE_PLUGIN_ROOT` is unset it should resolve `scripts/baseline_snapshot.sh` relative to the directory this SKILL.md was loaded from (the model knows that path at load time), and only then fall back to the manual commands. Drop the `dirname`/re-append round-trip entirely.
- Rationale: Installed skills live in the plugin cache, not the project cwd — `find .` misses in the normal case AND walks the user's whole project tree on a machine already reported hot/slow. `CLAUDE_PLUGIN_ROOT` is the sanctioned way for a plugin skill to reach its own bundled assets.
- Blast radius: SKILL.md only; script untouched. No lints/evals key on the invocation line.

### mac-health-F2 — Accepted (modified shape)
- Fix: SKILL.md · Steps 1–2 · Make baseline_snapshot.sh the single home for all diagnostic commands. Step 2 loses its duplicated awk category block and the orphan `ps -eo ppid= … awk '$1==1'` one-liner; it becomes "interpret the script's `=== process counts by category ===` and `=== orphaned processes ===` sections" with guidance on what the numbers mean. Step 1's manual command block shrinks to a short, explicitly-labeled escape hatch ("if the script is unavailable, run these; adapt patterns to what's actually running") and drops the two `ps … sort … head` lines that duplicate the script verbatim, keeping only the commands needed to reproduce the script's sections at a glance (`pmset -g batt`, `pmset -g assertions`, `vm_stat`, one `ps` line, `top -l 1 -o cpu -n 20`).
- Rationale: §K one-fact-one-home — today the awk block, orphan one-liner, and ps invocations live byte-for-byte in both files; a pattern change in one silently strands the other, and Step 2 re-runs work Step 1's script already printed. Modified from the finding's exact proposal only in that Step 1 (not Step 2) keeps the single manual escape hatch, since Step 1 is where the script-unavailable branch already lives.
- Blast radius: SKILL.md + interacts with F5 (the awk fix then lands in one place, the script). No lints touched.

### mac-health-F3 — Accepted
- Fix: SKILL.md · Step 3 tab-inspection snippet · Prefix the osascript heredoc with a guard: `if pgrep -xq "Google Chrome"; then … else echo "Chrome not running — skipping tab inspection"; fi` (or equivalent AppleScript `if application "Google Chrome" is running` inside the script). Add one prose line noting the first run may trigger a macOS Automation permission prompt.
- Rationale: A bare `tell application "Google Chrome"` launches Chrome when it isn't running — a read-only diagnostic that mutates state and spins up the heaviest app on a machine being diagnosed for heat, directly contradicting line 46's "Diagnosis is read-only and always runs".
- Blast radius: SKILL.md only.

### mac-health-F4 — Accepted
- Fix: SKILL.md · Step 4 "Safe cleanup rules" · Add an explicit confirmation checkpoint before any kill: an `AskUserQuestion` call site presenting the proposed kill list (per-process or batch), with the literal adjacent tag `<!-- defer-only: destructive -->` on the previous non-empty line. The "Destructive actions defer in non-interactive" paragraph at line 46 then shrinks to one sentence citing the tagged checkpoint (the classifier in block step 2 drives DEFER behavior; no bespoke restatement).
- Rationale: The skill's one dangerous moment currently passes `audit-recommended.sh` vacuously (zero call sites). An explicit tagged checkpoint makes interactive behavior deterministic and non-interactive DEFER auditable, per the repo's non-interactive contract.
- Blast radius: SKILL.md; `tools/audit-recommended.sh` (pmos-toolkit, scans all plugins) will now see and classify one call site — the destructive tag satisfies it. Frozen block untouched.

### mac-health-F5 — Accepted
- Fix: scripts/baseline_snapshot.sh · category awk (line 34) · Add `; next` after the `/Chrome Helper \(Renderer\)/ {chr++}` action (and after `{chm++}`) so `other_renderers`/`plugins` count only non-Chrome helpers. With F2 applied the awk lives only in the script, so the fix has exactly one home; if any manual copy survives in SKILL.md's escape hatch it gets the same `next`.
- Rationale: awk runs every pattern per line — Chrome renderers currently increment both `chr` and `ren`, so `other_renderers` overstates non-Chrome load on precisely the Chrome-heavy box the skill targets, steering diagnosis wrong.
- Blast radius: baseline_snapshot.sh (+ SKILL.md escape hatch if the block survives F2). No tests exist for the script.

### mac-health-F6 — Accepted (routed to canonical owner; no local edit)
- Fix: NOT in this unit's files. The frozen block is required byte-identical to pmos-toolkit's `skills/_shared/non-interactive.md` (enforced by `tools/lint-non-interactive-inline.sh`); editing the wording here alone would fail the lint. The fix is a canonical-block change in pmos-toolkit's `skills/_shared/non-interactive.md` step 5, rewording "Section D of this file (`_shared/non-interactive.md`)" to name the owning plugin explicitly (e.g., "Section D of pmos-toolkit's `skills/_shared/non-interactive.md`"), followed by a hand re-paste into every consumer skill across all plugins.
- Rationale: The reviewer correctly localizes the defect to the canonical wording, not this skill. Accepting it as a cross-unit change is the only lint-safe path; a mac-health-local reword is forbidden by byte-identity.
- Blast radius: repo-wide — pmos-toolkit `skills/_shared/non-interactive.md`, `tools/lint-non-interactive-inline.sh` reference copy, and every user-invocable SKILL.md carrying the block in all five plugins. Large but mechanical.

### mac-health-F7 — Accepted
- Fix: SKILL.md · Workflow headings · Add stable `{#kebab-slug}` anchors to the five step headings: `{#capture-baseline}`, `{#identify-offenders}`, `{#browser-extension-leaks}`, `{#safe-cleanup}`, `{#verify-impact}`.
- Rationale: §J convention — cheap now, and gives future cross-references (e.g., the F4 checkpoint citing "the safe-cleanup rules") a stable target instead of a bare number.
- Blast radius: SKILL.md; `tools/lint-phase-refs.sh` will validate any future refs against these anchors (currently vacuous, stays green).

### mac-health-F8 — Accepted
- Fix: scripts/baseline_snapshot.sh · add a `=== thermal state ===` section running `pmset -g therm || true`; SKILL.md · Step 1 "Look for" bullets · add one bullet: CPU speed-limit below 100 in `pmset -g therm` = active thermal throttling.
- Rationale: "hot" and "fans are loud" are headline triggers with zero thermal probe behind them; `pmset -g therm` is a one-line, no-sudo probe that grounds them directly instead of inferring heat from CPU%.
- Blast radius: baseline_snapshot.sh + SKILL.md. Description/triggers unchanged.

### mac-health-F9 — Accepted
- Fix: two parts. (a) Managed-profile python (SKILL.md Step 3 and baseline_snapshot.sh): iterate a base-path list covering the identical Chromium Local State layout — `~/Library/Application Support/Google/Chrome`, `.../Microsoft Edge`, `.../BraveSoftware/Brave-Browser`, `.../Arc/User Data` — printing per-browser results, so the "Chrome/Edge" claim at line 204 is actually covered. (b) Drop the no-op `| sed -n '1,80p'` after `top -l 1 -o cpu -n 20` in both files (with F2, only the script's copy remains).
- Rationale: Common Findings asserts Edge behavior the probes can't see; the Chromium layout is identical so parameterizing is cheaper and more honest than retracting the claim. The sed is dead weight (`-n 20` output ~32 lines < 80).
- Blast radius: SKILL.md + baseline_snapshot.sh. Note (a) partially overlaps F2's single-home move — the python should end up script-only with SKILL.md interpreting its section, same pattern as the awk block.

**Author verdict:** 9/9 accepted (F2 with a modified escape-hatch placement; F6 routed to the canonical block owner), 0 rejected, 0 invalid.

## Pass 2 — reviewer findings

### mac-health-F10 [Should-fix] C2's trimmed escape hatch cannot reproduce the sections Step 2 will now instruct interpreting
- Where: plugins/pmos-utilities/skills/mac-health/SKILL.md:71
- Quote: "ps -Ao pid,ppid,%mem,%cpu,rss,vsz,state,etime,command | sort -k3 -nr | head -n 25"
- Problem: C2 mislabels this line as "the second verbatim-duplicate `ps` line" and drops it — but it is NOT a duplicate of line 70: the column order is swapped and it sorts by %mem, i.e. it is the only memory-sorted view in the manual path, backing the skill's own "what's using so much memory" trigger. Worse, C2 simultaneously (a) rewrites Step 2 to "instruct interpreting the script's `=== process counts by category ===` and `=== orphaned processes ===` output sections" and (b) trims the Step-1 escape hatch to `pmset -g batt` / `pmset -g assertions` / `vm_stat` / one `ps` line / `top` — which reproduces NEITHER of those two sections. In the exact branch the escape hatch exists for (script unavailable — the `|| echo "Script not found` path), the model has no category-count command, no orphan one-liner, and no mem-sorted ps anywhere in the SKILL, while Step 2 points at script sections that were never emitted. As written, C2's "trimmed to the minimum needed to reproduce the script's sections" claim is self-contradicting and will be implemented wrong. The escape hatch must either include a mem-sorted ps + the orphan one-liner (cheap, two lines) or Step 2 must carry a script-unavailable interpretation branch.

### mac-health-F11 [Nit] awk category counter counts itself — node/python/docker each inflated by 1, unaddressed by C5
- Where: plugins/pmos-utilities/skills/mac-health/scripts/baseline_snapshot.sh:38
- Quote: "/node /                         {node++}
/python/                        {py++}"
- Problem: `ps -Ao command=` enumerates the awk process consuming its output, and the awk program text is on that process's command line — which contains the literal substrings "node " (inside `/node /`), "python", and "docker", so those three counters self-match and report +1 each on every run (the Chrome/Helper patterns escape this only because the on-cmdline text has `\(` where the regex needs `(`). C5 fixes the double-count with `; next` but does nothing about self-counting. Same defect family as F5 — wrong numbers in the one section the skill treats as evidence. Trivial fix: prepend `$0 ~ /awk/ {next}` or anchor the patterns, in the script (the single home post-C2).

### mac-health-F12 [Nit] C9's "drop the sed" is scoped to the '1,80p' no-ops and silently leaves Step 5's '1,25p', which is a real truncation
- Where: plugins/pmos-utilities/skills/mac-health/SKILL.md:188
- Quote: "top -l 1 -o cpu -n 20 | sed -n '1,25p'
pmset -g batt"
- Problem: C9 says to drop "the trailing `| sed -n '1,80p'` from the `top` invocations", grounding only the no-op variant (lines 72 and script 17). Step 5's verify-impact invocation uses `sed -n '1,25p'`, which is NOT a no-op — `top -l 1 -n 20` emits ~32 lines, so this one actually truncates ~7 process rows. An implementer reading "the top invocations" (plural) will plausibly strip this sed too (a behavior change C9 never weighed) or leave the skill with an unexplained asymmetry between two near-identical top commands. The proposal should name line 188 explicitly and state its disposition (keep-as-intentional-trim, drop, or normalize both to no sed).

### mac-health-F13 [Nit] C1's replacement command drops the graceful-failure guard the Before had
- Where: plugins/pmos-utilities/skills/mac-health/SKILL.md:64
- Quote: "bash \"$(dirname \"$(find . -path '*/mac-health/scripts/baseline_snapshot.sh' -print -quit 2>/dev/null)\")/baseline_snapshot.sh\" 2>/dev/null || echo \"Script not found — use manual commands below\""
- Problem: The current line, for all its faults, ends in an explicit `|| echo "Script not found — use manual commands below"` router to the escape hatch. C1's After is the bare `bash "${CLAUDE_PLUGIN_ROOT}/skills/mac-health/scripts/baseline_snapshot.sh"` with the unset-var handling relegated to a prose sentence. If the fenced command is run verbatim with `CLAUDE_PLUGIN_ROOT` unset (it is not guaranteed to be exported into every Bash-tool environment), it expands empty and fails with a cryptic `bash: /skills/mac-health/...: No such file or directory` instead of routing to the fallback. Cheap hardening the proposal should pin down: `bash "${CLAUDE_PLUGIN_ROOT:?unset — resolve the skill dir manually}/..."` or retain the `|| echo "Script not found — use manual commands below"` tail on the new command.

**Pass 2 verdict:** 0 blockers / 1 should-fix / 3 nits — material findings

## Pass 2 — author response

### mac-health-F10 — Accepted
- Fix: SKILL.md · Step 1 escape hatch + Step 2 (amends C2). The reviewer is right on both counts: line 71 is NOT a duplicate of line 70 (columns swapped, sorted by %mem — the only memory-sorted view in the manual path), and a trimmed hatch that reproduces neither `=== process counts by category ===` nor `=== orphaned processes ===` strands the exact branch it exists for. Amended C2: (a) the escape hatch RETAINS both ps views (cpu-sorted line 70 AND mem-sorted line 71) plus the orphan one-liner `ps -eo ppid=,pid=,%cpu=,%mem=,etime=,command= | awk '$1==1' | sort -k3 -nr | head -20`, each annotated as a mirror of the script's like-named section; (b) only the large category-count awk block is removed from SKILL.md — Step 2 interprets the script's category section and carries a one-sentence manual approximation for the script-unavailable branch (per-category `ps -Ao command= | grep -c '<pattern>'`), so no branch dead-ends. The three retained one-liners are small, explicitly labeled as script-section mirrors, and the drift-prone multi-line awk stays single-homed.
- Rationale: §K single-home is for the drift-prone block, not a mandate to make the fallback path non-functional; self-sufficiency of the `|| echo "Script not found"` branch wins for the one-liners.
- Blast radius: SKILL.md only; supersedes C2's escape-hatch inventory. No lints/evals affected.

### mac-health-F11 — Accepted
- Fix: scripts/baseline_snapshot.sh · category awk (lines 33–44, the single home post-C2). Prepend a self-exclusion first rule `/awk/ {next}` so the pipeline's own awk process (whose ps command line carries the program text containing literal "node ", "python", "docker") never reaches the counters. Verified mechanism: `ps -Ao command=` snapshots while the downstream awk is live, and the program text rides its command line — the Chrome patterns escape only because their on-cmdline text has `\(` where the regex needs `(`. Excluding awk-anything is safe here: "awk" is not one of the counted categories.
- Rationale: Same defect family as F5 — off-by-one in the exact numbers the skill treats as evidence; +1 on node/python/docker every run.
- Blast radius: baseline_snapshot.sh only (with F10's amendment, the awk block no longer exists in SKILL.md). No script tests exist.

### mac-health-F12 — Accepted
- Fix: SKILL.md · Step 5 "Verify impact", line 188 (extends C9b). Explicit disposition: NORMALIZE — drop the `| sed -n '1,25p'` at line 188 too, so all three `top -l 1 -o cpu -n 20` invocations (SKILL.md 72, 188; script 17) are sed-free. The `-n 20` flag already bounds process rows; the '1,25p' trim cuts ~7 of the 20 requested rows for no articulated reason, and before/after comparisons (Step 1 vs Step 5) should read identical command output. C9b's wording is amended from "the top invocations" to name all three lines explicitly.
- Rationale: The asymmetry is unexplained and the plural wording in C9 was genuinely ambiguous — an implementer needed a stated disposition for the non-no-op sed.
- Blast radius: SKILL.md (+ script line 17 already covered by C9b). Behavior change is +7 rows in Step 5 output — benign, improves before/after parity.

### mac-health-F13 — Accepted
- Fix: SKILL.md · Step 1 invocation (amends C1). The After command retains the explicit failure router: `bash "${CLAUDE_PLUGIN_ROOT:-}/skills/mac-health/scripts/baseline_snapshot.sh" 2>/dev/null || echo "Script not found — use manual commands below"`. The `:-` default prevents `set -u` environments erroring on the expansion itself; the `|| echo` tail routes both the unset-var miss and any script failure to the escape hatch instead of a cryptic `No such file or directory`. The prose sentence (resolve `scripts/baseline_snapshot.sh` relative to the loaded SKILL.md's directory before falling back) stays as the second-chance step between the failed command and the manual block.
- Rationale: C1 traded away the one good property of the Before line; fenced commands get run verbatim, so graceful failure must live in the command, not only in prose.
- Blast radius: SKILL.md only.

**Author verdict (pass 2):** 4/4 accepted (F10 amends C2, F12 extends C9, F13 amends C1; F11 is a new script-only fix), 0 rejected, 0 invalid. Unit CAPPED at pass 2 with no unresolved disagreements.
