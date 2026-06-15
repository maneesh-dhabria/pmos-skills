// render-dogfood.mjs — renders representative artifacts through a given substrate dir.
// Usage: node render-dogfood.mjs <substrateDir> <outDir>
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);

const substrate = process.argv[2];
const outDir = process.argv[3];
const { renderArtifact } = require(path.join(substrate, 'render.js'));
// Strip template's leading doc-comment (production does this; else {{content}} in the
// comment is re-substituted and the body duplicates).
const tmpl = fs.readFileSync(path.join(substrate, 'template.html'), 'utf8').replace(/^<!--[\s\S]*?-->\s*/, '');

const pipelineContent = `
<p class="pmos-eyebrow">Spec · route:feature · pmos-toolkit</p>
<p><span class="pmos-lead-label">Bottom line</span></p>
<p class="pmos-lead">The html-authoring substrate moves to an Editorial Technical voice: a serif reading column, sans-serif headings, and a mono structural layer — so long pipeline docs read like a considered document rather than a config dump.</p>
<section id="overview">
  <h2 id="overview-h">Overview</h2>
  <p>This document exercises the refreshed type system end to end. Body copy is set in a system serif at a comfortable reading measure, while headings switch to a grotesque sans to mark hierarchy. Inline tokens such as <code>--pmos-measure</code> and <code>renderArtifact()</code> stay calm — a warm grey on a soft tint, never a loud accent.</p>
  <h3 id="why">Why it matters</h3>
  <p>Readers skim a spec by its headings first. A perceptible step between <code>h1</code>, <code>h2</code>, and <code>h3</code> lets the eye find structure without reading every word. The mono <strong>[NN]</strong> counter above each section title doubles as a stable reference handle.</p>
</section>
<section id="data">
  <h2 id="data-h">Comparison table</h2>
  <p>Tables break out past the reading column to the right, so wide data never squeezes the prose:</p>
  <table>
    <thead><tr><th>Layer</th><th>Face</th><th>Role</th></tr></thead>
    <tbody>
      <tr><td>Body</td><td>Serif</td><td>Sustained reading</td></tr>
      <tr><td>Headings</td><td>Sans</td><td>Hierarchy &amp; scanning</td></tr>
      <tr><td>Structure</td><td>Mono</td><td>Counters, eyebrows, code</td></tr>
      <tr><td>Accent</td><td>—</td><td>Burnt orange signal only</td></tr>
    </tbody>
  </table>
  <h3 id="code">Code sample</h3>
  <pre><code>const measure = getComputedStyle(body).maxWidth; // ~730px</code></pre>
  <blockquote>Typography is the craft of endowing human language with a durable visual form.</blockquote>
  <ul><li>Serif body at 17px / 1.66</li><li>Sans headings, sentence case</li><li>Mono counters above titles</li></ul>
</section>`;

const commentContent = `
<section id="intro">
  <h2 id="intro-h">A commented section</h2>
  <p id="para-anchor">This paragraph is long enough to host an inline comment thread without crossing element boundaries, which lets the warm-tint highlight wrap a clean run of text for the dogfood.</p>
  <h3 id="more">More prose</h3>
  <p>Opening a thread must not reflow this paragraph or any that follow it.</p>
</section>`;

function emit(name, title, content) {
  const html = renderArtifact({
    template: tmpl, title, content,
    sourcePath: `dogfood/${name}.html`, assetPrefix: 'assets/', pluginVersion: '0.0.0', pmosSkill: 'spec',
  });
  fs.writeFileSync(path.join(outDir, `${name}.html`), html);
}

emit('pipeline', 'html-authoring Editorial Technical refresh', pipelineContent);
emit('comments', 'Comment-bearing document', commentContent);
console.log('rendered pipeline.html + comments.html into', outDir);
