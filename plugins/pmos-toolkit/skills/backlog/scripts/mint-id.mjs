#!/usr/bin/env node
// mint-id.mjs — coordination-free backlog id minter + triple-form validator.
//
// The id FORMAT and VALIDATOR are owned by _shared/tracker-crudl.md §2 (the
// single home, §K). This script is the *minting* implementation cited by
// /backlog #add (and the define/build epic+story mints): it produces ids with
// NO max+1, NO counter, NO shared lock — safe for parallel worktrees and
// separate clones. Randomness comes from `crypto.randomBytes` — the harness
// bans the non-deterministic JS PRNG in resume-sensitive skill scripts; this
// CLI is a one-shot mint, but we source crypto regardless so the entropy call
// is never the banned one.
//
// Usage:
//   node mint-id.mjs                 # print one new id: <YYMMDD>-<rand3>
//   node mint-id.mjs --date 260612   # mint with an explicit YYMMDD / YY-MM-DD (testing)
//   node mint-id.mjs validate <id>   # exit 0 if <id> is a valid id (any of the 3 forms), 1 otherwise
//   node mint-id.mjs --help
//
// Dependencies: node >= 16 (crypto.randomBytes, ESM). No external packages.

import { randomBytes } from 'node:crypto';

// Crockford base32, lowercased, minus look-alikes i l o u → 32 symbols.
// 256 % 32 === 0, so `byte % 32` selects uniformly (no modulo bias).
const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';

// Triple-accepting validator — MUST stay byte-identical to tracker-crudl.md §2.1.
const ID_RE = /^([0-9]{4}|[0-9]{4}-[0-9a-hj-km-np-tv-z]{3}|[0-9]{6}-[0-9a-hj-km-np-tv-z]{3})$/;

export function isValidId(id) {
  return typeof id === 'string' && ID_RE.test(id);
}

export function rand3() {
  const b = randomBytes(3);
  let s = '';
  for (let i = 0; i < 3; i++) s += ALPHABET[b[i] % 32];
  return s;
}

// ymd: optional "YY-MM-DD" or "YYMMDD" override (testing); else today (local time).
export function mintId(ymd) {
  let YYMMDD;
  if (ymd) {
    const digits = String(ymd).replace(/-/g, '');
    if (!/^[0-9]{6}$/.test(digits)) throw new Error(`--date must be YY-MM-DD or YYMMDD, got '${ymd}'`);
    YYMMDD = digits;
  } else {
    const d = new Date();
    YYMMDD =
      String(d.getFullYear() % 100).padStart(2, '0') +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
  }
  return `${YYMMDD}-${rand3()}`;
}

function main(argv) {
  const args = argv.slice(2);
  if (args[0] === '--help' || args[0] === '-h') {
    process.stdout.write(
      'Usage: mint-id.mjs [--date YY-MM-DD] | validate <id>\n' +
      '  (no args)        print a new <YYMMDD>-<rand3> id\n' +
      '  --date YY-MM-DD  mint with an explicit year/month/day (testing)\n' +
      '  validate <id>    exit 0 if <id> is valid (legacy 4-digit OR <MMDD>-<rand3> OR <YYMMDD>-<rand3>), else 1\n'
    );
    return 0;
  }
  if (args[0] === 'validate') {
    const id = args[1];
    if (isValidId(id)) { process.stdout.write(`valid: ${id}\n`); return 0; }
    process.stderr.write(`invalid id: ${id === undefined ? '(none)' : id}\n`);
    return 1;
  }
  let ymd;
  const di = args.indexOf('--date');
  if (di !== -1) ymd = args[di + 1];
  try {
    process.stdout.write(mintId(ymd) + '\n');
    return 0;
  } catch (e) {
    process.stderr.write(String(e.message || e) + '\n');
    return 2;
  }
}

// Run as CLI only when invoked directly (not when imported by a test).
if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv));
}
