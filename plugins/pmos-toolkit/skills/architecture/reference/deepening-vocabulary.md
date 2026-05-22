<!-- Adapted with attribution from Matt Pocock's `/improve-codebase-architecture` — https://www.totaltypescript.com/cursor-rules#improve-codebase-architecture -->

# Deepening Vocabulary

You are running an architecture deepening pass. Your job is to look at a set of modules in a codebase and decide which ones are *deep*, which are *shallow*, and which are *leaky* — then propose reshapes that move the codebase toward deeper modules with smaller interfaces and tighter information hiding. Classify modules using the vocabulary below; ground every classification in evidence from the files you read; return JSON matching the return-shape template in the user prompt.

## Mission

A deepening pass is not a style review and not a bug hunt. It asks one question of every module in scope: *does this module's interface hide enough complexity to be worth its existence?* If the answer is no, the module is either shallow (a wrapper that adds no leverage) or leaky (forces callers to know things they should not). Both are reshape candidates. Deep modules — the goal — keep their callers ignorant of the work going on behind them.

## Deletion test

For each module, run a thought experiment: *if I deleted this module right now, what happens?* Two outcomes matter, and they map directly to the `deletion_test.outcome` field in the JSON return shape.

- **`vanishes`** — the responsibility genuinely disappears. The module was load-bearing; callers cannot recreate its behaviour without re-deriving non-trivial logic. This is the signature of a deep module worth keeping.
- **`reappears`** — within a sprint, the same logic reappears in callers under a new name, or scattered across two or three sites. The module was a thin pass-through; callers were already doing the work and the module just renamed it. This is the signature of a shallow module worth inlining or merging.

The framing comes from Tilden Edwards's reading of Ousterhout: a module earns its keep by what would be missing in its absence, not by what it currently contains.

## Module, interface, implementation

Three terms that must stay distinct in your reasoning:

- **Module** — a unit of code with a name and a boundary. A file, a class, a package — whichever level you are classifying at.
- **Interface** — what callers must know to use the module. Function signatures, exported types, the shape of returned data, the documented behaviours.
- **Implementation** — everything the module does that callers do *not* need to know. Internal data structures, helper functions, sequencing.

Ousterhout's central claim in *A Philosophy of Software Design*: a module is deep when its implementation is much larger than its interface. The interface is what you pay; the implementation is what you get. Maximise the ratio.

## Depth

A **deep module** offers a small, stable interface that hides substantial behaviour. Callers see one or two functions; behind them sit retries, caches, serialisation, ordering guarantees. The interface barely changes even as the implementation evolves. Examples: a well-designed HTTP client, a transactional repository, a query planner.

A **shallow module** is the opposite — its interface is roughly the same size as its implementation. Reading the interface tells you everything the module does because there is nothing else there. Symptoms: methods that forward straight to another module's methods with the same signatures; classes that exist only to rename their delegates; files whose entire body is re-exports.

Shallow modules are tax without benefit: every caller pays the import cost and the cognitive cost of a new name, and receives no abstraction in return. The standard reshape is to inline the module into its callers, or to merge it with the module it delegates to.

Source: Ousterhout, *A Philosophy of Software Design*, §4 ("Modules Should Be Deep").

## Seam

A **seam** (Michael Feathers, *Working Effectively with Legacy Code*, §4) is a place in the code where you can alter behaviour without editing the code at that point. Dependency injection, polymorphism, function parameters, configuration — all create seams. Seams are the levers that make modules deep: they let the implementation vary without the interface changing.

When a module has no seams — every collaborator is hard-wired to a concrete dependency — the module's interface effectively leaks the dependency. Callers cannot test, swap, or evolve the module without rewriting its body. Missing seams are a frequent cause of leaky classification.

## Adapter

An **adapter** is a seam introduced specifically to decouple a module from a leaking concrete dependency. If a repository module currently returns ORM rows, the adapter wraps the ORM and returns domain objects; callers depend on the adapter's interface, not the ORM's. Adapters are how you cure a leaky module without throwing it away — you add a translation layer that makes the leak invisible to callers.

## Leverage

**Leverage** measures how much downstream code each module's API surface controls. A module with high leverage is imported by many call sites and shapes their behaviour through a small, stable interface; changing the implementation propagates value to every caller for free. A module with low leverage — few callers, or many callers that each see different parts of its surface — earns less per line of implementation.

The combination that defines a deep module: high leverage plus a small interface. The combination that defines a shallow module: low leverage and an interface as wide as the implementation.

## Locality

**Locality** is the principle that code which changes together should live together. When a feature spans five files in three directories, every change requires the reader to assemble the picture across the codebase, and refactors must coordinate edits across all five sites. Violations of locality are a tell for two distinct problems: a god-module that should be split (locality violated *within* the module, by mixing concerns) or a set of modules that should be merged (locality violated *across* modules, by splitting a single concern).

When you see the same identifier or pattern recur across three or more files that the import graph says are unrelated, treat it as a locality signal — surface it under `cross_module_patterns` with a verbatim substring as evidence.

## Leaky module

A **leaky module** has an interface that forces callers to know implementation details. The classic forms:

- Returning ORM rows or database cursors instead of domain objects — callers learn the schema.
- Exposing connection pools, sockets, or file handles instead of repository methods — callers learn the resource lifecycle.
- Returning `(value, error)` tuples where the error type is the underlying library's exception class — callers learn the library.
- Accepting raw config dicts where a typed value object would do — callers learn the config keys.

Leaky modules are not always shallow — they may contain substantial logic — but their leverage is capped because callers must understand the implementation to use the interface safely. The reshape is usually an adapter (see above) that translates between the leaky interface and a clean one, then a migration of callers onto the adapter.

A leaky module maps to `classification: "leaky"` in the JSON return shape, with the proposed reshape stating the specific adapter or interface change.

## Putting it together

Walk every candidate module through the same short sequence and the classification falls out:

1. Read the module's exported interface — function signatures, types, the shape of returned data. Note its size.
2. Read the implementation. Note its size and what it does that the interface does not mention.
3. Apply the deletion test. If responsibility `vanishes`, you are looking at a deep or leaky module; if it `reappears`, you are looking at a shallow module.
4. If deep-or-leaky: check whether the interface forces callers to know implementation details (ORM rows, raw config, library exceptions). If yes → `leaky`, propose an adapter. If no → `deep`, no reshape needed unless leverage is low.
5. If shallow: propose inlining the module into its callers or merging it with its delegate.

Ground every classification in concrete evidence. The `cross_module_patterns[].evidence` field expects a verbatim substring from a file you actually read — a signature, a return-statement, a type alias. Do not paraphrase; do not summarise. If you could not read a file (denylist stub, missing path), skip it; do not infer.

Keep `proposed_reshape` to one sentence. The orchestrator and the user both need it scannable. Detailed reshape plans belong in a follow-up design note from the user, not the deep-pass output.

