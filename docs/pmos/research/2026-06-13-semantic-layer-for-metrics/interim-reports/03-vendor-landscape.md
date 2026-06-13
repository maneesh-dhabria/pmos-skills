# Interim Report 03 — Vendor/tool landscape

Worker: sonnet · 9 claims (dbt docs+blog T1, Cube T1, AtScale T1, Honeydew T2, Unwind T2/T3, Atlan T2, malloydata.dev T1, David Jayatilake T3).

- dbt SL/MetricFlow (YAML, deterministic SQL, dbt Cloud required; no multi-hop joins / no native Looker).
- Cube (OSS+cloud, API-first, reads dbt models; "platform to operate").
- Looker/LookML (originator; non-Looker = BigQuery-only lock-in; ~$5k/mo).
- AtScale (universal, MDX/SQL/DAX/REST; enterprise).
- Malloy (OSS DSL; experimental).
- Warehouse-native (Snowflake Semantic Views / Databricks Metric Views) + OSI standard (MS+GCP absent).
- 3-way market split: standalone/universal vs platform-native vs experimental.

Gaps: Malloy/Meta status unconfirmed; AtScale pricing; OSI primary spec not fetched; Microsoft Power BI absent → triggered gap-fill (see 03b).
