# Wireframe Patterns Library

Opinionated, lightweight pattern references the `/wireframes` skill loads on demand. Every component in a feature's inventory should map to one pattern file here. Each file describes **when to use**, **anatomy**, **required states**, **best practices** (cross-referenced to `reference/eval-rubric.md` heuristic IDs), **common mistakes**, **device variants**, and a **skeleton snippet** using the shared `wireframe.css` vocabulary.

## How the skill uses this library

- **`#component-breakdown` step 2 (component inventory):** for each component, find a matching pattern below. Tag the inventory row with `pattern: <category>/<file>`. If no match → tag `pattern: novel` and flag for human review.
- **`#generate` (generation):** each subagent receives ONLY the pattern files for its assigned components (typically 1–3 files), not the whole library.
- **`#review` (review):** reviewer subagent receives the same pattern files + `eval-rubric.md`. Findings cite both: "violates `forms/inline-validation.md` rule 4 + heuristic N5".

## Pattern index

### Navigation

| Pattern | When to use |
|---------|-------------|
| [navigation/top-nav.md](navigation/top-nav.md) | Primary horizontal nav for desktop; 5–7 destinations max |
| [navigation/side-nav.md](navigation/side-nav.md) | Persistent left rail for apps with 7+ destinations or hierarchical IA |
| [navigation/bottom-tab-bar.md](navigation/bottom-tab-bar.md) | Mobile/native primary nav, 3–5 destinations |
| [navigation/breadcrumbs.md](navigation/breadcrumbs.md) | Show position in 3+ level hierarchies; never on flat IAs |
| [navigation/hamburger-menu.md](navigation/hamburger-menu.md) | Mobile secondary nav or desktop overflow only — never primary on desktop |
| [navigation/pagination.md](navigation/pagination.md) | Lists/tables with bounded sets, predictable navigation |
| [navigation/tabs.md](navigation/tabs.md) | Switch between peer views of the SAME entity |

### Forms

| Pattern | When to use |
|---------|-------------|
| [forms/text-input.md](forms/text-input.md) | Single-line free text |
| [forms/textarea.md](forms/textarea.md) | Multi-line free text, ≥ 2 lines expected |
| [forms/select-dropdown.md](forms/select-dropdown.md) | Pick one from 4–15 known options |
| [forms/date-picker.md](forms/date-picker.md) | Calendar dates; never use 3 separate inputs |
| [forms/file-upload.md](forms/file-upload.md) | User uploads files |
| [forms/multi-step-form.md](forms/multi-step-form.md) | 4+ logical groups or 8+ fields |
| [forms/inline-validation.md](forms/inline-validation.md) | Field-level feedback BEFORE submit |
| [forms/search.md](forms/search.md) | Free-text query against a corpus |

### Data display

| Pattern | When to use |
|---------|-------------|
| [data-display/table.md](data-display/table.md) | Comparable rows, scannable columns, sorting/filtering |
| [data-display/list.md](data-display/list.md) | Sequential items, one-dimensional |
| [data-display/card-grid.md](data-display/card-grid.md) | Visual browsing of peer items |
| [data-display/detail-view.md](data-display/detail-view.md) | Single entity's full data |
| [data-display/key-value-pair.md](data-display/key-value-pair.md) | Metadata, attributes, settings readout |
| [data-display/stats-dashboard.md](data-display/stats-dashboard.md) | Top-line metrics with at-a-glance scanning |

### Feedback

| Pattern | When to use |
|---------|-------------|
| [feedback/toast.md](feedback/toast.md) | Transient confirmation, non-blocking |
| [feedback/modal.md](feedback/modal.md) | Focused subtask requiring user attention |
| [feedback/confirmation-dialog.md](feedback/confirmation-dialog.md) | Destructive or irreversible actions |
| [feedback/banner.md](feedback/banner.md) | Persistent, page-level information |
| [feedback/inline-error.md](feedback/inline-error.md) | Field-scoped error feedback |
| [feedback/loading-skeleton.md](feedback/loading-skeleton.md) | Content loading > 300 ms |
| [feedback/empty-state.md](feedback/empty-state.md) | Container with no items yet |
| [feedback/error-state.md](feedback/error-state.md) | Failure with recovery path |

### Actions

| Pattern | When to use |
|---------|-------------|
| [actions/primary-cta.md](actions/primary-cta.md) | The single most important action on a screen |
| [actions/button-group.md](actions/button-group.md) | Related, mutually exclusive or stacked actions |
| [actions/dropdown-menu.md](actions/dropdown-menu.md) | 3+ secondary actions, overflow |
| [actions/fab.md](actions/fab.md) | Mobile/native primary creation action |

### Layout

| Pattern | When to use |
|---------|-------------|
| [layout/page-header.md](layout/page-header.md) | Title, context, page-level actions |
| [layout/two-column-layout.md](layout/two-column-layout.md) | Persistent nav/filter + main content |
| [layout/sidebar-detail.md](layout/sidebar-detail.md) | List on left, selected detail on right |
| [layout/settings-page.md](layout/settings-page.md) | Grouped configurable preferences |

### Content

| Pattern | When to use |
|---------|-------------|
| [content/avatar.md](content/avatar.md) | Identify a user/entity |
| [content/badge.md](content/badge.md) | Status, count, or category indicator |
| [content/progress-indicator.md](content/progress-indicator.md) | Show progress through a known-length task |
| [content/tooltip.md](content/tooltip.md) | Brief supplementary info on hover/focus |

## Sources synthesized

- Nielsen Norman Group (UX research articles, 1995–present)
- Apple Human Interface Guidelines (iOS/macOS)
- Material Design 3 (Google)
- WAI-ARIA Authoring Practices Guide (W3C)
- *Refactoring UI* (Wathan & Schoger)
- Don't Make Me Think (Krug)
- Inclusive Components (Heydon Pickering)

## Pattern file template

```markdown
# <Pattern name>

## When to use
- Specific trigger 1
- Specific trigger 2

## When NOT to use
- Anti-trigger → use [other-pattern.md] instead

## Anatomy
1. Required element
2. Required element
3. Optional element

## Required states
- default / loaded
- empty (if applicable)
- loading
- error
- ... pattern-specific states

## Best practices
1. Rule (heuristic-id) — rationale
2. Rule (heuristic-id) — rationale

## Common mistakes
- Mistake → why it fails → fix

## Device variants
- mobile-web / native: ...
- desktop: ...

## Skeleton

\`\`\`html
<!-- minimal example using wireframe.css vocabulary -->
\`\`\`
```
