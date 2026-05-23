# go Stack

Go projects using Go modules. Detection signal: `go.mod` at repo root.

## Prereq Commands

```bash
go version
go mod download
```

The required Go toolchain version is read from the `go` directive in `go.mod`. If `go.work` exists, the planner runs commands at workspace level (`go work sync`).

## Lint/Test Commands

```bash
gofmt -l .                        # exits 0 with empty output when formatted; non-empty output = drift
go vet ./...
go test ./...                     # full module test
go test -race ./...               # race detector pass for concurrency-touching changes
```

If `golangci-lint` is configured (presence of `.golangci.yml` / `.golangci.yaml`):

```bash
golangci-lint run ./...
```

`go build ./...` is a sanity gate when no test exists for a package.

## API Smoke Patterns

HTTP smoke (after starting the server):

```bash
curl -fsS http://localhost:8080/healthz
curl -fsS http://localhost:8080/api/v1/users | jq .
```

gRPC smoke:

```bash
grpcurl -plaintext localhost:50051 list
grpcurl -plaintext -d '{}' localhost:50051 service.Method
```

## Common Fixture Patterns

- Table-driven tests are the convention: `tests := []struct{ name string; in X; want Y }{...}`.
- `testdata/` directories (Go's special-cased name — excluded from `go build`) hold fixture files; access via `os.ReadFile("testdata/<name>")`.
- `t.TempDir()` for filesystem-isolated tests; `t.Setenv()` for env-var scoping.
- Subtests via `t.Run(tc.name, func(t *testing.T) { ... })`.
- Golden files: write expected output under `testdata/golden/`; refresh with a `-update` flag pattern.
