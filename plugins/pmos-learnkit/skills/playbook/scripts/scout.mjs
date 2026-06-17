#!/usr/bin/env node
// scout.mjs — deterministic evolution scout for /playbook.
// Builds the MILESTONE SPINE of a repo (or one skill inside it) from the committed record
// (changelog + docs/pmos/features/* + git merge log), then maps the author's interactive
// sessions onto that spine using ONLY cheap session fields. The LLM never reads raw session
// bodies at scout time — it consumes this summary, then deep-reads only the mapped sessions of
// the milestones the article covers.
//
// Evolution = the WHOLE arc: no time window, no session cap. The resolver is called with
// since:0 so every attributed session is mined (resolve_repo_sessions.mjs stays unchanged).
//
// Zero-dependency Node ESM (Node >=18).

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolveRepoSessions, readSession } from './resolve_repo_sessions.mjs';

const TRIVIAL_SKILLS = new Set(['/exit', '/compact', '/clear', '/reload-plugins', '/reload-skills', '/login', '/doctor', '/mcp', '/plugin', '/remote-control', '/remote-env', '/effort']);
const STOPWORDS = new Set(['the','a','an','to','of','for','and','or','in','on','with','this','that','is','it','my','i','how','can','you','we','be','as','at','from','do','using','use','build','make','add','merge','branch','release','feat','fix','chore','docs']);

function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(b => (b && typeof b.text === 'string') ? b.text : '').join(' ');
  return '';
}
function tokens(s) {
  return new Set(String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w)));
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0; for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
export function slugify(s, max = 5) {
  const words = String(s || 'playbook').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(w => w && !STOPWORDS.has(w)).slice(0, max);
  return (words.join('-') || 'playbook').slice(0, 60);
}
function humanize(slug) {
  return String(slug || '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// Match only real command invocations: <command-name>/slash-token</command-name>.
const COMMAND_RE = /<command-name>\s*(\/[A-Za-z0-9:_-]+)\s*<\/command-name>/g;
const PUSHBACK_RE = /\b(instead|prefer|rather|actually|let's|don't|do not|push ?back|no,|i'd rather|not that)\b/i;
const COMPACTION_RE = /(continued from a previous|this session is being continued|caveat:)/i;

/** Extract cheap meta from one session file. The opening prompt is the verbatim first human message. */
export function extractSessionMeta(file) {
  const recs = readSession(file);
  let aiTitle = null, gitBranch = null, firstPrompt = null;
  const skills = new Set();
  let decisionSignals = 0;
  for (const r of recs) {
    if (r.type === 'ai-title' && typeof r.aiTitle === 'string') aiTitle = aiTitle || r.aiTitle;
    if (gitBranch == null && typeof r.gitBranch === 'string') gitBranch = r.gitBranch;
    if (r.type === 'user' && r.message) {
      const t = textOf(r.message.content);
      let m; COMMAND_RE.lastIndex = 0;
      while ((m = COMMAND_RE.exec(t))) skills.add(m[1].trim());
      if (firstPrompt == null && t.trim() && !t.includes('command-name>') && !COMPACTION_RE.test(t)) {
        firstPrompt = t.trim().slice(0, 400);
      }
      if (PUSHBACK_RE.test(t)) decisionSignals++;
    }
    if (r.type === 'assistant' && r.message && Array.isArray(r.message.content)) {
      for (const b of r.message.content) {
        if (b && b.type === 'tool_use' && b.name === 'AskUserQuestion') decisionSignals++;
      }
    }
  }
  let mtime = 0; try { mtime = fs.statSync(file).mtimeMs; } catch {}
  return { file, session_id: path.basename(file).replace(/\.jsonl$/, ''),
           aiTitle, gitBranch, firstPrompt, skills, decisionSignals, mtime,
           topic: tokens(`${aiTitle || ''} ${firstPrompt || ''}`) };
}

export function nonTrivialSkills(skillSet) {
  return [...skillSet].filter(s => !TRIVIAL_SKILLS.has(s));
}

// ── Spine: the committed milestone record ────────────────────────────────────

/** Changelog headings carrying an ISO date → milestones. Tolerant of common formats. */
export function parseChangelogMilestones(text = '') {
  const out = [];
  for (const line of String(text).split('\n')) {
    if (!/^#{1,4}\s/.test(line)) continue;
    const dm = line.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dm) continue;
    const date = dm[1];
    let title = line.replace(/^#{1,4}\s*/, '').replace(/\[[^\]]*\]/g, ' ')
      .replace(date, ' ').replace(/[-–—|]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!title) title = 'release';
    out.push({ date, title, slug: slugify(title), source: 'changelog', branch: null, featureDir: null });
  }
  return out;
}

/** docs/pmos/features/<YYYY-MM-DD>_<slug>/ dir names → milestones (the decision record). */
export function featureMilestones(dirNames = []) {
  const out = [];
  for (const name of dirNames) {
    const m = String(name).match(/^(\d{4}-\d{2}-\d{2})_(.+?)\/?$/);
    if (!m) continue;
    const date = m[1], rawSlug = m[2];
    out.push({ date, title: humanize(rawSlug), slug: slugify(humanize(rawSlug)),
               source: 'feature-doc', branch: null, featureDir: name });
  }
  return out;
}

/** `git log --merges --pretty=%cs%x09%s` output → milestones (date + merged branch slug). */
export function mergeMilestones(mergeLog = '') {
  const out = [];
  for (const line of String(mergeLog).split('\n')) {
    const tab = line.indexOf('\t');
    if (tab < 0) continue;
    const date = line.slice(0, tab).trim();
    const subj = line.slice(tab + 1);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const bm = subj.match(/Merge[^']*'([^']+)'/) || subj.match(/from\s+\S+?\/(\S+)/);
    const branch = bm ? bm[1].replace(/^['"]|['"]$/g, '') : null;
    const titleSrc = branch ? branch.replace(/^[^/]*\//, '') : subj.replace(/^Merge\s*/, '');
    const title = humanize(titleSrc).trim() || subj.trim();
    out.push({ date, title, slug: slugify(title), source: 'merge', branch, featureDir: null });
  }
  return out;
}

const SOURCE_RANK = { 'feature-doc': 3, 'changelog': 2, 'merge': 1 };

/** Union + dedupe (by date|slug, richer source wins) + deterministic sort (date asc, slug asc). */
export function buildSpine(parts) {
  const all = [].concat(...parts);
  const seen = new Map();
  for (const m of all) {
    const key = `${m.date}|${m.slug}`;
    const prev = seen.get(key);
    if (!prev || (SOURCE_RANK[m.source] || 0) > (SOURCE_RANK[prev.source] || 0)) {
      seen.set(key, prev ? { ...m, branch: m.branch || prev.branch, featureDir: m.featureDir || prev.featureDir } : m);
    } else if (prev && !prev.branch && m.branch) {
      prev.branch = m.branch;
    }
  }
  return [...seen.values()].sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug));
}

/** Build the spine from raw inputs (I/O-free; unit-testable). */
export function spineFromInputs({ changelog = '', featureDirs = [], mergeLog = '' } = {}) {
  return buildSpine([
    parseChangelogMilestones(changelog),
    featureMilestones(featureDirs),
    mergeMilestones(mergeLog),
  ]);
}

/** Read the three spine inputs off disk (best-effort; empty on failure). */
export function readSpineInputs(repo) {
  let changelog = '';
  const clPaths = [path.join(repo, 'CHANGELOG.md'), path.join(repo, 'CHANGELOG')];
  try {
    for (const e of fs.readdirSync(path.join(repo, 'plugins'), { withFileTypes: true })) {
      if (e.isDirectory()) clPaths.push(path.join(repo, 'plugins', e.name, 'CHANGELOG.md'));
    }
  } catch { /* no plugins dir */ }
  for (const p of clPaths) { try { changelog += fs.readFileSync(p, 'utf-8') + '\n'; } catch { /* absent */ } }

  let featureDirs = [];
  try {
    featureDirs = fs.readdirSync(path.join(repo, 'docs', 'pmos', 'features'))
      .filter(n => /^\d{4}-\d{2}-\d{2}_/.test(n));
  } catch { /* no feature docs */ }

  let mergeLog = '';
  try { mergeLog = execFileSync('git', ['-C', repo, 'log', '--merges', '--pretty=%cs%x09%s'], { encoding: 'utf-8' }); }
  catch { /* not a repo / no merges */ }

  return { changelog, featureDirs, mergeLog };
}

// ── Map sessions onto the spine ──────────────────────────────────────────────

function dateMs(d) { return Date.parse(`${d}T00:00:00Z`); }

/**
 * Assign each session to its best-matching milestone (branch > date-window > topic).
 * Deterministic. Every session lands on at most one milestone; the rest are `unmapped`.
 */
export function mapSessionsToSpine(spine, metas) {
  const sorted = [...spine].sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug));
  const milestones = sorted.map((m, i) => ({
    ...m, sessions: [], skills: new Set(), opening_prompt: null,
    _start: i > 0 ? dateMs(sorted[i - 1].date) : -Infinity,
    _end: dateMs(m.date) + 86400000,
    _topic: tokens(`${m.title} ${m.slug.replace(/-/g, ' ')}`),
  }));
  const unmapped = [];
  for (const s of [...metas].sort((a, b) => (a.mtime - b.mtime) || a.file.localeCompare(b.file))) {
    let best = null, bestScore = 0;
    for (const m of milestones) {
      let score = 0;
      if (m.branch && s.gitBranch && s.gitBranch !== 'HEAD' && s.gitBranch === m.branch) score += 100;
      if (s.mtime >= m._start && s.mtime <= m._end) score += 10;
      score += jaccard(m._topic, s.topic) * 5;
      if (score > bestScore) { bestScore = score; best = m; }
    }
    if (best && bestScore > 0) best.sessions.push(s);
    else unmapped.push(s);
  }
  for (const m of milestones) {
    m.sessions.sort((a, b) => (a.mtime - b.mtime) || a.file.localeCompare(b.file));
    for (const s of m.sessions) for (const k of nonTrivialSkills(s.skills)) m.skills.add(k);
    const withPrompt = m.sessions.find(s => s.firstPrompt);
    m.opening_prompt = withPrompt ? withPrompt.firstPrompt : null;
  }
  return { milestones, unmapped };
}

// ── Skill scoping ────────────────────────────────────────────────────────────

function bareSkill(name) { return String(name || '').toLowerCase().replace(/^\//, ''); }

/** A session is "about <skill>" if it used the skill, was branched for it, or names it. */
export function metaUsesSkill(meta, skill) {
  const s = bareSkill(skill);
  for (const k of meta.skills) {
    const kk = bareSkill(k);
    if (kk === s || kk.endsWith(`:${s}`)) return true;
  }
  if (meta.gitBranch && meta.gitBranch.toLowerCase().includes(s)) return true;
  if (meta.topic.has(s)) return true;
  return false;
}

/** A milestone is "about <skill>" if its title/slug/branch/feature-dir names it. */
export function milestoneAboutSkill(m, skill) {
  const s = bareSkill(skill);
  return Boolean((m.slug && m.slug.includes(s)) || (m.title && m.title.toLowerCase().includes(s)) ||
    (m.branch && m.branch.toLowerCase().includes(s)) || (m.featureDir && m.featureDir.toLowerCase().includes(s)));
}

// ── Full scout ───────────────────────────────────────────────────────────────

/**
 * Full scout: resolve (mine everything) → build spine → map → emit the evolution contract.
 * opts: { repo, roots?, mergeBranches?, includeHeadless?, skill?, spineInputs? }.
 * Mines the WHOLE arc — `since: 0` forces the resolver's window open (resolver unchanged).
 */
export function scoutRepo(opts) {
  const res = resolveRepoSessions({ ...opts, since: 0, windowDays: undefined, sessionsLimit: undefined });
  let metas = res.attributed.filter(r => r.interactive || opts.includeHeadless).map(r => extractSessionMeta(r.file));
  let spine = spineFromInputs(opts.spineInputs || readSpineInputs(canonRepo(opts.repo)));

  if (opts.skill) {
    metas = metas.filter(m => metaUsesSkill(m, opts.skill));
  }
  let { milestones, unmapped } = mapSessionsToSpine(spine, metas);
  if (opts.skill) {
    milestones = milestones.filter(m => milestoneAboutSkill(m, opts.skill) || m.sessions.length > 0);
  }

  const mappedCount = milestones.reduce((n, m) => n + m.sessions.length, 0);
  return {
    scope: opts.skill ? `skill:${bareSkill(opts.skill)}` : 'repo',
    coverage: {
      ...res.coverage,
      milestones: milestones.length,
      mapped_sessions: mappedCount,
      unmapped_sessions: unmapped.length,
    },
    ambiguous: res.ambiguous.map(a => ({ dir: a.dir, reason: a.reason, gitBranch: a.gitBranch })),
    milestones: milestones.map(m => ({
      date: m.date, title: m.title, slug: m.slug, source: m.source,
      branch: m.branch || null, feature_dir: m.featureDir || null,
      session_ids: m.sessions.map(s => s.session_id),
      skills: [...m.skills],
      opening_prompt: m.opening_prompt,
      decision_signals: m.sessions.reduce((n, s) => n + s.decisionSignals, 0),
    })),
    unmapped_sessions: unmapped.map(s => ({
      session_id: s.session_id, branch: s.gitBranch || null, skills: nonTrivialSkills(s.skills),
    })),
  };
}

function canonRepo(p) { try { return fs.realpathSync(p); } catch { return path.resolve(p); } }

// ── --selftest ───────────────────────────────────────────────────────────────

function selftest() {
  const A = (cond, msg) => { if (!cond) { console.error(`FAIL - ${msg}`); process.exitCode = 1; } else console.log(`ok   - ${msg}`); };

  // spine parsing
  const cl = parseChangelogMilestones('## [2.84.0] - 2026-06-17 - Shape skill front gate\nsome body\n### 2026-06-10 Inline comments');
  A(cl.length === 2, 'changelog: two dated headings parsed');
  A(cl[0].date === '2026-06-17' && cl[0].slug.includes('shape'), 'changelog: date + slug extracted');

  const fm = featureMilestones(['2026-06-03_playbook', '2026-06-17_shape-front-gate', 'not-a-feature']);
  A(fm.length === 2, 'featureMilestones: only dated dirs');
  A(fm[0].source === 'feature-doc' && fm[0].featureDir === '2026-06-03_playbook', 'featureMilestones: keeps dir + source');

  const mm = mergeMilestones("2026-06-17\tMerge branch 'feat/evo'\n2026-06-10\tMerge pull request #3 from u/feat/comments");
  A(mm.length === 2 && mm[0].branch === 'feat/evo', 'mergeMilestones: branch slug extracted');

  // spine union: same date|slug from feature-doc beats merge
  const spine = buildSpine([
    [{ date: '2026-06-03', title: 'playbook', slug: 'playbook', source: 'merge', branch: 'feat/playbook', featureDir: null }],
    [{ date: '2026-06-03', title: 'playbook', slug: 'playbook', source: 'feature-doc', branch: null, featureDir: '2026-06-03_playbook' }],
    [{ date: '2026-06-01', title: 'earlier', slug: 'earlier', source: 'merge', branch: null, featureDir: null }],
  ]);
  A(spine.length === 2, 'buildSpine: dedupes by date|slug');
  A(spine[0].date === '2026-06-01', 'buildSpine: sorted by date asc');
  const pb = spine.find(m => m.slug === 'playbook');
  A(pb.source === 'feature-doc' && pb.branch === 'feat/playbook', 'buildSpine: richer source wins, branch merged in');

  // mapping: branch match dominates
  const day = 86400000;
  const base = dateMs('2026-06-03');
  const metas = [
    { file: 'a.jsonl', session_id: 'a', gitBranch: 'feat/playbook', firstPrompt: 'build the playbook skill', skills: new Set(['/spec']), decisionSignals: 2, mtime: base + day, topic: tokens('playbook skill') },
    { file: 'b.jsonl', session_id: 'b', gitBranch: 'HEAD', firstPrompt: 'totally unrelated future thing', skills: new Set(['/exit']), decisionSignals: 0, mtime: dateMs('2027-01-01'), topic: tokens('unrelated future thing') },
  ];
  const mapped = mapSessionsToSpine(spine, metas);
  const pm = mapped.milestones.find(m => m.slug === 'playbook');
  A(pm.session_ids === undefined && pm.sessions.length === 1 && pm.sessions[0].session_id === 'a', 'map: branch-matched session lands on milestone');
  A(pm.opening_prompt === 'build the playbook skill', 'map: opening prompt captured verbatim');
  A(mapped.unmapped.length === 1 && mapped.unmapped[0].session_id === 'b', 'map: post-spine unshipped session is unmapped');
  A([...pm.skills].includes('/spec') && ![...pm.skills].includes('/exit'), 'map: only non-trivial skills aggregated');

  // skill scoping helpers
  const noSkillMeta = { gitBranch: 'feat/other', skills: new Set(['/spec']), topic: tokens('something else') };
  const yesSkillMeta = { gitBranch: 'HEAD', skills: new Set(['/pmos-learnkit:playbook']), topic: tokens('whatever') };
  A(metaUsesSkill(noSkillMeta, '/playbook') === false && metaUsesSkill(yesSkillMeta, 'playbook') === true, 'metaUsesSkill: matches command tag, not unrelated');
  A(milestoneAboutSkill(pb, 'playbook') === true && milestoneAboutSkill(pb, 'frameworks') === false, 'milestoneAboutSkill: name match');

  // no scoring fields leak into the contract
  const out = scoutRepo({ repo: '/nonexistent-repo', roots: [], mergeBranches: new Set(), spineInputs: { featureDirs: ['2026-06-03_playbook'] } });
  A(out.scope === 'repo' && Array.isArray(out.milestones), 'scoutRepo: emits milestones array');
  A(!('score' in (out.milestones[0] || {})) && !('boundary_confidence' in (out.milestones[0] || {})) && !('merge_suggestion' in (out.milestones[0] || {})), 'scoutRepo: no scoring/boundary/merge fields');

  if (process.exitCode) { console.error('SELFTEST FAILED'); } else { console.log('ALL SCOUT SELFTESTS PASSED'); }
}

// CLI
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) { selftest(); }
  else {
    const repo = args.find(a => !a.startsWith('--')) || process.cwd();
    const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
    const out = scoutRepo({
      repo,
      skill: flag('--skill'),
      includeHeadless: args.includes('--include-headless'),
    });
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  }
}
