---
id: 6
title: "/polish — optionally honor HTML for URL / Notion inputs (currently always normalized to markdown)"
type: feature
status: wontfix
priority: could
labels: [polish, format-honoring, future]
created: 2026-05-13
updated: 2026-06-12
source: docs/pmos/features/2026-05-13_polish-editorial-pass/01_requirements.html (explicit non-goal §non-goals)
spec_doc:
plan_doc:
pr:
parent:
dependencies: []
---

## Context

pmos-toolkit 2.40.0 made `/polish` round-trip the source format for **local files**: `.md` → `.polished.md`, `.html` → `.polished.html`, with HTML-aware lock zones. URL and Notion inputs still normalize to markdown by design — the rationale in the requirements was "URL/Notion HTML is page chrome, not an authored artifact, so flattening to markdown is the right default."

That's the right default but it's not the right *only* behavior. Real cases where a user has an authored HTML doc behind a URL (a confluence page they own, a static-site `https://example.com/draft.html`, a Notion page they want as web-publishable HTML rather than markdown) currently can't get HTML back from `/polish`.

## Acceptance Criteria

- A flag (likely `--keep-html` or `--source-format html`) makes URL / Notion inputs flow through the HTML path: `doc_format = html`, HTML-aware lock zones, HTML chunk anchors, output as printed HTML (no file write — URL/Notion inputs still don't have a local file path to write next to).
- The flag is documented in `argument-hint`, in Phase 1, and in the new behaviour anti-pattern ("Do NOT round-trip HTML through markdown" — clarify that this is the case for *local* HTML, and `--keep-html` opts URL/Notion into the same).
- Notion's HTML export contains a lot of platform chrome (`<div class="notion-page-content">`, page metadata, etc.) — decide whether the Notion HTML path strips chrome (probably yes, like the markdown path does today) or hands the raw HTML through.

## Notes

Out of scope for 2.40.0 — explicit non-goal in the requirements doc. Promote when a real user hits the limitation.
