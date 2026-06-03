#!/usr/bin/env node
// scout.mjs — deterministic scout for /playbook (FR-30..FR-35).
// Reads ONLY cheap fields from attributed interactive sessions, clusters into problem
// threads (branch-then-topic), scores, applies the instructiveness floor, emits a compact
// candidate JSON to stdout. The LLM never reads raw logs at scout time.
// Zero-dependency Node ESM (Node >=18).

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveRepoSessions, readSession } from './resolve_repo_sessions.mjs';

const TRIVIAL_SKILLS = new Set(['/exit', '/compact', '/clear', '/reload-plugins', '/reload-skills', '/login', '/doctor', '/mcp', '/plugin', '/remote-control', '/remote-env', '/effort']);
const STOPWORDS = new Set(['the','a','an','to','of','for','and','or','in','on','with','this','that','is','it','my','i','how','can','you','we','be','as','at','from','do','using','use','build','make','add']);
const TOPIC_THRESHOLD = 0.18;   // below => new thread / low-confidence boundary
const MERGE_THRESHOLD = 0.30;   // above => suggest merging adjacent HEAD thread into a branch thread
const MAX_GAP_MS = 2 * 86400000; // 2 days

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
export function slugify(s, max = 4) {
  const words = String(s || 'playbook').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(w => w && !STOPWORDS.has(w)).slice(0, max);
  return (words.join('-') || 'playbook').slice(0, 60);
}

// Match only real command invocations: <command-name>/slash-token</command-name>.
// Requires a leading slash + a command-token charset + the closing tag, so prose that merely
// mentions "command-name>" (e.g. docs about the tag) is not captured as a fake skill.
const COMMAND_RE = /<command-name>\s*(\/[A-Za-z0-9:_-]+)\s*<\/command-name>/g;
const PUSHBACK_RE = /\b(instead|prefer|rather|actually|let's|don't|do not|push ?back|no,|i'd rather|not that)\b/i;
const COMPACTION_RE = /(continued from a previous|this session is being continued|caveat:)/i;

/** Extract cheap meta from one session file (FR-30, FR-42, FR-43). */
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
  return { file, aiTitle, gitBranch, firstPrompt, skills, decisionSignals, mtime,
           topic: tokens(`${aiTitle || ''} ${firstPrompt || ''}`) };
}

function nonTrivialSkills(skillSet) {
  return [...skillSet].filter(s => !TRIVIAL_SKILLS.has(s));
}

/** Cluster sessions into threads: branch-then-topic (FR-31). Deterministic. */
export function clusterThreads(metas) {
  const sorted = [...metas].sort((a, b) => (a.mtime - b.mtime) || a.file.localeCompare(b.file));
  const branchThreads = new Map(); // branch -> sessions[]
  const headSessions = [];
  for (const m of sorted) {
    if (m.gitBranch && m.gitBranch !== 'HEAD') {
      if (!branchThreads.has(m.gitBranch)) branchThreads.set(m.gitBranch, []);
      branchThreads.get(m.gitBranch).push(m);
    } else headSessions.push(m);
  }
  const threads = [];
  for (const [branch, sessions] of branchThreads) threads.push(makeThread(branch, sessions, 1));
  // HEAD sessions -> topic+temporal clustering
  let cur = null, curTopic = null, curConf = 1;
  for (const m of headSessions) {
    if (cur == null) { cur = [m]; curTopic = new Set(m.topic); continue; }
    const sim = jaccard(curTopic, m.topic);
    const gap = m.mtime - cur[cur.length - 1].mtime;
    if (sim < TOPIC_THRESHOLD || gap > MAX_GAP_MS) {
      threads.push(makeThread('HEAD', cur, curConf));
      cur = [m]; curTopic = new Set(m.topic); curConf = 1;
    } else {
      cur.push(m);
      curConf = Math.min(curConf, sim < TOPIC_THRESHOLD * 1.5 ? 0.5 : 1); // low-confidence boundary flag
      // widen running topic
      for (const t of m.topic) curTopic.add(t);
    }
  }
  if (cur) threads.push(makeThread('HEAD', cur, curConf));
  return threads;
}

function makeThread(branch, sessions, confidence) {
  const skills = new Set();
  let decisionSignals = 0;
  for (const s of sessions) { for (const k of s.skills) skills.add(k); decisionSignals += s.decisionSignals; }
  const titleSrc = sessions.find(s => s.aiTitle)?.aiTitle || sessions[0]?.firstPrompt || branch;
  const mtimes = sessions.map(s => s.mtime).filter(Boolean);
  const span_days = mtimes.length ? Math.round((Math.max(...mtimes) - Math.min(...mtimes)) / 86400000) : 0;
  const nts = nonTrivialSkills(skills);
  const score = decisionSignals * 2 + nts.length + span_days * 0.1 + (decisionSignals >= 2 ? 1 : 0);
  return {
    slug: slugify(titleSrc),
    title: titleSrc,
    branch,
    boundary_confidence: confidence,
    sessions,
    session_ids: sessions.map(s => path.basename(s.file).replace(/\.jsonl$/, '')),
    skills: nts,
    decision_signals: decisionSignals,
    span_days,
    score: Math.round(score * 100) / 100,
    topic: sessions.reduce((acc, s) => { for (const t of s.topic) acc.add(t); return acc; }, new Set()),
  };
}

/** Instructiveness floor (FR-32): >=1 decision signal AND >=1 non-trivial skill. */
export function passesFloor(thread) {
  return thread.decision_signals >= 1 && thread.skills.length >= 1;
}

function whyTeachable(t) {
  const bits = [];
  if (t.decision_signals) bits.push(`${t.decision_signals} decision${t.decision_signals > 1 ? 's' : ''}`);
  if (t.skills.length) bits.push(`${t.skills.length} skill${t.skills.length > 1 ? 's' : ''} (${t.skills.slice(0, 3).join(', ')})`);
  if (t.span_days) bits.push(`spanned ${t.span_days}d`);
  return bits.join(' · ') || 'notable thread';
}

/** Detect merge suggestions: a branch thread + a temporally-adjacent same-topic HEAD thread (FR-34). */
export function withMergeSuggestions(threads) {
  const branchT = threads.filter(t => t.branch !== 'HEAD');
  const headT = threads.filter(t => t.branch === 'HEAD');
  for (const b of branchT) {
    let best = null, bestSim = 0;
    for (const h of headT) {
      const sim = jaccard(b.topic, h.topic);
      if (sim > bestSim) { bestSim = sim; best = h; }
    }
    b.merge_suggestion = (best && bestSim >= MERGE_THRESHOLD)
      ? { with_slug: best.slug, confidence: Math.round(bestSim * 100) / 100 } : null;
  }
  for (const h of headT) h.merge_suggestion = null;
  return threads;
}

/** Full scout: resolve -> cluster -> floor -> score -> rank. Returns the candidate JSON contract. */
export function scoutRepo(opts) {
  const res = resolveRepoSessions({ ...opts });
  const metas = res.attributed.filter(r => r.interactive || opts.includeHeadless).map(r => extractSessionMeta(r.file));
  let threads = clusterThreads(metas);
  threads = withMergeSuggestions(threads);
  const qualifying = threads.filter(passesFloor)
    .sort((a, b) => (b.score - a.score) || a.slug.localeCompare(b.slug));
  const suppressed = threads.length - qualifying.length;
  const candidates = qualifying.slice(0, 5).map(t => ({
    slug: t.slug, title: t.title, why_teachable: whyTeachable(t), score: t.score,
    session_ids: t.session_ids, branch: t.branch, skills: t.skills,
    decision_signals: t.decision_signals, span_days: t.span_days,
    boundary_confidence: t.boundary_confidence,
    merge_suggestion: t.merge_suggestion || null,
  }));
  return {
    coverage: { ...res.coverage, candidates: qualifying.length, suppressed_thin: suppressed },
    ambiguous: res.ambiguous.map(a => ({ dir: a.dir, reason: a.reason, gitBranch: a.gitBranch })),
    candidates,
  };
}

// CLI
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const repo = args.find(a => !a.startsWith('--')) || process.cwd();
  const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const out = scoutRepo({
    repo,
    windowDays: flag('--days') ? Number(flag('--days')) : undefined,
    since: flag('--since') ? Date.parse(flag('--since')) : undefined,
    sessionsLimit: flag('--sessions') ? Number(flag('--sessions')) : undefined,
    includeHeadless: args.includes('--include-headless'),
  });
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}
