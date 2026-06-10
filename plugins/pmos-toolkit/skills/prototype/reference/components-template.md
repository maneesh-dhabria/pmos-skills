# components.js Template

`assets/components.js` exposes shared atoms on `window.__protoComponents` so device files can use them inside `<script type="text/babel">` blocks. Loaded as a Babel-compiled file or as plain JS using `React.createElement` (the subagent picks based on whether it can guarantee Babel runs over this file too — see "Loading strategy" below).

## Loading strategy

The device HTML loads `components.js` last, as `<script type="text/babel" src="./assets/components.js" data-presets="react">` — the canonical CSS/JS load order (and why it matters) is `device-html-template.md` strict rule 1; do not restate it here.

`<script type="text/babel" src="…">` works with Babel Standalone — it fetches and compiles JSX. This lets components.js use JSX directly, matching how authors will write screens. (Note: this requires the file to be fetchable; the same fetch-fallback that mock-data uses does NOT apply here, so on `file://` browsers must allow cross-origin fetch of local JS. If this proves flaky, the subagent inlines components.js into a `<script type="text/babel">` block in each device file instead — this is the failsafe.)

## Required atoms (on `window.__protoComponents`)

Every atom consumes CSS classes from `prototype.css`. None of them define their own colors, fonts, or spacing inline.

### Button
```jsx
const Button = ({ variant = 'primary', onClick, children, disabled, loading, type = 'button', ariaLabel }) => (
  <button
    type={type}
    className={`btn btn--${variant} ${loading ? 'btn--loading' : ''}`}
    onClick={onClick}
    disabled={disabled || loading}
    aria-label={ariaLabel}>
    {loading ? <Spinner size="sm" /> : children}
  </button>
);
// variants: primary | secondary | destructive | ghost | link
```

### Input
```jsx
const Input = ({ label, value, onChange, error, type = 'text', placeholder, required, name, autoComplete }) => (
  <label className={`field ${error ? 'field--error' : ''}`}>
    <span className="field__label">{label}{required && <span className="field__required" aria-label="required">*</span>}</span>
    <input
      className="field__input"
      type={type}
      name={name}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      aria-invalid={!!error}
      aria-describedby={error ? `${name}-error` : undefined} />
    {error && <span id={`${name}-error`} className="field__error" role="alert">{error}</span>}
  </label>
);
```

### Modal
```jsx
const Modal = ({ open, onClose, title, children, footer, size = 'md' }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal modal--${size}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="modal__header">
          <h2 id="modal-title" className="modal__title">{title}</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>
  );
};
```

### Toast
```jsx
const Toast = ({ type = 'info', message, onDismiss, autoDismissMs = 4000 }) => {
  React.useEffect(() => {
    if (!autoDismissMs) return;
    const t = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className={`toast toast--${type}`} role="status">
      <span className="toast__message">{message}</span>
      <button className="toast__dismiss" onClick={onDismiss} aria-label="Dismiss">×</button>
    </div>
  );
};
// types: success | error | info | warning
```

### Card
```jsx
const Card = ({ header, footer, children, onClick, className = '' }) => (
  <div className={`card ${onClick ? 'card--clickable' : ''} ${className}`} onClick={onClick}>
    {header && <header className="card__header">{header}</header>}
    <div className="card__body">{children}</div>
    {footer && <footer className="card__footer">{footer}</footer>}
  </div>
);
```

### Table
```jsx
const Table = ({ columns, rows, onRowClick, loading, emptyState }) => {
  if (loading) return <TableSkeleton rows={5} columns={columns.length} />;
  if (!rows?.length) return emptyState || <EmptyState title="No records" />;
  return (
    <table className="table">
      <thead>
        <tr>{columns.map(c => <th key={c.key} scope="col">{c.label}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.id} onClick={onRowClick ? () => onRowClick(row) : undefined} tabIndex={onRowClick ? 0 : -1}>
            {columns.map(c => <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

### EmptyState
```jsx
const EmptyState = ({ icon = '📭', title, description, cta }) => (
  <div className="empty-state">
    <div className="empty-state__icon" aria-hidden="true">{icon}</div>
    <h3 className="empty-state__title">{title}</h3>
    {description && <p className="empty-state__description">{description}</p>}
    {cta}
  </div>
);
```

### Spinner
```jsx
const Spinner = ({ size = 'md', label = 'Loading' }) => (
  <span className={`spinner spinner--${size}`} role="status" aria-label={label} />
);
// sizes: sm | md | lg
```

### Badge
```jsx
const Badge = ({ tone = 'neutral', children }) => (
  <span className={`badge badge--${tone}`}>{children}</span>
);
// tones: success | warning | danger | info | neutral
```

### Avatar
```jsx
const Avatar = ({ name, src, size = 'md' }) => {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  return src
    ? <img className={`avatar avatar--${size}`} src={src} alt={name} />
    : <span className={`avatar avatar--${size} avatar--initials`} aria-label={name}>{initials}</span>;
};
```

### TableSkeleton (internal helper)
```jsx
const TableSkeleton = ({ rows, columns }) => (
  <table className="table table--loading">
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: columns }).map((_, j) => (
            <td key={j}><span className="skeleton skeleton--text" /></td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);
```

## x-interaction contract (mandatory)

DESIGN.md's `x-interaction` and `x-content` blocks are a **contract, not advisory** — the components.js generator implements this mapping literally, and the `#review` reviewer scores against it (violations are severity ≥ medium). This section is the single home for the key-by-key mapping; the SKILL.md generator and reviewer steps cite it.

- `modals.style` (centered / drawer-right / drawer-bottom / fullscreen) controls Modal positioning. Hard-code the matching class string.
- `modals.dismiss` (backdrop-click / explicit-button / esc-key) controls which dismiss handlers Modal wires up. Wire ONLY the listed dismiss paths — no extras.
- `destructiveActions.confirmation`: `always` → simple confirm modal; `double-click` → first click arms a 3-second visual countdown ring on the button; `type-to-confirm` → confirm modal with a text input that must match the resource name to enable the confirm button.
- `focus.trapInModals: true` → Modal traps Tab/Shift-Tab within itself when open.
- `focus.visibleStyle` → applied as the `:focus-visible` class on Button, Input, Select, etc.
- `defaultStates.empty` (illustrated / minimal / none) → EmptyState atom default variant.
- `defaultStates.loading` (skeleton / spinner / progress) → default Loading variant in components like Table.
- `defaultStates.error` (inline-banner / full-page / toast) → default error rendering in components.
- `shortcuts` → wire as global keydown handlers in runtime.js; advertise in a `?` keyboard-shortcut modal.
- `x-content.buttonVerbs` → use these exact verbs in default Button labels ('Save', 'Create', 'Delete'). Don't invent 'Submit' or 'Add'. Date and currency formats come from `window.__designTokens.content.formats`.

Pull values from `window.__designTokens.interaction.*` / `.content.*` at runtime; do not duplicate the values inline.

## File structure (MANDATORY IIFE wrap)

`components.js` is loaded as `<script type="text/babel" src="./assets/components.js">`, so Babel-standalone compiles it into the same shared global scope as the device HTML's inline Babel blocks — top-level bindings collide fatally on first load (failure-mode rationale: `device-html-template.md` strict rule 0, the single home for it).

The entire file body MUST be wrapped in an IIFE:

```jsx
(function () {
  const Button = ({ … }) => ( … );
  const Input = ({ … }) => ( … );
  // … all atoms …

  window.__protoComponents = { Button, Input, Modal, Toast, Card, Table, EmptyState, Spinner, Badge, Avatar };
})();
```

Only the `window.__protoComponents` assignment escapes the closure — everything else stays scoped. Same rule applies to `runtime.js` (publishes `window.__proto`) and any `components-extra.js`.

## Footer (the last lines of components.js, inside the IIFE)

```javascript
  window.__protoComponents = { Button, Input, Modal, Toast, Card, Table, EmptyState, Spinner, Badge, Avatar };
})();
```

## Subagent rules

- All atoms above are mandatory; subagent does not skip any (even if a screen doesn't use Toast yet, screens added later will).
- Subagent may ADD atoms specific to the feature (e.g., `Stepper` for multi-step forms, `KPI` for dashboard cards) — append them to the export footer.
- Total file ≤ 350 lines. If it grows, factor feature-specific atoms into `assets/components-extra.js`.
- Every atom must be keyboard-accessible by default.
- Every atom must respect `disabled` / `aria-*` props passed in.
