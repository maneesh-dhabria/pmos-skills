# static Stack

Static-site generators and plain-HTML projects. Detection signals (priority order):

- `_config.yml` → Jekyll
- `astro.config.*` → Astro
- `eleventy.config.*` / `.eleventy.js` → 11ty (Eleventy)
- `hugo.toml` / `hugo.yaml` / `config.toml` with hugo block → Hugo
- `gatsby-config.*` → Gatsby
- `next.config.*` with `output: 'export'` → Next static export
- Plain `index.html` at repo root, no other markers → plain HTML

For builders that overlap with a JS package manager (Astro, 11ty, Gatsby, Next), the planner ALSO loads the relevant JS stack file (npm/pnpm/etc.) for install + lint coverage. This file documents only the static-site-specific build / file-existence / link-check.

## Prereq Commands

Per-builder install (cite the relevant JS stack file in addition):

```bash
# Jekyll
bundle install
# Astro / 11ty / Gatsby / Next — see the JS stack file (npm.md / pnpm.md / etc.)
# Hugo
hugo version
# Plain HTML — no install step
```

## Lint/Test Commands

Lint:

```bash
# HTML lint
tidy -e -q -errors --gnu-emacs yes path/to/file.html

# Markdown lint (Jekyll / Hugo / 11ty source)
markdownlint '**/*.md'
```

Build (file-existence check):

```bash
# Jekyll
bundle exec jekyll build && test -d _site && test -f _site/index.html

# Astro
npm run build && test -d dist && test -f dist/index.html

# 11ty
npx eleventy && test -d _site

# Hugo
hugo --minify && test -d public && test -f public/index.html
```

Link check (run against the build output):

```bash
# lychee (preferred — Rust, fast)
lychee --no-progress _site/

# linkchecker (Python)
linkchecker --check-extern _site/
```

## API Smoke Patterns

Static sites have no API to smoke; the equivalent is **file-existence assertions** against the build output:

```bash
# Verify expected pages built
for p in index.html about.html blog/index.html; do
  test -f _site/$p || { echo "MISSING: _site/$p"; exit 1; }
done

# Verify the homepage contains expected content (regression guard)
grep -q '<title>' _site/index.html

# Verify build artifacts have non-zero size
find _site -type f -size 0 -print | head -1 | grep -q . && echo "EMPTY FILE FOUND" && exit 1 || true
```

For build-output served behind a dev server, plain HTTP smoke is also valid:

```bash
curl -fsS http://localhost:4000/ | grep -q '<html'
```

## Common Fixture Patterns

- Snapshot HTML files under `tests/fixtures/` for regression tests on layout / partials.
- For SSG projects, fixture content lives in the source tree (`_posts/`, `content/posts/`, `src/pages/`) — keep test fixtures clearly scoped to `tests/fixtures/` so the build does not pick them up.
- Image / asset fixtures: small, deterministic files (SVG preferred over PNG for diff-friendliness).
