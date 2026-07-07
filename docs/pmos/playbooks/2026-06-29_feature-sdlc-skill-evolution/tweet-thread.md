# Tweet thread — the evolution of /feature-sdlc skill

> Draft. NOT cleared to post — see REVIEW-BEFORE-SHARING.md in this folder.

## Standalone tweet

I built an AI pipeline that ships software features — then pointed it at itself. Now it authors the very skills it's made of, grades each one against a 53-check rubric, and runs off a backlog I just top up. The most useful tool I built was the one that builds the others.

## Thread

1/ Over ~7 weeks my PM toolkit for Claude Code (`pmos-toolkit`) grew an orchestrator, `/feature-sdlc`, that drives requirements → spec → plan → build → verify in one resumable run. Here's how it learned to build *itself*. 🧵

2/ Day one it could only ship features. Two retired skills (`/create-skill`, `/update-skills`) handled the skills themselves. Then I folded them in: `/feature-sdlc skill` runs the same chain on a skill instead of a feature. That one move made the toolkit self-hosting.

3/ The piece that made it trustworthy: a binary `skill-eval` gate after the build step. Fail a check → it appends one fix task and re-runs the build on just that. "Done" became a check, not an opinion. TDD, applied to prose.

4/ New capability kept going into the *child* skills, not the orchestrator. Architecture review folded into /spec + /verify. Ideation and problem-shaping bolted onto the front. Bonus every time: people using those skills standalone got the upgrade for free.

5/ Every gate shipped tier-proportionate: a one-line fix skips the ceremony a new feature needs. That's the unglamorous decision that made the next step possible — running the whole thing unattended.

6/ Once skill work was queue-shaped (`define` → `build` → release), I could run the build loop on a timer. My captured sessions from that month are mostly me steering: "Stop the loop for now." "Should we switch to 1h cron?" The work had moved to the backlog.

7/ The payoff: a passing thought becomes an epic. "Why do we even need this index file?" → `/feature-sdlc define` → a fix across three skills + their shared code. Defined, not hand-coded.

8/ The honest edge: a self-hosting system only tests what someone thought to encode, and "passing" means passing *today's* idea of good. The arc isn't finished — it just runs on its own for longer stretches now.

(Written up with /playbook, which reconstructs this kind of story from your own Claude Code session history.)
