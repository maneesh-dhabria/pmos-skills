// scout.test.mjs — unit tests for the evolution milestone-spine scout.
// Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  extractSessionMeta, slugify,
  parseChangelogMilestones, featureMilestones, mergeMilestones, buildSpine, spineFromInputs,
  mapSessionsToSpine, metaUsesSkill, milestoneAboutSkill, scoutRepo, nonTrivialSkills,
} from '../scripts/scout.mjs';

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
const dateMs = (d) => Date.parse(`${d}T00:00:00Z`);

test('extractSessionMeta: verbatim opening prompt, skills, decision signals, session_id', () => {
  const root = tmp(); const dir = path.join(root, 'd');
  const f = writeSession(dir, 'abc.jsonl', [
    title('Design the survey skill'),
    u('<command-name>/ideate</command-name>', { gitBranch: 'feat/survey' }),
    u('I want to build a survey designer; what are the tradeoffs?'),
    auq(),
    u("let's do the JSON-schema approach instead of a form builder"),
  ]);
  const m = extractSessionMeta(f);
  assert.equal(m.session_id, 'abc');
  assert.equal(m.aiTitle, 'Design the survey skill');
  assert.equal(m.gitBranch, 'feat/survey');
  assert.equal(m.firstPrompt, 'I want to build a survey designer; what are the tradeoffs?'); // verbatim
  assert.ok(m.skills.has('/ideate'));
  assert.ok(m.decisionSignals >= 2); // AskUserQuestion + "instead" pushback
});

test('extractSessionMeta: skips compaction-injected first message', () => {
  const root = tmp(); const dir = path.join(root, 'd');
  const f = writeSession(dir, 's.jsonl', [
    u('This session is being continued from a previous conversation...'),
    u('the real starting question is here'),
  ]);
  assert.equal(extractSessionMeta(f).firstPrompt, 'the real starting question is here');
});

test('spine: changelog + feature-doc + merge are parsed and unioned', () => {
  const cl = parseChangelogMilestones('## [2.84.0] - 2026-06-17 Shape skill front gate\n### 2026-06-10 Inline comments');
  assert.equal(cl.length, 2);
  assert.equal(cl[0].date, '2026-06-17');

  const fm = featureMilestones(['2026-06-03_playbook', 'junk']);
  assert.equal(fm.length, 1);
  assert.equal(fm[0].source, 'feature-doc');
  assert.equal(fm[0].featureDir, '2026-06-03_playbook');

  const mm = mergeMilestones("2026-06-17\tMerge branch 'feat/evo'");
  assert.equal(mm[0].branch, 'feat/evo');
});

test('buildSpine: dedupes by date|slug (richer source wins), sorts by date asc', () => {
  const spine = buildSpine([
    [{ date: '2026-06-03', title: 'playbook', slug: 'playbook', source: 'merge', branch: 'feat/playbook', featureDir: null }],
    [{ date: '2026-06-03', title: 'playbook', slug: 'playbook', source: 'feature-doc', branch: null, featureDir: '2026-06-03_playbook' }],
    [{ date: '2026-06-01', title: 'earlier', slug: 'earlier', source: 'merge', branch: null, featureDir: null }],
  ]);
  assert.equal(spine.length, 2);
  assert.equal(spine[0].date, '2026-06-01');
  const pb = spine.find(m => m.slug === 'playbook');
  assert.equal(pb.source, 'feature-doc');     // feature-doc beats merge
  assert.equal(pb.branch, 'feat/playbook');   // branch carried over from the merge entry
});

test('mapSessionsToSpine: branch match dominates; pre-build session lands on its milestone', () => {
  const spine = spineFromInputs({ featureDirs: ['2026-06-01_earlier', '2026-06-10_playbook'] });
  const metas = [
    // branched session for the playbook milestone, built just before its date
    { file: 'a.jsonl', session_id: 'a', gitBranch: 'feat/playbook', firstPrompt: 'build playbook', skills: new Set(['/spec', '/exit']), decisionSignals: 2, mtime: dateMs('2026-06-09'), topic: new Set(['playbook']) },
    // HEAD session in the earlier window
    { file: 'b.jsonl', session_id: 'b', gitBranch: 'HEAD', firstPrompt: 'earlier work', skills: new Set(['/ideate']), decisionSignals: 1, mtime: dateMs('2025-12-30'), topic: new Set(['earlier']) },
  ];
  const { milestones, unmapped } = mapSessionsToSpine(spine, metas);
  const pmile = milestones.find(m => m.slug === 'playbook');
  assert.equal(pmile.sessions.length, 1);
  assert.equal(pmile.opening_prompt, 'build playbook');           // verbatim, in milestone
  assert.deepEqual([...pmile.skills], ['/spec']);                 // /exit (trivial) dropped
  assert.equal(unmapped.length, 0);
});

test('mapSessionsToSpine: post-spine unshipped session is unmapped', () => {
  const spine = spineFromInputs({ featureDirs: ['2026-06-03_playbook'] });
  const metas = [{ file: 'z.jsonl', session_id: 'z', gitBranch: 'HEAD', firstPrompt: 'brand new idea', skills: new Set(['/spec']), decisionSignals: 0, mtime: dateMs('2027-01-01'), topic: new Set(['brandnew']) }];
  const { milestones, unmapped } = mapSessionsToSpine(spine, metas);
  assert.equal(milestones[0].sessions.length, 0);
  assert.equal(unmapped.length, 1);
  assert.equal(unmapped[0].session_id, 'z');
});

test('skill scoping: metaUsesSkill + milestoneAboutSkill', () => {
  assert.equal(metaUsesSkill({ gitBranch: 'feat/other', skills: new Set(['/spec']), topic: new Set(['unrelated']) }, '/playbook'), false);
  assert.equal(metaUsesSkill({ gitBranch: 'HEAD', skills: new Set(['/pmos-learnkit:playbook']), topic: new Set() }, 'playbook'), true);
  assert.equal(metaUsesSkill({ gitBranch: 'feat/playbook-x', skills: new Set(), topic: new Set() }, 'playbook'), true);
  const m = { slug: 'playbook-evolution', title: 'playbook', branch: null, featureDir: null };
  assert.equal(milestoneAboutSkill(m, 'playbook'), true);
  assert.equal(milestoneAboutSkill(m, 'frameworks'), false);
});

test('scoutRepo: end-to-end emits milestones + coverage with NO scoring fields; cheap-scout', () => {
  const root = tmp();
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-'));
  writeSession(path.join(root, 'rich'), 'r.jsonl', [
    title('survey designer skill'),
    u('<command-name>/ideate</command-name>', { cwd: repo, gitBranch: 'feat/survey' }),
    pm(), u('build a survey designer'), auq(),
    u("let's go with json schema instead"),
  ], dateMs('2026-06-09'));

  const out = scoutRepo({
    repo, roots: [root], mergeBranches: new Set(),
    spineInputs: { featureDirs: ['2026-06-10_survey'], mergeLog: "2026-06-10\tMerge branch 'feat/survey'" },
  });

  assert.equal(out.scope, 'repo');
  assert.ok(Array.isArray(out.milestones) && out.milestones.length >= 1);
  const surveyM = out.milestones.find(m => m.slug.includes('survey'));
  assert.ok(surveyM, 'survey milestone present');
  assert.ok(surveyM.session_ids.includes('r'), 'branched session mapped onto milestone');
  assert.equal(surveyM.opening_prompt, 'build a survey designer');
  // contract carries NO clustering/scoring leftovers
  for (const m of out.milestones) {
    assert.ok(!('score' in m) && !('boundary_confidence' in m) && !('merge_suggestion' in m));
  }
  assert.equal(typeof out.coverage.milestones, 'number');
  assert.equal(typeof out.coverage.mapped_sessions, 'number');
});

test('scoutRepo: --skill narrows to that skill arc', () => {
  const root = tmp();
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-'));
  writeSession(path.join(root, 'p'), 'p.jsonl', [
    title('playbook evolution rewrite'),
    u('<command-name>/pmos-learnkit:playbook</command-name>', { cwd: repo, gitBranch: 'feat/playbook' }),
    pm(), u('rewrite playbook to evolution mode'), auq(),
  ], dateMs('2026-06-16'));
  writeSession(path.join(root, 'f'), 'f.jsonl', [
    title('frameworks corpus'),
    u('<command-name>/frameworks</command-name>', { cwd: repo, gitBranch: 'feat/frameworks' }),
    pm(), u('add frameworks'), auq(),
  ], dateMs('2026-06-14'));

  const out = scoutRepo({
    repo, roots: [root], mergeBranches: new Set(), skill: 'playbook',
    spineInputs: { featureDirs: ['2026-06-17_playbook-evolution', '2026-06-14_frameworks-corpus'] },
  });
  assert.equal(out.scope, 'skill:playbook');
  // only playbook-scoped sessions survive
  const ids = out.milestones.flatMap(m => m.session_ids);
  assert.ok(ids.includes('p'));
  assert.ok(!ids.includes('f'), 'frameworks session excluded under --skill playbook');
});

test('slugify: kebab, stopwords dropped', () => {
  assert.equal(slugify('How to build the survey designer skill'), 'survey-designer-skill');
});

test('nonTrivialSkills: filters the trivial set', () => {
  assert.deepEqual(nonTrivialSkills(new Set(['/exit', '/spec', '/compact', '/grill'])).sort(), ['/grill', '/spec']);
});
