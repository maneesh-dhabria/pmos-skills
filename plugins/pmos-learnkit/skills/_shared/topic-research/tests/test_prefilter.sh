#!/usr/bin/env bash
# test_prefilter.sh — determinism + correctness of the curated-references prefilter.
#
# Design anchor: 02_design.html#a-prefilter. Asserts the deterministic, zero-dep
# rarity-weighted (IDF) tag-overlap matcher behaves per the contract:
#   (a) determinism — same (tags,K,corpus) -> byte-identical ordered output twice;
#   (b) IDF weighting — a rare tag outranks a common tag at equal overlap count;
#   (c) bot-wall titles pre-rejected ("Just a moment…", "Attention Required! | Cloudflare", 4xx/5xx);
#   (d) summary_grounded:false down-weighted vs an otherwise-equal grounded candidate;
#   (e) hard-blocked domains (forbes.com) skipped entirely;
#   (f) top-K respected.
# Uses small in-test fixtures (not the 1.8k-row file) so it is fast + stable.
#
# Note on padding: IDF weight w(tag)=log(N/(1+df)) is <=0 for a tag present in (almost)
# every record. The real corpus query tags are rare (e.g. pricing ~154/1817 -> strongly
# positive); fixtures therefore append `pad(n)` filler records with unique unrelated tags
# so the query tag stays rare relative to N — modelling the real rarity, not weakening the
# assertion.
#
# Dependencies: bash + node. Authored T3 (RED until T4 implements curated-references-match.mjs).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
MATCH="$SCRIPT_DIR/../curated-references-match.mjs"

if [[ ! -f "$MATCH" ]]; then
  echo "FAIL: prefilter not found at $MATCH (implement T4)" >&2
  exit 1
fi

MATCH_URL="file://$MATCH" node --input-type=module <<'EOF'
import assert from 'node:assert/strict';
const { match } = await import(process.env.MATCH_URL);

const rec = (id, tags, extra = {}) => ({
  id, url: `https://example.com/${id}`, title: id, tags,
  source_type: 'article', publication_date: null, summary: id, summary_grounded: true,
  ...extra,
});
// filler records with unique, unrelated tags — keep query tags rare relative to N.
const pad = (n) => Array.from({ length: n }, (_, i) => rec(`pad_${i}`, [`filler_${i}`]));

// ---- (b) IDF weighting: rare tag outranks common tag at equal overlap (1) -------------
{
  const corpus = [
    rec('rare', ['rare1', 'x']),
    rec('comm', ['common', 'y']),
    rec('c1', ['common']),
    rec('c2', ['common']),
    ...pad(8),
  ];
  const out = match({ tags: ['rare1', 'common'], corpus, k: 10 });
  const ids = out.map((r) => r.id);
  assert.ok(ids.indexOf('rare') !== -1 && ids.indexOf('comm') !== -1, 'both candidates returned');
  assert.ok(ids.indexOf('rare') < ids.indexOf('comm'),
    `rare tag should outrank common at equal overlap (got ${ids.join(',')})`);
  const sRare = out.find((r) => r.id === 'rare').score;
  const sComm = out.find((r) => r.id === 'comm').score;
  assert.ok(sRare > sComm, `IDF: score(rare)=${sRare} should exceed score(comm)=${sComm}`);
}

// ---- (a) determinism: identical input -> byte-identical ordered output twice -----------
{
  const corpus = [
    rec('a', ['pricing', 'monetization']),
    rec('b', ['pricing']),
    rec('c', ['monetization', 'growth']),
    rec('d', ['growth']),
    rec('e', ['pricing', 'growth']),
    ...pad(6),
  ];
  const a = JSON.stringify(match({ tags: ['pricing', 'growth'], corpus, k: 4 }));
  const b = JSON.stringify(match({ tags: ['pricing', 'growth'], corpus, k: 4 }));
  assert.equal(a, b, 'prefilter output must be byte-identical across runs');
  // stable tie-break: equal-score records ordered by id ascending
  const tieCorpus = [rec('z2', ['tie']), rec('z1', ['tie']), ...pad(6)];
  const tie = match({ tags: ['tie'], corpus: tieCorpus, k: 10 });
  assert.deepEqual(tie.map((r) => r.id), ['z1', 'z2'], 'ties break by id ascending');
  assert.ok(tie[0].score > 0, 'tie fixture must yield positive IDF weight');
}

// ---- (c) bot-wall titles pre-rejected --------------------------------------------------
{
  const corpus = [
    rec('good', ['pricing']),
    rec('wall1', ['pricing'], { title: 'Just a moment...' }),
    rec('wall2', ['pricing'], { title: 'Attention Required! | Cloudflare' }),
    rec('wall3', ['pricing'], { title: '404 - Page not found' }),
    rec('wall4', ['pricing'], { title: '500 Internal Server Error' }),
    rec('wall5', ['pricing'], { title: 'Access Denied' }),
    ...pad(8),
  ];
  const ids = match({ tags: ['pricing'], corpus, k: 10 }).map((r) => r.id);
  assert.deepEqual(ids, ['good'], `bot-wall titles must be pre-rejected (got ${ids.join(',')})`);
}

// ---- (d) summary_grounded:false down-weighted vs equal grounded ------------------------
{
  const corpus = [
    rec('grounded', ['pricing', 'monetization'], { summary_grounded: true }),
    rec('ungrounded', ['pricing', 'monetization'], { summary_grounded: false }),
    ...pad(8),
  ];
  const out = match({ tags: ['pricing', 'monetization'], corpus, k: 10 });
  const ids = out.map((r) => r.id);
  assert.ok(ids.indexOf('grounded') < ids.indexOf('ungrounded'),
    `grounded should outrank an equal ungrounded candidate (got ${ids.join(',')})`);
  assert.ok(out.find((r) => r.id === 'grounded').score > out.find((r) => r.id === 'ungrounded').score,
    'grounded score must exceed the down-weighted ungrounded score');
}

// ---- (e) hard-blocked domains (forbes.com) skipped entirely ----------------------------
{
  const corpus = [
    rec('keep', ['pricing']),
    { ...rec('forbes', ['pricing']), url: 'https://www.forbes.com/sites/x/pricing' },
    { ...rec('forbes2', ['pricing']), url: 'https://forbes.com/pricing' },
    ...pad(8),
  ];
  const ids = match({ tags: ['pricing'], corpus, k: 10 }).map((r) => r.id);
  assert.deepEqual(ids, ['keep'], `forbes.com must be skipped (got ${ids.join(',')})`);
}

// ---- (f) top-K respected ---------------------------------------------------------------
{
  const corpus = [...Array.from({ length: 10 }, (_, i) => rec(`r${i}`, ['pricing'])), ...pad(20)];
  const out = match({ tags: ['pricing'], corpus, k: 3 });
  assert.equal(out.length, 3, `top-K must cap result length (got ${out.length})`);
}

// ---- scoreFloor: records below the floor (incl. zero-overlap) excluded -----------------
{
  const corpus = [rec('hit', ['pricing']), rec('miss', ['unrelated']), ...pad(8)];
  const out = match({ tags: ['pricing'], corpus, k: 10, scoreFloor: 0 });
  assert.deepEqual(out.map((r) => r.id), ['hit'], 'zero-overlap records excluded at scoreFloor 0');
}

console.log('test_prefilter.sh: PASS (all prefilter assertions green)');
EOF
