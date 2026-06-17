#!/usr/bin/env node
// run.mjs — engine self-test for the bundled Klondike game (AC7).
//
//   node run.mjs            run the checks
//   node run.mjs --selftest also assert the expected check count, exit 0/1
//
// Reads game/solitaire.html, extracts the pure-logic engine <script> (the one that
// assigns SolitaireEngine), evaluates it in a Node vm with no DOM, and exercises the
// engine: deal distribution, move legality, win-check, and undo (via clone+apply).
// No external dependencies — Node stdlib only.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(__dirname, '..', 'game', 'solitaire.html');

const EXPECTED_CHECKS = 24;
const selftest = process.argv.includes('--selftest');

let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) { passed += 1; process.stdout.write(`  ok   ${name}\n`); }
  else { failures.push(name); process.stdout.write(`  FAIL ${name}\n`); }
}

function loadEngine() {
  const html = fs.readFileSync(HTML, 'utf8');
  // Grab every <script>…</script> block; pick the one that defines SolitaireEngine.
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const engineSrc = scripts.find((s) => s.includes('root.SolitaireEngine'));
  if (!engineSrc) throw new Error('could not find the SolitaireEngine <script> in solitaire.html');
  const sandbox = { window: {}, globalThis: {} };
  vm.createContext(sandbox);
  vm.runInContext(engineSrc, sandbox, { filename: 'solitaire-engine.js' });
  const E = sandbox.window.SolitaireEngine;
  if (!E) throw new Error('engine script ran but SolitaireEngine was not exposed on window');
  return E;
}

function run() {
  const E = loadEngine();

  // 1. Deck is 52 unique cards.
  const deck = E.makeDeck();
  check('deck has 52 cards', deck.length === 52);
  check('deck has 52 unique ids', new Set(deck.map((c) => c.id)).size === 52);

  // 2. Deal distribution: stock 24, tableau 28 (1..7), last in each column face-up.
  const game = E.newGame({ seed: 12345, drawCount: 1 });
  const tableauCounts = game.tableau.map((c) => c.length);
  check('tableau columns are 1..7', JSON.stringify(tableauCounts) === JSON.stringify([1, 2, 3, 4, 5, 6, 7]));
  check('stock has 24', game.stock.length === 24);
  const allDealt = [
    ...game.stock, ...game.waste,
    ...game.tableau.flat(),
    ...E.SUITS.flatMap((s) => game.foundations[s]),
  ];
  check('deal accounts for all 52 cards', allDealt.length === 52 && new Set(allDealt.map((c) => c.id)).size === 52);
  check('last card in each tableau column is face-up', game.tableau.every((col) => col[col.length - 1].faceUp));
  check('all stock cards are face-down', game.stock.every((c) => !c.faceUp));

  // 3. Move legality — draw is legal from a full stock; recycle is not (stock non-empty).
  check('draw is legal with stock present', E.isLegalMove(game, { type: 'draw' }));
  check('recycle is illegal while stock non-empty', !E.isLegalMove(game, { type: 'recycle' }));

  // 4. Foundation legality: Ace onto empty foundation legal; 2-of-other-suit illegal.
  const fGame = E.clone(game);
  fGame.waste.push({ suit: 'H', rank: 1, faceUp: true, id: 'H1' });
  check('Ace -> empty foundation is legal', E.isLegalMove(fGame, { type: 'wasteToFoundation' }));
  const badGame = E.clone(game);
  badGame.waste.push({ suit: 'H', rank: 2, faceUp: true, id: 'H2' });
  check('non-Ace -> empty foundation is illegal', !E.isLegalMove(badGame, { type: 'wasteToFoundation' }));

  // 5. Win-check fires only on four complete foundations.
  check('win-check true only on four complete foundations',
    E.isWin(E.winState()) === true && E.isWin(E.nearWinState()) === false && E.isWin(game) === false);

  // 6. Undo: clone(before) + applyMove → state changes; restoring the clone reverts it.
  const before = E.clone(game);
  const after = E.applyMove(game, { type: 'draw' });
  const changed = after.waste.length === 1 && after.stock.length === 23;
  const restored = JSON.stringify(before) === JSON.stringify(game); // game itself untouched (applyMove is pure)
  check('applyMove is pure and undo restores prior state', changed && restored);

  // 7. Productive-move finder + deadlock detection (F3/F4).
  // Plain-object state builder matching the engine schema (no exported emptyState).
  const mk = (over) => Object.assign({
    stock: [], waste: [],
    foundations: { S: [], H: [], D: [], C: [] },
    tableau: [[], [], [], [], [], [], []],
    drawCount: 1,
  }, over || {});
  const card = (id, faceUp) => ({ suit: id[0], rank: Number(id.slice(1)), faceUp: faceUp !== false, id });

  // 7a. firstProductiveMove prefers waste→foundation and carries a source locator.
  const aceWaste = mk({ waste: [card('H1')] });
  const fpAce = E.firstProductiveMove(aceWaste);
  check('firstProductiveMove finds waste→foundation with waste source',
    !!fpAce && fpAce.type === 'wasteToFoundation' && fpAce.source && fpAce.source.zone === 'waste');

  // 7b. tableau→foundation surfaced with a tableau source locator (col/index of the top).
  const aceTab = mk({ tableau: [[card('S1')], [], [], [], [], [], []] });
  const fpTab = E.firstProductiveMove(aceTab);
  check('firstProductiveMove finds tableau→foundation with tableau source',
    !!fpTab && fpTab.type === 'tableauToFoundation' && fpTab.from === 0 &&
    fpTab.source && fpTab.source.zone === 'tableau' && fpTab.source.col === 0 && fpTab.source.index === 0);

  // 7c. A pure tableau→tableau move that findFoundationMove would miss (red 6 onto black 7).
  const tabShuffle = mk({ tableau: [[card('H6')], [card('S7')], [], [], [], [], []] });
  const fpShuffle = E.firstProductiveMove(tabShuffle);
  check('firstProductiveMove finds a tableau→tableau move findFoundationMove misses',
    E.findFoundationMove(tabShuffle) === null &&
    !!fpShuffle && fpShuffle.type === 'tableauToTableau' && fpShuffle.from === 0 && fpShuffle.to === 1);

  // 7d. A hand-built dead position: all tops same color (black), no aces, no empties,
  //     empty stock + waste → no productive move now or across a cycle.
  const dead = mk({
    tableau: [[card('S5')], [card('S7')], [card('S9')], [card('C4')], [card('C6')], [card('C8')], [card('C10')]],
  });
  check('hasProductiveMove false on a dead position', E.hasProductiveMove(dead) === false);
  check('hasProductiveMove true on a productive position', E.hasProductiveMove(aceWaste) === true);
  check('firstProductiveMove null on a dead position', E.firstProductiveMove(dead) === null);
  check('isDeadlocked true on a hand-built dead position', E.isDeadlocked(dead) === true);

  // 7e. Never a false positive: a fresh winnable deal and a solved board are not deadlocked.
  check('isDeadlocked false on a real deal and on a won board',
    E.isDeadlocked(game) === false && E.isDeadlocked(E.winState()) === false);

  // 7f. A future draw rescues the position: same dead tableau, but an Ace waits in the stock.
  const drawRescue = mk({
    tableau: dead.tableau.map((c) => c.slice()),
    stock: [card('H1', false)],
  });
  check('isDeadlocked false when a stock draw reveals a productive move',
    E.isDeadlocked(drawRescue) === false);

  // 7g. A recycle rescues the position: stock empty, the Ace sits at the bottom of the waste.
  const recycleRescue = mk({
    tableau: dead.tableau.map((c) => c.slice()),
    waste: [card('H1'), card('C2')], // top (C2) is unplayable; H1 only reachable after recycle
  });
  check('isDeadlocked false when a recycle reveals a productive move',
    E.isDeadlocked(recycleRescue) === false);

  // 7h. Purity: the finders never mutate their input.
  const snap = JSON.stringify(dead);
  E.firstProductiveMove(dead); E.hasProductiveMove(dead); E.isDeadlocked(drawRescue);
  check('firstProductiveMove / isDeadlocked do not mutate input', JSON.stringify(dead) === snap);

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
