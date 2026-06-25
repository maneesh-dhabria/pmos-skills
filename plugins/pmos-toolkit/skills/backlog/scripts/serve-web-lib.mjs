// serve-web-lib.mjs — pure derivation for the /backlog web viewer (story 260613-14b).
//
// Single home (D5/D7) for the read-only derivation the web server exposes: it parses
// backlog/items/*.md and derives the same epics/rollups/queues the terminal verbs specify
// (schema.md status machines; SKILL.md #next/#releases/#groom; readiness = planned + deps
// all done, D21). The viewer renders this model; it never re-derives backlog semantics.
//
// Node stdlib only. No mutation — nothing here opens a write handle to backlog/.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// Reuse the claim-lock path + staleness rule rather than reinventing the 4h TTL (D7).
const require = createRequire(import.meta.url);
let claimLock = null;
try {
  claimLock = require('./claim-lock.cjs');
} catch (_e) {
  claimLock = null; // tests / environments without the lock helper degrade to "no stale claims"
}

const PRIORITY_RANK = { must: 0, should: 1, could: 2, maybe: 3 };
const DONE_STATES = new Set(['done', 'released']);
const KNOWN_PLUGINS = ['pmos-toolkit', 'pmos-learnkit', 'pmos-utilities', 'pmos-gamekit'];
const DEFAULT_STALE_MS = 4 * 60 * 60 * 1000; // mirror claim-lock's 4h TTL

// --- minimal frontmatter + body reader -------------------------------------------------
// Items use inline arrays only (dependencies/labels: [a, b]) and flat key: value pairs —
// the same shape the backlog scripts already write. Skips malformed files (D7), never throws.

function parseScalar(raw) {
  let v = raw.trim();
  if (v === '') return '';
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1); // quoted — a literal "null" string survives, it is a real value
  }
  if (v === 'null' || v === '~') return ''; // bare YAML null literal → empty for every field (FR-5)
  return v;
}

function parseValue(raw) {
  const v = raw.trim();
  if (v.startsWith('[') && v.endsWith(']')) {
    return v
      .slice(1, -1)
      .split(',')
      .map((s) => parseScalar(s))
      .filter((s) => s !== '');
  }
  return parseScalar(v);
}

export function parseFrontmatter(text) {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  const block = text.slice(text.indexOf('\n') + 1, end);
  const fm = {};
  for (const line of block.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const m = line.match(/^([A-Za-z0-9_]+):\s?(.*)$/);
    if (!m) continue;
    fm[m[1]] = parseValue(m[2]);
  }
  const body = text.slice(end + 4);
  return { fm, body };
}

// Pull the "## Notes" section and surface a "blocked by …" line if present (free from
// existing data, D6 — no dependency graph is built).
function blockedByFromBody(body) {
  const notes = sectionBody(body, 'Notes');
  if (!notes) return null;
  for (const line of notes.split('\n')) {
    if (/blocked\s+by/i.test(line)) return line.replace(/^[-*\s]+/, '').trim();
  }
  return null;
}

function sectionBody(body, heading) {
  const re = new RegExp(`^##\\s+${heading}\\s*$`, 'im');
  const m = body.match(re);
  if (!m) return null;
  const start = m.index + m[0].length;
  const rest = body.slice(start);
  const next = rest.search(/^##\s+/m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function hasAcceptanceCriteria(body) {
  // Groomed = a non-empty `## Acceptance Criteria` section carrying >=1 enumerated
  // criterion in ANY form: checkbox (- [ ] / - [x]), plain/bold dash or star bullet,
  // or numbered (1. / 2) / 1)). Heading-only or prose-only sections do NOT count.
  // (Checkbox stays the recommended canonical form — see schema.md.)
  const ac = sectionBody(body, 'Acceptance Criteria');
  return !!ac && /^\s*(?:[-*]\s+|\d+[.)]\s+)/m.test(ac);
}

// --- parseItems ------------------------------------------------------------------------

export function parseItems(itemsDir) {
  let files = [];
  try {
    files = fs.readdirSync(itemsDir).filter((f) => f.endsWith('.md') && f !== '.gitkeep');
  } catch (_e) {
    return { items: [], skipped: [] };
  }
  const items = [];
  const skipped = [];
  for (const f of files.sort()) {
    let raw;
    try {
      raw = fs.readFileSync(path.join(itemsDir, f), 'utf8');
    } catch (_e) {
      skipped.push({ file: f, reason: 'unreadable' });
      continue;
    }
    const parsed = parseFrontmatter(raw);
    if (!parsed || !parsed.fm.id) {
      skipped.push({ file: f, reason: 'no-frontmatter-or-id' });
      continue;
    }
    const fm = parsed.fm;
    items.push({
      id: fm.id,
      kind: fm.kind || 'story',
      title: fm.title || '',
      status: fm.status || '',
      route: fm.route || '',
      type: fm.type || '',
      priority: fm.priority || '',
      score: fm.score === '' || fm.score == null ? null : Number(fm.score),
      parent: fm.parent || '',
      dependencies: Array.isArray(fm.dependencies) ? fm.dependencies : [],
      labels: Array.isArray(fm.labels) ? fm.labels : [],
      claimed_by: fm.claimed_by || '',
      released: fm.released || '',
      updated: fm.updated || '',
      created: fm.created || '',
      blocked_by: blockedByFromBody(parsed.body),
      has_ac: hasAcceptanceCriteria(parsed.body),
    });
  }
  return { items, skipped };
}

// --- derivation helpers ----------------------------------------------------------------

function derivePlugin(labels) {
  for (const l of labels) if (KNOWN_PLUGINS.includes(l)) return l;
  return '';
}

function claimState(claimsDir, id, now) {
  if (!claimsDir || !claimLock) return { has_lock: false, stale: false, holder: null };
  const holder = readLock(claimsDir, id);
  if (!holder) return { has_lock: false, stale: false, holder: null };
  const stale = holder.at ? now - Date.parse(holder.at) > DEFAULT_STALE_MS : false;
  return { has_lock: true, stale, holder: holder.holder || null };
}

function readLock(claimsDir, id) {
  try {
    return JSON.parse(fs.readFileSync(claimLock.lockPathFor(claimsDir, id), 'utf8'));
  } catch (_e) {
    return null;
  }
}

function epicRollup(epic, stories) {
  if (epic.status === 'released') return 'released';
  if (epic.status === 'inbox') return 'inbox';
  if (epic.status === 'defining') return 'defining';
  const active = stories.filter((s) => s.status !== 'wontfix');
  if (active.length > 0 && active.every((s) => DONE_STATES.has(s.status))) return 'all-stories-done';
  return 'in-flight';
}

function epicProgress(stories) {
  const active = stories.filter((s) => s.status !== 'wontfix');
  return {
    done: active.filter((s) => DONE_STATES.has(s.status)).length,
    total: active.length,
    blocked: active.filter((s) => s.status === 'blocked').length,
  };
}

// --- buildModel ------------------------------------------------------------------------

export function buildModel(items, opts = {}) {
  const now = opts.now || Date.now();
  const claimsDir = opts.claimsDir || null;
  const generatedAt = opts.generated_at || new Date(now).toISOString();

  const epics = items.filter((i) => i.kind === 'epic');
  const stories = items.filter((i) => i.kind !== 'epic');
  const statusById = new Map(stories.map((s) => [s.id, s.status]));

  const childrenOf = new Map();
  for (const s of stories) {
    if (!childrenOf.has(s.parent)) childrenOf.set(s.parent, []);
    childrenOf.get(s.parent).push(s);
  }

  // claim facts per story (read once)
  const claimByStory = new Map();
  for (const s of stories) claimByStory.set(s.id, claimState(claimsDir, s.id, now));

  const depsSatisfied = (s) =>
    s.dependencies.every((d) => DONE_STATES.has(statusById.get(d)));
  const hasWontfixDep = (s) => s.dependencies.some((d) => statusById.get(d) === 'wontfix');

  const epicModels = epics
    .map((e) => {
      const kids = (childrenOf.get(e.id) || []).slice();
      const inFlight = kids.some((s) => ['in-progress', 'done', 'released'].includes(s.status));
      const storyModels = kids.map((s) => {
        const c = claimByStory.get(s.id);
        return {
          id: s.id,
          title: s.title,
          status: s.status,
          route: s.route,
          type: s.type,
          priority: s.priority,
          score: s.score,
          claimed_by: s.claimed_by || (c.has_lock ? c.holder : ''),
          claim_stale: c.has_lock && c.stale,
          dependencies: s.dependencies,
          blocked_by: s.blocked_by,
        };
      });
      return {
        id: e.id,
        title: e.title,
        status: e.status,
        route: e.route,
        plugin: derivePlugin(e.labels),
        type: e.type,
        priority: e.priority,
        progress: epicProgress(kids),
        rollup: epicRollup(e, kids),
        in_flight: inFlight,
        stories: storyModels,
        _kids: kids,
      };
    })
    .sort((a, b) => (a.created < b.created ? 1 : -1)); // newest epics first (INDEX convention)

  // --- queues -------------------------------------------------------------------------
  const groom = {
    needs_definition: epics
      .filter((e) => e.status === 'inbox' || e.status === 'defining')
      .map((e) => e.id),
    needs_grooming: stories
      .filter((s) => s.status === 'draft' || ((s.status === 'ready' || s.status === 'planned') && !s.has_ac))
      .map((s) => s.id),
    blocked: stories.filter((s) => s.status === 'blocked').map((s) => s.id),
    stale_claims: stories.filter((s) => claimByStory.get(s.id).has_lock && claimByStory.get(s.id).stale).map((s) => s.id),
  };

  // next — the #next picker (D22): planned, deps all done/released, unclaimed (no fresh lock),
  // no wontfix dep; in-flight-epic-first → priority → score desc → updated desc.
  const inFlightEpicIds = new Set(epicModels.filter((e) => e.in_flight).map((e) => e.id));
  const candidates = stories.filter((s) => {
    if (s.status !== 'planned') return false;
    if (!depsSatisfied(s)) return false;
    if (hasWontfixDep(s)) return false;
    const c = claimByStory.get(s.id);
    if (c.has_lock && !c.stale) return false; // a live, fresh claim excludes it
    return true;
  });
  candidates.sort((a, b) => {
    const af = inFlightEpicIds.has(a.parent) ? 0 : 1;
    const bf = inFlightEpicIds.has(b.parent) ? 0 : 1;
    if (af !== bf) return af - bf;
    const ap = PRIORITY_RANK[a.priority] ?? 9;
    const bp = PRIORITY_RANK[b.priority] ?? 9;
    if (ap !== bp) return ap - bp;
    const as = a.score == null ? -1 : a.score;
    const bs = b.score == null ? -1 : b.score;
    if (as !== bs) return bs - as;
    return a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0;
  });
  const next = { pick: candidates.length ? candidates[0].id : null };

  // releases — per-epic rollup (D23). released excluded; blocked-story epic → blocked;
  // all non-wontfix done → release_ready; some open → in_flight.
  const releases = { release_ready: [], in_flight: [], blocked: [] };
  for (const e of epicModels) {
    if (e.status === 'released' || e.status === 'inbox' || e.status === 'defining') continue;
    if (e.progress.done === 0) continue; // FR-6: not-started epics (0 stories done) aren't on the release shelf
    if (e.progress.blocked > 0) releases.blocked.push(e.id);
    else if (e.progress.total > 0 && e.progress.done === e.progress.total) releases.release_ready.push(e.id);
    else releases.in_flight.push(e.id);
  }

  // --- facets -------------------------------------------------------------------------
  const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort();
  // FR-4: split status into lifecycle-ordered Epic / Story groups, present states only.
  const EPIC_LIFECYCLE = ['inbox', 'defining', 'defined', 'released'];
  const STORY_LIFECYCLE = ['draft', 'planned', 'ready', 'in-progress', 'blocked', 'done', 'released', 'wontfix'];
  const orderedPresent = (order, present) => order.filter((s) => present.has(s));
  const epicStatusSet = new Set(epics.map((e) => e.status).filter(Boolean));
  const storyStatusSet = new Set(stories.map((s) => s.status).filter(Boolean));
  const facets = {
    statuses: uniq(items.map((i) => i.status)),
    epic_statuses: orderedPresent(EPIC_LIFECYCLE, epicStatusSet),
    story_statuses: orderedPresent(STORY_LIFECYCLE, storyStatusSet),
    routes: uniq(items.map((i) => i.route)),
    plugins: uniq(epicModels.map((e) => e.plugin)),
    types: uniq(items.map((i) => i.type)),
  };

  // strip internal fields
  for (const e of epicModels) delete e._kids;

  return {
    generated_at: generatedAt,
    repo: opts.repo || '',
    epics: epicModels,
    queues: { groom, next, releases },
    facets,
  };
}

export default { parseItems, buildModel, parseFrontmatter };
