#!/usr/bin/env node
// Pure selftest for the /landing-page bundled style + reference substrate (Story 260624-dqg).
// No network, no LLM, no headless browser — reads the token JSON, the gallery HTML, and the
// reference .md files from disk and asserts. Run: `node tests/selftest.mjs` (exit 0 = green).
//
// Gates: AC2/AC6 token-shape + WCAG-AA contrast (arithmetic done here, never model-judged —
// skill-patterns.md §H), AC3 gallery renders 6 distinct named styles offline & self-contained,
// AC4 section-scaffolds.md sections/rows, AC5 hero-archetypes.md + copy-gates.md sections.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REF = path.join(HERE, "..", "reference");
const SKILL_DIR = path.join(HERE, "..");

let pass = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { pass++; } else { failures.push(msg); }
}
function read(p) {
  try { return fs.readFileSync(p, "utf8"); }
  catch { failures.push(`MISSING FILE: ${path.relative(SKILL_DIR, p)}`); return ""; }
}
function has(hay, needle, label) {
  ok(hay.toLowerCase().includes(needle.toLowerCase()), `${label}: expected to contain "${needle}"`);
}

// ---- WCAG contrast helpers (relative luminance per WCAG 2.1) ----
function channel(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function luminance(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function contrastRatio(a, b) {
  const l1 = luminance(a), l2 = luminance(b);
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}
const AA = 4.5;

// ---- The 6 canonical style names + ids (verbatim to 02_design.html#styles) ----
const EXPECTED = [
  { id: "clean-minimal-saas", name: "Clean minimal SaaS" },
  { id: "dark-developer-tool", name: "Dark developer tool" },
  { id: "bold-playful-illustration", name: "Bold playful illustration" },
  { id: "editorial-typographic", name: "Editorial / typographic" },
  { id: "warm-consumer-lifestyle", name: "Warm consumer lifestyle" },
  { id: "enterprise-trust", name: "Enterprise trust" },
];
const REQUIRED_PALETTE = ["--bg", "--fg", "--accent", "--accent-fg", "--muted", "--surface", "--surface-2", "--border"];
const REQUIRED_TYPE = ["--font-display", "--font-body", "--scale-base", "--scale-ratio", "--weight-display", "--weight-body"];

// ===== AC1/AC2/AC6 — token sets =====
let tokens = null;
try {
  tokens = JSON.parse(read(path.join(REF, "style-tokens.json")));
} catch (e) { failures.push(`style-tokens.json is not valid JSON: ${e.message}`); }

if (tokens) {
  ok(Array.isArray(tokens.styles) && tokens.styles.length === 6, `expected exactly 6 token sets, got ${tokens.styles?.length}`);
  for (const exp of EXPECTED) {
    const s = (tokens.styles || []).find(x => x.id === exp.id);
    ok(!!s, `token set "${exp.id}" present`);
    if (!s) continue;
    ok(s.name === exp.name, `token set ${exp.id} name "${s.name}" === "${exp.name}"`);
    for (const v of REQUIRED_PALETTE) ok(s.palette && s.palette[v] && String(s.palette[v]).trim(), `${exp.id} palette.${v} present & non-empty`);
    for (const v of REQUIRED_TYPE) ok(s.type && s.type[v] && String(s.type[v]).trim(), `${exp.id} type.${v} present & non-empty`);
    ok(s.density && s.density["--space-unit"] && s.density["--section-pad"], `${exp.id} density vars present`);
    ok(s.density && s.density.label && String(s.density.label).trim(), `${exp.id} density.label present`);
    ok(s.radius && s.radius["--radius"], `${exp.id} --radius present`);
    ok(s.shadow && s.shadow["--shadow"], `${exp.id} --shadow present`);
    ok(s.imagery && String(s.imagery).trim().length > 10, `${exp.id} imagery directive present`);
    // contrast (the arithmetic gate)
    if (s.palette) {
      const fgbg = contrastRatio(s.palette["--fg"], s.palette["--bg"]);
      const cta = contrastRatio(s.palette["--accent-fg"], s.palette["--accent"]);
      ok(fgbg >= AA, `${exp.id} fg/bg contrast ${fgbg.toFixed(2)} >= ${AA}`);
      ok(cta >= AA, `${exp.id} CTA (accent-fg/accent) contrast ${cta.toFixed(2)} >= ${AA}`);
    }
  }
}

// ===== AC3 — offline swatch gallery =====
const gallery = read(path.join(REF, "style-gallery.html"));
if (gallery) {
  ok(!/https?:\/\//i.test(gallery), "style-gallery.html is self-contained — no http(s):// (no CDN)");
  ok(/<style[\s>]/i.test(gallery), "style-gallery.html has an inline <style> block");
  // count swatches in the MARKUP only — strip <script> blocks so JS selector strings don't inflate it
  const markup = gallery.replace(/<script[\s\S]*?<\/script>/gi, "");
  const styleAttrs = [...markup.matchAll(/data-style="([^"]+)"/g)].map(m => m[1]);
  const uniq = new Set(styleAttrs);
  ok(uniq.size === 6, `gallery renders 6 distinct data-style swatches (found ${uniq.size})`);
  for (const exp of EXPECTED) {
    ok(uniq.has(exp.id), `gallery has swatch data-style="${exp.id}"`);
    has(gallery, exp.name, "gallery label");
  }
}

// ===== AC4 — section scaffolds =====
const scaffolds = read(path.join(REF, "section-scaffolds.md"));
if (scaffolds) {
  const SECTIONS = ["Navbar", "Hero", "Social-proof", "Problem", "Solution", "Features as objection",
    "Deeper social proof", "Objection", "Pricing", "final CTA", "Footer"];
  for (const sec of SECTIONS) has(scaffolds, sec, "section-scaffolds row");
  for (const variant of ["B2B SaaS", "Consumer app", "Dev tool", "Info-product"]) has(scaffolds, variant, "section-scaffolds variant");
  has(scaffolds, "Purchase", "section-scaffolds governing equation");
  has(scaffolds, "copy-length", "section-scaffolds copy-length rule");
  has(scaffolds, "## ", "section-scaffolds has a ToC/headings");
}

// ===== AC5 — hero archetypes =====
const hero = read(path.join(REF, "hero-archetypes.md"));
if (hero) {
  for (const a of ["Benefit-led", "live demo", "illustration", "Social-proof-forward"]) has(hero, a, "hero archetype");
  for (const rule of ["litmus", "von Restorff", "first-person", "product in action"]) has(hero, rule, "hero rule");
}

// ===== AC5 — copy gates =====
const gates = read(path.join(REF, "copy-gates.md"));
if (gates) {
  for (const c of ["Conversion", "Interest", "Clarity", "Expansion", "Brevity", "Disbelief"]) has(gates, c, "copy-gates 6-criteria");
  for (const t of ["visualize", "falsify", "nobody else"]) has(gates, t, "copy-gates Harry Dry 3-test");
  has(gates, "litmus", "copy-gates Julian litmus");
  has(gates, "von Restorff", "copy-gates single-CTA");
  for (const lever of ["social proof", "authority", "reciprocity", "scarcity", "commitment", "liking", "unity"]) has(gates, lever, "copy-gates psychology lever");
  has(gates, "anti-pattern", "copy-gates anti-pattern avoid-list");
  // qrm: asset fidelity (AC7) + mobile-hard visual self-check (AC8)
  has(gates, "{#asset-fidelity}", "copy-gates asset-fidelity anchor");
  has(gates, "object-fit", "copy-gates asset-fidelity object-fit rule");
  has(gates, "device frame", "copy-gates asset-fidelity device frame");
  has(gates, "aspect ratio", "copy-gates asset-fidelity aspect-ratio rule");
  has(gates, "HARD pass dimension", "copy-gates mobile is a hard visual dimension");
}

// ===== qrm AC4/AC5/AC6 — media strategy reference =====
const media = read(path.join(REF, "media-strategy.md"));
if (media) {
  has(media, "## Format menu", "media-strategy format-menu heading (#format-menu)");
  has(media, "## Degrade ladder", "media-strategy degrade-ladder heading (#degrade-ladder)");
  for (const fmt of ["device-framed", "carousel", "video"]) has(media, fmt, "media-strategy format menu entry");
  has(media, "recordVideo", "media-strategy Playwright recordVideo");
  has(media, "ffmpeg", "media-strategy ffmpeg pipeline");
  has(media, "command -v ffmpeg", "media-strategy ffmpeg capability probe");
  has(media, "real product", "media-strategy real-product-only (no fabrication)");
  ok(!/\bsrc\s*=\s*["']https?:\/\//i.test(media), "media-strategy embed rules forbid remote src");
}

// ===== D7 — Story B (pe2) owns SKILL.md; in the shipped tree it must be present =====
// During the dqg-only build window this asserted ABSENCE; once Story B ships SKILL.md the
// long-lived invariant inverts — the substrate and its consumer skill ship together.
ok(fs.existsSync(path.join(SKILL_DIR, "SKILL.md")), "SKILL.md present under landing-page/ (Story B owns it)");

// ---- report ----
if (failures.length === 0) {
  console.log(`selftest: PASS — ${pass} assertions green`);
  process.exit(0);
} else {
  console.error(`selftest: FAIL — ${pass} passed, ${failures.length} failed:`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
