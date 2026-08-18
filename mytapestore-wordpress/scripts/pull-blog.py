#!/usr/bin/env python3
"""Pull the blog from mytapestore.com.au — posts, categories and every image.

WHY

The blog was imported without its media. All 55 posts arrived with NO featured
image at all, and 51 of them still had their inline <img> tags pointing at
mytapestore.com.au — so the index rendered rows of empty cards, and every
article's pictures were hotlinked to another site. Only one category existed, so
the topic chips the design puts above the index had nothing to show.

WHAT THIS COLLECTS

The live site is WordPress, so its REST API gives the whole thing cleanly and
there is nothing to scrape:

    /wp-json/wp/v2/posts?per_page=100&_embed
      · title, slug, date, excerpt, full content HTML
      · the featured image, through _embedded.wp:featuredmedia
      · the real categories, through _embedded.wp:term

Every image referenced — the featured one and every <img> inside the body — is
downloaded to content/blog-media/ so the draft serves its own copy. Nothing is
left pointing at the live site.

Usage:
    python3 scripts/pull-blog.py            # posts + images
    python3 scripts/pull-blog.py --no-media # metadata only, for a quick re-run
"""

from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
CONTENT = HERE.parent / "content"
OUT = CONTENT / "blog.json"
MEDIA = CONTENT / "blog-media"

UA = "mytapestore-blog-sync/1.0"


def encode(url: str) -> str:
    """Percent-encode the non-ASCII parts of a URL.

    WordPress uploads carry the original filename, and these include en-dashes
    and other typographic characters — "Anti–Slip.jpg". http.client encodes the
    request line as ASCII and raises UnicodeEncodeError on anything else, which
    killed the run outright partway through. Only the path and query are quoted;
    the scheme and host must not be touched.
    """
    parts = urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit((
        parts.scheme,
        parts.netloc.encode("idna").decode("ascii") if any(ord(c) > 127 for c in parts.netloc) else parts.netloc,
        urllib.parse.quote(parts.path, safe="/%"),
        urllib.parse.quote(parts.query, safe="=&%"),
        parts.fragment,
    ))


def fetch(url: str, tries: int = 5) -> bytes:
    url = encode(url)
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as res:
                return res.read()
        except urllib.error.HTTPError as err:
            if err.code in (404, 410):
                return b""
            wait = float(err.headers.get("Retry-After") or 0) or min(30, 3 * (attempt + 1))
            time.sleep(wait)
        except (urllib.error.URLError, TimeoutError):
            time.sleep(3 * (attempt + 1))
    return b""


def local_name(url: str) -> str:
    """A stable filename for an image URL.

    The path's own basename is kept so the file stays recognisable in the media
    library, with a short hash of the full URL in front of it — two posts can
    reference `banner.jpg` from different upload folders, and without the hash
    the second would overwrite the first.
    """
    path = urllib.parse.urlparse(url).path
    base = pathlib.Path(urllib.parse.unquote(path)).name or "image.jpg"
    base = re.sub(r"[^A-Za-z0-9._-]", "-", base)
    digest = hashlib.sha1(url.encode()).hexdigest()[:8]
    return f"{digest}-{base}"


def image_urls(html: str) -> list[str]:
    """Every image the body references, in order, de-duplicated."""
    urls: list[str] = []
    for match in re.finditer(r'<img[^>]+src=["\']([^"\']+)["\']', html, re.I):
        url = match.group(1).strip()
        if url.startswith("data:"):
            continue
        if url not in urls:
            urls.append(url)
    return urls


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", default="https://mytapestore.com.au")
    ap.add_argument("--no-media", action="store_true", help="skip downloading images")
    ap.add_argument("--delay", type=float, default=0.25)
    args = ap.parse_args()

    print(f"reading {args.site}/wp-json/wp/v2/posts …")

    posts: list[dict] = []
    page = 1
    while page <= 10:
        raw = fetch(f"{args.site}/wp-json/wp/v2/posts?per_page=100&page={page}&_embed")
        if not raw:
            break
        batch = json.loads(raw.decode("utf-8"))
        if not isinstance(batch, list) or not batch:
            break
        posts.extend(batch)
        if len(batch) < 100:
            break
        page += 1

    print(f"{len(posts)} posts\n")

    MEDIA.mkdir(parents=True, exist_ok=True)
    records = []
    downloaded: dict[str, str] = {}
    failed: list[str] = []

    def grab(url: str) -> str:
        """Download once, return the local filename ('' if it could not be had)."""
        if not url:
            return ""
        if url in downloaded:
            return downloaded[url]

        name = local_name(url)
        target = MEDIA / name

        if not target.exists() and not args.no_media:
            blob = fetch(url)
            if not blob:
                failed.append(url)
                downloaded[url] = ""
                return ""
            target.write_bytes(blob)
            time.sleep(args.delay)

        downloaded[url] = name if target.exists() else ""
        return downloaded[url]

    for i, post in enumerate(posts, 1):
        embedded = post.get("_embedded", {}) or {}

        featured = ""
        media = (embedded.get("wp:featuredmedia") or [{}])[0]
        if isinstance(media, dict):
            featured = media.get("source_url") or ""

        categories = [
            term["name"]
            for group in (embedded.get("wp:term") or [])
            for term in group
            if isinstance(term, dict) and term.get("taxonomy") == "category"
        ]

        content = post.get("content", {}).get("rendered", "") or ""
        inline = image_urls(content)

        record = {
            "slug": post.get("slug", ""),
            "title": post.get("title", {}).get("rendered", ""),
            "date": post.get("date", ""),
            "excerpt": post.get("excerpt", {}).get("rendered", ""),
            "content": content,
            "categories": categories or ["Blog"],
            "featured_url": featured,
            "featured_file": grab(featured),
            "images": {url: grab(url) for url in inline},
        }

        records.append(record)
        print(
            f"  [{i}/{len(posts)}] {record['slug'][:52]:52} "
            f"{'featured' if record['featured_file'] else 'NO FEATURED':11} "
            f"{len(inline)} inline",
            flush=True,
        )

    OUT.write_text(json.dumps(records, indent=1, ensure_ascii=False), encoding="utf-8")

    have = sum(1 for r in records if r["featured_file"])
    files = len(list(MEDIA.glob("*"))) if MEDIA.exists() else 0
    print(f"\nwrote {OUT}")
    print(f"  posts:            {len(records)}")
    print(f"  featured images:  {have}/{len(records)}")
    print(f"  media files:      {files}")
    if failed:
        print(f"  could not download {len(failed)} image(s), first few:")
        for url in failed[:5]:
            print(f"    - {url}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
