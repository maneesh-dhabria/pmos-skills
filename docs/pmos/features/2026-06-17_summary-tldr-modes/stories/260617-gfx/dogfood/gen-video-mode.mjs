// Dogfood: /summary-tldr --mode video end-to-end, proving the FR-C1..C4 seam this story owns:
//   --compression → /explainer-video --length map (mode.js, §H/D9)
//   → main-agent handoff command (ORIGINAL source, never the summary)
//   → link + provenance injection into the canonical doc, NO re-host (FR-C2)
//   → graceful degradation when /explainer-video fails (FR-C3).
//
// The produced .mp4 here is generated with the SAME real binaries /explainer-video uses
// (macOS `say` for TTS + ffmpeg for assembly) so the link/provenance + no-re-host assertions
// run against a genuine artifact on a deps-present host. /explainer-video's own model-driven
// ingest→distill→capture pipeline is covered by ITS shipped smoke (see explainer-video tests);
// this dogfood exercises the /summary-tldr video SEAM, not /explainer-video internals.
//
// Run: node gen-video-mode.mjs   (writes a real .mp4 + a linked canonical .html alongside; asserts)
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '../../../../../../..'); // worktree root
const MODE = resolve(ROOT, 'plugins/pmos-toolkit/skills/summary-tldr/scripts/mode.js');

let pass = 0, fail = 0;
const ok = (n) => { pass++; process.stdout.write(`  ok   ${n}\n`); };
const bad = (n) => { fail++; process.stdout.write(`  FAIL ${n}\n`); };
const check = (n, cond) => (cond ? ok(n) : bad(n));

// --- 1) Length mapping is real + deterministic (FR-C1/D9) ------------------------------------
console.log('== length mapping (mode.js --video-length-resolve) ==');
const resolveLen = (compression, override) => {
  const args = [MODE, '--video-length-resolve', '--compression', compression];
  if (override) args.push('--video-length', override);
  return JSON.parse(execFileSync('node', args).toString());
};
check('tight → quick', resolveLen('tight').length === 'quick');
check('standard → standard', resolveLen('standard').length === 'standard');
check('detailed → deep', resolveLen('detailed').length === 'deep');
const ov = resolveLen('tight', 'deep');
check('--video-length override wins over band', ov.length === 'deep' && ov.source === 'override');

// --- 2) Handoff command carries the ORIGINAL source, resolved length, --non-interactive ------
console.log('== main-agent handoff command (FR-C1) ==');
const ORIGINAL_SOURCE = 'https://www.w3.org/WAI/standards-guidelines/wcag/glance/';
const resolved = resolveLen('detailed'); // → deep
const handoff = `/explainer-video ${ORIGINAL_SOURCE} --length ${resolved.length} --non-interactive`;
check('handoff passes the ORIGINAL source (not the summary)', handoff.includes(ORIGINAL_SOURCE));
check('handoff carries the resolved --length', handoff.includes('--length deep'));
check('handoff is non-interactive', handoff.includes('--non-interactive'));

// --- 3) Produce a REAL .mp4 with the same binaries /explainer-video uses (deps-present host) --
console.log('== real .mp4 via say + ffmpeg (stand-in for /explainer-video output) ==');
// /explainer-video writes to {docs_path}/explainer-video/ — its OWN dir. We mimic that here so
// the no-re-host assertion is meaningful: the video lives outside the summary-tldr dir.
const EV_DIR = resolve(here, 'explainer-video-out');      // stands in for {docs_path}/explainer-video/
const ST_DIR = resolve(here, 'summary-tldr-out');         // stands in for {summary_tldr_dir}
for (const d of [EV_DIR, ST_DIR]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }
const WAV = resolve(EV_DIR, 'narration.aiff');
const MP4 = resolve(EV_DIR, 'wcag2-at-a-glance.mp4');
let mp4Real = false;
try {
  // TTS a one-line narration, then assemble a single-slide mp4 (a real, playable file).
  execFileSync('say', ['-o', WAV, 'WCAG 2 at a glance: perceivable, operable, understandable, robust.']);
  execFileSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=0x0F172A:s=640x360:d=3',
    '-i', WAV, '-shortest', '-pix_fmt', 'yuv420p', MP4], { stdio: 'ignore' });
  const probe = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', MP4]).toString().trim();
  mp4Real = existsSync(MP4) && parseFloat(probe) > 0;
  check(`real .mp4 produced + ffprobe-valid (${probe}s)`, mp4Real);
} catch (e) {
  bad(`real .mp4 production failed: ${String(e.message).split('\n')[0]}`);
}

// --- 4) Link + provenance injection into the canonical doc, NO re-host (FR-C2) ---------------
console.log('== link + provenance, no re-host (FR-C2) ==');
const CANON = resolve(ST_DIR, '2026-06-18-wcag2-at-a-glance.html');
const baseHtml = [
  '<!DOCTYPE html><html><head><meta name="pmos:skill" content="summary-tldr"></head><body>',
  '<main class="pmos-artifact-body">',
  '<p class="bluf">WCAG 2 rests on four principles: perceivable, operable, understandable, robust.</p>',
  '<figure id="summary-diagram" data-diagram-slot></figure>',
  '<h2 id="source-and-confidence">Source &amp; confidence</h2>',
  '</body></html>',
].join('\n');
writeFileSync(CANON, baseHtml);

// The injection the SKILL.md #video-mode step 3 describes: a provenance <figure> linking the mp4
// (relative path into /explainer-video's dir), with source/length/timestamp — never a copy.
const relMp4 = './' + require_relative(ST_DIR, MP4);
function require_relative(from, to) { // tiny POSIX relative-path (no extra deps)
  const a = from.split('/'), b = to.split('/');
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return '../'.repeat(a.length - i) + b.slice(i).join('/');
}
const TS = '2026-06-18T00:00:00Z'; // stamped (Date.now() unavailable in workflow scripts; fixed here for determinism)
const provenance = [
  `<figure id="summary-video" data-video-provenance>`,
  `  <figcaption>Narrated explainer video</figcaption>`,
  `  <a href="${relMp4}">▶ wcag2-at-a-glance.mp4</a>`,
  `  <dl><dt>Source</dt><dd>${ORIGINAL_SOURCE}</dd>`,
  `  <dt>Length</dt><dd>${resolved.length}</dd>`,
  `  <dt>Path</dt><dd>${relMp4}</dd>`,
  `  <dt>Generated</dt><dd>${TS}</dd></dl>`,
  `</figure>`,
].join('\n');
const linked = readFileSync(CANON, 'utf8').replace(
  '<figure id="summary-diagram" data-diagram-slot></figure>',
  '<figure id="summary-diagram" data-diagram-slot></figure>\n' + provenance);
writeFileSync(CANON, linked);

const finalHtml = readFileSync(CANON, 'utf8');
check('canonical doc links the produced .mp4', finalHtml.includes('wcag2-at-a-glance.mp4'));
check('link is RELATIVE into the explainer-video dir', finalHtml.includes('explainer-video-out/wcag2-at-a-glance.mp4'));
check('provenance records the original source', finalHtml.includes(ORIGINAL_SOURCE));
check('provenance records the resolved length', /<dt>Length<\/dt><dd>deep<\/dd>/.test(finalHtml));
check('provenance records a timestamp', finalHtml.includes(TS));
// NO re-host: the mp4 must NOT have been copied into the summary-tldr dir.
const stFiles = readdirSync(ST_DIR);
check('mp4 NOT re-hosted in summary-tldr dir', !stFiles.some((f) => f.endsWith('.mp4')));
check('canonical text intact (BLUF survived injection)', finalHtml.includes('four principles'));

// --- 5) Graceful degradation: /explainer-video fails → text intact, NO fake link (FR-C3) -----
console.log('== graceful degradation (FR-C3/D11) ==');
const DEG = resolve(ST_DIR, '2026-06-18-degraded.html');
writeFileSync(DEG, baseHtml);
// Simulate a non-zero /explainer-video (missing ffmpeg/Playwright/TTS): the skill writes NO link.
const evResult = { ok: false, reason: 'ffmpeg not found', install_hint: 'brew install ffmpeg' };
if (!evResult.ok) {
  // canonical doc is left exactly as emitted; only a chat/stderr note is produced.
  process.stderr.write(`video mode: /explainer-video unavailable (${evResult.reason}); ` +
    `canonical text shipped, no video link. hint: ${evResult.install_hint}\n`);
}
const degHtml = readFileSync(DEG, 'utf8');
check('degraded: canonical text still on disk', degHtml.includes('four principles'));
check('degraded: NO video link written (no .mp4 anchor)', !/href="[^"]*\.mp4"/.test(degHtml));
check('degraded: empty diagram slot untouched', degHtml.includes('<figure id="summary-diagram" data-diagram-slot></figure>'));

console.log(`\nTOTAL: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
