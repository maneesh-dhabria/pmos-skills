#!/usr/bin/env node
// registry.js — projects/labels registry for the /mytasks web sidebar (story 260626-71x).
//
// ~/.pmos/tasks/registry.json records user-declared EMPTY containers so a freshly
// created project/label appears in the sidebar before any task uses it (design D5).
// The registry only ever ADDS visibility — /api/meta returns registry ∪ derived, and
// the terminal stays registry-agnostic (it derives projects/labels from task files).
// Zero-dep, stateless: every read re-reads the file; every write is atomic.

'use strict';

const fs = require('fs');
const path = require('path');
const lib = require('./lib.js');

function registryPath(tasksDir) { return path.join(path.resolve(tasksDir), 'registry.json'); }

// Read the registry, tolerating an absent / malformed file (→ empty, never throws).
function readRegistry(tasksDir) {
  let raw;
  try { raw = fs.readFileSync(registryPath(tasksDir), 'utf8'); } catch (_) { return { projects: [], labels: [] }; }
  let obj;
  try { obj = JSON.parse(raw); } catch (_) { return { projects: [], labels: [] }; }
  return {
    projects: Array.isArray(obj.projects) ? obj.projects.slice() : [],
    labels: Array.isArray(obj.labels) ? obj.labels.slice() : [],
  };
}

// Add a slug-normalized, deduped entry to `kind` ('projects'|'labels'); atomic-write;
// return the updated list for that kind. An already-present slug is a no-op.
function addRegistryEntry(tasksDir, kind, name) {
  if (kind !== 'projects' && kind !== 'labels') throw new Error(`unknown registry kind '${kind}'`);
  const slug = lib.slugify(name);
  const reg = readRegistry(tasksDir);
  if (slug && !reg[kind].includes(slug)) {
    reg[kind].push(slug);
    reg[kind].sort();
    fs.mkdirSync(path.resolve(tasksDir), { recursive: true });
    lib.writeItemAtomic(registryPath(tasksDir), JSON.stringify({ projects: reg.projects, labels: reg.labels }, null, 2) + '\n');
  }
  return reg[kind];
}

module.exports = { registryPath, readRegistry, addRegistryEntry };
