#!/usr/bin/env node
// parse-spec.js — T6 standalone parser for /architecture --from-spec.
//
// Parses a spec.html and emits:
//   stdout: { modules: [{name, deps[], role}], assertions: [string], section_ids: [string] }
//   stderr (on contract violation): {error, missing_sections, remedy} per §9.4
//
// Exit codes:
//   0   — success (also for tolerant malformed-row case; warnings go to stderr)
//   64  — usage error (no spec path / file not found)
//   65  — spec-contract-violation (missing/empty modules or assertions section)
//
// Substrate dispatch: per T1 tracer, the substrate `build_sections_json.js`
// runs as a CLI (its top-level code reads argv/stdin) — `require()` would
// HANG reading stdin. We invoke it via execFileSync to enumerate section IDs
// for the diagnostic `section_ids` field. Bodies are extracted with the same
// inline regex pattern as the tracer (the tracer's `extractSectionBody` is the
// authoritative pattern but kept local here so the parser is self-contained).

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SUBSTRATE = path.resolve(
  __dirname,
  '..',
  '..',
  '_shared',
  'html-authoring',
  'assets',
  'build_sections_json.js'
);

function die(code, msg) {
  process.stderr.write(msg + (msg.endsWith('\n') ? '' : '\n'));
  process.exit(code);
}

function emitContractViolation(missingSection, customRemedy) {
  const remedies = {
    'modules':
      'Add a <section id="modules"> with a 3-column table (name | deps | role); see spec §10 for the canonical shape.',
    'modules-table-empty':
      'The <section id="modules"> exists but its <tbody> contains zero rows. Add at least one <tr><td>name</td><td>deps</td><td>role</td></tr>.',
    'architectural-assertions':
      'Add (or populate) a <section id="architectural-assertions"> with a <ul> of bullet assertions; each <li> becomes one judge input.',
  };
  const remedy = customRemedy || remedies[missingSection] || 'See spec §10/§11 for the canonical shape.';
  const payload = {
    error: 'spec-contract-violation',
    missing_sections: [missingSection],
    remedy,
  };
  process.stderr.write(JSON.stringify(payload) + '\n');
  process.exit(65);
}

function readSpec() {
  const arg = process.argv[2];
  if (!arg) die(64, 'usage: parse-spec.js <spec.html>');
  if (!fs.existsSync(arg)) die(64, 'spec not found: ' + arg);
  return { path: arg, html: fs.readFileSync(arg, 'utf8') };
}

function enumerateSectionIds(specPath) {
  // Use substrate as CLI per T1 tracer pattern (require() hangs reading stdin).
  if (!fs.existsSync(SUBSTRATE)) {
    process.stderr.write('warn: substrate missing at ' + SUBSTRATE + '; section_ids will be []\n');
    return [];
  }
  try {
    const out = execFileSync(process.execPath, [SUBSTRATE, specPath], { encoding: 'utf8' });
    const idx = JSON.parse(out);
    return idx.map((s) => s.id).filter(Boolean);
  } catch (e) {
    process.stderr.write('warn: substrate enumerate failed: ' + e.message + '\n');
    return [];
  }
}

function extractSectionBody(html, id) {
  const re = new RegExp(
    '<section\\b[^>]*\\bid\\s*=\\s*"' + id + '"[^>]*>([\\s\\S]*?)<\\/section>',
    'i'
  );
  const m = html.match(re);
  return m ? m[1] : null;
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseModules(bodyHtml) {
  // Find tbody if present; else use whole body.
  const tbodyMatch = bodyHtml.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i);
  const scope = tbodyMatch ? tbodyMatch[1] : bodyHtml;

  // Walk every <tr>...</tr>, count its <td> children. ≥3 → parse; <3 → warn+skip.
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  const tdRe = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
  const modules = [];
  let trMatch;
  let rowIdx = 0;
  while ((trMatch = trRe.exec(scope)) !== null) {
    rowIdx++;
    const rowHtml = trMatch[1];
    const cells = [];
    let tdMatch;
    tdRe.lastIndex = 0;
    while ((tdMatch = tdRe.exec(rowHtml)) !== null) {
      cells.push(stripTags(tdMatch[1]));
    }
    if (cells.length === 0) continue; // header-only row (only <th>) — silent skip
    if (cells.length < 3) {
      process.stderr.write(
        'warn: malformed module row #' + rowIdx + ' has ' + cells.length + ' <td> cells (expected ≥3); skipping\n'
      );
      continue;
    }
    const name = cells[0];
    const depsRaw = cells[1];
    const role = cells[2];
    const deps =
      depsRaw === '' || /^\(none\)$/i.test(depsRaw)
        ? []
        : depsRaw.split(/,\s*/).map((s) => s.trim()).filter(Boolean);
    modules.push({ name, deps, role });
  }
  return modules;
}

function parseAssertions(bodyHtml) {
  const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  const out = [];
  let m;
  while ((m = liRe.exec(bodyHtml)) !== null) {
    const txt = stripTags(m[1]);
    if (txt) out.push(txt);
  }
  return out;
}

// ── main ─────────────────────────────────────────────────────────────────────
const { path: specPath, html } = readSpec();
const sectionIds = enumerateSectionIds(specPath);

const modulesBody = extractSectionBody(html, 'modules');
if (modulesBody === null) emitContractViolation('modules');

const assertionsBody = extractSectionBody(html, 'architectural-assertions');
if (assertionsBody === null) emitContractViolation('architectural-assertions');

const modules = parseModules(modulesBody);
if (modules.length === 0) emitContractViolation('modules-table-empty');

const assertions = parseAssertions(assertionsBody);
if (assertions.length === 0) emitContractViolation('architectural-assertions');

process.stdout.write(JSON.stringify({ modules, assertions, section_ids: sectionIds }, null, 2) + '\n');
process.exit(0);
