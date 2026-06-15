#!/usr/bin/env node
// emit-findings.js — T8 findings triplet writer.
//
// Reads JSON array of validated findings from stdin. Validates each has the
// 7 required §9.3 keys (mode-conditional spec_section_id|file_path). Writes:
//   ${out-prefix}.json   atomic temp+rename
//   ${out-prefix}.html   substrate template + per-finding <section>
//   ${out-prefix}.md     via html-to-md.js
// Same-day overwrite is OK (E6) — temp+rename is naturally idempotent.
//
// Args:
//   --out-prefix <path>     output path stem (no extension).
//   --mode from-spec|since  selects spec_section_id vs file_path requirement.
//   --source-path <ref>     source artifact path (rendered in footer).

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PLUGIN_VERSION = '2.57.1';
const REQUIRED_BASE = ['rule_id', 'severity', 'confidence', 'quote', 'finding', 'recommendation'];

function parseArgs(argv) {
  const out = { outPrefix: null, mode: null, sourcePath: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out-prefix') out.outPrefix = argv[++i];
    else if (a === '--mode') out.mode = argv[++i];
    else if (a === '--source-path') out.sourcePath = argv[++i];
  }
  if (!out.outPrefix || !out.mode || !out.sourcePath) {
    process.stderr.write('usage: emit-findings.js --out-prefix <path> --mode from-spec|since --source-path <ref>\n');
    process.exit(64);
  }
  if (!['from-spec', 'since'].includes(out.mode)) {
    process.stderr.write(`invalid --mode: ${out.mode}\n`);
    process.exit(64);
  }
  return out;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (buf += c));
    process.stdin.on('end', () => resolve(buf));
    process.stdin.on('error', reject);
  });
}

function atomicWrite(target, body) {
  const tmp = `${target}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, body);
  fs.renameSync(tmp, target);
}

function esc(s) {
  if (s === undefined || s === null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function findingSection(f, idx) {
  const n = idx + 1;
  const anchor = `finding-${n}`;
  const sectionRef = f.spec_section_id ? `spec section <code>${esc(f.spec_section_id)}</code>` : `file <code>${esc(f.file_path)}</code>`;
  return `
    <section id="${anchor}">
      <h2 id="${anchor}-h">Finding ${n} — ${esc(f.rule_id)} <span class="severity">[${esc(f.severity)}]</span> <span class="confidence">conf ${esc(f.confidence)}</span></h2>
      <p><strong>Source:</strong> ${sectionRef}</p>
      <blockquote>${esc(f.quote)}</blockquote>
      <p><strong>Finding:</strong> ${esc(f.finding)}</p>
      <p><strong>Recommendation:</strong> ${esc(f.recommendation)}</p>
    </section>`;
}

function renderHtml({ findings, sourcePath, title }) {
  const templatePath = path.resolve(__dirname, '..', '..', '_shared', 'html-authoring', 'template.html');
  let tpl = fs.readFileSync(templatePath, 'utf8');

  const content = findings.map(findingSection).join('\n');
  const subs = {
    '{{title}}': esc(title),
    '{{pmos_skill}}': 'architecture',
    '{{plugin_name}}': 'pmos-toolkit',
    '{{plugin_name_nbsp}}': 'pmos&#8209;toolkit',
    '{{repo_url}}': 'https://github.com/maneesh-dhabria/pmos-skills',
    '{{plugin_url}}': 'https://github.com/maneesh-dhabria/pmos-skills/blob/main/plugins/pmos-toolkit/README.md',
    '{{plugin_version}}': PLUGIN_VERSION,
    '{{asset_prefix}}': 'assets/',
    '{{source_path}}': esc(sourcePath),
    '{{content}}': content,
  };

  for (const [k, v] of Object.entries(subs)) {
    tpl = tpl.split(k).join(v);
  }
  return tpl;
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const raw = await readStdin();
  let findings;
  try {
    findings = JSON.parse(raw);
  } catch (e) {
    process.stderr.write(`stdin not valid JSON: ${e.message}\n`);
    process.exit(1);
  }
  if (!Array.isArray(findings)) {
    process.stderr.write('stdin JSON is not an array\n');
    process.exit(1);
  }

  // §9.3 validation: every finding has all 7 required keys, mode-conditional.
  const sectionKey = args.mode === 'from-spec' ? 'spec_section_id' : 'file_path';
  for (let i = 0; i < findings.length; i++) {
    const f = findings[i];
    for (const k of REQUIRED_BASE) {
      if (!(k in f)) {
        process.stderr.write(`finding[${i}] missing required key: ${k}\n`);
        process.exit(1);
      }
    }
    if (!(sectionKey in f)) {
      process.stderr.write(`finding[${i}] missing required key for mode=${args.mode}: ${sectionKey}\n`);
      process.exit(1);
    }
  }

  // Write JSON (atomic).
  const jsonPath = `${args.outPrefix}.json`;
  atomicWrite(jsonPath, JSON.stringify(findings, null, 2) + '\n');

  // Write HTML (atomic).
  const htmlPath = `${args.outPrefix}.html`;
  const title = `Architecture Findings — ${path.basename(args.sourcePath)}`;
  const htmlBody = renderHtml({ findings, sourcePath: args.sourcePath, title });
  atomicWrite(htmlPath, htmlBody);

  // Write MD sidecar (atomic). Synthesized directly from findings rather than
  // routed through _shared/html-authoring/assets/html-to-md.js — the substrate
  // converter requires a jsdom install (vendored bundles assume one), which is
  // not a pmos-toolkit hard dep. Direct synth keeps emit-findings zero-dep and
  // produces the exact "## Finding N" headings the §13 contract expects.
  const mdBody = [
    `# Architecture Findings — ${args.sourcePath}`,
    '',
    `Mode: ${args.mode} · Findings: ${findings.length}`,
    '',
    ...findings.flatMap((f, i) => {
      const n = i + 1;
      const sectionRef = f.spec_section_id
        ? `spec section \`${f.spec_section_id}\``
        : `file \`${f.file_path}\``;
      return [
        `## Finding ${n} — ${f.rule_id} [${f.severity}] (confidence ${f.confidence})`,
        '',
        `**Source:** ${sectionRef}`,
        '',
        '> ' + String(f.quote).replace(/\n/g, '\n> '),
        '',
        `**Finding:** ${f.finding}`,
        '',
        `**Recommendation:** ${f.recommendation}`,
        '',
      ];
    }),
  ].join('\n');
  const mdPath = `${args.outPrefix}.md`;
  atomicWrite(mdPath, mdBody);

  // Stderr summary.
  process.stderr.write(`emit-findings: wrote ${findings.length} finding(s) → ${jsonPath}, ${htmlPath}, ${mdPath}\n`);
})();
