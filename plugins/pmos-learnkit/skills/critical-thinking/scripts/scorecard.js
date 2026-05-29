#!/usr/bin/env node
// scorecard.js — persistent practice scorecard for /critical-thinking.
// Node stdlib only (no dependencies). Used by the skill to track per-muscle
// progress, calibration (Brier), and streak across sessions.
//
// CLI:
//   node scorecard.js read                 # print current scorecard (seeds if absent)
//   node scorecard.js update <session.json># merge a session delta, print summary
//   node scorecard.js summary              # print weakest-muscle + brier + streak
//
// Storage: $SCORECARD_PATH if set, else ~/.pmos/learnkit/critical-thinking/scorecard.json
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

function defaultPath() {
  return process.env.SCORECARD_PATH ||
    path.join(os.homedir(), '.pmos', 'learnkit', 'critical-thinking', 'scorecard.json');
}

function seed() {
  return {
    version: 1,
    sessions: [],
    muscle_scores: {},          // muscle -> { seen, strong }
    calibration: { predictions: [], brier: null },
    streak: { last_session_date: null, count: 0 },
  };
}

// Brier score = mean((p - outcome)^2). Returns null for no predictions.
function brier(predictions) {
  if (!predictions || predictions.length === 0) return null;
  const sum = predictions.reduce((acc, x) => acc + Math.pow(x.p - x.outcome, 2), 0);
  return sum / predictions.length;
}

function load(file) {
  const f = file || defaultPath();
  try {
    const raw = fs.readFileSync(f, 'utf8');
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || data.version !== 1) throw new Error('bad shape');
    // backfill any missing top-level keys defensively
    return Object.assign(seed(), data);
  } catch (e) {
    if (e.code !== 'ENOENT') {
      process.stderr.write('scorecard: unreadable/corrupt at ' + f + ' — reseeding\n');
    }
    return seed();
  }
}

function save(file, data) {
  const f = file || defaultPath();
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, f); // atomic
  return f;
}

function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

function applySession(data, session) {
  const d = JSON.parse(JSON.stringify(data)); // immutable in
  d.sessions.push({
    date: session.date, band: session.band,
    shapes: session.shapes || [],
    muscles_practiced: session.muscles || {},
  });
  // merge muscle scores
  for (const [m, v] of Object.entries(session.muscles || {})) {
    if (!d.muscle_scores[m]) d.muscle_scores[m] = { seen: 0, strong: 0 };
    d.muscle_scores[m].seen += (v.seen || 0);
    d.muscle_scores[m].strong += (v.strong || 0);
  }
  // calibration
  if (session.predictions && session.predictions.length) {
    d.calibration.predictions.push(...session.predictions);
  }
  d.calibration.brier = brier(d.calibration.predictions);
  // streak
  const last = d.streak.last_session_date;
  if (!last) {
    d.streak.count = 1;
  } else {
    const diff = daysBetween(last, session.date);
    if (diff === 0) { /* same day: unchanged */ }
    else if (diff === 1) { d.streak.count += 1; }
    else { d.streak.count = 1; }
  }
  d.streak.last_session_date = session.date;
  return d;
}

function summary(data) {
  let weakest = null, weakestRatio = Infinity;
  for (const [m, v] of Object.entries(data.muscle_scores || {})) {
    const ratio = v.seen > 0 ? v.strong / v.seen : 0;
    if (ratio < weakestRatio) { weakestRatio = ratio; weakest = m; }
  }
  return {
    weakest_muscle: weakest,
    brier: data.calibration ? data.calibration.brier : null,
    streak: data.streak ? data.streak.count : 0,
    sessions: (data.sessions || []).length,
  };
}

module.exports = { seed, brier, load, save, applySession, summary, defaultPath };

// --- CLI ---
if (require.main === module) {
  const [cmd, arg] = process.argv.slice(2);
  try {
    if (cmd === 'read') {
      process.stdout.write(JSON.stringify(load(), null, 2) + '\n');
    } else if (cmd === 'update') {
      if (!arg) { process.stderr.write('usage: scorecard.js update <session.json>\n'); process.exit(64); }
      const session = JSON.parse(fs.readFileSync(arg, 'utf8'));
      const updated = applySession(load(), session);
      save(null, updated);
      process.stdout.write(JSON.stringify(summary(updated), null, 2) + '\n');
    } else if (cmd === 'summary') {
      process.stdout.write(JSON.stringify(summary(load()), null, 2) + '\n');
    } else {
      process.stderr.write('usage: scorecard.js read|update <f>|summary\n');
      process.exit(64);
    }
  } catch (e) {
    process.stderr.write('scorecard: ' + e.message + '\n');
    process.exit(1);
  }
}
