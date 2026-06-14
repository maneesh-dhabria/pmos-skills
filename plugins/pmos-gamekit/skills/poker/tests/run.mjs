#!/usr/bin/env node
// run.mjs — engine self-test for the bundled No-Limit Hold'em game (AC6).
//
//   node run.mjs            run the checks
//   node run.mjs --selftest also assert the expected check count, exit 0/1
//
// Reads game/poker.html, extracts the pure-logic engine <script> (the one that
// assigns PokerEngine), evaluates it in a Node vm with no DOM, and exercises the
// engine: 52-card deal distribution, the 7-card hand evaluator (ordering, kickers,
// splits, the wheel), legal/illegal action enforcement, street-advance gating,
// multi-way all-in side pots (chip conservation + eligibility), showdown awards,
// and a legal bot decision. No external dependencies — Node stdlib only.
//
// The engine is ported from the poker-coach reference (core/{cards,eval,engine,bots}).

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(__dirname, '..', 'game', 'poker.html');

const EXPECTED_CHECKS = 39;
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
  const engineSrc = scripts.find((s) => s.includes('root.PokerEngine'));
  if (!engineSrc) throw new Error('could not find the PokerEngine <script> in poker.html');
  const sandbox = { window: {}, globalThis: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(engineSrc, sandbox, { filename: 'poker-engine.js' });
  const E = sandbox.window.PokerEngine;
  if (!E) throw new Error('engine script ran but PokerEngine was not exposed on window');
  return E;
}

function run() {
  const E = loadEngine();

  // ---- 1. Deck ----
  const deck = E.makeDeck();
  check('deck has 52 cards', deck.length === 52);
  check('deck has 52 unique cards', new Set(deck).size === 52);
  check('deck cards are 2-char rank+suit', deck.every((c) => typeof c === 'string' && c.length === 2));

  // ---- 2. Deterministic RNG + shuffle preserves the multiset ----
  const rng = E.mulberry32(42);
  const sh = E.shuffle(deck, rng);
  check('shuffle preserves the 52-card multiset', sh.length === 52 && new Set(sh).size === 52);
  const rngA = E.mulberry32(7), rngB = E.mulberry32(7);
  check('mulberry32 is deterministic for a seed', rngA() === rngB());

  // ---- 3. Hand evaluator ordering ----
  const r = (cards) => E.rank5(cards);
  const straightFlush = ['9h', '8h', '7h', '6h', '5h'];
  const quads = ['9h', '9d', '9c', '9s', 'Kd'];
  const fullHouse = ['9h', '9d', '9c', 'Kd', 'Ks'];
  const flush = ['Ah', 'Jh', '8h', '5h', '2h'];
  const straight = ['9h', '8d', '7c', '6h', '5s'];
  const trips = ['9h', '9d', '9c', 'Kd', '2s'];
  const twoPair = ['9h', '9d', 'Kc', 'Kd', '2s'];
  const pair = ['9h', '9d', 'Kc', '7d', '2s'];
  const highCard = ['Ah', 'Jd', '8c', '5d', '2s'];
  const ordered = [highCard, pair, twoPair, trips, straight, flush, fullHouse, quads, straightFlush].map(r);
  check('evaluator orders the 9 categories strictly ascending',
    ordered.every((v, i) => i === 0 || v > ordered[i - 1]));

  // categoryOf reverses the encoding.
  check('categoryOf(straight flush) === StraightFlush', E.categoryOf(r(straightFlush)) === E.HandCategory.StraightFlush);
  check('categoryOf(two pair) === TwoPair', E.categoryOf(r(twoPair)) === E.HandCategory.TwoPair);

  // ---- 4. Kicker tie-breaks + splits ----
  check('quads with Ace kicker beats quads with King kicker',
    r(['9h', '9d', '9c', '9s', 'Ad']) > r(['9h', '9d', '9c', '9s', 'Kd']));
  check('pair of Kings, Ace kicker beats pair of Kings, Queen kicker',
    r(['Kh', 'Kd', 'Ac', '7d', '2s']) > r(['Kh', 'Kd', 'Qc', '7d', '2s']));
  check('identical-rank hands of different suits tie (split)',
    r(['Kh', 'Kd', 'Ac', '7d', '2s']) === r(['Ks', 'Kc', 'As', '7h', '2c']));

  // ---- 5. The wheel (A-2-3-4-5) is the lowest straight, below 6-high ----
  const wheel = r(['Ah', '2d', '3c', '4h', '5s']);
  check('wheel A-2-3-4-5 is a straight', E.categoryOf(wheel) === E.HandCategory.Straight);
  check('wheel ranks below a 6-high straight', wheel < r(['6h', '5d', '4c', '3h', '2s']));

  // ---- 6. rank7 picks the best 5 of 7; labels + winning cards ----
  const hole = ['Ah', 'Kh'];
  const board = ['Qh', 'Jh', 'Th', '2c', '3d'];
  check('rank7 finds the royal/straight flush among 7', E.categoryOf(E.rank7([...hole, ...board])) === E.HandCategory.StraightFlush);
  check('handCategoryLabel names a full house',
    /Full House/.test(E.handCategoryLabel(['9h', '9d', '9c', 'Kd', 'Ks'])));
  check('winningCards returns the best 5 from hole+board', E.winningCards(hole, board).length === 5);

  // ---- 7. Side pots: multi-way all-in, chip conservation + eligibility ----
  // seat0 committed 100 (folded), seat1 committed 50 (all-in), seat2 committed 100, seat3 committed 25 (all-in).
  const contribs = [
    { seat: 0, committed: 100, folded: true },
    { seat: 1, committed: 50, folded: false },
    { seat: 2, committed: 100, folded: false },
    { seat: 3, committed: 25, folded: false },
  ];
  const pots = E.buildSidePots(contribs);
  const totalIn = contribs.reduce((s, c) => s + c.committed, 0);
  const totalPot = pots.reduce((s, p) => s + p.amount, 0);
  check('side pots conserve all committed chips', totalPot === totalIn);
  // Lowest layer (to 25): everyone in for >=25 contributes 25 → 100; eligible = non-folded with commit>=25 = {1,2,3}.
  check('first side-pot layer eligibility excludes the folder',
    pots[0].amount === 100 && JSON.stringify(pots[0].eligible) === JSON.stringify([1, 2, 3]));
  // Top layer (75..100): only seats 0(folded) and 2 reach it → amount 50, eligible {2} only.
  const top = pots[pots.length - 1];
  check('top side-pot layer is contested only by the seats that reached it',
    JSON.stringify(top.eligible) === JSON.stringify([2]));

  // ---- 8. Betting machine: blinds, legal actions, turn order ----
  const seats = [0, 1, 2].map((seat) => ({ seat, stack: 1000 }));
  const h = E.createHand({ config: { smallBlind: 5, bigBlind: 10 }, seats, rng: E.mulberry32(1), buttonIndex: 0 });
  check('blinds are posted (pot == SB+BB at start)', h.pot() === 15);
  const la = h.legalActions();
  check('preflop first-to-act faces a call of one big blind', la.toCall === 10);
  check('legal preflop actions are fold/call/raise', la.actions.includes('fold') && la.actions.includes('call') && la.actions.includes('raise'));
  check('min-raise-to is at least 2 big blinds preflop', la.minRaiseTo === 20);

  // ---- 9. Illegal actions are rejected ----
  let threwSubMin = false;
  try { h.apply({ type: 'raise', amount: 12 }); } catch { threwSubMin = true; } // below 20, not all-in
  check('a sub-minimum raise throws', threwSubMin);
  let threwOverStack = false;
  try { h.apply({ type: 'raise', amount: 99999 }); } catch { threwOverStack = true; }
  check('a raise exceeding the stack throws', threwOverStack);
  let threwCheck = false;
  try { h.apply({ type: 'check' }); } catch { threwCheck = true; } // facing the BB, cannot check
  check('checking while facing a bet throws', threwCheck);

  // ---- 10. Street advances only when betting is closed ----
  const h2 = E.createHand({ config: { smallBlind: 5, bigBlind: 10 }, seats, rng: E.mulberry32(2), buttonIndex: 0 });
  h2.apply({ type: 'call' }); // UTG (seat0 is button; 3-handed: SB=seat1, BB=seat2, UTG=seat0) calls
  check('still preflop after one of three players acts', h2.street === 'preflop' && h2.board.length === 0);
  h2.apply({ type: 'call' }); // SB completes
  h2.apply({ type: 'check' }); // BB checks option → betting closed
  check('flop is dealt only once preflop betting closes', h2.street === 'flop' && h2.board.length === 3);

  // ---- 11. Fold-out win ends the hand and awards the pot to the last player ----
  const h3 = E.createHand({ config: { smallBlind: 5, bigBlind: 10 }, seats, rng: E.mulberry32(3), buttonIndex: 0 });
  h3.apply({ type: 'fold' }); // UTG folds
  h3.apply({ type: 'fold' }); // SB folds → BB wins uncontested
  check('hand completes when all but one fold', h3.isHandOver() && h3.contenders().length === 1);
  const res3 = h3.result();
  const net3 = Object.values(res3.net).reduce((s, v) => s + v, 0);
  check('fold-out result conserves chips (net sums to zero)', net3 === 0);
  check('fold-out is not a showdown', res3.endedAtShowdown === false);

  // ---- 12. Showdown with a forced board: the better hand wins; chips conserved ----
  const sd = E.createHand({
    config: { smallBlind: 5, bigBlind: 10 },
    seats: [{ seat: 0, stack: 1000 }, { seat: 1, stack: 1000 }],
    rng: E.mulberry32(9),
    buttonIndex: 0,
    holeOverride: { 0: ['Ah', 'Ad'], 1: ['Kh', 'Kd'] },
    boardOverride: ['As', '7c', '2d', '9h', '3s'], // seat0 flops a set of aces
  });
  // Heads-up: button(seat0)=SB, seat1=BB. Play it out to showdown by calling/checking.
  let guard = 0;
  while (!sd.isHandOver() && guard++ < 20) {
    const a = sd.legalActions();
    if (a.toAct < 0) break;
    if (a.actions.includes('check')) sd.apply({ type: 'check' });
    else sd.apply({ type: 'call' });
  }
  const sdRes = sd.result();
  check('showdown awards the pot to the stronger hand (set of aces)',
    sdRes.winners.length === 1 && sdRes.winners[0].seat === 0);
  check('showdown result conserves chips', Object.values(sdRes.net).reduce((s, v) => s + v, 0) === 0);

  // ---- 13. Engine-driven side pot via unequal stacks (the AC9 deterministic hook) ----
  const spHand = E.createHand({
    config: { smallBlind: 5, bigBlind: 10 },
    seats: [{ seat: 0, stack: 100 }, { seat: 1, stack: 40 }, { seat: 2, stack: 300 }],
    rng: E.mulberry32(11),
    buttonIndex: 0,
    holeOverride: { 0: ['2c', '3c'], 1: ['Ah', 'Ad'], 2: ['Kh', 'Kd'] }, // short stack (seat1) has the best hand
    boardOverride: ['Ac', '7d', '2h', '9s', '3d'], // seat1 makes a set of aces
  });
  guard = 0;
  while (!spHand.isHandOver() && guard++ < 30) {
    const a = spHand.legalActions();
    if (a.toAct < 0) break;
    // Everyone shoves / calls all-in.
    if (a.actions.includes('raise') && a.maxRaiseTo > a.minRaiseTo) spHand.apply({ type: 'raise', amount: a.maxRaiseTo });
    else if (a.actions.includes('bet')) spHand.apply({ type: 'bet', amount: a.maxRaiseTo });
    else if (a.actions.includes('call')) spHand.apply({ type: 'call' });
    else if (a.actions.includes('check')) spHand.apply({ type: 'check' });
    else break;
  }
  const spRes = spHand.result();
  check('multi-way all-in builds more than one pot', spRes.pots.length >= 2);
  check('all-in showdown conserves chips', Object.values(spRes.net).reduce((s, v) => s + v, 0) === 0);
  // Short all-in (seat1, 40) wins the main pot (40*3=120) with the best hand; can't win the side pot.
  check('the short all-in with the best hand wins the main pot but not the side pot',
    spRes.net[1] > 0 && spRes.net[1] < spRes.pots.reduce((s, p) => s + p.amount, 0));

  // ---- 14. A bot returns a legal action for a representative spot ----
  const params = E.personaFor('TAG', 'Intermediate');
  const botHand = E.createHand({ config: { smallBlind: 5, bigBlind: 10 }, seats, rng: E.mulberry32(5), buttonIndex: 0 });
  const bla = botHand.legalActions();
  const decision = E.decide(
    { legal: bla, hole: botHand.holeOf(bla.toAct), board: botHand.board, potBefore: botHand.pot() },
    params, E.mulberry32(5));
  check('bot decision is one of the legal action types', bla.actions.includes(decision.type));
  check('personaFor produces clamped tunables in [0,1]',
    [params.vpip, params.aggression, params.bluffFreq, params.callStation].every((v) => v >= 0 && v <= 1));
  const table = E.randomTable(3, E.mulberry32(8));
  check('randomTable builds the requested number of bot personas', Array.isArray(table) && table.length === 3);

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
