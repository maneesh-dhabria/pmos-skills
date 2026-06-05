# Writing Principles — Shared Contract

Author-time prose principles for every pmos skill that emits human-readable text (specs, requirements, plans, READMEs, changelogs, design critiques, survey copy, …). Write *to* these; `/polish` enforces them.

**Two roles, one source.** This file is the **positive statement** — what good pmos prose looks like, used while authoring. `plugins/pmos-toolkit/skills/polish/reference/rubric.md` is the **enforcement** — the 14-check binary rubric that detects violations of these principles. Each principle below names the polish check(s) that police it; keep the two in sync when either changes.

**Voice is preserved.** These principles target generic AI-slop and bloat, never the author's voice. `/polish` carries a `PRESERVE_VOICE_CONFLICT` escape for exactly this reason — when a "violation" is a deliberate stylistic choice, the voice wins.

---

## The principles

1. **Lead with the claim (BLUF).** The first paragraph states the document's central point. No throat-clearing openers ("In today's…", "It is important to note", "As we all know"), no warm-up sentences before the lede. *(polish checks 4, 14)*

2. **Cut clutter and filler.** Delete words that carry no load: *very, really, just, actually, basically, simply, in order to, the fact that, due to the fact that, at this point in time*. "in order to" → "to"; "due to the fact that" → "because". *(check 1)*

3. **Prefer active voice.** Name the actor. Keep passive constructions to a minority of sentences. *(check 2)*

4. **Vary sentence length.** Mix short declaratives with longer explanatory sentences; uniform-length prose reads as machine-generated. *(check 3)*

5. **Use em-dashes sparingly.** At most ~one per 200 words. Reach for a comma, period, or parenthesis first. *(check 5)*

6. **Avoid AI-slop vocabulary.** Never use *delve, tapestry, navigate the landscape, embark on a journey, in the realm of*. Use *robust, foster, ecosystem, holistic, leverage, seamless, intricate, multifaceted* only when **concrete and load-bearing** (e.g. "robust error handling"), never decoratively ("robust framework for thinking"). *(checks 6a, 6b)*

7. **Drop emphasis tics.** No "not just X, it's Y" constructions — make the direct claim. No rhetorical tricolons ("X, Y, and Z" triplets for rhythm rather than a genuine list). *(checks 7, 8)*

8. **Hedge once, or not at all.** One qualifier per sentence maximum; stacking *might / could / perhaps / possibly* signals you don't trust the claim. If the claim is sound, state it. *(check 9)*

9. **Connect by content, not connectors.** Paragraphs should follow from each other's substance. Avoid opening paragraphs with *Furthermore, Moreover, Additionally, In addition, That said*. *(check 10)*

10. **Keep headings shallow and earned.** Heading depth ≤ 3 (`####`+ is a smell). Every section carries enough content to justify its heading; don't fragment prose into stubs. *(check 11)*

11. **Prose over bullet-abuse.** Bullets are for genuine enumerable lists. When bullets are full sentences that flow into one another, write a paragraph. *(check 12)*

12. **Ground every claim.** Within ~3 sentences of any assertion, anchor it to a concrete noun, number, name, or example. Vague abstraction without grounding is the most common failure mode. *(check 13)*

---

## Using this file

- **Authoring skills** (`/spec`, `/requirements`, `/plan`, `/readme`, `/changelog`, `/artifact`, `/design-crit`, `/survey-design`, …): cite this file via `_shared/html-authoring/conventions.md §12`. Hold output to these principles as you write, so `/polish` has little to fix.
- **`/polish`**: `reference/rubric.md` is the executable enforcement. When you add or change a principle here, update the matching check there (and vice-versa).
