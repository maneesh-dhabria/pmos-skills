# Notion blocks & write-path reference (single home)

The **one home** (skill-patterns §K) for every Notion-API / Notion-flavored-Markdown fact that
`/to-notion-doc`'s `SKILL.md` and `scripts/` rely on. The feature-level research lives in
`docs/pmos/features/2026-06-26_to-notion-doc/research/notion-api-findings.md`; this file distils it for the
shipped skill. SKILL.md and scripts **cite this file** — they never restate these facts inline.

## 0. Write path — markdown MCP, not the REST block API (architecture reconciliation)

The design doc (§5–§7) is written in the Notion **REST** vocabulary (`append-block-children`, block JSON,
`table_row.cells`). The Notion interface actually available to this skill is the **content MCP**, whose
write tools take **Notion-flavored Markdown (NFM)** strings, not block JSON:

- `notion-create-pages` — `pages[].content` is an NFM string; `parent` is `page_id` / `data_source_id`.
- `notion-update-page` — commands `insert_content` (append/prepend an NFM string), `replace_content`
  (`new_str`), `update_content` (search/replace `old_str`→`new_str`).
- `notion-fetch` — returns a page's content **as NFM** (used by the verification re-fetch).
- `notion-search` — find a parent page when none is given.

The raw REST block API and the **File Upload API** (§5 below) both require a **separate Notion integration
token**, which is *not* part of the MCP OAuth session. **Default posture: MCP-only — no REST.** So:

- **Structure / text / tables / toggles / callouts / colors / code / dividers / lists / equations** are
  written through the MCP as **NFM** — fully expressible (see §1). This is the production write path, always.
- **Local image upload** is the *only* capability NFM cannot express. By default (MCP-only) local images
  fall to the **local-extract stub** (an NFM callout + placeholder) — no token, no REST. The File Upload API
  rung is **opt-in only**, behind the `image_mode` preference, and is explicitly disclosed to require a
  Notion **integration token** (§5).

`scripts/map-to-notion.mjs` therefore keeps a **REST-faithful intermediate block model** — so the
fidelity invariants below are asserted in the design's own vocabulary (`table_width`, `cells`,
`is_toggleable`, the enums) — **and** renders that model to NFM for the live write. Both representations are
selftested.

## 1. Notion-flavored Markdown (NFM) — the production serialization

Source: the MCP resource `notion://docs/enhanced-markdown-spec`. Indentation is **tabs**. Escapable chars
outside code: `\ * ~ \` $ [ ] < > { } | ^`.

| Element | NFM |
|---|---|
| Heading 1–3 | `# ` / `## ` / `### ` (h4+ → `#### `, rendered as heading 4) |
| Toggle heading | `## Text {toggle="true"}` with **tab-indented children** below |
| Paragraph | plain line; blank line ⇒ `<empty-block/>` (bare blank lines are stripped) |
| Bulleted / numbered / to-do | `- ` / `1. ` / `- [ ] ` / `- [x] `; children tab-indented |
| Quote | `> Text`; multi-line quote uses `<br>` (never a real newline mid-quote) |
| Callout | `<callout icon="💡" color="blue_bg">` … `</callout>` (children tab-indented) |
| Divider | `---` |
| Code | ```` ```lang ```` fenced; content literal (no escaping inside) |
| Equation (block) | `$$` … `$$`; inline `` $`expr`$ `` |
| Image | `![Caption](URL)` — URL must resolve (external/file-upload); no local paths |
| Link / bookmark | inline `[text](url)`; a standalone URL line is written as a `[url](url)` paragraph |
| Table | `<table header-row="true" fit-page-width="true">` with `<tr><td>…</td></tr>` |

**Inline marks (rich text):** `**bold**`, `*italic*`, `~~strike~~`, `` `code` ``, `[text](url)`, and color
via `<span color="green">text</span>`. Cells may contain rich text only — never block tags or raw HTML
formatting tags (use `**` not `<strong>`).

## 2. Block catalog the converter emits

`heading_1/2/3` (+ `is_toggleable`), `paragraph`, `bulleted_list_item`, `numbered_list_item`, `to_do`,
`quote`, `callout`, `code`, `divider`, `table` + `table_row`, `image`, `bookmark`, `equation`. Unmappable
rich media → an **ambiguity placeholder** (a labelled callout, or NFM `<unknown>`), never a silent drop.

## 3. Tables — the fidelity contract (the user's "dropped rows/columns" fix)

The REST `table` block exposes only three fields: `table_width` (column count), `has_column_header`,
`has_row_header`; content is in `table_row` children whose `cells` is an **array of arrays of rich text**
(one outer entry per column; `[]` = blank cell). Invariants the mapper enforces on the intermediate model
**and** the NFM render:

- **Every row's cell count MUST equal `table_width`.** Short rows are **padded** with empty cells; over-long
  rows are **truncated and flagged**. A ragged row is the actual root cause of dropped columns. In NFM this
  is "every `<tr>` has exactly `table_width` `<td>` cells."
- **`table_width` is fixed at creation** (immutable in REST). The mapper sets it once from the **header /
  first row** width — *not* the max column count, because an over-long stray row must truncate to the table,
  not widen it. Short rows pad; over-long rows truncate and increment `truncated_rows` (surfaced in the report).
- **Create the table with ≥1 row;** append remaining rows in **≤100-row** batches (chunking, §6).
- **Full width:** not controllable in the REST block API (drop the intent there). NFM *does* expose
  `fit-page-width="true"` on `<table>`, so the NFM render sets it — the achievable win remains correct
  column/row fidelity.

## 4. Enums (validation gates — §H deterministic)

- **`code.language`** must be one of Notion's enum (`javascript`, `typescript`, `python`, `json`, `bash`,
  `shell`, `sql`, `markdown`, `html`, `css`, `yaml`, `xml`, `java`, `c`, `c++`, `c#`, `go`, `rust`, `ruby`,
  `php`, `kotlin`, `swift`, `scala`, `r`, `diff`, `docker`, `graphql`, `mermaid`, `plain text`, …). An
  unknown language degrades to **`plain text`** (never errors the write).
- **Color enum (19 values)** governs both block color and inline rich-text color: `default`, `gray`,
  `brown`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, `red`, and each `*_background`
  (NFM spells background as the `*_bg` suffix, e.g. `blue_bg`). An out-of-enum color is **rejected** by the
  integrity pass.

## 5. Image ladder (the core friction) — MCP-only default, opt-in REST upload

The MCP **cannot upload a local image** (no file-upload tool; image blocks need a resolvable URL). The image
handling is a **remembered preference** `to_notion_doc.image_mode`:

- **`mcp-only` (default)** — never touches REST. Two rungs:
  1. **External HTTPS URL already in the source** (`![](https://…)`) → pass through as an external image in
     NFM (`![alt](https://…)`; public HTTPS, no auth; Notion hotlinks, never re-hosts → breaks if the host
     dies). `scripts/upload-image.mjs` `buildExternal()`.
  2. **Local-extract stub** (always-available, no token/host) — for any local/relative image: copy it to
     `./to-notion-doc-assets/<slug>/<name>`, emit a **callout** naming the relative path + alt, then an empty
     **image placeholder** for the user to drag-drop fill in the Notion UI. Verification (§7) counts these as
     *stubbed* (accounted-for). `scripts/upload-image.mjs` `buildStub()`. The Google-Drive trick is
     researched and **rejected** (Google throttles hotlinking).

- **`rest-upload` (opt-in)** — uses the Notion **File Upload API**, which is **raw REST and requires a Notion
  integration token** (disclosed to the user when they choose this mode; env-var named by
  `to_notion_doc.notion_token_env`, default `NOTION_TOKEN`; value read from env, **never** committed/logged).
  Three raw-HTTP steps to `api.notion.com`: `POST /v1/file_uploads` → `{id, upload_url}`;
  `POST /v1/file_uploads/{id}/send` with the bytes as `multipart/form-data` under the **`file`** key; then
  attach by referencing `{type:"file_upload", id}`. Single-part **≤20 MB** API ceiling; **workspace cap is
  the real limit (5 MiB free / 5 GiB paid)** — warn past 5 MiB. The upload object **expires 1 hour** after
  creation — attach within the window. Supply a valid filename + MIME
  (`image/png|jpeg|gif|webp|svg+xml|heic|tiff|x-icon`). `scripts/upload-image.mjs` `buildUploadPlan()`.
  **If the mode is `rest-upload` but no token is present in the env, fall back to the stub** (and warn) — the
  skill never blocks on a missing credential.

The skill **asks once** (when the source has local images and no remembered `image_mode`), recommending
`mcp-only`, and telling the user that `rest-upload` needs a Notion integration token. The choice is persisted
in settings; `--image-mode` overrides for a run.

## 6. Chunking & resumable write

- **REST limits the mapper plans against:** **100 blocks per request**, **2 nesting levels per request**.
  Deeper structures (nested toggles, deep lists, columns) and tables > ~99 rows need **create-then-append**:
  write to the 2-level limit, then append children / extra rows.
- **MCP mapping:** the first batch is the `notion-create-pages` `content`; subsequent batches are
  `notion-update-page` `insert_content` (position `end`) calls. Each batch carries the **source-index range**
  it covers.
- **Resumable cursor:** persist `{page_id, last_source_index}` to a run-state file
  (`./to-notion-doc-assets/<slug>/.write-cursor.json`). A re-run with the same source + page resumes from the
  cursor instead of re-appending (idempotency key = source-block index already written).

## 7. Verification (completeness + integrity)

After writing, re-fetch the page (`notion-fetch` → NFM) and reconcile (`scripts/verify-page.mjs`):

- **Completeness:** every source block (by its stable `si` source-index) → disposition ∈
  `{mapped, stubbed, user-skipped}`. **Fail loudly** on any unaccounted-for source block.
- **Integrity:** no orphaned block (a child whose intended parent is absent); every table row's cell count ==
  the table's `table_width`; no accidentally-empty block where the source had content; all `code.language`
  in-enum (§4); all colors in-enum (§4).
- Emit a **conversion report**: block counts by type, ambiguities resolved, image dispositions, and the
  pass/fail of both passes with the offending source location on any failure.

## Sources

`research/notion-api-findings.md` (verified Notion-docs research: uploading-small-files,
sending-larger-files, importing-external-files, reference/file-object, guides/mcp/mcp-supported-tools,
reference/block, reference/patch-block-children, reference/rich-text) and the MCP resource
`notion://docs/enhanced-markdown-spec` (the NFM serialization in §1).
