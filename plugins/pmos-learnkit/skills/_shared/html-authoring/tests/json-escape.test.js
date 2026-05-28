// T5 adversarial table: jsonInlineEscape produces safe-to-embed JSON
// (no raw </script>) AND round-trips through JSON.parse after un-escaping.
// FR-04, FR-17, E8.
'use strict';

const assert = require('node:assert/strict');
const { jsonInlineEscape } = require('../render.js');

const cases = [
  { name: 'close-script',   input: 'before </script> after' },
  { name: 'open-comment',   input: 'before <!-- ha after' },
  { name: 'cdata-close',    input: 'before ]]> after' },
  { name: 'surrogate-pair', input: 'emoji 😀 here' },
  { name: 'mixed',          input: '</script><!--<>&&' },
];

for (const c of cases) {
  const payload = {
    schema: 1,
    version: 0,
    generated_at: '2026-01-01T00:00:00Z',
    threads: [{ id: 't', quote: c.input }],
  };
  const escaped = jsonInlineEscape(payload);
  assert.equal(escaped.includes('</script>'), false,
    `${c.name}: no raw </script> in escaped output`);
  const parsed = JSON.parse(escaped.replace(/\\u003c/g, '<'));
  assert.equal(parsed.threads[0].quote, c.input,
    `${c.name}: round-trips through JSON.parse`);
}
console.log('OK: json-escape');
