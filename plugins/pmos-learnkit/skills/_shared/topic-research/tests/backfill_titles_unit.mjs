// backfill_titles_unit.mjs — zero-network unit gate for backfill-titles.mjs pure logic.
//
// Design anchor: 02_design.html#d5/#d6/#d8/#c4. The LIVE proof cases (Amazon book recovers,
// shreyas tweet recovers via document.title+og:description, garrytan link-only stays WEAK,
// a 429 keeps-not-drops) run against the network in the load-bearing dogfood; this file
// pins the deterministic, pure decision logic that governs them so a regression is caught
// without a browser. No network, no Date, no Math.random.

import {
  isJunk, stillJunk, host, isTweetHost, refId, slugTitle, canonicalForFetch, dedupeById,
} from '../scripts/backfill-titles.mjs';

let pass = 0, fail = 0;
const eq = (got, want, msg) => {
  if (JSON.stringify(got) === JSON.stringify(want)) { pass++; }
  else { fail++; console.error(`FAIL: ${msg}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`); }
};
const ok = (cond, msg) => eq(!!cond, true, msg);

// --- junk classifier (the work-set selector) --------------------------------
ok(isJunk(''), 'empty title is junk');
ok(isJunk('Just a moment...'), 'cloudflare title is junk');
ok(isJunk('Amazon.com'), 'bare Amazon.com is junk');
ok(isJunk('403 Forbidden'), '403 is junk');
ok(isJunk('429 Too Many Requests'), '429 is junk');
ok(!isJunk('The Principles of Product Development Flow'), 'real book title is not junk');
ok(!isJunk('Thread by @user on Thread Reader App'), 'tweet title is not junk-regex (handled by tweet branch)');

// --- still-junk guard (a recovered value that must not overwrite) -----------
ok(stillJunk('medium.com'), 'host-only medium.com is still junk (triggers escalation)');
ok(stillJunk('x.com'), 'host-only x.com is still junk');
ok(stillJunk('404'), 'short error is still junk');
ok(stillJunk(''), 'empty is still junk');
ok(!stillJunk('A Real Article Title'), 'a real recovered title is accepted');

// --- host + tweet detection (D8 branch routing) -----------------------------
eq(host('https://www.x.com/shreyas/status/1'), 'x.com', 'host strips www');
ok(isTweetHost(host('https://x.com/a/status/1')), 'x.com is a tweet host');
ok(isTweetHost(host('https://twitter.com/a/status/1')), 'twitter.com is a tweet host');
ok(!isTweetHost(host('https://amazon.com/dp/123')), 'amazon is not a tweet host');

// --- content-derived id (C4: re-mint must be deterministic) ------------------
eq(refId('https://example.com/a'), refId('https://example.com/a'), 'refId is deterministic');
ok(refId('https://example.com/a').startsWith('ref_'), 'refId has ref_ prefix');
ok(refId('https://example.com/a') !== refId('https://example.com/b'), 'different urls → different ids');
eq(refId('https://x').length, 16, 'refId is ref_ + 12 hex chars');

// --- URL-slug last resort (D5 rung 4) ---------------------------------------
eq(slugTitle('https://www.amazon.com/Principles-Product-Development-Flow-Reinertsen/dp/1935401009'),
  'Principles Product Development Flow Reinertsen',
  'amazon slug skips dp + numeric asin → human-ish title from the descriptive segment');
eq(slugTitle('https://example.com/'), '', 'empty path → no slug title');
eq(slugTitle('https://example.com/12345'), '', 'numeric-only segment → no slug title');
ok(slugTitle('https://blog.example.com/the-real-post-title.html') === 'The Real Post Title',
  'slug strips .html and title-cases');
// Amazon traps: must skip the `ref=…` tracking segment and the bare ASIN, not title them.
eq(slugTitle('https://www.amazon.com/Monetizing-Innovation-audiobook/dp/B01M1OB3O4/ref=sr_1_1?crid=1K7&keywords=x'),
  'Monetizing Innovation Audiobook',
  'amazon ref=sr tracking segment is skipped for the descriptive slug');
eq(slugTitle('https://www.amazon.com/15-Commitments-Conscious-Leadership-Sustainable/dp/B00SM8MMJO'),
  '15 Commitments Conscious Leadership Sustainable',
  'amazon bare ASIN segment is skipped for the descriptive slug');

// --- canonical fetch URL (AC4: Amazon stale tracking URL → live /dp/ASIN) ----
eq(canonicalForFetch('https://www.amazon.com/Monetizing-Innovation-audiobook/dp/B01M1OB3O4/ref=sr_1_1?crid=1K7&qid=168'),
  'https://www.amazon.com/dp/B01M1OB3O4',
  'amazon search-result URL → canonical /dp/ASIN (tracking + /ref= stripped)');
eq(canonicalForFetch('https://www.amazon.com/gp/product/B00SM8MMJO?ref=foo'),
  'https://www.amazon.com/gp/product/B00SM8MMJO',
  'amazon /gp/product canonical preserved, query dropped');
eq(canonicalForFetch('https://example.com/a/b?x=1'), 'https://example.com/a/b?x=1',
  'non-amazon URL is returned unchanged (redirects followed by the browser)');

// --- dedupe by canonical id (two source urls canonicalize onto one id) -------
{
  // Same id (same url after canonicalization) → collapse to one; grounded wins.
  const a = { id: 'ref_x', url: 'https://www.amazon.com/dp/B1', title: 'Book', summary: '', summary_grounded: false };
  const b = { id: 'ref_x', url: 'https://www.amazon.com/dp/B1', title: 'Book', summary: 'A real grounded blurb that is long.', summary_grounded: true };
  const { records, collapsed } = dedupeById([a, b]);
  eq(records.length, 1, 'duplicate id collapses to a single record');
  ok(records[0].summary_grounded, 'grounded record wins the collision');
  eq(collapsed.length, 1, 'one collapse is reported');
  eq(collapsed[0].dropped, 1, 'collapse reports one dropped duplicate');
}
{
  // Distinct ids are untouched; order-independent count.
  const recs = [
    { id: 'ref_a', url: 'u/a', title: 'A', summary: '', summary_grounded: false },
    { id: 'ref_b', url: 'u/b', title: 'B', summary: '', summary_grounded: false },
  ];
  const { records, collapsed } = dedupeById(recs);
  eq(records.length, 2, 'distinct ids are preserved');
  eq(collapsed.length, 0, 'no collapse when ids are unique');
}

console.log(`\nbackfill_titles_unit: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
