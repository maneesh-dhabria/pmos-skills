# Design-slop prevention reference

<!-- GENERATED from _shared/slop-engine/registry.mjs by gen-rules-doc.mjs — do not edit by hand. -->
<!-- Each DON'T line embeds a rule's skillGuideline verbatim; tools/lint-slop-rules.sh asserts the link. -->

## Typography

- **DON'T**: long body passages in uppercase _(rule: `all-caps-body`)_
- **DON'T**: font family outside the project design system _(rule: `design-system-font`)_
- **DON'T**: letter spacing crushed past legibility _(rule: `extreme-negative-tracking`)_
- **DON'T**: flat type hierarchy _(rule: `flat-type-hierarchy`)_
- **DON'T**: tiny uppercase tracked label above the hero headline _(rule: `hero-eyebrow-chip`)_
- **DON'T**: large icons with rounded corners above every heading _(rule: `icon-tile-stack`)_
- **DON'T**: oversized italic serif as the hero headline _(rule: `italic-serif-display`)_
- **DON'T**: long headline set at display size _(rule: `oversized-h1`)_
- **DON'T**: overused fonts like Inter _(rule: `overused-font`)_
- **DON'T**: repeated eyebrow or kicker labels as section scaffolding _(rule: `repeated-section-kickers`)_
- **DON'T**: only one font family for the entire page _(rule: `single-font`)_

## Color & Contrast

- **DON'T**: AI color palette _(rule: `ai-color-palette`)_
- **DON'T**: cream and beige as the default surface _(rule: `cream-palette`)_
- **DON'T**: dark mode with glowing accents _(rule: `dark-glow`)_
- **DON'T**: literal color outside the project design system _(rule: `design-system-color`)_
- **DON'T**: gradient text for _(rule: `gradient-text`)_
- **DON'T**: gray text on colored backgrounds _(rule: `gray-on-color`)_

## Layout & Space

- **DON'T**: overflow container clipping positioned children _(rule: `clipped-overflow-container`)_
- **DON'T**: inside bordered or colored containers _(rule: `cramped-padding`)_
- **DON'T**: wrap beyond ~80 characters _(rule: `line-length`)_
- **DON'T**: same spacing everywhere _(rule: `monotonous-spacing`)_
- **DON'T**: Nest cards inside cards _(rule: `nested-cards`)_
- **DON'T**: numbered section markers _(rule: `numbered-section-markers`)_
- **DON'T**: content wider than its container _(rule: `text-overflow`)_

## Visual Details

- **DON'T**: colored accent stripe _(rule: `border-accent-on-rounded`)_
- **DON'T**: broken image references _(rule: `broken-image`)_
- **DON'T**: border radius outside the project design system _(rule: `design-system-radius`)_
- **DON'T**: hairline border plus wide diffuse shadow _(rule: `gpt-thin-border-wide-shadow`)_
- **DON'T**: repeating-gradient decorative stripes _(rule: `repeating-stripes-gradient`)_
- **DON'T**: colored accent stripe _(rule: `side-tab`)_

## Motion

- **DON'T**: bounce or elastic easing _(rule: `bounce-easing`)_
- **DON'T**: image scale or rotate on hover _(rule: `image-hover-transform`)_
- **DON'T**: Animate layout properties _(rule: `layout-transition`)_

## UX Writing

- **DON'T**: aphoristic cadence _(rule: `aphoristic-cadence`)_
- **DON'T**: no em dashes _(rule: `em-dash-overuse`)_
- **DON'T**: marketing buzzwords _(rule: `marketing-buzzword`)_
- **DON'T**: theater framing copy _(rule: `theater-slop-phrase`)_
