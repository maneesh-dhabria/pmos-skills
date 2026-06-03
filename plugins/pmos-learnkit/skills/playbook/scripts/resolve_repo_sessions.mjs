#!/usr/bin/env node
// resolve_repo_sessions.mjs — multi-signal repo -> session-dir resolver for /playbook.
// Zero-dependency Node ESM (Node >=18). Exported for unit tests; runnable standalone.
//
// Attribution signals (FR-11): a session is attributed to <repo> when ANY fires:
//   (a) nested-prefix     — cwd === repo OR cwd startsWith repo + "/"  (incl. /.claude/worktrees/)
//   (b) sibling-token-strip — cwd is a sibling dir "<repo>-<...>" (name-based; survives deletion)
//   (c) branch-in-merge-history — gitBranch (non-HEAD) ∈ the repo's merged-branch set
// Ambiguity (FR-22): branch-only match, OR a sibling-only match that cannot be corroborated,
// is flagged `ambiguous` and NOT attributed silently.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

export const DEFAULT_ROOTS = [
  path.join(os.homedir(), '.claude', 'projects'),
  path.join(os.homedir(), '.claude-personal', 'projects'),
];

/** Resolve a path to canonical form; fall back to path.resolve when it no longer exists on disk. */
export function canon(p) {
  try { return fs.realpathSync(p); } catch { return path.resolve(p); }
}

/** Read a .jsonl session file into an array of parsed records (skips unparseable lines). */
export function readSession(file) {
  const out = [];
  let text;
  try { text = fs.readFileSync(file, 'utf-8'); } catch { return out; }
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try { out.push(JSON.parse(t)); } catch { /* tolerate drift */ }
  }
  return out;
}

function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(b => (b && typeof b === 'object' && typeof b.text === 'string') ? b.text : '').join(' ');
  }
  return '';
}

/** Classify one session file: cwd, gitBranch, interactive flag, command-name presence, line count. */
export function classifySession(file) {
  const recs = readSession(file);
  let cwd = null, gitBranch = null, interactive = false, hasCommandName = false;
  for (const r of recs) {
    if (cwd == null && typeof r.cwd === 'string') cwd = r.cwd;
    if (gitBranch == null && typeof r.gitBranch === 'string') gitBranch = r.gitBranch;
    if (r.type === 'permission-mode' || r.type === 'mode') interactive = true;
    if (!hasCommandName && r.message) {
      if (textOf(r.message.content).includes('command-name>')) hasCommandName = true;
    }
  }
  return { file, cwd, gitBranch, interactive, hasCommandName, lineCount: recs.length };
}

/**
 * Compute attribution signals for a session's cwd/gitBranch against a repo.
 * Returns { signals: string[], attributed: bool, ambiguous: bool, reason: string|null }.
 */
export function attribute(repoCanon, cwd, gitBranch, mergeBranches) {
  const signals = [];
  if (cwd) {
    const c = canon(cwd);
    // (a) nested-prefix
    if (c === repoCanon || c.startsWith(repoCanon + path.sep)) signals.push('nested');
    // (b) sibling-token-strip: same parent, name starts with "<repoBase>-"
    const repoParent = path.dirname(repoCanon);
    const repoBase = path.basename(repoCanon);
    if (!signals.includes('nested') &&
        path.dirname(c) === repoParent &&
        path.basename(c).startsWith(repoBase + '-')) {
      signals.push('sibling');
    }
  }
  // (c) branch-in-merge-history (non-HEAD only)
  const branchMerged = gitBranch && gitBranch !== 'HEAD' &&
    mergeBranches instanceof Set && mergeBranches.has(gitBranch);
  if (branchMerged) signals.push('branch');

  const attributed = signals.length > 0;
  // Ambiguity vs low-confidence (FR-22):
  //  - branch-ONLY (cwd unrelated, only a possibly-shared branch name matched) is the genuine
  //    cross-repo collision risk -> AMBIGUOUS, excluded, surfaced for confirm.
  //  - sibling-ONLY (a "<repo>-<slug>" dir under the same parent, branch not corroborated) is a
  //    strong structural signal -> ATTRIBUTED but low_confidence (included; flagged for optional review).
  //    Dropping these would recreate the worktree-undercount the resolver exists to prevent.
  let ambiguous = false, lowConfidence = false, reason = null;
  if (attributed && !signals.includes('nested')) {
    if (signals.length === 1 && signals[0] === 'branch') { ambiguous = true; reason = 'branch-only'; }
    else if (signals.length === 1 && signals[0] === 'sibling') { lowConfidence = true; reason = 'sibling-only'; }
  }
  return { signals, attributed, ambiguous, lowConfidence, reason };
}

/** Compute the merged-branch set for a repo via git (best-effort; empty Set on failure). */
export function gitMergeBranches(repo) {
  const set = new Set();
  try {
    const log = execFileSync('git', ['-C', repo, 'log', '--merges', '--pretty=%s'], { encoding: 'utf-8' });
    for (const line of log.split('\n')) {
      const m = line.match(/Merge\s+(?:branch\s+'?|pull request.*?from\s+\S+\/|)?([A-Za-z0-9._\/-]+)'?/);
      if (m && m[1]) set.add(m[1].replace(/^['"]|['"]$/g, ''));
    }
  } catch { /* not a repo / no merges */ }
  try {
    const rl = execFileSync('git', ['-C', repo, 'reflog', '--pretty=%gs'], { encoding: 'utf-8' });
    for (const line of rl.split('\n')) {
      const m = line.match(/(?:checkout|merge):.*?\b([A-Za-z0-9._\/-]+)$/);
      if (m && m[1] && m[1].includes('/')) set.add(m[1]);
    }
  } catch { /* ignore */ }
  return set;
}

function inWindow(file, { now, windowDays, since }) {
  if (since == null && windowDays == null) return true;
  let mtime;
  try { mtime = fs.statSync(file).mtimeMs; } catch { return true; }
  if (since != null) return mtime >= since;
  return mtime >= (now - windowDays * 86400000);
}

/**
 * Main resolver.
 * opts: { repo, roots?, includeHeadless?, mergeBranches?(Set), now?, windowDays?(default 30), since?, sessionsLimit? }
 * Returns { coverage, attributed:[{file,dir,cwd,gitBranch,signals,interactive}], ambiguous:[...] }.
 */
export function resolveRepoSessions(opts) {
  const repo = canon(opts.repo);
  const roots = opts.roots || DEFAULT_ROOTS;
  const mergeBranches = opts.mergeBranches || gitMergeBranches(opts.repo);
  const now = opts.now ?? Date.now();
  const windowDays = opts.windowDays ?? (opts.since != null || opts.sessionsLimit != null ? null : 30);
  const since = opts.since ?? null;

  const dirs = new Set();
  for (const root of roots) {
    let entries = [];
    try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) if (e.isDirectory()) dirs.add(path.join(root, e.name));
  }

  const attributed = [];
  const ambiguous = [];
  const dirSet = new Set(), wtSet = new Set();
  let interactiveCount = 0, headlessDropped = 0;

  for (const dir of dirs) {
    let files = [];
    try { files = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')).map(f => path.join(dir, f)); } catch { continue; }
    for (const file of files) {
      if (!inWindow(file, { now, windowDays, since })) continue;
      const c = classifySession(file);
      const a = attribute(repo, c.cwd, c.gitBranch, mergeBranches);
      if (!a.attributed) continue;
      if (a.ambiguous) { ambiguous.push({ file, dir, cwd: c.cwd, gitBranch: c.gitBranch, reason: a.reason }); continue; }
      const rec = { file, dir, cwd: c.cwd, gitBranch: c.gitBranch, signals: a.signals,
                    low_confidence: a.lowConfidence, reason: a.reason,
                    interactive: c.interactive, hasCommandName: c.hasCommandName, lineCount: c.lineCount };
      // headless filter (FR-20/21/23)
      const headless = !c.interactive && !(opts.includeHeadless);
      if (headless) { headlessDropped++; continue; }
      if (c.interactive) interactiveCount++;
      attributed.push(rec);
      dirSet.add(dir);
      if (a.signals.includes('sibling') || a.signals.includes('branch') ||
          (c.cwd && canon(c.cwd).includes('/.claude/worktrees/'))) wtSet.add(dir);
    }
  }

  // sessionsLimit: keep newest N by mtime
  let result = attributed;
  if (opts.sessionsLimit != null) {
    result = attributed
      .map(r => ({ r, m: (() => { try { return fs.statSync(r.file).mtimeMs; } catch { return 0; } })() }))
      .sort((x, y) => y.m - x.m).slice(0, opts.sessionsLimit).map(x => x.r);
  }

  return {
    coverage: {
      session_dirs: dirSet.size,
      via_worktree: wtSet.size,
      interactive: result.filter(r => r.interactive).length,
      headless_dropped: headlessDropped,
      low_confidence: result.filter(r => r.low_confidence).length,
    },
    attributed: result,
    ambiguous,
  };
}

// CLI: node resolve_repo_sessions.mjs <repo> [--days N] [--since ISO] [--sessions N] [--include-headless]
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const repo = args.find(a => !a.startsWith('--')) || process.cwd();
  const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const out = resolveRepoSessions({
    repo,
    windowDays: flag('--days') ? Number(flag('--days')) : undefined,
    since: flag('--since') ? Date.parse(flag('--since')) : undefined,
    sessionsLimit: flag('--sessions') ? Number(flag('--sessions')) : undefined,
    includeHeadless: args.includes('--include-headless'),
  });
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}
