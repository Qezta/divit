"""Generate a sitemap from enumerable SvelteKit pages using only the stdlib."""

import argparse
from datetime import datetime
from pathlib import Path
import subprocess
import sys
from urllib.parse import quote, urlsplit
import xml.etree.ElementTree as ET


NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9"


def generate(root, base_url):
    parsed = urlsplit(base_url)
    if (parsed.scheme != "https" or not parsed.netloc or parsed.path != "/"
            or parsed.query or parsed.fragment or parsed.username or parsed.password):
        raise ValueError("base URL must be an HTTPS origin with a trailing slash")
    routes = root / "src/routes"
    if not routes.is_dir():
        raise ValueError(f"missing routes directory: {routes}")

    pages = {}
    for page in sorted(routes.rglob("+page.*")):
        if page.name not in {"+page.svelte", "+page.md"} or not page.is_file():
            continue
        parts = [part for part in page.relative_to(routes).parts[:-1]
                 if not (part.startswith("(") and part.endswith(")"))]
        # Parameters (including optional and rest parameters) need explicit data.
        if any("[" in part or "]" in part for part in parts):
            print(f"Skipping non-enumerable route: {page.relative_to(root)}", file=sys.stderr)
            continue
        url = base_url + "/".join(quote(part, safe="-._~") for part in parts)
        if url in pages:
            raise ValueError(f"multiple source pages map to {url}")
        lastmod = subprocess.run(
            ["git", "--literal-pathspecs", "log", "-1", "--follow", "--format=%cI", "--",
             page.relative_to(root).as_posix()],
            cwd=root, check=True, capture_output=True, text=True,
        ).stdout.strip()
        if not lastmod:
            raise ValueError(f"page has no Git history: {page.relative_to(root)}")
        pages[url] = datetime.fromisoformat(lastmod.replace("Z", "+00:00")).isoformat()

    ET.register_namespace("", NAMESPACE)
    sitemap = ET.Element(f"{{{NAMESPACE}}}urlset")
    for url, lastmod in sorted(pages.items()):
        entry = ET.SubElement(sitemap, "url")
        ET.SubElement(entry, "loc").text = url
        ET.SubElement(entry, "lastmod").text = lastmod
    ET.indent(sitemap, space="  ")
    return ET.tostring(sitemap, encoding="utf-8", xml_declaration=True) + b"\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    try:
        data = generate(root, args.base_url)
        output = root / "static/sitemap.xml"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(data)
    except (ValueError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"sitemap generation failed: {error}\n")


if __name__ == "__main__":
    main()
