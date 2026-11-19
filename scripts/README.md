# Sitemap generation

Run `python3 scripts/generate_sitemap.py --base-url https://divit.qezta.com/` from a
checkout with full Git history and Python 3.9 or later. This writes
`static/sitemap.xml`; no third-party packages are required.

The generator includes `src/routes/**/+page.svelte` and `+page.md`, strips route
groups, and ignores layouts and API handlers. Static child URLs use SvelteKit's
default trailing-slash policy (no trailing slash); the homepage ends in `/`.
Parameterized routes (including optional and rest parameters) are skipped with
a diagnostic because their concrete URLs require explicit data. Pages must have
Git history. Each `lastmod` uses that source page's latest commit timestamp, so
sitemap-only commits do not change the output. Runtime timestamps are never used.

Run regression tests with
`PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts -p 'test_*.py'`.
