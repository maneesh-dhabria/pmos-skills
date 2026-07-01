'use strict';
// format.js — pure, dependency-free date helpers for the /mytasks web client.
// Loaded as a plain <script> before app.js (exposes globals) AND require()-able
// in Node for the unit assertions in tests/run.mjs (UMD guard at the bottom).
// Single home for the one friendly date representation (design D2/FR-3) and the
// overdue-vs-upcoming colour selection (design D6/FR-8). Zero new deps (INV-3).

const _WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const _MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function _startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function _parseISO(dateISO) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateISO || ''));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
function _diffDays(a, b) { return Math.round((_startOfDay(a) - _startOfDay(b)) / 86400000); }

// One friendly date string everywhere (D2): relative for near dates, weekday
// alone for the rest of the current week, absolute beyond (year only off-year).
function formatDueDate(dateISO, now) {
  const date = _parseISO(dateISO);
  if (!date) return '';
  const ref = now ? new Date(now) : new Date();
  const diff = _diffDays(date, ref);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  // Weekday alone for a future day still inside this Mon–Sun week.
  if (diff > 1 && diff <= 6) {
    const dowMon = (_startOfDay(ref).getDay() + 6) % 7; // 0 = Monday
    const weekEnd = _startOfDay(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + (6 - dowMon)));
    if (_startOfDay(date) <= weekEnd) return _WD[date.getDay()];
  }
  let s = _WD[date.getDay()] + ' ' + _MO[date.getMonth()] + ' ' + date.getDate();
  if (date.getFullYear() !== _startOfDay(ref).getFullYear()) s += ' ' + date.getFullYear();
  return s;
}

// Colour-semantics selector (D6/FR-8): red reserved for genuinely-overdue dates
// (strictly in the past); today and the future are 'upcoming' (neutral + icon).
function dueStatus(dateISO, now) {
  const date = _parseISO(dateISO);
  if (!date) return 'none';
  const ref = now ? new Date(now) : new Date();
  return _diffDays(date, ref) < 0 ? 'overdue' : 'upcoming';
}

if (typeof module !== 'undefined' && module.exports) module.exports = { formatDueDate, dueStatus };
