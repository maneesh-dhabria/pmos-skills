# /one-on-one coaching corpus

The bundled, **offline** coaching substrate (no network) that makes `/one-on-one` an *actively coaching*
tool rather than a neutral notepad (D6). It feeds two phases:

- **`plan`** (`../SKILL.md#plan`) — pulls the human-first opener + 1–2 intent-tagged questions per surfaced
  agenda intent, and the durable principles behind its flags.
- **`career`** (`../SKILL.md#career`) — runs the Laraway three-part career conversation from the model below.

The **question bank** between the `question-bank:start` / `:end` sentinels is the **single machine-readable
home** (§K): `scripts/plan.mjs` and `scripts/career.mjs` parse `- [intent] <question>` lines from it by
intent — do not duplicate questions into the scripts. Everything else here is human reference the coaching
model narrates from.

---

## Attribution caveats (honored throughout — never assert beyond these)

These four are the ones people most often get wrong. The corpus is written to respect them; if you paraphrase
in a session, keep the attributions straight.

1. **The 10/90 talk ratio is Ben Horowitz, not Andy Grove.** Horowitz's rule (*The Hard Thing About Hard
   Things*) is that in a 1:1 the report should talk ~90% and the manager ~10%. Grove's *High Output Management*
   makes the adjacent-but-distinct point — when you think you're done, **"ask one more question."** Do not
   attribute the 90/10 number to Grove.
2. **Laraway's career plan is "long-term vision + a short-term plan," not a "15-month plan."** Russ Laraway
   (*When They Win, You Win*) frames it as a long-term vision plus a near-term plan to move toward it. The
   **18-month** figure belongs to **Sheryl Sandberg's** version of career conversations, not Laraway's. Never
   collapse the two into an invented "15-month plan."
3. **Hogan's "Bias Toward [Action / Feelings]" two-column exercise is unverified.** It is frequently cited but
   is more likely from **Lara Hogan's *Resilient Management*** than a primary Hogan source we can confirm. Label
   it *unverified — likely Resilient Management* wherever it appears; do not present it as a verbatim canonical
   exercise.
4. **Manager Tools 10/10/10 and the Rands "you're doing it wrong" line are documented-canon / paraphrase.** The
   Manager Tools 1:1 structure (~10 min theirs / ~10 min yours / ~10 min future/development) is documented canon
   — attribute to Manager Tools. Michael Lopp's ("Rands") "if your 1:1s are status updates, you're doing it
   wrong" is a **paraphrase** of his *Managing Humans* / rands-in-repose writing — attribute as paraphrase, not
   a verbatim quote.

---

## 12 durable principles

The flags `plan` raises (`status-creep`, `stale-action`, `career-due`) are the operational edge of these.

1. **It's the report's meeting.** They set most of the agenda; you serve it. (Horowitz; Rands.)
2. **It is not a status report.** Status can be async; the 1:1 is for what status can't hold. (Rands, paraphrase
   — caveat 4.)
3. **Listen more than you talk.** Aim for them ~90% / you ~10%; when you think you're done, ask one more
   question. (90/10 = Horowitz; "one more question" = Grove — caveat 1.)
4. **Near-never cancel it.** Cancelling signals the person doesn't matter; reschedule rather than skip.
5. **It's your highest-leverage hour.** One hour that steers a person's month — protect it accordingly. (Grove's
   leverage framing.)
6. **Go below the surface.** Past the task list to growth, morale, and the human. Surface-only weeks are drift.
7. **Solicit feedback on yourself — then be silent.** Ask how you could be more helpful, then sit in the
   silence and let them answer.
8. **Capture and close loops.** Write down actions with an owner; a 1:1 that never closes its own loops erodes
   trust. (This is what `stale-action` guards.)
9. **Coaching and growth are the point.** Development is the recurring agenda, not an annual event. (This is
   what `career-due` guards.)
10. **Learn how each person wants to be led — early.** Run an operating-manual conversation up front (see
    Hogan first-1:1 questions) and record it.
11. **Match your style to the person and the moment.** Directive when they're stuck, coaching when they're
    growing, listening when they're loaded.
12. **Protect the human layer.** Recognition, morale, and well-being are first-class agenda items, not filler.

---

## Named models

- **Manager Tools 10/10/10** — a repeatable 1:1 shape: ~10 min theirs, ~10 min yours, ~10 min on the future /
  development. Attribute to Manager Tools (caveat 4).
- **Rands' Update / Vent / Disaster** — Michael Lopp's read of what a given 1:1 is *for*: a routine **Update**,
  a **Vent** (they need to be heard), or a **Disaster** (something's on fire). Diagnose which before you drive
  an agenda. Paraphrase (caveat 4).
- **Laraway Career Conversations** — a three-conversation arc: **(1) Life Story** (what shaped their values),
  **(2) Dreams** (where they ultimately want to get to), **(3) Career Action Plan** (a long-term vision + a
  short-term plan to move toward it). The `career` verb runs this. Note the vision+short-term framing, NOT an
  "18-month" or "15-month" plan (caveat 2).
- **GitLab agenda template** — a shared, running 1:1 doc the report co-owns and adds to before the meeting; the
  running **Inbox** in this skill's record is that template's local form.
- **Hogan first-1:1 operating-manual questions** — early questions to learn how to lead someone: *How do you
  like to receive feedback? What does a great week look like? How do I know when you're stressed? What do you
  want me to keep doing / stop doing?* (The two-column "Bias Toward Action/Feelings" exercise sometimes bundled
  with this is **unverified — likely Resilient Management**; caveat 3.)

---

## Question bank

Intent-tagged. `plan` pulls the `opener` line plus 1–2 questions for each intent surfaced by the record
(inbox tags, `career-due`, `status-creep`); `career` pulls the `career` set. Intents:
`opener` · `growth-career` · `blockers` · `morale` · `feedback-up` · `relationship` · `workload` · `career`.
(Inbox tags map: `growth`→`growth-career`, `blocker`→`blockers`, `feedback-up`→`feedback-up`, `morale`→`morale`.)

<!-- question-bank:start -->
- [opener] Before we get into anything on the list — how are you actually doing this week?
- [opener] What's top of mind for you today? Let's start where you want to start.
- [opener] What would make this half-hour most useful to you right now?
- [growth-career] What would make the next six months feel like real growth to you?
- [growth-career] Which skill do you most want to stretch this quarter, and what's blocking the reps?
- [growth-career] What work have you done recently that you're proudest of — and did I notice it?
- [growth-career] If you could redesign your role, what would you do more of and less of?
- [blockers] What's the single biggest thing in your way right now that I could clear?
- [blockers] Where are you stuck or waiting on someone, and how long has it been?
- [blockers] What decision are you waiting on me for?
- [morale] On a rough scale, how's your energy for the work lately — and what's driving it?
- [morale] Is there anything draining you right now that we haven't talked about?
- [morale] What's felt good this week? What's felt heavy?
- [feedback-up] How could I be more helpful to you? (Then stay quiet and let them answer.)
- [feedback-up] What's one thing I should start, stop, or keep doing as your manager?
- [feedback-up] Is there anything I did recently that landed wrong or got in your way?
- [relationship] How do you prefer to get feedback from me — in the moment, written, or set aside for here?
- [relationship] When you're stressed, how do I tend to find out — and how would you rather I did?
- [relationship] What do you need more of from me, and what do you need less of?
- [workload] How's your load right now — under, about right, or over?
- [workload] If something has to give this week, what should it be?
- [workload] What are you spending time on that doesn't feel worth it?
- [career] Life story: what experiences most shaped what you value in work?
- [career] Dreams: if it goes as well as it possibly could, where does your career get to?
- [career] What does "at your best" look like — and when did you last feel it here?
- [career] Career action plan: what's the long-term vision, and the one short-term step toward it we commit to now?
- [career] What's one skill or experience that would move you toward that vision this quarter?
<!-- question-bank:end -->
