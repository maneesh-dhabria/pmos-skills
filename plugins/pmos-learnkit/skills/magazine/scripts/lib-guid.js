#!/usr/bin/env node
// lib-guid.js — the single source of truth for /magazine's GUID-safe-ify rule
// and the normalized reconciliation used to match a summarizer's returned key
// back to a manifest GUID. Zero npm dependencies; node >= 18.
//
// Why this exists (FR-3.1/FR-3.2, story 260624-9fw): a GUID is used two ways —
//   (1) as a filesystem-safe cache key (transcripts/<safeGuid>.txt), and
//   (2) as the opaque ledger key a summarizer subagent must echo back verbatim.
// The safe-ify transform (slashes etc. -> `_`) is LOSSY: `.../p/slug` and
// `.../p_slug` both safe-ify to the same string. When a summarizer (or any tool
// that round-trips through a filename) hands back a *safe-ified* key instead of
// the original GUID, a naive exact-match silently drops the item. Centralizing
// the rule here lets the matcher reconcile both sides through the SAME transform:
// exact match first (never a false pick), then a normalized fallback. An
// unrelated key still returns null — reconciliation never guesses.
'use strict';

// The canonical safe-ify: replace every char outside [A-Za-z0-9._-] with `_`.
// This is the rule transcribe.sh's `safe_guid_of` and the crawl-cache filename
// keying both follow; keep them in lock-step.
function safeGuid(guid) {
  return String(guid).replace(/[^A-Za-z0-9._-]/g, '_');
}

// Reconcile a returned `key` against a list of real manifest GUIDs. Returns the
// matching manifest GUID, or null when nothing matches (never a silent pick).
//   1. exact match — the common case, cheapest, zero ambiguity.
//   2. normalized — safe-ify BOTH sides and compare, so a safe-ified key
//      (`/p_slug`) reconciles to its original GUID (`/p/slug`).
// `null`/`undefined` key -> null. The first manifest GUID that matches wins.
function matchByGuid(manifestGuids, key) {
  if (key == null) return null;
  const list = manifestGuids || [];
  const k = String(key);
  for (const g of list) { if (String(g) === k) return g; } // exact
  const nk = safeGuid(k);
  for (const g of list) { if (safeGuid(String(g)) === nk) return g; } // normalized
  return null;
}

function selftest() {
  let ok = true;
  const assert = (c, m) => { if (!c) { ok = false; console.error('FAIL:', m); } };

  // safe-ify rule
  assert(safeGuid('https://x.com/p/glm-5-2') === 'https___x.com_p_glm-5-2', 'safeGuid replaces non-[A-Za-z0-9._-]');
  assert(safeGuid('plain-guid_123.4') === 'plain-guid_123.4', 'safeGuid leaves a clean key untouched');

  // exact match
  assert(matchByGuid(['a', 'b', 'c'], 'b') === 'b', 'exact match returns the manifest GUID');

  // normalized reconciliation: a safe-ified key reconciles to its original GUID
  const manifest = ['https://x.com/p/glm-5-2', 'https://x.com/p/other'];
  assert(matchByGuid(manifest, 'https://x.com/p_glm-5-2') === 'https://x.com/p/glm-5-2',
    'safe-ified key reconciles to the original manifest GUID');

  // exact still beats normalized when the key is already a real GUID
  assert(matchByGuid(manifest, 'https://x.com/p/other') === 'https://x.com/p/other', 'a real GUID matches exactly');

  // an unrelated key never picks anything
  assert(matchByGuid(manifest, 'https://y.com/totally-different') === null, 'unrelated key returns null (no silent pick)');
  assert(matchByGuid(manifest, null) === null, 'null key returns null');
  assert(matchByGuid([], 'anything') === null, 'empty manifest returns null');

  console.log(ok ? 'lib-guid.js --selftest: PASS' : 'lib-guid.js --selftest: FAIL');
  process.exit(ok ? 0 : 1);
}

module.exports = { safeGuid, matchByGuid };

if (require.main === module) {
  if (process.argv.slice(2).includes('--selftest')) selftest();
  else { console.log('usage: lib-guid.js --selftest'); }
}
