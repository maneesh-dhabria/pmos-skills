#!/usr/bin/env node
// T10 — /comments CLI entry. argv parser → resolver.js
//
// Usage:
//   node cli.js resolve <path> [--confirm-each|--batch|--auto|--non-interactive]
//
// Only --confirm-each (default) is wired in T10. Other modes exit 64
// ("usage error, not implemented yet") with a pointer to T13/T14.

"use strict";

const path = require("path");
const readline = require("readline");
const resolver = require("./resolver");

function usage() {
  process.stderr.write(
    "Usage: comments resolve <artifact-path> " +
      "[--confirm-each|--batch|--auto|--non-interactive]\n"
  );
}

function parseArgs(argv) {
  const a = argv.slice(2);
  if (a.length < 2 || a[0] !== "resolve") {
    return { error: "bad-verb" };
  }
  let mode = "confirm-each";
  let target = null;
  for (let i = 1; i < a.length; i++) {
    const tok = a[i];
    if (tok === "--confirm-each") mode = "confirm-each";
    else if (tok === "--batch") mode = "batch";
    else if (tok === "--auto") mode = "auto";
    else if (tok === "--non-interactive") mode = "non-interactive";
    else if (tok.startsWith("--")) return { error: "unknown-flag:" + tok };
    else if (target === null) target = tok;
    else return { error: "extra-arg:" + tok };
  }
  if (!target) return { error: "missing-path" };
  return { mode: mode, target: path.resolve(target) };
}

function makeReadlineAsker() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  function ask(question, options) {
    return new Promise((resolve) => {
      const opts = Array.isArray(options) && options.length
        ? "\n[" + options.join(" / ") + "]"
        : "";
      rl.question(question + opts + "\n> ", (ans) => {
        resolve(String(ans || "").trim());
      });
    });
  }
  ask._close = () => rl.close();
  return ask;
}

(async () => {
  const parsed = parseArgs(process.argv);
  if (parsed.error) {
    usage();
    process.exit(64);
  }
  if (parsed.mode !== "confirm-each") {
    process.stderr.write(
      "mode=" + parsed.mode + " — not implemented in T10. See T13/T14.\n"
    );
    process.exit(64);
  }
  const ask = makeReadlineAsker();
  try {
    await resolver.resolve({
      path: parsed.target,
      mode: parsed.mode,
      askUser: ask,
    });
  } catch (e) {
    process.stderr.write("resolve error: " + (e && e.message ? e.message : String(e)) + "\n");
    process.exit(1);
  } finally {
    if (typeof ask._close === "function") ask._close();
  }
})();
