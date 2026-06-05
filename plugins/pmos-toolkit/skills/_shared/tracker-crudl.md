# Tracker CRUDL — Shared Contract

Authoritative contract for pmos **tracker** skills: file-backed stores where each record is a markdown file (YAML frontmatter + optional freeform body), fronted by a regenerable `INDEX.md`. `/backlog`, `/mytasks`, and `/people` all bind this contract.

Each tracker's own `schema.md` declares only its **bindings** — its field set, enum allowed-values, grouping/sort/columns, store root, and keying scheme — and **cites this file for the invariants below instead of restating them**. When an invariant here and a binding in a skill's `schema.md` appear to disagree, this file wins for the invariant; the skill's `schema.md` wins for its own fields.

---

## 1. Record store

- Each record is one markdown file: YAML frontmatter, then an optional freeform body whose conventional H2 sections are a per-skill binding.
- The store root and keying scheme are per-skill bindings (e.g. numeric `{id}-{slug}.md` under `items/`, or name-derived `{handle}.md`). See the skill's `schema.md`.

## 2. Keying & filenames (numeric-id stores only)

Not every tracker uses a numeric id — some key by a derived handle. For stores that DO use a sequential id:

- `id`: 4-digit zero-padded sequential integer (`0001`, `0002`, …). Per-store counter; no global coordination. Allocate `max(existing id) + 1`; never reuse a freed id.
- `slug`: kebab-cased title, max 60 chars, ASCII letters/digits/hyphens only, no leading or trailing hyphens.
- Filename: `{id}-{slug}.md`.

## 3. Universal frontmatter fields

Every record, in every tracker, carries:

- `schema_version`: integer, current = `1`. **Absent means `1`** (records written before versioning validate as v1). Written on create; preserved verbatim on edit. Bump only via a documented migration; a reader seeing a higher version than it knows MUST refuse rather than guess.
- `created`: ISO date (`YYYY-MM-DD`), set on create, **never** modified thereafter.
- `updated`: ISO date, rewritten on **every** mutating op.

## 4. Field discipline

- **Enum validation.** Each enum field has a closed allowed-value set in the skill's `schema.md`. The skill MUST validate against it and MUST NOT invent new values.
- **Unrecognized fields.** Preserved verbatim on edit, ignored on read. Never dropped.
- **Empty optional fields.** Whether an unset optional is written as an absent key or a present-empty key is a per-skill binding (see each `schema.md` "Defaults on create").

## 5. INDEX.md (regenerable cache)

- `INDEX.md` at the store root is a cache, **never the source of truth** — the record files are.
- Regenerate it from the record files on **every mutating op** and on the skill's explicit rebuild command.
- The first line after the `# <Title>` heading is `Last regenerated: {today ISO date}`.
- Grouping, sort order, and columns are per-skill bindings (see `schema.md`).
- Empty optional fields render as **empty cells** — never `null`, never `-`.
- Archived records are NEVER listed in `INDEX.md`.
- **Freshness check.** If any record file's mtime is newer than INDEX's `Last regenerated:` date, treat INDEX as stale and regenerate before any read that relies on it.

## 6. Archive

Not every tracker archives. For stores that DO:

- Archived records live at `archive/YYYY-QN/{filename}` (the quarter of archival), with full content preserved.
- The archive mirrors the live store's layout; archived records are never written to `INDEX.md`.
- Archiving is a **move, not a delete** — content is retained.

---

## Binding checklist (what a tracker's `schema.md` must declare)

A tracker `schema.md` cites this file for the invariants above and declares only:

1. Store root + keying scheme (§1, §2).
2. The full frontmatter field table + each enum's allowed values (§3, §4).
3. Defaults on create / capture.
4. Body section conventions.
5. INDEX grouping / sort / columns (§5).
6. Whether it archives, and if so the archive root (§6).
