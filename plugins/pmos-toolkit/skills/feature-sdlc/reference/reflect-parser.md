# /reflect paste-back parser

Single-source extractor for `/reflect` output blocks. Phase 2 (and any future audit/lint step) **must inline this snippet verbatim** rather than reimplement the regex — drift between parsing and audit must be structurally impossible.

## Block shape (from `/reflect` SKILL.md Phase 5)

````markdown
### Retro: /<skill-name>  ·  <run-count> run(s)

**Claimed contract (from description):** <paraphrase>

**What happened:** <2-4 sentence summary>

**Findings:**

- **[blocker]** <finding> — *Evidence:* "<quote>" — *Proposed fix:* <fix>
- **[friction]** <finding> — *Evidence:* … — *Proposed fix:* …
- **[nit]** <finding> — *Evidence:* … — *Proposed fix:* …

**Net assessment:** <one sentence>
````

A "clean run" block has no findings list:

```markdown
### Retro: /<name> — clean run, no findings.
```

## Extraction algorithm

For each `### Retro:` heading:

1. **Skill name** — capture group from `^### Retro:\s+/(?<skill>[a-z0-9-]+)`. Stop at whitespace, `·`, or `—`.
2. **Run count** — optional capture from `·\s*(?<runs>\d+)\s*run`.
3. **Clean-run shortcut** — if the heading line ends with `clean run, no findings.`, emit zero finding tuples for this skill and continue.
4. **Findings section** — locate the next `**Findings:**` line; consume bullet lines until the next blank line followed by `**`-bolded label or the next `### Retro:` heading.
5. **Per finding bullet** — match `^-\s+\*\*\[(?<severity>blocker|friction|nit)\]\*\*\s+(?<finding>.+?)\s+—\s+\*Evidence:\*\s+(?<evidence>.+?)\s+—\s+\*Proposed fix:\*\s+(?<fix>.+)$`.
   - `finding`, `evidence`, `fix` are non-greedy until the next `—` separator (or end-of-line for `fix`).
   - Strip surrounding quotes from `evidence` if present.
6. **Tuple shape** emitted per finding:
   ```
   {
     "skill": "<skill>",
     "severity": "<severity>",
     "finding": "<finding>",
     "evidence": "<evidence>",
     "proposed_fix": "<fix>",
     "source_block": "<line range or run number>"
   }
   ```

## Edge cases

- **Multiple runs in one block** — `/reflect` folds them with "Run 1: …, Run 2: …" inside *What happened*. Treat findings as belonging to the skill, not a specific run, unless the finding text starts with `Run N:`.
- **Multiline findings** — if a bullet wraps across lines, join with single spaces before regex match.
- **Missing `— *Proposed fix:*` segment** — emit the tuple with `proposed_fix` empty and surface during Phase 4 critique as "no fix proposed; ask user".
- **Severity not in enum** — log and treat as `friction`; surface in Phase 4 critique.
- **Findings outside any `### Retro:` heading** — ignore; only retro blocks are authoritative.

## Non-retro raw text fallback

When the input does not contain any `### Retro:` heading, switch to LLM extraction:

- Scan for `/<skill-name>` and `pmos-toolkit:<skill-name>` mentions to attribute each finding to a skill.
- For each sentence/paragraph that proposes a change, build a tuple with:
  - `severity`: default `friction`; surface "severity inferred — confirm?" inline at Phase 6.
  - `finding`: one-line paraphrase.
  - `evidence`: the original sentence(s).
  - `proposed_fix`: extracted directive ("should X", "needs to Y") or empty.
- If no skill name is mentioned anywhere, defer attribution to Phase 2's `AskUserQuestion`.
