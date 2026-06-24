# Phase 6 self-review — pmos-skills landing page

Dogfood evidence for story 260624-pe2 (`/landing-page` run end-to-end against this repo).

## Copy / conversion gates (`reference/copy-gates.md`) — PASS

- **Julian's litmus** — headline "Turn Claude Code into a product-delivery OS." names exactly what is sold. ✔
- **Harry Dry 3-test** — claims are concrete (5 plugins / 50+ skills / pipeline stages), falsifiable (real
  in-repo counts), and ownable ("product-delivery OS"). ✔
- **6-criteria** — single conversion action (install); page holds attention via the live-demo hero + bento;
  instantly clear; each section deepens desire or removes doubt; nothing padded; every claim is real. ✔
- **Single-CTA / attention ratio** — one isolated primary action (Install) in green (von Restorff),
  repeated at nav + hero + final CTA; "View source" is the quieter ghost secondary. ✔
- **Anti-patterns** — no slogans, no abstract stock imagery, no fabricated metrics/logos/testimonials;
  proof is real in-repo counts with adopter logos/testimonials left as **labelled placeholders** (D6). ✔

## Visual self-check (D10) — PASS

Rendered over `http://localhost` (Playwright; `file://` blocked in this repo), screenshotted desktop +
mobile. Hero + single CTA above the fold on both; all sections render in order; dark-developer-tool tokens
bound (#0d1117 bg, #3fb950 accent, AA contrast — guaranteed by the substrate, §H); responsive collapse
correct (bento 6→2 col, hero 2→1 col); no overflow. Only console message = favicon.ico 404 (harmless
browser auto-request, not a page dependency).

- `working/desktop-fullpage.png`, `working/mobile-fullpage.png` — v1 render (reviewer verdict: SHIP, 0 repairs).
- `working/desktop-fullpage-v2.png` — post-iteration render (no visual regression).

## Structural gate — PASS

`node` structural check: 17/17 (v1), 10/10 (v2 post-iteration). Asserts pmos:skill meta + inline
pmos-comments block, bound token palette, no external resource fetch (D3 self-containment), single
first-person CTA, sections in order, labelled placeholders (D6).

## Iteration (the "iterate from there" pass)

The page shipped clean on first render — the ≤2-loop reviewer found nothing to repair. One genuine
quality pass was then applied (real gaps, not busywork): added `<meta name="description">` for
sharing/SEO, keyboard `:focus-visible` outlines on all CTAs/links, and a `prefers-reduced-motion` guard.
Re-rendered: no visual regression, gates still green. Converged.

## Outcome

**SHIP.** The six-phase `/landing-page` workflow produced a styled, gate-passing `index.html` + cited
`brief.md` in the per-page folder, dogfooded on the pmos-skills repo itself.
