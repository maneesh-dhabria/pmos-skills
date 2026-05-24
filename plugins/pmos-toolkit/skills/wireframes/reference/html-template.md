# Wireframe HTML Template

## Contents

- [Skeleton](#skeleton)
- [Vocabulary cheat-sheet](#vocabulary-cheat-sheet)
- [Annotations](#annotations)
- [Realistic copy guidance](#realistic-copy-guidance)
- [Strict format requirements](#strict-format-requirements)
- [Anti-patterns](#anti-patterns)

Every generated wireframe file MUST follow this skeleton. The shared CSS at `./wireframe.css` (copied into the output folder at the start of Phase 3) provides theme tokens, mock-* primitives, state-switcher styles, annotations layer, and device frames. Files reference that stylesheet — do not duplicate its rules in inline `<style>` blocks.

## Skeleton

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="pmos:skill" content="wireframes">
  <title>{{COMPONENT_NAME}} — {{DEVICE}} — Wireframe</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="./wireframe.css">
  <link rel="stylesheet" href="./assets/comments.css">
  <script src="./assets/comments.js" defer></script>
</head>
<body data-annotations="on">
  <!--
    Review Log (auto-maintained by refinement loops)
    Loop 1: <findings + fixes>
    Loop 2: <findings + fixes>
  -->

  <!-- Wireframe chrome (NOT part of the design — meta toolbar for reviewers) -->
  <header class="wf-chrome">
    <div class="wf-chrome__inner">
      <span class="wf-chrome__title">{{COMPONENT_NAME}}</span>
      <span class="wf-chrome__device">{{DEVICE}}</span>
      <nav class="wf-tabs" aria-label="State switcher">
        <button class="wf-tab" aria-selected="true"  data-state="default">Default</button>
        <button class="wf-tab" aria-selected="false" data-state="empty">Empty</button>
        <button class="wf-tab" aria-selected="false" data-state="loading">Loading</button>
        <button class="wf-tab" aria-selected="false" data-state="error">Error</button>
        <!-- add more states as needed; emit <button>s only for states the component actually has -->
      </nav>
      <button id="toggle-anno" class="wf-tab" aria-pressed="true">Annotations</button>
    </div>
  </header>

  <!-- Device frame: pick exactly one wf-frame--<device> class -->
  <main class="wf-frame wf-frame--{{DEVICE}}">

    <!-- desktop-app only: traffic lights -->
    <!-- <div class="wf-traffic"><span></span><span></span><span></span></div> -->

    <!-- ios-app only: notch + status bar -->
    <!-- <div class="wf-notch"></div>
         <div class="wf-statusbar"><span>9:41</span><span>5G</span></div> -->

    <!-- android-app only: status bar -->
    <!-- <div class="wf-statusbar"><span>9:41</span><span>●●●● 5G</span></div> -->

    <!-- One section per state. Only `.active` is visible. -->
    <section class="wf-state active" data-state="default" aria-labelledby="state-default-h">
      <h1 id="state-default-h" class="sr-only">Default state</h1>
      <!-- Component content goes here. Use Tailwind for layout/spacing,
           wf-* / mock-* primitives for elements that should look identical
           across all wireframe files. Use realistic, domain-aware copy. -->
    </section>

    <section class="wf-state" data-state="empty" aria-labelledby="state-empty-h">
      <h1 id="state-empty-h" class="sr-only">Empty state</h1>
      <div class="wf-message">
        <div class="wf-message__title">{{Domain-relevant empty title}}</div>
        <div class="wf-message__hint">{{Why it's empty + a CTA, never just "No data"}}</div>
        <button class="mock-button mock-button--primary">{{CTA}}</button>
      </div>
    </section>

    <section class="wf-state" data-state="loading" aria-labelledby="state-loading-h">
      <h1 id="state-loading-h" class="sr-only">Loading state</h1>
      <div class="wf-stack">
        <div class="skeleton skeleton--lg" style="width:60%"></div>
        <div class="skeleton" style="width:90%"></div>
        <div class="skeleton" style="width:80%"></div>
      </div>
    </section>

    <section class="wf-state" data-state="error" aria-labelledby="state-error-h">
      <h1 id="state-error-h" class="sr-only">Error state</h1>
      <div class="wf-message wf-message--error">
        <div class="wf-message__title">{{What failed, plain language}}</div>
        <div class="wf-message__hint">{{Why + how to recover}}</div>
        <button class="mock-button">Retry</button>
      </div>
    </section>

    <!-- ios-app only: home indicator -->
    <!-- <div class="wf-home-indicator"></div> -->
    <!-- mobile/native only: tab bar -->
    <!-- <div class="wf-tabbar">…</div> -->

  </main>

  <footer class="wf-footer">
    <div class="wf-footer__inner">
      <span>{{COMPONENT_NAME}}</span>
      <span class="mock-pill">{{DEVICE}}</span>
      <span>File {{NN}} of {{TOTAL}}</span>           <!-- e.g. "File 03 of 6" — leading zero on file index, NO leading zero on total -->
      <span>Generated {{YYYY-MM-DD}}</span>          <!-- always include — non-optional -->
      <a class="wf-grow" style="text-align:right;color:var(--wf-accent)" href="./index.html">Back to index</a>
    </div>
  </footer>

  <script>
    // State switcher
    const tabs = document.querySelectorAll('.wf-tab[data-state]');
    const states = document.querySelectorAll('.wf-state');
    tabs.forEach(t => t.addEventListener('click', () => {
      tabs.forEach(x => x.setAttribute('aria-selected', x === t));
      states.forEach(s => s.classList.toggle('active', s.dataset.state === t.dataset.state));
    }));
    // Annotations toggle
    const annoBtn = document.getElementById('toggle-anno');
    annoBtn.addEventListener('click', () => {
      const on = document.body.dataset.annotations === 'on';
      document.body.dataset.annotations = on ? 'off' : 'on';
      annoBtn.setAttribute('aria-pressed', String(!on));
    });
  </script>
</body>
</html>
```

## Vocabulary cheat-sheet

These come from `./wireframe.css`. Use them so every wireframe in a feature folder feels like part of one set.

| Class | Use for |
|-------|---------|
| `.wf-frame--desktop-web` / `--desktop-app` / `--mobile-web` / `--android-app` / `--ios-app` | Outer device frame — pick exactly one |
| `.wf-chrome`, `.wf-chrome__inner`, `.wf-chrome__title`, `.wf-chrome__device` | Top reviewer toolbar |
| `.wf-tabs`, `.wf-tab` | State switcher |
| `.wf-state`, `.wf-state.active` | One section per state; only the active one renders |
| `.wf-anno` + `data-note="…"` | Annotation callout for non-obvious interactions |
| `.mock-nav`, `.mock-sidebar`, `.mock-content` | Wireframe chrome blocks |
| `.mock-card` | Surface card |
| `.mock-button` (`--primary`, `--danger`) | Button |
| `.mock-input`, `.mock-label` | Form controls |
| `.mock-pill` | Tag / chip |
| `.mock-divider` | Horizontal rule |
| `.mock-img` | Image placeholder (auto-renders "image" label) |
| `.placeholder` | Striped placeholder block |
| `.skeleton`, `.skeleton--lg` | Loading state lines |
| `.wf-message` (`--error`, `--success`) | Empty / error / success messaging |
| `.wf-statusbar`, `.wf-tabbar`, `.wf-fab`, `.wf-notch`, `.wf-home-indicator`, `.wf-traffic` | Native chrome |
| `.wf-stack`, `.wf-row`, `.wf-grow`, `.wf-muted`, `.wf-mono`, `.sr-only` | Tiny utilities |

Tailwind utilities are still available for layout and spacing — combine freely.

## Annotations

Wrap any element whose interaction is non-obvious:

```html
<button class="wf-anno mock-button mock-button--primary"
        data-note="Submits, then routes to /confirmation">Confirm</button>
```

Annotations are toggleable via the chrome button and don't appear when off.

## Realistic copy guidance

- Pull product, role, and entity names from the requirements doc
- Use realistic numbers (`$1,247.50` not `$XX.XX`)
- Use real-shape names ("Acme Pilot Q3 Renewal", not "Project A")
- Dates as actual dates near today, not placeholders

## Strict format requirements

Subagents drift on these unless the format is shown verbatim. Match these exactly.

**Footer:**

```html
<span>File 03 of 6</span>          <!-- leading zero on file index; NO leading zero on total -->
<span>Generated 2026-05-01</span>  <!-- always include — non-optional -->
```

**Accessibility — icon-only / short-label buttons:**

Every `<button>` whose visible content is fewer than 5 characters OR contains only emoji/symbols MUST have an `aria-label` attribute describing its purpose.

```html
<button aria-label="Close" title="Close">×</button>
<button aria-label="Add to favorites">⭐</button>
<button aria-label="More actions">⋯</button>
```

This applies uniformly across files in a feature folder — high-variance coverage (one wireframe with 31 aria-labels, another with 1) is a defect the cross-file reviewer will catch.

## Anti-patterns

- Do NOT duplicate `wireframe.css` rules in inline `<style>` — extend the stylesheet instead, or use Tailwind utilities for one-offs
- Do NOT remove the state-switcher even if a component has only one state (keeps chrome consistent across files)
- Do NOT remove the annotations toggle — reviewers need a clean view too
- Do NOT use `Lorem ipsum`
- Do NOT use real photographs or finished iconography — `mock-img`, emoji, or labeled boxes only
- Do NOT vary the footer format across files — "File 3 of 06" / "File 03 of 06" / "File 03 of 6" must NOT mix; only the last form is correct
