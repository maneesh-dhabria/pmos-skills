# Grill — magazine feed bundles requirements

Adversarial pass over `01_requirements.md`. Each finding + resolution.

## Findings & resolutions

**G1 — `curate` write-target is dangerous (BLOCKER → resolved).**
The installed skill lives in a read-only plugin cache
(`~/.claude-personal/plugins/cache/...`). If `/magazine curate` writes regenerated
catalog/bundles back into `${CLAUDE_SKILL_DIR}/data/`, it either fails (read-only) or
mutates a cache that gets wiped on update.
→ **Resolution:** `curate` writes to **user space by default**
(`~/.pmos/magazine/curated/<date>/`) and accepts `--out <dir>`. The *maintainer*
regenerates shipped data by running `curate --out plugins/pmos-learnkit/skills/magazine/data/`
from the repo. The skill body states this explicitly. Shipped `data/` is only ever
written by a maintainer in-repo, never by an installed run.

**G2 — Bundle selection rule is undefined (FRICTION → resolved).**
"essentials" / thematic membership is subjective; without a rule it's a black box.
→ **Resolution:** deterministic + documented. *Thematic* bundles = catalog rows
whose Tags include the bundle's defining tag(s), Status=Active, ordered by catalog
position (catalog is curated roughly by prominence), capped ~15–20. *Essentials* =
hand-picked top-signal feeds (the widely-recognized canon at the top of the catalog),
capped ~12. Each bundle's `bundles.yaml` entry carries a one-line description stating
its inclusion rule, so it's transparent, not magic.

**G3 — OPML can't express newsletter vs podcast type (RISK → resolved).**
`feeds.yaml` needs `type:`; plain OPML import can't always tell. Bundles are
per-medium by path (`data/bundles/newsletters/...` vs `.../podcasts/...`), so the
importer infers `type` from the bundle's medium. This is *better* than generic
`add --from` OPML import, which has to guess.

**G4 — catalog tags ≠ closed tags.yaml registry (NIT → resolved).**
Catalog tags are rich/free-form; `tags.yaml` is a closed set. Setting `default_tags`
from catalog tags would reference non-registry tags.
→ **Resolution:** bundle import does **not** write `default_tags`. Tagging happens at
summarize time from the closed registry, unchanged. (A future enhancement could map
catalog tags into the registry; out of scope.)

**G5 — Dedup on bundle import (covered by NFR-3).**
Importing overlapping bundles (essentials ∩ ai-for-pms) must not double-add. The
existing assisted-import flow dedups by name/url before append; bundle import reuses
it. Verified as a spec requirement, with a test.

**G6 — Staleness honesty (covered by NFR-4).**
Shipped feeds drift. Catalog ships `Last Post` dates; `bundles` listing and first-run
note point at `/magazine curate` for refresh. No silent staleness.

**G7 — Does `curate` belong in v1 at all? (SCOPE)**
User already chose "reference + thin command". `curate` stays thin — it only
parameterizes + dispatches `reference/feed-curation.md`. The heavy logic is the
reference, re-runnable by hand if the command were ever dropped. Acceptable.

## Net
No open blockers. G1 (curate write-target) and G2 (selection rule) flow into the
spec as explicit requirements. One confirmation surfaced to the user (curate
write-target default).
