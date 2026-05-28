# Manual smoke — cross-context open paths

Per spec §14.3 (E2E) and NFR-04 (browser support). Captures the platform × browser ×
open-context matrix that automated tests cannot fully exercise.

After T9 dropped the FSA write path + localStorage Save-sidecar fallback, persistence is
exclusively the T3 POST `/save` flow served by `serve.js`. The interesting variation is now
**how the artifact gets opened** (`file://` from various sources vs. `http://localhost` via
the launcher trio), since the file:// guard (E1) and the HEAD `/save` mode probe (FR-14)
have to behave correctly across each context.

This document is the **living attestation record**. Each row is filled in by the maintainer
running on real hardware. When every row carries a PASS or explicit SKIP+reason, the matrix
is "manually verified".

## How to execute

For each checklist row:
1. Set up the target OS and browser listed in the row header.
2. Follow the scenario description to exercise the feature.
3. Capture: **(a)** a terminal transcript snippet (copy-paste from your terminal),
   **(b)** a screenshot or screen-recording clip of the relevant browser state,
   **(c)** a PASS / FAIL / SKIP outcome with a 1–2 sentence note explaining the result.
4. Replace the `[ ] DEFERRED — maintainer attestation` placeholder with your filled-in row,
   including the evidence references (link to screenshot, snippet inline, etc.).

## How to interpret status

| Symbol | Meaning |
|--------|---------|
| `[ ] DEFERRED` | Not yet run; awaiting maintainer attestation. |
| `[x] PASS` | Scenario completed; outcome matches expected behaviour. |
| `[ ] FAIL` | Scenario ran; outcome does not match expected behaviour. File a bug. |
| `[ ] SKIP` | Scenario not applicable to this environment; reason noted. |

---

## Matrix

The expected behaviour for each open-context cell is the same regardless of OS/browser:

- **`file://` cells (1–3 below)** → the E1 blocking modal appears with copy-to-clipboard
  buttons for the serve command and the launcher command; **no** thread capture surfaces are
  available; the read-only hint is irrelevant since the overlay never mounts.
- **`http://localhost` via launcher (cell 4)** → `serve.js` is up; the artifact loads;
  thread submission round-trips through POST `/save`; reload after server-side mutation by a
  second client surfaces the FR-17 409 reload banner.

### macOS × { Chrome, Safari, Firefox }

- [ ] **(macOS-1) `file://` opened via IDE desktop preview** (VS Code "Reveal in Finder" →
  double-click → opens in default browser). E1 blocking modal renders; both copy buttons
  copy the expected command strings to clipboard.
  DEFERRED — maintainer attestation.

- [ ] **(macOS-2) `file://` opened via Mail.app attachment.** Save attachment to disk → open
  with default browser. Same E1 expectation as macOS-1.
  DEFERRED — maintainer attestation.

- [ ] **(macOS-3) `file://` opened via downloaded archive.** Unzip a tarball that contains an
  artifact → double-click the `.html` → opens in default browser. Same E1 expectation.
  DEFERRED — maintainer attestation.

- [ ] **(macOS-4) `http://localhost` via `comments-open.command`.** Double-click the launcher;
  Chrome opens the served artifact. Submit a thread → 200 OK; in a second tab manually POST a
  mutating payload at a stale `expected_version`; reload the first tab → FR-17 conflict
  banner shows the current server version + Reload button.
  DEFERRED — maintainer attestation.

---

### Linux × { Chrome, Firefox } (Safari N/A)

- [ ] **(linux-1) `file://` via IDE desktop preview.** Same E1 expectation as macOS-1.
  DEFERRED — maintainer attestation.

- [ ] **(linux-2) `file://` via Mail attachment** (Thunderbird / Mailspring → "Open with…"
  default browser). Same E1 expectation.
  DEFERRED — maintainer attestation.

- [ ] **(linux-3) `file://` via downloaded archive** (tar.gz extracted by file manager →
  double-click `.html`). Same E1 expectation.
  DEFERRED — maintainer attestation.

- [ ] **(linux-4) `http://localhost` via `comments-open.sh`.** Same expectation as macOS-4.
  DEFERRED — maintainer attestation.

---

### Windows × { Chrome, Edge, Firefox } (Safari N/A)

- [ ] **(win-1) `file://` via IDE desktop preview** (VS Code "Reveal in File Explorer" →
  double-click). Same E1 expectation.
  DEFERRED — maintainer attestation.

- [ ] **(win-2) `file://` via Outlook attachment.** Save attachment → open with default
  browser. Same E1 expectation.
  DEFERRED — maintainer attestation.

- [ ] **(win-3) `file://` via downloaded archive** (zip extracted by Explorer → double-click
  `.html`). Same E1 expectation.
  DEFERRED — maintainer attestation.

- [ ] **(win-4) `http://localhost` via `comments-open.bat`.** Same expectation as macOS-4.
  DEFERRED — maintainer attestation.

---

## Automation coverage note

Unit + integration tests cover the file:// modal injection, HEAD `/save` mode probe, POST
`/save` happy path, and the FR-17 409 banner rendering (see `comments-detect.test.js`,
`serve.save.test.js`, `render.test.js`). What they can't exercise is the **open-context
journey itself** — whether the OS / mail client / file manager actually routes the user to a
browser tab in a state where our E1 + 409 + launcher logic behaves correctly. That's what
this matrix is for.

When the matrix is fully attested, update this file and reference it in the per-release
verification log.
