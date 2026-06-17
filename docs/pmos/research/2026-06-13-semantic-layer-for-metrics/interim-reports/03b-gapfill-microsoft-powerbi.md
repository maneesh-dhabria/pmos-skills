# Interim Report 03b (gap-fill) — Microsoft Power BI semantic model

Worker: sonnet · 10 claims (Microsoft Learn T1 ×4, Holistics T2, Tabular Editor T2, EPC Group T3).

- BI-native, Analysis Services lineage; XMLA endpoint = open-platform connectivity (MS Learn T1).
- Partial universal consumer (Excel/SSMS/Tableau read-only via MSOLAP); DAX measures NOT portable (Holistics T2).
- RLS/OLS enforced via XMLA for all consumers (MS Learn T1).
- Copilot generates/explains DAX, answers from schema (MS Learn T1).
- Fabric IQ (GA 2026-06-04) + Agent 365 first-party MCP tool → agents query certified models as governed calls (EPC Group T3).
- Sits in single-platform-native quadrant; Tabular Editor "Semantic Bridge" translates Databricks YAML metric views → PBI objects.

Gaps: no single T1 portability comparison; Fabric IQ GA via T3; PBI Git integration GA date; OSI non-participation unverified.
