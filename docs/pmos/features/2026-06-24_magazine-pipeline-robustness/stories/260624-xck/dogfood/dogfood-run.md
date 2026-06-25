# Dogfood — /magazine windowing flags + snapshot-scoped prep (story 260624-xck)

Real Stage-A CLI flow against the bundled fixture (`tests/fixtures/sample-feed.xml`,
4 items: `post-0001`=2026-06-02, `substack:post:198591907`=2026-05-28,
`post-0002`=2026-05-30, `post-0000`=2019-01-01). Full machine transcript:
[`dogfood-transcript.txt`](dogfood-transcript.txt).

## What the flow proves (TN-1 acceptance)

| Acceptance | Evidence from the transcript |
|---|---|
| Narrow `--from/--to` discover, then **wider overlapping** discover | §1 narrow `{post-0002, substack:post:198591907}`; §3 wide `{post-0001, post-0002, substack:post:198591907}` |
| Narrow snapshot ⊆ wide snapshot | `{post-0002, substack}` ⊂ `{post-0001, post-0002, substack}` ✓ |
| `state.snapshot` is a **single object** after both runs | §1 `isArray=false`; §3 `isArray=false` (id overwritten, not a list) |
| Already-discovered items **keep their status** across the overlapping run (D6) | After narrow prep both are `failed`; after the wide discover they are still `post-0002:failed | substack:...:failed` (not reset to `discovered`) |
| `prep` crawls **only the latest snapshot** | §4 wide prep `route.discovered=1, crawled=1` — only the newly-added `post-0001` (still `discovered` AND in-snapshot) is crawled; the two already-prepped items are not re-crawled |
| Bare discover + unknown flag both exit 64 with clear messages | §5: `exit=64 | window required: …`, `exit=64 | magazine-run: unknown flag --bogus (known: …)`, `exit=64 | magazine-run: --from: invalid date "notadate" (…)` |

> The two narrow-window items land at `failed` because the fixture's `example.com`
> links don't yield extractable article text — i.e. a **degraded** outcome, exactly
> per the trust rule. The dogfood asserts *which items prep attempts* (scoping), not
> extraction success, so the degraded status is expected and correct here.

## Window semantics exercised end-to-end

- Lower bound exclusive, upper bound inclusive-of-day: `--from 2026-05-28 --to 2026-05-30`
  admits the 05-28 and 05-30 items, excludes the 06-02 item and the 2019 item.
- `--days N`, `--from/--to` (bare dates), `--since/--until` (ISO) all resolve through
  the same `resolveWindow`; an explicit `--from`/`--since` beats `--days`.
- The per-feed cursor is **never touched** by interactive discover (watch-internal
  poll memory) — completeness is guaranteed by the snapshot.

## Blind-judge verdict

A blind judge given only `02_design.html` + the transcript + the rewritten docs
scored **error-clarity / doc-truthfulness / reuse-intuitiveness** and emitted a
`DOGFOOD:` verdict — see the build notes on the story item for the recorded scores.
