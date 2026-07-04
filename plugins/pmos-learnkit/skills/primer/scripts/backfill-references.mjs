#!/usr/bin/env node
// backfill-references.mjs — retro-fit the bottom `## References` section into every bundled
// corpus primer (story 260704-3jt). The backfill caller of the single generator (INV-1): it
// imports injectReferences() from references-section.mjs and NEVER re-implements the markup.
//
// Contract (docs/pmos/features/2026-07-04_primer-references/02_design.html §4.2, INV-1/3/4/5,
// D6/D8/D10):
//   - Walk data/primers/*.html; for each, read the sibling `<stem>.sources.json` (array of
//     {url, takeaway, topic, tier, paywalled}) and inject the References section via the shared
//     injectReferences(html, sources) — placed immediately before </main>, idempotent (INV-4).
//   - Pure local transform: no network, no re-verification, no re-sourcing (INV-3). Every source
//     is shown honestly (INV-5) — the generator lists every url, cited ones marked ·cited·.
//   - Atomic write: temp-then-rename(2) so a crash never leaves a half-written primer.
//   - A primer with no sibling sidecar is reported to stderr and skipped, never fatal.
//   - --dry-run: report would-change files, write nothing.
//   - Zero-dep Node ESM; primers-index.json is never touched (D8) — HTML only.

import { readFileSync, writeFileSync, renameSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { injectReferences } from './references-section.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
// scripts/ → ../data/primers/
const PRIMERS_DIR = join(HERE, '..', 'data', 'primers');

function parseArgs(argv) {
  return { dryRun: argv.includes('--dry-run') };
}

function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));

  let entries;
  try {
    entries = readdirSync(PRIMERS_DIR).filter((f) => f.endsWith('.html')).sort();
  } catch (e) {
    process.stderr.write(`backfill-references: cannot read primers dir ${PRIMERS_DIR}: ${e.message}\n`);
    process.exit(2);
  }

  let processed = 0;
  let skipped = 0;
  let changed = 0;

  for (const htmlName of entries) {
    const stem = htmlName.replace(/\.html$/, '');
    const htmlPath = join(PRIMERS_DIR, htmlName);
    const sidecarPath = join(PRIMERS_DIR, `${stem}.sources.json`);

    let sourcesRaw;
    try {
      sourcesRaw = readFileSync(sidecarPath, 'utf8');
    } catch {
      process.stderr.write(`backfill-references: SKIP ${htmlName} — no sibling ${stem}.sources.json\n`);
      skipped += 1;
      continue;
    }

    let sources;
    try {
      sources = JSON.parse(sourcesRaw);
    } catch (e) {
      process.stderr.write(`backfill-references: SKIP ${htmlName} — malformed ${stem}.sources.json: ${e.message}\n`);
      skipped += 1;
      continue;
    }
    if (!Array.isArray(sources)) {
      process.stderr.write(`backfill-references: SKIP ${htmlName} — ${stem}.sources.json is not an array\n`);
      skipped += 1;
      continue;
    }

    const html = readFileSync(htmlPath, 'utf8');
    const next = injectReferences(html, sources);
    processed += 1;

    if (next === html) {
      // Already up-to-date (idempotent re-run) — nothing to write.
      continue;
    }
    changed += 1;

    if (dryRun) {
      process.stdout.write(`would change: ${htmlName} (${sources.length} sources)\n`);
      continue;
    }

    // Atomic write: temp-then-rename in the same directory (same filesystem → atomic rename(2)).
    const tmpPath = `${htmlPath}.tmp-${process.pid}`;
    writeFileSync(tmpPath, next);
    renameSync(tmpPath, htmlPath);
  }

  const verb = dryRun ? 'would change' : 'changed';
  process.stdout.write(`backfill-references: ${processed} processed, ${changed} ${verb}, ${skipped} skipped\n`);
}

main();
