#!/usr/bin/env node
// check-citations.mjs — grounding-integrity gate for /interview-feedback (design §16.4)
//
// Usage:
//   node check-citations.mjs <output.html> <transcript.refined.txt>
//   node check-citations.mjs --selftest
//
// Rules:
//   - data-cite-tier="transcript": quoted text MUST be a verbatim substring of the
//     transcript AND >=40 chars (after normalization: collapse whitespace runs to a
//     single space + trim; applied to BOTH sides). Else FAILURE.
//   - data-cite-tier="notes" | "recalled": exempt from substring check, but MUST carry
//     a non-empty data-source attribute. Missing/empty -> FAILURE.
//   - unknown tier value -> FAILURE.
//
// Zero-dependency, Node built-ins only.

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const KNOWN_TIERS = new Set(['transcript', 'notes', 'recalled']);
const MIN_TRANSCRIPT_LEN = 40;

// --- normalization: collapse whitespace runs to single space, then trim ---
function normalize(s) {
  return s.replace(/\s+/g, ' ').trim();
}

// --- decode the few common HTML entities ---
function decodeEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&'); // amp last so e.g. &amp;lt; doesn't double-decode
}

// --- pull a named attribute value out of a raw attribute string ---
// robust to attribute order; tolerates single or double quotes.
function getAttr(attrs, name) {
  const re = new RegExp(
    name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\')',
    'i'
  );
  const m = attrs.match(re);
  if (!m) return null;
  return m[2] !== undefined ? m[2] : m[3];
}

// --- parse all citation elements from HTML ---
// Matches any tag carrying a data-cite-tier attribute; captures attrs + inner text.
// Tolerates attribute order (data-source before or after data-cite-tier) and any tag name.
function parseCitations(html) {
  const cites = [];
  // Strip HTML comments first. Authored artifacts (e.g. the canonical scorecard skeleton)
  // legitimately carry explanatory <!-- … --> blocks that illustrate the citation contract
  // with literal data-cite-tier examples; those are documentation, not real citations, and
  // must never be scored. (Dogfood-caught: the skeleton's doc-comment tripped the gate.)
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  // Find every OPENING tag that carries a data-cite-tier attribute, then capture
  // text up to that tag's matching closing tag (by name). Scanning open-tags
  // directly avoids the balanced-backreference trap where an outer same-shaped
  // wrapper (e.g. <html>...</html>) swallows the inner citation.
  const openRe = /<([a-zA-Z][\w-]*)\b([^>]*?)\/?>/g;
  let m;
  while ((m = openRe.exec(html)) !== null) {
    const tagName = m[1];
    const attrs = m[2];
    if (!/data-cite-tier\s*=/.test(attrs)) continue;

    const tier = getAttr(attrs, 'data-cite-tier');
    const source = getAttr(attrs, 'data-source'); // null if absent

    // capture inner text up to the matching closing tag for this tag name
    const afterOpen = openRe.lastIndex;
    const closeRe = new RegExp('</' + tagName + '\\s*>', 'i');
    const rest = html.slice(afterOpen);
    const cm = rest.match(closeRe);
    const innerRaw = (cm ? rest.slice(0, cm.index) : rest).replace(/<[^>]*>/g, '');
    const text = decodeEntities(innerRaw);

    cites.push({ tier, source, text });
  }
  return cites;
}

// --- core check; returns { passed, failed, failures: [string...] } ---
function checkCitations(html, transcript) {
  const cites = parseCitations(html);
  const normTranscript = normalize(transcript);
  const failures = [];
  let passed = 0;

  for (const c of cites) {
    const head = normalize(c.text).slice(0, 60);
    const tier = c.tier;

    if (!KNOWN_TIERS.has(tier)) {
      failures.push(
        `[tier=${tier === null ? '<missing>' : tier}] "${head}" — unknown data-cite-tier value`
      );
      continue;
    }

    if (tier === 'transcript') {
      const normText = normalize(c.text);
      if (normText.length < MIN_TRANSCRIPT_LEN) {
        failures.push(
          `[tier=transcript] "${head}" — quote is ${normText.length} chars (<${MIN_TRANSCRIPT_LEN} required)`
        );
        continue;
      }
      if (!normTranscript.includes(normText)) {
        failures.push(
          `[tier=transcript] "${head}" — not a verbatim substring of the transcript`
        );
        continue;
      }
      passed++;
    } else {
      // notes | recalled
      if (c.source === null || c.source.trim() === '') {
        failures.push(
          `[tier=${tier}] "${head}" — missing/empty data-source attribute`
        );
        continue;
      }
      passed++;
    }
  }

  return { passed, failed: failures.length, failures };
}

// --- run against files; returns exit code ---
function runFiles(htmlPath, transcriptPath) {
  const html = readFileSync(htmlPath, 'utf8');
  const transcript = readFileSync(transcriptPath, 'utf8');
  const { passed, failed, failures } = checkCitations(html, transcript);
  for (const f of failures) console.log(f);
  console.log(`check-citations: ${passed} passed, ${failed} failed`);
  return failed === 0 ? 0 : 1;
}

// --- selftest ---
function selftest() {
  const dir = mkdtempSync(join(tmpdir(), 'check-citations-'));
  const transcript =
    'So the thing that really frustrated me about the old onboarding flow was how many steps it took before you saw any value at all.';
  const transcriptPath = join(dir, 'transcript.refined.txt');
  writeFileSync(transcriptPath, transcript, 'utf8');

  // verbatim >=40-char substring of the transcript
  const goodQuote = 'how many steps it took before you saw any value at all';

  const cases = [];

  // PASS fixture
  cases.push({
    name: 'PASS',
    expect: 0,
    html: `<html><body>
      <p><cite data-cite-tier="transcript">${goodQuote}</cite></p>
      <p><cite data-cite-tier="notes" data-source="Recruiter screen notes">candidate seemed nervous early on</cite></p>
      <p><span data-cite-tier="recalled" data-source="My recollection">they mentioned a prior outage</span></p>
    </body></html>`,
  });

  // FAIL A: transcript cite text NOT in transcript
  cases.push({
    name: 'FAIL-A (not-in-transcript)',
    expect: 1,
    html: `<html><body>
      <cite data-cite-tier="transcript">this exact sentence never appears anywhere in the transcript file</cite>
    </body></html>`,
  });

  // FAIL B: transcript cite < 40 chars
  cases.push({
    name: 'FAIL-B (too-short)',
    expect: 1,
    html: `<html><body>
      <cite data-cite-tier="transcript">how many steps</cite>
    </body></html>`,
  });

  // FAIL C: notes cite missing data-source
  cases.push({
    name: 'FAIL-C (notes-no-source)',
    expect: 1,
    html: `<html><body>
      <cite data-cite-tier="notes">candidate seemed nervous</cite>
    </body></html>`,
  });

  const selfPath = fileURLToPath(import.meta.url);
  let pass = 0;
  for (const tc of cases) {
    const htmlPath = join(dir, `case-${tc.name.replace(/[^\w]+/g, '_')}.html`);
    writeFileSync(htmlPath, tc.html, 'utf8');
    const res = spawnSync(process.execPath, [selfPath, htmlPath, transcriptPath], {
      encoding: 'utf8',
    });
    const code = res.status;
    if (code === tc.expect) {
      pass++;
    } else {
      console.error(
        `selftest case ${tc.name}: expected exit ${tc.expect}, got ${code}`
      );
      console.error(res.stdout);
    }
  }

  const total = cases.length;
  if (pass === total) {
    console.log(`check-citations selftest: ${pass}/${total} PASS`);
    return 0;
  }
  console.error(`check-citations selftest: ${pass}/${total} PASS (FAILED)`);
  return 1;
}

// --- main ---
const args = process.argv.slice(2);
if (args[0] === '--selftest') {
  process.exit(selftest());
} else if (args.length === 2) {
  process.exit(runFiles(args[0], args[1]));
} else {
  console.error(
    'Usage: node check-citations.mjs <output.html> <transcript.refined.txt>\n' +
      '       node check-citations.mjs --selftest'
  );
  process.exit(2);
}
