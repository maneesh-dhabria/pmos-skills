# Tracker CRUDL — Shared Contract

Authoritative contract for pmos **tracker** skills: file-backed stores where each record is a markdown file (YAML frontmatter + optional freeform body), fronted by a regenerable `INDEX.md`. `/backlog`, `/mytasks`, and `/people` all bind this contract.

Each tracker's own `schema.md` declares only its **bindings** — its field set, enum allowed-values, grouping/sort/columns, store root, and keying scheme — and **cites this file for the invariants below instead of restating them**. When an invariant here and a binding in a skill's `schema.md` appear to disagree, this file wins for the invariant; the skill's `schema.md` wins for its own fields.

---

## 1. Record store

- Each record is one markdown file: YAML frontmatter, then an optional freeform body whose conventional H2 sections are a per-skill binding.
- The store root and keying scheme are per-skill bindings (e.g. numeric `{id}-{slug}.md` under `items/`, or name-derived `{handle}.md`). See the skill's `schema.md`.

## 2. Keying & filenames (numeric-id stores only)

Not every tracker uses a numeric id — some key by a derived handle. **This section is the single home of the id-format and validator rules** — a numeric-id store cites it and never restates the format (§K canonical-home). For stores that DO key by an `id`:

### 2.1 Id format — three permanently-valid forms

A record's `id` is exactly one of:

- **Current scheme — `<YYMMDD>-<rand3>` (year-prefixed, coordination-free).** Two-digit year + two-digit month + two-digit day, a hyphen, then **3 lowercase Crockford-base32 chars** — alphabet `0-9 a-z` **minus `i l o u`** (look-alike removal), i.e. `0123456789abcdefghjkmnpqrstvwxyz`. Example: `260612-k3f`. The `YYMMDD` is a **human hint, not a sort key** (the year is 2-digit and wraps every century) — true chronology comes from the `created:` field (§3). Per-day key space = 32³ ≈ 32 768, ample for a personal tracker; the rare same-day collision is caught by the consumer's merge-time uniqueness gate, never by a counter.
- **Prior scheme — `<MMDD>-<rand3>` (grandfathered).** The year-less form (`0612-k3f`) minted before the year prefix was added. **Still valid, never rewritten** — referenced by `parent:`, `dependencies:`, branch names, claim locks, and released changelog entries. No *new* ids are minted in this form; new mints carry the year prefix (see §2.3).
- **Legacy serial — 4-digit zero-padded integer** (`0001`, `0002`, … `0019`). **Grandfathered: still valid, never rewritten, never reused** — legacy serials are referenced by `parent:`, `dependencies:`, branch names, claim locks, and released changelog entries, so rewriting one is a corruption. No *new* ids are minted in this form by any store (see §2.3).

**Triple-accepting validator** (every reader MUST accept all three forms): `^([0-9]{4}|[0-9]{4}-[0-9a-hj-km-np-tv-z]{3}|[0-9]{6}-[0-9a-hj-km-np-tv-z]{3})$`. The three arms are unambiguous, distinguished by digit count before the (optional) `-`: a legacy id is exactly 4 digits with no `-`; a prior `<MMDD>-<rand3>` id is 4 digits + `-` + 3 base32 chars; a current `<YYMMDD>-<rand3>` id is 6 digits + `-` + 3 base32 chars. The `-` separator and the 4-vs-6 digit count distinguish the schemes at a glance and in regexes.

### 2.2 Slug + filename

- `slug`: kebab-cased title, max 60 chars, ASCII letters/digits/hyphens only, no leading or trailing hyphens.
- Filename: `{id}-{slug}.md` — `id` is treated as an **opaque string** by every consumer (filename, `define/{id}` & `feat/{id}` branches, `claims/{id}.lock`, `parent:`/`dependencies:` refs). All three id forms are valid in all of these. **No consumer may lexical-sort ids** as a chronology proxy — ids are non-monotonic; sort on `created:` instead (§5).

### 2.3 Allocation — coordination-free, no global counter

- **Every id-keyed store mints `<YYMMDD>-<rand3>` ids** — derive from the local date (year-prefixed) + a random suffix, with **no `max(existing)+1`, no per-store counter, and no shared lock**. This holds for **both** a store with a concurrent-allocation surface (e.g. `/backlog`, minted in parallel `define` sessions across the `origin` + mirror clone topology) **and** a single-store, single-user tracker (e.g. `/mytasks`): the date+rand scheme is the uniform mint (D2/D3). Collisions are prevented by construction and backstopped by the consumer's merge-time uniqueness gate. The randomness source must not be a call banned in resume-sensitive skill scripts (`Math.random()` / `Date.now()`) — mint via a dedicated tool sourcing `crypto`, or accept the id as an input.
- **No store mints legacy 4-digit serials or year-less `<MMDD>-<rand3>` ids any longer.** Existing serials and year-less ids stay **grandfathered-valid** under the §2.1 triple validator and are never rewritten; they are simply no longer allocated. **Minting strategy is the store's per-skill binding** (§1); the id *format* and *validator* above are the shared invariant.
- The former universal "per-store counter; allocate `max(existing id)+1`" rule is **retired** — it is the root cause of the parallel-mint duplicate-id corruption this scheme replaces.

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
