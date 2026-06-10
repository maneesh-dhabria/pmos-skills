# Frontend detection heuristic (`/feature-sdlc`)

Used in Phase 3b (the `/wireframes` gate) to bias the `(Recommended)` option of the `AskUserQuestion`. **The gate is always presented** — this heuristic only chooses which side carries the `(Recommended)` tag. **Never silently skip the gate.**

Inputs the heuristic reads, in order of precedence:

1. The requirements doc written in Phase 3 (`<feature_folder>/01_requirements.md`).
2. The original initial-context input (text or file the user passed to `/feature-sdlc`).

---

## Step 1 — Explicit tag wins

If the requirements doc's frontmatter contains an explicit `frontend:` field:

- `frontend: true` → recommend `Run wireframes`.
- `frontend: false` → recommend `Skip wireframes`.

The explicit tag short-circuits the keyword scan entirely.

---

## Step 2 — Keyword scan (when no explicit tag)

Count occurrences of each list against the requirements doc body (case-insensitive, word boundaries). The initial-context input is a tiebreaker if the requirements doc body is short.

**Positive signals** (suggest UI work):

```
ui, ux, screen, screens, page, pages, component, components,
wireframe, wireframes, css, html, visual, click, clicks,
form, forms, button, buttons, layout, design, mockup,
modal, tooltip, navigation, dashboard, view, views, render,
frontend, front-end, web, mobile, app, gui, dropdown, menu,
field, fields, input, inputs, label, labels, banner, sidebar
```

**Negative signals** (suggest backend / non-UI work):

```
api-only, backend, back-end, daemon, cron, worker, library,
sdk, cli-only, headless, batch, etl, pipeline-only,
script, scripts, microservice, microservices, queue, job
```

**Recommendation rule:**

- `count(positive) - count(negative) > 0` → recommend `Run wireframes`.
- otherwise → recommend `Skip wireframes`.

If both counts are 0, recommend `Skip wireframes` (no UI signal at all).

---

## The invariant

Whatever the heuristic decides, the gate's `AskUserQuestion` is **always issued** with both `Run wireframes` and `Skip wireframes` available. The user always sees the choice. The heuristic only swaps which is `(Recommended)`.

This is asymmetric on purpose: a false-skip (heuristic says no UI but the feature does have UI) silently kills the wireframes stage and leads to UX gaps; a false-prompt is one extra click. Always-asking eliminates the silent-skip footgun.

---

## Anti-patterns

- **Don't bypass the gate based on confidence.** "I'm 95% sure this is backend-only, skipping the prompt." Don't. The user always sees the choice.
- **Don't infer from the initial-context length alone.** A two-sentence initial-context that mentions "form" once still triggers the gate.
- **Don't treat the keyword lists as exhaustive.** They're a starting bias. The user's reply is the source of truth.
