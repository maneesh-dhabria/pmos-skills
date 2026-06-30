#!/usr/bin/env node
// upload-image.mjs — the image ladder (../reference/notion-blocks.md §5).
//
// Zero-dependency. The MCP content API cannot upload a local image, so image handling is the remembered
// preference `to_notion_doc.image_mode`:
//   • mcp-only (default)  — no REST, no token. Two rungs: an external HTTPS URL already in the source passes
//                           through as an external image; any local/relative image falls to the local-extract
//                           STUB (copy to ./to-notion-doc-assets/<slug>/, emit a callout naming the path + an
//                           empty image placeholder). Verification counts stubs as accounted-for.
//   • rest-upload (opt-in) — uses the Notion File Upload API, which is raw REST and REQUIRES a Notion
//                           integration token (read from the env var named by `notion_token_env`, default
//                           NOTION_TOKEN). The token value is NEVER returned, logged, or persisted. If the
//                           mode is rest-upload but no token is in the env, fall back to the stub (+warn) —
//                           the skill never blocks on a missing credential.
//
// Selftest mocks the HTTP layer (no live Notion calls). Usage: node upload-image.mjs --selftest
'use strict';
import path from 'node:path';

// ---- guardrails (reference/notion-blocks.md §5) ------------------------------------------------------------
const SOFT_LIMIT = 5 * 1024 * 1024; // 5 MiB free-plan workspace cap → warn past this
const HARD_LIMIT = 20 * 1024 * 1024; // 20 MB single-part File Upload API ceiling → error past this
const MIME_BY_EXT = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.heic': 'image/heic', '.tif': 'image/tiff',
  '.tiff': 'image/tiff', '.ico': 'image/x-icon', '.bmp': 'image/bmp',
};

export function mimeForPath(p) {
  return MIME_BY_EXT[path.extname(p || '').toLowerCase()] || 'application/octet-stream';
}

const isExternalHttps = (src) => /^https:\/\//i.test(src || '');
export const slugize = (s) => (s || 'doc').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'doc';

// Canonical single stub callout NFM (reference/notion-blocks.md §5). `lines` are body lines; each is rendered
// on its own TAB-indented line — NEVER an inline <br> right after the opening tag (Notion's NFM parser rejects
// it, falling back to escaped literal text — §1). This is the ONE home for the stub-callout shape:
// map-to-notion.mjs imports it so the in-document callout and buildStub() agree byte-for-byte (no dual-write).
const TAB = '\t';
export function stubCalloutNfm(icon, lines) {
  const body = (lines || []).filter((l) => l != null && l !== '').map((l) => `${TAB}${l}`).join('\n');
  return `<callout icon="${icon}">\n${body}\n</callout>`;
}

// The deterministic local-asset relative path the stub names and the copy op targets.
export function assetRelPath(slug, src) {
  return `./to-notion-doc-assets/${slugize(slug)}/${path.basename(src || 'image')}`;
}

// Decide which rung an image takes given the resolved mode + token presence. Pure; no I/O.
export function resolveRung(image, opts = {}) {
  const mode = opts.image_mode === 'rest-upload' ? 'rest-upload' : 'mcp-only';
  const warnings = [];
  if (isExternalHttps(image.src)) return { rung: 'external', reason: 'external https URL in source', warnings };
  if (mode === 'rest-upload') {
    if (opts.hasToken) return { rung: 'upload', reason: 'rest-upload mode + token present', warnings };
    warnings.push('image_mode=rest-upload but no token in env; falling back to local-extract stub');
    return { rung: 'stub', reason: 'rest-upload requested, token absent', warnings };
  }
  return { rung: 'stub', reason: 'mcp-only mode, local image', warnings };
}

// Rung 1: external HTTPS passthrough → NFM external image.
export function buildExternal(image) {
  return { kind: 'external', src: image.src, alt: image.alt || '', nfm: `![${(image.alt || '').replace(/[\]]/g, '\\$&')}](${image.src})` };
}

// Rung 2 (always-available): local-extract stub — a SINGLE caption-inline callout naming the file, the caption
// (alt → filename fallback, D2/FR-3.1), the copied relative path, and a drag-to-fill hint. No separate image
// placeholder block (the dual-write F2 fix). Returns the copy op for the skill to perform.
export function buildStub(image, opts = {}) {
  const base = path.basename(image.src || 'image');
  const rel = assetRelPath(opts.slug, image.src);
  const caption = image.alt || base;
  const lines = [`🖼 ${base} · Caption: ${caption}`, rel, 'Drag this file into an image block to fill.'];
  const callout = { type: 'callout', icon: '🖼', color: 'gray_background', rich: [{ content: lines.join(' — ') }] };
  const nfm = stubCalloutNfm('🖼', lines);
  return { kind: 'stub', assetRelPath: rel, caption, copy: { from: image.src, to: rel }, blocks: [callout], nfm };
}

// Rung 3 (opt-in): a description of the File Upload API request shape. The token is NOT part of this object;
// it is read from the env only inside uploadImage() when the request headers are built.
export function buildUploadPlan(image, opts = {}) {
  const filename = path.basename(image.src || 'image');
  const mime = mimeForPath(image.src);
  const warnings = [];
  const size = typeof image.size === 'number' ? image.size : null;
  if (size != null && size > HARD_LIMIT) throw new Error(`image ${filename} is ${size} bytes > 20MB single-part File Upload API ceiling`);
  if (size != null && size > SOFT_LIMIT) warnings.push(`image ${filename} is ${(size / 1048576).toFixed(1)}MiB > 5MiB free-plan cap; upload may be rejected on a free workspace`);
  return {
    kind: 'upload', filename, mime, token_env: opts.notion_token_env || 'NOTION_TOKEN', warnings,
    steps: [
      { step: 'create', method: 'POST', url: 'https://api.notion.com/v1/file_uploads' },
      { step: 'send', method: 'POST', url: 'https://api.notion.com/v1/file_uploads/{id}/send', body: 'multipart/form-data; field=file' },
      { step: 'attach', as: { type: 'file_upload', id: '{id}' } },
    ],
  };
}

// Execute the 3-step upload using an injected http function (mocked in selftest; real fetch at runtime).
// Reads the token from the env var named by notion_token_env. Returns ONLY { type:'file_upload', id } — the
// token never appears in the return value, and we never console.log it.
export async function uploadImage(image, opts = {}, http) {
  const envName = opts.notion_token_env || 'NOTION_TOKEN';
  const token = (opts.env || process.env)[envName];
  if (!token) throw new Error(`no token in env var ${envName}`);
  const plan = buildUploadPlan(image, opts);
  const authHeaders = () => ({ Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28' });
  const created = await http({ method: 'POST', url: plan.steps[0].url, headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: { filename: plan.filename, content_type: plan.mime } });
  const id = created.id;
  await http({ method: 'POST', url: `https://api.notion.com/v1/file_uploads/${id}/send`, headers: authHeaders(), form: { file: { bytes: image.bytes, filename: plan.filename, contentType: plan.mime } } });
  return { attach: { type: 'file_upload', id }, warnings: plan.warnings };
}

// ---------------------------------------------------------------------------
// Selftest
// ---------------------------------------------------------------------------

async function selftest() {
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };

  // Ladder branches.
  const ext = resolveRung({ src: 'https://cdn.example.com/a.png' }, { image_mode: 'mcp-only' });
  ok(ext.rung === 'external', 'external https → external rung (even in mcp-only)');
  const extUpload = resolveRung({ src: 'https://cdn.example.com/a.png' }, { image_mode: 'rest-upload', hasToken: true });
  ok(extUpload.rung === 'external', 'external https wins over upload regardless of mode');
  ok(resolveRung({ src: './pics/local.png' }, { image_mode: 'mcp-only' }).rung === 'stub', 'mcp-only local → stub');
  const upR = resolveRung({ src: './pics/local.png' }, { image_mode: 'rest-upload', hasToken: true });
  ok(upR.rung === 'upload', 'rest-upload + token → upload');
  const noTok = resolveRung({ src: './pics/local.png' }, { image_mode: 'rest-upload', hasToken: false });
  ok(noTok.rung === 'stub' && /falling back/.test(noTok.warnings[0]), 'rest-upload without token → stub + warn');

  // External builder.
  const eb = buildExternal({ src: 'https://x/y.png', alt: 'Y' });
  ok(eb.kind === 'external' && /!\[Y\]\(https:\/\/x\/y\.png\)/.test(eb.nfm), 'external NFM image');

  // Stub builder: a SINGLE caption-inline callout — names the copied path, embeds the caption + filename,
  // one block only (no placeholder pair), tab-indented body, no inline <br>.
  const sb = buildStub({ src: '/abs/path/diagram.png', alt: 'Arch' }, { slug: 'POV v6!' });
  ok(sb.assetRelPath === './to-notion-doc-assets/pov-v6/diagram.png', `stub rel path under slug (got ${sb.assetRelPath})`);
  ok(sb.copy.from === '/abs/path/diagram.png' && sb.copy.to === sb.assetRelPath, 'stub copy op from→to');
  ok(sb.blocks.length === 1 && sb.blocks[0].type === 'callout', 'stub is a single callout (no placeholder pair)');
  ok(sb.nfm.includes(sb.assetRelPath) && /Caption: Arch/.test(sb.nfm) && /diagram\.png/.test(sb.nfm), 'stub callout names path + caption + filename');
  ok(/<callout icon="🖼">\n\t/.test(sb.nfm) && !/<br>/.test(sb.nfm), 'stub callout tab-indented, no inline <br>');
  // caption falls back to filename when alt is absent (D2/FR-3.1)
  ok(/Caption: photo\.png/.test(buildStub({ src: './x/photo.png' }, { slug: 'doc' }).nfm), 'caption falls back alt → filename');

  // MIME mapping.
  ok(mimeForPath('a.PNG') === 'image/png' && mimeForPath('b.svg') === 'image/svg+xml', 'mime by extension');

  // Upload plan shape + size guardrails; token never embedded.
  const plan = buildUploadPlan({ src: './big.png', size: 6 * 1024 * 1024 }, { notion_token_env: 'NOTION_TOKEN' });
  ok(plan.kind === 'upload' && plan.steps.length === 3 && plan.steps[0].step === 'create', '3-step upload plan');
  ok(plan.warnings.length === 1 && /5MiB/.test(plan.warnings[0]), 'warns past 5MiB soft cap');
  let threw = false; try { buildUploadPlan({ src: './huge.png', size: 25 * 1024 * 1024 }); } catch { threw = true; }
  ok(threw, 'errors past 20MB hard ceiling');
  ok(!JSON.stringify(plan).includes('secret'), 'plan carries no token value');

  // uploadImage: mocked HTTP, token read from injected env, sent in header, never in return value.
  const SECRET = 'secret-tok-abc123';
  const calls = [];
  const mockHttp = async (req) => { calls.push(req); return req.url.endsWith('/file_uploads') ? { id: 'fu_123' } : { ok: true }; };
  const res = await uploadImage({ src: './local.png', bytes: Buffer.from('x') }, { env: { NOTION_TOKEN: SECRET } }, mockHttp);
  ok(res.attach.type === 'file_upload' && res.attach.id === 'fu_123', 'uploadImage returns file_upload attach ref');
  ok(calls[0].headers.Authorization === `Bearer ${SECRET}`, 'token sent as Bearer header');
  ok(!JSON.stringify(res).includes(SECRET), 'token value never in return object');
  let noTokThrew = false; try { await uploadImage({ src: './x.png' }, { env: {} }, mockHttp); } catch { noTokThrew = true; }
  ok(noTokThrew, 'uploadImage throws when env token absent (skill catches → stub)');

  console.log(`upload-image selftest: ${pass} passed, ${fail} failed`);
  return fail === 0;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) { selftest().then((okk) => process.exit(okk ? 0 : 1)); }
  else { console.error('usage: upload-image.mjs --selftest  (library module; the skill imports resolveRung/buildExternal/buildStub/buildUploadPlan/uploadImage)'); process.exit(64); }
}
