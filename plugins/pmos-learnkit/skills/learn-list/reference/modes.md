# modes.md — the effort dial

`--mode` controls how wide the skill fans out and how far it explores adjacencies.
Higher modes cost more wall-clock and more fetches. Default is `standard`.

## Dial matrix

| Dimension | quick | standard | deep |
|---|---|---|---|
| Topics in the outline | 3–5 | 5–8 | 8–12 |
| Links emitted per topic | top 3 | top 5 | top 5–8 |
| Adjacency hops (Phase 5) | 0 | 1 | 2 |
| Fan-out (Phase 4) | sequential, in-context | one subagent per topic | one subagent per topic + per adjacency cluster |
| Canon depth (Phase 2) | 2–3 books, ~3 practitioners, 1–2 curations | 3–5 books, ~5 practitioners, 2–4 curations | full: books + practitioner-graph + 3–5 curations |
| Follow-list | core only (≤5 people/sources) | full follow-list | full + book summaries + signature writings |
| Outline-confirm gate (Phase 3) | auto-proceed | confirm/edit | confirm/edit |
| Level prompt (Phase 1) | skipped (level-neutral) | ask once if `--level` absent | ask once if `--level` absent |

## Cost caps (hard)

- Dedupe topics **before** fan-out — never source the same topic twice.
- Verify only the post-ranking survivors that will be emitted (see `sourcing-ladder.md` — rank-then-verify). Never fetch every candidate.
- `deep` mode: before fan-out, log one est-cost line to chat — `est. ~<topics×links> link verifications across <topics> topics; proceeding` — so a large run is never a silent surprise.
- A single topic's subagent caps its own candidate pool at ~3× the links-to-emit before ranking; it does not crawl indefinitely.

## Picking a mode for the user

- The user passed `--mode` → honor it.
- No flag → `standard`.
- Phrases like "just a quick list", "give me the basics", "5 minutes" → suggest `quick`.
- Phrases like "go deep", "everything", "comprehensive", "I'm specializing in this" → suggest `deep` (and surface the cost line).
