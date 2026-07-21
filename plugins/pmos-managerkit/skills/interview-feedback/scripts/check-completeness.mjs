#!/usr/bin/env node
// check-completeness.mjs — artifact-hygiene gate for /interview-feedback (design §FR-9 / D4)
//
// Usage:
//   node check-completeness.mjs [--stamp-draft] <artifact.html>
//   node check-completeness.mjs --selftest
//
// Catches a promised section that shipped EMPTY while the run reported complete. Three shapes,
// all keyed on the skeletons' own conventions (reference/interviewer-notes-skeleton.html and
// _shared/interview-guidelines/scorecard-skeleton.html), never on a loose bracket regex:
//
//   1. placeholder  — bracketed ghost text carrying an ellipsis, e.g. `[ … your observations go here ]`.
//                     The ellipsis is what makes it a placeholder; ordinary bracketed prose
//                     ("[sic]", "[2]", "[Q3]") does not carry one and is NOT flagged. A false
//                     positive would stamp a COMPLETE artifact "draft", which is its own failure.
//   2. empty-slot   — a `data-input="<slot>"` element with nothing in it. For a slot whose children
//                     are option chips (data-reco / data-v / data-measured / data-verdict) "empty"
//                     means no chip carries `data-selected` — the chip labels are skeleton text, not
//                     an answer. For every other slot it means no text content.
//   3. token        — an un-substituted {{…}} mustache token left over from the skeleton.
//
// Exit 0 = nothing unfilled. Exit 1 = detections (printed one per line). Exit 2 = usage.
//
// --stamp-draft: on detections, stamp the artifact `draft — pending <slot>` naming the specific
// unfilled slots. Idempotent (replaces a prior stamp in place). The gate NEVER fabricates the
// missing content — it captures (the skill's interactive path) or it stamps. Nothing else.
//
// Zero-dependency, Node built-ins only.

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const OPTION_CHIP_RE = /<[a-zA-Z][\w-]*\b[^>]*\bdata-(?:reco|v|measured|verdict)\s*=/;
const SELECTED_RE = /<[a-zA-Z][\w-]*\b[^>]*\bdata-selected\b/;
// A placeholder is bracketed text containing an ellipsis (… or ...) on one line.
const PLACEHOLDER_RE = /\[[^\]\n]*(?:…|\.\.\.)[^\]\n]*\]/g;
const TOKEN_RE = /\{\{[^}\n]*\}\}/g;
const DRAFT_STAMP_RE = /[ \t]*<p\b[^>]*\bdata-draft-pending\b[\s\S]*?<\/p>\n?/i;

// Comments are documentation, not content: the skeletons' own doc-comments illustrate the
// conventions this gate looks for. Scanning them would flag every artifact.
function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

function stripTags(s) {
  return s.replace(/<[^>]*>/g, '');
}

// Inner HTML of the element whose opening tag ends at `from`, tracking nesting of the same tag.
function innerHtml(html, from, tagName) {
  const re = new RegExp(`<(/?)${tagName}\\b[^>]*?(/?)>`, 'gi');
  re.lastIndex = from;
  let depth = 1;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[1] === '/') {
      depth--;
      if (depth === 0) return html.slice(from, m.index);
    } else if (m[2] !== '/') {
      depth++;
    }
  }
  return html.slice(from); // unclosed tag — treat the remainder as the body
}

function getAttr(attrs, name) {
  const m = attrs.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  if (!m) return null;
  return m[2] !== undefined ? m[2] : m[3];
}

function slotIsEmpty(inner) {
  return OPTION_CHIP_RE.test(inner) ? !SELECTED_RE.test(inner) : stripTags(inner).trim() === '';
}

// The work-history scorecard ships a FIXED number of `data-card="role-evidence"` blocks; a
// candidate with fewer past roles leaves the trailing blocks entirely untouched. A wholly-empty
// block is an unused one, not an unfinished one — flagging it would stamp a complete artifact
// "draft" on every short work history. A PARTIALLY filled block is still flagged: that one really
// is unfinished. Returns the [start,end) character ranges of the blocks to skip.
function unusedRepeatedBlocks(html) {
  const skip = [];
  const sectionRe = /<(section)\b([^>]*\bdata-card\s*=\s*"role-evidence"[^>]*)>/gi;
  let s;
  while ((s = sectionRe.exec(html)) !== null) {
    const start = sectionRe.lastIndex;
    const inner = innerHtml(html, start, 'section');
    const slots = [...inner.matchAll(/<([a-zA-Z][\w-]*)\b[^>]*\bdata-input\s*=[^>]*>/g)];
    if (!slots.length) continue;
    const allEmpty = slots.every((sm) =>
      slotIsEmpty(innerHtml(inner, sm.index + sm[0].length, sm[1]))
    );
    if (allEmpty) skip.push([start, start + inner.length]);
  }
  return skip;
}

// --- core scan; returns { findings: [{kind, slot, detail}] } ---
function scan(rawHtml) {
  const html = stripComments(rawHtml);
  const findings = [];
  const skipRanges = unusedRepeatedBlocks(html);
  const inSkipped = (i) => skipRanges.some(([a, b]) => i >= a && i < b);

  const openRe = /<([a-zA-Z][\w-]*)\b([^>]*?)(\/?)>/g;
  let m;
  while ((m = openRe.exec(html)) !== null) {
    const [, tagName, attrs, selfClosing] = m;
    if (!/\bdata-input\s*=/.test(attrs)) continue;
    if (inSkipped(m.index)) continue;
    const slot = getAttr(attrs, 'data-input') || '(unnamed)';
    const inner = selfClosing === '/' ? '' : innerHtml(html, openRe.lastIndex, tagName);
    if (slotIsEmpty(inner)) {
      findings.push({
        kind: 'empty-slot',
        slot,
        detail: `data-input="${slot}" is empty`,
      });
    }
  }

  for (const p of html.matchAll(PLACEHOLDER_RE)) {
    findings.push({
      kind: 'placeholder',
      slot: nearestSlot(html, p.index),
      detail: `unfilled placeholder ${JSON.stringify(p[0].trim())}`,
    });
  }

  for (const t of html.matchAll(TOKEN_RE)) {
    findings.push({
      kind: 'token',
      slot: t[0].replace(/[{}]/g, '').trim() || '(unnamed)',
      detail: `un-substituted token ${t[0]}`,
    });
  }

  return { findings };
}

// Name the slot a placeholder sits in, so the draft stamp is specific rather than generic.
// Falls back to the nearest preceding heading, then to a positional label.
function nearestSlot(html, index) {
  const before = html.slice(0, index);
  const slotMatches = [...before.matchAll(/\bdata-input\s*=\s*"([^"]*)"/g)];
  if (slotMatches.length) return slotMatches[slotMatches.length - 1][1];
  const headings = [...before.matchAll(/<(?:h[1-6]|p)\b[^>]*>([^<]{3,80})</g)];
  if (headings.length) return headings[headings.length - 1][1].trim();
  return '(unnamed section)';
}

// --- draft stamp (never a fabrication — it names the hole, it does not fill it) ---
function stampDraft(path, slots) {
  const html = readFileSync(path, 'utf8');
  const label = `draft — pending ${slots.join(', ')}`;
  const stamp =
    `<p data-draft-pending="${slots.join(',')}" ` +
    `style="font:600 .85rem/1.4 -apple-system,Segoe UI,Roboto,sans-serif;` +
    `color:#b91c1c;border:1px solid #b91c1c;border-radius:6px;padding:.4rem .7rem;margin:0 0 1rem">` +
    `${label}</p>`;
  let next;
  if (DRAFT_STAMP_RE.test(html)) {
    next = html.replace(DRAFT_STAMP_RE, () => stamp + '\n');
  } else if (/<main\b[^>]*>/i.test(html)) {
    next = html.replace(/<main\b[^>]*>/i, (openTag) => openTag + '\n' + stamp);
  } else if (/<body\b[^>]*>/i.test(html)) {
    next = html.replace(/<body\b[^>]*>/i, (openTag) => openTag + '\n' + stamp);
  } else {
    next = stamp + '\n' + html;
  }
  if (next !== html) writeFileSync(path, next, 'utf8');
  return label;
}

function runFile(path, opts = {}) {
  const html = readFileSync(path, 'utf8');
  const { findings } = scan(html);
  if (findings.length === 0) {
    console.log('✓ completeness: no unfilled promised content');
    return 0;
  }
  for (const f of findings) console.log(`[${f.kind}] ${f.detail}`);
  console.log(`check-completeness: ${findings.length} unfilled`);
  if (opts.stampDraft) {
    const slots = [...new Set(findings.map((f) => f.slot))];
    console.log(`stamped-draft: ${stampDraft(path, slots)}`);
  }
  return 1;
}

// --- selftest ---
function selftest() {
  const dir = mkdtempSync(join(tmpdir(), 'check-completeness-'));
  const selfPath = fileURLToPath(import.meta.url);

  const filled = `<html><body><main data-card="scorecard">
    <div class="notes" data-input="notes:vision">Argued the read-only viewer ships first [sic] — see the Q3 doc [2].</div>
    <div class="reco-opts" data-input="reco">
      <span data-reco="no">No-hire</span><span data-reco="yes" data-selected>Hire</span>
    </div>
  </main></body></html>`;

  // The motivating case: the observer block ships with its placeholder intact.
  const observer = `<html><body><main data-output="interviewer-notes">
    <p class="block-label">Observer's independent read</p>
    <div data-input="observer:read">[ … your observations go here ]</div>
  </main></body></html>`;

  const emptySlot = `<html><body><main>
    <div class="notes" data-input="notes:analytical"></div>
  </main></body></html>`;

  const unselectedChips = `<html><body><main>
    <div class="reco-opts" data-input="reco">
      <span data-reco="no">No-hire</span><span data-reco="yes">Hire</span>
    </div>
  </main></body></html>`;

  const token = `<html><body><main>
    <div data-input="notes:x">Scored against {{archetype}} bar.</div>
  </main></body></html>`;

  // work-history: a WHOLLY-empty role block is unused (candidate had fewer roles than the sheet
  // has blocks) and must not be flagged; a PARTIALLY filled one is genuinely unfinished and must.
  const roleBlock = (n, cells) =>
    `<section class="role" data-card="role-evidence" data-role="${n}">${cells}</section>`;
  const filledCells =
    '<div data-input="role:company">Acme</div><div data-input="role:title">PM</div>';
  const emptyCells = '<div data-input="role:company"></div><div data-input="role:title"></div>';
  const partialCells =
    '<div data-input="role:company">Acme</div><div data-input="role:title"></div>';
  const unusedRole = `<html><body><main>${roleBlock(1, filledCells)}${roleBlock(2, emptyCells)}</main></body></html>`;
  const partialRole = `<html><body><main>${roleBlock(1, filledCells)}${roleBlock(2, partialCells)}</main></body></html>`;

  const cases = [
    { name: 'PASS-filled', html: filled, expect: 0, stdoutIncludes: '✓ completeness' },
    { name: 'PASS-unused-role-block', html: unusedRole, expect: 0, stdoutIncludes: '✓ completeness' },
    {
      name: 'FAIL-partial-role-block',
      html: partialRole,
      expect: 1,
      stdoutIncludes: 'data-input="role:title" is empty',
    },
    { name: 'FAIL-observer-placeholder', html: observer, expect: 1, stdoutIncludes: '[placeholder]' },
    { name: 'FAIL-empty-slot', html: emptySlot, expect: 1, stdoutIncludes: 'data-input="notes:analytical" is empty' },
    { name: 'FAIL-unselected-chips', html: unselectedChips, expect: 1, stdoutIncludes: 'data-input="reco" is empty' },
    { name: 'FAIL-token', html: token, expect: 1, stdoutIncludes: '[token]' },
  ];

  let pass = 0;
  for (const tc of cases) {
    const p = join(dir, `case-${tc.name}.html`);
    writeFileSync(p, tc.html, 'utf8');
    const res = spawnSync(process.execPath, [selfPath, p], { encoding: 'utf8' });
    const ok = res.status === tc.expect && (res.stdout || '').includes(tc.stdoutIncludes);
    if (ok) pass++;
    else {
      console.error(
        `selftest case ${tc.name}: expected exit ${tc.expect} + "${tc.stdoutIncludes}", got ${res.status}`
      );
      console.error(res.stdout);
    }
  }
  const total = cases.length + 3;

  // stamp-draft: names the specific slot, is idempotent, and never touches a complete artifact.
  const sp = join(dir, 'stamp.html');
  writeFileSync(sp, observer, 'utf8');
  spawnSync(process.execPath, [selfPath, '--stamp-draft', sp], { encoding: 'utf8' });
  const once = readFileSync(sp, 'utf8');
  if (once.includes('draft — pending observer:read')) pass++;
  else console.error('selftest stamp-draft: stamp missing or slot not named');

  spawnSync(process.execPath, [selfPath, '--stamp-draft', sp], { encoding: 'utf8' });
  const twice = readFileSync(sp, 'utf8');
  if (twice === once && (twice.match(/data-draft-pending/g) || []).length === 1) pass++;
  else console.error('selftest stamp-draft: not idempotent');

  const cp = join(dir, 'complete.html');
  writeFileSync(cp, filled, 'utf8');
  spawnSync(process.execPath, [selfPath, '--stamp-draft', cp], { encoding: 'utf8' });
  if (readFileSync(cp, 'utf8') === filled) pass++;
  else console.error('selftest stamp-draft: mutated a COMPLETE artifact');

  if (pass === total) {
    console.log(`check-completeness selftest: ${pass}/${total} PASS`);
    return 0;
  }
  console.error(`check-completeness selftest: ${pass}/${total} PASS (FAILED)`);
  return 1;
}

// --- main ---
const rawArgs = process.argv.slice(2);
const wantStamp = rawArgs.includes('--stamp-draft');
const args = rawArgs.filter((a) => a !== '--stamp-draft');
if (args[0] === '--selftest') {
  process.exit(selftest());
} else if (args.length === 1) {
  process.exit(runFile(args[0], { stampDraft: wantStamp }));
} else {
  console.error(
    'Usage: node check-completeness.mjs [--stamp-draft] <artifact.html>\n' +
      '       node check-completeness.mjs --selftest'
  );
  process.exit(2);
}
