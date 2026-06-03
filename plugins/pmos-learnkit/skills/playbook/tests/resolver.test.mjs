// resolver.test.mjs — unit tests for the multi-signal resolver. Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { attribute, classifySession, resolveRepoSessions, canon } from '../scripts/resolve_repo_sessions.mjs';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'pb-')); }
function writeSession(dir, name, records) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), records.map(r => JSON.stringify(r)).join('\n') + '\n');
}
function userRec(text, extra = {}) { return { type: 'user', message: { content: text }, userType: 'external', ...extra }; }

test('attribute: nested-prefix (worktree under repo) is confident', () => {
  const repo = canon('/work/myrepo');
  const a = attribute(repo, '/work/myrepo/.claude/worktrees/abc', 'feat/x', new Set());
  assert.ok(a.attributed); assert.ok(a.signals.includes('nested')); assert.equal(a.ambiguous, false);
});

test('attribute: repo root itself (HEAD) is nested/confident', () => {
  const repo = canon('/work/myrepo');
  const a = attribute(repo, '/work/myrepo', 'HEAD', new Set());
  assert.ok(a.signals.includes('nested')); assert.equal(a.ambiguous, false);
});

test('attribute: sibling dir + merged branch is confident', () => {
  const repo = canon('/work/myrepo');
  const a = attribute(repo, '/work/myrepo-feat-x', 'feat/x', new Set(['feat/x']));
  assert.deepEqual(a.signals.sort(), ['branch', 'sibling']);
  assert.equal(a.ambiguous, false); assert.ok(a.attributed);
});

test('attribute: merged-and-deleted sibling (path gone) still resolves via name + branch', () => {
  const repo = canon('/work/myrepo');
  // cwd path does not exist on disk; sibling-strip is name-based, branch corroborates
  const a = attribute(repo, '/work/myrepo-feat-gone', 'feat/gone', new Set(['feat/gone']));
  assert.ok(a.attributed); assert.deepEqual(a.signals.sort(), ['branch', 'sibling']); assert.equal(a.ambiguous, false);
});

test('attribute: branch-only match (unrelated cwd) is AMBIGUOUS, not attributed-confident (FR-22)', () => {
  const repo = canon('/work/myrepo');
  const a = attribute(repo, '/elsewhere/other-thing', 'feat/ux-fix', new Set(['feat/ux-fix']));
  assert.deepEqual(a.signals, ['branch']);
  assert.equal(a.ambiguous, true); assert.equal(a.reason, 'branch-only');
});

test('attribute: sibling-only is ATTRIBUTED but low-confidence (not excluded) — avoids worktree undercount', () => {
  const repo = canon('/work/myrepo');
  const a = attribute(repo, '/work/myrepo-scratch', 'HEAD', new Set());
  assert.deepEqual(a.signals, ['sibling']);
  assert.equal(a.attributed, true);
  assert.equal(a.ambiguous, false);
  assert.equal(a.lowConfidence, true); assert.equal(a.reason, 'sibling-only');
});

test('classifySession: permission-mode => interactive; command-name detected', () => {
  const root = tmp(); const dir = path.join(root, 'd1');
  writeSession(dir, 's.jsonl', [
    userRec('<command-name>/playbook</command-name>', { cwd: '/work/myrepo', gitBranch: 'HEAD' }),
    { type: 'permission-mode', cwd: '/work/myrepo' },
    { type: 'assistant', message: { content: 'ok' } },
  ]);
  const c = classifySession(path.join(dir, 's.jsonl'));
  assert.equal(c.interactive, true); assert.equal(c.hasCommandName, true);
  assert.equal(c.cwd, '/work/myrepo'); assert.equal(c.gitBranch, 'HEAD');
});

test('classifySession: no permission-mode => not interactive (headless)', () => {
  const root = tmp(); const dir = path.join(root, 'd2');
  writeSession(dir, 'h.jsonl', [
    userRec('You are evaluating the faithfulness of a summary.', { cwd: '/work/myrepo' }),
    { type: 'assistant', message: { content: '...' } },
  ]);
  const c = classifySession(path.join(dir, 'h.jsonl'));
  assert.equal(c.interactive, false); assert.equal(c.hasCommandName, false);
});

test('resolveRepoSessions: headless dropped by default, re-admitted with includeHeadless', () => {
  const root = tmp();
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-'));
  // interactive session attributed by nested-prefix
  writeSession(path.join(root, 'a'), 'i.jsonl', [
    userRec('hi', { cwd: repo, gitBranch: 'HEAD' }),
    { type: 'permission-mode', cwd: repo },
  ]);
  // headless session, also nested
  writeSession(path.join(root, 'b'), 'h.jsonl', [
    userRec('templated', { cwd: repo, gitBranch: 'HEAD' }),
  ]);
  const def = resolveRepoSessions({ repo, roots: [root], mergeBranches: new Set(), windowDays: null });
  assert.equal(def.attributed.length, 1);
  assert.equal(def.coverage.headless_dropped, 1);
  assert.equal(def.coverage.interactive, 1);

  const incl = resolveRepoSessions({ repo, roots: [root], mergeBranches: new Set(), windowDays: null, includeHeadless: true });
  assert.equal(incl.attributed.length, 2);
});

test('resolveRepoSessions: ambiguous branch-only goes to ambiguous[], not attributed', () => {
  const root = tmp();
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-'));
  writeSession(path.join(root, 'amb'), 's.jsonl', [
    userRec('x', { cwd: '/totally/unrelated/path', gitBranch: 'feat/shared' }),
    { type: 'permission-mode' },
  ]);
  const r = resolveRepoSessions({ repo, roots: [root], mergeBranches: new Set(['feat/shared']), windowDays: null });
  assert.equal(r.attributed.length, 0);
  assert.equal(r.ambiguous.length, 1);
  assert.equal(r.ambiguous[0].reason, 'branch-only');
});
