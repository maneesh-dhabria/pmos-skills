#!/usr/bin/env bash
# T4 — pid-file + idle + 127.0.0.1 hard-bind + --port-file alias regression tests.
# FR-44, FR-45, NFR-07; Decision P2.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
exec node "$HERE/serve.pid_file.test.js"
