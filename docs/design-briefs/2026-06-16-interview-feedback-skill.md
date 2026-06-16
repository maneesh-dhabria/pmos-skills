# Design Brief — `/interview-feedback` (new plugin `pmos-managerkit`)

**Date:** 2026-06-16
**Plugin:** `pmos-managerkit` (NEW — charter: "help me do manager work")
**Skill:** `pmos-managerkit/interview-feedback` (skill #1 in the plugin)
**Status:** Approved design brief — feed into `/skill-sdlc` (new-skill mode)
**Type:** New plugin scaffold + new skill

---

## 1. Problem & intent

A hiring manager runs structured interviews and needs consistent, grounded feedback
without hand-writing scorecards. Today the work is manual: read the JD, recall the
interview, fill a scorecard, and there's no coaching loop for the interviewers themselves.

We want a skill that, given a role's guidelines + a candidate's interview inputs, produces:
- **(a) a filled scoring sheet** (scores + qualitative feedback + hire/no-hire), and
- **(b) interviewer-performance notes** (what each interviewer could have done better).

It must be **general and extensible to any interview type** — PM interviews are the first
use case, but the schema (role → rounds → per-round guidelines) is interview-agnostic.

## 2. Plugin scaffold — `pmos-managerkit`

New plugin, charter **"help me do manager work"** (hiring, team, reviews; interview-feedback
is the first of several future manager skills). Minimum scaffold per repo CLAUDE.md
"New-plugin scaffolding":
- `plugins/pmos-managerkit/.claude-plugin/plugin.json` — `version: 0.1.0`, `name`, `description`, `skills: "./skills/"`.
- `plugins/pmos-managerkit/.codex-plugin/plugin.json` — mirror + `interface` block.
- `.claude-plugin/marketplace.json` + `.codex-plugin/marketplace.json` — entries (NO `version` field).
- CLAUDE.md `## Plugin charters` table + `## Release policy → Plugins list` — add `pmos-managerkit`.

## 3. Skill shape — one skill, verb-based

- `/interview-feedback setup [role]` — scaffold a **role**: compile JD + interview process
  (1+ docs) into one doc, define rounds, attach/generate per-round guidelines + additional docs.
- `/interview-feedback <candidate inputs…>` (bare = `score`) — evaluate **one candidate in one
  round** → filled scorecard + interviewer-performance notes.
- `/interview-feedback list` — show roles & candidates.

## 4. Storage model

Configurable root; **default `./interviews/` under CWD with a gitignore guard** (refuse/auto-ignore
if inside a git repo so confidential candidate data is never committed). Dogfood root: `.interview-dogfood/`.

```
<root>/
  <date>-<role-kebab>-<team>/                   # role folder
    role/
      00_jd-and-process.html                    # compiled JD + interview process + panel
      role.json                                 # machine index: rounds, panel, paths
      guidelines/<round>/
        interviewer-reference.html              # "reference" half (consistent per JD)
        scorecard.html                          # "scoring sheet" half (consistent per JD)
        additional/                             # 0+ docs: case study / take-home / etc.
    <date>-<round>-<candidate>-<lastco>/        # candidate × round folder
      inputs/                                   # ALL raw inputs copied here (for citation)
      transcript.refined.txt                    # generated when video/raw transcript available
      filled-scorecard.html                     # OUTPUT (a)
      interviewer-notes.html                    # OUTPUT (b)
```

## 5. Inputs — mandatory vs optional (with nudges)

- **Role setup mandatory:** JD/process (1+ docs → compiled into one), and per round a
  reference + scorecard. If missing → nudge to create from **bundled guidelines** or co-research.
- **Candidate eval mandatory:** candidate resume + the round's interviewer-reference + scorecard.
- **Optional context:** raw transcript, interviewer notes/observations, video recording.

## 6. Bundled PM round guidelines (researched starter set)

Each ships a **reference + scorecard skeleton**; the HM uses as-is, edits, or replaces with
their own. The same guideline schema is interview-agnostic (extensibility lever):
Recruiter screen · Product sense/design · Analytical/metrics/execution · Technical/system
(PM-flavored) · Behavioral/leadership/values · Case study or take-home (carries an additional
doc) · Case presentation to panel. The role's process maps its rounds onto these.

## 7. Reference-override resolution

If a candidate folder carries an interviewer-reference that **differs** from the role-level one,
**stop and ask** which to use (recommended default: role-level, for cross-candidate consistency).

## 8. Interviewer model

Per round: one **lead** (required) + 0+ **shadows/observers** (may pitch in) + optional **panel**
(e.g. presentation round). Output (b) is **per-interviewer**, role-aware (lead vs. observer
expectations differ).

## 9. Input grounding — three tiers

1. **Transcript** (raw, or video-derived) → cite quotes + timestamps.
2. **No transcript, but interviewer notes/observations exist** → ground in those (tagged "interviewer notes").
3. **Neither transcript nor notes** → **generate a round-specific interviewer questionnaire**,
   derived from that round's scorecard dimensions + interviewer-reference (per-dimension recall
   prompts, specific moments, green/red flags seen, overall lean). The skill presents it, captures
   answers, and treats them as the grounding source (tagged "interviewer-recalled") — extracting
   the evaluation from the interviewer's head rather than inventing it.

## 10. Transcription pipeline (graceful degrade)

Model on the repo's existing `transcribe.sh` (runtime-resolve + graceful degrade):
1. Raw transcript provided → use it (optional LLM refine: speaker labels, cleanup).
2. Else video + `ffmpeg` + `whisper-cli` (whisper.cpp) + model present → extract audio → whisper → LLM refine.
3. Else → fall through to §9 tier 2/3 and flag that subjective scores are not transcript-grounded.

Environment confirmed: `ffmpeg` ✓, `whisper-cli` ✓ present.

## 11. Interviewer-effectiveness rubric (researched, bundled, interview-agnostic)

Output (b) is scored against a **bundled interviewer-effectiveness rubric** — a researched set of
interviewing **best practices + common mistakes**, structured into scored dimensions the same way
the candidate scorecard is. It is **plugin-level and role-agnostic** (not per-role, not PM-specific):
structured/consistent questioning, follow-up probing depth, avoiding leading/closed questions,
talk-time balance (interviewer vs. candidate), staying on the reference's area coverage, bias
mitigation (halo/horns, recency, similarity), note-taking discipline, and calibration to the bar.

- **Built once at build time → shipped as a static bundled reference** (`skills/interview-feedback/
  reference/interviewer-effectiveness.md` or `.html`), exactly like the candidate guidelines it
  shouldn't change per interview.
- **Grounded, not invented** — researched via the repo's verified-source approach (deep-research /
  learnkit-style fetch-and-cite). This is an **explicit task in the plan**, not a runtime step.
- Output (b) cites the rubric dimension each piece of coaching maps to, grounded in the same
  evidence tiers as §9.

## 12. Output contract

- **(a) Filled scorecard** — every dimension scored on the sheet's own scale, green/red flags
  ticked, qualitative notes, overall **hire/no-hire**. Each subjective claim **grounded with a
  citation** (transcript quote+timestamp / interviewer-notes / interviewer-recalled). Self-contained
  HTML in the house style of the sample artifacts (pre-filled, still human-editable in browser).
- **(b) Interviewer-performance notes** — per interviewer: did-well / could-improve, **scored
  against the §11 interviewer-effectiveness rubric**, grounded in the §9 evidence tiers.
- **Global style:** concise; bullets + nested bullets; subjective claims are always grounded.

## 13. Dogfood case (gitignored, never committed)

Sample at `/Users/maneeshdhabria/Downloads/interview-candidates` (Porter PM "bidding" case,
Round 3): JD PDF, candidate resume PDF, interviewer-brief.html, scorecard.html, case-question.html,
PM_Case_Studies.pdf, and an ~830 MB interview recording.mp4. Used as the live dogfood inside
`/skill-sdlc` execute/verify. **DO NOT push or commit any case content** — it stays under the
gitignored `.interview-dogfood/`.

## 14. Build path

Approved design → `/skill-sdlc` (repo-mandated: requirements → spec → plan → execute → skill-eval
→ verify), with the sample case as the live dogfood. The plan MUST include an explicit
**"research the interviewer-effectiveness rubric"** task (§11), built via the verified-source
research approach and committed as a bundled reference. (Overrides superpowers brainstorming's
default `writing-plans` handoff, per the chosen build path + repo CLAUDE.md skill-authoring convention.)

## 15. Out of scope (v1, YAGNI)

- No pmos-toolkit comments/overlay substrate dependency (self-contained HTML only).
- No multi-candidate comparison / ranking view (per-candidate output only).
- No ATS integration, scheduling, or sourcing.
- No markdown companion output (HTML only) unless requested later.
