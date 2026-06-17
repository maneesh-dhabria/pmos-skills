# Interim Report 04 — Architecture & integration

Worker: sonnet · 15 claims (Cube T1 ×4, dbt FAQ/docs T1 ×4, AtScale T1 ×2, Typedef T2, Secoda T2, Upsolve T2, Dremio T2).

- 3 patterns: warehouse-native / transformation-layer (dbt) / OLAP-acceleration (Cube).
- Cube pushdown transpiles Postgres-dialect SQL to upstream; egg e-graph picks optimal plan; pre-agg cache 10–50ms vs 2–10s live.
- AtScale 4-component hybrid (autonomous aggregate engine, aggregate-aware planner, governed cache, live pushdown).
- API surface: dbt GraphQL + JDBC (Arrow Flight SQL); Cube Postgres-wire SQL + REST + GraphQL.
- dbt YAML semantic models (entities/dimensions/measures → 4 metric types); auto join-path, avoids fan-out/chasm.
- dbt result+declarative caches (warehouse-side, Enterprise). ~100–300ms API overhead.
- AI consumers read meta API → embeddings → query business terms.

Gaps: AtScale wire protocols detail; Arrow Flight pool config; Cube Store benchmarks (T2 only); catalog integration patterns; GraphQL schema specifics.
