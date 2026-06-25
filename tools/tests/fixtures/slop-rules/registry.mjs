// Fixture registry for tools/lint-slop-rules.sh tests (story 260624-aqb).
// A minimal SLOP_RULES shape — enough for the lint's node extractor to read
// `id` + `skillGuideline`. NOT the real engine registry; do not import elsewhere.
export const SLOP_RULES = [
  { id: 'fixture-alpha', skillSection: 'Typography', skillGuideline: 'flat type hierarchy' },
  { id: 'fixture-beta', skillSection: 'Color & Contrast', skillGuideline: 'washed-out gray text on a colored background' },
  { id: 'fixture-no-guideline', skillSection: 'Motion' }, // no skillGuideline → not asserted
];
