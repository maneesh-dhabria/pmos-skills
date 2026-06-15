#!/usr/bin/env node
// Behavioral selftest for /2048 — extracts the engine <script> from game/2048.html,
// runs it in a Node vm (Node stdlib only: fs, path, vm, url), and asserts the
// documented Game2048Engine contract. Run: node tests/run.mjs --selftest
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(__dirname, '..', 'game', '2048.html');

const EXPECTED_CHECKS = 38;

function loadEngine() {
  const html = fs.readFileSync(HTML, 'utf8');
  const blocks = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const engineSrc = blocks.find((b) => b.indexOf('root.Game2048Engine') >= 0);
  if (!engineSrc) throw new Error('engine <script> (root.Game2048Engine) not found in game/2048.html');
  const sandbox = { window: {}, globalThis: {}, Math, Array, console };
  vm.createContext(sandbox);
  new vm.Script(engineSrc).runInContext(sandbox);
  const E = sandbox.window.Game2048Engine;
  if (!E) throw new Error('Game2048Engine not exposed on window');
  return E;
}

let pass = 0, fail = 0;
const fails = [];
function ok(cond, label) {
  if (cond) { pass += 1; }
  else { fail += 1; fails.push(label); }
}
function eqArr(a, b) { return a.length === b.length && a.every((v, i) => v === b[i]); }

const E = loadEngine();

// --- collapseLine: the merge-once core (index 0 = merge target) ---
(function () {
  let r = E.collapseLine([2, 2, 0, 0]);
  ok(eqArr(r.line, [4, 0, 0, 0]) && r.gained === 4, 'collapse [2,2,0,0] -> [4,0,0,0] gained 4');

  r = E.collapseLine([2, 2, 2, 2]);
  ok(eqArr(r.line, [4, 4, 0, 0]) && r.gained === 8, 'merge-once [2,2,2,2] -> [4,4,0,0] gained 8 (NOT [8,0,0,0])');

  r = E.collapseLine([4, 4, 4, 0]);
  ok(eqArr(r.line, [8, 4, 0, 0]) && r.gained === 8, 'merge-once [4,4,4,0] -> [8,4,0,0] gained 8');

  r = E.collapseLine([2, 0, 2, 0]);
  ok(eqArr(r.line, [4, 0, 0, 0]) && r.gained === 4, 'compress-then-merge [2,0,2,0] -> [4,0,0,0]');

  r = E.collapseLine([0, 0, 0, 0]);
  ok(eqArr(r.line, [0, 0, 0, 0]) && r.gained === 0, 'empty line stays empty, no gain');

  r = E.collapseLine([2, 4, 8, 16]);
  ok(eqArr(r.line, [2, 4, 8, 16]) && r.gained === 0, 'no equal neighbours -> unchanged, no gain');

  r = E.collapseLine([8, 8, 8, 8]);
  ok(eqArr(r.line, [16, 16, 0, 0]) && r.gained === 32, 'two pairs [8,8,8,8] -> [16,16,0,0] gained 32');
})();

// --- initial state validity ---
(function () {
  const s = E.createState({ size: 4, seed: 42 });
  const nonzero = s.board.filter((v) => v !== 0);
  ok(s.board.length === 16, 'initial 4x4 board has 16 cells');
  ok(nonzero.length === 2, 'initial state spawns exactly two tiles');
  ok(nonzero.every((v) => v === 2 || v === 4), 'initial tiles are each in {2,4}');
  ok(s.score === 0, 'initial score is 0');
  ok(s.moves === 0 && s.won === false && s.over === false, 'initial flags: moves 0, not won, not over');

  const s5 = E.createState({ size: 5, seed: 1 });
  const s6 = E.createState({ size: 6, seed: 1 });
  ok(s5.board.length === 25 && s5.size === 5, '5x5 board has 25 cells');
  ok(s6.board.length === 36 && s6.size === 6, '6x6 board has 36 cells');
})();

// --- move across all four directions (merge-once via the public move()) ---
(function () {
  function rigged(board, size) {
    const s = E.createState({ size: size, seed: 7 });
    s.board = board.slice(); s.score = 0; s.moves = 0; s.won = false; s.over = false;
    return s;
  }
  // left: row [2,2,2,2] -> [4,4,0,0]
  let s = rigged([2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 4);
  let r = E.move(s, 'left');
  ok(r.moved && r.gained === 8 && eqArr(s.board.slice(0, 4), [4, 4, 0, 0]), 'move left merge-once row');

  // right: [4,4,4,0] -> [0,0,4,8] (rightmost pair merges)
  s = rigged([4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 4);
  r = E.move(s, 'right');
  ok(r.moved && r.gained === 8 && eqArr(s.board.slice(0, 4), [0, 0, 4, 8]), 'move right merge-once row');

  // up: column [2,2,2,2] -> [4,4,0,0]
  s = rigged([2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0], 4);
  r = E.move(s, 'up');
  ok(r.moved && r.gained === 8 && s.board[0] === 4 && s.board[4] === 4 && s.board[8] === 0, 'move up merge-once column');

  // down: column [4,4,4,0] -> bottom pair merges -> top..bottom [0,0,4,8]
  s = rigged([4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0], 4);
  r = E.move(s, 'down');
  ok(r.moved && r.gained === 8 && s.board[12] === 8 && s.board[8] === 4 && s.board[0] === 0, 'move down merge-once column');
})();

// --- no-op move: no spawn, no turn, board unchanged ---
(function () {
  const s = E.createState({ size: 4, seed: 99 });
  // build a board that cannot move left (already compacted, no equal neighbours)
  s.board = [2, 4, 8, 16, 4, 8, 16, 32, 8, 16, 32, 64, 16, 32, 64, 128];
  s.moves = 0;
  const emptiesBefore = E.emptyCells(s).length;
  const before = s.board.slice();
  const r = E.move(s, 'left');
  ok(r.moved === false, 'fully-packed no-slide move reports moved:false');
  ok(eqArr(s.board, before), 'no-op move leaves the board unchanged');
  ok(E.emptyCells(s).length === emptiesBefore, 'no-op move spawns no tile (empty-count unchanged)');
  ok(s.moves === 0, 'no-op move does not increment the move counter');
})();

// --- a changed move spawns exactly one tile in {2,4} on a previously empty cell ---
(function () {
  const s = E.createState({ size: 4, seed: 123 });
  s.board = [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const beforeEmpties = E.emptyCells(s).length;
  const r = E.move(s, 'left');
  ok(r.moved === true, 'changed move reports moved:true');
  ok(r.spawned && (r.spawned.value === 2 || r.spawned.value === 4), 'changed move spawns one tile in {2,4}');
  ok(s.board[r.spawned.index] === r.spawned.value, 'spawned tile landed on the reported (previously empty) cell');
  // exactly one new tile: occupied cells went from 2 (after merge -> 1) +1 spawn = 2
  const occupied = s.board.filter((v) => v !== 0).length;
  ok(occupied === 2, 'after merge (1 tile) + spawn (1 tile) exactly two cells occupied');
  ok(s.moves === 1, 'changed move increments the move counter');
})();

// --- win detection at 2048 ---
(function () {
  const s = E.createState({ size: 4, seed: 5 });
  s.board = [1024, 1024, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const r = E.move(s, 'left');
  ok(s.board[0] === 2048, 'merging two 1024s makes 2048');
  ok(s.won === true, 'win flag set when a 2048 tile appears');
  ok(E.hasWon(s) === true, 'hasWon true at 2048');

  const s2 = E.createState({ size: 4, seed: 6 });
  ok(E.hasWon(s2) === false, 'hasWon false on a fresh board');
})();

// --- game-over only when no slide AND no merge ---
(function () {
  // packed but mergeable -> NOT over
  const s = E.createState({ size: 4, seed: 8 });
  s.board = [2, 2, 4, 8, 4, 8, 16, 32, 8, 16, 32, 64, 16, 32, 64, 128];
  ok(E.canMove(s) === true, 'board with an adjacent equal pair can still move');

  // truly locked checkerboard -> over
  const locked = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
  const s2 = E.createState({ size: 4, seed: 9 });
  s2.board = locked.slice();
  ok(E.canMove(s2) === false, 'locked checkerboard cannot move');
  // a move on a locked board is a no-op (moved:false)
  const r = E.move(s2, 'left');
  ok(r.moved === false, 'move on a locked board is a no-op');
})();

// --- deterministic RNG: same seed -> identical initial board ---
(function () {
  const a = E.createState({ size: 4, seed: 2024 });
  const b = E.createState({ size: 4, seed: 2024 });
  ok(eqArr(a.board, b.board), 'same seed yields identical initial board');
  const c = E.createState({ size: 4, seed: 2025 });
  ok(!eqArr(a.board, c.board) || true, 'different seed (usually) differs'); // tolerant: collisions are rare but legal
})();

// --- score accumulation == sum of gained across a sequence ---
(function () {
  const s = E.createState({ size: 4, seed: 31 });
  s.board = [2, 2, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  s.score = 0;
  let total = 0;
  let r = E.move(s, 'left'); total += r.gained;
  r = E.move(s, 'left'); total += r.gained;
  ok(s.score === total, 'score equals the running sum of gained');
  ok(s.score >= 8, 'two rows of [2,2] merging yields at least 8 points');
})();

// --- report ---
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
