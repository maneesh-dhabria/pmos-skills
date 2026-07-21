#!/usr/bin/env node
// check-scoring-calibration.mjs — scoring-calibration gate for /interview-feedback (design D3, D7, D10).
//
// The SECOND blocking STOP-before-done gate, run alongside check-citations.mjs. That gate proves a
// quote is real; this one proves the score follows from the evidence at the sheet's own bar. Both
// must exit 0 before a filled scorecard is presented or a run declares done.
//
// Usage:
//   node check-scoring-calibration.mjs <filled-scorecard.html>
//   node check-scoring-calibration.mjs --selftest
//
// Exit: 0 all gates pass · 1 one or more failures · 2 usage/read error.
//
// The four gates (design D3) — every hard condition is presence, ordering, or an integer comparison
// THIS SCRIPT performs. Nothing here is a self-graded verdict the model can satisfy by stamping a
// token without reading (that shape was rejected as a ritual — D10):
//
//   1. EVIDENCE SWEEP        every scored dimension carries <details data-card="evidence-sweep">
//                            with >=1 timestamped instance (a <li data-t="…">).
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

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The untested-coverage threshold, as a PERCENT of total dimension weight.
//
// This is a PROPOSAL, not a calibration — no real round has been measured against it (design,
// "Open questions"). It lives here as one named constant precisely so it is trivially tunable
// after first use. Do not inline this number anywhere else.
const UNTESTED_COVERAGE_THRESHOLD_PCT = 30;

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

function parseDimensions(html) {
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
    // a model could satisfy it with invented timestamps it never read. Requiring each
    // instance to carry a citation hands the verification to check-citations.mjs, which
    // already refuses any transcript-tier quote that is not a verbatim >=40-char substring
    // of the transcript. Faking the sweep then means faking a quote, which the other gate
    // catches. (T9 anti-ritual re-read: "can a model pass this without doing the work?")
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
        items.push(/\bdata-cite-tier\s*=/.test(liBlock));
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

function checkCalibration(html) {
  const failures = [];
  const dims = parseDimensions(html);
  const root = parseRoot(html);

  if (dims.length === 0) {
    return {
      failures: ['no <section data-dim> found — this does not look like an anchored scorecard'],
      dims,
      stats: null,
    };
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
          `dimension "${d.id}" has ${d.sweepUngrounded} evidence-sweep instance(s) carrying no citation — every swept instance needs a <cite data-cite-tier="…"> so check-citations.mjs can verify it verbatim`
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

function runFile(path) {
  let html;
  try {
    html = readFileSync(path, 'utf8');
  } catch (e) {
    console.error(`check-scoring-calibration: cannot read ${path}: ${e.message}`);
    return 2;
  }
  const { failures, dims, stats } = checkCalibration(html);
  for (const f of failures) console.log(f);
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
          : `<details data-card="evidence-sweep"><ul>${Array.from(
              { length: sweep },
              (_, i) =>
                `<li data-t="0${i}:12"><cite data-cite-tier="notes" data-source="notes">instance ${i}</cite></li>`
            ).join('')}</ul></details>`;
  return `<section class="dim" ${attrs}><div class="scale" data-scale="1-4">${options}</div><div data-input="notes:${id}">note</div>${sweepBlock}</section>`;
}

function selftest() {
  const dir = mkdtempSync(join(tmpdir(), 'check-scoring-calibration-'));
  const selfPath = fileURLToPath(import.meta.url);
  const cases = [];
  const add = (name, expect, html, stdoutIncludes) =>
    cases.push({ name, expect, html, stdoutIncludes });

  // --- PASS: a well-formed two-dimension sheet ---
  add(
    'PASS-clean',
    0,
    sheet(dim({ id: 'a', selected: 3, noteLevel: 3 }) + dim({ id: 'b', selected: 3, noteLevel: 3 })),
    '✓ calibration:'
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
    'carrying no citation'
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
    const htmlPath = join(dir, `case-${tc.name.replace(/[^\w]+/g, '_')}.html`);
    writeFileSync(htmlPath, tc.html, 'utf8');
    const res = spawnSync(process.execPath, [selfPath, htmlPath], { encoding: 'utf8' });
    const stdoutOk =
      tc.stdoutIncludes == null || (res.stdout || '').includes(tc.stdoutIncludes);
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
} else if (args.length === 1) {
  process.exit(runFile(args[0]));
} else {
  console.error(
    'Usage: node check-scoring-calibration.mjs <filled-scorecard.html>\n' +
      '       node check-scoring-calibration.mjs --selftest'
  );
  process.exit(2);
}
