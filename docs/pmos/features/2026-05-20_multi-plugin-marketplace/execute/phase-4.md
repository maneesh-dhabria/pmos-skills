---
phase_number: 4
phase_name: "Cutover — local verification + remote topology + dogfood release"
started_at: 2026-05-23T00:00:00Z
completed_at: 2026-05-23T02:00:00Z
tasks: [T9, T10, T11]
verify_status: passed
verify_scope: "phase-scoped manual verify (plan calls for FR-83 install verify + remote topology assertions, all green)"
---

## Phase 4 — done

**Phase exit criteria (plan):**
- ✅ `gh api repos/maneesh-dhabria/pmos-toolkit -q '.archived,.private'` returns `true,true`.
- ✅ `git ls-remote origin pmos-toolkit/v2.51.0` returns a SHA (`8b9a073`).
- ✅ Fresh-CC install picker shows `pmos-toolkit v2.51.0` (verified by user out-of-band).
- ✅ Fresh-Codex install picker shows `pmos-toolkit v2.51.0` (verified by user out-of-band; R6 did not realize).

**Tasks:**
- T9 (Pre-cutover verification sweep): done after defect-T9 resolution (fix(T9) commit `2d28a33` synced marketplace.json 2.49.0→2.50.0; plan target revised to v2.51.0). 18/18 assertion tests pass.
- T10 (Remote topology + push + merge): done. 2-remote topology (origin + gitlab-mirror; work-mirror deferred). Two pre-push hook bugs fixed inline with regression tests (`assert_pre_push_empty_remote.sh`, `assert_pre_push_skips_legacy_tag_refs.sh`). Release bump 2.50.0→2.51.0 landed on feat (commit `998e8af`) per FR-75; merge commit `ee1553c` on main pushed cleanly to both remotes.
- T11 (Tag + install verify + archive): done. Tag `pmos-toolkit/v2.51.0` pushed to both remotes; install verified by user on both Claude Code and Codex; old `maneesh-dhabria/pmos-toolkit` repo archived + privatized.

**Next:** Phase 5 (final verify + complete-dev) per /feature-sdlc Phase 7 (/verify) and Phase 8 (/complete-dev). Since the release bump + tag + push already happened during T10/T11, /complete-dev's role is reduced to its post-release responsibilities (CHANGELOG regen check, learnings capture, etc.) — or may be considered satisfied by the work already done.
