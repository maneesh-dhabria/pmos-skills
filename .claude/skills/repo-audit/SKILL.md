---
name: repo-audit
description: Run a full architecture & design review of every skill in this repo against a style north star (default Matt Pocock's skills repo) — independent per-skill reviews in parallel, cross-cutting passes for substrate duplication / flags / phases / platform posture / gates, a consolidated graded report, a decision checkpoint, then an apply-quick-fixes wave. Use when the user says "audit the repo", "review all the skills", "repo-audit", "have the skills gotten too verbose/prescriptive", or wants to repeat the 2026-06-10 skill-design review with a newer model.
---

# Repo audit

Audit every skill in this repo for design quality: verbosity, prescriptiveness, substrate reuse, readability, flag/phase hygiene, cross-platform posture, and gate/rubric calibration. The output is a graded report with a prioritized fix program, plus (with the user's consent) an applied batch of correctness fixes.

**The core mechanic:** one shared criteria file, many independent reviewers. Every reviewer reads the same rubric and the same style exemplars, so findings are comparable; each reviews its skill blind to the others, so findings are independent. You consolidate.

Prior art: `docs/pmos/reviews/2026-06-10_skill-design-review/` is a complete worked example (criteria, 30+ per-skill files, cross-cutting passes, report, decisions). Read its `report.md` before starting — both to avoid re-litigating settled decisions and to diff "has this regressed since last audit?"

## 1. Set up

1. Create `docs/pmos/reviews/<YYYY-MM-DD>_<slug>/` for this run.
2. Clone the style north star locally so reviewers can read it (default: `git clone --depth 1 https://github.com/mattpocock/skills.git ~/.cache/pocock-skills`; the user may name a different reference repo).
3. Instantiate the criteria file from [reference/criteria-template.md](reference/criteria-template.md) into the run folder. Update the template's exemplar list and "machinery — don't misflag" section to current reality (lints, contracts, and substrate files change between audits — verify each one still exists before listing it).
4. Inventory the skills: every `plugins/*/skills/*/SKILL.md` plus each plugin's `_shared/`. Note line counts; they calibrate effort.
5. Ask the user up front (one consolidated prompt): how aggressive may recommendations be (style-only vs machinery-on-the-table), where the report lives, whether quick fixes get applied this session, and anything they specifically worry about. Their answers go into the criteria file so reviewers inherit them.

## 2. Review fan-out

Dispatch one reviewer subagent per skill (group thin aliases and tightly-coupled siblings — e.g. an orchestrator with its aliases, or sibling skills sharing one evaluation substrate — into one reviewer that also judges the relationship). Run them in parallel waves sized to what the harness tolerates.

Each reviewer's prompt must include, verbatim or by path:

- read the criteria file FIRST — it carries the rubric and the exact output contract;
- read the named exemplars from the north-star clone;
- read the assigned SKILL.md in full plus its reference files (structure + spot-reads for very large ones); read scripts only for what they enforce;
- judge substrate use against the plugin's `_shared/`;
- **steelman before condemning**: when a cap/gate/rule looks arbitrary, check `docs/pmos/features/` for the feature folder that introduced it and cite the origin — many "arbitrary" rules trace to real incidents, and a review that flags earned machinery as bloat destroys trust in the whole report;
- write findings to `per-skill/<skill>.md` per the output contract; return only a grade line + top-3 fixes.

Add a per-skill "special attention" line naming what you already suspect (its closest north-star analogue, a known phantom contract, an overlap with a sibling skill). This is where your judgment enters; don't dispatch generic prompts.

## 3. Cross-cutting passes

Per-skill reviewers can't see repo-wide patterns. Dispatch three more agents:

1. **Substrate map** — what lives in each `_shared/`, what's duplicated across skills that should be shared (quantify lines, list consumers, cite one concrete drift per pattern), what's shared-but-rotted, and whether the sync tooling is safe to run.
2. **Flags + phases inventory** — every documented flag (dead? discoverable? naming collisions across skills?); every phase heading (numbering scheme, ghost references — a ~30-line resolver script that checks every "Phase N" cross-reference against actual headings finds these deterministically).
3. **Platform + gates inventory** — Claude-Code-only tool dependencies and whether degradation notes are followable; every rubric/gate/lint with hard-vs-soft verdicts; **run the repo's own audit scripts and report whether they actually pass** — a red gate everyone ignores is itself a top finding.
4. **Seam map** — every place skill A names, invokes, or narrates skill B. Classify each seam's mechanism (typed file contract / flag passthrough / Skill-tool call / prose narration) and check every prose-narrated claim against B's current contract. Evidence from the 2026-06-10 ops review: typed seams had zero defects across ~30 seams; every phantom contract found lived at a prose seam.

Feed these agents the per-skill reviewers' relevant claims to verify — independent confirmation is the point.

## 3b. Operations passes (when session transcripts are available)

Design-reading answers "is this well built?"; only real usage answers "is this machinery worth it?". When the user's Claude home dir is reachable (transcripts at `$CLAUDE_CONFIG_DIR/projects/<path-slug>/<session-uuid>.jsonl`, subagents under `<session-uuid>/subagents/`), dispatch up to three more agents over a recent window (~15 days). Files reach 15 MB — agents must sample with grep/python, never read whole transcripts.

1. **Subagent/model economics** — every dispatch the skills specify vs what real runs did: model pins (or their absence — count them), subagent transcript sizes as token-cost proxies, paste-vs-path prompt hygiene, work in main context that should be a subagent and vice versa.
2. **Loop value tally** — for each self-verification loop, count across real runs: caught-something-real vs pure pass-through vs never-executed. Iteration-2 yield is the killer stat (2026-06-10: 0 new findings in 27 observed runs). A reviewer that has never failed anything is latency, not quality.
3. **Instruction adherence** — for steps skills mandate (browser verification, deploy checks, eval gates): how often did real runs do them unprompted vs after user pushback vs never? Quote the smoking-gun sessions where the user had to ask.

Prior art for all three: `docs/pmos/reviews/2026-06-10_ops-observations/` (methodology, grep recipes, and tally formats in files 01/06/07).

## 4. Consolidate and decide

Write `report.md` in the run folder: grade table, systemic findings ranked by impact (look for the one disease behind many symptoms), what's genuinely good and should be kept, and a fix program split into P0 correctness / P1 mechanical hygiene / P2 design changes / P3 strategic. Lead with the verdict, not the methodology.

Then checkpoint with the user before touching anything: fix scope for this session, plus a question per genuinely contested call (delete-vs-implement for phantom contracts, policy directions). Present trade-offs honestly — include the option you'd push back on, and say why.

## 5. Apply fixes

For the approved batch, dispatch fix agents in parallel with **disjoint file ownership** (no two agents may touch the same skill directory; cross-boundary stragglers come back to you). Every fix agent's prompt carries three rules:

- **verify each claim in the source before editing** — reviews contain false positives, and a fix agent that finds one should refuse that fix and say why (this happens roughly once per wave; it's the system working);
- minimal diffs, no commits, no renames beyond what the user approved;
- report every edit applied and every fix declined.

After the wave: fix the stragglers yourself, re-run every gate the repo ships (lints, audits, selftests, the smoke tests fix agents touched), and run a `git diff --stat` sanity pass. Done means all gates green and the diff reviewed — leave committing to the user.

## 6. Close out

- Record the user's decisions in the report (they're the contract for follow-up sessions).
- Capture P1–P3 items wherever the user tracks work (e.g. `/backlog`).
- Clean up scratch files (the north-star clone can stay in `~/.cache` for next time).

## Calibration notes

- A long skill whose **domain** is complex is not the same as a long skill that doesn't trust the model. Reviewers must say which; so must the report.
- The most valuable findings are usually not style — they're **facts stated in two places that drifted** (dead flags, ghost phase references, contracts one side retired). Hunt those first; they're also the cheapest to fix and the easiest to prevent (one fact, one home, plus a small lint).
- Grade honestly. If the newest skills grade best, say so — it means the lessons are landing and tells the user where the debt actually is.
- **Revealed preference is design feedback.** When transcripts show defaults consistently overridden in one direction (rigor tiers always picked low, fan-outs never run at spec size, reviewers economized below spec), the finding is "move the defaults", not "users are holding it wrong".
