#!/usr/bin/env node
// validate-brief.mjs — the two /shape-specific problem-brief gates (design §5
// "skill-eval deltas"). Run at Phase 7 (#write-artifact) step 4 against the
// emitted artifact; a failure is a hard stop.
//
//   (1) ceiling-breaker present  — the brief records the mandatory meta-probe
//       outcome (an off-deck probe OR a one-line sufficiency attestation),
//       non-empty and not a template placeholder. Enforces the ceiling, not
//       just the floor (_shared/lens-ledger.md Mechanism 2).
//   (2) no solution-shaped terminal statement — per the operational boundary
//       (design §5): a statement is solution-shaped if it names a mechanism /
//       feature / implementation; problem-shaped if it names a felt outcome +
//       who + when. The terminal "shaped problem" (#tldr) must be problem-shaped.
//
// Usage:
//   node validate-brief.mjs <artifact.html>     # exit 0 pass, 1 fail, 2 bad-invocation
//   node validate-brief.mjs --selftest          # drives both gates over fixtures
//
// Deliberately heuristic + dependency-free (no DOM lib): operates on the raw
// HTML text of the terminal section. Tuned to catch the obvious solution-shaped
// failure ("add a button that…") with low false-positive risk on real problem
// statements.

import { readFileSync } from "node:fs";

// Strip tags → plain text for a captured HTML region.
function _text(html) {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// Extract the inner HTML of <section id="<id>">…</section> (first match).
function _section(html, id) {
  const re = new RegExp(
    `<section[^>]*\\bid\\s*=\\s*["']${id}["'][^>]*>([\\s\\S]*?)<\\/section>`,
    "i"
  );
  const m = String(html).match(re);
  return m ? m[1] : "";
}

// Solution-shaped signal: a build/add verb bound to a concrete mechanism noun.
// Targeted (verb + artifact noun) to avoid flagging problem-domain vocabulary.
const SOLUTION_RE =
  /\b(add|build|create|implement|introduce|ship|wire up|use)\s+(a\s+|an\s+|the\s+)?(button|feature|page|screen|view|queue|webhook|endpoint|api|dashboard|modal|dropdown|form|cache|cron|integration|plugin|widget|toggle|banner|notification|popup|sidebar|menu|setting)s?\b/i;

export function validateBrief(html) {
  const failures = [];

  // Gate 1 — ceiling-breaker present.
  const ledger = _section(html, "lens-ledger");
  const cbMatch = _text(ledger).match(/Ceiling-breaker:\s*(.*)$/i);
  const cbOutcome = cbMatch ? cbMatch[1].trim() : "";
  const placeholderish =
    cbOutcome === "" ||
    /\{\{.*\}\}/.test(cbOutcome) ||
    cbOutcome.length < 12; // a real probe or attestation is a sentence, not a stub
  if (placeholderish) {
    failures.push(
      "ceiling-breaker missing/empty: the lens-ledger section must record an off-deck probe OR a sufficiency attestation (non-empty)"
    );
  }

  // Gate 2 — terminal statement must be problem-shaped.
  const tldr = _text(_section(html, "tldr"));
  const sol = tldr.match(SOLUTION_RE);
  if (sol) {
    failures.push(
      `terminal statement is solution-shaped (names a mechanism/feature): "${sol[0]}" — re-shape as a felt outcome + who + when`
    );
  }

  return { ok: failures.length === 0, failures };
}

function _selftest() {
  const good = `<section id="tldr"><p>Solo makers abandon side projects within three weeks because nothing reflects momentum back to them when they lose it.</p></section>
<section id="lens-ledger"><p>Customer &amp; pain — Answered.</p><p><strong>Ceiling-breaker:</strong> Off-deck probe — does the maker's identity ("am I someone who finishes things") gate re-engagement more than any feature would? Worth surfacing because it reframes retention as identity, not UX.</p></section>`;

  const badSolution = `<section id="tldr"><p>We should add a button that reminds users to come back every day.</p></section>
<section id="lens-ledger"><p><strong>Ceiling-breaker:</strong> deck sufficient for this problem because no off-deck dimension survived scrutiny.</p></section>`;

  const badCeiling = `<section id="tldr"><p>Solo makers lose momentum on side projects and quietly abandon them.</p></section>
<section id="lens-ledger"><p>Customer &amp; pain — Answered.</p><p><strong>Ceiling-breaker:</strong> {{ceiling_breaker_outcome}}</p></section>`;

  const cases = [
    { name: "good", html: good, expectOk: true },
    { name: "bad-solution", html: badSolution, expectOk: false, expectSub: "solution-shaped" },
    { name: "bad-ceiling", html: badCeiling, expectOk: false, expectSub: "ceiling-breaker" },
  ];

  const fails = [];
  for (const c of cases) {
    const r = validateBrief(c.html);
    if (r.ok !== c.expectOk) {
      fails.push(`${c.name}: expected ok=${c.expectOk}, got ok=${r.ok} (${r.failures.join("; ")})`);
      continue;
    }
    if (!c.expectOk && c.expectSub && !r.failures.some((f) => f.includes(c.expectSub))) {
      fails.push(`${c.name}: expected a failure mentioning "${c.expectSub}", got: ${r.failures.join("; ")}`);
    }
  }

  if (fails.length) {
    console.error("FAIL: validate-brief --selftest — " + fails.length + " case(s)");
    for (const f of fails) console.error("  - " + f);
    process.exit(1);
  }
  console.log("PASS: validate-brief --selftest — 3 cases (good / bad-solution / bad-ceiling)");
}

// CLI
const arg = process.argv[2];
if (arg === "--selftest") {
  _selftest();
} else if (!arg) {
  console.error("usage: validate-brief.mjs <artifact.html> | --selftest");
  process.exit(2);
} else {
  let html;
  try {
    html = readFileSync(arg, "utf8");
  } catch (e) {
    console.error("validate-brief: cannot read " + arg + ": " + (e && e.message));
    process.exit(2);
  }
  const r = validateBrief(html);
  if (r.ok) {
    console.log("validate-brief: PASS — ceiling-breaker present + terminal statement problem-shaped");
    process.exit(0);
  }
  console.error("validate-brief: FAIL");
  for (const f of r.failures) console.error("  - " + f);
  process.exit(1);
}
