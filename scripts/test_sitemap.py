"""Route discovery and Git-based sitemap stability regression tests."""

from contextlib import redirect_stderr
from io import StringIO
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
import xml.etree.ElementTree as ET

from generate_sitemap import generate, NAMESPACE


class SitemapTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[1])
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.git("init", "--quiet")
        self.git("config", "user.name", "Sitemap Test")
        self.git("config", "user.email", "sitemap@example.invalid")
        self.git("commit", "--quiet", "--allow-empty", "-m", "initialize fixture")

    def git(self, *args, date="2024-01-02T03:04:05+00:00"):
        return subprocess.run(
            ["git", *args], cwd=self.root, check=True, capture_output=True, text=True,
            env={**os.environ, "GIT_AUTHOR_DATE": date, "GIT_COMMITTER_DATE": date},
        ).stdout.strip()

    def page(self, path):
        source = self.root / "src/routes" / path
        source.parent.mkdir(parents=True, exist_ok=True)
        source.write_text("fixture\n")

    def commit(self, message, **kwargs):
        self.git("add", ".")
        self.git("commit", "--quiet", "-m", message, **kwargs)

    def entries(self, data):
        ns = {"s": NAMESPACE}
        return [(entry.findtext("s:loc", namespaces=ns),
                 entry.findtext("s:lastmod", namespaces=ns))
                for entry in ET.fromstring(data).findall("s:url", ns)]

    def test_homepage_and_stability_after_sitemap_commit(self):
        self.page("+page.svelte")
        self.commit("add homepage")
        first = generate(self.root, "https://example.com/")
        self.assertEqual(self.entries(first), [
            ("https://example.com/", "2024-01-02T03:04:05+00:00")])
        (self.root / "static").mkdir()
        (self.root / "static/sitemap.xml").write_bytes(first)
        self.commit("update sitemap", date="2025-06-07T08:09:10+00:00")
        self.assertEqual(generate(self.root, "https://example.com/"), first)
        self.assertEqual(generate(self.root, "https://example.com/"), first)

    def test_static_pages_groups_and_dynamic_skip(self):
        self.page("+page.svelte")
        self.page("about/+page.svelte")
        self.page("(marketing)/docs/+page.md")
        self.page("blog/[slug]/+page.svelte")
        self.page("[[lang]]/+page.md")
        self.page("[...rest]/+page.svelte")
        self.page("api/+server.ts")
        self.page("+layout.svelte")
        self.page("+page.server.js")
        self.commit("add routes")
        warnings = StringIO()
        with redirect_stderr(warnings):
            result = generate(self.root, "https://example.com/")
        self.assertEqual([url for url, _ in self.entries(result)], [
            "https://example.com/", "https://example.com/about", "https://example.com/docs"])
        self.assertEqual(warnings.getvalue().count("Skipping non-enumerable route:"), 3)
        for parameter in ("[slug]", "[[lang]]", "[...rest]"):
            self.assertIn(parameter, warnings.getvalue())

    def test_uncommitted_page_fails_clearly(self):
        self.page("+page.svelte")
        with self.assertRaisesRegex(ValueError, "page has no Git history"):
            generate(self.root, "https://example.com/")


if __name__ == "__main__":
    unittest.main()
