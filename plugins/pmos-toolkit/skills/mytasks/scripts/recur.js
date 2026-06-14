#!/usr/bin/env node
// recur.js — recurrence-on-complete spawn (story 260613-yfr).
//
// Faithful executable implementation of the §K canonical routine documented in
// mytasks/SKILL.md Phase 9 "#recur-spawn". The CLI `done` flow and the web
// `POST /api/tasks/:id/complete` endpoint (serve.js) BOTH go through this single
// home — recurrence is never reimplemented (design D8, story-044 contract).
//
// Pure given its inputs (the mintId function is injected so tests stay
// deterministic and the production path can shell to mint-id.mjs).

'use strict';

const lib = require('./lib.js');

// Spawn the next instance of a just-completed recurring task.
//   completed: { fm, body }  — the item ALREADY marked completed, recur non-empty
//   opts.mintId(): string    — returns a fresh <YYMMDD>-<rand3> id
//   opts.today: ISO          — completion date (for created/updated + the log line)
// Returns { new_id, new_due, newFm, newBody, slug, logLine } — or null if the
// item does not actually recur (caller should treat as a plain completion).
function spawnRecurrence(completed, opts) {
  const fm = completed.fm || {};
  const rule = String(fm.recur || '').trim();
  if (!rule) return null; // not recurring → no spawn

  const today = opts.today || lib.isoToday();
  const new_id = opts.mintId();

  // Step 2 — copy forward (NOT order; a fresh instance has no manual position).
  const newFm = {
    schema_version: 2,
    id: new_id,
    title: fm.title || '',
    type: fm.type || 'execution',
    importance: fm.importance || 'neutral',
    status: 'pending',          // step 4 — reset lifecycle
    project: fm.project || '',
    parent: fm.parent || '',
    order: '',                  // NOT copied
    recur: rule,
    people: Array.isArray(fm.people) ? fm.people.slice() : [],
    labels: Array.isArray(fm.labels) ? fm.labels.slice() : [],
    links: Array.isArray(fm.links) ? fm.links.slice() : [],
    due: '',
    start: '',
    checkin: fm.checkin || '',
    next_checkin: '',
    created: today,
    updated: today,
    completed: '',
  };

  // Step 3 — advance due/start anchored on the COMPLETED item's own dates (not
  // today), so a late completion does not drift the cadence.
  let new_due = '';
  if (fm.due) { newFm.due = lib.advanceByRecur(fm.due, rule); new_due = newFm.due; }
  if (fm.start) { newFm.start = lib.advanceByRecur(fm.start, rule); }

  // next_checkin per the carried checkin cadence (today + cadence), else blank.
  if (newFm.checkin && newFm.checkin !== 'none') {
    newFm.next_checkin = advanceCheckin(today, newFm.checkin);
  }

  const slug = lib.slugify(newFm.title);
  const newBody = ''; // a fresh instance starts with no body

  // Step 6 — log on the OLD item's ## Notes (caller persists the mutated old body).
  const logLine = `- ${today}: completed; recurring — spawned next instance #${new_id} (due ${new_due || '—'}).`;

  return { new_id, new_due, newFm, newBody, slug, logLine };
}

// Check-in cadence math (mirrors SKILL.md #checkin; monthly uses the last-day clamp).
function advanceCheckin(iso, cadence) {
  switch (cadence) {
    case 'daily': return lib.addDays(iso, 1);
    case 'weekly': return lib.addDays(iso, 7);
    case 'biweekly': return lib.addDays(iso, 14);
    case 'monthly': return lib.addMonthsClamp(iso, 1);
    default: return '';
  }
}

module.exports = { spawnRecurrence, advanceCheckin };
