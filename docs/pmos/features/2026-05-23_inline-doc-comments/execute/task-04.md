---
task_number: 4
task_name: "Extend serve.js --pid-file + idle + 127.0.0.1 hard-bind"
plan_path: "docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html"
branch: "feat/inline-doc-comments"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-doc-comments"
status: done
started_at: 2026-05-24T05:19:00Z
completed_at: 2026-05-24T05:24:00Z
files_touched:
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/serve.js
  - tests/scripts/assert_serve_js.sh
  - tests/scripts/assert_serve_js_pid_file.sh
  - tests/scripts/serve.pid_file.test.js
---

## Outcome

3 test wrappers, 16/16 assertions green:
- `assert_serve_js.sh` — 5/5 (existing functional smoke, now consumes JSON pid-file)
- `assert_serve_js_unit.sh` — 4/4 (path-traversal + MIME, unmodified)
- `assert_serve_js_pid_file.sh` — 7/7 (new: a–g per plan)

## Deviation

The existing `tests/scripts/assert_serve_js.sh` consumed `--port-file`'s bare-port-string output. With Decision P2's alias semantics (`--port-file` = deprecated alias of `--pid-file`, identical JSON payload), the legacy script had to migrate to JSON consumption. Pmos-internal script — no external callers. Plan anticipated this in P2.

## Runtime evidence

```
$ bash tests/scripts/assert_serve_js_pid_file.sh
  ok (a) pid file contains JSON with pid/port/started_at
  ok (b) kill -0 <pid> succeeds while serve is running
  ok (c) SIGTERM removes pid file within 500ms
  ok (d) --port-file alias behaves identically + stderr deprecation warning
  ok (e) --idle=1 triggers self-shutdown within ~1.5s
  ok (f) hard-bind 127.0.0.1 — non-loopback 192.168.1.4 refused
  ok (g) regression: --port still binds + responds
  7 passed, 0 failed
```
