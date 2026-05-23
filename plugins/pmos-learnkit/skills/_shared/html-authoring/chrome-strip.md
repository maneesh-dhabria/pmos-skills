# chrome-strip helper

**Purpose:** Reduce a substrate-shaped artifact HTML to its substantive body —
`<h1>` + `<main>` only — before passing to a reviewer subagent.

**Why:** Reviewer subagents must spend their tokens on substance, not on the
artifact toolbar, the source-path footer, or the script/style tags from the
substrate. The chrome-strip helper extracts the parts that carry meaning and
emits them as a self-contained HTML fragment.

**Spec refs:** FR-50 (canonical chrome strip), FR-51 (consumer prompt template),
FR-52 (post-dispatch validation), FR-72 (hard-fail on validation mismatch).

## Algorithm

1. **Find first `<h1>`.** Match `/<h1\b[^>]*>[\s\S]*?<\/h1>/i` against the raw
   source. Capture the entire element. The first `<h1>` is the artifact title
   (inserted by `template.html` line 12 inside the toolbar `<header>` — only
   the `<h1>` element is captured here, not its `<header>` parent).
2. **Find first `<main>` (balanced-tag tracker).** A naive regex
   `<main[^>]*>(.*?)</main>` truncates on the **inner** `</main>` whenever the
   body contains a literal `<main>` token — e.g. inside `<pre><code>…</code></pre>`.
   The tracker walks tokens from the first `<main` open: for each `<main` /
   `</main>` encountered, increment / decrement a depth counter; emit the slice
   from the opening `<` through the matching close at depth 0. (See R2
   mitigation in the /spec review log.)
3. **Strip stray chrome from the captured slice.** Remove `<link …>`,
   `<script>…</script>`, `<style>…</style>` tags via tag-bounded regex.
   Defensive only — the substrate template never embeds these inside `<main>`,
   but reviewer prompts must not waste tokens parsing inline scripts that an
   author may have accidentally pasted.
4. **Emit:** `<h1>…</h1>\n<main>…</main>\n` only. No HTML-document wrapper, no
   `<head>`, no toolbar `<header class="pmos-artifact-toolbar">`, no
   source-path `<footer class="pmos-artifact-footer">`.

## Edge cases

| # | Input shape | Tracker behavior |
|---|---|---|
| 1 | Simple `<main>` with one `<section>` | Single open / single close — emit slice unchanged |
| 2 | Nested `<section>` + `<aside>` inside `<main>` | Both nested elements preserved (only `<main` itself is depth-tracked) |
| 3 | Literal `<main>fake</main>` inside `<pre><code>…</code></pre>` within the real outer `<main>` | Tracker depth: outer-open=1 → inner-open=2 → inner-close=1 → outer-close=0 → emit at outer-close |
| 4 | Multiple top-level `<main>` (invalid HTML, but possible) | Emit only the first; subsequent `<main>` siblings are discarded |
| 5 | `<header class="pmos-artifact-toolbar">` before `<main>` and `<footer class="pmos-artifact-footer">` after | Both excluded — they sit outside the captured `<main>` slice and the captured `<h1>` does not transitively include them |

## Reference implementation

Canonical at `assets/chrome-strip.js` (≤80 LOC node helper, no dependencies).
Reviewer-dispatching skills (`/grill`, `/verify`, `/msf-req`, `/msf-wf`,
`/simulate-spec`) inline a Bash invocation:

```
node ${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/chrome-strip.js \
     <artifact>.html > /tmp/<artifact>-stripped.html
```

The reviewer subagent receives the stripped output as its primary input. The
parent skill then validates the subagent's `sections_found` list against the
artifact's `<artifact>.sections.json` (FR-52), and substring-greps every
`quote` field against the original (un-stripped) source to enforce verbatim
quoting (FR-72).

## Self-test

`tests/scripts/assert_chrome_strip.sh` runs all 5 edge-case fixtures
(`tests/fixtures/chrome-strip/{1..5}.html`) through the helper and asserts
presence/absence of marker substrings. Required: exit 0 on every fixture.
