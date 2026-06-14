#!/usr/bin/env node
/* Behavioral selftest for the /sudoku engine.
 * Reads game/sudoku.html, extracts the engine <script>, evaluates it in a Node vm,
 * and asserts the window.SudokuEngine contract. Node stdlib only (fs, path, vm, url).
 *
 *   node tests/run.mjs            # run, exit 0/1
 *   node tests/run.mjs --selftest # also assert the check COUNT (catches silently-dropped tests)
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const EXPECTED_CHECKS = 29;

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, '..', 'game', 'sudoku.html');
const html = readFileSync(htmlPath, 'utf8');

// --- extract the engine <script> (the block that defines root.SudokuEngine) ---
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const engineSrc = scripts.find((s) => s.includes('root.SudokuEngine'));
if (!engineSrc) {
  console.error('FAIL: could not find the engine <script> (root.SudokuEngine) in sudoku.html');
  process.exit(1);
}
const ctx = { window: {}, globalThis: {}, console };
vm.createContext(ctx);
vm.runInContext(engineSrc, ctx, { filename: 'sudoku-engine.js' });
const E = ctx.window.SudokuEngine;

// --- tiny assert harness ---
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('FAIL  ' + name); }
}

// --- helpers ---
function rowsOK(g) { for (let r = 0; r < 9; r++) { const s = new Set(); for (let c = 0; c < 9; c++) s.add(g[r*9+c]); if (s.size !== 9 || s.has(0)) return false; } return true; }
function colsOK(g) { for (let c = 0; c < 9; c++) { const s = new Set(); for (let r = 0; r < 9; r++) s.add(g[r*9+c]); if (s.size !== 9 || s.has(0)) return false; } return true; }
function boxesOK(g) { for (let b = 0; b < 9; b++) { const s = new Set(); const br = Math.floor(b/3)*3, bc = (b%3)*3; for (let dr=0;dr<3;dr++) for (let dc=0;dc<3;dc++) s.add(g[(br+dr)*9+(bc+dc)]); if (s.size !== 9 || s.has(0)) return false; } return true; }
// build a custom candidate grid from {idx:[digits]} (everything else null/filled)
function mkCand(spec) {
  const cand = new Array(81).fill(null);
  for (const k of Object.keys(spec)) { const o = {}; spec[k].forEach((d) => (o[d] = true)); cand[+k] = o; }
  return cand;
}

if (E) check('engine present on window.SudokuEngine', true);
else { console.error('FAIL: engine missing'); process.exit(1); }

// ---- solved grid validity ----
const rng = E.makeRng(12345);
const full = E.makeSolvedGrid(rng);
check('makeSolvedGrid: every row is 1..9', rowsOK(full));
check('makeSolvedGrid: every column is 1..9', colsOK(full));
check('makeSolvedGrid: every box is 1..9', boxesOK(full));

// ---- uniqueness ----
check('countSolutions(full grid) === 1', E.countSolutions(full, 2) === 1);
const sparse = full.slice(); for (let i = 0; i < 60; i++) sparse[i] = 0; // wildly under-constrained
check('countSolutions(under-constrained) hits cap >= 2', E.countSolutions(sparse, 2) >= 2);

// ---- generation per difficulty ----
const easy = E.generate('easy', E.makeRng(7));
check('generate(easy): unique solution', E.countSolutions(easy.puzzle, 2) === 1);
let digMatches = true;
for (let i = 0; i < 81; i++) if (easy.puzzle[i] !== 0 && easy.puzzle[i] !== easy.solution[i]) digMatches = false;
check('generate(easy): givens match the source solution', digMatches);
check('generate(easy): grade === easy', E.grade(easy.puzzle) === 'easy');
check('generate(easy): givens within band', easy.givens >= E.BANDS.easy[0] && easy.givens <= E.BANDS.easy[1]);

const medium = E.generate('medium', E.makeRng(101));
check('generate(medium): grade === medium', E.grade(medium.puzzle) === 'medium');

const hard = E.generate('hard', E.makeRng(202));
check('generate(hard): unique solution', E.countSolutions(hard.puzzle, 2) === 1);
check('generate(hard): grade === hard', E.grade(hard.puzzle) === 'hard');

// ---- each technique fires on a fixture ----
const dummy = new Array(81).fill(0);

// naked single: one cell with a single candidate
const nsCand = mkCand({ 0: [5] });
const ns = E.techniques.nakedSingle(dummy, nsCand);
check('nakedSingle fires (value 5 at cell 0)', !!ns && ns.type === 'place' && ns.value === 5 && ns.idx === 0);

// hidden single: in row 0, digit 1 can go only in cell 0 (which itself has 3 candidates)
const hsSpec = { 0: [1, 2, 3] };
for (let c = 1; c < 9; c++) hsSpec[c] = [4, 5]; // none hold 1
const hs = E.techniques.hiddenSingle(dummy, mkCand(hsSpec));
check('hiddenSingle fires (value 1, only spot)', !!hs && hs.type === 'place' && hs.value === 1);

// locked candidate (pointing): 5 in box 0 confined to row 0 -> eliminate from rest of row 0
const lc = E.techniques.lockedCandidate(dummy, mkCand({ 0: [5, 7], 1: [5, 7], 2: [5, 7], 3: [5, 6] }));
check('lockedCandidate fires + eliminates 5 from R1C4',
  !!lc && lc.type === 'eliminate' && lc.removals.some((r) => r.idx === 3 && r.value === 5));

// naked pair: {1,2} at cells 0,1 of row 0 -> strip 1,2 from cell 2
const np = E.techniques.nakedPair(dummy, mkCand({ 0: [1, 2], 1: [1, 2], 2: [1, 2, 3] }));
check('nakedPair fires + eliminates {1,2} from cell 2',
  !!np && np.type === 'eliminate' && np.removals.some((r) => r.idx === 2 && r.value === 1) && np.removals.some((r) => r.idx === 2 && r.value === 2));

// hidden pair: digits 1,2 only in cells 0,1 of row 0 (each carrying extra candidates to strip)
const hpSpec = { 0: [1, 2, 3], 1: [1, 2, 4] };
for (let c = 2; c < 9; c++) hpSpec[c] = [5, 6]; // no 1 or 2 elsewhere
const hp = E.techniques.hiddenPair(dummy, mkCand(hpSpec));
check('hiddenPair fires + strips extras from the pair cells',
  !!hp && hp.type === 'eliminate' && hp.removals.some((r) => r.idx === 0 && r.value === 3) && hp.removals.some((r) => r.idx === 1 && r.value === 4));

// X-Wing: digit 3 forms a rectangle on rows 0 & 4 in columns 2 & 6 -> eliminate 3 elsewhere in those columns
const xw = E.techniques.xWing(dummy, mkCand({ 2: [3], 6: [3], 38: [3], 42: [3], 11: [3, 4] }));
check('xWing fires + eliminates 3 from R2C3',
  !!xw && xw.type === 'eliminate' && xw.removals.some((r) => r.idx === 11 && r.value === 3));

// XY-Wing: pivot {1,2}@R1C1, wings {1,3}@R1C2 and {2,3}@R2C1 -> R2C2 (sees both) can't be 3
const xy = E.techniques.xyWing(dummy, mkCand({ 0: [1, 2], 1: [1, 3], 9: [2, 3], 10: [3, 4] }));
check('xyWing fires + eliminates 3 from R2C2',
  !!xy && xy.type === 'eliminate' && xy.removals.some((r) => r.idx === 10 && r.value === 3));

// ---- grading: a singles-only board grades easy ----
const singlesBoard = full.slice();
[0, 13, 26, 28, 41, 51].forEach((i) => (singlesBoard[i] = 0)); // pairwise non-peers -> each a naked single
check('grade(singles-only board) === easy', E.grade(singlesBoard) === 'easy');

// ---- conflicts ----
const dup = full.slice();
const peerIdx = E._units.PEERS[0][0];      // a peer of cell 0
dup[peerIdx] = full[0];                     // force a duplicate of cell 0's value
check('conflicts flags a duplicated digit', E.conflicts(dup).includes(0) && E.conflicts(dup).includes(peerIdx));
check('conflicts passes a clean full grid', E.conflicts(full).length === 0);

// ---- solutionErrors ----
const partial = easy.puzzle.slice();
const firstEmpty = partial.indexOf(0);
const wrongVal = easy.solution[firstEmpty] === 1 ? 2 : 1;
partial[firstEmpty] = wrongVal;             // a wrong filled entry
check('solutionErrors flags a wrong filled cell', E.solutionErrors(partial, easy.solution).includes(firstEmpty));
const correctPartial = easy.puzzle.slice();
const e2 = correctPartial.indexOf(0);
correctPartial[e2] = easy.solution[e2];     // a correct filled entry
check('solutionErrors passes a correct partial (no false flag)', E.solutionErrors(correctPartial, easy.solution).length === 0);
check('solutionErrors ignores still-empty cells', E.solutionErrors(easy.puzzle, easy.solution).length === 0);

// ---- candidates + auto-clear semantics ----
const cb = easy.puzzle.slice();
const empty = cb.indexOf(0);
const cands = E.candidatesFor(cb, Math.floor(empty / 9), empty % 9);
let legal = cands.length > 0;
for (const v of cands) if (E._units.PEERS[empty].some((p) => cb[p] === v)) legal = false; // none may clash with a peer
check('candidatesFor returns a legal candidate set', legal);
const chosen = cands[0];
const peerEmpty = E._units.PEERS[empty].find((p) => cb[p] === 0 && E.candidatesAt(cb, p).includes(chosen));
cb[empty] = chosen;                          // place it
check('placing a digit clears it from a peer\'s candidates',
  peerEmpty == null || !E.candidatesAt(cb, peerEmpty).includes(chosen));

// ---- nextHint ----
const hintStep = E.nextHint(easy.puzzle);
check('nextHint returns a legal, correct next placement',
  !!hintStep && hintStep.value === easy.solution[hintStep.cells[0]] && easy.puzzle[hintStep.cells[0]] === 0);

// --- summary ---
console.log('\n' + pass + ' passed, ' + fail + ' failed (of ' + (pass + fail) + ')');
if (process.argv.includes('--selftest') && (pass + fail) !== EXPECTED_CHECKS) {
  console.error('SELFTEST: expected ' + EXPECTED_CHECKS + ' checks, ran ' + (pass + fail));
  process.exit(1);
}
process.exit(fail === 0 ? 0 : 1);
