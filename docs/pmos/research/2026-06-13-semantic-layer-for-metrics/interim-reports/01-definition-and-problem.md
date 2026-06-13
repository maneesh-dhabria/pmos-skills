# Interim Report 01 — What a semantic layer is & what it solves

Worker: sonnet · 8 claims · 8 sources fetched 2026-06-13 (Dremio T1, dbt docs T1, AtScale T1, Coalesce T3, Typedef T2, Airbyte T2).

- Query-time abstraction warehouse↔BI/AI; stores no data (Dremio T1).
- Solves metric inconsistency — "one definition per metric" (Dremio T1); "three different answers" failure (Typedef T2).
- Governance at definition level, enforced regardless of access tool (Dremio T1).
- Headless/single-source-of-truth: definitions served via API, tool-agnostic (AtScale T1, dbt T1).
- Differs from BI-native model (portability) and from warehouse (no storage; query-time).
- AI-era reliability framing: LLM "picks one and generates a confident answer that could be completely wrong" (AtScale T1).

Gaps: no academic lit; no fetchable Gartner/Forrester; no quantitative adoption %; two pages 403'd.
