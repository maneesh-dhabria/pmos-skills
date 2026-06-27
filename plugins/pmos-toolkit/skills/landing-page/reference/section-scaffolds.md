# Section scaffolds — the default landing-page taxonomy + product-type variants

The ordered section menu the `/landing-page` skill proposes at **Phase 2** (always propose + approve
before drafting — D4). Grounded in
[`02_design.html`](../../../../docs/pmos/features/2026-06-24_landing-page/02_design.html) §3
(`#section-taxonomy`): Julian Shapiro's 7-element backbone expanded to a fuller CRO taxonomy. Every row is
filtered by the governing equation before it earns a place.

## Contents

- [Governing principles](#governing-principles)
- [Default scaffold (12 rows)](#default-scaffold-12-rows)
- [Product-type variants](#product-type-variants)
- [Copy-length rule](#copy-length-rule)

## Governing principles

Two principles govern the page. The first decides **which** sections earn a place; the second decides **how**
each one carries its claim.

### Governing equation — what earns a place

> **Purchase Rate = Desire − (Labor + Confusion)**

Every section must either **add desire** or **remove labor/confusion**. If it does neither, cut it. This
is the litmus the proposer applies to each row below, and the reason the default scaffold adapts by
product-type rather than shipping all 12 rows every time.

### do > show > tell — how a claim is carried

> **Prefer letting the visitor _do_ it; failing that, _show_ it; only then _tell_ it.**

A claim the visitor can try (an interactive snippet) beats one you can show (a screenshot, annotated shot,
carousel, or video), which beats one you merely assert in prose. This is a first-class principle, not a
single gate: the brief captures the **signature moments to demonstrate** (the 2–4 product moments worth
showing — Phase 1); Phase 2 maps each to a **show-surface** (interactive snippet / video / carousel /
annotated screenshot / plain screenshot, best-available first); and Phase 6's show-ratio check
(`copy-gates.md#show-ratio`) flags any section that *tells* a benefit a captured asset could *show*. It is
advisory (judgment), never a hard arithmetic gate.

## Default scaffold (12 rows)

Default order. The proposer adapts it by product-type (next section) before presenting it to the user.

| # | Section | Purpose | Essential / optional |
|---|---|---|---|
| 1 | **Navbar** | Minimal orient + top-right CTA (strip links on a 1:1 campaign page) | Essential |
| 2 | **Hero** | Say exactly what you sell + primary CTA, above the fold | Always |
| 3 | **Social-proof strip** | Borrow credibility immediately (logos / "trusted by") | If any proof exists, **and** the hero caption does not already carry it (dedup — see note) |
| 4 | **Who this is for / not for** | Qualify the visitor — name who the product is for and, plainly, who it is not; removes labor/confusion by letting the wrong-fit visitor self-select out and the right-fit visitor feel seen | Considered/paid; optional for a one-glance free tool |
| 5 | **Problem (PAS / JTBD)** | Name the pain in the visitor's words | Heavy consumer/info; light dev-tool |
| 6 | **Solution / How-it-works** | Frame the product as the obvious fix (3-step / demo) | Essential |
| 7 | **Features as objection-handling** | header + paragraph (handles an objection) + image; each ties back to the hero's value prop | Essential |
| 8 | **Deeper social proof** | Quantified testimonials (name + role + company + photo) | Essential at higher price |
| 9 | **Objection / FAQ** | Kill last doubts; "Is this for me?" | Essential for paid/considered |
| 10 | **Pricing** | Clear offer + guarantee | Paid only; omit for waitlist |
| 11 | **Repeat / final CTA** | Restate the offer at peak intent | Essential |
| 12 | **Footer** | Trust, legal, secondary links, + "Built with pmos-toolkit" attribution | Essential |

> **Dedup note (D3).** The social-proof strip (row 3) is **omitted when the hero caption already carries
> those proof values** — do not double-count the same logos/metric in the caption and again in a strip
> immediately below it. More generally, no section restates the hero's value prop. Phase 2 runs an explicit
> coherence pass over the proposed list to enforce this.

## Product-type variants

The scaffold the proposer **starts from**, selected by the brief's `product_type` (D5). It then trims/adds
rows per the equation and confirms with the user.

### B2B SaaS
Heavy logo bars, quantified ROI testimonials, security/trust section, **demo CTA**. Keep rows 3, 8, 9
strong; Problem (5) is light-to-medium. Pricing (10) present with tiers + guarantee. **Who-for/not-for (4)**
sits high — right after the social-proof strip — framed by company size / role (e.g. "for revenue teams
at 50–500-person SaaS; not for solo founders").

### Consumer app
Lead with the **felt problem + outcome**; lighter copy; lifestyle imagery; **app-store badges** near the
hero and final CTA. Problem (5) is heavy. Pricing often replaced by a free/download CTA. **Who-for/not-for
(4)** is usually light or folded into the hero — a one-glance consumer app rarely needs an explicit
disqualifier; include it only when the audience genuinely splits.

### Dev tool
**Compress the Problem section** (devs already know it); product-as-demo with **code samples**, dark mode.
Solution (6) and Features (7) carry the page; social proof = GitHub stars / adopter logos. Pricing usually
usage-based or omitted for OSS. **Who-for/not-for (4)** is high-value here — devs self-select hard on stack
/ language / scale; place it right after the hero or solution (e.g. "for teams on Postgres at scale; not a
SQLite toy").

### Info-product / course
The growth.design archetype: **long copy**, curriculum modules, **instructor authority**, **money-back
guarantee**, an explicit "Is this course for me?" objection block (9). All 12 rows typically present;
testimonials (8) and FAQ (9) are load-bearing. **Who-for/not-for (4)** is essential and explicit — the
"is this for me?" qualifier is core to the archetype; place it before the curriculum so the wrong-fit
buyer leaves before pricing.

## Copy-length rule

> **Free offer → short copy. Paid → longer copy, with effectiveness rising as price rises.**

A waitlist or free download needs only enough to make the value obvious (remove labor/confusion). A
high-ticket course or enterprise contract justifies — and rewards — long-form copy that builds desire and
dismantles every objection. Match copy length to price; mismatched length is on the §7 anti-pattern list.
