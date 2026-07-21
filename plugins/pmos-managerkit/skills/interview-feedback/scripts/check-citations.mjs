#!/usr/bin/env node
// check-citations.mjs — grounding-integrity gate for /interview-feedback (design §16.4)
//
// Usage:
//   node check-citations.mjs [--stamp] <output.html> <transcript.refined.txt> [<submission.txt>]
//   node check-citations.mjs --selftest
//
// --stamp: on a PASSING gate only, write the proof-of-pass comment
//   <!-- citations verified: N transcript-tier, M notes-tier[, K submission-tier], YYYY-MM-DD -->
// into the target HTML, using the counts this script already computed. Idempotent: an existing
// comment is replaced in place, never appended to. A failing gate leaves the file untouched.
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

const KNOWN_TIERS = new Set(['transcript', 'notes', 'recalled', 'submission']);
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

// --- core check; returns { passed, failed, failures, byTier } ---
// `submission` is the written-submission text (or null when none was provided);
// a data-cite-tier="submission" citation is verified as a verbatim >=40-char
// substring of it with the SAME normalize() the transcript tier uses.
function checkCitations(html, transcript, submission) {
  const cites = parseCitations(html);
  const normTranscript = normalize(transcript);
  const normSubmission = submission == null ? null : normalize(submission);
  const failures = [];
  let passed = 0;
  const byTier = { transcript: 0, notes: 0, recalled: 0, submission: 0 };

  for (const c of cites) {
    const head = normalize(c.text).slice(0, 60);
    const tier = c.tier;

    if (!KNOWN_TIERS.has(tier)) {
      failures.push(
        `[tier=${tier === null ? '<missing>' : tier}] "${head}" — unknown data-cite-tier value`
      );
      continue;
    }

    if (tier === 'transcript' || tier === 'submission') {
      const isSub = tier === 'submission';
      const norm = isSub ? normSubmission : normTranscript;
      if (isSub && norm === null) {
        failures.push(
          `[tier=submission] "${head}" — submission-tier citation but no submission file was provided`
        );
        continue;
      }
      const normText = normalize(c.text);
      if (normText.length < MIN_TRANSCRIPT_LEN) {
        failures.push(
          `[tier=${tier}] "${head}" — quote is ${normText.length} chars (<${MIN_TRANSCRIPT_LEN} required)`
        );
        continue;
      }
      if (!norm.includes(normText)) {
        failures.push(
          `[tier=${tier}] "${head}" — not a verbatim substring of the ${isSub ? 'submission' : 'transcript'}`
        );
        continue;
      }
      passed++;
      byTier[tier]++;
    } else {
      // notes | recalled
      if (c.source === null || c.source.trim() === '') {
        failures.push(
          `[tier=${tier}] "${head}" — missing/empty data-source attribute`
        );
        continue;
      }
      passed++;
      byTier[tier]++;
    }
  }

  return { passed, failed: failures.length, failures, byTier };
}

// --- proof-of-pass stamp (FR-10) ---
// The gate already computes the per-tier counts; it now also OWNS writing them, so no human or
// model ever transcribes a number that can go stale (§K: one fact, one home).

// Matches an existing proof comment plus its trailing newline, so a replace is byte-stable.
const STAMP_RE = /[ \t]*<!--\s*citations verified:[\s\S]*?-->\n?/;

function localDate() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function buildStamp(byTier) {
  let s = `citations verified: ${byTier.transcript} transcript-tier, ${byTier.notes} notes-tier`;
  if (byTier.submission > 0) s += `, ${byTier.submission} submission-tier`;
  return `<!-- ${s}, ${localDate()} -->`;
}

// Write/replace the comment in the target HTML. Called ONLY on a passing gate.
function stampFile(htmlPath, byTier) {
  const html = readFileSync(htmlPath, 'utf8');
  const comment = buildStamp(byTier);
  let next;
  if (STAMP_RE.test(html)) {
    next = html.replace(STAMP_RE, () => comment + '\n');
  } else if (/<\/body>/i.test(html)) {
    // Keep the closing tag's own indentation and put the comment at column 0, so run 2 — where
    // STAMP_RE consumes `[ \t]*<!--…-->\n` — reproduces run 1 byte for byte (AC4).
    next = html.replace(/([ \t]*)<\/body>/i, (_, indent) => comment + '\n' + indent + '</body>');
  } else {
    next = html + (html.endsWith('\n') ? '' : '\n') + comment + '\n';
  }
  if (next !== html) writeFileSync(htmlPath, next, 'utf8');
  return comment;
}

// --- run against files; returns exit code ---
// Usage: runFiles(html, transcript[, submission], { stamp }) — submission optional.
function runFiles(htmlPath, transcriptPath, submissionPath, opts = {}) {
  // An unreadable input is an operator error, not a crash: exit 2 with the offending path, the
  // same shape --no-transcript uses for a refused declaration. A stack trace here reads as a
  // broken gate and invites working around it; a named path says which argument to fix.
  let html, transcript, submission;
  try {
    html = readFileSync(htmlPath, 'utf8');
    transcript = readFileSync(transcriptPath, 'utf8');
    submission = submissionPath ? readFileSync(submissionPath, 'utf8') : null;
  } catch (err) {
    console.error(`check-citations: cannot read ${err.path ?? 'input'} (${err.code ?? err.message})`);
    return 2;
  }
  const { passed, failed, failures, byTier } = checkCitations(html, transcript, submission);
  for (const f of failures) console.log(f);
  console.log(`check-citations: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    // Visible per-tier pass line (FR-5.1); submission count only when present.
    let line = `✓ citations: ${byTier.transcript} transcript, ${byTier.notes} notes`;
    if (byTier.submission > 0) line += `, ${byTier.submission} submission`;
    console.log(line);
    // Proof-of-pass is written here and nowhere else — inside the exit-0 branch, so a failing
    // gate never WRITES a stamp. It does not erase one either: per AC5 a failing run leaves the
    // file untouched. A stamp from an earlier passing run can therefore outlive the edit that
    // broke it, and is only refreshed by the next passing run. That is safe only because
    // the gate is a hard STOP — SKILL.md#score forbids presenting the artifact while the gate is
    // non-zero, so a stale stamp is never on a presented artifact.
    if (opts.stamp) console.log(`stamped: ${stampFile(htmlPath, byTier)}`);
  }
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

  // written submission fixture + a verbatim >=40-char substring of it
  const submission =
    'In the take-home I proposed a staged rollout: ship the read-only viewer first, then layer in write access behind a feature flag once retention holds.';
  const submissionPath = join(dir, 'submission.txt');
  writeFileSync(submissionPath, submission, 'utf8');
  const goodSubQuote = 'ship the read-only viewer first, then layer in write access behind a feature flag';

  const cases = [];

  // PASS fixture
  cases.push({
    name: 'PASS',
    expect: 0,
    stdoutIncludes: '✓ citations: 1 transcript, 1 notes',
    html: `<html><body>
      <p><cite data-cite-tier="transcript">${goodQuote}</cite></p>
      <p><cite data-cite-tier="notes" data-source="Recruiter screen notes">candidate seemed nervous early on</cite></p>
      <p><span data-cite-tier="recalled" data-source="My recollection">they mentioned a prior outage</span></p>
    </body></html>`,
  });

  // PASS: cites living INSIDE the work-history role-evidence + trajectory-synthesis
  // families are scored exactly like any other citation (the gate is container-agnostic
  // — it must cover the additive work-history sections, not just competency dims).
  cases.push({
    name: 'PASS-work-history-containers',
    expect: 0,
    stdoutIncludes: '✓ citations: 2 transcript, 0 notes',
    html: `<html><body>
      <section data-card="role-evidence" data-role="1">
        <div data-input="role:result"><cite data-cite-tier="transcript">${goodQuote}</cite></div>
      </section>
      <section data-card="trajectory-synthesis">
        <div data-input="trajectory:scope-arc"><cite data-cite-tier="transcript">${goodQuote}</cite></div>
      </section>
    </body></html>`,
  });

  // PASS with a verbatim submission-tier citation (3rd positional provided)
  cases.push({
    name: 'PASS-submission',
    expect: 0,
    submission: true,
    stdoutIncludes: '✓ citations: 1 transcript, 0 notes, 1 submission',
    html: `<html><body>
      <p><cite data-cite-tier="transcript">${goodQuote}</cite></p>
      <p><cite data-cite-tier="submission">${goodSubQuote}</cite></p>
    </body></html>`,
  });

  // FAIL D: submission-tier citation but NO submission file provided
  cases.push({
    name: 'FAIL-D (submission-no-file)',
    expect: 1,
    html: `<html><body>
      <cite data-cite-tier="submission">${goodSubQuote}</cite>
    </body></html>`,
  });

  // FAIL E: submission-tier citation not verbatim in the submission
  cases.push({
    name: 'FAIL-E (submission-not-verbatim)',
    expect: 1,
    submission: true,
    html: `<html><body>
      <cite data-cite-tier="submission">this exact phrasing never appears in the submission file at all</cite>
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
    const argv = [selfPath, htmlPath, transcriptPath];
    if (tc.submission) argv.push(submissionPath);
    const res = spawnSync(process.execPath, argv, { encoding: 'utf8' });
    const code = res.status;
    const stdoutOk =
      tc.stdoutIncludes == null || (res.stdout || '').includes(tc.stdoutIncludes);
    if (code === tc.expect && stdoutOk) {
      pass++;
    } else {
      if (code !== tc.expect) {
        console.error(
          `selftest case ${tc.name}: expected exit ${tc.expect}, got ${code}`
        );
      }
      if (!stdoutOk) {
        console.error(
          `selftest case ${tc.name}: stdout missing "${tc.stdoutIncludes}"`
        );
      }
      console.error(res.stdout);
    }
  }

  // --- --stamp fixtures (FR-10) ---
  // Reuse the PASS/FAIL-A bodies so the stamp path is exercised against the same gate semantics.
  const passHtml = cases[0].html;
  const failHtml = cases.find((c) => c.name.startsWith('FAIL-A')).html;
  const run = (p, ...extra) =>
    spawnSync(process.execPath, [selfPath, ...extra, p, transcriptPath], { encoding: 'utf8' });

  // stamp-insert: no prior comment -> exactly one written, carrying the script's own counts.
  const sIns = join(dir, 'stamp-insert.html');
  writeFileSync(sIns, passHtml, 'utf8');
  run(sIns, '--stamp');
  const inserted = readFileSync(sIns, 'utf8');
  const stampCount = (s) => (s.match(/citations verified:/g) || []).length;
  if (
    stampCount(inserted) === 1 &&
    /<!-- citations verified: 1 transcript-tier, 1 notes-tier, \d{4}-\d{2}-\d{2} -->/.test(inserted)
  ) {
    pass++;
  } else {
    console.error('selftest stamp-insert: comment missing, duplicated, or malformed');
  }

  // stamp-replace: a prior comment is replaced IN PLACE; a same-day re-run is byte-identical.
  const sRep = join(dir, 'stamp-replace.html');
  writeFileSync(
    sRep,
    passHtml.replace('</body>', '<!-- citations verified: 99 transcript-tier, 99 notes-tier, 1999-01-01 -->\n</body>'),
    'utf8'
  );
  run(sRep, '--stamp');
  const replacedOnce = readFileSync(sRep, 'utf8');
  run(sRep, '--stamp');
  const replacedTwice = readFileSync(sRep, 'utf8');
  if (
    stampCount(replacedOnce) === 1 &&
    !replacedOnce.includes('99 transcript-tier') &&
    replacedTwice === replacedOnce
  ) {
    pass++;
  } else {
    console.error('selftest stamp-replace: not replaced in place, or not idempotent');
  }

  // no-stamp-on-failure: a failing gate must leave the file byte-untouched.
  const sFail = join(dir, 'stamp-on-failure.html');
  writeFileSync(sFail, failHtml, 'utf8');
  const failRes = run(sFail, '--stamp');
  if (failRes.status === 1 && readFileSync(sFail, 'utf8') === failHtml) {
    pass++;
  } else {
    console.error('selftest no-stamp-on-failure: failing gate wrote to the target file');
  }

  const total = cases.length + 3;
  if (pass === total) {
    console.log(`check-citations selftest: ${pass}/${total} PASS`);
    return 0;
  }
  console.error(`check-citations selftest: ${pass}/${total} PASS (FAILED)`);
  return 1;
}

// --- main ---
const rawArgs = process.argv.slice(2);
const stamp = rawArgs.includes('--stamp');
const args = rawArgs.filter((a) => a !== '--stamp');
if (args[0] === '--selftest') {
  process.exit(selftest());
} else if (args.length === 2 || args.length === 3) {
  process.exit(runFiles(args[0], args[1], args[2], { stamp }));
} else {
  console.error(
    'Usage: node check-citations.mjs [--stamp] <output.html> <transcript.refined.txt> [<submission.txt>]\n' +
      '       node check-citations.mjs --selftest'
  );
  process.exit(2);
}
