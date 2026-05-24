'use strict';
const path = require('path');
const assert = require('assert');
const DMP_PATH = path.resolve(__dirname, '../../plugins/pmos-toolkit/skills/_shared/html-authoring/assets/diff-match-patch.js');
const dmpModule = require(DMP_PATH);
const dmp = new dmpModule.diff_match_patch();
dmp.Match_Threshold = 0.5;
dmp.Match_Distance = 1000;

assert.strictEqual(dmp.match_main("Hello world", "world", 0), 6, "exact match offset");
const r1 = dmp.match_main("the resolver dispatches a generic subagent here", "resolver dispatches subagent", 0);
assert.ok(r1 >= 0 && r1 < 50, "Bitap finds paraphrased substring");
assert.strictEqual(dmp.match_main("Hello world", "xyzpdq", 0), -1, "no false positive");
console.log("PASS: dmp.match_main exact + paraphrase + miss");
