#!/usr/bin/env python3
"""Static checks for the kyvar.io site, run on every pull request.

- every page has a <title> and a meta description
- every JSON-LD block parses
- every local href/src points at a file that exists
- no wording the brand avoids ("guardrail")

Exit code 1 lists every problem found. Run from the repository root:
    python3 tools/site_check.py
"""
from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent.parent
# Standalone pages outside the site's conventions.
SKIP = {"tom-solution.html"}
BANNED = [re.compile(r"\bguardrails?\b", re.I)]


class Page(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[str] = []
        self.title = False
        self.description = False
        self._in_ld = False
        self._ld = ""
        self.ld_blocks: list[str] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title":
            self.title = True
        if tag == "meta" and a.get("name") == "description" and (a.get("content") or "").strip():
            self.description = True
        if tag == "script" and a.get("type") == "application/ld+json":
            self._in_ld, self._ld = True, ""
        for key in ("href", "src"):
            if a.get(key):
                self.links.append(a[key])
        if a.get("srcset"):
            self.links += [part.strip().split(" ")[0] for part in a["srcset"].split(",") if part.strip()]

    def handle_data(self, data):
        if self._in_ld:
            self._ld += data

    def handle_endtag(self, tag):
        if tag == "script" and self._in_ld:
            self._in_ld = False
            self.ld_blocks.append(self._ld)


def local_target(page: Path, link: str) -> Path | None:
    u = urlparse(link)
    if u.scheme or u.netloc or link.startswith(("#", "mailto:", "tel:", "data:", "javascript:")):
        return None
    path = unquote(u.path)
    if not path:
        return None
    target = (ROOT / path.lstrip("/")) if path.startswith("/") else (page.parent / path)
    if path.endswith("/"):
        target = target / "index.html"
    return target


def main() -> int:
    problems: list[str] = []
    pages = sorted(p for p in ROOT.rglob("*.html") if ".git" not in p.parts and p.name not in SKIP)
    for page in pages:
        rel = page.relative_to(ROOT)
        text = page.read_text(encoding="utf-8")
        parser = Page()
        parser.feed(text)
        if not parser.title:
            problems.append(f"{rel}: no <title>")
        if not parser.description and page.name != "404.html":
            problems.append(f"{rel}: no meta description")
        for i, block in enumerate(parser.ld_blocks, 1):
            try:
                json.loads(block)
            except json.JSONDecodeError as exc:
                problems.append(f"{rel}: JSON-LD block {i} does not parse ({exc})")
        for link in parser.links:
            target = local_target(page, link)
            if target is not None and not target.exists():
                problems.append(f"{rel}: broken local link {link}")
        for rx in BANNED:
            for m in rx.finditer(text):
                line = text.count("\n", 0, m.start()) + 1
                problems.append(f"{rel}:{line}: avoid the word '{m.group(0)}'")
    for p in problems:
        print(p)
    print(f"{len(pages)} pages checked, {len(problems)} problem(s)")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
