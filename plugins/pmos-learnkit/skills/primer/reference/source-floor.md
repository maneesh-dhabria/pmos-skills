# Source floor — informational coverage signal + degraded modes

The floor is an **eval-time coverage signal, not a sourcing gate** — it never blocks,
short-circuits, or caps the substrate's rank-then-verify sourcing (SKILL.md Phase 3 owns
the contract; the `sources.json` schema is stated once there). After sourcing settles,
compare the merged verified-source count against the floor for the resolved depth:

| Depth    | Floor | Rationale                                              |
|----------|-------|--------------------------------------------------------|
| brief    | 6     | Narrow topics still need a real evidence base          |
| standard | 10    | Typical senior-PM ramp-up topics                       |
| deep     | 15    | Forces practitioner-by-practitioner coverage           |

## Thin-source disclosure

When `count < floor`, disclose — informationally — and ship. Offer (don't require) one
re-sourcing pass under a reformulated topic frame before writing. The shipped artifact
carries a footer banner directly above the attribution footer (inline CSS only, so it
renders offline — e.g. `style="background:#fff8d6;border:1px solid #c8a800;padding:0.75rem 1rem;margin:1rem 0;border-radius:4px;"`):

> Note: this primer was assembled from `<N>` sources (below the source-floor of
> `<floor>` for the `<depth>` tier). Treat conclusions as preliminary; the underlying
> topic may not yet have a stable knowledge base.

Add `**thin-source:** true` to the artifact frontmatter so downstream tools can detect
it without parsing the body.

## WebFetch unavailable

No `WebFetch` means no verification. If context7 MCP is available, source from it alone
(the floor signal still applies). If context7 is ALSO unavailable, gate **before**
research begins: **Abort (Recommended)**, or **Continue with no sources (NOT
recommended)** — which produces an uncited draft carrying a red banner (same inline-CSS
placement, e.g. `background:#fde2e2;border:1px solid #b00020`), frontmatter
`**uncited-draft:** true`, and ships only via the recovery path (rubric R1 cannot pass
with zero sources; there is no normal-path ship).
