#!/usr/bin/env bash
# assert_launcher.sh — platform dispatcher for the comments-open launcher tests.
# Delegates to launcher.test.sh on POSIX hosts; skips with TODO on Windows.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$HERE/launcher.test.sh"
