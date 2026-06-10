# /prototype Smoke Test Recipe

End-to-end verification needs a real feature folder with `/wireframes` output. Run this after installing the skill (`/reload-plugins` or restart Claude Code).

## Recipe

1. Pick a feature folder that already has `/wireframes` output (look under `docs/features/`).
2. Run `/pmos-toolkit:prototype <path-to-req-doc>` for that feature.
3. Verify each phase:

| Phase | Verification |
|-------|--------------|
| `#pipeline-setup` | Skill loads workstream + learnings without error; feature folder resolves |
| `#locate-inputs` | Detects existing wireframes; auto-triggers `/wireframes` if missing; the prototype's question is stated and confirmed at the gate |
| `#design-context` | DESIGN.md resolved (or targeted bootstrap offered); `design-overlay.css` + `design-tokens.js` land in `prototype/assets/` |
| `#tier-gate` | Honors tier gating (Tier 1 exits, Tier 2 prompts, Tier 3 announces mandatory) |
| `#mock-data` | Generates `assets/<entity>.json` with domain-real data; user review prompt fires |
| `#shared-runtime` | Generates `runtime.js`, `components.js`, `styles.css` (parallel where possible); `prototype.css` copied |
| `#generate-devices` | Produces one `index.<device>.html` per device; runtime smoke passes (or degraded banner emitted); all screens reachable |
| `#review` | Reviewer subagent runs ≤2 loops per file; review log appears as HTML comment at top of each device file |
| `#friction-pass` | Friction pass produces `interactive-friction.md` (capped at 5 journeys) |
| `#findings` | Findings surface via `AskUserQuestion` (≤4 per batch, capped at 12 total) |
| `#index-serve` | Landing `index.html` generated; both URL + file path printed |
| `#spec-handoff` | Req doc gets `## Prototype` section appended (incl. `Question:` + `Verdict:` lines); commit succeeds |
| `#workstream-enrichment` | Workstream enriched if loaded in `#pipeline-setup` |
| `#capture-learnings` | Capture-learnings reflection runs |

## Browser checks (after generation)

Open `index.html` and each `index.<device>.html`:

- [ ] No console errors on first paint
- [ ] Every wireframe screen reachable via navigation
- [ ] Forms validate and submit (mock latency 200–800ms)
- [ ] CRUD persists across navigations (lost on reload — correct)
- [ ] Loading / error / empty states visible
- [ ] `?inject-errors=/some/path` triggers the error state for that route
- [ ] Opening directly via `file://` works (inline-data fallback kicks in)
- [ ] Mock data feels domain-real (no "User 1", no Lorem ipsum)
- [ ] High-fi styling matches wireframes' brand tokens

## If any phase fails

Capture in `~/.pmos/learnings.md` under `## /prototype`:

```markdown
- {date}: {phase} failed because {reason}. Fix: {what would prevent this}.
```

Re-run after fix. Iterate.
