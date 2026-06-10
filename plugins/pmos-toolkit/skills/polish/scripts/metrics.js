#!/usr/bin/env node
// metrics.js — deterministic prose metrics for /polish rubric checks 2, 3, 11.
//
// Computes the three numbers those checks compare against preset thresholds, so
// the LLM judge never does arithmetic (skill-patterns §H: arithmetic → script,
// judge consumes the output):
//
//   check 2  — passive-voice %        → passive.pct
//   check 3  — sentence-length stddev → sentences.worst_window.stddev
//   check 11 — heading metrics        → headings.max_depth, headings.avg_words_per_section
//
// Usage:   node metrics.js <file.md | file.html | file.txt>
// Output:  one JSON object on stdout (schema below). Exit 0 on success
//          (including empty input), 2 on missing/unreadable file.
//
// Zero-dep, pure Node. Input format by extension: .html/.htm → html, else markdown.
//
// PRECISION LIMITS (heuristics, not parsers — thresholds should leave slack):
//   - Sentence boundaries are the same [.!?] heuristic voice-sampling.md uses;
//     abbreviations ("e.g.", "v2.5") over-split, headings-as-sentences never occur
//     (headings are excluded from prose).
//   - Passive detection = be-verb followed (within 2 tokens, skipping adverbs/"not")
//     by a past participle (-ed or a fixed irregular list). Over-counts adjectival
//     participles ("the door was closed" as state); misses get-passives. Counted
//     per sentence, not per construction.
//   - worst_window is the MOST MONOTONE ~200-word run of consecutive sentences
//     (minimum stddev), which is the span check 3 exists to catch; it is at least
//     as strict as any single-window reading of the old judge prompt.
//   - Sections = prose spans following each heading; preamble before the first
//     heading is excluded from avg_words_per_section. No headings → null.
//   - Lock zones handled: frontmatter, fenced/inline code, HTML comments/tags,
//     <script>/<style>/<pre>/<code>/<head>, link URLs, footnote defs, table rows.
//     Anything subtler (Notion placeholders) is the orchestrator's job.

"use strict";

const fs = require("fs");

const BE_VERBS = new Set(["am", "is", "are", "was", "were", "be", "been", "being"]);
const SKIPPABLE = new Set(["not", "never", "already", "also", "still", "often", "since", "been", "being"]);
const IRREGULAR_PARTICIPLES = new Set([
  "done", "made", "given", "taken", "seen", "known", "shown", "written", "built",
  "held", "kept", "left", "lost", "found", "brought", "thought", "bought", "caught",
  "taught", "sent", "spent", "told", "sold", "paid", "said", "read", "set", "put",
  "run", "begun", "chosen", "driven", "drawn", "eaten", "felt", "gotten", "grown",
  "heard", "hidden", "hit", "led", "meant", "met", "sung", "spoken", "understood",
  "won", "worn", "broken", "frozen", "beaten", "born", "cut", "laid", "drawn",
]);
const WINDOW_WORDS = 200; // check 3's window size, per reference/rubric.md

// ---------- prose extraction ----------

// Returns { proseLines: [{line, text}], headings: [{line, depth, text}] }.
function extractMarkdown(src) {
  const lines = src.split(/\r?\n/);
  const proseLines = [];
  const headings = [];
  let i = 0;
  // frontmatter
  if (lines[0] !== undefined && /^(---|\+\+\+)\s*$/.test(lines[0])) {
    const close = lines.findIndex((l, k) => k > 0 && /^(---|\+\+\+)\s*$/.test(l));
    if (close > 0) i = close + 1;
  }
  let inFence = false;
  let inComment = false;
  for (; i < lines.length; i++) {
    let text = lines[i];
    if (/^\s*(```|~~~)/.test(text)) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (inComment) {
      if (text.includes("-->")) { text = text.slice(text.indexOf("-->") + 3); inComment = false; }
      else continue;
    }
    const h = text.match(/^(#{1,6})\s+(.*)$/);
    if (h) { headings.push({ line: i + 1, depth: h[1].length, text: h[2].trim() }); continue; }
    if (/^\s*\|/.test(text)) continue;            // table rows
    if (/^\s*\[\^[^\]]+\]:/.test(text)) continue; // footnote definitions
    text = text
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")       // images
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")    // links → keep text
      .replace(/\[\^[^\]]+\]/g, "")               // footnote refs
      .replace(/`[^`]*`/g, "")                    // inline code
      .replace(/<[^>]+>/g, " ")                   // inline HTML tags
      .replace(/^\s*>+\s?/, "")                   // blockquote markers
      .replace(/^\s*([-*+]|\d+[.)])\s+/, "");     // list markers
    if (text.includes("<!--")) { text = text.slice(0, text.indexOf("<!--")); inComment = true; }
    if (text.trim()) proseLines.push({ line: i + 1, text: text.trim() });
    else proseLines.push({ line: i + 1, text: "" }); // paragraph break
  }
  return { proseLines, headings };
}

function extractHtml(src) {
  let s = src
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<(script|style|pre|code)\b[\s\S]*?<\/\1>/gi, "");
  const headings = [];
  let lineOf = (idx) => s.slice(0, idx).split("\n").length;
  const hRe = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = hRe.exec(s)) !== null) {
    headings.push({ line: lineOf(m.index), depth: Number(m[1]), text: m[2].replace(/<[^>]+>/g, "").trim() });
  }
  s = s.replace(/<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi, "\n");
  // block-level closes become paragraph breaks; remaining tags become spaces
  s = s.replace(/<\/(p|div|li|td|th|tr|section|article|blockquote)>/gi, "\n\n").replace(/<[^>]+>/g, " ");
  s = s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const proseLines = s.split("\n").map((text, k) => ({ line: k + 1, text: text.trim() }));
  return { proseLines, headings };
}

// ---------- metrics ----------

function words(text) { return text.split(/\s+/).filter(Boolean); }

function stddev(nums) {
  if (nums.length < 2) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  return Math.sqrt(nums.reduce((a, n) => a + (n - mean) ** 2, 0) / nums.length);
}

// Split prose into sentences with line attribution. Paragraphs (blank-line
// separated) are sentence-boundary hard stops.
function sentencesOf(proseLines) {
  const out = [];
  let para = [];
  const flush = () => {
    if (!para.length) return;
    const startLine = para[0].line;
    const joined = para.map((p) => p.text).join(" ");
    for (const raw of joined.split(/(?<=[.!?])\s+/)) {
      const w = words(raw.replace(/[.!?]+$/, ""));
      if (w.length) out.push({ line: startLine, text: raw.trim(), words: w });
    }
    para = [];
  };
  for (const pl of proseLines) {
    if (pl.text) para.push(pl); else flush();
  }
  flush();
  return out;
}

function isParticiple(tok) {
  return IRREGULAR_PARTICIPLES.has(tok) || (tok.length >= 4 && tok.endsWith("ed"));
}

function isPassiveSentence(sentenceWords) {
  const toks = sentenceWords.map((w) => w.toLowerCase().replace(/[^a-z']/g, ""));
  for (let i = 0; i < toks.length; i++) {
    if (!BE_VERBS.has(toks[i])) continue;
    for (let j = i + 1; j <= Math.min(i + 3, toks.length - 1); j++) {
      const t = toks[j];
      if (t.endsWith("ly") || SKIPPABLE.has(t)) continue;
      if (isParticiple(t)) return true;
      break;
    }
  }
  return false;
}

// Minimum-stddev window of consecutive sentences totaling ≥ WINDOW_WORDS.
function worstWindow(sentences) {
  let best = null;
  for (let i = 0; i < sentences.length; i++) {
    let wsum = 0;
    const lens = [];
    for (let j = i; j < sentences.length; j++) {
      wsum += sentences[j].words.length;
      lens.push(sentences[j].words.length);
      if (wsum >= WINDOW_WORDS) {
        const sd = stddev(lens);
        if (!best || sd < best.stddev) {
          best = {
            words: wsum, sentence_count: lens.length, stddev: round(sd),
            first_sentence: { line: sentences[i].line, excerpt: sentences[i].text.slice(0, 120) },
            last_sentence: { line: sentences[j].line, excerpt: sentences[j].text.slice(0, 120) },
          };
        }
        break;
      }
    }
  }
  return best;
}

function round(n) { return Math.round(n * 10) / 10; }

// ---------- main ----------

function main() {
  const file = process.argv[2];
  if (!file) { process.stderr.write("usage: node metrics.js <file>\n"); process.exit(2); }
  let src;
  try { src = fs.readFileSync(file, "utf8"); }
  catch (e) { process.stderr.write(`metrics.js: cannot read ${file}: ${e.message}\n`); process.exit(2); }

  const format = /\.(html?|htm)$/i.test(file) ? "html" : "markdown";
  const { proseLines, headings } = format === "html" ? extractHtml(src) : extractMarkdown(src);
  const sentences = sentencesOf(proseLines);
  const lens = sentences.map((s) => s.words.length);
  const proseWords = lens.reduce((a, b) => a + b, 0);

  const passiveHits = sentences.filter((s) => isPassiveSentence(s.words));

  // Sections: prose words attributed to the nearest preceding heading.
  const sectionWords = headings.map(() => 0);
  for (const s of sentences) {
    let idx = -1;
    for (let k = 0; k < headings.length; k++) if (headings[k].line <= s.line) idx = k;
    if (idx >= 0) sectionWords[idx] += s.words.length;
  }
  const sections = headings.map((h, k) => ({ heading: h.text, depth: h.depth, words: sectionWords[k] }));

  const result = {
    file,
    format,
    words: { total: words(src).length, prose: proseWords },
    sentences: {
      count: sentences.length,
      avg_words: sentences.length ? round(proseWords / sentences.length) : 0,
      stddev: round(stddev(lens)),
      worst_window: worstWindow(sentences), // null when < 200 prose words
    },
    passive: {
      sentences: sentences.length,
      passive_sentences: passiveHits.length,
      pct: sentences.length ? round((passiveHits.length / sentences.length) * 100) : null,
      examples: passiveHits.slice(0, 5).map((s) => ({ line: s.line, excerpt: s.text.slice(0, 120) })),
    },
    headings: {
      count: headings.length,
      max_depth: headings.length ? Math.max(...headings.map((h) => h.depth)) : 0,
      deepest: headings.filter((h) => h.depth > 3).slice(0, 5).map((h) => ({ line: h.line, depth: h.depth, text: h.text })),
      avg_words_per_section: headings.length ? round(sectionWords.reduce((a, b) => a + b, 0) / headings.length) : null,
      shortest_sections: sections.slice().sort((a, b) => a.words - b.words).slice(0, 5),
    },
  };
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

main();
