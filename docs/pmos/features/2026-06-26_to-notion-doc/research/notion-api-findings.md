# Notion API / MCP research findings (2026-06-26)

Grounded research for `/to-notion-doc`. Two verified-source passes; all claims carry Notion-docs citations.
This file is the **canonical reference** the design + skill cite for image-upload and table behaviour.

## A. Images — the central friction the user hit

### What the official Notion MCP can and cannot do
- The official Notion MCP server (`https://mcp.notion.com/mcp`) exposes: `notion-search`, `notion-fetch`,
  `notion-create-pages`, `notion-update-page`, `notion-move-pages`, `notion-duplicate-page`,
  `notion-create-database`, `notion-update-data-source`, `notion-create-view`, `notion-update-view`,
  `notion-query-data-sources`, `notion-query-database-view`, `notion-query-meeting-notes`,
  `notion-create-comment`, `notion-get-comments`, `notion-get-teams`, `notion-get-users`,
  `notion-get-async-task`.
- **There is NO file-upload tool and NO dedicated image-block tool.** Page icon/cover accept only
  `emoji | custom-emoji-by-name | external URL`. So **the MCP server alone cannot embed a local image.**
  (Confirms the user's assumption: MCP needs a hosted URL.)

### The real fix — Notion File Upload API (GA 2025), raw HTTP, NOT via MCP
Three-step flow (single-part / small files):
1. `POST https://api.notion.com/v1/file_uploads` → returns `{ id, upload_url }` (default `mode` single-part).
2. `POST https://api.notion.com/v1/file_uploads/{id}/send` → bytes as `multipart/form-data`, file under the
   **`file`** key (not JSON). Status `pending → uploaded`.
3. Attach by referencing the id: pass `{"type":"file_upload","id":"<id>"}` to an **image/file/video/audio/PDF
   block** via Append-block-children, or to a page icon/cover. The id is reusable across pages/blocks.

Limits: single-part **≤20 MB**; multi-part (>20 MB) needs `mode:"multi_part"` + `number_of_parts`, parts
5–20 MB each (except last), then `.../complete`. **Workspace cap is the true ceiling: 5 MiB free / 5 GiB
paid** — a single >5 MiB image fails on a free workspace even though the API accepts 20 MB. Upload object
**expires 1 hour** after creation — must attach within the window. Supply a valid filename + supported MIME
(`image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/svg+xml`, heic, tiff, ico).

> Requires a **direct Notion integration token** (an internal-integration secret), separate from the MCP
> OAuth session. This is the key architectural fork for the design.

### External URL images
`{"type":"external","external":{"url":"https://…"}}` — must be **public HTTPS, no auth**. Notion does NOT
re-host; it hotlinks and returns the URL as-is forever → breaks if the host dies/rotates. Hosting burden is
permanent and on you.

### Google Drive workaround — works but brittle; NOT recommended
A Drive `/file/d/<ID>/view` link is an HTML viewer, not an image. Must convert to
`https://drive.google.com/thumbnail?id=<ID>` (size-capped) or `https://drive.google.com/uc?export=view&id=<ID>`,
with General Access = "Anyone with the link". Google increasingly throttles/blocks `uc?export=view`
hot-linking under load. Manual stopgap only — do not automate on it.

### Recommended ladder (descending preference)
1. **File Upload API, single-part** (≤20 MB API / ≤5 MiB free-plan) — default when a Notion integration
   token is available.
2. **File Upload API, multi-part** — assets >20 MB on a paid workspace (rare for doc images).
3. **External URL on a durable HTTPS host/CDN** the user controls — when no token, or one canonical copy
   reused across pages.
4. **MCP + external URL** — only when constrained to MCP and a public URL already exists.
5. **Local-extract stub (the user's "worst-case backup")** — copy each image into a local
   `./to-notion-doc-assets/` folder beside the trigger dir, emit a `callout` naming the relative path +
   filename, followed by an empty `image` placeholder block for the user to fill manually. This is the
   final, always-available rung — no token, no host, no network beyond MCP.

## B. Tables — why they render badly, and the correct contract

`table` block fields (only three): `table_width` (int, columns), `has_column_header` (bool),
`has_row_header` (bool). Content lives entirely in `table_row` children: `cells` = **array of arrays of rich
text** (one outer entry per column; `[]` for a blank cell).

Invariants that fix the user's "dropped rows/columns / malformed markup" pain:
- **Every `table_row.cells` length MUST equal `table_width`.** Ragged rows fail or mis-render. Blank cell =
  empty rich-text array `[]`, never a missing entry. ← this is the actual root cause of dropped columns.
- **`table_width` is set once at creation and is immutable** — updating it via Update-block fails.
- **Must create the table with ≥1 `table_row` child**; append remaining rows after via
  `PATCH /v1/blocks/{table_id}/children`.
- **There is NO full-width / width property in the table block API.** Full-width is a page-display setting,
  **not controllable via the API.** → drop any "make the table full-width" intent; it cannot be done
  programmatically. The achievable win is correct column/row fidelity.
- 100-block-per-request limit applies to rows → chunk large tables into ≤100-row batches (create-then-append).

Correct 2-col × 3-row table (header row) example is in §1 of the tables research (cells arrays each length 2).

## C. Block catalog (conversion-relevant) + limits
- Toggle heading = `heading_{1,2,3}.is_toggleable: true` with nested `children` (a plain heading cannot have
  children). This is the mechanism behind the heading-style preference.
- `callout`: `{ rich_text, icon:{type:"emoji",emoji:"💡"}, color }`.
- One 19-value color enum governs BOTH rich-text annotation color and block color: `default`, `gray`,
  `brown`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, `red`, and each `*_background`.
- `code.language` must be from Notion's enum (`javascript`, `python`, `typescript`, `json`, `bash`, `sql`,
  `markdown`, `plain text`, …) — invalid language string errors.
- **100 blocks / request; 2 levels of nesting / request.** Deeper structures (nested toggles, `column_list`→
  `column`→content, deep lists, big tables) need create-then-append: emit to the 2-level limit, capture
  returned ids, append children to them.
- `column_list` needs ≥2 `column` children, each with ≥1 child — already 3 levels deep, so columns generally
  require create-then-append.

## Sources
Notion Docs: uploading-small-files, sending-larger-files (multi-part), importing-external-files,
reference/file-object, guides/mcp/mcp-supported-tools, reference/block, reference/patch-block-children,
reference/rich-text, reference/update-a-block. GitHub: makenotion/notion-mcp-server. StackOne MCP deep-dive.
