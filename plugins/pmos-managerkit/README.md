# pmos-managerkit

**Charter: help me do manager work** — hiring, team, and reviews.

Manager-facing skills that take the manual, repetitive parts of running a team and make them
consistent and grounded. The first skill is `/interview-feedback`; more manager skills (team
reviews, 1:1 prep, calibration) will land here over time.

## Skills

### `/interview-feedback`

Turn a candidate's interview inputs into two grounded artifacts:

- **(a) a filled scorecard** — every dimension scored on the sheet's own scale, green/red flags
  ticked, qualitative notes, and an overall hire/no-hire — with **every subjective claim grounded**
  in a citation (a verbatim transcript quote, an interviewer note, or an interviewer-recalled
  answer).
- **(b) interviewer-performance notes** — per interviewer, scored against a bundled,
  researched interviewer-effectiveness rubric: what went well, what could improve.

Verb-based:

- `/interview-feedback setup [role]` — scaffold a role: compile the JD + interview process,
  define rounds, attach or generate per-round guidelines.
- `/interview-feedback <candidate inputs…>` (bare = **score**) — evaluate one candidate in one
  round.
- `/interview-feedback list` — show roles and candidates.

**Grounding is enforced, not asserted.** Subjective claims are tagged by evidence tier
(transcript / interviewer-notes / interviewer-recalled). A deterministic gate verifies every
transcript-tier citation is a verbatim substring of the refined transcript; unresolved citations
fail.

**Storage.** Roles and candidates live under a configurable root (default `./interviews/`). Inside
a git repo the skill installs a gitignore guard so confidential candidate data is never committed.

**Transcription (optional).** A recording is transcribed locally with `ffmpeg` + `whisper-cli`
(whisper.cpp). When no model is installed, the skill gracefully degrades to interviewer notes or an
emitted recall questionnaire — it never blocks and never fabricates.

## Install

This plugin is published through the `pmos-skills` marketplace. Add the marketplace, then install
`pmos-managerkit`.

## License

MIT © Maneesh Dhabria
