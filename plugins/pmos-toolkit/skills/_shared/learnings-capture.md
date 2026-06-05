# Learning Capture Instructions

Reference document for pipeline skills. Follow these steps at the END of every pipeline skill, after workstream enrichment and before the handoff to the next skill.

---

## Step 1: Read or Create the Learnings File

1. Check if `~/.pmos/learnings.md` exists
2. **If not found:** Create it with this header:

   ```markdown
   # Pipeline Learnings

   Global patterns and skill improvement notes captured across projects.
   Keep this file under 300 lines — summarize when exceeded.

   ---
   ```

3. **If found:** Read the full file

---

## Step 2: Check Line Count and Summarize if Needed

If the file exceeds 300 lines, run summarization **before** appending new learnings:

1. Read the full file
2. Summarize per section — merge overlapping bullets, tighten wording, remove any that are project-specific noise. Target: reduce each section by ~40%
3. Show the diff to the user:

   ```
   Pipeline Learnings file is over 300 lines. Proposing a consolidation:

   ## /spec (was 12 bullets → 7)
   - [merged bullet]
   - [tightened bullet]
   - [removed: too project-specific]

   Apply consolidation? (y/n/edit)
   ```

4. **If approved:** Write the consolidated file
5. **If declined:** Proceed anyway — file grows past 300 temporarily, next run will re-trigger

**Summarization rules:**
- Never delete a section entirely — keep the heading even if all bullets were consolidated
- Merge bullets that express the same insight in different words
- Remove bullets that turned out to be project-specific noise
- The user sees exactly what changes before anything is written

---

## Step 3: Reflect and Categorize Learnings

1. Reflect on the current session:
   - What went wrong or was harder than it should have been?
   - What prompting gap or missing instruction caused friction?
   - What pattern would help future sessions?

2. For each learning, categorize it as one of:
   - **Global pattern** — applies across all projects and all runs of this skill (target: `~/.pmos/learnings.md`)
   - **Repo-specific** — a convention, constraint, or gotcha specific to this codebase (target: `CLAUDE.md` and/or `AGENTS.md` in the current repo)

3. Filter — only keep learnings that are:
   - **Actionable**: Specific enough to change behavior (not "be more thorough")
   - **Novel**: Not already captured in substance in the target file

---

## Step 4: Propose Global Learnings

1. Propose 0-3 global learnings for `~/.pmos/learnings.md`:

   ```
   Based on this session, I'd add to global Pipeline Learnings:

   ## /skill-name
   + Prompt for failure modes explicitly when user only describes happy path

   Add these learnings? (y/n/edit)
   ```

2. **If approved:** Append bullets under the `## /skill-name` section in `~/.pmos/learnings.md`. If the section doesn't exist, create it at the end of the file.
3. **If declined or nothing to add:** Move on.

---

## Step 5: Propose Repo-Specific Learnings

1. Check which of these exist in the current repo root:
   - `CLAUDE.md`
   - `AGENTS.md`

2. **If neither exists:** Skip this step silently. Do not offer to create either file.

3. **If at least one exists:** Propose 0-3 repo-specific learnings:

   ```
   Based on this session, I'd add to repo-specific notes (CLAUDE.md, AGENTS.md):

   + This repo uses pnpm workspaces — always run commands from the workspace root

   Add these learnings? (y/n/edit)
   ```

4. **If approved:** Append the bullets at the end of every file that exists (both CLAUDE.md and AGENTS.md if both exist — they're meant to be kept in sync). Append as flat bullets at the bottom of the file, separated by a blank line from prior content. Do not create a dedicated section heading.

5. **If declined or nothing to add:** Move on.

---

## Rules

- Proposing 0 learnings in either category is fine and expected for smooth sessions — do not force capture
- Never auto-write — always show the user what you'd add
- Each bullet should make sense to someone who wasn't in this session
- Global learnings target the skill's instructions; repo-specific learnings target the codebase's conventions
- Flat bullets only, no nesting
- The two proposals (Steps 4 and 5) are independent — the user can approve one and decline the other
