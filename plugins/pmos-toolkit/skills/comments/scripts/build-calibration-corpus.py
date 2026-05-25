#!/usr/bin/env python3
"""
T26 — Deterministic calibration corpus generator.

Walks docs/pmos/features/ and collects <section id="..."> spans from HTML
artifacts to build a 50-entry corpus for scorer calibration (§14.6).

Target date patterns per task spec: ^2026-04- and ^2026-05-0[1-7]_
NOTE: those directories only contain .md files (pre-HTML era). The corpus
therefore falls back to ALL HTML artifacts found under docs/pmos/features/
(87 files, 447 spans available as of 2026-05-25). This is documented here
and in the T26 task log. The seed + shuffle ensure deterministic selection
regardless of how many HTML files exist.

Usage:
    python3 build-calibration-corpus.py > ../tests/fixtures/calibration-spans-2026.json

Prints summary to stderr: "Generated N spans from M artifacts across K folders."
"""

import json
import os
import random
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SEED = 2026
TARGET_COUNT = 50
QUOTE_LEN = 80   # chars extracted from middle of section text
PREFIX_LEN = 20
SUFFIX_LEN = 20
MIN_TEXT_LEN = 80  # sections shorter than this are skipped

TAG_RE = re.compile(r"<[^>]+>")
# Matches <section id="foo"> or <section ... id='foo' ...> including id with
# other attributes before/after; content is captured non-greedy up to </section>
SECTION_RE = re.compile(
    r'<section\b[^>]*\bid\s*=\s*["\'](?P<sec_id>[\w-]+)["\'][^>]*>'
    r'(?P<body>.*?)</section\s*>',
    re.DOTALL
)

# ---------------------------------------------------------------------------
# Locate repo root (BASH_SOURCE fallback pattern applied to Python)
# ---------------------------------------------------------------------------
_script = Path(__file__).resolve()
# Walk up until we find .git
_root = _script.parent
while _root != _root.parent:
    if (_root / ".git").exists():
        break
    _root = _root.parent

if not (_root / ".git").exists():
    print("ERROR: cannot find repo root from script location", file=sys.stderr)
    sys.exit(1)

FEATURES_DIR = _root / "docs" / "pmos" / "features"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def strip_tags(html: str) -> str:
    return TAG_RE.sub("", html)


def collect_html_files(base: Path) -> list[Path]:
    """Return all .html files under base, sorted lexicographically, excluding
    *.sections.json (not HTML), index.html (navigation only), and any file
    whose name ends with .sections.json (belt-and-suspenders)."""
    result = []
    for root, _dirs, files in os.walk(base):
        for fname in sorted(files):
            if not fname.endswith(".html"):
                continue
            if fname == "index.html":
                continue
            if fname.endswith(".sections.json"):
                continue
            result.append(Path(root) / fname)
    return sorted(result)


def extract_spans(fpath: Path, repo_root: Path) -> list[dict]:
    """Extract (file, section_id, quote, prefix, suffix) tuples from one HTML file.

    Quotes are extracted from the RAW HTML content (not stripped plain text) so
    that the anchor resolver — which also searches raw HTML — can find them via
    exact-match. Specifically we scan the section body HTML for a run of plain-text
    characters that does not cross any tag boundary. This guarantees the quote will
    be verbatim-findable in the raw HTML passed to resolveAnchor().
    """
    try:
        content = fpath.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []

    spans = []
    for m in SECTION_RE.finditer(content):
        sec_id = m.group("sec_id")
        body_html = m.group("body")

        # Find all text runs between tags (inter-tag text nodes only).
        # A text run is a maximal contiguous sequence of non-'<' characters.
        text_runs = []
        for rm in re.finditer(r'[^<]{20,}', body_html):
            txt = rm.group(0)
            # Record the absolute offset of this run inside the full content
            abs_start = m.start("body") + rm.start()
            text_runs.append((txt, abs_start))

        if not text_runs:
            continue

        # Pick the longest run, preferring the middle-most when tied
        best_run, best_abs = max(text_runs, key=lambda r: len(r[0]))
        if len(best_run) < MIN_TEXT_LEN:
            continue

        # Slice 60-80 chars from the middle of the best run
        mid = len(best_run) // 2
        q_len = min(QUOTE_LEN, len(best_run) - mid)
        if q_len < 20:
            continue
        quote = best_run[mid : mid + q_len]
        if not quote.strip():
            continue

        # Verify the quote appears verbatim in the full raw content (sanity)
        q_abs = content.find(quote, best_abs)
        if q_abs == -1:
            continue

        # Extract prefix/suffix from raw content (these will also be searched
        # in raw HTML by the resolver's proximity scorer).
        prefix = content[max(0, q_abs - PREFIX_LEN) : q_abs]
        suffix = content[q_abs + len(quote) : q_abs + len(quote) + SUFFIX_LEN]

        # Strip tags from prefix/suffix so they resemble what a human would
        # write as surrounding context (the proximity scorer does plain-text
        # indexOf against the raw HTML, so short tag-free snippets are fine).
        prefix = TAG_RE.sub("", prefix)
        suffix = TAG_RE.sub("", suffix)

        spans.append({
            "file": str(fpath.relative_to(repo_root)),
            "section_id": sec_id,
            "quote": quote,
            "prefix": prefix,
            "suffix": suffix,
        })

    return spans


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    random.seed(SEED)

    html_files = collect_html_files(FEATURES_DIR)
    if not html_files:
        print("ERROR: no HTML files found under " + str(FEATURES_DIR), file=sys.stderr)
        sys.exit(1)

    all_spans = []
    feature_folders: set[str] = set()

    for fpath in html_files:
        # Track distinct feature folder (immediate child of FEATURES_DIR)
        try:
            rel = fpath.relative_to(FEATURES_DIR)
            feature_folders.add(rel.parts[0])
        except ValueError:
            pass

        spans = extract_spans(fpath, _root)
        all_spans.extend(spans)

    print(
        f"INFO: {len(all_spans)} spans available from {len(html_files)} artifacts "
        f"across {len(feature_folders)} feature folders before shuffle.",
        file=sys.stderr,
    )

    random.shuffle(all_spans)

    selected_count = min(TARGET_COUNT, len(all_spans))
    if selected_count < TARGET_COUNT:
        print(
            f"WARNING: only {selected_count} spans available; "
            f"using {selected_count} (target was {TARGET_COUNT})",
            file=sys.stderr,
        )

    selected = all_spans[:selected_count]

    corpus = {
        "seed": SEED,
        "generated_at": datetime.now(tz=timezone.utc).isoformat(),
        "spans": selected,
    }

    json.dump(corpus, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")

    print(
        f"Generated {selected_count} spans from {len(html_files)} artifacts "
        f"across {len(feature_folders)} feature folders.",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
