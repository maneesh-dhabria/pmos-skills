# Doc-types — verdict scale, applicability map & findings schema

> Canonical home (Inv-1) for three things `/artifact-critique` reads and never forks: the **verdict
> scale** (§1), the **doc-type applicability map** that decides `ABSENT` vs. `N/A` deterministically
> (§2), and the **`pmos-critique-findings/v1` structured-findings schema** (§3) the skill bakes into its
> HTML artifact and a future `/artifact` rewrite step consumes.
>
> The map is the load-bearing piece of Inv-2 (coverage-of-absence): an axis that is *expected* for a
> doc-type but unaddressed is a real defect (`ABSENT`); an axis that simply does not apply is a stated
> `N/A` — **never a silent skip**. Which is which is resolved here, from data, not ad hoc per run.

## Contents

- [§1 Verdict scale](#1-verdict-scale)
- [§2 Applicability map (ABSENT vs N/A)](#2-applicability-map-absent-vs-na)
- [§3 Findings schema — `pmos-critique-findings/v1`](#3-findings-schema--pmos-critique-findingsv1)

---

## 1. Verdict scale

A single ordinal scale plus a free-text reason. The scale stays a clean at-a-glance ordinal; all the
sharp shape-language ("output, not outcome", "a wedge, not a moat") lives in the **reason**, never in the
verdict token.

| Verdict | Meaning |
|---|---|
| `STRONG` | Present, concrete, evidenced — a first-class, **freely-given** verdict (Inv-4: STRONG is not rationed). |
| `MIXED` | Partially there — real strengths *and* real gaps, both named in the reason. |
| `WEAK` | Gestured at but not concrete or quantified; the intent is visible, the substance is not. |
| `ABSENT` | **Expected** for this doc-type (per §2) but not addressed — a real defect, and often the highest-value finding. |
| `N/A` | **Not applicable** to this doc-type — but **stated**, never silently skipped (Inv-2). |

**Reason convention.** Every non-`STRONG` verdict carries a one-line reason naming the specific gap; every
`ABSENT`/`WEAK` reason must be non-empty (the deterministic gate's `E-gap-named` check). `STRONG` may credit
what works in one line.

The `ABSENT` ⇄ `N/A` distinction is **never** an LLM judgment call — it is read from the map in §2 using
the detected doc-type. Missing + expected ⇒ `ABSENT`; missing + not-applicable ⇒ `N/A`.

---

## 2. Applicability map (ABSENT vs N/A)

For each doc-type, every axis is marked:

- **`E`** — *expected*. If the doc does not address it → `ABSENT`.
- **`N/A`** — *not applicable*. Recorded as a stated `N/A`, never scored as a gap.
- **`C`** — *conditional*. A rule below promotes it to `E` or demotes it to `N/A` for the specific doc.

| Axis | PRD | Strategy | POV | Roadmap |
|---|---|---|---|---|
| Customer | E | E | E | C |
| Solution | E | C | C | E |
| Scope | E | E | C | E |
| Metrics | E | E | C | E |
| Pricing | C¹ | E¹ | C | N/A |
| Strategy | C | E | E | E |
| GTM | E | E | C | E |
| Stage | E | E | E | E |
| AI | C² | C² | C² | C² |
| Risks | E | E | E | E |

**Conditional rules.**

- **¹ Pricing → `N/A` for internal tools / platforms** with no external price. The economics don't vanish —
  they are **reframed as build-vs-buy + opportunity cost under Strategy** (so the dollars are still scored,
  just on the axis where they belong). For an externally-priced product, Pricing resolves to `E`.
- **² AI → `E` iff the doc proposes an AI/LLM feature**, else `N/A`. A doc that merely mentions AI in
  passing without proposing a model-backed feature keeps `N/A`.
- The remaining `C` cells (e.g. Customer for a Roadmap, Solution/Scope/Metrics/GTM for a POV) resolve to
  `E` when the doc actually makes a claim on that axis and to `N/A` when the doc-type genuinely doesn't
  carry it — judged against the doc's own declared purpose, and recorded as the resolved value.

**Hybrid rule (union).** Real docs are often hybrids (a strategy doc with an embedded PRD; a POV that turns
into a roadmap). For a hybrid, **each axis takes the *union* of expectations across every detected type:
any axis that is `E` in *any* component type is `E` for the hybrid.** Nothing that is expected in one lens
gets a free `N/A` because another lens would have excused it. `hybrid_of` in the findings schema records
the component types so the resolution is auditable.

**Placeholder ≠ absence.** A `<Work in Progress>` / "TBD" / template-stub section is treated as a
**decision-blocking gap**, scored on its merits (typically `WEAK` or `ABSENT` per the axis), not as a
stated `N/A`. Presence of a heading is not presence of content.

The skill auto-detects the doc-type and **declares it in the opening line** (user-correctable in an
interactive run; recorded as an assumption in a non-interactive run). The detected/resolved type drives the
applicable-axis set the deterministic gate checks against.

---

## 3. Findings schema — `pmos-critique-findings/v1`

The structured carrier `/artifact-critique` bakes into its HTML artifact as a dedicated inline
`<script id="pmos-critique-findings" type="application/json">` block between
`<!-- pmos-critique-findings:start -->` / `<!-- pmos-critique-findings:end -->` sentinels (the same
single-source-of-truth philosophy as the inline `pmos-comments` block — CLAUDE.md). In `--format md` the
identical JSON is emitted in a fenced ` ```json ` block. This block — not the prose — is what a future
`/artifact` rewrite step consumes; in v1 the standalone hand-off prose is advisory.

**Axis enum** (fixed order — the single validation enum the findings axis field draws from, kept in
lock-step with axes.md by selftest.mjs):
`Customer`, `Solution`, `Scope`, `Metrics`, `Pricing`, `Strategy`, `GTM`, `Stage`, `AI`, `Risks`

```jsonc
{
  "schema": "pmos-critique-findings/v1",
  "skill": "artifact-critique",
  "doc": {
    "title": "…",
    "type": "prd|strategy|pov|roadmap",
    "type_confidence": "detected|inferred",
    "hybrid_of": ["strategy", "prd"],          // or null when single-type
    "char_count": 0,
    "source_path": "…"
  },
  "opening": { "pushing_hardest_on": ["…"] },   // 1–3 entries (the "I'll push hardest on …" framing)
  "axes": [                                     // exactly 10, in the fixed Axis-enum order
    {
      "axis": "Metrics",
      "applicable": true,                       // false ⇔ verdict === "N/A"
      "verdict": "STRONG|MIXED|WEAK|ABSENT|N/A",
      "reason": "Outputs dressed as outcomes; no baseline/target/threshold.",
      "quote": "<≥40-char verbatim substring of source, or null when ABSENT / N/A>",
      "quote_section": "§4.2",
      "what_id_want_to_see": "A baseline, a 6-month target, and a rollback threshold per north-star metric."
    }
  ],
  "weakest_claims": [                           // 0–3, never padded (Inv-4); ranks unique 1..n
    {
      "rank": 1,
      "claim": "<verbatim load-bearing assertion>",
      "quote": "<≥40-char verbatim substring of source>",
      "quote_section": "§2.1",
      "followups": ["…", "…"]
    }
  ],
  "bottom_line": { "strengths": ["…"], "must_dos": ["…", "…", "…"] },
  "limits": ["Pricing not visible in this doc — may live in an annexure", "Figure 3 unreadable"]
}
```

**Field rules the deterministic gate enforces** (design §4.4 — a script counts these, never an LLM):

| Check | Assertion |
|---|---|
| `E-schema` | parses + conforms to `pmos-critique-findings/v1` (`schema`/`skill`/`doc`/`bottom_line` present and well-formed). |
| `E-axes-complete` | all 10 axes present, in the fixed Axis-enum order; each `verdict` ∈ the ordinal set. |
| `E-applicable-consistency` | `applicable === false` ⇔ `verdict === "N/A"` (the substrate `selftest.mjs` enforces this biconditional). The companion assertion — that the applicable set matches the resolved doc-type map (union for hybrids) — needs the live doc to resolve `C` cells, so it is enforced by the skill's `critique-eval.mjs`, not the substrate self-check. |
| `E-quote-len` | every non-null `quote` (axes and weakest-claims) is ≥40 chars. |
| `E-quote-in-source` | every quote, whitespace-normalized, is a verbatim substring of the whitespace-normalized source (Inv-3; verified by the skill's `critique-eval.mjs` against the live source — the substrate `selftest.mjs` cannot verify against an absent source, so it checks the fixtures' shape only). |
| `E-gap-named` | every `ABSENT` / `WEAK` axis has a non-empty `reason`. |
| `E-weakest-ranked` | `weakest_claims` length 0–3; `rank`s unique `1..n`; each has a `quote` ≥40 chars. |
| `E-opening` | `opening.pushing_hardest_on` has 1–3 entries. |

The corpus-samples critique-output JSONs (story `fbd`) are valid `pmos-critique-findings/v1` instances and
double as the gate's fixtures: `selftest.mjs` runs the structural half of these checks over every sample so
the schema and the exemplars can never drift apart.
