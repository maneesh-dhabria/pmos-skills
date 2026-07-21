#!/usr/bin/env node
// fill-scorecard.mjs — scorecard parser + filler for /interview-feedback (pmos-managerkit).
//
// Zero-dependency, Node built-ins only. Operates on the canonical scorecard DOM contract
// (../_shared/interview-guidelines/scorecard-skeleton.html): root <main data-card="scorecard">, per-dimension
// <section data-dim data-weight> with a data-scale="1-4" container of data-v options, a
// data-input="notes:<dim>" slot, and data-flags="green"/"red" lists; plus an overall
// data-input="reco" control of data-reco options and a data-input="notes:reco" slot.
//
// Work-history archetype (design D2/D9): when the scorecard also carries the additive
// data-card="role-evidence" (per-role) and data-card="trajectory-synthesis" families, a
// presence-guarded pass fills each role's data-input="role:<slot>" cells, the
// data-field="result-measured" marker, per-role flags, plus the trajectory's
// data-input="trajectory:<slot>" cells and its data-field="level-verdict" (below/at/above,
// its own input that feeds — but is not derived from — the overall reco). The pass is inert
// on any scorecard lacking those families, so the other seven archetypes fill byte-identically.
//
// No DOM library: we work on the HTML as text with targeted, anchor-scoped replacements,
// preserving everything else byte-for-byte.
//
// Usage:
//   node fill-scorecard.mjs parse <scorecard.html>
//   node fill-scorecard.mjs fill  <scorecard.html> <values.json> [--out <path>]
//   node fill-scorecard.mjs --selftest

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SKELETON = resolve(__dirname, '..', '..', '_shared', 'interview-guidelines', 'scorecard-skeleton.html');

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function attr(name, tagText) {
  // Extract attribute value from a single opening-tag substring.
  const m = tagText.match(new RegExp(name + '\\s*=\\s*"([^"]*)"'));
  return m ? m[1] : null;
}

function hasAttr(name, tagText) {
  return new RegExp('(?:^|\\s)' + name + '(?=[\\s/>=])').test(tagText);
}

function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// Find the matching close index for an element that starts at openTagStart.
// `tag` is the tag name (e.g. "section"). Returns the index just past </tag>.
function matchElementEnd(html, openTagStart, tag) {
  const openRe = new RegExp('<' + tag + '(?=[\\s/>])', 'g');
  const closeRe = new RegExp('</' + tag + '\\s*>', 'g');
  // Move past the first opening tag's '>'.
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

// Locate each <section ... data-dim="..."> block: returns array of
// {id, weight, scale, openStart, openEnd, blockStart, blockEnd, block}.
function findDimSections(html) {
  const out = [];
  const re = /<section\b[^>]*\bdata-dim\s*=\s*"[^"]*"[^>]*>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const openTag = m[0];
    const id = attr('data-dim', openTag);
    const weightRaw = attr('data-weight', openTag);
    const blockStart = m.index;
    const blockEnd = matchElementEnd(html, blockStart, 'section');
    const block = html.slice(blockStart, blockEnd);
    const scaleTag = block.match(/<[^>]*\bdata-scale\s*=\s*"([^"]*)"[^>]*>/);
    out.push({
      id,
      weight: weightRaw == null ? null : Number(weightRaw),
      scale: scaleTag ? scaleTag[1] : null,
      blockStart,
      blockEnd,
      block,
    });
  }
  return out;
}

function scaleScores(block) {
  const out = [];
  const re = /data-v\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(block)) !== null) out.push(Number(m[1]));
  return out;
}

// ---------------------------------------------------------------------------
// parse
// ---------------------------------------------------------------------------

function parse(html) {
  const anchored = /<main\b[^>]*\bdata-card\s*=\s*"scorecard"/.test(html);
  if (anchored) {
    const dims = findDimSections(html).map((s) => ({
      id: s.id,
      weight: s.weight,
      scale: s.scale,
      scores: scaleScores(s.block),
    }));
    const hasReco = /data-input\s*=\s*"reco"/.test(html);
    return { anchored: true, dims, hasReco };
  }
  // FOREIGN sheet: best-effort infer a dimension list from DOM structure.
  const echo = inferDimensionLabels(html);
  const dims = echo.map((label) => ({ id: slugify(label), label, inferred: true }));
  return { anchored: false, inferred: true, dims, echo, hasReco: false };
}

function slugify(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferDimensionLabels(html) {
  const labels = [];
  const seen = new Set();
  const push = (raw) => {
    if (!raw) return;
    const text = raw.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!text || text.length > 120) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    labels.push(text);
  };
  // Strategy 1: headings (h2..h4) — common scorecard section titles.
  let m;
  const hRe = /<h([2-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  while ((m = hRe.exec(html)) !== null) push(m[2]);
  // Strategy 2: table rows — first cell of each <tr> (skip header row of <th>).
  if (labels.length === 0) {
    const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    while ((m = trRe.exec(html)) !== null) {
      const cell = m[1].match(/<td\b[^>]*>([\s\S]*?)<\/td>/i);
      if (cell) push(cell[1]);
    }
  }
  // Strategy 3: repeated <li> blocks as a last resort.
  if (labels.length === 0) {
    const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
    while ((m = liRe.exec(html)) !== null) push(m[1]);
  }
  return labels;
}

// ---------------------------------------------------------------------------
// fill
// ---------------------------------------------------------------------------

function fill(html, values) {
  const scores = values.scores || {};
  const notes = values.notes || {};
  const flags = values.flags || {};

  // Rebuild dim by dim so index offsets from earlier edits don't invalidate later anchors.
  // We process sections from last to first to keep earlier offsets stable.
  let out = html;
  const sections = findDimSections(out);
  for (let i = sections.length - 1; i >= 0; i--) {
    const s = sections[i];
    let block = s.block;
    const id = s.id;

    // 1. Select the chosen score option.
    if (scores[id] != null) {
      const want = String(scores[id]);
      block = block.replace(
        /<([a-zA-Z0-9]+)\b([^>]*\bdata-v\s*=\s*"([^"]*)"[^>]*)>/g,
        (full, tag, rest, v) => {
          // Strip any pre-existing data-selected, then add if this is the chosen v.
          let cleaned = rest.replace(/\s+data-selected(?=[\s>])/g, '');
          if (v === want && !hasAttr('data-selected', cleaned)) {
            cleaned = cleaned + ' data-selected';
          }
          return '<' + tag + cleaned + '>';
        }
      );
    }

    // 2. Inject notes HTML into the notes:<dim> slot.
    if (notes[id] != null) {
      block = injectInputSlot(block, 'notes:' + id, notes[id]);
    }

    // 2b. Calibration anchors (FR-6 / D9, D10). Presence-guarded per key: a values.json
    //     carrying none of them leaves the block byte-identical, so every pre-calibration
    //     caller keeps its exact output.
    block = fillCalibrationDim(block, id, values);

    // 3. Append flag <li> items.
    const f = flags[id] || {};
    if (Array.isArray(f.green) && f.green.length) {
      block = appendFlags(block, 'green', f.green);
    }
    if (Array.isArray(f.red) && f.red.length) {
      block = appendFlags(block, 'red', f.red);
    }

    out = out.slice(0, s.blockStart) + block + out.slice(s.blockEnd);
  }

  // 3b. Root-level calibration anchors (FR-6 / D3, D7, D8): the reco-disagreement /
  //     partial-coverage defence, and the provenance of the bar that was scored against.
  out = fillCalibrationRoot(out, values);

  // 4. Mark the chosen reco.
  if (values.reco != null) {
    const want = String(values.reco);
    out = out.replace(
      /<([a-zA-Z0-9]+)\b([^>]*\bdata-reco\s*=\s*"([^"]*)"[^>]*)>/g,
      (full, tag, rest, r) => {
        let cleaned = rest.replace(/\s+data-selected(?=[\s>])/g, '');
        if (r === want && !hasAttr('data-selected', cleaned)) {
          cleaned = cleaned + ' data-selected';
        }
        return '<' + tag + cleaned + '>';
      }
    );
  }

  // 5. Fill notes:reco.
  if (values.recoNotes != null) {
    out = injectInputSlot(out, 'notes:reco', values.recoNotes);
  }

  // 6. Written-submission assessment (F3/F4). Only when a submission is supplied —
  //    a no-submission fill is byte-identical to before (INV-4). The block is
  //    injected immediately before the overall-reco section, and a deterministic
  //    reference line is inserted into that section so the reco never reads the
  //    submission as a standalone number divorced from interview context.
  if (values.submission) {
    const block = renderSubmissionBlock(values.submission);
    const recoRe = /<section\b[^>]*\bclass\s*=\s*"reco"[^>]*>/;
    const rm = out.match(recoRe);
    if (rm) {
      const at = rm.index;
      const recoOpenEnd = at + rm[0].length;
      const ref =
        '\n    <p class="notes" data-submission-ref>Recommendation accounts for the written-submission assessment above.</p>';
      // Insert the ref inside the reco section first (after its open tag) so the
      // earlier `at` index stays valid for the block insertion that follows.
      out = out.slice(0, recoOpenEnd) + ref + out.slice(recoOpenEnd);
      out = out.slice(0, at) + block + '\n\n  ' + out.slice(at);
    }
  }

  // 7. Work-history per-role + trajectory pass (D2). Presence-guarded on the
  //    role-evidence / trajectory-synthesis families: inert (byte-identical) on
  //    any scorecard that lacks them, so the other seven archetypes are untouched
  //    (INV backward-compat). Runs last so its in-place section edits never shift
  //    the offsets the earlier passes relied on.
  if (values.roles || values.trajectory) {
    out = fillWorkHistory(out, values);
  }

  return out;
}

// ---------------------------------------------------------------------------
// calibration anchors (FR-6; design D3, D7, D8, D9, D10)
// ---------------------------------------------------------------------------
//
// Emitted so scripts/check-scoring-calibration.mjs has something mechanical to read.
// Every key is presence-guarded — a values.json carrying none of them produces the
// byte-identical output every pre-calibration caller already got.
//
// Per dimension (on the <section data-dim> open tag, plus one block):
//   data-untested                      the competency was never probed (D2d). Excluded from the
//                                      weighted score, weights renormalize (D7). An EXPLICIT tag,
//                                      not "absence of a score" — a dimension nobody remembered to
//                                      score must stay distinguishable from one deliberately left
//                                      untested, or forgetting silently shrinks the denominator and
//                                      inflates the result (the defect class this epic closes).
//   data-note-matches-level="<n>"      the level whose descriptor the written note actually
//                                      describes; the SCRIPT compares it to data-selected (D10).
//   data-score-rationale="<text>"      required only when those two disagree (D10).
//   data-rebuttal="<text>"             required on a below-bar score (D3 gate 2).
//   <details data-card="evidence-sweep">   collapsed, under that dimension's notes (D9).
//
// At the artifact root (on <main data-card="scorecard">):
//   data-reco-rationale="<text>"       defends a reco that disagrees with the computed band, or a
//                                      call made at/above the untested-coverage threshold (D3, D7).
//   data-rubric-provenance="…"         authored | synthesized-agreed | synthesized-auto (D8).
//
// These carry plain text, not markup: they are read by attribute, and the graded prose with its
// <cite> tags lives in the notes slot and the sweep block where check-citations.mjs scans it.

// Attribute-safe text. Also escapes < and > — setAttrOnOpenTag locates the end of an
// opening tag with indexOf('>'), so an operator-supplied rationale containing a bare
// '>' would otherwise truncate the tag it is being written into.
function escAttrText(s) {
  return escAttr(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Add (or replace) an attribute on the FIRST opening tag of `block`.
// Passing value === true writes a bare boolean attribute.
function setAttrOnOpenTag(block, name, value) {
  const gt = block.indexOf('>');
  if (gt < 0) return block;
  let openTag = block.slice(0, gt);
  // Drop any pre-existing copy (valued or bare) so re-filling is idempotent.
  openTag = openTag
    .replace(new RegExp('\\s+' + escapeRe(name) + '\\s*=\\s*"[^"]*"', 'g'), '')
    .replace(new RegExp('\\s+' + escapeRe(name) + '(?=[\\s/]|$)', 'g'), '');
  const add = value === true ? ' ' + name : ' ' + name + '="' + escAttrText(value) + '"';
  return openTag + add + block.slice(gt);
}

// Render one dimension's collapsed evidence sweep (D9). `instances` is an array of
// {t, html} — a timestamp string and the instance's HTML, which MUST carry its own
// <cite data-cite-tier> tag: check-scoring-calibration.mjs gate 1 rejects an instance
// with no citation (a timestamp alone can be invented), and check-citations.mjs then
// verifies the quote verbatim like any other citation.
function renderEvidenceSweep(instances) {
  const items = instances
    .filter((i) => i && i.html)
    .map(
      (i) =>
        '        <li data-t="' + escAttr(i.t == null ? '' : i.t) + '">' + i.html + '</li>\n'
    )
    .join('');
  if (!items) return '';
  return (
    '\n      <details data-card="evidence-sweep">\n' +
    '        <summary>Evidence sweep — every instance, early and late, prompted and unprompted</summary>\n' +
    '        <ul>\n' +
    items +
    '        </ul>\n' +
    '      </details>'
  );
}

// Insert `insert` immediately after the element bearing data-input="<key>" closes,
// i.e. UNDER that dimension's notes (D9). No slot -> unchanged.
function insertAfterInputSlot(block, key, insert) {
  const re = new RegExp(
    '<([a-zA-Z0-9]+)\\b[^>]*\\bdata-input\\s*=\\s*"' + escapeRe(key) + '"[^>]*>'
  );
  const m = block.match(re);
  if (!m) return block;
  const end = matchElementEnd(block, m.index, m[1]);
  if (end < 0) return block;
  return block.slice(0, end) + insert + block.slice(end);
}

function fillCalibrationDim(block, id, values) {
  const pick = (key) => {
    const map = values[key];
    return map && map[id] != null ? map[id] : null;
  };

  let out = block;

  const untested = Array.isArray(values.untested) && values.untested.includes(id);
  if (untested) out = setAttrOnOpenTag(out, 'data-untested', true);

  const level = pick('noteMatchesLevel');
  if (level != null) out = setAttrOnOpenTag(out, 'data-note-matches-level', String(level));

  const rationale = pick('scoreRationales');
  if (rationale != null) out = setAttrOnOpenTag(out, 'data-score-rationale', rationale);

  const rebuttal = pick('rebuttals');
  if (rebuttal != null) out = setAttrOnOpenTag(out, 'data-rebuttal', rebuttal);

  const sweep = values.sweeps && values.sweeps[id];
  if (Array.isArray(sweep) && sweep.length) {
    out = insertAfterInputSlot(out, 'notes:' + id, renderEvidenceSweep(sweep));
  }

  return out;
}

// True when `index` falls inside an HTML comment. The skeleton opens with a long doc-comment
// that DOCUMENTS the anchor contract by quoting the very tags we search for — matching the
// first `<main data-card="scorecard">` in the file stamps the prose, not the element, and the
// artifact silently ships without its root anchors. (Same trap the role-evidence pass hit.)
function isInsideHtmlComment(html, index) {
  const open = html.lastIndexOf('<!--', index);
  if (open === -1) return false;
  const close = html.indexOf('-->', open);
  return close === -1 || close > index;
}

function fillCalibrationRoot(html, values) {
  if (values.recoRationale == null && values.rubricProvenance == null) return html;
  const re = /<main\b[^>]*\bdata-card\s*=\s*"scorecard"[^>]*>/g;
  let m = null;
  let hit;
  while ((hit = re.exec(html)) !== null) {
    if (!isInsideHtmlComment(html, hit.index)) {
      m = hit;
      break;
    }
  }
  if (!m) return html;
  let openTag = m[0];
  if (values.recoRationale != null) {
    openTag = setAttrOnOpenTag(openTag, 'data-reco-rationale', values.recoRationale);
  }
  if (values.rubricProvenance != null) {
    openTag = setAttrOnOpenTag(openTag, 'data-rubric-provenance', values.rubricProvenance);
  }
  return html.slice(0, m.index) + openTag + html.slice(m.index + m[0].length);
}

// ---------------------------------------------------------------------------
// work-history: per-role evidence + trajectory synthesis (design D2, D9)
// ---------------------------------------------------------------------------

// Locate each <section ... data-card="role-evidence">: {roleNum, blockStart, blockEnd, block}.
function findRoleSections(html) {
  const out = [];
  const re = /<section\b[^>]*\bdata-card\s*=\s*"role-evidence"[^>]*>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const blockStart = m.index;
    const blockEnd = matchElementEnd(html, blockStart, 'section');
    out.push({
      roleNum: attr('data-role', m[0]),
      blockStart,
      blockEnd,
      block: html.slice(blockStart, blockEnd),
    });
  }
  return out;
}

// Locate the single <section ... data-card="trajectory-synthesis">, or null.
function findTrajectorySection(html) {
  const re = /<section\b[^>]*\bdata-card\s*=\s*"trajectory-synthesis"[^>]*>/g;
  const m = re.exec(html);
  if (!m) return null;
  const blockStart = m.index;
  const blockEnd = matchElementEnd(html, blockStart, 'section');
  return { blockStart, blockEnd, block: html.slice(blockStart, blockEnd) };
}

// Mark data-selected on the option whose <fieldAttr> equals wantVal (e.g.
// data-measured / data-verdict), clearing any prior selection first. Same shape
// as the score/reco selection logic, generalized over the anchor attribute.
function markSelected(block, fieldAttr, wantVal) {
  return block.replace(
    new RegExp('<([a-zA-Z0-9]+)\\b([^>]*\\b' + fieldAttr + '\\s*=\\s*"([^"]*)"[^>]*)>', 'g'),
    (full, tag, rest, v) => {
      let cleaned = rest.replace(/\s+data-selected(?=[\s>])/g, '');
      if (v === wantVal && !hasAttr('data-selected', cleaned)) {
        cleaned = cleaned + ' data-selected';
      }
      return '<' + tag + cleaned + '>';
    }
  );
}

// Fill the role-evidence blocks and the trajectory-synthesis block. Presence-guarded:
// returns the input unchanged when the scorecard carries no role-evidence family, so a
// stray values.roles on a non-work-history sheet is a no-op (byte-identity preserved).
const ROLE_SLOTS = ['company', 'title', 'tenure', 'scope', 'contribution', 'result'];
const TRAJ_SLOTS = { scopeArc: 'scope-arc', patterns: 'patterns', levelFit: 'level-fit' };

function fillWorkHistory(html, values) {
  if (!/<section\b[^>]*\bdata-card\s*=\s*"role-evidence"/.test(html)) return html;
  let out = html;

  // --- per-role evidence blocks (last-to-first for offset stability) ---
  const roles = Array.isArray(values.roles) ? values.roles : [];
  if (roles.length) {
    const sections = findRoleSections(out);
    for (let i = sections.length - 1; i >= 0; i--) {
      const s = sections[i];
      // Map by explicit data-role number, falling back to positional order.
      const data =
        roles.find((r) => r != null && String(r.role) === String(s.roleNum)) ||
        roles[i];
      if (!data) continue;
      let block = s.block;
      for (const slot of ROLE_SLOTS) {
        if (data[slot] != null) block = injectInputSlot(block, 'role:' + slot, data[slot]);
      }
      if (data.measured != null) block = markSelected(block, 'data-measured', String(data.measured));
      const f = data.flags || {};
      if (Array.isArray(f.green) && f.green.length) block = appendFlags(block, 'green', f.green);
      if (Array.isArray(f.red) && f.red.length) block = appendFlags(block, 'red', f.red);
      out = out.slice(0, s.blockStart) + block + out.slice(s.blockEnd);
    }
  }

  // --- trajectory synthesis (exactly one block) ---
  const traj = values.trajectory;
  if (traj) {
    const t = findTrajectorySection(out);
    if (t) {
      let block = t.block;
      for (const [key, slot] of Object.entries(TRAJ_SLOTS)) {
        if (traj[key] != null) block = injectInputSlot(block, 'trajectory:' + slot, traj[key]);
      }
      if (traj.verdict != null) block = markSelected(block, 'data-verdict', String(traj.verdict));
      out = out.slice(0, t.blockStart) + block + out.slice(t.blockEnd);
    }
  }

  return out;
}

// Render the scenario-aware written-submission assessment block (F3/F4). Reuses
// the skeleton's existing CSS classes (.dim/.dim-name/.notes) so no <style>
// change is needed (which would break the no-submission byte-identity, INV-4).
// The LLM supplies the per-slot HTML (with its <cite data-cite-tier> tags); this
// renderer owns only the structure — the scenario label, the buckets/quality
// split, and the "how it shaped the scores & reco" close (skill-patterns §H).
function renderSubmissionBlock(sub) {
  const scenario = sub.scenario === 'pre-live' ? 'pre-live' : 'post-live';
  const scenarioLabel =
    scenario === 'pre-live'
      ? 'Prepared before the live session, then presented'
      : 'Completed after the live session';
  let inner = '';
  if (scenario === 'pre-live') {
    inner += submissionPart('Intrinsic quality &amp; clarity of thought', sub.intrinsicQuality);
    inner += submissionPart(
      'Live defense — how the candidate defended it, answered probes, and adjusted on the fly',
      sub.liveDefense
    );
  } else {
    const b = sub.buckets || {};
    // Fourth, neutral baseline bucket (F1 / INV-2): structure the candidate brief
    // itself published is the expected starting point — never interviewer-seeded,
    // never penalized as unoriginal. Absent brief degrades to "not published".
    inner += submissionPart(
      'Structure published in the candidate brief (neutral baseline — not interviewer-seeded, not penalized as unoriginal)',
      b.publishedInBrief
    );
    inner += submissionPart('Discussed in the interview', b.discussed);
    inner += submissionPart('Directed by the interviewer’s closing brief', b.interviewerDirected);
    inner += submissionPart('Independently reached', b.independent);
    inner += submissionPart(
      'Did the candidate use the live context to structure &amp; complete the missing parts? (restate-only is a WEAK signal)',
      sub.liveContext
    );
  }
  inner += submissionPart('How this shaped the dimension scores &amp; recommendation', sub.shaped);
  return (
    '  <section class="dim" data-card="submission-assessment" data-scenario="' +
    escAttr(scenario) +
    '">\n' +
    '    <div class="dim-head"><span class="dim-name">Written submission — ' +
    scenarioLabel +
    '</span></div>\n' +
    inner +
    '  </section>'
  );
}

function submissionPart(label, html) {
  if (!html) return '';
  return (
    '    <div class="notes"><strong>' + label + '</strong><div>' + html + '</div></div>\n'
  );
}

// Replace the inner content of the element bearing data-input="<key>".
function injectInputSlot(html, key, innerHtml) {
  const re = new RegExp('<([a-zA-Z0-9]+)\\b[^>]*\\bdata-input\\s*=\\s*"' + escapeRe(key) + '"[^>]*>', 'g');
  const m = re.exec(html);
  if (!m) return html;
  const tag = m[1];
  const innerStart = m.index + m[0].length;
  const end = matchElementEnd(html, m.index, tag);
  if (end < 0) return html;
  const closeStart = html.lastIndexOf('</' + tag, end);
  return html.slice(0, innerStart) + innerHtml + html.slice(closeStart);
}

// Append <li> items to the <ul data-flags="<kind>"> list within a block.
function appendFlags(block, kind, items) {
  const re = new RegExp('<ul\\b[^>]*\\bdata-flags\\s*=\\s*"' + kind + '"[^>]*>', 'g');
  const m = re.exec(block);
  if (!m) return block;
  const end = matchElementEnd(block, m.index, 'ul');
  if (end < 0) return block;
  const closeStart = block.lastIndexOf('</ul', end);
  const lis = items.map((it) => '<li>' + it + '</li>').join('');
  return block.slice(0, closeStart) + lis + block.slice(closeStart);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// selftest
// ---------------------------------------------------------------------------

function selftest() {
  let pass = 0;
  let total = 0;
  const checks = [];
  const assert = (cond, label) => {
    total += 1;
    if (cond) pass += 1;
    checks.push((cond ? 'ok   ' : 'FAIL ') + label);
  };

  const skeleton = readFileSync(SKELETON, 'utf8');

  // (a) parse skeleton -> anchored:true, two example dims with weights.
  const p = parse(skeleton);
  assert(p.anchored === true, 'parse: anchored true on skeleton');
  assert(Array.isArray(p.dims) && p.dims.length === 2, 'parse: two dims');
  const ids = p.dims.map((d) => d.id);
  assert(
    ids.includes('example-dimension-one') && ids.includes('example-dimension-two'),
    'parse: example dim ids present'
  );
  assert(
    p.dims.every((d) => d.weight === 50),
    'parse: each example weight is 50'
  );
  assert(
    p.dims.every((d) => d.scale === '1-4' && d.scores.join(',') === '1,2,3,4'),
    'parse: scale 1-4 with scores 1..4'
  );
  assert(p.hasReco === true, 'parse: hasReco true');

  // (b) fill -> select scores, inject notes, add flags, mark reco; re-parse to confirm.
  const values = {
    scores: { 'example-dimension-one': 4, 'example-dimension-two': 2 },
    notes: {
      'example-dimension-one': 'Strong structured answer. UNIQUE_NOTE_TOKEN_X1',
      'example-dimension-two': 'Some hesitation on tradeoffs.',
    },
    flags: {
      'example-dimension-one': { green: ['Clear thesis', 'Quantified impact'], red: [] },
      'example-dimension-two': { green: [], red: ['Vague on metrics'] },
    },
    reco: 'yes',
    recoNotes: 'Lean hire. RECO_NOTE_TOKEN_Y2',
  };
  const filled = fill(skeleton, values);

  // re-parse structure stays anchored
  const pf = parse(filled);
  assert(pf.anchored === true, 'fill: filled output still anchored');

  // data-selected on chosen score options (dim one -> v4, dim two -> v2)
  const dimOne = sliceDim(filled, 'example-dimension-one');
  const dimTwo = sliceDim(filled, 'example-dimension-two');
  assert(
    /<span\b[^>]*data-v\s*=\s*"4"[^>]*data-selected/.test(dimOne) ||
      /<span\b[^>]*data-selected[^>]*data-v\s*=\s*"4"/.test(dimOne),
    'fill: dim-one v4 marked data-selected'
  );
  assert(
    countSelected(dimOne, 'data-v') === 1,
    'fill: dim-one has exactly one selected score'
  );
  assert(
    /<span\b[^>]*data-v\s*=\s*"2"[^>]*data-selected/.test(dimTwo) ||
      /<span\b[^>]*data-selected[^>]*data-v\s*=\s*"2"/.test(dimTwo),
    'fill: dim-two v2 marked data-selected'
  );

  // injected note text present
  assert(dimOne.includes('UNIQUE_NOTE_TOKEN_X1'), 'fill: dim-one note injected');
  assert(dimTwo.includes('Some hesitation on tradeoffs.'), 'fill: dim-two note injected');

  // flags appended
  assert(/data-flags="green"[\s\S]*?Clear thesis/.test(dimOne), 'fill: dim-one green flag added');
  assert(/data-flags="red"[\s\S]*?Vague on metrics/.test(dimTwo), 'fill: dim-two red flag added');

  // reco marked
  assert(
    /<span\b[^>]*data-reco\s*=\s*"yes"[^>]*data-selected/.test(filled) ||
      /<span\b[^>]*data-selected[^>]*data-reco\s*=\s*"yes"/.test(filled),
    'fill: reco "yes" marked data-selected'
  );
  assert(countSelected(filled, 'data-reco') === 1, 'fill: exactly one reco selected');
  assert(filled.includes('RECO_NOTE_TOKEN_Y2'), 'fill: reco notes injected');

  // byte-for-byte preservation of the <head> region (untouched)
  const headOrig = skeleton.slice(0, skeleton.indexOf('<body'));
  const headFilled = filled.slice(0, filled.indexOf('<body'));
  assert(headOrig === headFilled, 'fill: head preserved byte-for-byte');

  // no-submission fill never emits the submission block (INV-4 byte-identity).
  assert(
    !filled.includes('data-card="submission-assessment"'),
    'fill: no submission -> no submission block (byte-identical path)'
  );

  // (b') submission present (post-live) -> scenario-aware block + reco reference.
  const filledSub = fill(skeleton, {
    ...values,
    submission: {
      scenario: 'post-live',
      buckets: {
        publishedInBrief: 'The three-phase rollout scaffold was published in the brief itself. SUB_BRIEF_TOKEN',
        discussed: 'They walked through the rollout we covered live. SUB_DISCUSSED_TOKEN',
        interviewerDirected: 'Filled in the metric guardrail I asked them to add. SUB_DIRECTED_TOKEN',
        independent: 'Added a kill-switch nobody prompted. SUB_INDEPENDENT_TOKEN',
      },
      liveContext: 'Used the live discussion to structure the missing parts rather than restating. SUB_CONTEXT_TOKEN',
      shaped: 'Lifted Scope and Strategy by one band. SUB_SHAPED_TOKEN',
    },
  });
  assert(
    /data-card="submission-assessment"[^>]*data-scenario="post-live"/.test(filledSub),
    'fill(submission): post-live assessment block rendered'
  );
  assert(
    filledSub.includes('SUB_BRIEF_TOKEN') &&
      filledSub.includes('SUB_DISCUSSED_TOKEN') &&
      filledSub.includes('SUB_DIRECTED_TOKEN') &&
      filledSub.includes('SUB_INDEPENDENT_TOKEN'),
    'fill(submission): four post-live buckets rendered (incl. published-in-brief baseline)'
  );
  // The neutral brief-baseline bucket renders ahead of the discussed/directed/independent split.
  assert(
    filledSub.indexOf('SUB_BRIEF_TOKEN') < filledSub.indexOf('SUB_DISCUSSED_TOKEN'),
    'fill(submission): published-in-brief bucket precedes the contribution buckets'
  );
  // Absent brief bucket degrades cleanly — no empty scaffold, byte-clean.
  const filledNoBrief = fill(skeleton, {
    ...values,
    submission: {
      scenario: 'post-live',
      buckets: {
        discussed: 'Rollout we covered live. NB_DISCUSSED_TOKEN',
        interviewerDirected: 'Guardrail I asked for. NB_DIRECTED_TOKEN',
        independent: 'Kill-switch nobody prompted. NB_INDEPENDENT_TOKEN',
      },
      liveContext: 'Structured the missing parts. NB_CONTEXT_TOKEN',
      shaped: 'Lifted one band. NB_SHAPED_TOKEN',
    },
  });
  assert(
    filledNoBrief.includes('NB_DISCUSSED_TOKEN') &&
      !filledNoBrief.includes('Structure published in the candidate brief'),
    'fill(submission): absent brief bucket renders nothing (degrades cleanly)'
  );
  assert(filledSub.includes('SUB_SHAPED_TOKEN'), 'fill(submission): shaped-the-scores close rendered');
  assert(
    /data-submission-ref/.test(filledSub) &&
      filledSub.indexOf('data-card="submission-assessment"') <
        filledSub.indexOf('class="reco"'),
    'fill(submission): block precedes reco and reco references it'
  );
  // pre-live scenario renders the quality/defense split, not the buckets.
  const filledPre = fill(skeleton, {
    ...values,
    submission: {
      scenario: 'pre-live',
      intrinsicQuality: 'Tight thesis, well-sequenced. PRE_QUALITY_TOKEN',
      liveDefense: 'Held up under probing and revised the rollout when pushed. PRE_DEFENSE_TOKEN',
      shaped: 'Confirmed the Strategy score. PRE_SHAPED_TOKEN',
    },
  });
  assert(
    /data-scenario="pre-live"/.test(filledPre) &&
      filledPre.includes('PRE_QUALITY_TOKEN') &&
      filledPre.includes('PRE_DEFENSE_TOKEN'),
    'fill(submission): pre-live quality + live-defense split rendered'
  );

  // (c) FOREIGN fixture -> anchored:false with non-empty inferred echo.
  const foreign = `<!DOCTYPE html><html><body>
    <h1>Engineering Loop Feedback</h1>
    <h2>Problem Solving</h2><p>notes...</p>
    <h2>Coding</h2><p>notes...</p>
    <h2>Communication</h2><p>notes...</p>
  </body></html>`;
  const pforeign = parse(foreign);
  assert(pforeign.anchored === false, 'parse: foreign anchored false');
  assert(
    Array.isArray(pforeign.echo) && pforeign.echo.length >= 1,
    'parse: foreign non-empty inferred echo'
  );
  assert(
    pforeign.echo.includes('Problem Solving') && pforeign.echo.includes('Coding'),
    'parse: foreign inferred labels from headings'
  );
  assert(pforeign.dims.every((d) => d.inferred === true), 'parse: foreign dims marked inferred');

  // (d) work-history pass — the skeleton carries one data-card="role-evidence" block
  //     (data-role="1") + one data-card="trajectory-synthesis" block. Fill them and confirm
  //     every slot, the result-measured / level-verdict markers, per-role flags, and inline
  //     <cite> grounding all land.
  const whValues = {
    ...values,
    roles: [
      {
        role: 1,
        company:
          'Acme <cite data-cite-tier="notes" data-source="resume">Acme Corp</cite>',
        title: 'Senior PM',
        tenure: '2019–2023',
        scope: 'Owned the payments surface end-to-end. WH_SCOPE_TOKEN',
        contribution: 'I personally drove the reauth redesign. WH_CONTRIB_TOKEN',
        result: 'Cut checkout drop-off eighteen percent. WH_RESULT_TOKEN',
        measured: 'yes',
        flags: { green: ['Clear I-not-we ownership'], red: ['Metric self-reported'] },
      },
    ],
    trajectory: {
      scopeArc: 'Feature → surface → product across three roles. WH_ARC_TOKEN',
      patterns: 'Consistently took the ambiguous brief. WH_PATTERN_TOKEN',
      levelFit: 'Stories match Senior PM scope. WH_FIT_TOKEN',
      verdict: 'at',
    },
  };
  const filledWh = fill(skeleton, whValues);
  assert(
    filledWh.includes('WH_SCOPE_TOKEN') &&
      filledWh.includes('WH_CONTRIB_TOKEN') &&
      filledWh.includes('WH_RESULT_TOKEN'),
    'wh: per-role slots filled'
  );
  assert(
    filledWh.includes('WH_ARC_TOKEN') &&
      filledWh.includes('WH_PATTERN_TOKEN') &&
      filledWh.includes('WH_FIT_TOKEN'),
    'wh: trajectory slots filled'
  );
  const roleBlock = sliceCard(filledWh, 'role-evidence');
  assert(
    /<span\b[^>]*data-measured\s*=\s*"yes"[^>]*data-selected/.test(roleBlock) ||
      /<span\b[^>]*data-selected[^>]*data-measured\s*=\s*"yes"/.test(roleBlock),
    'wh: result-measured=yes marked data-selected'
  );
  assert(countSelected(roleBlock, 'data-measured') === 1, 'wh: exactly one measured selected');
  assert(
    /data-flags="green"[\s\S]*?Clear I-not-we ownership/.test(roleBlock),
    'wh: per-role green flag appended'
  );
  assert(
    /data-flags="red"[\s\S]*?Metric self-reported/.test(roleBlock),
    'wh: per-role red flag appended'
  );
  const trajBlock = sliceCard(filledWh, 'trajectory-synthesis');
  assert(
    /<span\b[^>]*data-verdict\s*=\s*"at"[^>]*data-selected/.test(trajBlock) ||
      /<span\b[^>]*data-selected[^>]*data-verdict\s*=\s*"at"/.test(trajBlock),
    'wh: level-verdict=at marked data-selected'
  );
  assert(countSelected(trajBlock, 'data-verdict') === 1, 'wh: exactly one verdict selected');
  assert(
    roleBlock.includes('data-cite-tier="notes" data-source="resume"'),
    'wh: inline <cite> preserved inside a role slot'
  );
  // the competency dims + reco still fill in the same pass (the wh pass is additive)
  assert(filledWh.includes('UNIQUE_NOTE_TOKEN_X1'), 'wh: competency dim pass still runs alongside');
  assert(countSelected(filledWh, 'data-reco') === 1, 'wh: reco still marked alongside wh pass');

  // (e) backward-compat golden inertness — a scorecard WITHOUT the role-evidence family
  //     fills byte-identically whether or not values.roles/trajectory are supplied. This is
  //     the proof the new pass is inert on the other seven archetypes.
  const noWh = skeleton
    .replace(/\s*<section class="role"[\s\S]*?<\/section>/g, '')
    .replace(/\s*<section class="trajectory"[\s\S]*?<\/section>/g, '');
  // (match the real <section>, not the skeleton's doc-comment which documents the anchor)
  assert(
    !/<section\b[^>]*data-card="role-evidence"/.test(noWh),
    'bc: fixture stripped of the role-evidence family'
  );
  const bcPlain = fill(noWh, values);
  const bcWithRoles = fill(noWh, whValues);
  assert(
    bcPlain === bcWithRoles,
    'bc: role/trajectory values are inert on a non-work-history sheet (byte-identical)'
  );

  // (g) calibration anchors (FR-6 / D3, D7, D8, D9, D10).
  const calValues = {
    scores: { 'example-dimension-one': 2 },
    notes: { 'example-dimension-one': 'Second-probe insight.', 'example-dimension-two': 'n/a' },
    untested: ['example-dimension-two'],
    noteMatchesLevel: { 'example-dimension-one': 3 },
    scoreRationales: { 'example-dimension-one': 'One instance, late and prompted.' },
    rebuttals: { 'example-dimension-one': 'Strongest case for at-bar: the second answer was complete.' },
    sweeps: {
      'example-dimension-one': [
        { t: '12:04', html: '<cite data-cite-tier="notes" data-source="notes">first pass</cite>' },
        { t: '31:50', html: '<cite data-cite-tier="notes" data-source="notes">second probe</cite>' },
      ],
    },
    recoRationale: 'Below bar on one dimension, defended above.',
    rubricProvenance: 'derived-from-jd; agreed 2026-07-21',
    reco: 'no',
  };
  const cal = fill(skeleton, calValues);
  const calOne = sliceDim(cal, 'example-dimension-one');
  const calTwo = sliceDim(cal, 'example-dimension-two');

  assert(/data-note-matches-level\s*=\s*"3"/.test(calOne), 'cal: data-note-matches-level emitted');
  assert(/data-score-rationale\s*=\s*"[^"]+"/.test(calOne), 'cal: data-score-rationale emitted');
  assert(/data-rebuttal\s*=\s*"[^"]+"/.test(calOne), 'cal: data-rebuttal emitted');
  assert(
    /<section\b[^>]*\bdata-untested(?=[\s/>])/.test(calTwo),
    'cal: untested dimension tagged, not scored (D7)'
  );
  assert(
    !/data-untested/.test(calOne),
    'cal: a scored dimension is never tagged untested'
  );
  assert(
    /<details\b[^>]*data-card\s*=\s*"evidence-sweep"/.test(calOne),
    'cal: evidence-sweep details block rendered'
  );
  assert(
    !/<details\b[^>]*data-card\s*=\s*"evidence-sweep"[^>]*\bopen\b/.test(calOne),
    'cal: evidence sweep is COLLAPSED by default (no open attribute)'
  );
  assert(
    calOne.indexOf('data-input="notes:example-dimension-one"') <
      calOne.indexOf('data-card="evidence-sweep"'),
    'cal: sweep sits UNDER that dimension\'s notes (D9)'
  );
  assert(
    (calOne.match(/<li\b[^>]*data-t\s*=\s*"/g) || []).length === 2,
    'cal: both swept instances rendered with timestamps'
  );
  assert(
    (calOne.match(/<li\b[^>]*data-t[^>]*>\s*<cite\b[^>]*data-cite-tier/g) || []).length === 2,
    'cal: every swept instance carries a citation (gate 1 of check-scoring-calibration)'
  );
  // Assert against the ELEMENT, not the file: the skeleton's doc-comment quotes
  // `<main data-card="scorecard">` in prose, so a whole-file regex passes while the real root
  // carries nothing (caught in browser verification, not by the string assertion it replaced).
  const calBody = cal.replace(/<!--[\s\S]*?-->/g, '');
  const calComments = (cal.match(/<!--[\s\S]*?-->/g) || []).join('');
  assert(
    /<main\b[^>]*data-reco-rationale\s*=\s*"[^"]+"/.test(calBody),
    'cal: root data-reco-rationale emitted on the real <main>, not the doc-comment'
  );
  assert(
    /<main\b[^>]*data-rubric-provenance\s*=\s*"[^"]+"/.test(calBody),
    'cal: root data-rubric-provenance emitted on the real <main>, not the doc-comment'
  );
  assert(
    !/data-reco-rationale|data-rubric-provenance/.test(calComments),
    'cal: the skeleton doc-comment is never stamped (regression: comment-blind root match)'
  );
  // No placeholder prose, and the default reading experience is untouched: a fill with no
  // calibration values must be byte-identical to the pre-change output for the same values.
  assert(
    !/data-rebuttal|data-note-matches-level|data-score-rationale|evidence-sweep|data-rubric-provenance/.test(
      filled
    ),
    'cal: calibration anchors are absent entirely when no calibration values are supplied'
  );

  for (const line of checks) console.error(line);
  console.log(`fill-scorecard selftest: ${pass}/${total} PASS`);
  return pass === total ? 0 : 1;
}

function sliceDim(html, id) {
  const re = new RegExp('<section\\b[^>]*\\bdata-dim\\s*=\\s*"' + escapeRe(id) + '"[^>]*>', 'g');
  const m = re.exec(html);
  if (!m) return '';
  const end = matchElementEnd(html, m.index, 'section');
  return html.slice(m.index, end);
}

function sliceCard(html, cardValue) {
  const re = new RegExp('<section\\b[^>]*\\bdata-card\\s*=\\s*"' + escapeRe(cardValue) + '"[^>]*>', 'g');
  const m = re.exec(html);
  if (!m) return '';
  const end = matchElementEnd(html, m.index, 'section');
  return html.slice(m.index, end);
}

function countSelected(html, anchorAttr) {
  const re = new RegExp('<[a-zA-Z0-9]+\\b[^>]*\\b' + anchorAttr + '\\s*=\\s*"[^"]*"[^>]*>', 'g');
  let n = 0;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (hasAttr('data-selected', m[0])) n += 1;
  }
  return n;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main(argv) {
  const args = argv.slice(2);
  if (args.includes('--selftest')) {
    process.exit(selftest());
  }
  const cmd = args[0];

  if (cmd === 'parse') {
    const file = args[1];
    if (!file) die('usage: fill-scorecard.mjs parse <scorecard.html>');
    const html = readFileSync(resolve(file), 'utf8');
    process.stdout.write(JSON.stringify(parse(html), null, 2) + '\n');
    return;
  }

  if (cmd === 'fill') {
    const file = args[1];
    const valuesFile = args[2];
    if (!file || !valuesFile) die('usage: fill-scorecard.mjs fill <scorecard.html> <values.json> [--out <path>]');
    const outIdx = args.indexOf('--out');
    const html = readFileSync(resolve(file), 'utf8');
    const values = JSON.parse(readFileSync(resolve(valuesFile), 'utf8'));
    const out =
      outIdx >= 0 && args[outIdx + 1]
        ? resolve(args[outIdx + 1])
        : join(dirname(resolve(file)), 'filled-scorecard.html');
    writeFileSync(out, fill(html, values));
    process.stdout.write(out + '\n');
    return;
  }

  die('usage: fill-scorecard.mjs <parse|fill|--selftest> ...');
}

function die(msg) {
  console.error(msg);
  process.exit(2);
}

main(process.argv);
