# rubric-development — eval-driven loop for /readme rubric

## Contents

1. [Purpose](#1-purpose)
2. [Fixture-extension procedure](#2-fixture-extension-procedure)
3. [A2 regression gate (≥85% agreement)](#3-a2-regression-gate-85-agreement)
4. [How to add a new check](#4-how-to-add-a-new-check)
5. [How to add a new variant](#5-how-to-add-a-new-variant)
6. [Banned-phrase extension protocol](#6-banned-phrase-extension-protocol)

---

## 1. Purpose

The /readme rubric is evaluated against a fixture corpus to keep checks
calibrated. The loop is validate → fix → repeat: tweak a check until
strong fixtures pass and slop fixtures fail (A2 ≥85% agreement). The
canonical source of truth for checks is `reference/rubric.yaml`; this
document explains how to evolve it without breaking calibration.

## 2. Fixture-extension procedure

Fixtures live under `tests/fixtures/rubric/{strong,slop}/`. Each fixture
is a standalone `NN_short-name.md` file whose pass/fail expectation is
encoded by the directory.

1. Add the fixture in the matching bucket with a numbered prefix.
2. Write 1-2 lines of HTML comment at the top explaining *why* the
   fixture exemplifies a strong (or slop) signal.
3. Run `scripts/rubric.sh tests/fixtures/rubric/<bucket>/NN_*.md` and
   confirm it lands on the expected side of the bar.
4. If the rubric misclassifies, fix the check — not the fixture.

## 3. A2 regression gate (≥85% agreement)

Per FR-E3 and spec §13.1, every rubric change MUST keep the
fixture-corpus agreement at or above 85%. Agreement = (strong fixtures
passing + slop fixtures failing) / total fixtures.

The gate runs in `tests/integration/tracer_audit.sh` and is wired into
the /readme skill-eval flow. A change that drops agreement below 85% is
rejected; fix the check, widen the fixture set, or both, before
re-submitting.

## 4. How to add a new check

1. Append a new entry to `checks:` in `rubric.yaml` with `id`,
   `severity` (blocker / friction / nit), `description`, `pass_when`,
   `fix_note_template`, and `auto_apply`.
2. Add at least one strong fixture and one slop fixture that exercise
   the check in isolation.
3. Implement the check logic in `scripts/rubric.sh` (or a `checks/*.sh`
   sibling) and re-run the A2 gate.
4. Update any variant `overrides:` that should drop/swap the new check.

## 5. How to add a new variant

1. Add a key under `variants:` in `rubric.yaml` keyed by repo-type
   slug (e.g., `firmware`, `data-pipeline`).
2. Declare `overrides:` as a list of `drop:`, `swap:`, or `add:`
   directives against the base check list in `rubric.yaml`.
3. Add one strong + one slop fixture under
   `tests/fixtures/rubric/variants/<slug>/` and re-run the A2 gate
   against the variant-specific corpus.

## 6. Banned-phrase extension protocol

The canonical banned-phrase list (FR-RUB-4) ships in `rubric.yaml`
under `banned_phrases:` and is intentionally closed — adding phrases
to the shipped list requires a rubric review and re-running the A2
gate against the fixture corpus.

Per-user extensions go in `~/.pmos/readme/banned-phrases.yaml` and are
merged at runtime by `scripts/rubric.sh`. User extensions never modify
the shipped list and are not gated by A2 — they are purely additive
preferences scoped to a single developer's machine.
