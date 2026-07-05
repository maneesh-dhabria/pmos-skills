#!/usr/bin/env node
// questionnaire.mjs — tier-3 interviewer-recall questionnaire emitter.
// /interview-feedback (pmos-managerkit). Design §16.6 + SKILL.md#ground.
//
// When the score path has no transcript and no usable notes, the only remaining evidence basis is
// the interviewer's own recall. This emits a SINGLE blank HTML/Markdown form (NOT a prompt loop)
// derived from the round's scorecard dimensions (+ the interviewer-reference probes when present).
// Under --non-interactive the skill emits this blank form and REFUSES to fabricate answers
// (SKILL.md non-interactive: refused marker). Zero-dependency — Node built-ins only.
//
// Usage:
//   node questionnaire.mjs <scorecard.html> [--reference <reference.html>] [--format html|md] [--out <path>]
//   node questionnaire.mjs --selftest

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

// Pull dimensions {id, name} from a scorecard that carries the canonical anchors (data-dim).
function parseDims(html) {
  const dims = [];
  const secRe = /<section\b[^>]*\bdata-dim="([^"]+)"[^>]*>([\s\S]*?)<\/section>/gi;
  let m;
  while ((m = secRe.exec(html)) !== null) {
    const id = m[1];
    const body = m[2];
    const nameM = body.match(/class="dim-name"[^>]*>([\s\S]*?)</i)
              || body.match(/<(?:h\d|p|span)[^>]*>([\s\S]*?)</i);
    const name = nameM ? decodeEntities(nameM[1].replace(/<[^>]+>/g, '').trim()) : id;
    dims.push({ id, name });
  }
  return dims;
}

// Pull suggested probes per area from an interviewer-reference (data-probes lists). Optional.
function parseProbes(html) {
  const probes = {};
  const ulRe = /<ul\b[^>]*\bdata-probes="([^"]+)"[^>]*>([\s\S]*?)<\/ul>/gi;
  let m;
  while ((m = ulRe.exec(html)) !== null) {
    const area = m[1];
    const items = [];
    const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let li;
    while ((li = liRe.exec(m[2])) !== null) {
      const t = decodeEntities(li[1].replace(/<[^>]+>/g, '').trim());
      if (t) items.push(t);
    }
    if (items.length) probes[area] = items;
  }
  return probes;
}

function emitHtml(dims, probes) {
  const blocks = dims.map(d => {
    const ps = (probes[d.id] || []).map(p => `        <li class="probe">${p}</li>`).join('\n');
    return `    <section class="q" data-dim="${d.id}">
      <p class="q-name">${d.name}</p>
${ps ? `      <p class="q-sub">Suggested probes you may have asked:</p>\n      <ul class="probes">\n${ps}\n      </ul>\n` : ''}      <p class="q-prompt">What did the candidate actually say / do here? Quote them as closely as you can recall.</p>
      <div class="answer" data-input="recall:${d.id}" contenteditable="true"></div>
    </section>`;
  }).join('\n');
  return `<!DOCTYPE html>
<!-- Interviewer-recall questionnaire (tier 3) — BLANK. Answers become data-cite-tier="recalled"
     citations (data-source = interviewer name). The skill never auto-fills this. -->
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="pmos:skill" content="interview-feedback">
<title>Recall questionnaire — {{round_name}}</title>
<style>
  body{font-family:Georgia,serif;max-width:760px;margin:0 auto;padding:2rem 1.2rem;background:#f8f5ef;color:#201e1a;line-height:1.6}
  h1{font-family:-apple-system,Segoe UI,sans-serif;font-size:1.4rem}
  .lead{color:#655e54}
  .q{background:#fff;border:1px solid #e2dac9;border-radius:8px;padding:1rem 1.1rem;margin:0 0 1rem}
  .q-name{font-family:-apple-system,Segoe UI,sans-serif;font-weight:600;margin:0 0 .3rem}
  .q-sub,.q-prompt{font-size:.88rem;color:#655e54;margin:.4rem 0 .2rem}
  ul.probes li{font-size:.9rem}
  .answer{min-height:3.2rem;border:1px dashed #b8431a;border-radius:6px;padding:.5rem;margin-top:.4rem;background:#fffdf8}
</style></head>
<body>
  <h1>Recall questionnaire — {{round_name}}</h1>
  <p class="lead">No transcript or notes were available for this round. Fill in what you recall, in the
  candidate's own words where you can — these answers will be cited as interviewer-recalled evidence.</p>
${blocks}
</body></html>
`;
}

function emitMd(dims, probes) {
  const out = [`# Recall questionnaire — {{round_name}}`, '',
    'No transcript or notes were available. Fill in what you recall, in the candidate\'s own words where you can.', ''];
  for (const d of dims) {
    out.push(`## ${d.name}`);
    const ps = probes[d.id] || [];
    if (ps.length) { out.push('', 'Suggested probes you may have asked:'); ps.forEach(p => out.push(`- ${p}`)); }
    out.push('', 'What did the candidate actually say / do here?', '', '> _your recall here_', '');
  }
  return out.join('\n');
}

function build(scorecardHtml, referenceHtml, format) {
  const dims = parseDims(scorecardHtml);
  if (!dims.length) throw new Error('no data-dim anchors found in scorecard — cannot derive questionnaire');
  const probes = referenceHtml ? parseProbes(referenceHtml) : {};
  return format === 'md' ? emitMd(dims, probes) : emitHtml(dims, probes);
}

function selftest() {
  const here = dirname(fileURLToPath(import.meta.url));
  const skeleton = readFileSync(join(here, '..', '..', '_shared', 'interview-guidelines', 'scorecard-skeleton.html'), 'utf8');
  const refSkeleton = readFileSync(join(here, '..', '..', '_shared', 'interview-guidelines', 'reference-skeleton.html'), 'utf8');
  let pass = 0, total = 0;
  const check = (name, cond) => { total++; if (cond) { pass++; } else { console.error(`FAIL: ${name}`); } };

  const dims = parseDims(skeleton);
  check('parses the two example dims from the skeleton', dims.length === 2 && dims[0].id === 'example-dimension-one');

  const html = build(skeleton, refSkeleton, 'html');
  check('html output carries a recall answer slot per dim',
    (html.match(/data-input="recall:/g) || []).length === dims.length);
  check('html output is blank (no fabricated answers)', !/your recall here/.test(html) && /contenteditable/.test(html));

  const md = build(skeleton, null, 'md');
  check('md output has a heading per dim', (md.match(/^## /gm) || []).length === dims.length);

  const probes = parseProbes(refSkeleton);
  check('reference probes parse into a per-area list',
    Object.keys(probes).length >= 1 && Array.isArray(probes['example-area-one']));

  let threw = false;
  try { build('<html><body>no anchors</body></html>', null, 'html'); } catch { threw = true; }
  check('throws when scorecard has no data-dim anchors', threw);

  // round-trip write to a temp dir
  const dir = mkdtempSync(join(tmpdir(), 'ifb-q-'));
  const p = join(dir, 'q.html');
  writeFileSync(p, html);
  check('written file is non-empty', readFileSync(p, 'utf8').length > 200);

  console.log(`questionnaire selftest: ${pass}/${total} PASS`);
  process.exit(pass === total ? 0 : 1);
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--selftest')) return selftest();
  const positional = argv.filter(a => !a.startsWith('--'));
  const getOpt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
  const scorecardPath = positional[0];
  if (!scorecardPath) {
    console.error('usage: questionnaire.mjs <scorecard.html> [--reference <ref.html>] [--format html|md] [--out <path>]');
    process.exit(64);
  }
  const referencePath = getOpt('--reference');
  const format = getOpt('--format') === 'md' ? 'md' : 'html';
  const scorecardHtml = readFileSync(scorecardPath, 'utf8');
  const referenceHtml = referencePath ? readFileSync(referencePath, 'utf8') : null;
  const out = build(scorecardHtml, referenceHtml, format);
  const outPath = getOpt('--out') || join(dirname(scorecardPath), `recall-questionnaire.${format === 'md' ? 'md' : 'html'}`);
  writeFileSync(outPath, out);
  console.log(outPath);
}

main();
