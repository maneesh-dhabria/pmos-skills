#!/usr/bin/env node
// corpus-vocab.mjs — the closed corpus vocabulary + validators for the case-studies corpus.
// Zero-dep Node ESM. This is the load-bearing substrate validate-corpus.mjs depends on:
// the four closed registries (pillar / topics / region / artifact_type), the language set,
// and the per-field membership validators. Substrate-neutral — no skill name is referenced
// here, so the module can be reused by any consumer of data/case-studies.json.
//
// Usage:
//   node corpus-vocab.mjs --selftest
//
// Consumed by validate-corpus.mjs (the corpus gate) and import-corpus.mjs — keep it dependency-free.

import { argv } from 'node:process';

// ---- closed registries ----------------------------------------------------

// PILLARS (4) — the top-level topical partition; == the source case-studies/<pillar>/ dirs.
export const PILLARS = ['core-pm-craft', 'design-ux', 'platform', 'business-model'];

// REGIONS (9) — closed geographic set.
export const REGIONS = [
  'north-america', 'europe', 'india', 'southeast-asia', 'anz',
  'latin-america', 'japan-korea', 'china', 'mea',
];

// ARTIFACT_TYPES (5) — the shape of the source artifact.
export const ARTIFACT_TYPES = ['blog_post', 'filing', 'paper', 'talk_writeup', 'handbook'];

// LANGUAGES — ISO 639-1 codes observed in the corpus (the summary is always English).
export const LANGUAGES = ['en', 'ja', 'ko', 'pt', 'vi', 'zh'];

// TOPICS (98) — the closed tag registry, imported verbatim from the source repo's
// harvest/topics_vocabulary.json at authoring time. Inlined so nothing is read at runtime.
export const TOPICS = [
  'experimentation', 'ab-testing', 'experimentation-platform', 'causal-inference', 'metric-design',
  'statistics', 'guardrail-metrics', 'feature-flags', 'product-analytics', 'product-discovery',
  'user-research', 'usability-testing', 'onboarding', 'activation', 'retention', 'churn-reduction',
  'growth-loops', 'referrals', 'personalization', 'recommendations', 'search-ranking', 'notifications',
  'conversion-optimization', 'funnel-optimization', 'engagement', 'design-systems', 'design-tokens',
  'component-libraries', 'accessibility', 'inclusive-design', 'design-ops', 'ux-research',
  'content-design', 'information-architecture', 'design-engineering-collaboration', 'redesign',
  'data-visualization', 'localization', 'mobile-ux', 'ui-performance', 'internal-developer-platform',
  'developer-experience', 'developer-productivity', 'internal-tooling', 'api-design', 'sdk-design',
  'observability', 'incident-management', 'reliability', 'ci-cd', 'microservices', 'migration',
  'self-serve-platform', 'platform-adoption', 'workflow-automation', 'knowledge-management',
  'data-platform', 'data-governance', 'data-quality', 'data-infrastructure', 'metrics-layer',
  'scalability', 'performance-optimization', 'caching', 'marketplace-design', 'matching-dispatch',
  'two-sided-marketplace', 'supply-demand-balancing', 'trust-and-safety', 'fraud-detection',
  'content-moderation', 'risk-scoring', 'identity-verification', 'pricing-strategy', 'packaging',
  'monetization', 'unit-economics', 'freemium', 'subscription', 'take-rate', 'fee-transparency',
  'fintech', 'payments', 'cross-border-payments', 'lending', 'credit', 'creator-economy',
  'ads-monetization', 'saas-metrics', 'financial-disclosure', 'go-to-market', 'cost-optimization',
  'market-expansion', 'ai-ml-product', 'llm-applications', 'privacy', 'regulatory-compliance', 'security',
];

// ---- membership validators ------------------------------------------------
// Frozen Sets for O(1) membership; the exported helpers are the sole membership API.
const PILLAR_SET = new Set(PILLARS);
const REGION_SET = new Set(REGIONS);
const ARTIFACT_TYPE_SET = new Set(ARTIFACT_TYPES);
const LANGUAGE_SET = new Set(LANGUAGES);
const TOPIC_SET = new Set(TOPICS);

export const isPillar = (v) => PILLAR_SET.has(v);
export const isRegion = (v) => REGION_SET.has(v);
export const isArtifactType = (v) => ARTIFACT_TYPE_SET.has(v);
export const isLanguage = (v) => LANGUAGE_SET.has(v);
export const isTopic = (v) => TOPIC_SET.has(v);

// Return the subset of `topics` that are NOT in the registry (danglers). [] when all valid.
export function danglingTopics(topics) {
  if (!Array.isArray(topics)) return [];
  return topics.filter((t) => !TOPIC_SET.has(t));
}

// ---- selftest -------------------------------------------------------------
function assert(cond, msg) { if (!cond) { throw new Error(msg); } }

function runSelftest() {
  assert(PILLARS.length === 4, 'PILLARS has 4 entries');
  assert(REGIONS.length === 9, 'REGIONS has 9 entries');
  assert(ARTIFACT_TYPES.length === 5, 'ARTIFACT_TYPES has 5 entries');
  assert(LANGUAGES.length === 6, 'LANGUAGES has 6 entries');
  assert(TOPICS.length === 98, `TOPICS has 98 entries (got ${TOPICS.length})`);
  assert(new Set(TOPICS).size === 98, 'TOPICS has no duplicates');

  assert(isPillar('platform') && !isPillar('nope'), 'isPillar');
  assert(isRegion('india') && !isRegion('mars'), 'isRegion');
  assert(isArtifactType('blog_post') && !isArtifactType('tweet'), 'isArtifactType');
  assert(isLanguage('en') && !isLanguage('xx'), 'isLanguage');
  assert(isTopic('payments') && !isTopic('not-a-topic'), 'isTopic');

  assert(danglingTopics(['payments', 'security']).length === 0, 'no danglers on valid topics');
  const d = danglingTopics(['payments', 'made-up']);
  assert(d.length === 1 && d[0] === 'made-up', 'dangler detected');

  console.log('corpus-vocab --selftest: PASS (4 registries + language set + 98 topics + validators)');
}

if (argv.includes('--selftest')) {
  try { runSelftest(); } catch (e) { console.error('corpus-vocab --selftest: FAIL —', e.message); process.exit(1); }
}
