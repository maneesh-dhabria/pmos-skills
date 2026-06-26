# pmos-toolkit

**Help me ship a feature.** pmos-toolkit is the delivery pipeline — requirements → spec → plan → execute → verify → complete-dev — plus the authoring and release skills that support it. Drive a feature from a fuzzy idea to a tagged release without leaving your terminal; each stage is a slash command that produces a reviewable artifact and hands off to the next.

## Skills

### Delivery pipeline
- **/requirements** — Brainstorm and create a requirements document; auto-tiers by scope (bug fix / enhancement / feature).
- **/spec** — Create a detailed technical specification from a requirements document.
- **/plan** — Turn a spec into a TDD execution plan with inline verification and decision logging.
- **/execute** — Implement a plan task-by-task with TDD and deploy verification; supports worktree isolation.
- **/verify** — Post-implementation gate: lint, test, deploy, spec compliance, multi-agent review, QA.
- **/complete-dev** — End-of-development release orchestrator (merge, changelog, version bump, tag, push); `--epic` runs the three-loop release train.
- **/feature-sdlc** — End-to-end SDLC orchestrator across all of the above; also `skill`, `prototype`, `define`, and `build` modes. `/skill-sdlc` and `/prototype-sdlc` are thin aliases.

### Discovery & design
- **/shape** — Collaboratively explore the problem space before solutioning — floor/ceiling/context lens-ledger probing into a converged problem brief.
- **/ideate** — Turn a fuzzy idea into a pressure-tested one-page brief.
- **/grill** — Adversarially interview you about a plan, spec, or design to surface shaky assumptions.
- **/creativity** — Apply structured creativity techniques to requirements before /spec.
- **/ripple-effects** — Simulate first-, second-, and third-order effects via the Futures Wheel.
- **/research** — PM decision-support deep-research skill: fan-out sourcing, tiered source verification, and a synthesized cited report.
- **/simulate-spec** — Pressure-test a spec against realistic and adversarial scenarios.
- **/wireframes** — Static mid-fi HTML wireframes plus a Figma-like canvas viewer.
- **/prototype** — High-fidelity, single-HTML interactive prototype stitched from wireframes.
- **/design-crit** — Critique an app, wireframes, or prototype against a Nielsen + WCAG rubric.
- **/msf-req** / **/msf-wf** — End-user Motivation/Satisfaction/Friction evaluation of requirements / wireframes.

### Authoring & artifacts
- **/artifact** — Generate and refine PM/eng artifacts (PRD, design docs, discovery doc) from context.
- **/landing-page** — Guided product landing-page generator: cited brief → approved sections → 2–3 hero options → visual-style selector → single self-contained HTML.
- **/diagram** — Generate a single themed SVG diagram from a description.
- **/logo** — Propose and generate on-brand SVG logo candidates from a brief.
- **/polish** — Critique and refactor a single document (Markdown or HTML) for clarity and de-AI-slop.
- **/readme** — Audit, scaffold, or update READMEs against a binary rubric and a simulated reader.
- **/summary-tldr** — Faithful, grounded TL;DR of any content (URL, PDF, text, image, podcast, video).
- **/explainer-video** — Turn a doc, artifact, or URL into a narrated slideshow `.mp4`.
- **/architecture** — Audit a repo against tiered architectural principles; emit an HTML+MD+JSON triplet.
- **/survey-design** / **/survey-analyse** — Design a methodologically sound survey, then analyse fielded responses.

### Tracking & release support
- **/backlog** — Lightweight, AI-readable backlog of epics and stories driving the define → build → release loops.
- **/mytasks** — Persistent personal task tracker (LNO importance, due dates, projects, recurrence).
- **/people** — Shared person/contact directory consumed by /mytasks.
- **/product-context** — Persistent workstream context that enriches every pipeline skill.
- **/changelog** — Generate user-facing changelog entries at merge time.
- **/comments** — Resolve open inline-doc-comment threads on a pmos HTML artifact.
- **/session-log** — Capture what you built, decided, and learned as dated bullets.

## Install

```
/plugin marketplace add maneesh-dhabria/pmos-skills
/plugin install pmos-toolkit@pmos-skills
```

## Repository

Part of the [pmos-skills](https://github.com/maneesh-dhabria/pmos-skills) marketplace, alongside `pmos-learnkit`, `pmos-utilities`, and `pmos-gamekit`.
