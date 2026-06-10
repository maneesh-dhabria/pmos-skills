# Interactive Friction Thresholds

Used by the `#friction-pass` phase. MSF + PSYCH analysis lives in `/msf-wf` (which `/wireframes`' `#folded-msf-wf` phase delegates to) — this is a lighter pass that measures *operational cost* of completing each user journey through the running prototype.

The friction subagent walks each journey end-to-end and counts measurable interactions. It does NOT score motivation or satisfaction — that's `/msf-req` and `/msf-wf`'s job.

## Walk mode (live vs analytical)

There are two walk modes. **Live walk is the default whenever Playwright MCP is available** — analytical-only is a documented degraded fallback, not an equivalent. The two modes catch different failure classes.

### Live walk (DEFAULT — Playwright MCP available)

The subagent uses Playwright MCP to actually open the prototype in a headless browser, click through each journey step, and observe what happens:

1. Start the static server (or use the URL captured by the `#generate-devices` runtime smoke / `#index-serve`).
2. For each journey step, perform the actual click / keystroke and wait for the next screen to render.
3. Record real metrics: actual clicks issued, actual keystrokes typed, actual screens reached, actual modal interruptions encountered, actual `mockApi` latency observed (from `Date.now()` deltas around `await` boundaries).
4. **Capture a per-step screenshot** when feasible — attached to `interactive-friction.md` so flagged steps are reviewable.
5. Watch console for errors during the walk. A console error during journey traversal is a high-severity flag (the analytical pass cannot detect this).

The live walk is the only way to detect:
- Journey steps that look fine in code but fail in the browser (runtime-smoke issues that slipped through).
- Actual latency vs. nominal latency.
- Race conditions where the next screen mounts before data is ready.
- Modals that intercept clicks invisibly.

### Analytical-only walk (degraded fallback — Playwright MCP unavailable)

The subagent reads the route table from `runtime.js` and the screen components from the device file, then *analytically* counts what a user would have to do.

Limitations of analytical mode (state these honestly in the friction output):
- **Cannot detect "page didn't render"** — analytical mode counts clicks against code that may be broken.
- **Cannot measure actual latency** — uses the nominal 200–800ms range only.
- **Cannot detect runtime errors mid-journey.**
- **Cannot capture screenshots.**

When running in analytical mode, the `interactive-friction.md` file MUST include a top-of-file banner:

```markdown
> ⚠ **Walk mode: analytical-only.** Playwright MCP was unavailable, so this pass measured friction by reading code rather than executing the prototype. Open each journey in a real browser before sharing with stakeholders — analytical counts assume the page renders.
```

Do not silently produce analytical-mode output that looks like live-walk output. The two modes are not interchangeable.

## What to count

Per journey step (each screen the user passes through):

| Metric | Definition |
|--------|------------|
| **Clicks** | Distinct mouse/tap events the user must perform to advance. Reaching a CTA = 1 click. Selecting a row in a list to open detail = 1 click. Closing a modal = 1 click. |
| **Keystrokes** | Characters typed in form inputs to satisfy validation. A 5-character password = 5 keystrokes. Required + free-text fields are summed. Optional fields don't count. |
| **Decisions** | Conscious branches the user must pick from. A radio group with 3 options = 1 decision. A dropdown with default = 0 decisions IF the default works. A "Skip / Continue" pair = 1 decision. |
| **Screen transitions** | Distinct screens visited including the starting one. |
| **Modal interruptions** | Modals that appear *between* the user and their goal (consent dialogs, "are you sure?", upsells). Modals the user explicitly opened don't count. |

## Thresholds (flag when exceeded)

### First-value journey (signup → first meaningful action)

The most fragile journey. New users have low investment; friction here is fatal.

| Threshold | Severity |
|-----------|----------|
| > 12 clicks total | high |
| > 3 form steps | high |
| > 2 modal interruptions | medium |
| > 60 keystrokes total (excluding email/password) | medium |
| Any single screen with > 5 decisions | high |

### Daily-flow journey (returning user primary task)

Users are invested but impatient.

| Threshold | Severity |
|-----------|----------|
| > 6 clicks total | medium |
| > 1 form step | medium |
| Any modal interruption | medium |
| Any single screen with > 3 decisions | medium |

### Recovery journey (error → resolved state)

Users are frustrated; friction compounds.

| Threshold | Severity |
|-----------|----------|
| > 8 clicks total | high |
| Any unrecoverable dead-end (no path forward) | high |
| Error state without recovery affordance | high |
| > 2 screen transitions to recover | medium |

### Universal (any journey type)

| Threshold | Severity |
|-----------|----------|
| Any single screen with > 5 decisions | high |
| Any flow with estimated total interaction time > 60 seconds | medium |
| Any cumulative latency > 4 seconds across the journey | medium |

Estimation rule of thumb: 1 click = 1s, 1 decision = 2s, 1 keystroke = 0.3s, latency adds wall time directly.

## Output format

`{feature_folder}/prototype/interactive-friction.md`:

```markdown
# Interactive Friction Pass

Generated: YYYY-MM-DD
Prototype folder: <relative path>
Journeys analyzed: N (capped at 5)

## Journey: <name>

Type: first-value | daily-flow | recovery
Device walked: <device>

| Step | Screen | Clicks | Keystrokes | Decisions | Modal interrupts | Latency (ms) |
|------|--------|--------|------------|-----------|------------------|--------------|
| 1 | … | … | … | … | … | … |

**Totals:** clicks=N, keystrokes=N, decisions=N, transitions=N, est. time=Ns

**Flags:**
- [HIGH] > 12 clicks (signup journey threshold). Suggested cut: collapse step 3 and step 4 into one screen.
- [MEDIUM] modal interruption at step 5 (consent dialog). Suggested fix: move consent into the signup form.

(Repeat per journey)

## Cross-journey patterns

Any flag patterns that recur across journeys (e.g., "every journey has a consent modal"). High-leverage fixes go here.
```

## Subagent dispatch

One subagent per journey (parallel where available). Each subagent receives:
- Journey description from req doc
- Full text of every screen component the journey touches
- The `runtime.js` route table
- Mock-data summary so it knows what data the user will be entering vs. just selecting
- This thresholds file

Subagent returns the per-journey JSON; main agent assembles into the markdown above.

**Cap: 5 journeys per session.** More than that produces shallow output. If the req doc has more, ask the user to pick (multiSelect AskUserQuestion).
