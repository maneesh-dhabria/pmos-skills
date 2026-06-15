#!/usr/bin/env node
// Behavioral selftest for /tetris — extracts the engine <script> from game/tetris.html,
// runs it in a Node vm (Node stdlib only: fs, path, vm, url), and asserts the documented
// TetrisEngine contract (7-bag, collision, SRS rotation+kicks, ghost, line clears, T-spin,
// scoring, gravity curve, top-out, hold). Run: node tests/run.mjs --selftest
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(__dirname, '..', 'game', 'tetris.html');

const EXPECTED_CHECKS = 53;

function loadEngine() {
  const html = fs.readFileSync(HTML, 'utf8');
  const blocks = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const engineSrc = blocks.find((b) => b.indexOf('root.TetrisEngine') >= 0);
  if (!engineSrc) throw new Error('engine <script> (root.TetrisEngine) not found in game/tetris.html');
  const sandbox = { window: {}, globalThis: {}, Math, Array, console };
  vm.createContext(sandbox);
  new vm.Script(engineSrc).runInContext(sandbox);
  const E = sandbox.window.TetrisEngine;
  if (!E) throw new Error('TetrisEngine not exposed on window');
  return E;
}

let pass = 0, fail = 0;
const fails = [];
function ok(cond, label) {
  if (cond) { pass += 1; }
  else { fail += 1; fails.push(label); }
}

const E = loadEngine();
const W = E.WIDTH, H = E.HEIGHT;

// ---------- 7-bag: permutation, fairness, no droughts ----------
(function () {
  const rng = E.makeRng(12345);
  const counts = {};
  E.TYPES.forEach((t) => { counts[t] = 0; });
  let allBagsAreFullPermutations = true;
  const BAGS = 70;
  for (let b = 0; b < BAGS; b++) {
    const bag = E.nextBag(rng);
    const set = new Set(bag);
    if (bag.length !== 7 || set.size !== 7) allBagsAreFullPermutations = false;
    bag.forEach((t) => { counts[t] += 1; });
  }
  ok(allBagsAreFullPermutations, '7-bag: every bag is a length-7 permutation of all 7 types (no droughts)');
  const equal = E.TYPES.every((t) => counts[t] === BAGS);
  ok(equal, '7-bag fairness: each type appears exactly once per bag -> equal totals');

  // determinism: same seed -> identical first bag
  const a = E.nextBag(E.makeRng(7)).join('');
  const a2 = E.nextBag(E.makeRng(7)).join('');
  ok(a === a2, '7-bag deterministic for a fixed seed');
})();

// ---------- collision primitive ----------
(function () {
  const f = E.emptyField();
  const p = E.spawn('T');
  ok(E.collides(f, p, p.x, p.y, p.rot) === false, 'spawn T does not collide on an empty field');
  ok(E.collides(f, p, -3, p.y, p.rot) === true, 'collision off the left wall');
  ok(E.collides(f, p, W, p.y, p.rot) === true, 'collision off the right wall');
  ok(E.collides(f, p, p.x, H, p.rot) === true, 'collision through the floor');
  // a filled cell under the piece
  const f2 = E.emptyField();
  f2[2][4] = 'I';
  // T spawn cells at rot0: (1,0),(0,1),(1,1),(2,1) -> at x=3,y=1 -> includes (4,2)
  ok(E.collides(f2, p, 3, 1, 0) === true, 'collision against a filled cell');
  ok(E.collides(f2, p, 0, 0, 0) === false, 'no collision in open space away from the filled cell');
})();

// ---------- SRS rotation + wall kicks ----------
(function () {
  const f = E.emptyField();
  // basic rotation in open space (kickIndex 0)
  const t = { type: 'T', x: 3, y: 3, rot: 0 };
  const r = E.tryRotate(f, t, 1);
  ok(r && r.piece.rot === 1 && r.kickIndex === 0, 'basic CW rotation in open space (kickIndex 0)');
  const r2 = E.tryRotate(f, t, -1);
  ok(r2 && r2.piece.rot === 3, 'basic CCW rotation wraps 0 -> 3');

  // O does not rotate (cells identical before/after)
  const o = { type: 'O', x: 4, y: 4, rot: 0 };
  const ro = E.tryRotate(f, o, 1);
  const oBefore = JSON.stringify(E.shapeCells('O', o.rot));
  const oAfter = JSON.stringify(E.shapeCells('O', ro.piece.rot));
  ok(ro && oBefore === oAfter, 'O piece does not move on rotate');

  // I-piece wall kick off the left wall: vertical I flush left, rotate to horizontal needs kick
  // vertical I (rot1) cells are column 2 of the box; place box so the column sits at x=0.
  const iv = { type: 'I', x: -2, y: 5, rot: 1 };
  ok(E.collides(f, iv, iv.x, iv.y, iv.rot) === false, 'vertical I sits flush against the left wall');
  const ri = E.tryRotate(f, iv, 1); // 1 -> 2 (horizontal)
  ok(ri && ri.piece.rot === 2 && ri.kickIndex > 0, 'I-piece wall kick off the left wall used a non-trivial kick');
  ok(ri && E.collides(f, ri.piece, ri.piece.x, ri.piece.y, ri.piece.rot) === false, 'kicked I-piece rests in a legal position');

  // a JLSTZ wall kick: J vertical flush against left wall rotating into the wall forces a kick
  const jv = { type: 'J', x: -1, y: 5, rot: 0 };
  const rj = E.tryRotate(f, jv, -1); // 0 -> 3
  ok(rj && E.collides(f, rj.piece, rj.piece.x, rj.piece.y, rj.piece.rot) === false, 'kicked J-piece rests in a legal position');
})();

// ---------- ghost / hard-drop landing ----------
(function () {
  const f = E.emptyField();
  const p = { type: 'O', x: 4, y: 0, rot: 0 };
  const gy = E.ghostY(f, p);
  ok(E.collides(f, p, p.x, gy, p.rot) === false, 'ghost row is legal');
  ok(E.collides(f, p, p.x, gy + 1, p.rot) === true, 'one row below the ghost collides (rests on the floor)');
  // bumpy surface: a tall stack under part of the piece stops the ghost higher
  const f2 = E.emptyField();
  for (let y = 5; y < H; y++) f2[y][4] = 'I'; // tall column at x=4
  const p2 = { type: 'O', x: 4, y: 0, rot: 0 }; // O occupies cols 5,6 -> not over col4... use cols incl 4
  const p3 = { type: 'O', x: 3, y: 0, rot: 0 }; // O cells cols 4,5
  const gy3 = E.ghostY(f2, p3);
  ok(gy3 < E.ghostY(E.emptyField(), p3), 'ghost stops higher over a bumpy/tall surface');
})();

// ---------- line clears 1/2/3/4 + partial intact ----------
(function () {
  function fullRow() { return new Array(W).fill('I'); }
  function rowWithGap() { const r = new Array(W).fill('I'); r[0] = 0; return r; }

  let f = E.emptyField();
  f[H - 1] = fullRow();
  let res = E.clearLines(f);
  ok(res.cleared === 1 && res.field.length === H, 'clearLines removes 1 full row');
  ok(res.field[0].every((c) => !c), 'after a clear an empty row is added at the top');

  f = E.emptyField(); f[H - 1] = fullRow(); f[H - 2] = fullRow();
  ok(E.clearLines(f).cleared === 2, 'clearLines removes 2 full rows (double)');

  f = E.emptyField(); f[H - 1] = fullRow(); f[H - 2] = fullRow(); f[H - 3] = fullRow();
  ok(E.clearLines(f).cleared === 3, 'clearLines removes 3 full rows (triple)');

  f = E.emptyField();
  for (let i = 1; i <= 4; i++) f[H - i] = fullRow();
  ok(E.clearLines(f).cleared === 4, 'clearLines removes 4 full rows (Tetris)');

  // partial row stays
  f = E.emptyField(); f[H - 1] = rowWithGap();
  res = E.clearLines(f);
  ok(res.cleared === 0, 'a row with a gap is not cleared');
  ok(res.field[H - 1].filter((c) => c).length === W - 1, 'the partial row is left intact');

  // a clear shifts the rows above down (a marker above the cleared row survives, lower)
  f = E.emptyField(); f[H - 2][3] = 'T'; f[H - 1] = fullRow();
  res = E.clearLines(f);
  const markers = [];
  for (let y = 0; y < H; y++) if (res.field[y][3] === 'T') markers.push(y);
  ok(markers.length === 1 && markers[0] === H - 1, 'rows above a cleared line shift down by one');
})();

// ---------- T-spin (3-corner rule) ----------
(function () {
  // build a field with 3 of the T's box corners filled
  const f = E.emptyField();
  const t = { type: 'T', x: 3, y: 16, rot: 2 };
  // corners relative to box: (0,0),(2,0),(0,2),(2,2) -> world (3,16),(5,16),(3,18),(5,18)
  f[16][3] = 'I'; f[16][5] = 'I'; f[18][3] = 'I'; // 3 corners filled, (5,18) empty
  ok(E.isTSpin(f, t, true) === true, 'T-spin: T + last action rotation + 3 corners -> true');
  ok(E.isTSpin(f, t, false) === false, 'no T-spin when the last action was not a rotation');

  const f2 = E.emptyField();
  f2[16][3] = 'I'; f2[16][5] = 'I'; // only 2 corners
  ok(E.isTSpin(f2, t, true) === false, 'no T-spin with fewer than 3 corners');

  // a non-T piece is never a T-spin
  const j = { type: 'J', x: 3, y: 16, rot: 2 };
  ok(E.isTSpin(f, j, true) === false, 'a non-T piece is never a T-spin');

  // corners count out-of-bounds as filled (T against the floor)
  const f3 = E.emptyField();
  const tf = { type: 'T', x: 3, y: H - 1, rot: 0 }; // box bottom row is below the floor
  f3[H - 1][3] = 'I'; // one in-bounds corner
  ok(E.isTSpin(f3, tf, true) === true, 'out-of-bounds corners count as filled (T-spin against the floor)');
})();

// ---------- guideline scoring ----------
(function () {
  const single = E.score(1, 1, {});
  const dbl = E.score(2, 1, {});
  const triple = E.score(3, 1, {});
  const tetris = E.score(4, 1, {});
  ok(single < dbl && dbl < triple && triple < tetris, 'line-clear scores scale single < double < triple < Tetris');
  ok(E.score(1, 2, {}) > E.score(1, 1, {}), 'a higher level scores more for the same clear');
  ok(E.score(4, 1, { b2b: true }) > tetris, 'a back-to-back Tetris scores more than a plain Tetris');
  ok(E.score(2, 1, { tSpin: true }) > dbl, 'a T-spin double scores more than a plain double');
  ok(E.score(2, 1, { tSpin: true, b2b: true }) > E.score(2, 1, { tSpin: true }), 'back-to-back lifts a T-spin score');
  ok(E.score(1, 1, { combo: 2 }) > E.score(1, 1, { combo: 0 }), 'a combo adds to the score');
  ok(E.score(0, 5, {}) === 0, 'no lines cleared -> zero line-clear points');
})();

// ---------- gravity curve ----------
(function () {
  let monotonic = true;
  for (let l = 0; l < 25; l++) {
    if (E.dropInterval(l) < E.dropInterval(l + 1)) { monotonic = false; break; }
  }
  ok(monotonic, 'dropInterval is monotonically non-increasing in level');
  ok(E.dropInterval(0) > E.dropInterval(15), 'gravity is faster (smaller interval) at higher levels');
  ok(E.dropInterval(99) === E.dropInterval(50), 'dropInterval clamps at the top level');
  ok(E.dropInterval(0) > 0, 'dropInterval is a positive duration');
})();

// ---------- top-out ----------
(function () {
  const f = E.emptyField();
  const p = E.spawn('T');
  ok(E.isTopOut(f, p) === false, 'no top-out on an empty field');
  // fill the spawn region
  const f2 = E.emptyField();
  for (let y = 0; y < 3; y++) for (let x = 0; x < W; x++) f2[y][x] = 'I';
  ok(E.isTopOut(f2, p) === true, 'top-out when a freshly spawned piece already collides');
})();

// ---------- game-state layer: hold, lock, scoring integration ----------
(function () {
  const g = E.createGame({ startLevel: 0, seed: 99 });
  ok(g.active && g.queue.length >= 3 && g.score === 0, 'createGame seats an active piece + a filled queue');
  ok(g.field.length === H && g.field[0].length === W, 'createGame builds a 10x20 field');

  // hold swaps and locks until the next piece
  const firstType = g.active.type;
  const held = E.holdActive(g);
  ok(held === true && g.hold === firstType, 'hold stashes the active piece');
  ok(E.holdActive(g) === false, 'hold is locked until the next piece spawns (one hold per drop)');

  // a hard drop locks, advances, and (here) scores the drop distance
  const g2 = E.createGame({ startLevel: 0, seed: 5 });
  const before = g2.active.type;
  const sc0 = g2.score;
  E.hardDrop(g2);
  ok(g2.score >= sc0 && g2.active && g2.active.type !== undefined, 'hard drop locks the piece and spawns the next');

  // a Tetris through the real lock path scores and clears 4 lines
  const g3 = E.createGame({ startLevel: 1, seed: 1 });
  // rig: fill the bottom 4 rows except column 0, then drop a vertical I into column 0
  for (let y = H - 4; y < H; y++) for (let x = 1; x < W; x++) g3.field[y][x] = 'L';
  g3.active = { type: 'I', x: -2, y: H - 4, rot: 1 }; // vertical I, its column at x=0
  ok(E.collides(g3.field, g3.active, g3.active.x, g3.active.y, g3.active.rot) === false, 'rigged vertical I fits in the empty column');
  const lines0 = g3.lines, score0 = g3.score;
  E.hardDrop(g3);
  ok(g3.lines === lines0 + 4, 'dropping the I to complete 4 rows clears a Tetris');
  ok(g3.score > score0, 'the Tetris adds to the score');
})();

// ---------- report ----------
if (fail > 0) {
  console.error('FAIL (' + fail + '):');
  fails.forEach((f) => console.error('  - ' + f));
}
const total = pass + fail;
console.log((fail === 0 ? 'PASS' : 'FAILED') + ' ' + pass + '/' + total + ' checks');

if (process.argv.includes('--selftest')) {
  if (total !== EXPECTED_CHECKS) {
    console.error('CHECK COUNT MISMATCH: expected ' + EXPECTED_CHECKS + ', ran ' + total);
    process.exit(1);
  }
}
process.exit(fail === 0 ? 0 : 1);
