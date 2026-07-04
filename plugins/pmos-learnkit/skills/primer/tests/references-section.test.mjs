// references-section.test.mjs — unit tests for the shared /primer References generator. Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderReferencesFragment,
  injectReferences,
  computeCitedUrls,
  cleanHost,
} from '../scripts/references-section.mjs';

const SOURCES = [
  { url: 'https://en.wikipedia.org/wiki/Foo', takeaway: 'Wikipedia frames Foo.', topic: 't1', tier: 'T2', paywalled: false },
  { url: 'https://www.example.com/blog/bar', takeaway: 'Example argues Bar.', topic: 't2', tier: 'T1', paywalled: false },
  { url: 'https://notes.dev/baz', takeaway: 'Baz background reading.', topic: 't3', tier: 'T3', paywalled: false },
];

// A minimal primer body: cites the example.com source inline, does NOT cite the others.
const BODY = `<main class="pmos-artifact-body" data-pmos-role="body">
<h1 class="pmos-doc-title">A Primer</h1>
<h2 id="what-this-is">What this is</h2>
<p>See <a href="https://www.example.com/blog/bar">the argument</a> for details.</p>
<h2 id="where-this-connects">Where this connects</h2>
<p>Adjacent stuff.</p>
</main>`;

test('cleanHost strips scheme + leading www.', () => {
  assert.equal(cleanHost('https://www.example.com/blog/bar'), 'example.com');
  assert.equal(cleanHost('https://en.wikipedia.org/wiki/Foo'), 'en.wikipedia.org');
  assert.equal(cleanHost('http://notes.dev/baz?x=1#y'), 'notes.dev');
});

test('fragment shape: single #references h2 + one <ol> with one <li> per source', () => {
  const frag = renderReferencesFragment(SOURCES, new Set());
  const h2Count = (frag.match(/<h2 id="references">/g) || []).length;
  assert.equal(h2Count, 1);
  assert.equal((frag.match(/<ol class="primer-references">/g) || []).length, 1);
  assert.equal((frag.match(/<li>/g) || []).length, SOURCES.length);
  assert.match(frag, /^<h2 id="references">References<\/h2>/);
});

test('ordering: tier T1→T2→T3 then original order', () => {
  const frag = renderReferencesFragment(SOURCES, new Set());
  const hosts = [...frag.matchAll(/<a href="[^"]*">([^<]*)<\/a>/g)].map((m) => m[1]);
  // T1 (example.com) first, then T2 (en.wikipedia.org), then T3 (notes.dev)
  assert.deepEqual(hosts, ['example.com', 'en.wikipedia.org', 'notes.dev']);
});

test('unknown / missing tiers sort last, preserving original order among them', () => {
  const src = [
    { url: 'https://a.test/1', takeaway: 'a', tier: 'T2' },
    { url: 'https://b.test/2', takeaway: 'b' }, // no tier
    { url: 'https://c.test/3', takeaway: 'c', tier: 'T1' },
    { url: 'https://d.test/4', takeaway: 'd', tier: 'weird' },
  ];
  const frag = renderReferencesFragment(src, new Set());
  const hosts = [...frag.matchAll(/<a href="[^"]*">([^<]*)<\/a>/g)].map((m) => m[1]);
  assert.deepEqual(hosts, ['c.test', 'a.test', 'b.test', 'd.test']);
});

test('·cited· detection: cited source marked, background source not', () => {
  const cited = computeCitedUrls(BODY, SOURCES);
  assert.ok(cited.has('https://www.example.com/blog/bar'));
  assert.ok(!cited.has('https://en.wikipedia.org/wiki/Foo'));
  const frag = renderReferencesFragment(SOURCES, cited);
  // The example.com line carries ·cited·; the wikipedia line does not.
  const exLine = frag.split('\n').find((l) => l.includes('example.com'));
  const wikiLine = frag.split('\n').find((l) => l.includes('wikipedia'));
  assert.match(exLine, /·cited·/);
  assert.doesNotMatch(wikiLine, /·cited·/);
});

test('all-sources membership: every url present exactly once', () => {
  const frag = renderReferencesFragment(SOURCES, new Set());
  for (const s of SOURCES) {
    const occurrences = frag.split(s.url).length - 1;
    assert.equal(occurrences, 1, `url ${s.url} should appear exactly once`);
  }
});

test('injectReferences places the section immediately before </main>', () => {
  const out = injectReferences(BODY, SOURCES);
  const refIdx = out.indexOf('<h2 id="references">');
  const mainIdx = out.indexOf('</main>');
  assert.ok(refIdx !== -1 && mainIdx !== -1);
  assert.ok(refIdx < mainIdx, 'references must precede </main>');
  // Nothing but whitespace between the </ol> and </main>.
  const between = out.slice(out.indexOf('</ol>') + '</ol>'.length, mainIdx);
  assert.match(between, /^\s*$/);
});

test('injectReferences is idempotent (inject twice === inject once)', () => {
  const once = injectReferences(BODY, SOURCES);
  const twice = injectReferences(once, SOURCES);
  assert.equal(twice, once);
  // Exactly one references section after a double run.
  assert.equal((twice.match(/<h2 id="references">/g) || []).length, 1);
});

test('injected body still cites correctly (references-section anchors do not self-mark)', () => {
  const out = injectReferences(BODY, SOURCES);
  // Re-derive cited from the injected doc — must be unchanged (references anchors excluded).
  const reinjected = injectReferences(out, SOURCES);
  assert.equal(reinjected, out);
});

test('HTML-escaping of url/takeaway containing & and <', () => {
  const src = [
    { url: 'https://x.test/a?b=1&c=2', takeaway: 'Uses A & B < C in a claim.', tier: 'T1' },
  ];
  const frag = renderReferencesFragment(src, new Set());
  assert.match(frag, /href="https:\/\/x\.test\/a\?b=1&amp;c=2"/);
  assert.match(frag, /Uses A &amp; B &lt; C in a claim\./);
  assert.doesNotMatch(frag, /A & B/); // raw ampersand must be escaped
});

test('byte-stable output for identical inputs (D6)', () => {
  const a = renderReferencesFragment(SOURCES, new Set(['https://www.example.com/blog/bar']));
  const b = renderReferencesFragment(SOURCES, new Set(['https://www.example.com/blog/bar']));
  assert.equal(a, b);
});
