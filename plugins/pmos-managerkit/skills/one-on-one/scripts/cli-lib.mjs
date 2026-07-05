#!/usr/bin/env node
// cli-lib.mjs — tiny shared arg parsing for the /one-on-one verb scripts. Zero deps.
// Supports repeatable flags (--goal a --goal b → {goal: ['a','b']}), single-value flags, and bare
// boolean flags. Values may be quoted by the shell; we don't re-parse quotes here.

// parseArgs(argv, {multi: Set-of-flag-names}) → { _: [positional], flag: value|[values], bool: true }
export function parseArgs(argv, opts = {}) {
  const multi = opts.multi || new Set();
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out[key] = true; // bare boolean
      } else {
        i++;
        if (multi.has(key)) (out[key] ||= []).push(next);
        else out[key] = next;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

// asArray(v) → always an array (undefined→[], scalar→[scalar]).
export function asArray(v) { return v === undefined ? [] : Array.isArray(v) ? v : [v]; }

// today(flags) — deterministic date: --today wins (tests), else real local date as YYYY-MM-DD.
export function today(flags = {}) {
  if (flags.today) return String(flags.today);
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function die(msg, code = 1) { console.error(msg); process.exit(code); }
