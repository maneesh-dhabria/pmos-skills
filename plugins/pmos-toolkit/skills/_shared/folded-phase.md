# Folded Phases — Shared Mechanics

> Canonical mechanics for "folding" a sibling skill into a host pipeline skill as one of its phases. The host SKILL.md cites this file and states only its parameters: the folded skill, the escape flag, the host artifact the apply-loop edits, the commit-message prefix, and the `state.yaml` phase key.

Current foldings: /requirements folds /msf-req (`--skip-folded-msf`); /wireframes folds /msf-wf (`--skip-folded-msf-wf`); /spec folds /simulate-spec (`--skip-folded-sim-spec`) and /architecture (`--skip-folded-arch`); /verify folds /architecture (`--skip-folded-arch`). The standalone sibling skill stays independently invocable; the folded path is the default trigger inside the pipeline.

A folding uses the sections that apply to its shape: **apply-loop foldings** (msf-req, msf-wf, simulate-spec — the folded skill proposes edits to the host's artifact) use all sections below; **dispatch-only foldings** (architecture — a subagent emits its own findings triplet, no host-artifact edits) use only the escape flag, tier gating, and failure-capture sections.

## Escape flag

Every folded phase has a boolean `--skip-folded-<name>` flag that short-circuits the phase entirely — no dispatch, no state mutation beyond a notes record. These flag names are **machine-coupled** (orchestrators and state records pass them as literal strings) and are **never renamed**. Record the skip in `state.yaml.phases.<host>.notes` so /verify's folded-phase awareness can distinguish a documented skip from a silent bypass.

## Tier gating

Tier 1: skip. Tier 2: optional (user opt-in). Tier 3: default-on. (Tier semantics: `_shared/tier-matrix.md`.)

## Pre-apply clobber guard

Before opening an apply-loop that edits the host artifact, check that it is clean:

```bash
git status --porcelain "{feature_folder}/<host-artifact>.html"
```

The guard targets the **`.html` artifact the host actually writes** (HTML-primary since v2.33.0) — never a legacy `.md` path. A guard pointed at a file the skill no longer writes silently never fires, which defeats its purpose.

If the status is non-empty, emit:

```
WARNING: <artifact> has uncommitted edits — folded <folded-skill> apply-loop will skip auto-apply to avoid clobbering. Run /<host> --skip-folded-<name> OR commit your edits first.
```

Then skip auto-apply (fall through to manual disposition) but still run the critique and emit the findings doc — the analysis retains advisory value even when nothing can be applied.

## Auto-apply threshold

Findings at or above the confidence threshold (default 80; `--msf-auto-apply-threshold N` overrides it, shared across all folded apply-loops) auto-apply as inline edits to the host artifact. Sub-threshold findings surface via the structured ask with options `Apply now / Defer to OQ (Recommended) / Reject`.

## Per-finding commits

Each auto-applied finding is its own git commit:

```
<host>: auto-apply <folded-skill> finding F<N>
```

The commit body carries `Depends-on: F<M>` when F<N> requires F<M> to land first. Never batch multiple findings into one commit: commits-as-state is the resume cursor — on `--resume`, the apply-loop greps `git log --since=<phase.started_at>` to skip already-applied findings — and /complete-dev's release-notes recipe consumes the trailers.

## Failure capture + advisory continue

On any folded-skill failure (crash, timeout, schema hard-fail), capture `{folded_skill: <name>, error_excerpt: <first-200-chars>, ts: <ISO-8601>}` and append it to `state.yaml.phases.<host>.folded_phase_failures[]` per the dedup rule in `feature-sdlc/reference/state-schema.md`. At the moment of append, emit:

```
WARNING: <folded-skill> crashed (advisory continue per D11): <error_excerpt>
```

(The `per D11` token is part of the emitted log-line contract — keep it verbatim.) Folded-phase failures **never halt the host skill** — continue to the next phase. /feature-sdlc surfaces accumulated failures in its summary; /verify re-emits one advisory warning per entry and still PASSes when everything else is green. The rationale: a folded phase is an enhancer, not a gate — a crashed enhancer should cost the user a warning, not the run.

## Output slug

Folded findings docs use the `<folded-skill>-findings` slug (`msf-req-findings.md`, `msf-wf-findings/<wireframe-id>.md`) — never a generic `msf-findings.md`, which collides across foldings.

## Consumers

requirements, spec, wireframes, verify, feature-sdlc, complete-dev

---

*Spec lineage: `2026-05-10_pipeline-consolidation` (folding contract, escape flags, pre-apply guards, per-finding commits, output slugs), `2026-05-28_architecture-in-feature-sdlc` (dispatch-only foldings); `.md`→`.html` guard-target correction per the 2026-06-10 skill-design review.*
