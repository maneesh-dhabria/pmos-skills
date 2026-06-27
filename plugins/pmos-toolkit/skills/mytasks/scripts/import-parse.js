#!/usr/bin/env node
// import-parse.js — structure-first outline parser for `/mytasks import` (story 260626-j9v).
//
// The deterministic half of the agent-driven import flow (design §7, D3): turn a
// pasted text outline into a flat list of task nodes with parent (subtask) +
// project (container) relationships resolved purely from STRUCTURE — indentation
// depth, bullet/checkbox markers, and the #project/+label/@handle/date tokens
// (the same grammar lib.parseQuickAdd strips for quick-capture, §K — cited, not
// reimplemented). Structure always wins on conflict; only the residual the agent
// cannot place from structure is AI-inferred (that inference lives in SKILL.md
// #import, never here). No I/O, no minting, no people resolution — pure and
// deterministic so tests assert the parsed tree directly.

'use strict';

const lib = require('./lib.js');

// A line is a project-container HEADER when, after marker strip, its whole
// content is a single #slug (e.g. `#home-reno`) or a `Project: Name` form —
// i.e. it names a container rather than a task. Returns the slug or null.
function projectHeaderSlug(content) {
  const m1 = content.match(/^#([A-Za-z0-9][A-Za-z0-9._-]*)$/);
  if (m1) return m1[1];
  const m2 = content.match(/^Project:\s*(.+)$/i);
  if (m2) return lib.slugify(m2[1]);
  return null;
}

// Strip a leading bullet/checkbox marker (`-`, `*`, `- [ ]`, `- [x]`). The `+`
// bullet is deliberately NOT a marker — it would collide with the +label token.
// Returns the content after the marker (unchanged when no marker present).
function stripMarker(content) {
  return content
    .replace(/^[-*]\s+\[[ xX]\]\s+/, '') // checkbox first (more specific)
    .replace(/^[-*]\s+/, '');
}

// Indentation depth = count of leading whitespace columns (a tab counts as 2).
// Only the relative ordering matters (the stack compares depths), so the exact
// unit is irrelevant — mixed tabs/spaces still nest monotonically.
function indentDepth(rawLine) {
  let d = 0;
  for (const ch of rawLine) {
    if (ch === ' ') d += 1;
    else if (ch === '\t') d += 2;
    else break;
  }
  return d;
}

// parseOutline(text, todayIso) → { nodes, projects, labels }
//   nodes:    [{ title, type, due, project, people:[], labels:[], depth, parentIndex }]
//             parentIndex is an index into `nodes` (the subtask's parent) or null.
//   projects: distinct project slugs encountered (container headers + #tokens).
//   labels:   distinct labels encountered across all task lines.
// Blank lines are skipped. A project header sets the container for every deeper
// line until the indentation dedents back to/above the header (classic stack).
function parseOutline(text, todayIso) {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const nodes = [];
  const projects = [];
  const labels = [];
  // stack frames: { depth, kind: 'project'|'task', slug?, index? }
  const stack = [];

  const addProject = (slug) => { if (slug && !projects.includes(slug)) projects.push(slug); };
  const addLabel = (l) => { if (l && !labels.includes(l)) labels.push(l); };

  for (const raw of lines) {
    if (!raw.trim()) continue;
    const depth = indentDepth(raw);
    const content = stripMarker(raw.trim());

    // Pop frames that are siblings/ancestors-being-closed (depth >= this line).
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();

    const headerSlug = projectHeaderSlug(content);
    if (headerSlug) {
      addProject(headerSlug);
      stack.push({ depth, kind: 'project', slug: headerSlug });
      continue;
    }

    // Nearest enclosing project container + nearest enclosing task (subtask parent).
    let containerProject = '';
    let parentIndex = null;
    for (let i = stack.length - 1; i >= 0; i--) {
      if (parentIndex === null && stack[i].kind === 'task') parentIndex = stack[i].index;
      if (!containerProject && stack[i].kind === 'project') containerProject = stack[i].slug;
    }

    const parsed = lib.parseQuickAdd(content, todayIso);
    // Structure wins: the container project overrides a same-line #project token.
    const project = containerProject || parsed.project;
    addProject(project);
    parsed.labels.forEach(addLabel);

    const node = {
      title: parsed.title,
      type: parsed.type,
      due: parsed.due,
      project,
      people: parsed.people,
      labels: parsed.labels,
      depth,
      parentIndex,
    };
    nodes.push(node);
    stack.push({ depth, kind: 'task', index: nodes.length - 1 });
  }

  return { nodes, projects, labels };
}

module.exports = { parseOutline, projectHeaderSlug, stripMarker, indentDepth };
