// render.js — pmos html-authoring substrate renderer (T1 tracer).
// Reads CSS+JS substrate assets and inlines them into template.html, plus a
// sentinel-bracketed initial-comments JSON block. JSON-escape per FR-04
// defeats embedded "</script>" tokens by escaping every "<" as "<".
//
// Exports:
//   renderArtifact(opts) → string  (FR-01/02/03/05/07)
//   jsonInlineEscape(payload) → string
//
// T1 scope: fresh emit only. Re-emit (preserving existing threads) is T4.
'use strict';

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, 'assets');

const DEFAULTS = {
  pluginName: 'pmos-toolkit',
  pluginNameNbsp: 'pmos&#8209;toolkit',
  pluginUrl: 'https://github.com/maneesh-dhabria/pmos-toolkit#readme',
};

function readAsset(name) {
  return fs.readFileSync(path.join(ASSETS_DIR, name), 'utf8');
}

function jsonInlineEscape(payload) {
  return JSON.stringify(payload).replace(/</g, '\\u003c');
}

function buildInlineCss() {
  const style = readAsset('style.css');
  const comments = readAsset('comments.css');
  return '<style>\n' + style + '\n/* --- comments.css --- */\n' + comments + '\n</style>';
}

function buildInlineJs() {
  const viewer = readAsset('viewer.js');
  const comments = readAsset('comments.js');
  return '<script>\n' + viewer + '\n/* --- comments.js --- */\n' + comments + '\n</script>';
}

function extractExistingPayload(html) {
  if (typeof html !== 'string') return null;
  const re = /<script id="pmos-comments" type="application\/json">([\s\S]*?)<\/script>/;
  const m = html.match(re);
  if (!m) return null;
  try {
    return JSON.parse(m[1].trim().replace(/\\u003c/g, '<'));
  } catch (_e) {
    return null;
  }
}

function buildInlineCommentsJson(prior) {
  const priorVersion = (prior && typeof prior.version === 'number') ? prior.version : null;
  const priorThreads = (prior && Array.isArray(prior.threads)) ? prior.threads : null;
  const payload = {
    schema: 1,
    version: priorVersion === null ? 0 : priorVersion + 1,
    generated_at: new Date().toISOString(),
    threads: priorThreads === null ? [] : priorThreads,
  };
  return (
    '<!-- pmos-comments:start -->\n' +
    '<script id="pmos-comments" type="application/json">\n' +
    jsonInlineEscape(payload) + '\n' +
    '</script>\n' +
    '<!-- pmos-comments:end -->'
  );
}

function renderArtifact(opts) {
  if (!opts || typeof opts.template !== 'string') {
    throw new Error('renderArtifact: opts.template (string) is required');
  }
  const {
    template,
    title = '',
    content = '',
    sourcePath = '',
    assetPrefix = '',
    pluginVersion = '',
    pmosSkill = '',
    pluginName = DEFAULTS.pluginName,
    pluginNameNbsp = DEFAULTS.pluginNameNbsp,
    pluginUrl = DEFAULTS.pluginUrl,
  } = opts;

  const inlineCss = buildInlineCss();
  const inlineJs = buildInlineJs();
  const prior = (opts.existingHtml != null) ? extractExistingPayload(opts.existingHtml) : null;
  const inlineCommentsJson = buildInlineCommentsJson(prior);

  const subs = {
    '{{inline_css}}': inlineCss,
    '{{inline_js}}': inlineJs,
    '{{inline_comments_json}}': inlineCommentsJson,
    '{{title}}': title,
    '{{content}}': content,
    '{{source_path}}': sourcePath,
    '{{asset_prefix}}': assetPrefix,
    '{{plugin_version}}': pluginVersion,
    '{{pmos_skill}}': pmosSkill,
    '{{plugin_name}}': pluginName,
    '{{plugin_name_nbsp}}': pluginNameNbsp,
    '{{plugin_url}}': pluginUrl,
  };

  let out = template;
  for (const [token, value] of Object.entries(subs)) {
    out = out.replaceAll(token, value);
  }
  return out;
}

module.exports = { renderArtifact, jsonInlineEscape };
