# Scout, clustering & proposal (reference)

Implemented in `scripts/scout.mjs` (which calls the resolver). Loaded on demand by the
Scout/Propose phase. Run it; don't reimplement it.

```
node <skill>/scripts/scout.mjs <repo> [--days N] [--since ISO] [--sessions N] [--include-headless]
```

The script reads ONLY cheap fields and emits the candidate JSON to stdout. **The LLM never reads
raw session bodies at scout time** — it consumes only this summary, then deep-reads only the
threads the author picks.

## Cheap fields read per session (FR-30)

`aiTitle`, the first genuine human prompt (skipping compaction summaries + `<command-name>`
wrappers), `<command-name>` tags, `gitBranch`, and file mtime. Decision signals are counted from
`AskUserQuestion` tool_use blocks + free-prose pushbacks.

## Thread boundary — branch-then-topic (FR-31)

1. Group sessions whose `gitBranch` is non-`HEAD` by branch — each branch = one thread.
2. For `HEAD`/null sessions, sort by mtime and cluster: a **new thread** starts when topic
   similarity (token Jaccard over `aiTitle + firstPrompt`, stopwords removed) drops below
   `TOPIC_THRESHOLD` (0.18) **OR** the time gap exceeds `MAX_GAP_MS` (2 days). Adjacent
   same-topic sessions merge (compaction continuations). Boundaries formed at low similarity are
   marked `boundary_confidence < 1` for optional confirm.

## Instructiveness floor (FR-32)

A thread qualifies only if `decision_signals >= 1` **AND** it used `>= 1` non-trivial skill
(anything outside the trivial set `/exit /compact /clear /reload-* /login /doctor /mcp /plugin
/remote-* /effort`). A 1-session thread that only ran `/exit` is suppressed; a short-but-rich
thread (one session, a real decision + a real skill) qualifies. Suppressed count is reported, not
hidden silently.

## Scoring & ranking (FR-33)

`score = decision_signals*2 + distinct_non_trivial_skills + span_days*0.1 + (decision_signals>=2 ? 1 : 0)`.
Present the ranked top ~5 qualifying threads, each with a one-line `why_teachable`. Ordering is
deterministic (score desc, then slug asc).

## Merge / split UX (FR-34)

The script auto-detects a branch thread that shares a topic (Jaccard ≥ `MERGE_THRESHOLD` 0.30)
with a temporally-adjacent `HEAD` thread and emits `merge_suggestion`. The skill SUGGESTS the
merge at the pick step (author accepts/rejects). Thread-boundary confirm prompts fire ONLY for
`boundary_confidence < 1` clusters — confident clusters are never re-litigated.

## Dry-run confirm (FR-35)

After printing the coverage line and the ranked proposal, the skill REQUIRES an explicit confirm
(interactive) before any deep-read. The author picks which candidate(s) to build.

## Candidate JSON contract

```json
{
  "coverage": { "session_dirs": N, "via_worktree": M, "interactive": K,
                "headless_dropped": H, "low_confidence": L, "candidates": C, "suppressed_thin": S },
  "ambiguous": [ { "dir": "...", "reason": "branch-only", "gitBranch": "..." } ],
  "candidates": [ { "slug","title","why_teachable","score","session_ids":[...],
                    "branch","skills":[...],"decision_signals","span_days",
                    "boundary_confidence","merge_suggestion": {"with_slug","confidence"}|null } ]
}
```
