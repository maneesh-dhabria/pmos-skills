// scout.test.mjs — unit tests for clustering, instructiveness floor, scoring, merge-suggest.
// Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractSessionMeta, clusterThreads, passesFloor, withMergeSuggestions, scoutRepo, slugify } from '../scripts/scout.mjs';

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'pbs-')); }
function writeSession(dir, name, records, mtime) {
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, name);
  fs.writeFileSync(f, records.map(r => JSON.stringify(r)).join('\n') + '\n');
  if (mtime) fs.utimesSync(f, new Date(mtime), new Date(mtime));
  return f;
}
const day = 86400000;
const u = (text, extra = {}) => ({ type: 'user', message: { content: text }, ...extra });
const auq = () => ({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'AskUserQuestion', input: {} }] } });
const pm = () => ({ type: 'permission-mode' });
const title = (t) => ({ type: 'ai-title', aiTitle: t });

test('extractSessionMeta: pulls aiTitle, first non-command prompt, skills, decision signals', () => {
  const root = tmp(); const dir = path.join(root, 'd');
  const f = writeSession(dir, 's.jsonl', [
    title('Design the survey skill'),
    u('<command-name>/ideate</command-name>', { gitBranch: 'feat/survey' }),
    u('I want to build a survey designer; what are the tradeoffs?'),
    auq(),
    u("let's do the JSON-schema approach instead of a form builder"),
  ]);
  const m = extractSessionMeta(f);
  assert.equal(m.aiTitle, 'Design the survey skill');
  assert.equal(m.gitBranch, 'feat/survey');
  assert.ok(m.firstPrompt.startsWith('I want to build a survey'));
  assert.ok(m.skills.has('/ideate'));
  assert.ok(m.decisionSignals >= 2); // AskUserQuestion + "instead" pushback
});

test('extractSessionMeta: skips compaction-injected first message', () => {
  const root = tmp(); const dir = path.join(root, 'd');
  const f = writeSession(dir, 's.jsonl', [
    u('This session is being continued from a previous conversation...'),
    u('the real starting question is here'),
  ]);
  const m = extractSessionMeta(f);
  assert.equal(m.firstPrompt, 'the real starting question is here');
});

test('clusterThreads: groups by non-HEAD branch', () => {
  const root = tmp(); const dir = path.join(root, 'd');
  const metas = [
    extractSessionMeta(writeSession(dir, 'a.jsonl', [title('feature a'), u('x', { gitBranch: 'feat/a' }), auq(), u('/exit<command-name>/grill</command-name>')], Date.now() - 3 * day)),
    extractSessionMeta(writeSession(dir, 'b.jsonl', [title('feature a more'), u('y', { gitBranch: 'feat/a' })], Date.now() - 2 * day)),
    extractSessionMeta(writeSession(dir, 'c.jsonl', [title('feature b'), u('z', { gitBranch: 'feat/b' })], Date.now() - day)),
  ];
  const threads = clusterThreads(metas);
  const branches = threads.map(t => t.branch).sort();
  assert.deepEqual(branches, ['feat/a', 'feat/b']);
  const a = threads.find(t => t.branch === 'feat/a');
  assert.equal(a.sessions.length, 2);
});

test('clusterThreads: HEAD sessions split on topic shift + temporal gap', () => {
  const root = tmp(); const dir = path.join(root, 'd');
  const base = Date.now() - 30 * day;
  const metas = [
    extractSessionMeta(writeSession(dir, 'p1.jsonl', [title('poker equity calculator math'), u('build poker equity engine', { gitBranch: 'HEAD' })], base)),
    extractSessionMeta(writeSession(dir, 'p2.jsonl', [title('poker equity calculator ui'), u('poker equity calculator ui polish', { gitBranch: 'HEAD' })], base + 3600000)),
    extractSessionMeta(writeSession(dir, 'q1.jsonl', [title('income tax filing helper'), u('totally different income tax topic', { gitBranch: 'HEAD' })], base + 10 * day)),
  ];
  const threads = clusterThreads(metas).filter(t => t.branch === 'HEAD');
  assert.equal(threads.length, 2, 'poker thread + tax thread');
});

test('passesFloor: thin session (1 session, only /exit, no decisions) is suppressed', () => {
  const root = tmp(); const dir = path.join(root, 'd');
  const m = extractSessionMeta(writeSession(dir, 't.jsonl', [u('<command-name>/exit</command-name>', { gitBranch: 'HEAD' })]));
  const [thread] = clusterThreads([m]);
  assert.equal(passesFloor(thread), false);
});

test('passesFloor: short-but-rich (1 session, decision + real skill) qualifies', () => {
  const root = tmp(); const dir = path.join(root, 'd');
  const m = extractSessionMeta(writeSession(dir, 'r.jsonl', [
    u('<command-name>/feature-sdlc</command-name>', { gitBranch: 'feat/x' }),
    u('build the thing'), auq(),
  ]));
  const [thread] = clusterThreads([m]);
  assert.equal(passesFloor(thread), true);
});

test('withMergeSuggestions: branch thread + same-topic HEAD thread => suggestion', () => {
  const root = tmp(); const dir = path.join(root, 'd');
  const base = Date.now() - 5 * day;
  const metas = [
    extractSessionMeta(writeSession(dir, 'b.jsonl', [title('memory book editor inline'), u('memory book editor inline edit', { gitBranch: 'feat/memory-book-editor' }), auq()], base)),
    extractSessionMeta(writeSession(dir, 'h.jsonl', [title('memory book editor followup'), u('memory book editor inline followup work', { gitBranch: 'HEAD' }), auq()], base + day)),
  ];
  let threads = clusterThreads(metas);
  threads = withMergeSuggestions(threads);
  const b = threads.find(t => t.branch !== 'HEAD');
  assert.ok(b.merge_suggestion, 'expected a merge suggestion');
  assert.ok(b.merge_suggestion.confidence >= 0.3);
});

test('scoutRepo: end-to-end emits ranked candidates + coverage; suppresses thin', () => {
  const root = tmp();
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-'));
  // rich interactive thread
  writeSession(path.join(root, 'rich'), 'r.jsonl', [
    title('survey designer skill'),
    u('<command-name>/ideate</command-name>', { cwd: repo, gitBranch: 'feat/survey' }),
    pm(), u('build a survey designer'), auq(),
    u("let's go with json schema instead"),
  ], Date.now() - 2 * day);
  // thin interactive thread (no decision, only /exit)
  writeSession(path.join(root, 'thin'), 't.jsonl', [
    u('<command-name>/exit</command-name>', { cwd: repo, gitBranch: 'HEAD' }), pm(),
  ], Date.now() - day);
  const out = scoutRepo({ repo, roots: [root], mergeBranches: new Set(), windowDays: null });
  assert.equal(out.candidates.length, 1);
  assert.equal(out.candidates[0].branch, 'feat/survey');
  assert.ok(out.coverage.suppressed_thin >= 1);
  assert.ok(out.candidates[0].why_teachable.length > 0);
});

test('slugify: kebab, <=4 words, stopwords dropped', () => {
  assert.equal(slugify('How to build the survey designer skill'), 'survey-designer-skill');
});
