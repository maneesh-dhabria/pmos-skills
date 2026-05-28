# Tracer principles — prose rationales

This file is the prose companion to `principles-tracer.yaml`. The rule-ID set
`{U001, U002}` is the canonical contract for the /architecture --from-spec
tracer-bullet test (T1). The judge subagent receives this prose verbatim as
part of its prompt buffer.

## U001 {#u001}

**Declared module-level import bans MUST hold.**

When a spec's `<section id="architectural-assertions">` enumerates a ban of
the form "Module X must not import from Y", any structural design that allows
X to take a direct dependency on Y is a violation. This rule fires regardless
of stack — it operates purely on the declared module graph in §modules and the
asserted invariants in §architectural-assertions.

## U002 {#u002}

**Each module MUST own a single role.**

Module rows in §modules carry a one-line `role` description. If that role
conjoins two unrelated responsibilities (e.g. "owns X and also persists Y"),
the module is multi-purpose and violates the singular-role invariant. Split
into two modules with separate names.
