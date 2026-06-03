# Anonymizer & human gate (reference)

How `/playbook` keeps a shareable article safe without gutting its concreteness. Loaded on demand
by the Anonymize/Gate phase. **Always-on** — runs on every playbook before it is shareable.

## Principle (FR-60)

The anonymizer **detects and flags**; it does **NOT** auto-scrub the content and **NEVER**
auto-marks anything "safe". Concreteness is the teaching value, so the author — not the tool — is
the gate. Aggressive auto-redaction would gut the article; the safety guarantee is the forced
human review, not a regex.

## Detection (best-effort, advisory)

Flag, with location (section + line/snippet), every:

- **Proper noun** (NER-style): organisations, product names, people, place names.
- **Known sensitive token**: any entry in `~/.pmos/playbook/sensitive.yaml` (case-insensitive).
- **Repo / branch names** surfaced from the thread (these often encode client/project names).
- **Contact / identifier patterns**: emails, URLs with private hosts, API-key-shaped strings.
- **Quantitative claims**: `$`-amounts, percentages, absolute metrics ("12k MAU", "‑18% churn").

## REVIEW-BEFORE-SHARING.md (FR-61) — the hard gate

Write one per playbook folder. It MUST contain:

1. A bold banner: *"NOT cleared for sharing until you complete this checklist."*
2. **Flagged text** — a table `Item | Type | Where | Keep / Redact?` listing every retained
   proper noun and every quantitative claim.
3. **Screenshots** — a checklist enumerating **every** captured image (`screenshots/*`) as a
   mandatory manual-verification item: *"[ ] I have eyeballed this image for sensitive content."*
   Images cannot be text-flagged, so the author must verify each (FR-52/D10).
4. A final sign-off line the author checks: *"[ ] Reviewed; cleared to share."*

The skill states plainly in its chat summary that the playbook is **NOT** safe to share until the
author completes this file. Nothing in the pipeline marks it cleared.

## Denylist seeding (FR-62)

`~/.pmos/playbook/sensitive.yaml` ships absent/empty. On the **first** run (file absent), offer a
one-time optional prompt: *"Seed known client/repo/strategy names to always flag? (you can edit
the file later)"*. Persist whatever the author provides; never auto-populate from git metadata
(guessing what's sensitive over- or under-includes). Format:

```yaml
# ~/.pmos/playbook/sensitive.yaml
deny:
  - AcmeCorp
  - project-zephyr
```
