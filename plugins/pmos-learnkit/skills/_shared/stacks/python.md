# python Stack

Python projects across the major dependency-management variants. Detection signals (in priority order):

- `pyproject.toml` with `[tool.poetry]` → poetry
- `pyproject.toml` with `[tool.uv]` or a `uv.lock` present → uv
- `pyproject.toml` with `[tool.hatch]` → hatch
- `pyproject.toml` (PEP 621) with no above markers → pip + venv
- `requirements.txt` (no pyproject.toml) → pip
- `Pipfile` → pipenv

## Prereq Commands

Common probe:

```bash
python --version
which python
```

Per-variant install:

```bash
# poetry
poetry install --no-interaction --sync

# uv
uv sync --frozen

# pip + venv
python -m venv .venv && . .venv/bin/activate && pip install -e .

# pipenv
pipenv install --deploy
```

## Lint/Test Commands

Canonical (project-defined wrappers may exist; cite them when present):

```bash
ruff check .
ruff format --check .
mypy .                       # if mypy is configured
pytest -q                    # default test runner
```

For poetry / uv contexts, prefix with `poetry run` / `uv run` respectively (e.g., `poetry run pytest -q`).

## API Smoke Patterns

HTTP smoke:

```bash
curl -fsS http://localhost:8000/health | python -m json.tool
python -c 'import urllib.request,json; print(json.loads(urllib.request.urlopen("http://localhost:8000/health").read()))'
```

GraphQL smoke:

```bash
curl -fsS -H 'content-type: application/json' \
  -d '{"query":"{ __typename }"}' http://localhost:8000/graphql | python -m json.tool
```

gRPC smoke (if `grpcurl` is installed):

```bash
grpcurl -plaintext localhost:50051 list
```

## Common Fixture Patterns

- pytest fixtures under `tests/conftest.py` (shared) or per-module fixtures.
- `tmp_path` and `tmp_path_factory` for filesystem-isolated tests.
- `monkeypatch` for env-var / attribute / sys.path overrides.
- Snapshot fixtures under `tests/fixtures/` (repo-root) loaded via `pathlib.Path(__file__).parent / "fixtures"`.
- Database fixtures via `pytest-postgresql` / `pytest-mysql` / `testcontainers` rather than mocking the driver.
