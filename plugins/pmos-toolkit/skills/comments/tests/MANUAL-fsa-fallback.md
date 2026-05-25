# Manual smoke — FSA fallback paths

Per spec §14.3 (E2E) and NFR-04 (browser support). Captures the platform × browser matrix
that automated tests cannot fully exercise.

This document is the **living attestation record** for T28. Each row is filled in by the
maintainer running on real hardware. When every row carries a PASS or explicit SKIP+reason,
T28 is considered "manually verified".

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

### macOS launcher

- [ ] **(macOS-1)** Double-click `comments-open.command` on an HTML artifact → Chrome opens →
  text selection captures a thread → sidecar `.comments.json` appears in the same directory.
  DEFERRED — maintainer attestation.

- [ ] **(macOS-2)** Same as macOS-1 but with Node uninstalled (e.g., `nvm use system` on a
  machine where only nvm-managed Node is present) → launcher exits with code 127 + grep-able
  stderr line beginning `node: command not found`.
  DEFERRED — maintainer attestation.

- [ ] **(macOS-3)** Save-sidecar fallback on Safari: open artifact in Safari, set
  `localStorage.setItem('pmos_disable_fsa','1')` in DevTools console, submit a thread →
  "Save sidecar" button appears (FSA not called) → click button → `.comments.json` downloads →
  manually move downloaded file into artifact directory → reload → thread visible.
  DEFERRED — maintainer attestation.

---

### Linux launcher

- [ ] **(linux-1)** Invoke `bash comments-open.sh` on a machine with a default desktop browser
  configured → browser opens the artifact → comment capture works → sidecar appears.
  DEFERRED — maintainer attestation.

- [ ] **(linux-2)** Same as linux-1 but with Node uninstalled → exit 127 + clear stderr.
  DEFERRED — maintainer attestation.

---

### Windows launcher

- [ ] **(win-1)** Double-click `comments-open.bat` from File Explorer on Windows 10/11 →
  default browser opens the artifact → comment capture works.
  DEFERRED — maintainer attestation.

- [ ] **(win-2)** Same as win-1 but with Node uninstalled (remove from PATH) → launcher exits
  with non-zero code + stderr message indicating Node not found.
  DEFERRED — maintainer attestation.

---

### Chrome (FSA path)

- [ ] **(chrome-1)** Submit a text-selection thread in Chrome; observe that `showDirectoryPicker`
  resolves and the sidecar persists to disk without a download prompt.
  **Partially automated** — `fsa-write.e2e.test.js` covers this when
  `CHROME_DEVTOOLS_MCP_AVAILABLE=run`; see that file. Manual visual confirmation still deferred.

- [ ] **(chrome-2)** Permission revocation simulation: after granting a directory, open
  DevTools → Application → Storage → manually revoke the File System Access permission → reload
  artifact → browser banner appears prompting re-grant → re-grant works → sidecar saves again.
  DEFERRED — maintainer attestation.

---

### Safari (download fallback)

- [ ] **(safari-1)** Open artifact in Safari (no FSA support) → submit a thread → no
  `showDirectoryPicker` call is attempted → localStorage draft is created → "Save sidecar"
  button appears → click → `.comments.json` file downloads correctly.
  DEFERRED — maintainer attestation.

- [ ] **(safari-2)** After safari-1: reload the page without moving the file → localStorage
  drafts rehydrate → thread still visible in the side panel.
  DEFERRED — maintainer attestation.

---

### Firefox (download fallback)

- [ ] **(firefox-1)** Same flow as safari-1 and safari-2 above on Firefox (latest stable).
  DEFERRED — maintainer attestation.

---

### Edge cases — file:// guard (E1)

- [ ] **(file-1)** Open the artifact via a `file://` URL in any browser → blocking modal appears
  before thread capture → modal includes a button to copy the `npx serve` / `node serve.js`
  command. Core logic verified by automated unit test (T24-f); manual confirmation here is for
  visual fidelity only. DEFERRED — maintainer attestation.

---

## Automation coverage note

`fsa-write.e2e.test.js` (sibling file) provides headless Chrome coverage for chrome-1 when
`CHROME_DEVTOOLS_MCP_AVAILABLE=run`. All other rows in this matrix are inherently
platform-specific or require a human to observe visual states and perform multi-step
interactions that cannot be safely stubbed in a headless environment.

When the matrix is fully attested, update this file and reference it in the T28 task log.
