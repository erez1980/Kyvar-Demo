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
from html import unescape
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


CANON_RE = re.compile(r'<link rel="canonical" href="([^"]+)"')
ROBOTS_RE = re.compile(r'<meta name="robots" content="([^"]*)"', re.I)
DESC_RE = re.compile(r'<meta name="description" content="([^"]*)"')
TITLE_RE = re.compile(r"<title>(.*?)</title>", re.S)
SITEMAP_LOC_RE = re.compile(r"<loc>\s*([^<]+?)\s*</loc>")
SITEMAP_LASTMOD_RE = re.compile(r"<loc>\s*([^<]+?)\s*</loc>\s*<lastmod>\s*(\d{4}-\d{2}-\d{2})\s*</lastmod>")
LOGIN_RE = re.compile(r"<a\b[^>]*href=\"https://app\.kyvar\.io/login\"[^>]*>")

# Every indexable URL should be one click from the homepage, not only in the nav.
HOME_LINKS = [
    "architecture.html",
    "security.html",
    "trust.html",
    "pilot.html",
    "pricing.html",
    "contact.html",
    "solutions/index.html",
    "solutions/msp-ai-operations.html",
    "solutions/alert-noise-auto-remediation.html",
    "solutions/servicenow-jira-ticket-investigation.html",
    "insights/index.html",
    "insights/what-is-self-healing-infrastructure.html",
    "insights/day-0-vs-day-2-operations.html",
    "insights/autonomous-it-operations-governance.html",
    "insights/automatic-monitoring-auto-remediation.html",
    "insights/aiops-agentic-ai-governed-operator.html",
    "privacy.html",
    "cookies.html",
]


def expected_canonical(rel: Path) -> str:
    posix = rel.as_posix()
    if posix == "index.html":
        return "https://kyvar.io/"
    if posix.endswith("/index.html"):
        return "https://kyvar.io/" + posix[: -len("index.html")]
    return "https://kyvar.io/" + posix


def main() -> int:
    problems: list[str] = []
    pages = sorted(p for p in ROOT.rglob("*.html") if ".git" not in p.parts and p.name not in SKIP)
    indexable: set[str] = set()
    home_targets: set[Path] = set()
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
            path = unquote(urlparse(link).path)
            if path == "index.html" or path.endswith("/index.html"):
                problems.append(f"{rel}: link to {link} publishes a duplicate of the canonical URL")
            if page.name == "index.html" and target is not None:
                home_targets.add(target.resolve())
        robots = " ".join(ROBOTS_RE.findall(text)).lower()
        noindex = "noindex" in robots
        if page.name == "404.html" and not noindex:
            problems.append(f"{rel}: 404 must be noindex")
        if not noindex:
            canons = CANON_RE.findall(text)
            expected = expected_canonical(rel)
            if canons != [expected]:
                problems.append(f"{rel}: canonical {canons or 'missing'}, expected {expected}")
            else:
                indexable.add(expected)
            title = unescape(TITLE_RE.search(text).group(1)).strip() if TITLE_RE.search(text) else ""
            if not 15 <= len(title) <= 70:
                problems.append(f"{rel}: title length {len(title)} (want 15–70)")
            desc_m = DESC_RE.search(text)
            desc = unescape(desc_m.group(1)).strip() if desc_m else ""
            if not 50 <= len(desc) <= 170:
                problems.append(f"{rel}: meta description length {len(desc)} (want 50–170)")
        for tag in LOGIN_RE.findall(text):
            if "nofollow" not in tag:
                problems.append(f"{rel}: login link must be rel=nofollow so the app login is not nominated for indexing")
        for rx in BANNED:
            for m in rx.finditer(text):
                line = text.count("\n", 0, m.start()) + 1
                problems.append(f"{rel}:{line}: avoid the word '{m.group(0)}'")
    tom = ROOT / "tom-solution.html"
    tom_text = tom.read_text(encoding="utf-8")
    if "noindex" not in tom_text.lower():
        problems.append("tom-solution.html: standalone puzzle page must be noindex")
    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    locs = SITEMAP_LOC_RE.findall(sitemap)
    dated = {loc: last for loc, last in SITEMAP_LASTMOD_RE.findall(sitemap)}
    if set(locs) != indexable:
        missing = sorted(indexable - set(locs))
        extra = sorted(set(locs) - indexable)
        if missing:
            problems.append("sitemap.xml: missing " + ", ".join(missing))
        if extra:
            problems.append("sitemap.xml: not an indexable canonical: " + ", ".join(extra))
    if len(locs) != len(set(locs)):
        problems.append("sitemap.xml: duplicate <loc>")
    for loc in locs:
        if loc not in dated:
            problems.append(f"sitemap.xml: {loc} needs <lastmod> YYYY-MM-DD")
    for rel in HOME_LINKS:
        if (ROOT / rel).resolve() not in home_targets:
            problems.append(f"index.html: no link to {rel}")
    # GitHub Pages has no _redirects. These two files are also the directory
    # indexes, so a static meta refresh would loop. The redirect lives in the
    # first head script and fires only for an explicit /index.html URL.
    init = (ROOT / "assets/theme-init.js").read_text(encoding="utf-8")
    if "httpEquiv" not in init or "location.replace" not in init or "index.html" not in init:
        problems.append("assets/theme-init.js: /index.html must meta-refresh to the directory URL")
    for name in ("index.html", "insights/index.html", "solutions/index.html"):
        page = (ROOT / name).read_text(encoding="utf-8")
        if "theme-init.js" not in page:
            problems.append(f"{name}: must load theme-init.js so /index.html can redirect")
        if re.search(r"http-equiv=[\"']refresh", page, re.I):
            problems.append(f"{name}: static meta refresh also reloads the directory URL")
    for p in problems:
        print(p)
    print(f"{len(pages)} pages checked, {len(problems)} problem(s)")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
