## Pass 1 — reviewer findings

### playbook-F1 [Blocker] Shipped article template is the retired case-study schema, contradicting the evolution schema
- Where: plugins/pmos-learnkit/skills/playbook/reference/artifact-template.html:40
- Quote: "<div class=\"playbook-sub\">A PM case study · how I used AI to solve this · {{DATE}}</div>"
- Problem: SKILL.md Phase 4 says "Compose the article body from `reference/artifact-template.html` … per the **evolution schema** in `reference/article-schema.md`" — but the template is the retired per-problem case-study shape: sections `tldr`, `the-problem`, `how-i-framed-it`, `decision-ledger`, and `<h2 id="takeaway">Takeaway for PMs</h2>` (line 65). article-schema.md mandates "What this is" first, one section per milestone, "How the pipeline shaped the whole arc", and explicitly bans the listicle close ('No grand summary, no "key takeaways" listicle', article-schema.md:49–50). Worse, the template's own comment orders "The <h2 id> values are the stable comment anchors (id-first resolution) and must mirror index.sections.json — keep them kebab-case and unchanged" — instructing the model NOT to replace them with milestone sections. A faithful follow of the template fails the mandatory pre-emit self-check ("'What this is' is first"); a faithful follow of the schema means ignoring the shipped template. The evolution rewrite (D1–D13) updated every prose file but never touched this one (render-surface.test.sh still probes with `id="tldr"`).

### playbook-F2 [Should-fix] resolver.md still documents the retired window flags, and the resolver defaults to a 30-day window
- Where: plugins/pmos-learnkit/skills/playbook/reference/resolver.md:7
- Quote: "node <skill>/scripts/resolve_repo_sessions.mjs <repo> [--days N] [--since ISO] [--sessions N] [--include-headless]"
- Problem: SKILL.md Anti-Pattern #3 and evolution-sources.md both declare "There is no `--days` / `--since` / `--sessions` knob any more", yet the resolver reference — which says "Run it; don't reimplement it" — advertises exactly those knobs. And a bare invocation per that usage line silently applies a 30-day window (`const windowDays = opts.windowDays ?? (opts.since != null || opts.sessionsLimit != null ? null : 30);`, resolve_repo_sessions.mjs:151), producing precisely the sampled-slice undercount the skill's own anti-pattern forbids. Only scout.mjs's `since: 0` neutralizes it; any model or human following resolver.md directly gets a truncated arc with no warning.

### playbook-F3 [Should-fix] Skill-scoped spine filtering is promised as file-path-based but implemented as name-substring matching
- Where: plugins/pmos-learnkit/skills/playbook/reference/evolution-sources.md:87
- Quote: "docs' file lists and `git log -- <skill-path>` to decide."
- Problem: evolution-sources.md §Skill-scoped evolution promises spine milestones are kept when their "feature doc / changelog entry / merged branch touches the skill's directory … Use the design docs' file lists and `git log -- <skill-path>` to decide." The actual implementation (`milestoneAboutSkill`, scout.mjs:240–244) is pure name-substring matching on slug/title/branch/featureDir — no git path query, no file-list read. A milestone that modified `plugins/*/skills/<name>/` without naming the skill in its slug is silently dropped from the skill-scoped spine — a silent undercount, the exact failure class the coverage line exists to prevent, and unlike the resolver it is not surfaced anywhere.

### playbook-F4 [Should-fix] "Tags / releases" is declared a spine input but is never read; era grouping never happens
- Where: plugins/pmos-learnkit/skills/playbook/reference/evolution-sources.md:37
- Quote: "| **Tags / releases** | `git -C <repo> tag` + dates | version cut points (group milestones into eras) |"
- Problem: The reference titles the section "The four spine inputs" and lists tags as the fourth, with the express purpose of grouping milestones into eras. `readSpineInputs()` (scout.mjs:162–183) reads exactly three inputs — changelog, feature dirs, merge log — and no code path anywhere runs `git tag` or produces era grouping. The doc describes a capability the tool does not have; on a long-arc repo the era structure is the main defense against milestone sprawl (see F5), so this is not cosmetic.

### playbook-F5 [Should-fix] No consolidation strategy for a dense spine — one section and one subagent per milestone, unbounded
- Where: plugins/pmos-learnkit/skills/playbook/reference/article-schema.md:28
- Quote: "**One section per milestone** — the spine (`reference/evolution-sources.md`), in date order."
- Problem: `parseChangelogMilestones` turns EVERY dated changelog heading into a milestone, the spine unions that with every feature dir and every merge, and there is no cap, merge step, or era-rollup anywhere. On a mature repo (this very marketplace repo has hundreds of dated changelog entries and feature dirs) the contract mandates hundreds of article sections and Phase 3 fans out "one per milestone" subagents — an unreadable artifact and an unbounded token bill. The skill defends hard against undercounting (resolver, coverage line) but has zero defense against overcounting. Product-sense: the evolution story of a 200-milestone repo is ~10 eras, not 200 sections; the schema gives the model no license to consolidate.

### playbook-F6 [Should-fix] Ambiguous-session "confirm-include" has no execution path — scout strips the session file from ambiguous[]
- Where: plugins/pmos-learnkit/skills/playbook/scripts/scout.mjs:275
- Quote: "ambiguous: res.ambiguous.map(a => ({ dir: a.dir, reason: a.reason, gitBranch: a.gitBranch }))"
- Problem: SKILL.md Phase 2 requires "if `ambiguous[]` is non-empty, surface each for confirm-include or skip — never silently attribute" (SKILL.md:132–133). But the scout's output drops the resolver's `file` field, keeping only dir/reason/gitBranch, and neither script accepts any include-this-session flag or re-map entry point. After the author says "include", there is no supported way to map that session onto the spine or even locate its `.jsonl` (a dir can hold many sessions) — the confirm path dead-ends, so in practice confirmed sessions get hand-waved or silently skipped.

### playbook-F7 [Nit] Phase 6 overwrite prompt has no non-interactive default
- Where: plugins/pmos-learnkit/skills/playbook/SKILL.md:193
- Quote: "Existing folder → prompt overwrite / suffix / cancel. Print the absolute path."
- Problem: Under `--non-interactive`, a prompt with no `(Recommended)` option classifies as DEFER, which logs an open question — but the skill never states what the emit actually DOES on DEFER here (overwrite is destructive, cancel loses the run, suffix is the obvious safe default). The outcome of a headless re-run into an existing folder is undefined. One clause ("non-interactive: suffix") closes it.

### playbook-F8 [Nit] metaUsesSkill's topic signal is dead for hyphenated skill names
- Where: plugins/pmos-learnkit/skills/playbook/scripts/scout.mjs:236
- Quote: "if (meta.gitBranch && meta.gitBranch.toLowerCase().includes(s)) return true;\n  if (meta.topic.has(s)) return true;"
- Problem: `tokens()` replaces non-alphanumerics with spaces, so `meta.topic` can only ever contain bare words ("learn", "list") — `meta.topic.has("learn-list")` is false by construction for every hyphenated skill name (most skills in this marketplace: learn-list, book-summary, interview-feedback, …). The third scoping signal silently never fires for them; only command-tag and branch matching carry the load. Untested precisely because the tests use the single-word "playbook".

### playbook-F9 [Nit] low_confidence attribution does not survive into the scout's milestone output
- Where: plugins/pmos-learnkit/skills/playbook/scripts/scout.mjs:279
- Quote: "session_ids: m.sessions.map(s => s.session_id),"
- Problem: SKILL.md Phase 2 says low-confidence (sibling-only) sessions "ARE included but noted", and resolver.md says "Surface the count; let the author drop any that are actually unrelated repos" — but the scout's milestone contract carries only bare `session_ids`, with the per-session `low_confidence` flag dropped at `extractSessionMeta` time. Downstream (deep-read, article) cannot tell which mapped session was low-confidence, so the "noted" promise degrades to a single aggregate count in the coverage line and the author cannot act on specific sessions.

**Pass 1 verdict:** 1 blockers / 5 should-fix / 3 nits — material findings
