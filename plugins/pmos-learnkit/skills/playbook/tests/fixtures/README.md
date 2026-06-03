# fixtures

The resolver/scout unit tests generate synthetic JSONL session fixtures in a per-test tmpdir
(see `resolver.test.mjs` / `scout.test.mjs`) rather than committing static fixtures — this keeps
them self-contained and immune to format drift. This directory is a placeholder for any future
static fixtures.
