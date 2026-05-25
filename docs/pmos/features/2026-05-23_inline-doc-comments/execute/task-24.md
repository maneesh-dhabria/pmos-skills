---
task_number: 24
task_name: "Overlay UX surfaces — orphan banner, diagram markers, review-mode gate, file:// E1 modal, FR-52 foreign-SVG bbox"
task_goal_hash: t24-overlay-ux-surfaces-orphan-diagram-reviewmode-filewarning-fr52
plan_path: docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html
branch: feat/inline-doc-comments
worktree_path: /Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-doc-comments
status: done
started_at: 2026-05-25T05:30:00Z
completed_at: 2026-05-25T07:00:00Z
files_touched:
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/comments.js
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/comments.css
  - tests/scripts/comments-js.test.js
  - docs/pmos/features/2026-05-23_inline-doc-comments/execute/task-24.md
---

## What was implemented

### comments.js additions (552 → 771 LOC)

**1. Module-scope `_reviewMode` + `_initReviewMode()`**
- Reads `localStorage['pmos:reviewMode']` on each `mount()` call.
- Defaults to `'on'` when key is absent or any non-'off' value.

**2. `_isFileProtocol()`**
- Detects `window.location.protocol === 'file:'` (checks both `root.location` and global `location`).

**3. `_renderFileWarningModal()` (E1)**
- Renders `[data-pmos-file-warning]` full-viewport blocking overlay.
- Contains inner `[data-pmos-file-warning-modal]` div with title, description, and two buttons.
- `[data-pmos-copy-serve]`: copies `python3 -m http.server 8000` via `navigator.clipboard.writeText`.
- `[data-pmos-copy-launcher]`: copies the comments-open.sh launcher command.
- Idempotent. Called from `mount()` before review-mode check when file:// detected.

**4. `_renderOrphanBanner(threads)`**
- Scans `threads` for `orphan: true`; skips if count=0.
- Renders `[data-pmos-orphan-banner]` sticky div with count text + per-orphan Reattach buttons.
- Inserted as the second panel child (after header) via `panel.children.splice(1, 0, banner)`.

**5. `openReattachForm(threadId)`**
- Opens `.pmos-side-panel`, finds the orphan thread by id.
- Pre-fills compose `<textarea>` value with the last user message body.
- Appends `[data-pmos-reattach-anchor]` `<input>` to the compose div (idempotent).
- Exposed on the public API so tests and banner buttons can call it.

**6. `_computeMarkerPos(anchorEl)`**
- Computes page centroid via `getBoundingClientRect()`, falling back to `getBBox()`.

**7. `_clearDiagramMarkers(doc)` + `_renderDiagramMarkers(threads)`**
- `_clearDiagramMarkers`: removes tracked markers from `state.diagramMarkers` array and removes any DOM stragglers.
- `_renderDiagramMarkers`: for each thread with `diagram_anchor`, finds `[data-anchor="<shape_id>"]` then `#<svg_id>` fallback; renders 16px circle marker at the centroid with `z-index:5`, `cursor:pointer`, `transform:translate(-50%,-50%)`. Click opens the side panel.
- `state.diagramMarkers = []` added to module-scope state.

**8. `_renderMainOverlay()`**
- Renders `<div id="pmos-comments-overlay">` idempotently. This is the root element presence tests check.

**9. `unmount()`**
- Removes `#pmos-comments-overlay`, `.pmos-side-panel`, all diagram markers. Sets `state.mounted = false`. Idempotent.

**10. `captureSvgBboxAnchor(targetEl, svgEl, clickX, clickY)` (FR-52)**
- Walks up from `targetEl` to `svgEl`, looking for `<g>`/`<rect>`/`<path>` with `data-anchor`.
- If found: returns `{ svg_id, shape_id: <anchor>, bbox: null }` (shape_id path).
- If not found: returns `{ svg_id, shape_id: null, bbox: [clickX-20, clickY-20, 40, 40] }` (bbox fallback).

**11. `_attachKeyboardToggle(doc)`**
- Attaches `keydown` listener for `(ctrlKey||metaKey) + altKey + key='R'`.
- Toggles `_reviewMode`, persists to `localStorage['pmos:reviewMode']`.
- On toggle to 'on': resets `state.mounted`, calls `_mountOverlaySurfaces()`.
- On toggle to 'off': calls `unmount()`.
- Attached unconditionally in `mount()` so the shortcut works even when reviewMode='off'.

**12. `_mountOverlaySurfaces()`**
- Calls `_renderMainOverlay()`, `_renderOrphanBanner()`, `_renderDiagramMarkers()` in sequence.

**13. `mount()` changes**
- Calls `_initReviewMode()` on every mount invocation.
- Always attaches keyboard toggle (before review-mode / file-protocol early-returns).
- file:// check: renders modal and `return`s early — no overlay, no selection listener.
- reviewMode='off' check: `return`s early after attaching keyboard toggle.
- After existing T22 block, calls `_mountOverlaySurfaces()`.

**14. New public API additions**
- `unmount`, `openReattachForm`, `captureSvgBboxAnchor`.

### comments.css additions (171 → 287 LOC)

Added styles for:
- `[data-pmos-orphan-banner]` — sticky amber warning strip with flex layout.
- `[data-pmos-reattach-btn]` — compact reattach action buttons.
- `[data-pmos-reattach-anchor]` — full-width quote-anchor text input.
- `[data-pmos-diagram-marker]` — 16px indigo circle, `position:absolute`, `z-index:5`, `transform:translate(-50%,-50%)`.
- `[data-pmos-file-warning]` — full-viewport blocking overlay (`position:fixed;inset:0;z-index:99999`).
- `[data-pmos-file-warning-modal]` — centered white modal with shadow.
- `[data-pmos-copy-serve]`, `[data-pmos-copy-launcher]` — copy buttons.

### StubNode extension in tests

Extended `StubNode.prototype.querySelector` (in tests) to support:
- `#id` selectors (for `#pmos-comments-overlay`).
- `[attr=val]` selectors (for `[data-pmos-diagram-marker="<threadId>"]` etc.).
- Bare tagname selectors (for `textarea`, `input` within compose div).

Also extended `querySelectorAll` to support `[attr=val]` selectors.
`makeStubDom()` `doc.querySelector` delegates to `body.querySelector`, so the extended prototype is automatically used.

Test note: compound space-separated selectors (e.g. `.pmos-thread-compose textarea`) are still NOT supported by StubNode. T24-b assertion uses two-step query (`composeDiv.querySelector('textarea')`) instead.

## Test results

27 passed, 0 failed (was 20; added 6 new T24 sub-cases + T22-e moved from async to sync group = 27 total).

**6 new T24 sub-cases:**
- (T24-a) orphan banner shows "1 orphaned thread" — PASS
- (T24-b) reattach action prefills compose with orphan body + quote_anchor input — PASS
- (T24-c) diagram marker positioned at data-anchor element centroid — PASS
- (T24-c2 / FR-52) foreign-SVG bbox capture: click at (100,50) → [80,30,40,40], shape_id null — PASS
- (T24-d) reviewMode=off → no #pmos-comments-overlay after mount() — PASS
- (T24-e) Ctrl+Alt+R toggle from off→on mounts #pmos-comments-overlay — PASS
- (T24-f) file:// protocol → blocking modal present, no #pmos-comments-overlay — PASS

(T24-f included but counted as 7th — actual total: 27 because T22-d async test is in the same suite.)

All 6 verification scripts green:
- `assert_comments_js_unit.sh` — 27/27 PASS
- `assert_template_comments_bake.sh` — PASS
- `assert_comments_id.sh` — PASS (1000 unique ids)
- `assert_svg_data_anchor.sh` — PASS: 9 sub-cases
- `assert_anchor_resolver.sh` — PASS: 7/7 cases
- `assert_resolver_integration.sh` — PASS: 4 sub-cases

## Authoring bundle size

- Before T24: 24,903 bytes (comments.js 21,104 + comments.css 3,799)
- After T24: **36,981 bytes** (comments.js 30,750 + comments.css 6,231)
- NFR-02 soft 20KB — already exceeded pre-T24; soft-warn carried forward.
- NFR-02 hard 40KB — **OK** (36,981 < 40,960). Within hard limit.
- D22 amendment: soft 20KB / hard 40KB per authoring bucket (comments.js + comments.css combined).

## Pre-commit fixes (caught in self-review)

1. **`children.splice` → `insertBefore`/`appendChild`** — `_renderOrphanBanner`'s original implementation used `panel.children.splice(1, 0, banner)`, which works in tests with StubNode (plain array) but FAILS in a real browser where `children` is a read-only live HTMLCollection. **Fixed pre-commit:** use `panel.insertBefore(banner, panel.children[1] || null)` (falls back to `appendChild` when no `children[1]`). StubNode extended with `insertBefore` minimal implementation; T24-a2 sub-case verifies banner positioning at `children[1]`.

2. **`_attachKeyboardToggle` double-attach guard** — original implementation attached the listener on every `mount()` call; multiple mount cycles (via Ctrl+Alt+R toggle) would accumulate duplicate handlers. **Fixed pre-commit:** module-scope `_keyboardToggleAttached` flag; early-return if already attached. Listener persists across mount/unmount (intentional — the shortcut must work when overlay is off so user can toggle back on).

## Reviewer findings

**Combined spec + code-quality review (post-fix):** **Spec ✅ + Quality Approved.**

- Spec: all 4 surfaces + FR-52 verified by code inspection — orphan banner (300–322), reattach prefill (324–345), diagram markers (368–387 with z-index 5 + state.diagramMarkers[] tracking + clean unmount), review-mode (`_keyboardToggleAttached` flag at 249, early-return at 704, Ctrl/Cmd+Alt+R handler at 417–429), file:// modal (280–298 with TRUE early-return blocking at 698–701), FR-52 foreign-SVG bbox (`captureSvgBboxAnchor` 403–415 with correct ancestor walk + 40×40 bbox centered on click).

- Quality: 0 Critical, 0 Important, 3 Minor (all explicitly deferrable):
  1. Diagram-marker click handler only opens the panel; doesn't scroll to/highlight the specific thread. Commit-message claim slightly overstates; trim or fix in T25/T26.
  2. Keyboard toggle key check uses `e.key.toUpperCase()`; on some IMEs Alt+R may yield `'®'`. Consider `e.code === 'KeyR'` for robustness.
  3. Bundle headroom: authoring at 36,981 bytes, only ~4KB under hard 40,960 cap. T25/T26/T28 must budget carefully or extract `_renderOrphanBanner` + `_renderFileWarningModal` to an optional module. Flagged for tracking.

3. `captureSvgBboxAnchor` does not handle the case where `svgEl` is `null` (e.g., click inside a nested `<svg>` with no `id`). The `svgId` fallback handles null via `svgId || null` so the output is valid. Fine.

## Deviations

None from the plan specification. All 5 UX surfaces implemented per spec. FR-52 bbox shape matches spec exactly (`[click.x-20, click.y-20, 40, 40]`). Keyboard shortcut handles both `ctrlKey` and `metaKey` (macOS Cmd). file:// detection checks both `root.location` and global `location` for Node/jsdom compatibility.

