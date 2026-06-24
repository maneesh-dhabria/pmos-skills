#!/usr/bin/env node
// viewer.test.mjs — static + structural gate for reference/wiki-viewer.html (Story 260624-1e5, AC3/AC5).
// Asserts every §6 fold-in hook is present, the engine files carry NO MCP/transport code (AC5),
// and emits a fixture-injected instance (tests/.wiki-viewer.instance.html, gitignored) that the
// live headless Playwright dogfood drives (skim↔full, facet filter, annotation round-trip).
//
// Exit 0 = green; 1 = ≥1 assertion failed; 2 = harness error.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const WIKI = join(HERE, '..');
const VIEWER = join(WIKI, 'reference', 'wiki-viewer.html');
const FIXTURE = join(HERE, 'fixtures', 'corpus.sample.json');

let pass = 0;
const fail = [];
const ok = (name, cond) => cond ? pass++ : fail.push(name);

let html;
try { html = readFileSync(VIEWER, 'utf8'); }
catch (e) { console.error('cannot read viewer:', e.message); process.exit(2); }

// ---- fold-in hooks (02_design.html#viewer) ----
ok('pmos:skill meta tag', /<meta name="pmos:skill" content="wiki">/.test(html));
ok('pmos wordmark', /made with <b>pmos<\/b>/.test(html));
ok('skim mode toggle', /id="mode-skim"/.test(html));
ok('full mode toggle', /id="mode-full"/.test(html));
ok('workstream facet', /id="facet-ws"/.test(html));
ok('time/modified-after facet', /id="facet-date"/.test(html));
ok('exclude facet (show excluded)', /id="facet-excluded"/.test(html));
ok('glossary section', /id="glossary"/.test(html) && /renderGlossary/.test(html));
ok('per-section summaries render', /section_summaries/.test(html) && /class="sections"/.test(html));
ok('created/last-modified header', /created \$\{fmtDate\(d\.created\)\}/.test(html) && /modified \$\{fmtDate\(d\.last_edited\)\}/.test(html));
ok('LLM-vs-original title toggle', /title-toggle/.test(html) && /llm_title/.test(html));
ok('external-reference links surfaced', /external_links/.test(html) && /class="links"/.test(html));
ok('full-mode body render', /class="body-md"/.test(html) && /renderMd/.test(html));
ok('inline-comment annotation threads', /class="comments"/.test(html) && /add-note/.test(html) && /class="thread"/.test(html));
ok('annotations persist into #wiki-corpus', /function persist\(\)/.test(html) && /getElementById\('wiki-corpus'\)\.textContent = JSON\.stringify/.test(html));
ok('exclude hidden by default + restorable', /isExcluded/.test(html) && /class="restore"/.test(html));
ok('embedded corpus script block', /<script id="wiki-corpus" type="application\/json">/.test(html));
ok('zero-dep: no external script/link src (data: allowed)',
   !/<script[^>]+src=["'](?!data:)/.test(html) && !/<link[^>]+href=["'](?!data:)/.test(html));
ok('exposes window.WikiViewer for Story B + tests', /window\.WikiViewer = WikiViewer/.test(html));

// ---- AC5: engine files carry NO MCP/transport code ----
const engineFiles = ['scripts/hash.mjs','scripts/stitch.mjs','scripts/queue.mjs','scripts/retrieval.mjs',
  'reference/wiki-viewer.html','reference/sidecar-schema.md'];
for (const rel of engineFiles) {
  let txt = '';
  try { txt = readFileSync(join(WIKI, rel), 'utf8'); } catch { /* ignore */ }
  // "mcp" / transport-client tokens must not appear in engine source (data URLs in fixtures are fine,
  // and the schema doc citing the design is not an engine file). The viewer may *describe* http://localhost
  // serving in a comment, which is not transport code — so we forbid the active token forms only.
  ok(`AC5 no MCP token in ${rel}`, !/\bmcp\b/i.test(txt));
  ok(`AC5 no transport require/import in ${rel}`,
     !/require\(['"]https?['"]\)/.test(txt) && !/from ['"]node:https?['"]/.test(txt) &&
     !/\bnew\s+WebSocket\b/.test(txt) && !/createServer\s*\(/.test(txt));
}

// ---- AC5: no SKILL.md in this story's wiki dir ----
import { existsSync } from 'node:fs';
ok('AC5 no SKILL.md in wiki/ (Story rmq authors it)', !existsSync(join(WIKI, 'SKILL.md')));

// ---- emit the fixture-injected instance for the live dogfood ----
try {
  const fixture = readFileSync(FIXTURE, 'utf8').trim();
  const instance = html.replace(
    /(<script id="wiki-corpus" type="application\/json">)[\s\S]*?(<\/script>)/,
    `$1\n${fixture}\n$2`
  );
  // sanity: the injection actually swapped the demo corpus for the fixture
  ok('instance injection swapped in the fixture corpus', instance.includes('"id": "hub-onboarding"'));
  writeFileSync(join(HERE, '.wiki-viewer.instance.html'), instance);
} catch (e) {
  fail.push('emit instance: ' + e.message);
}

if (fail.length) {
  console.error(`viewer.test: ${pass} passed, ${fail.length} FAILED`);
  for (const f of fail) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`viewer.test: ${pass} passed, 0 failed — instance at tests/.wiki-viewer.instance.html`);
process.exit(0);
