---
name: mac-health
description: Use when a Mac seems hot, slow, battery-hungry, or memory-pressured. Diagnoses orphaned processes, browser extension leaks, stale dev services, and sleep blockers before recommending cleanup. Use when the user says "my Mac is slow", "battery is draining", "fans are loud", "what's using so much memory", or "clean up background processes".
user-invocable: true
argument-hint: "[--non-interactive | --interactive]"
---

# Mac Health Diagnostics

## Overview

Diagnose first, kill later. Start with current CPU, memory, battery, and parent-child process evidence. Separate active work from detached leftovers before recommending cleanup.

The canonical non-interactive block below handles `mode` resolution + per-checkpoint classifier + OQ buffer + end-of-skill summary. Do not paraphrase or move this block.

<!-- non-interactive-block:start -->
1. **Mode resolution.** Compute `(mode, source)` with precedence: `cli_flag > parent_marker > settings.default_mode > builtin-default ("interactive")` (FR-01).
   - `cli_flag` is `--non-interactive` or `--interactive` parsed from this skill's argument string. Last flag wins on conflict (FR-01.1).
   - `parent_marker` is set if the original prompt's first line matches `^\[mode: (interactive|non-interactive)\]$` (FR-06.1).
   - `settings.default_mode` is `.pmos/settings.yaml :: default_mode` if present and one of `interactive`/`non-interactive`. Unknown values → warn on stderr `settings: invalid default_mode value '<v>'; ignoring` and fall through (FR-01.3).
   - If `.pmos/settings.yaml` is malformed (not parseable as YAML, or missing `version`): print to stderr `settings.yaml malformed; fix and re-run` and exit 64 (FR-01.5).
   - On Phase 0 entry, always print to stderr exactly: `mode: <mode> (source: <source>)` (FR-01.2).

2. **Per-checkpoint classifier.** Before issuing any `AskUserQuestion` call, classify it (FR-02):
   - The defer-only tag, if present, is the literal previous non-empty line: `<!-- defer-only: <reason> -->` where `<reason>` ∈ {`destructive`, `free-form`, `ambiguous`} (FR-02.5).
   - Decision (in order): tag adjacent → DEFER; multiSelect with 0 Recommended → DEFER; 0 options OR no option label ends in `(Recommended)` → DEFER; else AUTO-PICK the (Recommended) option (FR-02.2).

3. **Buffer + flush.** Maintain an append-only OQ buffer in conversation memory. On each AUTO-PICK or DEFER classification, append one entry per the schema in spec §11.2. At end-of-skill (or in a caught error before exit), flush (FR-03):
   - Primary artifact is single Markdown → append `## Open Questions (Non-Interactive Run)` section with one fenced YAML block per entry; update prose frontmatter (`**Mode:**`, `**Run Outcome:**`, `**Open Questions:** N` where N counts deferred only — see FR-03.4) (FR-03.1).
   - Skill produces multiple artifacts → write a single `_open_questions.md` aggregator at the artifact directory root; primary artifact's frontmatter `**Open Questions:** N — see _open_questions.md` (FR-03.5).
   - Primary artifact is non-MD (SVG, etc.) → write sidecar `<artifact>.open-questions.md` (FR-03.2).
   - No persistent artifact (chat-only) → emit buffer to stderr at end-of-run as a single block prefixed `--- OPEN QUESTIONS ---` (FR-03.3).
   - Mid-skill error → flush partial buffer under heading `## Open Questions (Non-Interactive Run — partial; skill errored)`; set `**Run Outcome:** error`; exit 1 (E13).

4. **Subagent dispatch.** When dispatching a child skill via Task tool or inline invocation, prepend the literal first line: `[mode: <current-mode>]\n` to the child's prompt (FR-06).

5. **Call-site auditing (CI only).** This runtime classifier reads the call it is about to make — it does not run awk. Static/offline auditing of `AskUserQuestion` call sites across SKILL.md files is performed by `tools/audit-recommended.sh`, which sources the shared call-site extractor from Section D of this file (`_shared/non-interactive.md`). Runtime and audit therefore share one decision contract without inlining the extractor into every skill (FR-02.6).

6. **Refusal check.** If this SKILL.md contains a `<!-- non-interactive: refused; ... -->` marker (regex: `<!--[[:space:]]*non-interactive:[[:space:]]*refused`), and `mode` resolved to `non-interactive`: emit refusal per Section A and exit 64 (FR-07).

7. **Pre-rollout BC.** If the `--non-interactive` argument is present BUT this SKILL.md does NOT contain the `<!-- non-interactive-block:start -->` marker (i.e., this skill hasn't been rolled out yet): emit `WARNING: --non-interactive not yet supported by /<skill>; falling back to interactive.` to stderr; continue in interactive mode (FR-08).

8. **End-of-skill summary.** Print to stderr at exit: `pmos-toolkit: /<skill> finished — outcome=<clean|deferred|error>, open_questions=<N>` (NFR-07).
<!-- non-interactive-block:end -->

**Destructive actions defer in non-interactive.** Diagnosis is read-only and always runs. `/mac-health` never kills a process or stops a service without explicit confirmation; in `--non-interactive` mode it does **not** auto-confirm those — it completes the diagnosis, lists the recommended cleanups as **deferred actions**, and performs none of them.

## When to Use

- Mac battery is draining unusually fast
- Fans, heat, or sluggishness suggest background load
- Memory pressure, compression, or swap seem high
- The user suspects orphaned processes, browser helpers, or stale dev services

Do not kill Docker, browsers, VPN/security agents, or app processes the user still needs without explicit confirmation.

## Workflow

### 1. Capture a baseline

Run the bundled snapshot script:

```bash
bash "$(dirname "$(find . -path '*/mac-health/scripts/baseline_snapshot.sh' -print -quit 2>/dev/null)")/baseline_snapshot.sh" 2>/dev/null || echo "Script not found — use manual commands below"
```

Or run manually:

```bash
ps -Ao pid,ppid,%cpu,%mem,rss,vsz,state,etime,command | sort -k3 -nr | head -n 25
ps -Ao pid,ppid,%mem,%cpu,rss,vsz,state,etime,command | sort -k3 -nr | head -n 25
top -l 1 -o cpu -n 20 | sed -n '1,80p'
pmset -g batt
pmset -g assertions
vm_stat
```

Look for:

- `ppid 1` on long-running high-CPU processes (likely orphans)
- High compressor or heavy swap activity
- Large browser/editor/Docker footprints
- Sleep blockers in `pmset -g assertions`

### 2. Identify likely offenders

Count processes by category. Adapt the patterns to what's actually running:

```bash
ps -Ao command= | awk '
/Chrome Helper \(Renderer\)/    {chr++}
/Chrome.app.*\/Google Chrome$/  {chm++}
/Helper \(Renderer\)/           {ren++}
/Helper \(Plugin\)/             {plg++}
/node /                         {node++}
/python/                        {py++}
/docker/                        {dock++}
END {
  printf("chrome_renderers=%d chrome_main=%d other_renderers=%d plugins=%d node=%d python=%d docker=%d\n",
    chr,chm,ren,plg,node,py,dock)
}'
```

Find orphaned processes (ppid 1 = detached from parent):

```bash
ps -eo ppid=,pid=,%cpu=,%mem=,etime=,command= | awk '$1==1' | sort -k3 -nr | head -20
```

### 3. Handle browser-extension leaks carefully

If browser helper processes are excessive, determine whether this is a tab problem, extension problem, or managed-profile problem.

**Inspect open tabs** (Chrome):

```bash
osascript <<'APPLESCRIPT'
tell application "Google Chrome"
  set out to {}
  repeat with w in windows
    repeat with t in tabs of w
      set end of out to (title of t) & tab & (URL of t)
    end repeat
  end repeat
  return out
end tell
APPLESCRIPT
```

**Check for managed-profile extensions** that may be force-installed:

```bash
python3 - <<'PY'
import json, os, sys

base = os.path.expanduser('~/Library/Application Support/Google/Chrome')
state_path = os.path.join(base, 'Local State')
try:
    with open(state_path) as f:
        state = json.load(f)
except Exception:
    sys.exit(0)

profiles = state.get('profile', {}).get('info_cache', {})
for name, info in profiles.items():
    managed = info.get('is_managed', False)
    if managed:
        print(f"[{name}] {info.get('name', '?')} — managed by {info.get('hosted_domain', '?')}")
        pref_path = os.path.join(base, name, 'Preferences')
        try:
            with open(pref_path) as f:
                prefs = json.load(f)
            ext_count = len(prefs.get('extensions', {}).get('settings', {}))
            print(f"  extensions: {ext_count}")
        except Exception:
            pass
PY
```

If an extension is "Installed by administrator", do not suggest disabling it — note it as a managed policy item.

### 4. Safe cleanup rules

Only kill detached or explicitly-approved processes.

```bash
# Kill specific orphaned processes by PID
kill -TERM <pid> ...

# Or by exact pattern (never use broad patterns)
pkill -TERM -f '<exact-process-pattern>'
```

After any kill, re-check:

- The target is gone (`ps -p <pid>`)
- The PID was not reused by a different process
- Helpers don't immediately respawn
- If they respawn, whether they're attached to a live parent or orphaned again

**Never** use destructive system-wide cleanup commands. **Never** restart Docker, browsers, or security agents unless the user explicitly asks.

### 5. Verify impact

Always measure after cleanup:

```bash
top -l 1 -o cpu -n 20 | sed -n '1,25p'
pmset -g batt
```

Summarize before vs after:

- Process counts (by category)
- Approximate memory recovered
- CPU idle improvement
- Battery estimate change
- What still remains active and why

## Common Findings

- `ppid 1` + long runtime + high CPU = detached leftover (safe to kill after confirmation)
- Thousands of browser helpers = usually extension or managed-profile issue, not too many tabs
- Managed Chrome/Edge profiles can force-install extensions the user cannot disable
- After orphan cleanup, remaining drain is often active browser renderers or long-lived dev stacks (Docker, webpack, vite)
- Sleep assertion blockers (`pmset -g assertions`) can prevent sleep and drain battery overnight
