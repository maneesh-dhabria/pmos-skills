#!/usr/bin/env node
// Behavioral selftest for /flappy-bird's engine.
// Reads game/flappy-bird.html, extracts the engine <script> (the one defining
// root.FlappyEngine), evaluates it in a bare Node vm with NO DOM, and asserts the
// objective physics/lifecycle gates. Node stdlib only (fs, path, vm, url) — no npm.
//
//   node tests/run.mjs            # run the gates, exit 0 (all pass) / 1 (any fail)
//   node tests/run.mjs --selftest # also assert the check COUNT == EXPECTED_CHECKS
//
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const EXPECTED_CHECKS = 47;

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, '..', 'game', 'flappy-bird.html');
const html = readFileSync(htmlPath, 'utf8');

// --- extract the engine <script> (the block that defines root.FlappyEngine) ---
const blocks = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const engineSrc = blocks.find(b => /root\.FlappyEngine\s*=/.test(b));
if (!engineSrc) {
  console.error('FAIL: could not find the FlappyEngine <script> block in flappy-bird.html');
  process.exit(1);
}

// evaluate in a DOM-free sandbox; `window`/`globalThis` are bare objects
const sandbox = { window: {}, globalThis: {}, Math, Array, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
new vm.Script(engineSrc).runInContext(sandbox);
const E = sandbox.window.FlappyEngine;
if (!E) {
  console.error('FAIL: FlappyEngine was not exposed on window');
  process.exit(1);
}

// --- tiny assertion harness -------------------------------------------------
let count = 0, failed = 0;
function check(name, cond) {
  count++;
  if (cond) { console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}`); }
}
const approx = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// helpers
function freshPlaying(opts) {
  const s = E.createState(Object.assign({ width: 360, height: 640, difficulty: 'normal', seed: 1 }, opts || {}));
  E.flap(s);            // ready -> playing
  s.bird.vy = 0;        // neutralize the flap impulse for predictable physics
  return s;
}

// === initial state =========================================================
{
  const s = E.createState({ width: 360, height: 640, difficulty: 'normal', seed: 5 });
  check('createState: status starts "ready"', s.status === 'ready');
  check('createState: bird horizontally ~1/3 across', s.bird.x === 120);
  check('createState: bird vertically centered', s.bird.y === 320);
  check('createState: bird starts with zero velocity', s.bird.vy === 0);
  check('createState: params resolved from difficulty', s.params && s.params.pipeGap === E.difficultyParams('normal').pipeGap);
  check('createState: groundY = height - GROUND_H', s.groundY === 640 - E.constants.GROUND_H);
  check('createState: first pipe queued off the right edge', s.pipes.length === 1 && s.pipes[0].x === s.width);
  check('createState: score and best start at 0', s.score === 0 && s.best === 0);
  check('createState: bird radius set', s.bird.r === E.constants.BIRD_R);
}

// === difficulty bands ======================================================
{
  const e = E.difficultyParams('easy'), n = E.difficultyParams('normal'), h = E.difficultyParams('hard');
  check('difficultyParams: all 5 keys present', ['pipeGap','pipeSpeed','pipeSpacing','gravity','flapV'].every(k => k in n));
  check('difficulty bands: gap decreases easy>normal>hard', e.pipeGap > n.pipeGap && n.pipeGap > h.pipeGap);
  check('difficulty bands: speed increases easy<normal<hard', e.pipeSpeed < n.pipeSpeed && n.pipeSpeed < h.pipeSpeed);
  check('difficultyParams: returns a copy (mutation-safe)', (() => { const a = E.difficultyParams('easy'); a.pipeGap = -1; return E.difficultyParams('easy').pipeGap !== -1; })());
  check('difficultyParams: unknown level falls back to normal', E.difficultyParams('zzz').pipeGap === n.pipeGap);
}

// === flap ==================================================================
{
  const s = E.createState({ seed: 1 });
  const before = s.bird.vy;
  E.flap(s);
  check('flap: sets an upward (negative) velocity', s.bird.vy < 0 && s.bird.vy === s.params.flapV);
  check('flap: velocity actually changed', s.bird.vy !== before);
  check('flap: transitions ready -> playing', s.status === 'playing');

  const o = E.createState({ seed: 1 }); o.status = 'over'; o.bird.vy = 5;
  E.flap(o);
  check('flap: no-op when status is "over"', o.status === 'over' && o.bird.vy === 5);
}

// === ready is static =======================================================
{
  const s = E.createState({ seed: 1 });
  const y0 = s.bird.y, x0 = s.pipes[0].x;
  E.step(s, 1 / 60); E.step(s, 1 / 60);
  check('step: world is static while "ready" (bird does not move)', s.bird.y === y0);
  check('step: pipes do not scroll while "ready"', s.pipes[0].x === x0);
}

// === gravity & arc =========================================================
{
  const s = freshPlaying({ seed: 1 });
  const y0 = s.bird.y, vy0 = s.bird.vy;
  for (let i = 0; i < 10; i++) E.step(s, 1 / 120);
  check('gravity: vy grows downward over steps (no flap)', s.bird.vy > vy0);
  check('gravity: bird falls (y increases) over steps', s.bird.y > y0);

  // rise-then-fall arc after a flap
  const a = E.createState({ seed: 1 }); E.flap(a);
  const startY = a.bird.y; let minY = startY;
  for (let i = 0; i < 80; i++) { E.step(a, 1 / 120); if (a.bird.y < minY) minY = a.bird.y; }
  check('arc: a flap makes the bird rise above its start', minY < startY);
  check('arc: then gravity pulls it back below the peak', a.bird.y > minY);
}

// === ceiling clamp (no top death) ==========================================
{
  const s = E.createState({ seed: 1 }); E.flap(s);
  let everAboveR = false, everOver = false;
  for (let i = 0; i < 200; i++) {
    s.pipes = [];              // isolate the ceiling: keep pipes out of the way
    E.flap(s);                 // hammer flap to drive the bird up
    E.step(s, 1 / 120);
    if (s.bird.y < s.bird.r) everAboveR = true;
    if (s.status === 'over') everOver = true;
  }
  check('ceiling: y is clamped, never above the bird radius', !everAboveR && s.bird.y >= s.bird.r);
  check('ceiling: touching the ceiling is never lethal', !everOver);
}

// === ground death ==========================================================
{
  const s = E.createState({ seed: 1 }); E.flap(s);
  s.bird.y = s.groundY - s.bird.r - 2; s.bird.vy = 300;
  E.step(s, 1 / 60);
  check('ground: falling onto groundY ends the run', s.status === 'over');
  check('ground: over because bird reached the ground', s.bird.y + s.bird.r >= s.groundY);
}

// === collision detection ===================================================
{
  const s = freshPlaying({ seed: 1 });
  s.pipes = [{ x: s.bird.x - 10, gapY: 0, gapH: 1, scored: false }]; // gap of 1px, bird inside the lower rect
  check('collides: true when the bird overlaps a pipe rect', E.collides(s) === true);
  E.step(s, 1 / 120);
  check('step: a pipe overlap sets status "over"', s.status === 'over');

  const clear = freshPlaying({ seed: 1 });
  clear.pipes = [{ x: clear.bird.x - 6, gapY: 120, gapH: 360, scored: true }]; // wide gap around the bird
  check('collides: false when the bird is inside the gap', E.collides(clear) === false);
}

// === scoring exactly once ==================================================
{
  const s = freshPlaying({ seed: 1 });
  s.pipes = [{ x: s.bird.x - E.constants.PIPE_W - 5, gapY: 100, gapH: 380, scored: false }]; // far edge already past bird.x
  E.step(s, 1 / 120);
  check('scoring: +1 when a pipe pair is cleared', s.score === 1);
  check('scoring: the cleared pipe is marked scored', s.pipes.some(p => p.scored));
  check('scoring: best updates with the score', s.best >= 1);
  const after = s.score;
  E.step(s, 1 / 120); E.step(s, 1 / 120);
  check('scoring: a cleared pipe never double-counts', s.score === after);
}

// === pipe lifecycle ========================================================
{
  const s = freshPlaying({ seed: 1 });
  const x0 = s.pipes[0].x;
  E.step(s, 1 / 60);
  check('pipes: scroll left over time', s.pipes[0].x < x0);

  const cull = freshPlaying({ seed: 1 });
  cull.pipes = [{ x: -E.constants.PIPE_W - 2, gapY: 200, gapH: 300, scored: true }];
  E.step(cull, 1 / 120);
  check('pipes: fully off-screen pipes are culled', cull.pipes.every(p => p.x + E.constants.PIPE_W >= 0));

  const spawn = freshPlaying({ seed: 1 });
  spawn.pipes = [{ x: spawn.width - spawn.params.pipeSpacing - 1, gapY: 120, gapH: 380, scored: true }];
  const n0 = spawn.pipes.length;
  E.step(spawn, 1 / 120);
  check('pipes: a new pipe spawns once the last crosses the spacing threshold', spawn.pipes.length === n0 + 1);
}

// === frozen when over ======================================================
{
  const s = freshPlaying({ seed: 1 });
  s.status = 'over';
  const y0 = s.bird.y, n0 = s.pipes.length;
  E.step(s, 1 / 60);
  check('step: frozen when "over" (no movement or spawns)', s.bird.y === y0 && s.pipes.length === n0);
}

// === bird stays on a fixed x ===============================================
{
  const s = freshPlaying({ seed: 1 });
  const x0 = s.bird.x;
  for (let i = 0; i < 30; i++) { E.flap(s); E.step(s, 1 / 120); }
  check('bird: x is fixed (no horizontal drift)', s.bird.x === x0);
}

// === spawnPipe gap stays within safe bounds ================================
{
  const s = E.createState({ seed: 1 });
  s.pipes = [];
  E.spawnPipe(s, () => 0);
  const lo = 56; // TOP_MARGIN
  const p0 = s.pipes[0];
  check('spawnPipe: gapY clamps to the top margin at rng=0', approx(p0.gapY, lo, 0.001));
  s.pipes = [];
  E.spawnPipe(s, () => 0.999999);
  const hi = s.groundY - 24 - s.params.pipeGap; // groundY - BOT_MARGIN - pipeGap
  check('spawnPipe: gapY never pushes the gap into the ground', s.pipes[0].gapY <= hi + 0.01 && s.pipes[0].gapY >= lo);
  check('spawnPipe: gap height equals the difficulty pipeGap', s.pipes[0].gapH === s.params.pipeGap);
}

// === deterministic RNG =====================================================
{
  const a = E.makeRng(123), b = E.makeRng(123);
  const seqA = [a(), a(), a(), a(), a()], seqB = [b(), b(), b(), b(), b()];
  check('rng: same seed yields the same sequence', seqA.every((v, i) => v === seqB[i]));
  check('rng: values are in [0, 1)', seqA.every(v => v >= 0 && v < 1));
  const s1 = E.createState({ seed: 42 }), s2 = E.createState({ seed: 42 });
  check('rng: same seed yields the same first gapY', s1.pipes[0].gapY === s2.pipes[0].gapY);
  const r = E.makeRng();  // no seed -> still in range
  check('rng: an unseeded generator still returns [0, 1)', (() => { for (let i = 0; i < 20; i++) { const v = r(); if (!(v >= 0 && v < 1)) return false; } return true; })());
}

// --- report ----------------------------------------------------------------
console.log(`\n${count - failed}/${count} checks passed`);
const selftest = process.argv.includes('--selftest');
if (selftest && count !== EXPECTED_CHECKS) {
  console.error(`SELFTEST FAIL: expected ${EXPECTED_CHECKS} checks, ran ${count} (update EXPECTED_CHECKS if you added/removed gates)`);
  process.exit(1);
}
process.exit(failed === 0 ? 0 : 1);
