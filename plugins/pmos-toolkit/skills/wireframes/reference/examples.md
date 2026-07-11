# Worked examples — start from the nearest one, don't build from blank

## Contents

- [Example 1 — Desktop dashboard](#example-1--desktop-dashboard-1280--800)
- [Example 2 — Mobile form](#example-2--mobile-form-375--812)
- [Example 3 — Modal overlay](#example-3--modal-overlay-1280--800)
- [Example 4 — Multi-state screen](#example-4--multi-state-screen-1280--800-four-states)

**Four complete screens in our emit format.** `#generate` drift ("one wireframe with 31 aria-labels, another
with 1") is the signature of fan-out generation without an exemplar. These four are the exemplars: each is a
**complete** inline-monochrome-`<svg>` payload in the format [`html-template.md`](./html-template.md) defines —
no fragments, no ellipses — composed **only** from the named primitives in [`primitives.md`](./primitives.md),
and each **passes `scripts/lint-wireframe-svg.mjs`** (extract any `<svg>…</svg>` block below to a `.svg` file and
run the lint; every one exits 0).

**Pick the nearest example, then modify it:**

| Your screen | Start from |
|---|---|
| A desktop page with a sidebar, metrics, and a table | **Example 1 — Desktop dashboard** |
| A single mobile form (inputs + a submit button) | **Example 2 — Mobile form** |
| A dialog / confirmation / anything over a scrim | **Example 3 — Modal overlay** |
| Any screen with more than one required state (empty / loading / error) | **Example 4 — Multi-state screen** |

Every example is drawn from `primitives.md` by name — the "Primitives used" line under each screen lists exactly
which. Two primitives these examples needed and the library lacked were **added to `primitives.md`** (the table
data row, the modal scrim), never one-offed here — that is the rule: a missing primitive is a library edit, not
inline geometry.

---

## Example 1 — Desktop dashboard (1280 × 800)

**When to use:** a desktop web/app landing surface — a persistent left sidebar, a metrics strip, and a columnar
data table. This is the "start here" for any multi-region desktop page.

**Primitives used:** Card (5) + List row (13) for the sidebar · Top app bar (8) · Key-value stat (16) ×3 ·
Table header row (14) + Table data row (15) ×3 · Primary button (4) · Numbered marker (25).

```html
<section class="wf-state active" data-state="default" aria-labelledby="dash-h">
  <h1 id="dash-h" class="sr-only">Renewals dashboard</h1>
  <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800"
       stroke="#000" fill="none"
       font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <g data-region="app-bar" data-anchor="app-bar" transform="translate(0,0)">
      <title>Top app bar</title>
      <desc>Product name and account avatar (primitive 8).</desc>
      <rect x="0" y="0" width="1280" height="56" fill="#fff" stroke="#e6e6e6"/>
      <text x="24" y="32" font-size="20" fill="#000" stroke="none">Acme Reports</text>
      <rect x="1216" y="8" width="40" height="40" fill="#e6e6e6"/>
    </g>
    <g data-region="sidebar" data-anchor="sidebar" transform="translate(0,56)">
      <title>Sidebar navigation</title>
      <desc>Card panel (primitive 5) holding List-row nav items (primitive 13); Renewals is active.</desc>
      <rect x="0" y="0" width="240" height="744" fill="#fff" stroke="#e6e6e6"/>
      <rect x="0" y="0" width="240" height="48" fill="#fff"/>
      <circle cx="24" cy="24" r="8" fill="#666"/>
      <text x="48" y="32" font-size="14" fill="#666" stroke="none">Overview</text>
      <rect x="0" y="48" width="240" height="48" fill="#f4f4f4"/>
      <circle cx="24" cy="72" r="8" fill="#000"/>
      <text x="48" y="80" font-size="14" fill="#000" stroke="none">Renewals</text>
      <rect x="0" y="96" width="240" height="48" fill="#fff"/>
      <circle cx="24" cy="120" r="8" fill="#666"/>
      <text x="48" y="128" font-size="14" fill="#666" stroke="none">Reports</text>
    </g>
    <g data-region="heading" data-anchor="heading" transform="translate(264,88)">
      <title>Page heading</title>
      <desc>Screen title and one-line summary (primitive 12).</desc>
      <text x="0" y="24" font-size="28" fill="#000" stroke="none">Q3 Renewals</text>
      <text x="0" y="64" font-size="14" fill="#666" stroke="none">14 accounts up for renewal this quarter.</text>
    </g>
    <g data-region="metrics" data-anchor="metrics" transform="translate(264,168)">
      <title>Key metrics</title>
      <desc>Three key-value stats (primitive 16): active users, renewals due, total ARR.</desc>
      <text x="0" y="32" font-size="28" fill="#000" stroke="none">1,284</text>
      <text x="0" y="56" font-size="12" fill="#666" stroke="none">Active users</text>
      <text x="240" y="32" font-size="28" fill="#000" stroke="none">42</text>
      <text x="240" y="56" font-size="12" fill="#666" stroke="none">Renewals due</text>
      <text x="480" y="32" font-size="28" fill="#000" stroke="none">$1.2M</text>
      <text x="480" y="56" font-size="12" fill="#666" stroke="none">Total ARR</text>
    </g>
    <g data-region="table" data-anchor="table" transform="translate(264,280)">
      <title>Renewals table</title>
      <desc>Table header row (primitive 14) over three table data rows (primitive 15).</desc>
      <rect x="0" y="0" width="720" height="40" fill="#f4f4f4"/>
      <text x="16" y="24" font-size="12" fill="#666" stroke="none">ACCOUNT</text>
      <text x="280" y="24" font-size="12" fill="#666" stroke="none">STATUS</text>
      <text x="560" y="24" font-size="12" fill="#666" stroke="none">RENEWS</text>
      <rect x="0" y="40" width="720" height="48" fill="#fff"/>
      <text x="16" y="72" font-size="14" fill="#000" stroke="none">Acme Pilot Q3</text>
      <text x="280" y="72" font-size="14" fill="#666" stroke="none">Active</text>
      <text x="560" y="72" font-size="14" fill="#666" stroke="none">2026-09-30</text>
      <line x1="0" y1="88" x2="720" y2="88" stroke="#e6e6e6" stroke-width="1"/>
      <rect x="0" y="88" width="720" height="48" fill="#f4f4f4"/>
      <text x="16" y="120" font-size="14" fill="#000" stroke="none">Globex Renewal</text>
      <text x="280" y="120" font-size="14" fill="#666" stroke="none">At risk</text>
      <text x="560" y="120" font-size="14" fill="#666" stroke="none">2026-10-15</text>
      <line x1="0" y1="136" x2="720" y2="136" stroke="#e6e6e6" stroke-width="1"/>
      <rect x="0" y="136" width="720" height="48" fill="#fff"/>
      <text x="16" y="168" font-size="14" fill="#000" stroke="none">Initech Annual</text>
      <text x="280" y="168" font-size="14" fill="#666" stroke="none">Active</text>
      <text x="560" y="168" font-size="14" fill="#666" stroke="none">2026-11-02</text>
      <line x1="0" y1="184" x2="720" y2="184" stroke="#e6e6e6" stroke-width="1"/>
    </g>
    <!-- 1: the primary CTA opens the renewal composer for the selected account -->
    <g data-region="actions" data-anchor="actions" transform="translate(264,504)">
      <title>Primary action</title>
      <desc>Filled button (primitive 4); opens the renewal composer.</desc>
      <rect data-interactive="true" x="0" y="0" width="160" height="40" fill="#000"/>
      <text x="24" y="24" font-size="14" fill="#fff" stroke="none">Start renewal</text>
    </g>
    <g data-region="annotations" data-anchor="annotations" transform="translate(440,504)">
      <title>Reviewer annotations</title>
      <desc>Numbered redline keyed to the footer list; the only annotation-red in the file (primitive 25).</desc>
      <circle cx="16" cy="16" r="16" fill="#d33"/>
      <text x="16" y="24" font-size="14" fill="#fff" stroke="none" text-anchor="middle">1</text>
    </g>
  </svg>
</section>
```

**Numbered annotations**

1. The primary CTA opens the renewal composer for the selected account.

**Assumptions the author made**

- The sidebar's three items are the app's top-level sections; "Renewals" is active because this is the renewals
  surface. Real nav comes from the requirements doc.
- Metric values (`1,284`, `42`, `$1.2M`) are plausible placeholders, not live figures.
- "At risk" is a status value the table supports; the status vocabulary is the account model's, not invented here.

**Manifest** (`pmos-wireframe-meta`)

```json
{
  "states": ["default"],
  "fields": [],
  "components": [
    { "kind": "app-bar",   "variant": null,      "label": "Acme Reports",  "state": "default", "region": "app-bar",  "anchor": "app-bar" },
    { "kind": "nav",       "variant": "sidebar", "label": "Renewals",      "state": "default", "region": "sidebar",  "anchor": "sidebar" },
    { "kind": "stat",      "variant": null,      "label": "Active users",  "state": "default", "region": "metrics",  "anchor": "metrics" },
    { "kind": "table",     "variant": null,      "label": "Renewals",      "state": "default", "region": "table",    "anchor": "table" },
    { "kind": "button",    "variant": "primary", "label": "Start renewal", "state": "default", "region": "actions",  "anchor": "actions" }
  ],
  "annotations": [
    { "n": 1, "note": "The primary CTA opens the renewal composer for the selected account.", "anchor": "annotations", "state": "default" }
  ]
}
```

---

## Example 2 — Mobile form (375 × 812)

**When to use:** a single mobile screen whose job is to collect input and submit. The root `<svg>` is 375 wide
(exempt), but every full-bleed child snaps to **368** (not 375) or the 8px-grid lint rejects it. The submit
button is `data-interactive` and **48 px tall** — the next 8-grid multiple above the 44 px tap-target floor.

**Primitives used:** Top app bar (8, at mobile width) · Text input (1) ×2 · Checkbox + label (2) · Primary
button (4, `data-interactive`, full-width) · Numbered marker (25).

```html
<section class="wf-state active" data-state="default" aria-labelledby="form-h">
  <h1 id="form-h" class="sr-only">Add payment method</h1>
  <svg xmlns="http://www.w3.org/2000/svg" width="375" height="812" viewBox="0 0 375 812"
       stroke="#000" fill="none"
       font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <g data-region="app-bar" data-anchor="app-bar" transform="translate(0,0)">
      <title>Top app bar</title>
      <desc>Screen title on a full-bleed bar snapped to 368 wide (primitive 8).</desc>
      <rect x="0" y="0" width="368" height="56" fill="#fff" stroke="#e6e6e6"/>
      <text x="16" y="32" font-size="20" fill="#000" stroke="none">Add card</text>
    </g>
    <g data-region="field-name" data-anchor="field-name" transform="translate(16,88)">
      <title>Cardholder name field</title>
      <desc>Labelled text input (primitive 1); tap target 48 px tall.</desc>
      <text x="0" y="16" font-size="12" fill="#666" stroke="none">Cardholder name</text>
      <rect data-interactive="true" x="0" y="24" width="336" height="48" fill="#fff" stroke="#000"/>
      <text x="8" y="56" font-size="14" fill="#666" stroke="none">Jordan Rivera</text>
    </g>
    <g data-region="field-number" data-anchor="field-number" transform="translate(16,184)">
      <title>Card number field</title>
      <desc>Labelled text input (primitive 1); tap target 48 px tall.</desc>
      <text x="0" y="16" font-size="12" fill="#666" stroke="none">Card number</text>
      <rect data-interactive="true" x="0" y="24" width="336" height="48" fill="#fff" stroke="#000"/>
      <text x="8" y="56" font-size="14" fill="#666" stroke="none">4242 4242 4242 4242</text>
    </g>
    <g data-region="field-save" data-anchor="field-save" transform="translate(16,280)">
      <title>Save-card checkbox</title>
      <desc>Checkbox and label (primitive 2).</desc>
      <rect x="0" y="0" width="24" height="24" fill="#fff" stroke="#000"/>
      <text x="32" y="16" font-size="14" fill="#000" stroke="none">Save this card for next time</text>
    </g>
    <!-- 1: submit is disabled until name and number both validate -->
    <g data-region="actions" data-anchor="actions" transform="translate(16,336)">
      <title>Submit action</title>
      <desc>Full-width primary button (primitive 4); 48 px tall tap target.</desc>
      <rect data-interactive="true" x="0" y="0" width="336" height="48" fill="#000"/>
      <text x="128" y="32" font-size="14" fill="#fff" stroke="none">Add card</text>
    </g>
    <g data-region="annotations" data-anchor="annotations" transform="translate(288,336)">
      <title>Reviewer annotations</title>
      <desc>Numbered redline keyed to the footer list; the only annotation-red in the file (primitive 25).</desc>
      <circle cx="16" cy="16" r="16" fill="#d33"/>
      <text x="16" y="24" font-size="14" fill="#fff" stroke="none" text-anchor="middle">1</text>
    </g>
  </svg>
</section>
```

**Numbered annotations**

1. Submit is disabled until name and number both validate.

**Assumptions the author made**

- The form collects a card; the field set (name, number, save-for-later) is the minimum a card capture needs.
- Placeholder values (`Jordan Rivera`, `4242 …`) are illustrative; the `4242` test number signals "example".
- The save-card checkbox defaults unchecked.

**Manifest** (`pmos-wireframe-meta`)

```json
{
  "states": ["default"],
  "fields": [
    { "name": "cardholder_name", "type": "text",     "state": "default", "region": "field-name",   "anchor": "field-name" },
    { "name": "card_number",     "type": "text",     "state": "default", "region": "field-number", "anchor": "field-number" },
    { "name": "save_card",       "type": "checkbox", "state": "default", "region": "field-save",   "anchor": "field-save" }
  ],
  "components": [
    { "kind": "app-bar", "variant": null,      "label": "Add card", "state": "default", "region": "app-bar", "anchor": "app-bar" },
    { "kind": "button",  "variant": "primary", "label": "Add card", "state": "default", "region": "actions", "anchor": "actions" }
  ],
  "annotations": [
    { "n": 1, "note": "Submit is disabled until name and number both validate.", "anchor": "annotations", "state": "default" }
  ]
}
```

---

## Example 3 — Modal overlay (1280 × 800)

**When to use:** any dialog, confirmation, or sheet that sits **over** the current page — a delete confirmation,
a share sheet, a form-in-a-modal. The scrim (primitive 21) dims the whole canvas; the dialog (primitive 20)
centres on top. The destructive action is the filled button; Cancel is the outlined one.

**Primitives used:** Scrim / modal backdrop (21) · Modal dialog (20) · Numbered marker (25).

```html
<section class="wf-state active" data-state="default" aria-labelledby="modal-h">
  <h1 id="modal-h" class="sr-only">Delete account confirmation</h1>
  <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800"
       stroke="#000" fill="none"
       font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <g data-region="scrim" data-anchor="scrim" transform="translate(0,0)">
      <title>Modal scrim</title>
      <desc>Dimmed backdrop over the page behind the dialog (primitive 21).</desc>
      <rect x="0" y="0" width="1280" height="800" fill="#f4f4f4"/>
    </g>
    <!-- 1: Delete is destructive and irreversible — it is the filled button, Cancel is outlined -->
    <g data-region="dialog" data-anchor="dialog" transform="translate(440,280)">
      <title>Confirmation dialog</title>
      <desc>Title, body, and a Cancel / Delete button pair (primitive 20).</desc>
      <rect x="0" y="0" width="400" height="240" fill="#fff" stroke="#000"/>
      <text x="24" y="48" font-size="20" fill="#000" stroke="none">Delete this account?</text>
      <text x="24" y="88" font-size="14" fill="#666" stroke="none">This permanently removes all reports and data.</text>
      <rect data-interactive="true" x="160" y="184" width="104" height="40" fill="#fff" stroke="#000"/>
      <text x="184" y="208" font-size="14" fill="#000" stroke="none">Cancel</text>
      <rect data-interactive="true" x="272" y="184" width="104" height="40" fill="#000"/>
      <text x="296" y="208" font-size="14" fill="#fff" stroke="none">Delete</text>
    </g>
    <g data-region="annotations" data-anchor="annotations" transform="translate(848,280)">
      <title>Reviewer annotations</title>
      <desc>Numbered redline keyed to the footer list; the only annotation-red in the file (primitive 25).</desc>
      <circle cx="16" cy="16" r="16" fill="#d33"/>
      <text x="16" y="24" font-size="14" fill="#fff" stroke="none" text-anchor="middle">1</text>
    </g>
  </svg>
</section>
```

**Numbered annotations**

1. Delete is destructive and irreversible — it is the filled button; Cancel is outlined.

**Assumptions the author made**

- The scrim is non-interactive; tapping it cancels (standard modal behaviour), same as Cancel.
- "Delete account" is the confirming verb on the primary button — a specific verb, never a bare "OK".
- The dialog is 400 × 240 centred on the 1280 × 800 canvas.

**Manifest** (`pmos-wireframe-meta`)

```json
{
  "states": ["default"],
  "fields": [],
  "components": [
    { "kind": "scrim",  "variant": null,        "label": null,      "state": "default", "region": "scrim",  "anchor": "scrim" },
    { "kind": "dialog", "variant": "confirm",   "label": "Delete this account?", "state": "default", "region": "dialog", "anchor": "dialog" },
    { "kind": "button", "variant": "secondary", "label": "Cancel",  "state": "default", "region": "dialog", "anchor": "dialog" },
    { "kind": "button", "variant": "primary",   "label": "Delete",  "state": "default", "region": "dialog", "anchor": "dialog" }
  ],
  "annotations": [
    { "n": 1, "note": "Delete is destructive and irreversible — it is the filled button; Cancel is outlined.", "anchor": "annotations", "state": "default" }
  ]
}
```

---

## Example 4 — Multi-state screen (1280 × 800, four states)

**When to use:** any screen whose content depends on data that can be present, absent, in-flight, or failed —
i.e. almost every real data screen. **This is the exemplar the reference tools cannot demonstrate**, and the one
most likely to be copied wrong, so it is shown in full: four `<section class="wf-state">` blocks (default /
empty / loading / error) in **one file**, switched by the `.wf-chrome` state tabs, sharing region ids so a
reviewer reads them as one screen. The single `pmos-wireframe-meta` manifest enumerates all four states.

The four states are **visibly, structurally distinct** (the S1–S4 house heuristics): default = populated table;
empty = an empty-state message **with a CTA** (never a bare "No data"); loading = **skeleton** rows (never a bare
spinner); error = a plain-language reason **with a recovery path**.

**Primitives used:** Top app bar (8) · Heading + body block (12) · Table header row (14) + Table data row (15) ·
Two-column split (7, as skeleton rows) · Primary button (4) · Numbered marker (25).

```html
<!-- default: populated -->
<section class="wf-state active" data-state="default" aria-labelledby="ms-default-h">
  <h1 id="ms-default-h" class="sr-only">Invoices — default state</h1>
  <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800"
       stroke="#000" fill="none"
       font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <g data-region="app-bar" data-anchor="app-bar" transform="translate(0,0)">
      <title>Top app bar</title>
      <desc>Product name (primitive 8); shared across all four states.</desc>
      <rect x="0" y="0" width="1280" height="56" fill="#fff" stroke="#e6e6e6"/>
      <text x="24" y="32" font-size="20" fill="#000" stroke="none">Billing</text>
    </g>
    <g data-region="content" data-anchor="content" transform="translate(24,88)">
      <title>Invoices table</title>
      <desc>Populated: header row (primitive 14) over two data rows (primitive 15).</desc>
      <rect x="0" y="0" width="720" height="40" fill="#f4f4f4"/>
      <text x="16" y="24" font-size="12" fill="#666" stroke="none">INVOICE</text>
      <text x="280" y="24" font-size="12" fill="#666" stroke="none">AMOUNT</text>
      <text x="560" y="24" font-size="12" fill="#666" stroke="none">DUE</text>
      <rect x="0" y="40" width="720" height="48" fill="#fff"/>
      <text x="16" y="72" font-size="14" fill="#000" stroke="none">INV-2043</text>
      <text x="280" y="72" font-size="14" fill="#666" stroke="none">$1,247.50</text>
      <text x="560" y="72" font-size="14" fill="#666" stroke="none">2026-08-01</text>
      <line x1="0" y1="88" x2="720" y2="88" stroke="#e6e6e6" stroke-width="1"/>
      <rect x="0" y="88" width="720" height="48" fill="#f4f4f4"/>
      <text x="16" y="120" font-size="14" fill="#000" stroke="none">INV-2044</text>
      <text x="280" y="120" font-size="14" fill="#666" stroke="none">$3,900.00</text>
      <text x="560" y="120" font-size="14" fill="#666" stroke="none">2026-08-15</text>
      <line x1="0" y1="136" x2="720" y2="136" stroke="#e6e6e6" stroke-width="1"/>
    </g>
  </svg>
</section>

<!-- empty: message + CTA, never a bare "No data" -->
<section class="wf-state" data-state="empty" aria-labelledby="ms-empty-h">
  <h1 id="ms-empty-h" class="sr-only">Invoices — empty state</h1>
  <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800"
       stroke="#000" fill="none"
       font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <g data-region="app-bar" data-anchor="app-bar" transform="translate(0,0)">
      <title>Top app bar</title>
      <desc>Product name (primitive 8); shared across all four states.</desc>
      <rect x="0" y="0" width="1280" height="56" fill="#fff" stroke="#e6e6e6"/>
      <text x="24" y="32" font-size="20" fill="#000" stroke="none">Billing</text>
    </g>
    <!-- 1: the empty state offers the next action, never a dead end -->
    <g data-region="content" data-anchor="content" transform="translate(24,88)">
      <title>Empty state</title>
      <desc>Explains why there is nothing and offers a CTA (primitives 12 + 4); never a bare "No data".</desc>
      <text x="0" y="24" font-size="20" fill="#000" stroke="none">No invoices yet</text>
      <text x="0" y="56" font-size="14" fill="#666" stroke="none">Invoices appear here once you bill your first customer.</text>
      <rect data-interactive="true" x="0" y="80" width="160" height="40" fill="#000"/>
      <text x="24" y="104" font-size="14" fill="#fff" stroke="none">Create invoice</text>
    </g>
    <g data-region="annotations" data-anchor="annotations" transform="translate(200,168)">
      <title>Reviewer annotations</title>
      <desc>Numbered redline keyed to the footer list; the only annotation-red in the file (primitive 25).</desc>
      <circle cx="16" cy="16" r="16" fill="#d33"/>
      <text x="16" y="24" font-size="14" fill="#fff" stroke="none" text-anchor="middle">1</text>
    </g>
  </svg>
</section>

<!-- loading: skeleton rows, never a bare spinner -->
<section class="wf-state" data-state="loading" aria-labelledby="ms-loading-h">
  <h1 id="ms-loading-h" class="sr-only">Invoices — loading state</h1>
  <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800"
       stroke="#000" fill="none"
       font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <g data-region="app-bar" data-anchor="app-bar" transform="translate(0,0)">
      <title>Top app bar</title>
      <desc>Product name (primitive 8); shared across all four states.</desc>
      <rect x="0" y="0" width="1280" height="56" fill="#fff" stroke="#e6e6e6"/>
      <text x="24" y="32" font-size="20" fill="#000" stroke="none">Billing</text>
    </g>
    <g data-region="content" data-anchor="content" transform="translate(24,88)">
      <title>Loading state</title>
      <desc>Skeleton placeholder rows (primitive 7, split panels) stand in while data loads; not a spinner.</desc>
      <rect x="0" y="0" width="720" height="24" fill="#e6e6e6"/>
      <rect x="0" y="40" width="720" height="16" fill="#f4f4f4"/>
      <rect x="0" y="64" width="640" height="16" fill="#f4f4f4"/>
      <rect x="0" y="96" width="720" height="16" fill="#f4f4f4"/>
      <rect x="0" y="120" width="560" height="16" fill="#f4f4f4"/>
    </g>
  </svg>
</section>

<!-- error: plain-language reason + recovery path -->
<section class="wf-state" data-state="error" aria-labelledby="ms-error-h">
  <h1 id="ms-error-h" class="sr-only">Invoices — error state</h1>
  <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800"
       stroke="#000" fill="none"
       font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <g data-region="app-bar" data-anchor="app-bar" transform="translate(0,0)">
      <title>Top app bar</title>
      <desc>Product name (primitive 8); shared across all four states.</desc>
      <rect x="0" y="0" width="1280" height="56" fill="#fff" stroke="#e6e6e6"/>
      <text x="24" y="32" font-size="20" fill="#000" stroke="none">Billing</text>
    </g>
    <g data-region="content" data-anchor="content" transform="translate(24,88)">
      <title>Error state</title>
      <desc>Plain-language reason plus a retry affordance (primitives 12 + 4); the recovery path is explicit.</desc>
      <text x="0" y="24" font-size="20" fill="#000" stroke="none">Couldn't load invoices</text>
      <text x="0" y="56" font-size="14" fill="#666" stroke="none">The billing service timed out. Your data is safe.</text>
      <rect data-interactive="true" x="0" y="80" width="120" height="40" fill="#fff" stroke="#000"/>
      <text x="24" y="104" font-size="14" fill="#000" stroke="none">Retry</text>
    </g>
  </svg>
</section>
```

**Numbered annotations**

1. The empty state offers the next action, never a dead end.

**Assumptions the author made**

- All four states share the same app bar and the same `content` region id, so switching tabs reads as one screen
  changing state — not four different screens.
- Loading uses skeleton rows (not a spinner) because the layout is known before the data arrives.
- The error copy names a cause ("timed out") and reassures ("Your data is safe") rather than showing a raw code.

**Manifest** (`pmos-wireframe-meta`) — one block, all four states enumerated

```json
{
  "states": ["default", "empty", "loading", "error"],
  "fields": [],
  "components": [
    { "kind": "app-bar", "variant": null,      "label": "Billing",        "state": "default", "region": "app-bar", "anchor": "app-bar" },
    { "kind": "table",   "variant": null,      "label": "Invoices",       "state": "default", "region": "content", "anchor": "content" },
    { "kind": "button",  "variant": "primary", "label": "Create invoice", "state": "empty",   "region": "content", "anchor": "content" },
    { "kind": "skeleton","variant": null,      "label": null,             "state": "loading", "region": "content", "anchor": "content" },
    { "kind": "button",  "variant": "secondary","label": "Retry",         "state": "error",   "region": "content", "anchor": "content" }
  ],
  "annotations": [
    { "n": 1, "note": "The empty state offers the next action, never a dead end.", "anchor": "annotations", "state": "empty" }
  ]
}
```
