# DESIGN.md Resolver

How `/wireframes` (and `/verify`'s drift check) finds, loads, and merges a DESIGN.md for a given feature.

---

## Inputs

- Current working directory.
- Workstream context (if loaded), specifically the `## Wireframes & Design System` section.

---

## Output

An in-memory **merged DESIGN.md object** plus the resolved file path(s):

```
{
  app_dir:           "apps/web",
  design_md_path:    "apps/web/DESIGN.md",
  components_md_path:"apps/web/COMPONENTS.md",
  parent_path:       "packages/ui/DESIGN.md" | null,
  merged:            <YAML object after x-extends cascade>,
  staleness:         "fresh" | "stale" | "unknown",
  stale_files:       [list of paths changed since x-source.sha]
}
```

---

## Step 1 — Resolve target app

### 1a. Check workstream

If a workstream is loaded and `## Wireframes & Design System` has `target_app.path` set:
- Use it as `app_dir`.
- If the persisted `confirmed_at` is older than 90 days OR the user's current feature topic strongly mismatches the persisted app (heuristic: feature name doesn't appear in any file under `app_dir/src/`), re-confirm via AskUserQuestion before reusing.
- Otherwise reuse silently.

### 1b. Detect frontend apps

If no workstream value, walk the repo to find frontend apps. A directory qualifies if any of:

- `package.json` whose dependencies include `react`, `vue`, `svelte`, `next`, `nuxt`, `@remix-run/*`, `solid-js`, `astro`, `preact`.
- `tailwind.config.{js,ts,cjs,mjs}` exists.
- A CSS file with a `:root { --* }` block exists.

Common shapes the walk should consider:
- Repo root (single-app).
- `apps/*`, `packages/*-web`, `packages/web/*`, `frontend/`, `web/`, `client/`, `services/web*`.

Deduplicate ancestor paths — keep the deepest qualifying directory.

### 1c. Pick one

| Detected | Action |
|---|---|
| 0 candidates | Greenfield. `app_dir = <repo root>`. Caller (extractor) handles greenfield path. |
| 1 candidate | Use it without prompting. Announce. |
| 2+ candidates | `AskUserQuestion` (single-select). Options: each candidate path + "None — use repo root with default style". Cap at 4 options; if more, batch sequentially. |

After picking, persist to workstream `target_app.path` and `target_app.confirmed_at` (today's ISO date).

### 1d. Platform fallback (no AskUserQuestion)

Pick the candidate with the most `.tsx`/`.vue`/`.svelte` files. Announce the assumption.

---

## Step 2 — Resolve DESIGN.md path

Walk in this order; first hit wins:

1. `<app_dir>/DESIGN.md`
2. `<app_dir>/../packages/ui/DESIGN.md`
3. `<app_dir>/../packages/design-system/DESIGN.md`
4. `<repo-root>/packages/ui/DESIGN.md` (if not already covered by #2)
5. `<repo-root>/DESIGN.md`

Record which path was found as `design_md_path`. If none found, return `design_md_path: null` (caller invokes the extractor).

`COMPONENTS.md` is always located in the same directory as the resolved `DESIGN.md` (`<dirname design_md_path>/COMPONENTS.md`). May be absent — that's fine.

---

## Step 3 — Resolve `x-extends` cascade

If the resolved DESIGN.md has `x-extends: <relative-path>` in front matter:

1. Resolve the path relative to the child's directory.
2. **Cycle detection:** maintain a set of visited paths during the walk. If a path repeats, abort with a loud error: "x-extends cycle detected: A → B → A". Fall back to child-only and emit a warning.
3. **Missing parent:** if the parent file does not exist, log a warning ("x-extends parent not found: <path>"), fall back to child-only, continue.
4. **Recursive:** parents may themselves declare `x-extends`. Walk the chain, but cap depth at 5.

### Merge rules

Once the chain is resolved (oldest ancestor first):

1. Start with the oldest ancestor's full YAML object.
2. For each descendant in order, **deep-merge** onto the accumulator:
   - Objects: merge key-by-key; overlapping keys recurse.
   - Arrays: replace wholesale (no element-wise merge — too surprising).
   - Scalars: replace.
3. **Special-case `x-source`:** never inherited. Each file's `x-source` describes only that file. After the merge, `x-source` reflects the **child** (most-derived) file.
4. **Special-case `x-extends`:** stripped from the merged result. Consumers see a flat object.

The merged object is what's passed to generators and to the CSS overlay producer.

---

## Step 4 — Staleness check

Compare `x-source` against current HEAD.

### When to skip the check

- `x-source.source == "interactive-elicitation"` → no `extracted_from` paths. `staleness = "unknown"`. Skip.
- `x-source.source == "hand-written"` → user owns freshness. `staleness = "unknown"`. Skip.
- `x-source.applied == false` → user discarded extraction. Skip whole DESIGN.md (treat as not found for this run).

### Otherwise

1. Read `x-source.sha` and `x-source.extracted_from`.
2. Run `git log --pretty=format:%H -- <each file in extracted_from>` and grab the most recent SHA per file.
3. If any file has a newer commit than `x-source.sha`, mark `staleness = "stale"` and record the file paths in `stale_files`.
4. If `x-extends` is in play, repeat the check on the parent's `x-source` too. The chain is only as fresh as its oldest stale link.

### What to do with staleness

The resolver doesn't act on staleness — it just reports it. The caller (`/wireframes` Phase 2a or `/verify` drift check) decides:

- `/wireframes` Phase 2a: AskUserQuestion: **Re-extract** / **Use as-is** / **Abort**.
- `/verify` drift check: include stale files in the drift detection scope.

---

## Step 5 — Persist back to workstream

After successful resolution, update the workstream `## Wireframes & Design System` section with all four fields:

```yaml
target_app:
  path: "apps/web"
  confirmed_at: "2026-05-02"
design_md_path: "apps/web/DESIGN.md"
components_md_path: "apps/web/COMPONENTS.md"
last_extraction_sha: "4af3e8392b1a"   # only update on extract; reads don't bump this
```

`last_extraction_sha` is set by the extractor and by `/verify`'s drift check, **not** by a plain resolver call.

---

## Workstream section format

If the section doesn't exist yet, create it at the end of the workstream file in this shape:

```markdown
## Wireframes & Design System

target_app:
  path: apps/web
  confirmed_at: 2026-05-02
design_md_path: apps/web/DESIGN.md
components_md_path: apps/web/COMPONENTS.md
last_extraction_sha: 4af3e8392b1a
```

The body is YAML inside a markdown section — the workstream file remains markdown; pipeline skills parse this section as YAML.

---

## Failure modes

| Failure | Resolver behavior |
|---|---|
| No `.git` directory | Skip workstream persistence; resolution still works. |
| Multiple candidates and user picks "None" | `app_dir = <repo root>`; `design_md_path = null`; caller treats as greenfield. |
| `x-extends` cycle | Warn loudly, fall back to child-only, continue. |
| `x-extends` parent missing | Warn, fall back to child-only, continue. |
| Stale check `git log` fails | `staleness = "unknown"`; continue. |
| Workstream write fails | Warn, continue (resolution result is still valid in-memory). |

The resolver never blocks the run on a non-fatal failure — it degrades gracefully and reports.
