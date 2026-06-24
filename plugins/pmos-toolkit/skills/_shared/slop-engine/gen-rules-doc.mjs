#!/usr/bin/env node
// gen-rules-doc.mjs — emit the prevention-reference markdown from SLOP_RULES (D-GEN / AC7).
//
// The prevention floor (story D writes it to _shared/design-slop-rules.md) is GENERATED from
// the registry, never hand-authored, so it can't drift from the rules. Each DON'T line embeds a
// rule's `skillGuideline` verbatim — the substring tools/lint-slop-rules.sh (story D) asserts is
// present, keeping detection (registry) and prevention (this doc) in lockstep (Inv-2).
//
// IDEMPOTENT: pure function of the registry, fixed section order, rules sorted by id within a
// section — re-running on an unchanged registry yields byte-identical output.

import { SLOP_RULES } from './registry.mjs';

// Canonical section order (the 8 allowed skillSections).
const SECTION_ORDER = [
  'Typography',
  'Color & Contrast',
  'Layout & Space',
  'Visual Details',
  'Motion',
  'Interaction',
  'Responsive',
  'UX Writing',
];

export function generateRulesDoc(rules = SLOP_RULES) {
  const bySection = new Map();
  for (const r of rules) {
    if (!r.skillGuideline || !r.skillSection) continue;
    if (!bySection.has(r.skillSection)) bySection.set(r.skillSection, []);
    bySection.get(r.skillSection).push(r);
  }
  // Sections not in the canonical order are appended deterministically (alphabetical).
  const sections = [
    ...SECTION_ORDER.filter(s => bySection.has(s)),
    ...[...bySection.keys()].filter(s => !SECTION_ORDER.includes(s)).sort(),
  ];

  const out = [];
  out.push('# Design-slop prevention reference');
  out.push('');
  out.push('<!-- GENERATED from _shared/slop-engine/registry.mjs by gen-rules-doc.mjs — do not edit by hand. -->');
  out.push('<!-- Each DON\'T line embeds a rule\'s skillGuideline verbatim; tools/lint-slop-rules.sh asserts the link. -->');
  out.push('');
  for (const section of sections) {
    const rs = bySection.get(section).slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    out.push(`## ${section}`);
    out.push('');
    for (const r of rs) {
      out.push(`- **DON'T**: ${r.skillGuideline} _(rule: \`${r.id}\`)_`);
    }
    out.push('');
  }
  return out.join('\n').replace(/\n+$/, '\n');
}

// CLI: print to stdout (story D wires the file write + path; this story ships the generator only).
if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(generateRulesDoc());
}
