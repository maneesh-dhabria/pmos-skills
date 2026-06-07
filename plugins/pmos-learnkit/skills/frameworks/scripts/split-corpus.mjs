#!/usr/bin/env node
// split-corpus.mjs — deterministic Stage-A: one Notion category markdown page →
// an array of LEAN per-framework records (cached match-fields are added later by
// derive-fields.mjs). Zero-dep Node ESM.
//
// Usage:
//   node split-corpus.mjs <category.md> --category "Decision Making" \
//        --category-code 2.4.4 --source-url <url> [--date YYYY-MM-DD]
//   node split-corpus.mjs --selftest
//
// The page shape (see reference/ingestion.md → Notion structure):
//   - everything before the first `### ` is page preamble (title, count line,
//     category-intro callout) and is discarded;
//   - each framework is a `### <Name>` block carrying `- Reference - [Type](url)`,
//     optional `- Author - <name>`, a `- Overview` body, and an optional trailing
//     `<callout icon="💡">…</callout>` (the commentary / PM's take).
//   - S3 image lines (`…amazonaws.com…`) expire in ~1h and are dropped from body_md.

import { readFileSync } from 'node:fs';
import { argv } from 'node:process';
import { fileURLToPath } from 'node:url';

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Strip inline-markdown emphasis from a heading so the framework `name` is plain
// text (Notion headings sometimes carry `**bold**` / `*italic*` / `` `code` ``).
export function cleanName(s) {
  return String(s)
    .replace(/\*\*/g, '')
    .replace(/[*`_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function superCategory(code) {
  if (!code) return null;
  const m = /^2\.(\d)/.exec(String(code));
  if (!m) return null;
  return {
    '1': 'Strategy & Business',
    '2': 'Product',
    '3': 'Analytics, Design & Finance',
    '4': 'People, Personal & Career',
  }[m[1]] || null;
}

function parseLinks(line) {
  const out = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(line)) !== null) out.push({ type: m[1].trim(), url: m[2].trim() });
  return out;
}

function cleanCallout(inner) {
  return inner
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Remove one leading tab from each line (the Overview nesting level) so the body
// renders as a top-level markdown list rather than an indented code block.
function dedent(text) {
  return text.split('\n').map((l) => l.replace(/^\t/, '')).join('\n');
}

function parseFramework(name, bodyLines, opts) {
  const references = [];
  let author = null;
  let overviewIdx = -1;

  for (let i = 0; i < bodyLines.length; i++) {
    const t = bodyLines[i].trim();
    if (overviewIdx === -1 && /^-\s*Reference\s*-\s*/i.test(t)) {
      parseLinks(t).forEach((l) => references.push(l));
      continue;
    }
    if (overviewIdx === -1 && /^-\s*Author\s*-\s*/i.test(t)) {
      author = t.replace(/^-\s*Author\s*-\s*/i, '').trim() || null;
      continue;
    }
    if (overviewIdx === -1 && /^-\s*Overview\b/i.test(t)) {
      overviewIdx = i;
    }
  }

  // commentary = inner text of the LAST <callout> in the block (the trailing take).
  let commentary = null;
  const calloutRe = /<callout[^>]*>([\s\S]*?)<\/callout>/g;
  const joined = bodyLines.join('\n');
  let cm, lastCallout = null;
  while ((cm = calloutRe.exec(joined)) !== null) lastCallout = cm[1];
  if (lastCallout != null) {
    const c = cleanCallout(lastCallout);
    commentary = c || null;
  }

  // body start: after the Overview marker, else after the leading metadata lines.
  let bodyStart;
  if (overviewIdx >= 0) {
    bodyStart = overviewIdx + 1;
  } else {
    bodyStart = 0;
    while (
      bodyStart < bodyLines.length &&
      (bodyLines[bodyStart].trim() === '' ||
        /^-\s*(Reference|Author)\s*-\s*/i.test(bodyLines[bodyStart].trim()))
    ) {
      bodyStart++;
    }
  }

  let body = bodyLines.slice(bodyStart).join('\n');
  body = body.replace(/<callout[^>]*>[\s\S]*?<\/callout>/g, ''); // drop commentary callouts
  body = dedent(body);
  body = body
    .split('\n')
    .filter((l) => !l.includes('<empty-block/>'))
    .filter((l) => !l.includes('amazonaws.com')) // drop expiring S3 image lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const id = `${slugify(opts.category)}/${slugify(name)}`;
  return {
    id,
    name,
    category: opts.category,
    category_code: opts.categoryCode || null,
    super_category: superCategory(opts.categoryCode),
    body_md: body,
    references,
    author,
    commentary,
    diagram: null,
    source_url: opts.sourceUrl ? `${opts.sourceUrl}#${slugify(name)}` : null,
    last_synced: opts.date || null,
  };
}

export function parseCategory(md, opts = {}) {
  const lines = md.split(/\r?\n/);
  const blocks = [];
  let cur = null;
  for (const line of lines) {
    const m = /^###\s+(.+?)\s*$/.exec(line);
    if (m) {
      if (cur) blocks.push(cur);
      cur = { name: cleanName(m[1]), body: [] };
    } else if (cur) {
      cur.body.push(line);
    }
    // lines before the first `### ` are page preamble — ignored.
  }
  if (cur) blocks.push(cur);
  return blocks.map((b) => parseFramework(b.name, b.body, opts));
}

// ---- selftest -------------------------------------------------------------
const SELFTEST_MD = `## Sample Frameworks
***2 Frameworks** - Alpha Model, Beta Loop*
<callout icon="💡" color="gray_bg">
	Category intro callout — must NOT become a framework commentary.
</callout>
### Alpha Model
- Reference - [Article](https://example.com/a), [Video](https://example.com/v)
- Author - Ada Lovelace
- Overview -
	- Alpha is a way to frame a thing.
		- **Sub point**: detail.
	![alt [nested](https://x.com/y)](https://prod-files-secure.s3.us-west-2.amazonaws.com/k/Untitled.png?X-Amz-Signature=z)
	- Closing prose for alpha.
<callout icon="💡" color="gray_bg">
	Alpha take: use it early.
</callout>
### **Beta Loop**
- Reference - [Wikipedia](https://en.wikipedia.org/wiki/Beta)
- Overview
	- Beta loops back on itself.
`;

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
    throw new Error(msg);
  }
}

function runSelftest() {
  try {
    const recs = parseCategory(SELFTEST_MD, {
      category: 'Decision Making',
      categoryCode: '2.4.4',
      sourceUrl: 'https://notion.so/page',
      date: '2026-06-07',
    });
    assert(recs.length === 2, `expected 2 frameworks, got ${recs.length}`);

    const a = recs[0];
    assert(a.id === 'decision-making/alpha-model', `bad id: ${a.id}`);
    assert(a.name === 'Alpha Model', `bad name: ${a.name}`);
    assert(a.category === 'Decision Making', 'category');
    assert(a.category_code === '2.4.4', 'code');
    assert(a.super_category === 'People, Personal & Career', `supercat: ${a.super_category}`);
    assert(a.author === 'Ada Lovelace', `author: ${a.author}`);
    assert(a.references.length === 2, `refs: ${a.references.length}`);
    assert(a.references[0].type === 'Article' && a.references[0].url === 'https://example.com/a', 'ref0');
    assert(a.commentary === 'Alpha take: use it early.', `commentary: ${a.commentary}`);
    assert(!a.body_md.includes('amazonaws.com'), 'S3 image line not stripped from body');
    assert(!a.body_md.includes('Alpha take'), 'commentary leaked into body');
    assert(!a.body_md.includes('Category intro'), 'category intro leaked into a framework');
    assert(a.body_md.includes('Alpha is a way to frame a thing.'), 'body missing overview prose');
    assert(a.body_md.includes('Closing prose for alpha.'), 'body missing closing prose');
    assert(/^- /.test(a.body_md), `body not dedented to top level: ${JSON.stringify(a.body_md.slice(0, 20))}`);
    assert(a.source_url === 'https://notion.so/page#alpha-model', `source_url: ${a.source_url}`);

    const b = recs[1];
    assert(b.name === 'Beta Loop', `bold markers not stripped from name: ${b.name}`);
    assert(b.id === 'decision-making/beta-loop', `bad beta id: ${b.id}`);
    assert(b.author === null, `beta author should be null, got ${b.author}`);
    assert(b.commentary === null, `beta commentary should be null, got ${b.commentary}`);
    assert(b.references.length === 1, `beta refs: ${b.references.length}`);
    assert(b.body_md === '- Beta loops back on itself.', `beta body: ${JSON.stringify(b.body_md)}`);

    console.log('split-corpus --selftest: PASS (2 frameworks, all fields)');
  } catch (e) {
    console.error('split-corpus --selftest: FAIL');
    process.exitCode = 1;
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) return runSelftest();

  const positional = args.filter((a) => !a.startsWith('--'));
  const flag = (name) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
  };
  const file = positional[0];
  if (!file) {
    console.error('usage: split-corpus.mjs <category.md> --category <name> --category-code <2.x.y> [--source-url <url>] [--date YYYY-MM-DD]');
    process.exit(64);
  }
  const md = readFileSync(file, 'utf8');
  let category = flag('category');
  if (!category) {
    const h2 = /^##\s+(.+?)\s*$/m.exec(md);
    category = h2 ? h2[1].replace(/\s*Frameworks?\s*$/i, '').trim() : 'Uncategorized';
  }
  const records = parseCategory(md, {
    category,
    categoryCode: flag('category-code'),
    sourceUrl: flag('source-url'),
    date: flag('date'),
  });
  process.stdout.write(JSON.stringify(records, null, 2) + '\n');
}

// Run the CLI only when executed directly, not when imported by a test.
if (argv[1] && fileURLToPath(import.meta.url) === argv[1]) {
  main();
}
