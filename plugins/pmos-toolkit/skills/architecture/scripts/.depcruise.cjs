// dependency-cruiser config for the /architecture audit (T9).
// Rule names map 1:1 onto principles.yaml rule_ids — run-audit.sh keys off `rule.name`
// when translating violations into audit findings.
module.exports = {
  forbidden: [
    {
      name: "TS001",
      comment: "TS001 — no circular imports (principles.yaml#TS001).",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "TS002",
      comment: "TS002 — src/ui must not import src/db (principles.yaml#TS002).",
      severity: "error",
      from: { path: "(^|/)src/ui/" },
      to:   { path: "(^|/)src/db/" },
    },
    {
      name: "TS003",
      comment: "TS003 — no orphan modules (principles.yaml#TS003).",
      severity: "warn",
      from: { orphan: true, pathNot: "(^|/)(tests?|__tests__|scripts)/|\\.d\\.ts$" },
      to: {},
    },
    {
      name: "TS004",
      comment: "TS004 — src/ must not depend on devDependencies (principles.yaml#TS004).",
      severity: "error",
      from: { path: "(^|/)src/", pathNot: "(^|/)(tests?|__tests__)/" },
      to: { dependencyTypes: ["npm-dev"] },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^|/)(node_modules|dist|build|\\.next|\\.nuxt|coverage)/" },
    tsPreCompilationDeps: true,
    combinedDependencies: false,
    moduleSystems: ["es6", "cjs", "tsd"],
  },
};
