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

const EXPECTED_CHECKS = 13;
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
