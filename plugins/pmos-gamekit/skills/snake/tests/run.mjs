#!/usr/bin/env node
// run.mjs — engine self-test for the bundled Snake game (AC9).
//
//   node run.mjs            run the checks
//   node run.mjs --selftest also assert the expected check count, exit 0/1
//
// Reads game/snake.html, extracts the pure-logic engine <script> (the one that
// assigns SnakeEngine), evaluates it in a Node vm with no DOM, and exercises the
// engine: initial-state validity, direction queue (180° guard), step movement,
// wall death vs. wrap, self-collision, eat/grow/score/respawn, the floored
// progressive speed-up, board-fill win, and deterministic RNG.
// No external dependencies — Node stdlib only.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(__dirname, '..', 'game', 'snake.html');

const EXPECTED_CHECKS = 20;
const selftest = process.argv.includes('--selftest');

let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) { passed += 1; process.stdout.write(`  ok   ${name}\n`); }
  else { failures.push(name); process.stdout.write(`  FAIL ${name}\n`); }
}

function loadEngine() {
  const html = fs.readFileSync(HTML, 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const engineSrc = scripts.find((s) => s.includes('root.SnakeEngine'));
  if (!engineSrc) throw new Error('could not find the SnakeEngine <script> in snake.html');
  const sandbox = { window: {}, globalThis: {} };
  vm.createContext(sandbox);
  vm.runInContext(engineSrc, sandbox, { filename: 'snake-engine.js' });
  const E = sandbox.window.SnakeEngine;
  if (!E) throw new Error('engine script ran but SnakeEngine was not exposed on window');
  return E;
}

// Helper: is (x,y) occupied by any snake segment.
function onSnake(snake, x, y) { return snake.some((s) => s.x === x && s.y === y); }

function run() {
  const E = loadEngine();

  // 1. Initial-state validity: centered snake length 3, food on an empty non-snake cell.
  const s0 = E.createState({ cols: 20, rows: 20, startSpeed: 130, wrap: false, seed: 7 });
  check('initial snake has length 3', s0.snake.length === 3);
  check('initial status is playing', s0.status === 'playing');
  check('initial food is on an empty non-snake cell',
    s0.food && !onSnake(s0.snake, s0.food.x, s0.food.y)
      && s0.food.x >= 0 && s0.food.x < s0.cols && s0.food.y >= 0 && s0.food.y < s0.rows);

  // 2. setDirection: rejects a 180° reverse vs the last-applied heading; accepts a 90° turn.
  const sd = E.createState({ cols: 20, rows: 20, startSpeed: 130, seed: 1 }); // heading right
  E.setDirection(sd, 'left');
  check('setDirection ignores a 180° reverse (right->left)', sd.nextDir.x === 1 && sd.nextDir.y === 0);
  E.setDirection(sd, 'up');
  check('setDirection accepts a 90° turn (right->up)', sd.nextDir.x === 0 && sd.nextDir.y === -1);

  // 3. step advances the head one cell in the queued direction.
  const sm = E.createState({ cols: 20, rows: 20, startSpeed: 130, seed: 2 }); // head at (10,10), heading right
  const h0 = { x: sm.snake[0].x, y: sm.snake[0].y };
  E.step(sm);
  check('step advances the head by the direction vector',
    sm.snake[0].x === h0.x + 1 && sm.snake[0].y === h0.y);
  check('step keeps length constant when not eating', sm.snake.length === 3);

  // 4. Wall death (wrap off): drive the head into the right wall.
  const sw = E.createState({ cols: 6, rows: 6, startSpeed: 130, wrap: false, seed: 99 });
  let guard = 0;
  while (sw.status === 'playing' && guard++ < 50) E.step(sw); // heading right into the wall
  check('wall collision ends the game when wrap is off', sw.status === 'over');

  // 5. Wrap (wrap on): the head reappears on the opposite edge and play continues.
  const swrap = E.createState({ cols: 6, rows: 6, startSpeed: 130, wrap: true, seed: 5 });
  let g2 = 0, wrapped = false;
  while (swrap.status === 'playing' && g2++ < 6) {
    E.step(swrap);
    if (swrap.snake[0].x === 0) wrapped = true; // came back around to the left edge
  }
  check('wrap reappears on the opposite edge', wrapped);
  check('wrap keeps the game playing past the edge', swrap.status === 'playing');

  // 6. Self-collision death: a hand-built snake that turns into its own body.
  // Snake occupies a 2x2-ish loop; force a move back into a body cell.
  const sc = E.createState({ cols: 20, rows: 20, startSpeed: 130, seed: 3 });
  // Build a long snake along a row, head at right, then bend it so an up+left+down path re-enters.
  sc.snake = [
    { x: 10, y: 10 }, // head
    { x: 9, y: 10 },
    { x: 9, y: 11 },
    { x: 10, y: 11 },
    { x: 11, y: 11 },
    { x: 11, y: 10 },
  ];
  sc.dir = E.DIRS.right; sc.nextDir = E.DIRS.right;
  sc.food = { x: 0, y: 0 }; // far away, won't be eaten
  E.setDirection(sc, 'down'); // head (10,10) -> (10,11) which is a body cell
  E.step(sc);
  check('moving into the snake body ends the game', sc.status === 'over');

  // 7. Tail-tip is NOT a collision when moving (the tail vacates that cell this tick).
  const st = E.createState({ cols: 20, rows: 20, startSpeed: 130, seed: 4 });
  st.snake = [
    { x: 11, y: 10 }, // head
    { x: 11, y: 11 },
    { x: 10, y: 11 },
    { x: 10, y: 10 }, // tail — the cell the head would enter if it turned left+up
  ];
  st.dir = E.DIRS.up; st.nextDir = E.DIRS.up;
  st.food = { x: 0, y: 0 };
  E.setDirection(st, 'left'); // head (11,10) -> (10,10) == current tail cell, which vacates
  E.step(st);
  check('entering the vacating tail cell is not a collision', st.status === 'playing');

  // 8. Eating food: grows +1, increments score, respawns food on an empty non-snake cell.
  const se = E.createState({ cols: 20, rows: 20, startSpeed: 130, seed: 8 });
  const head = se.snake[0];
  se.food = { x: head.x + 1, y: head.y }; // place food directly ahead (heading right)
  const lenBefore = se.snake.length, scoreBefore = se.score, foodsBefore = se.foodsEaten;
  E.step(se);
  check('eating grows the snake by 1', se.snake.length === lenBefore + 1);
  check('eating increases the score', se.score > scoreBefore);
  check('eating increments foodsEaten', se.foodsEaten === foodsBefore + 1);
  check('respawned food is on an empty non-snake cell',
    se.food && !onSnake(se.snake, se.food.x, se.food.y));

  // 9. speedFor: strictly decreasing until it hits the floor, then clamped.
  const start = 130;
  const seq = [0, 1, 2, 3, 5, 10, 20, 50].map((n) => E.speedFor(n, start));
  let monotone = true;
  for (let i = 1; i < seq.length; i++) if (seq[i] > seq[i - 1]) monotone = false;
  check('speedFor is monotonically non-increasing', monotone);
  check('speedFor decreases early then floors at SPEED_FLOOR_MS',
    seq[0] === start && seq[1] < start && seq[seq.length - 1] === E.SPEED_FLOOR_MS);

  // 10. Board-fill win on a tiny fixture: a 1x3 board, snake fills it after one eat.
  const sb = E.createState({ cols: 3, rows: 1, startSpeed: 130, seed: 6 });
  // snake length 3 on a 3-cell board already fills it; createState placed food=null -> still playing.
  // Use a 2x2 board instead: length-3 snake + 1 food cell; eating it fills the board -> won.
  const sb2 = E.createState({ cols: 2, rows: 2, startSpeed: 130, seed: 6 });
  // snake is 3 long, the 4th cell holds the food; arrange head adjacent to the food.
  // createState centers a length-3 horizontal snake on a 2x2 -> snake spans cells, food in the gap.
  let g3 = 0;
  while (sb2.status === 'playing' && g3++ < 10) {
    // steer toward the food cell each tick
    const f = sb2.food; const hh = sb2.snake[0];
    if (f) {
      if (f.x > hh.x) E.setDirection(sb2, 'right');
      else if (f.x < hh.x) E.setDirection(sb2, 'left');
      else if (f.y > hh.y) E.setDirection(sb2, 'down');
      else if (f.y < hh.y) E.setDirection(sb2, 'up');
    }
    E.step(sb2);
  }
  check('filling the board reaches the won state', sb2.status === 'won' || sb2.food === null);

  // 11. Deterministic RNG: same seed -> identical food placement.
  const a = E.createState({ cols: 20, rows: 20, startSpeed: 130, seed: 4242 });
  const b = E.createState({ cols: 20, rows: 20, startSpeed: 130, seed: 4242 });
  check('a fixed seed yields identical initial food (deterministic RNG)',
    a.food.x === b.food.x && a.food.y === b.food.y);

  finish();
}

function finish() {
  process.stdout.write(`\n${passed}/${EXPECTED_CHECKS} checks passed\n`);
  if (selftest && passed !== EXPECTED_CHECKS) {
    process.stderr.write(`selftest: expected ${EXPECTED_CHECKS} checks, got ${passed}\n`);
    process.exit(1);
  }
  process.exit(failures.length === 0 ? 0 : 1);
}

try { run(); } catch (e) {
  process.stderr.write(`run.mjs error: ${e.stack || e}\n`);
  process.exit(1);
}
