#!/usr/bin/env node
// check-scoring-calibration.mjs — scoring-calibration gate for /interview-feedback (design D3, D7, D10).
//
// The SECOND blocking STOP-before-done gate, run alongside check-citations.mjs. That gate proves a
// quote is real; this one proves the score follows from the evidence at the sheet's own bar. Both
// must exit 0 before a filled scorecard is presented or a run declares done.
//
// Usage:
//   node check-scoring-calibration.mjs <filled-scorecard.html> [--no-transcript]
//   node check-scoring-calibration.mjs --selftest
//
// Exit: 0 all gates pass · 1 one or more failures · 2 usage/read error, or a --no-transcript
// declaration contradicted by a transcript sitting beside the scorecard.
//
// The four gates (design D3) — every hard condition is presence, ordering, or an integer comparison
// THIS SCRIPT performs. Nothing here is a self-graded verdict the model can satisfy by stamping a
// token without reading (that shape was rejected as a ritual — D10):
//
//   1. EVIDENCE SWEEP        every scored dimension carries <details data-card="evidence-sweep">
//                            with >=1 timestamped instance (a <li data-t="…">), each citing a
//                            tier check-citations.mjs verifies verbatim (see VERIFIED_CITE_TIERS
//                            and the notes-only carve-out below).
//                            "Present BEFORE a score exists" is enforced as an IMPLICATION, not as
//                            document order: D9 places the sweep under the dimension's notes, i.e.
//                            AFTER the scale in the DOM, so document order would contradict the
//                            layout. A score may not exist without its sweep — that is the check.
//   2. ADVERSARIAL BELOW-BAR every dimension scored below its at-bar level carries a non-empty
//                            data-rebuttal. The at-bar level is DERIVED FROM THE SHEET's own scale
//                            (see atBarLevel), never hardcoded to 3.
//   3. NOTE-VS-SCORE         data-note-matches-level parsed as an INTEGER and compared to the
//                            selected data-v. Equal -> pass. Unequal -> a non-empty
//                            data-score-rationale is required; present -> pass, absent -> fail.
//                            A mismatch is NOT a hard failure by design: it is sometimes legitimate
//                            (a red flag drags the number below what the prose alone implies), and
//                            hard-failing it would create a direct incentive to rewrite the note to
//                            match the number — destroying the exact signal this gate reads.
//   4. RECO-VS-MODAL         this script computes the modal and weighted scores and the
//      + COVERAGE            untested-weight-%; on band-vs-reco disagreement, or at/above the
//                            untested-coverage threshold, a non-empty data-reco-rationale is
//                            required. ALL arithmetic is the script's, never the model's (§H, INV-2).
//
// Zero-dependency, Node built-ins only. Local and offline, like its siblings (INV-5).

import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The untested-coverage threshold, as a PERCENT of total dimension weight.
//
// This is a PROPOSAL, not a calibration — no real round has been measured against it (design,
// "Open questions"). It lives here as one named constant precisely so it is trivially tunable
// after first use. Do not inline this number anywhere else.
const UNTESTED_COVERAGE_THRESHOLD_PCT = 30;

// The citation tiers check-citations.mjs actually VERIFIES verbatim. `notes` and `recalled`
// are legal tiers there but exempt from the substring check, so they cannot ground a sweep
// instance — see the evidence-sweep parse below. Kept in sync by hand with that script's
// KNOWN_TIERS; it is byte-frozen (INV-3), so this set is deliberately read-only knowledge
// about it rather than an import.
const VERIFIED_CITE_TIERS = new Set(['transcript', 'submission']);

// The tier-2 (notes-only) carve-out. SKILL.md Phase Ground documents three grounding tiers,
// and a round with no recording and no transcript — graded from the interviewer's own written
// notes — is an explicitly supported, unattended-safe path. Such a round can never produce a
// transcript-tier citation, so holding it to VERIFIED_CITE_TIERS would not make it honest; it
// would make the gate unpassable and take the whole documented path offline.
//
// The downgrade is therefore available, but it is DECLARED, not inferred: the caller passes
// --no-transcript. An earlier revision inferred it from the filesystem (no transcript beside
// the scorecard -> relax), which was worse than it looked: it made the accepted-tier set a
// function of WHERE the gate ran, so copying the sheet to an empty directory and re-running
// the identical command silently bought the weaker set. A relaxation nobody has to ask for is
// one nobody can see.
//
// The declaration is CORROBORATED, not trusted: --no-transcript is REFUSED when a transcript
// is found near the scorecard (see findTranscriptNear — deliberately greedy about names and
// one level of nesting, because the two error directions are not symmetric). That kills the
// honest-mistake case (a caller that passes the flag by habit in a real transcript round fails
// loudly) without pretending the flag is unforgeable.
//
// What remains, named in SKILL.md next to the other residuals: the veto reads the filesystem
// around the artifact it was handed, so a caller who puts the sheet somewhere the transcript
// is not — and declares the downgrade — can still launder a fabricated sheet. No gate that
// reads only the files it is handed can defeat a caller who chooses what to hand it; that is
// the operator's sight of the round folder and the reviewer's job, not this script's.
//
// `recalled` is accepted at NEITHER setting: it is a recollection, not a timestamped moment,
// and its questionnaire path is interactive-only by contract.
const NOTES_ONLY_CITE_TIERS = new Set([...VERIFIED_CITE_TIERS, 'notes']);

// What counts as "a transcript is present" for the purpose of VETOING a --no-transcript
// declaration. Deliberately much wider than the two canonical names in SKILL.md § Storage
// (transcript.refined.txt, transcript.whisper.txt), because the two error directions here
// are not symmetric:
//
//   false POSITIVE — a stray transcript-ish file vetoes an honest tier-2 run. Loud, exit 2,
//                    names the file, and the operator fixes it in seconds.
//   false NEGATIVE — a real transcript goes unseen and a fabricated sheet passes. Silent.
//
// So the veto is greedy in all three directions an earlier revision was narrow in:
//   NAME  — "transcript" anywhere in the filename, not just as a prefix. Real tools produce
//           raw_transcript.txt and zoom-2024-06-01-transcript.vtt, neither of which starts
//           with the word.
//   DEPTH — three levels up, not one. The round folder nests under the role folder, which
//           nests under the storage root (SKILL.md § Storage), so a transcript can sit
//           legitimately above a scorecard written into a sub-folder of its round.
//   CASE  — matched case-insensitively.
// Each widening trades a cheap, loud false veto for a silent false negative. That is the
// whole asymmetry argument above; take it as far as it goes.
const TRANSCRIPT_FILE_RE = /transcript.*\.(txt|md|vtt|srt|json)$/i;
const TRANSCRIPT_SEARCH_DEPTH = 3;

// Every path where a transcript would veto a --no-transcript declaration, nearest first.
function findTranscriptNear(scorecardPath) {
  let dir = dirname(scorecardPath);
  for (let i = 0; i < TRANSCRIPT_SEARCH_DEPTH; i++) {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return null; // unreadable directory is not evidence of a transcript
    }
    const hit = entries.find((e) => TRANSCRIPT_FILE_RE.test(e));
    if (hit) return join(dir, hit);
    const parent = dirname(dir);
    if (parent === dir) break; // filesystem root
    dir = parent;
  }
  return null;
}

// A reco value that explicitly declines to make a call on partial coverage. The bundled skeleton's
// reco control offers strong-yes|yes|no|strong-no only, so in practice a high-untested run defends
// its call with data-reco-rationale; a sheet that does offer this option satisfies the gate with it.
const INSUFFICIENT_EVIDENCE_RECO = 'insufficient-evidence';

// --- attribute helpers (tolerant of attribute order; single or double quotes) ---

function getAttr(tagText, name) {
  const m = tagText.match(new RegExp('\\b' + name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\')', 'i'));
  if (!m) return null;
  return m[2] !== undefined ? m[2] : m[3];
}

function hasBareAttr(tagText, name) {
  return new RegExp('(?:^|\\s)' + name + '(?=[\\s/>]|$)').test(tagText);
}

function decodeEntities(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

// Non-empty means non-empty AFTER decoding and trimming — "   " is absent, not present.
function present(v) {
  return v != null && decodeEntities(v).trim() !== '';
}

// Find the index just past the matching close tag for the element starting at openTagStart.
function matchElementEnd(html, openTagStart, tag) {
  const openRe = new RegExp('<' + tag + '(?=[\\s/>])', 'g');
  const closeRe = new RegExp('</' + tag + '\\s*>', 'g');
  let cursor = html.indexOf('>', openTagStart);
  if (cursor < 0) return -1;
  cursor += 1;
  let depth = 1;
  while (depth > 0) {
    openRe.lastIndex = cursor;
    closeRe.lastIndex = cursor;
    const o = openRe.exec(html);
    const c = closeRe.exec(html);
    if (!c) return -1;
    if (o && o.index < c.index) {
      depth += 1;
      cursor = o.index + 1;
    } else {
      depth -= 1;
      cursor = c.index + c[0].length;
    }
  }
  return cursor;
}

// --- parse ---

// The at-bar (pass) level for a dimension, derived from that dimension's OWN scale options:
// the midpoint of the scale, rounded up. A 1-4 scale gives 3 ("solid, some prompting OK"),
// a 1-5 gives 3, a 1-3 gives 2. Read from the sheet so a non-1-4 scale is handled correctly
// rather than being silently measured against a hardcoded 3.
function atBarLevel(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return Math.ceil((min + max) / 2);
}

function parseDimensions(html, verifiedTiers) {
  const dims = [];
  const re = /<section\b[^>]*\bdata-dim\s*=\s*"([^"]*)"[^>]*>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const openTag = m[0];
    const end = matchElementEnd(html, m.index, 'section');
    const block = html.slice(m.index, end < 0 ? html.length : end);

    // Scale options, with the selected one flagged.
    const options = [];
    const optRe = /<[a-zA-Z][^>]*\bdata-v\s*=\s*"([^"]*)"[^>]*>/g;
    let o;
    while ((o = optRe.exec(block)) !== null) {
      options.push({ v: Number(o[1]), selected: hasBareAttr(o[0], 'data-selected') });
    }
    const chosen = options.find((x) => x.selected);

    // Evidence sweep: the block, its timestamped instances, and how many of those are
    // grounded. Counting bare <li data-t> alone would make this gate a presence costume —
    // a model could satisfy it with invented timestamps it never read.
    //
    // Requiring a citation is necessary but NOT sufficient: check-citations.mjs verifies
    // only the `transcript` and `submission` tiers verbatim; `notes` and `recalled` are
    // exempt by design (they need a non-empty data-source and nothing more). A sweep
    // instance tagged `notes` therefore passes both gates while being entirely invented —
    // the exact anti-ritual hole this gate exists to close, entered through the tier side
    // door. So an instance must cite a VERIFIED tier. That is also the honest shape: a
    // swept instance is a timestamped moment in the transcript (or in the written
    // submission), never a recollection.
    //
    // Two things this still cannot prove, both named residuals rather than silent ones:
    //
    //   COMPLETENESS — that the sweep found every instance rather than the first one. No
    //   presence check can; that half of clause (a) rests on the method.
    //
    //   RELEVANCE — that the quote supports the claim made about it. A real, verbatim
    //   transcript span can be paired with fabricated interpretive prose ("quote
    //   laundering"): the citation verifies, the reading of it does not. So the honest
    //   form of the anti-ritual property is narrower than "faking the sweep means faking a
    //   quote" — it is "faking the sweep means COPYING a real quote, and the sheet then
    //   shows the grader exactly which span the number is claimed to rest on." Judging
    //   quote-against-claim is not script-checkable (§H) and stays with the reviewer.
    //
    //   A lexical-overlap floor (quote and note must share N non-stopword tokens) was
    //   proposed for the crude form and is deliberately NOT built. A good note PARAPHRASES:
    //   "walked through the consistency implications" citing "if two replicas disagree we'd
    //   need a tiebreak" shares almost no tokens and is excellent grounding. Such a check
    //   would fail honest analytical prose and pass keyword-padded fabrication — and it
    //   would pressure the author to copy transcript words into the note, the same
    //   rewrite-to-match pathology gate 3 exists to refuse. Wrong-direction incentive, so
    //   the floor stays where a script can hold it honestly.
    let sweepInstances = null;
    let sweepUngrounded = 0;
    const sweepRe = /<details\b[^>]*\bdata-card\s*=\s*"evidence-sweep"[^>]*>/;
    const sm = block.match(sweepRe);
    if (sm) {
      const sEnd = matchElementEnd(block, sm.index, 'details');
      const sweepBlock = block.slice(sm.index, sEnd < 0 ? block.length : sEnd);
      const items = [];
      const liRe = /<li\b[^>]*\bdata-t\s*=\s*"[^"]*"[^>]*>/g;
      let li;
      while ((li = liRe.exec(sweepBlock)) !== null) {
        if (!present(getAttr(li[0], 'data-t'))) continue;
        const liEnd = matchElementEnd(sweepBlock, li.index, 'li');
        const liBlock = sweepBlock.slice(li.index, liEnd < 0 ? sweepBlock.length : liEnd);
        const tiers = [...liBlock.matchAll(/\bdata-cite-tier\s*=\s*"([^"]*)"/g)].map((t) => t[1]);
        items.push(tiers.some((t) => verifiedTiers.has(t)));
      }
      sweepInstances = items.length;
      sweepUngrounded = items.filter((grounded) => !grounded).length;
    }

    const weightRaw = getAttr(openTag, 'data-weight');
    const levelRaw = getAttr(openTag, 'data-note-matches-level');

    dims.push({
      id: m[1],
      weight: weightRaw == null ? null : Number(weightRaw),
      options: options.map((x) => x.v),
      selected: chosen ? chosen.v : null,
      untested: hasBareAttr(openTag, 'data-untested'),
      noteMatchesLevel: levelRaw == null || levelRaw.trim() === '' ? null : Number(levelRaw),
      noteMatchesLevelRaw: levelRaw,
      scoreRationale: getAttr(openTag, 'data-score-rationale'),
      rebuttal: getAttr(openTag, 'data-rebuttal'),
      hasSweep: sm != null,
      sweepInstances,
      sweepUngrounded,
    });
  }
  return dims;
}

function parseRoot(html) {
  const m = html.match(/<main\b[^>]*\bdata-card\s*=\s*"scorecard"[^>]*>/);
  const openTag = m ? m[0] : '';
  let reco = null;
  const recoRe = /<[a-zA-Z][^>]*\bdata-reco\s*=\s*"([^"]*)"[^>]*>/g;
  let r;
  while ((r = recoRe.exec(html)) !== null) {
    if (hasBareAttr(r[0], 'data-selected')) reco = r[1];
  }
  return {
    found: m != null,
    reco,
    recoRationale: getAttr(openTag, 'data-reco-rationale'),
    rubricProvenance: getAttr(openTag, 'data-rubric-provenance'),
  };
}

// --- arithmetic (§H: the script's, never the model's) ---

// Scored dimensions are those carrying a selection and NOT tagged untested.
// Untested dimensions leave the denominator entirely and the remaining weights renormalize,
// so the weighted score is always expressed on the scale's own units over the scored set.
// They are NOT scored neutral — inventing a number for absent evidence violates INV-4.
function computeScores(dims) {
  const scored = dims.filter((d) => !d.untested && d.selected != null);
  const untested = dims.filter((d) => d.untested);

  const totalWeight = dims.reduce((a, d) => a + (d.weight || 0), 0);
  const untestedWeight = untested.reduce((a, d) => a + (d.weight || 0), 0);
  const untestedWeightPct = totalWeight > 0 ? (untestedWeight / totalWeight) * 100 : 0;

  // Renormalized weighted mean over the scored set. Missing weights count as 0 weight;
  // if no scored dimension carries a weight, fall back to an unweighted mean so a
  // weightless sheet still produces a band rather than NaN.
  const scoredWeight = scored.reduce((a, d) => a + (d.weight || 0), 0);
  let weighted = null;
  if (scored.length > 0) {
    weighted =
      scoredWeight > 0
        ? scored.reduce((a, d) => a + (d.weight || 0) * d.selected, 0) / scoredWeight
        : scored.reduce((a, d) => a + d.selected, 0) / scored.length;
  }

  // Modal score; ties resolve to the LOWEST tied value (deterministic, and the
  // conservative read when a round is genuinely split).
  let modal = null;
  if (scored.length > 0) {
    const counts = new Map();
    for (const d of scored) counts.set(d.selected, (counts.get(d.selected) || 0) + 1);
    let best = -Infinity;
    for (const [v, c] of counts) {
      if (c > best || (c === best && v < modal)) {
        best = c;
        modal = v;
      }
    }
  }

  return {
    scored,
    untested,
    totalWeight,
    untestedWeight,
    untestedWeightPct,
    weighted,
    modal,
  };
}

// Map a weighted score onto a reco band, using the sheet's own scale rather than
// fixed cutoffs: at-bar and above is a yes, a full level below at-bar is a no.
function recoBand(weighted, allOptions) {
  if (weighted == null || allOptions.length === 0) return null;
  const bar = atBarLevel(allOptions);
  const max = Math.max(...allOptions);
  if (weighted >= max - 0.5) return 'strong-yes';
  if (weighted >= bar) return 'yes';
  if (weighted >= bar - 1) return 'no';
  return 'strong-no';
}

// --- the gates ---

// `opts.transcriptPresent` selects the accepted-tier set (see NOTES_ONLY_CITE_TIERS). It
// defaults to TRUE — the strict set — so any caller that forgets to probe the filesystem
// gets the safe reading rather than the permissive one.
function checkCalibration(rawHtml, opts = {}) {
  const transcriptPresent = opts.transcriptPresent !== false;
  const verifiedTiers = transcriptPresent ? VERIFIED_CITE_TIERS : NOTES_ONLY_CITE_TIERS;
  // Strip HTML comments before parsing. The scorecard skeleton's contract comment DOCUMENTS
  // the anchors by quoting the tags verbatim, and check-citations.mjs appends an audit comment
  // — a comment-blind parse reads that prose as if it were the sheet. No scoring anchor ever
  // legitimately lives inside a comment, so this can only remove phantoms.
  const html = rawHtml.replace(/<!--[\s\S]*?-->/g, '');
  const failures = [];
  const dims = parseDimensions(html, verifiedTiers);
  const root = parseRoot(html);

  if (dims.length === 0) {
    return {
      failures: ['no <section data-dim> found — this does not look like an anchored scorecard'],
      dims,
      stats: null,
    };
  }

  // Notes-only rounds: assume the citation gate did NOT run over this sheet. It cannot — its
  // documented invocation takes the transcript as a required positional, and a round that has
  // no transcript has nothing to hand it (feeding it a placeholder file would buy a green line
  // with a dummy, which is the ritual shape this whole gate exists to refuse). So the two
  // checks that gate would still have been making here are made here instead:
  if (!transcriptPresent) {
    //   (i) a TRANSCRIPT-tier citation is a lie by construction in a round with no transcript.
    //       `submission` is NOT included: a written submission's existence is independent of
    //       whether the live portion was ever transcribed, so a notes-graded round can hold a
    //       genuine submission-tier quote. Those are still verified verbatim — SKILL.md routes
    //       such a round through check-citations.mjs with the submission file.
    const bogus = [...html.matchAll(/\bdata-cite-tier\s*=\s*"transcript"/g)];
    if (bogus.length > 0) {
      failures.push(
        `--no-transcript declared, but the sheet carries ${bogus.length} "transcript"-tier citation(s) — a round with no transcript cannot have quoted one, and nothing verified these verbatim`
      );
    }
    //   (ii) a notes-tier citation still owes a non-empty data-source (check-citations.mjs's
    //        own rule for the exempt tiers — the one thing it checks that still applies).
    const sourceless = [...html.matchAll(/<cite\b[^>]*>/g)].filter(
      (c) => getAttr(c[0], 'data-cite-tier') != null && !present(getAttr(c[0], 'data-source'))
    );
    if (sourceless.length > 0) {
      failures.push(
        `--no-transcript declared, but ${sourceless.length} <cite> element(s) carry a tier with no non-empty data-source — name the notes the claim rests on`
      );
    }
  }

  for (const d of dims) {
    const isScored = d.selected != null && !d.untested;

    // A dimension cannot be both tagged untested and carry a score — that is a
    // contradiction the denominator arithmetic would silently resolve one way.
    if (d.untested && d.selected != null) {
      failures.push(
        `dimension "${d.id}" is tagged data-untested but also carries a selected score (${d.selected}) — an untested competency is tagged, never scored`
      );
    }

    // ...and it cannot be NEITHER. A dimension with no score and no data-untested tag is
    // the forgotten dimension: it skips gates 1-3 (they only fire on a scored dim) and its
    // weight leaves BOTH the scored and the untested totals, silently shrinking the
    // denominator and inflating the weighted score — the exact defect class this gate
    // exists to close (D7). Forgetting must be distinguishable from deliberately untested,
    // so the arithmetic below never runs on a partial sheet.
    if (!d.untested && d.selected == null) {
      failures.push(
        `dimension "${d.id}" is neither scored nor tagged data-untested — every dimension must resolve to one or the other before the weighted score means anything`
      );
    }

    // Gate 1 — evidence sweep.
    if (isScored) {
      if (!d.hasSweep) {
        failures.push(
          `dimension "${d.id}" is scored (${d.selected}) with no <details data-card="evidence-sweep"> block — sweep the whole transcript before assigning a number`
        );
      } else if (!d.sweepInstances) {
        failures.push(
          `dimension "${d.id}" has an evidence-sweep block with no timestamped instance (expected >=1 <li data-t="…">)`
        );
      } else if (d.sweepUngrounded > 0) {
        failures.push(
          `dimension "${d.id}" has ${d.sweepUngrounded} evidence-sweep instance(s) with no accepted citation — every swept instance needs a <cite data-cite-tier="…"> in {${[...verifiedTiers].join(', ')}}` +
            (transcriptPresent
              ? `; this round has a transcript, so "notes" and "recalled" (which check-citations.mjs never verifies verbatim) cannot ground a swept instance`
              : `; this round has no transcript beside the scorecard, so the tier-2 notes carve-out is in effect and "notes" is accepted — "recalled" never is`)
        );
      }
    }

    // Gate 2 — adversarial below-bar rebuttal.
    if (isScored && d.options.length > 0) {
      const bar = atBarLevel(d.options);
      if (d.selected < bar && !present(d.rebuttal)) {
        failures.push(
          `dimension "${d.id}" is scored ${d.selected}, below its at-bar level ${bar}, with no non-empty data-rebuttal — state the strongest case it is actually at bar`
        );
      }
    }

    // Gate 3 — note-vs-score, integer comparison with rationale-on-mismatch.
    if (isScored) {
      if (d.noteMatchesLevel == null) {
        failures.push(
          `dimension "${d.id}" is scored with no data-note-matches-level — record which level's descriptor the note actually describes`
        );
      } else if (!Number.isInteger(d.noteMatchesLevel)) {
        failures.push(
          `dimension "${d.id}" has a non-integer data-note-matches-level ("${d.noteMatchesLevelRaw}")`
        );
      } else if (d.noteMatchesLevel !== d.selected && !present(d.scoreRationale)) {
        failures.push(
          `dimension "${d.id}": the note describes level ${d.noteMatchesLevel} but the score is ${d.selected}, with no non-empty data-score-rationale — name why the number departs from the prose (do not rewrite the note to match)`
        );
      }
    }
  }

  // Gate 4 — reco vs computed band, and untested coverage.
  const stats = computeScores(dims);
  const allOptions = dims.flatMap((d) => d.options);
  const band = recoBand(stats.weighted, allOptions);
  stats.band = band;

  const overThreshold = stats.untestedWeightPct >= UNTESTED_COVERAGE_THRESHOLD_PCT;
  const declined = root.reco === INSUFFICIENT_EVIDENCE_RECO;

  if (overThreshold && !declined && !present(root.recoRationale)) {
    failures.push(
      `untested dimensions carry ${stats.untestedWeightPct.toFixed(1)}% of total weight (>= ${UNTESTED_COVERAGE_THRESHOLD_PCT}% threshold) — the reco must either be "${INSUFFICIENT_EVIDENCE_RECO}" or carry a non-empty data-reco-rationale defending a call made on partial coverage`
    );
  }

  if (band != null && root.reco != null && !declined && root.reco !== band && !present(root.recoRationale)) {
    failures.push(
      `reco is "${root.reco}" but the computed weighted score ${stats.weighted.toFixed(2)} lands in band "${band}" — a disagreement needs a non-empty data-reco-rationale`
    );
  }

  return { failures, dims, stats, root };
}

// --- run ---

function runFile(path, declaredNoTranscript = false) {
  let html;
  try {
    html = readFileSync(path, 'utf8');
  } catch (e) {
    console.error(`check-scoring-calibration: cannot read ${path}: ${e.message}`);
    return 2;
  }
  // Corroborate a declared downgrade against the round folder. The scorecard's own directory
  // IS the round folder (SKILL.md § Storage), so its siblings are the whole question.
  // Refusing the flag here is the point: the filesystem cannot GRANT the relaxation (that was
  // the copy-elsewhere hole), but it can and does VETO a false declaration.
  const foundTranscript = declaredNoTranscript ? findTranscriptNear(path) : null;
  if (foundTranscript) {
    console.error(
      `check-scoring-calibration: --no-transcript declared, but ${foundTranscript} is in or above the scorecard's directory. ` +
        `This round looks like it HAS a transcript, so its evidence sweep must cite it. Drop the flag and ground the sweep — ` +
        `or, if that file is not this round's transcript, move it out of the round folder.`
    );
    return 2;
  }

  const transcriptPresent = !declaredNoTranscript;
  const { failures, dims, stats } = checkCalibration(html, { transcriptPresent });
  for (const f of failures) console.log(f);
  if (declaredNoTranscript) {
    // Announce the weaker tier set every time it applies — a downgrade the operator cannot
    // see is a downgrade they cannot challenge.
    console.log(
      'note: --no-transcript declared and no transcript found beside the scorecard — grading this as a tier-2 notes-only round, so "notes"-tier citations ground the evidence sweep'
    );
  }
  console.log(
    `check-scoring-calibration: ${dims.length} dimensions, ${failures.length} failed`
  );
  if (failures.length === 0 && stats) {
    console.log(
      `✓ calibration: weighted ${stats.weighted == null ? 'n/a' : stats.weighted.toFixed(2)}` +
        `, modal ${stats.modal == null ? 'n/a' : stats.modal}` +
        `, band ${stats.band == null ? 'n/a' : stats.band}` +
        `, untested ${stats.untested.length}/${dims.length} (${stats.untestedWeightPct.toFixed(1)}% of weight)`
    );
  }
  return failures.length === 0 ? 0 : 1;
}

// --- selftest ---

// Minimal, self-contained fixtures. Deliberately NOT coupled to story 260721-1a4's authored
// corpus content — these must keep passing whatever descriptors that story lands.
function sheet(dimsHtml, rootAttrs = '', recoValue = 'yes') {
  const recoOpts = ['strong-yes', 'yes', 'no', 'strong-no']
    .map((r) => `<span data-reco="${r}"${r === recoValue ? ' data-selected' : ''}>${r}</span>`)
    .join('');
  return `<html><body><main data-card="scorecard"${rootAttrs ? ' ' + rootAttrs : ''}>
${dimsHtml}
<section class="reco"><div data-input="reco">${recoOpts}</div></section>
</main></body></html>`;
}

function dim(opts) {
  const {
    id,
    weight = 50,
    selected = 3,
    untested = false,
    noteLevel = null,
    rationale = null,
    rebuttal = null,
    sweep = 1,
    scale = [1, 2, 3, 4],
  } = opts;
  const attrs =
    `data-dim="${id}" data-weight="${weight}"` +
    (untested ? ' data-untested' : '') +
    (noteLevel != null ? ` data-note-matches-level="${noteLevel}"` : '') +
    (rationale != null ? ` data-score-rationale="${rationale}"` : '') +
    (rebuttal != null ? ` data-rebuttal="${rebuttal}"` : '');
  const options = scale
    .map((v) => `<span data-v="${v}"${v === selected ? ' data-selected' : ''}>${v}</span>`)
    .join('');
  const sweepBlock =
    sweep === 0
      ? ''
      : sweep === 'empty'
        ? '<details data-card="evidence-sweep"><ul><li>no timestamp</li></ul></details>'
        : sweep === 'ungrounded'
          ? '<details data-card="evidence-sweep"><ul><li data-t="01:12">no citation on this instance</li></ul></details>'
        : sweep === 'notes-tier'
          ? '<details data-card="evidence-sweep"><ul><li data-t="01:12"><cite data-cite-tier="notes" data-source="interviewer notes">unverifiable tier</cite></li></ul></details>'
        : sweep === 'submission-tier'
          ? '<details data-card="evidence-sweep"><ul><li data-t="p3"><cite data-cite-tier="submission" data-source="take-home.md">a span from the written submission</cite></li></ul></details>'
        : sweep === 'notes-tier-no-source'
          ? '<details data-card="evidence-sweep"><ul><li data-t="01:12"><cite data-cite-tier="notes">no source named</cite></li></ul></details>'
        : sweep === 'recalled-tier'
          ? '<details data-card="evidence-sweep"><ul><li data-t="01:12"><cite data-cite-tier="recalled" data-source="interviewer recall">a recollection, not a moment</cite></li></ul></details>'
          : `<details data-card="evidence-sweep"><ul>${Array.from(
              { length: sweep },
              (_, i) =>
                `<li data-t="0${i}:12"><cite data-cite-tier="transcript" data-source="transcript">instance ${i}</cite></li>`
            ).join('')}</ul></details>`;
  return `<section class="dim" ${attrs}><div class="scale" data-scale="1-4">${options}</div><div data-input="notes:${id}">note</div>${sweepBlock}</section>`;
}

function selftest() {
  const dir = mkdtempSync(join(tmpdir(), 'check-scoring-calibration-'));
  const selfPath = fileURLToPath(import.meta.url);
  const cases = [];
  // Cases run in their own subdir with a transcript sibling, i.e. the strict tier set —
  // the common case, and the safe default for a fixture that says nothing about grounding.
  // `noTranscriptFile: true` omits the sibling; `flag: true` passes --no-transcript. The two
  // are INDEPENDENT on purpose: the pair that matters is "no file, no flag" (still strict —
  // relocating a sheet must buy nothing) against "no file, flag" (the carve-out).
  const add = (name, expect, html, stdoutIncludes, opts = {}) =>
    cases.push({
      name,
      expect,
      html,
      stdoutIncludes,
      noTranscriptFile: opts.noTranscriptFile === true,
      flag: opts.flag === true,
      // `extraFiles` writes arbitrary siblings (a non-canonically-named transcript);
      // `nest` puts the scorecard one directory below them (an outputs-in-a-subfolder
      // layout). Both exist to attack the veto's reach, not the gates.
      extraFiles: opts.extraFiles || null,
      nest: opts.nest === true,
    });

  // --- PASS: a well-formed two-dimension sheet ---
  add(
    'PASS-clean',
    0,
    sheet(dim({ id: 'a', selected: 3, noteLevel: 3 }) + dim({ id: 'b', selected: 3, noteLevel: 3 })),
    '✓ calibration:'
  );

  // The skeleton's contract comment documents the anchors by quoting the tags verbatim; a
  // comment-blind parse would read that prose as a real (and failing) dimension.
  add(
    'PASS-doc-comment-decoy-ignored',
    0,
    '<!--\n  data-dim contract: <section data-dim="decoy" data-weight="50">\n    <span data-v="1" data-selected></span>  and a root data-reco-rationale="prose"\n-->\n' +
      sheet(
        dim({ id: 'a', selected: 3, noteLevel: 3 }) + dim({ id: 'b', selected: 3, noteLevel: 3 })
      ),
    'check-scoring-calibration: 2 dimensions, 0 failed'
  );

  // The forgotten dimension: no score, no untested tag. Without this check it passes every
  // gate (they fire only on a scored dim) while its weight vanishes from both totals.
  add(
    'FAIL-forgotten-dimension',
    1,
    sheet(
      dim({ id: 'a', selected: 3, noteLevel: 3 }) + dim({ id: 'b', selected: null, sweep: 0 })
    ),
    'neither scored nor tagged data-untested'
  );

  // --- Gate 1: evidence sweep ---
  add(
    'FAIL-g1-no-sweep',
    1,
    sheet(dim({ id: 'a', selected: 3, noteLevel: 3, sweep: 0 }) + dim({ id: 'b', noteLevel: 3 })),
    'no <details data-card="evidence-sweep">'
  );
  add(
    'FAIL-g1-untimestamped',
    1,
    sheet(
      dim({ id: 'a', selected: 3, noteLevel: 3, sweep: 'empty' }) + dim({ id: 'b', noteLevel: 3 })
    ),
    'no timestamped instance'
  );
  // A sweep can be timestamped and still be invented — every instance must carry a citation
  // so check-citations.mjs can verify it verbatim against the transcript.
  add(
    'FAIL-g1-ungrounded-instance',
    1,
    sheet(
      dim({ id: 'a', selected: 3, noteLevel: 3, sweep: 'ungrounded' }) +
        dim({ id: 'b', noteLevel: 3 })
    ),
    'no accepted citation'
  );
  // The tier side door: `notes` is a legal citation tier that check-citations.mjs does NOT
  // verify verbatim, so a sweep grounded on it is satisfiable without reading the transcript.
  add(
    'FAIL-g1-unverifiable-tier',
    1,
    sheet(
      dim({ id: 'a', selected: 3, noteLevel: 3, sweep: 'notes-tier' }) +
        dim({ id: 'b', noteLevel: 3 })
    ),
    'cannot ground a swept instance'
  );

  // --- the tier-2 carve-out, as a MATRIX over one byte-identical notes-tier sheet ---
  //
  // The four cells below are the whole contract. Any one of them alone proves nothing: a
  // carve-out that only ever passes is a hole, and one that only ever fails is an outage.
  // Both dimensions are notes-tier: a genuine tier-2 round has no transcript for EITHER of
  // them to have quoted, which the "lie by construction" check below independently enforces.
  const notesSheet = sheet(
    dim({ id: 'a', selected: 3, noteLevel: 3, sweep: 'notes-tier' }) +
      dim({ id: 'b', noteLevel: 3, sweep: 'notes-tier' })
  );

  // (1) file present, no flag -> strict. (This is FAIL-g1-unverifiable-tier above.)
  // (2) file ABSENT, no flag -> STILL strict. The regression guard for the copy-elsewhere
  //     hole: relocating a sheet to an empty directory must buy exactly nothing, because the
  //     absence of a transcript beside the artifact is a fact about the invocation, not the
  //     round.
  add('FAIL-g1-relocated-sheet-buys-nothing', 1, notesSheet, 'no accepted citation', {
    noTranscriptFile: true,
  });

  // (3) file absent, flag declared -> the carve-out, announced on stdout.
  add('PASS-g1-notes-tier-when-declared', 0, notesSheet, 'tier-2 notes-only round', {
    noTranscriptFile: true,
    flag: true,
  });

  // (4) file PRESENT, flag declared -> refused outright (exit 2). A false declaration is not
  //     a scoring failure to be repaired, it is a lie about the round.
  add('REFUSE-flag-contradicted-by-transcript', 2, notesSheet, 'is in or above', { flag: true });

  // The veto's REACH, not just its existence. Both of these keep the scorecard exactly where
  // it belongs and vary the transcript instead — stealthier than relocating the sheet, because
  // "did you run this from inside the round folder?" cannot catch either.
  add(
    'REFUSE-flag-vs-noncanonically-named-transcript',
    2,
    notesSheet,
    'is in or above',
    { noTranscriptFile: true, flag: true, extraFiles: { 'transcript.txt': 'Interviewer: hi.\n' } }
  );
  add('REFUSE-flag-vs-transcript-one-directory-up', 2, notesSheet, 'is in or above', {
    flag: true,
    nest: true,
  });
  // The name need not START with "transcript" — real tools prefix it.
  add('REFUSE-flag-vs-prefixed-transcript-name', 2, notesSheet, 'is in or above', {
    noTranscriptFile: true,
    flag: true,
    extraFiles: { 'zoom-2026-06-01-transcript.vtt': 'WEBVTT\n' },
  });

  // A written submission's existence is INDEPENDENT of whether the live round was transcribed,
  // so submission-tier grounding is legitimate under the flag — it is not a lie by construction
  // the way a transcript-tier citation is.
  add(
    'PASS-no-transcript-with-submission-tier-cite',
    0,
    sheet(
      dim({ id: 'a', selected: 3, noteLevel: 3, sweep: 'submission-tier' }) +
        dim({ id: 'b', noteLevel: 3, sweep: 'notes-tier' })
    ),
    '✓ calibration:',
    { noTranscriptFile: true, flag: true }
  );

  // `recalled` is refused even inside the carve-out — it admits notes, not "any tier".
  add(
    'FAIL-g1-recalled-tier-even-when-declared',
    1,
    sheet(
      dim({ id: 'a', selected: 3, noteLevel: 3, sweep: 'recalled-tier' }) +
        dim({ id: 'b', noteLevel: 3, sweep: 'notes-tier' })
    ),
    'no accepted citation',
    { noTranscriptFile: true, flag: true }
  );

  // The two checks the citation gate would have made, which cannot run without a transcript.
  // A transcript-tier citation in a transcript-less round is a lie by construction…
  add(
    'FAIL-no-transcript-but-transcript-tier-cite',
    1,
    sheet(
      dim({ id: 'a', selected: 3, noteLevel: 3, sweep: 1 }) + dim({ id: 'b', noteLevel: 3 })
    ),
    'cannot have quoted one',
    { noTranscriptFile: true, flag: true }
  );

  // …and a notes-tier citation still owes the source it rests on.
  add(
    'FAIL-notes-cite-without-data-source',
    1,
    sheet(
      dim({ id: 'a', selected: 3, noteLevel: 3, sweep: 'notes-tier-no-source' }) +
        dim({ id: 'b', noteLevel: 3, sweep: 'notes-tier' })
    ),
    'no non-empty data-source',
    { noTranscriptFile: true, flag: true }
  );

  // --- Gate 2: adversarial below-bar rebuttal (at-bar is READ from the scale) ---
  add(
    'FAIL-g2-below-bar-no-rebuttal',
    1,
    sheet(dim({ id: 'a', selected: 2, noteLevel: 2 }) + dim({ id: 'b', noteLevel: 3 })),
    'below its at-bar level 3'
  );
  add(
    'PASS-g2-below-bar-with-rebuttal',
    0,
    sheet(
      dim({ id: 'a', selected: 2, noteLevel: 2, rebuttal: 'strongest case it is at bar' }) +
        dim({ id: 'b', noteLevel: 3 }),
      'data-reco-rationale="split round, defended"'
    )
  );
  // at-bar derives from the sheet: on a 1-6 scale the bar is 4, so a 3 is below bar.
  add(
    'FAIL-g2-at-bar-not-hardcoded',
    1,
    sheet(
      dim({ id: 'a', selected: 3, noteLevel: 3, scale: [1, 2, 3, 4, 5, 6] }) +
        dim({ id: 'b', noteLevel: 3, scale: [1, 2, 3, 4, 5, 6], selected: 4 }),
      'data-reco-rationale="defended"'
    ),
    'below its at-bar level 4'
  );

  // --- Gate 3: note-vs-score ---
  add(
    'FAIL-g3-missing-level',
    1,
    sheet(dim({ id: 'a', selected: 3 }) + dim({ id: 'b', noteLevel: 3 })),
    'no data-note-matches-level'
  );
  add(
    'FAIL-g3-mismatch-no-rationale',
    1,
    sheet(
      dim({ id: 'a', selected: 2, noteLevel: 3, rebuttal: 'r' }) + dim({ id: 'b', noteLevel: 3 })
    ),
    'the note describes level 3 but the score is 2'
  );
  add(
    'PASS-g3-mismatch-with-rationale',
    0,
    sheet(
      dim({
        id: 'a',
        selected: 2,
        noteLevel: 3,
        rebuttal: 'r',
        rationale: 'a red flag dragged it below the prose',
      }) + dim({ id: 'b', noteLevel: 3 }),
      'data-reco-rationale="defended"'
    )
  );
  // whitespace-only is absent, not present
  add(
    'FAIL-g3-whitespace-rationale',
    1,
    sheet(
      dim({ id: 'a', selected: 2, noteLevel: 3, rebuttal: 'r', rationale: '   ' }) +
        dim({ id: 'b', noteLevel: 3 })
    ),
    'no non-empty data-score-rationale'
  );

  // --- Gate 4: reco vs computed band ---
  add(
    'FAIL-g4-reco-vs-band',
    1,
    sheet(
      dim({ id: 'a', selected: 2, noteLevel: 2, rebuttal: 'r' }) +
        dim({ id: 'b', selected: 2, noteLevel: 2, rebuttal: 'r' }),
      '',
      'yes'
    ),
    'lands in band "no"'
  );
  add(
    'PASS-g4-reco-vs-band-with-rationale',
    0,
    sheet(
      dim({ id: 'a', selected: 2, noteLevel: 2, rebuttal: 'r' }) +
        dim({ id: 'b', selected: 2, noteLevel: 2, rebuttal: 'r' }),
      'data-reco-rationale="two red flags outweigh the numbers"',
      'yes'
    )
  );

  // --- Untested: exclusion + renormalization (worked example) ---
  // a: weight 20, score 4 (scored) · b: weight 20, score 4 (scored) · c: weight 60, UNTESTED.
  // Weighted over the scored set renormalizes to (20*4 + 20*4) / 40 = 4.00 — NOT
  // (20*4 + 20*4 + 60*0)/100 = 1.60, and NOT a neutral score invented for c.
  // Untested weight is 60/100 = 60.0%, which is over the 30% threshold, so the reco
  // must be defended — it is, so this passes.
  add(
    'PASS-untested-renormalizes',
    0,
    sheet(
      dim({ id: 'a', weight: 20, selected: 4, noteLevel: 4 }) +
        dim({ id: 'b', weight: 20, selected: 4, noteLevel: 4 }) +
        dim({ id: 'c', weight: 60, untested: true, selected: null, sweep: 0 }),
      'data-reco-rationale="three of six probed; call defended"',
      'strong-yes'
    ),
    'weighted 4.00, modal 4, band strong-yes, untested 1/3 (60.0% of weight)'
  );

  // Same shape, undefended -> the coverage gate fires.
  add(
    'FAIL-untested-over-threshold-undefended',
    1,
    sheet(
      dim({ id: 'a', weight: 20, selected: 4, noteLevel: 4 }) +
        dim({ id: 'b', weight: 20, selected: 4, noteLevel: 4 }) +
        dim({ id: 'c', weight: 60, untested: true, selected: null, sweep: 0 }),
      '',
      'strong-yes'
    ),
    '60.0% of total weight'
  );

  // --- The 30% boundary: 29% passes undefended, 30% does not ---
  add(
    'PASS-coverage-just-under-threshold',
    0,
    sheet(
      dim({ id: 'a', weight: 71, selected: 3, noteLevel: 3 }) +
        dim({ id: 'c', weight: 29, untested: true, selected: null, sweep: 0 }),
      '',
      'yes'
    )
  );
  add(
    'FAIL-coverage-exactly-at-threshold',
    1,
    sheet(
      dim({ id: 'a', weight: 70, selected: 3, noteLevel: 3 }) +
        dim({ id: 'c', weight: 30, untested: true, selected: null, sweep: 0 }),
      '',
      'yes'
    ),
    '30.0% of total weight'
  );

  // --- untested must not also carry a score ---
  add(
    'FAIL-untested-but-scored',
    1,
    sheet(
      dim({ id: 'a', weight: 50, selected: 3, noteLevel: 3 }) +
        dim({ id: 'c', weight: 50, untested: true, selected: 3, sweep: 0 }),
      'data-reco-rationale="d"'
    ),
    'tagged data-untested but also carries a selected score'
  );

  let pass = 0;
  for (const tc of cases) {
    // Each case gets its own round folder nested inside its own case root, so the parent-walk
    // (TRANSCRIPT_SEARCH_DEPTH levels) stays inside this selftest's mkdtemp and can never
    // reach the shared system temp dir — where an unrelated *transcript*.txt would otherwise
    // make these cases flaky.
    const caseDir = join(dir, tc.name.replace(/[^\w]+/g, '_'));
    const roundDir = join(caseDir, 'round');
    const sheetDir = tc.nest ? join(roundDir, 'outputs') : roundDir;
    mkdirSync(sheetDir, { recursive: true });
    const htmlPath = join(sheetDir, 'filled-scorecard.html');
    writeFileSync(htmlPath, tc.html, 'utf8');
    if (!tc.noTranscriptFile) {
      writeFileSync(join(roundDir, 'transcript.refined.txt'), 'Interviewer: hello.\n', 'utf8');
    }
    for (const [name, body] of Object.entries(tc.extraFiles || {})) {
      writeFileSync(join(roundDir, name), body, 'utf8');
    }
    const argv = tc.flag ? [selfPath, htmlPath, '--no-transcript'] : [selfPath, htmlPath];
    const res = spawnSync(process.execPath, argv, { encoding: 'utf8' });
    const stdoutOk =
      tc.stdoutIncludes == null ||
      ((res.stdout || '') + (res.stderr || '')).includes(tc.stdoutIncludes);
    if (res.status === tc.expect && stdoutOk) {
      pass++;
    } else {
      if (res.status !== tc.expect) {
        console.error(`selftest case ${tc.name}: expected exit ${tc.expect}, got ${res.status}`);
      }
      if (!stdoutOk) {
        console.error(`selftest case ${tc.name}: stdout missing "${tc.stdoutIncludes}"`);
      }
      console.error(res.stdout);
    }
  }

  const total = cases.length;
  if (pass === total) {
    console.log(`check-scoring-calibration selftest: ${pass}/${total} PASS`);
    return 0;
  }
  console.error(`check-scoring-calibration selftest: ${pass}/${total} PASS (FAILED)`);
  return 1;
}

// --- main ---
const args = process.argv.slice(2);
if (args[0] === '--selftest') {
  process.exit(selftest());
} else {
  const declaredNoTranscript = args.includes('--no-transcript');
  const positionals = args.filter((a) => a !== '--no-transcript');
  if (positionals.length === 1) {
    process.exit(runFile(positionals[0], declaredNoTranscript));
  }
  console.error(
    'Usage: node check-scoring-calibration.mjs <filled-scorecard.html> [--no-transcript]\n' +
      '       node check-scoring-calibration.mjs --selftest\n' +
      '\n' +
      '  --no-transcript  the round has NO transcript and was graded from interviewer notes\n' +
      '                   (tier 2). Accepts "notes"-tier citations for the evidence sweep.\n' +
      '                   Refused if a transcript sits beside the scorecard.'
  );
  process.exit(2);
}
