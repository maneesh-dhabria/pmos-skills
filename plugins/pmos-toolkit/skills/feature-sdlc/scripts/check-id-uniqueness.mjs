#!/usr/bin/env node
// check-id-uniqueness.mjs — the deterministic id-uniqueness gate for the
// `define` definition-merge (feature-sdlc/SKILL.md #define-mode step 5), beside
// the path-scope check. Converts silent duplicate-id corruption (two parallel
// `define` sessions minting the same id off the same baseline) into a LOUD
// refusal listing the offending ids.
//
// Id format/validator are owned by _shared/tracker-crudl.md §2 — this script
// only extracts the id PREFIX from `{id}-{slug}.md` filenames (deterministic,
// no content reads) and compares sets.
//
// Modes:
//   pre-merge <repo> --base <ref>   Refuse (exit 3) if any item id ADDED on the
//                                   current branch already exists on <ref> (main).
//   post-merge <items-dir>          Refuse (exit 3) if two item files in the dir
//                                   declare the same id. (git-free; test-friendly.)
//
// Exit: 0 = unique/clean; 3 = collision (offending ids on stderr); 2 = usage/error.

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';

// id is the leading <MMDD>-<rand3> or 4-digit prefix of the basename, then `-slug`.
const ID_PREFIX_RE = /^([0-9]{4}-[0-9a-hj-km-np-tv-z]{3}|[0-9]{4})-/;

export function idFromFilename(name) {
  const base = path.basename(name);
  const m = base.match(ID_PREFIX_RE);
  return m ? m[1] : null;
}

// names: string[] of item file paths/names → Map<id, string[] files>
export function idToFiles(names) {
  const map = new Map();
  for (const n of names) {
    const id = idFromFilename(n);
    if (!id) continue;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(path.basename(n));
  }
  return map;
}

// Returns [{id, files}] for ids appearing in more than one file.
export function findDuplicates(map) {
  const dups = [];
  for (const [id, files] of map) if (files.length > 1) dups.push({ id, files });
  return dups;
}

function git(repo, args) {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
}

function lsItems(repo, ref) {
  // basenames of backlog/items/*.md at <ref>
  const out = git(repo, ['ls-tree', '-r', '--name-only', ref, '--', 'backlog/items/']);
  return out.split('\n').filter((l) => /\/[^/]+\.md$/.test(l) || /\.md$/.test(l)).filter(Boolean);
}

function preMerge(repo, base) {
  // Files ADDED on this branch relative to base, under backlog/items/.
  const added = git(repo, ['diff', '--name-only', '--diff-filter=A', `${base}...HEAD`, '--', 'backlog/items/'])
    .split('\n').filter(Boolean);
  const baseIds = idToFiles(lsItems(repo, base));
  const collisions = [];
  for (const f of added) {
    const id = idFromFilename(f);
    if (id && baseIds.has(id)) {
      collisions.push({ id, branchFile: path.basename(f), mainFiles: baseIds.get(id) });
    }
  }
  if (collisions.length) {
    process.stderr.write(
      'id-uniqueness gate: REFUSING merge — these ids introduced on this branch already exist on ' +
      `${base}:\n` +
      collisions.map((c) => `  #${c.id}  (branch: ${c.branchFile}; main: ${c.mainFiles.join(', ')})`).join('\n') +
      '\nResolve by re-minting the branch ids (node plugins/pmos-toolkit/skills/backlog/scripts/mint-id.mjs)' +
      ' and updating parent:/dependencies: refs, then re-run the merge.\n'
    );
    return 3;
  }
  process.stdout.write(`id-uniqueness gate: clean — no added branch id collides with ${base}.\n`);
  return 0;
}

function postMerge(dir) {
  const names = readdirSync(dir).filter((n) => n.endsWith('.md'));
  const dups = findDuplicates(idToFiles(names));
  if (dups.length) {
    process.stderr.write(
      'id-uniqueness gate (post-merge): DUPLICATE ids in INDEX/items —\n' +
      dups.map((d) => `  #${d.id}  → ${d.files.join(', ')}`).join('\n') + '\n'
    );
    return 3;
  }
  process.stdout.write(`id-uniqueness gate (post-merge): clean — ${names.length} items, all ids unique.\n`);
  return 0;
}

function main(argv) {
  const a = argv.slice(2);
  const mode = a[0];
  if (mode === '--help' || mode === '-h' || !mode) {
    process.stdout.write(
      'Usage:\n' +
      '  check-id-uniqueness.mjs pre-merge <repo> --base <ref>\n' +
      '  check-id-uniqueness.mjs post-merge <items-dir>\n'
    );
    return mode ? 0 : 2;
  }
  try {
    if (mode === 'pre-merge') {
      const repo = a[1];
      const bi = a.indexOf('--base');
      const base = bi !== -1 ? a[bi + 1] : null;
      if (!repo || !base) { process.stderr.write('pre-merge needs <repo> --base <ref>\n'); return 2; }
      return preMerge(repo, base);
    }
    if (mode === 'post-merge') {
      const dir = a[1];
      if (!dir) { process.stderr.write('post-merge needs <items-dir>\n'); return 2; }
      return postMerge(dir);
    }
    process.stderr.write(`unknown mode '${mode}'\n`);
    return 2;
  } catch (e) {
    process.stderr.write(String(e.message || e) + '\n');
    return 2;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv));
}
