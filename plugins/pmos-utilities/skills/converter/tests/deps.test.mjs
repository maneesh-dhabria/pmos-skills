#!/usr/bin/env node
// deps.test.mjs — Inv-3: the skill ships ZERO npm runtime dependencies (T8).
// Asserts (1) no package.json declares runtime deps, and (2) every require() in the
// runtime code resolves to a Node built-in or a relative path — no bare third-party module.
//   node deps.test.mjs [--selftest]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { builtinModules } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.join(here, '..');

const EXPECTED_CHECKS = 3;
const selftest = process.argv.includes('--selftest');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) { passed += 1; process.stdout.write(`  ok   ${name}\n`); }
  else { failures.push(name); process.stdout.write(`  FAIL ${name}\n`); }
}

const builtins = new Set(builtinModules.concat(builtinModules.map((m) => `node:${m}`)));

// (1) no package.json runtime deps
const pkgPath = path.join(SKILL, 'package.json');
let depsClean = true;
if (fs.existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    depsClean = !pkg.dependencies || Object.keys(pkg.dependencies).length === 0;
  } catch (_e) { depsClean = false; }
}
check('no package.json runtime dependencies declared', depsClean);

// (2) every require() in lib/ + scripts/ resolves to a built-in or a relative path
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}
const runtimeFiles = [...walk(path.join(SKILL, 'lib')), ...walk(path.join(SKILL, 'scripts'))];
const bareImports = [];
const reqRe = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
for (const f of runtimeFiles) {
  const src = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = reqRe.exec(src))) {
    const spec = m[1];
    if (spec.startsWith('.') || spec.startsWith('/')) continue; // relative/absolute
    if (builtins.has(spec)) continue; // node built-in
    bareImports.push(`${path.relative(SKILL, f)}: require('${spec}')`);
  }
}
check('runtime require()s are all built-ins or relative paths' + (bareImports.length ? ` — found: ${bareImports.join(', ')}` : ''),
  bareImports.length === 0);

check('runtime code scanned (lib + scripts not empty)', runtimeFiles.length > 0);

process.stdout.write(`\n${passed}/${EXPECTED_CHECKS} checks passed\n`);
if (selftest && passed !== EXPECTED_CHECKS) {
  process.stderr.write(`selftest: expected ${EXPECTED_CHECKS}, got ${passed}\n`);
  process.exit(1);
}
process.exit(failures.length === 0 ? 0 : 1);
