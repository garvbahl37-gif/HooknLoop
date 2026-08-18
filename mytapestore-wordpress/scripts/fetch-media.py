#!/usr/bin/env python3
"""Download the media referenced by exported content into the local uploads dir.

Files land at exactly the path production serves them from —
  https://mytapestore.com.au/wp-content/uploads/2022/01/x.png
    -> local/wordpress/wp-content/uploads/2022/01/x.png
— so the attachment rows import.php creates resolve without any URL rewriting,
and a later switch to the real server needs no path fixups either.

Downloading on the host rather than sideloading inside WordPress is deliberate:
Playground runs PHP in WebAssembly, where a few hundred HTTP fetches are slow
and failure-prone. Here they are parallel and resumable — already-present files
are skipped, so re-running costs nothing.

Usage: python3 mytapestore-wordpress/scripts/fetch-media.py [--all]
       --all also fetches media not referenced by any product (page art, logos).
"""
import concurrent.futures as futures
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
UPLOADS = ROOT / "local" / "wordpress" / "wp-content" / "uploads"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0 Safari/537.36"
PREFIX = "/wp-content/uploads/"


def load(name):
    path = CONTENT / f"{name}.json"
    return json.loads(path.read_text()) if path.exists() else []


def collect_urls(include_all: bool) -> set:
    urls = set()

    for product in load("products"):
        for image in product.get("images", []):
            if image.get("src"):
                urls.add(image["src"])

    for variations in load("product-variations").values():
        for variation in variations:
            src = (variation.get("image") or {}).get("src")
            if src:
                urls.add(src)

    for collection in ("pages", "posts"):
        for item in load(collection):
            html = (item.get("content", {}) or {}).get("rendered", "")
            urls.update(re.findall(r'https://[^\s"\')]+/wp-content/uploads/[^\s"\')]+', html))

    for category in load("product-categories"):
        src = (category.get("image") or {}).get("src")
        if src:
            urls.add(src)

    if include_all:
        for item in load("media"):
            if item.get("source_url"):
                urls.add(item["source_url"])

    # Skip WordPress's generated size variants (foo-300x300.jpg); WordPress
    # regenerates those itself from the original.
    return {u for u in urls if PREFIX in u and not re.search(r"-\d+x\d+\.(jpe?g|png|webp|gif)$", u, re.I)}


def target_for(url: str) -> pathlib.Path:
    return UPLOADS / url.split(PREFIX, 1)[1].split("?")[0]


def fetch(url: str):
    dest = target_for(url)
    if dest.exists() and dest.stat().st_size > 0:
        return ("skip", url, dest.stat().st_size)
    dest.parent.mkdir(parents=True, exist_ok=True)

    # Some uploads have non-ASCII filenames (en-dashes in report titles, mostly).
    # urllib refuses to put those on the wire raw, so percent-encode the path
    # while leaving the already-safe characters alone.
    parts = urllib.parse.urlsplit(url)
    safe = urllib.parse.urlunsplit((
        parts.scheme, parts.netloc,
        urllib.parse.quote(parts.path, safe="/%"),
        parts.query, parts.fragment,
    ))

    req = urllib.request.Request(safe, headers={"User-Agent": UA})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                data = response.read()
            break
        except urllib.error.HTTPError as e:
            return ("fail", url, f"HTTP {e.code}")
        except Exception as e:  # noqa: BLE001 - one bad asset must not stop the run
            if attempt == 2:
                return ("fail", url, type(e).__name__)
            time.sleep(1 + attempt)
    if not data:
        return ("fail", url, "empty")
    dest.write_bytes(data)
    return ("ok", url, len(data))


def main():
    include_all = "--all" in sys.argv
    urls = sorted(collect_urls(include_all))
    print(f"{len(urls)} media files to ensure locally  (--all: {include_all})")
    UPLOADS.mkdir(parents=True, exist_ok=True)

    tally = {"ok": 0, "skip": 0, "fail": 0}
    total_bytes = 0
    failures = []

    with futures.ThreadPoolExecutor(max_workers=8) as pool:
        for i, (status, url, info) in enumerate(pool.map(fetch, urls), 1):
            tally[status] += 1
            if status == "fail":
                failures.append((url, info))
            else:
                total_bytes += info
            if i % 25 == 0 or i == len(urls):
                print(f"  {i}/{len(urls)}  ok {tally['ok']}  skip {tally['skip']}  fail {tally['fail']}", flush=True)

    print(f"\ndownloaded {total_bytes / 1e6:.1f} MB into {UPLOADS}")
    if failures:
        print(f"\n{len(failures)} failed:")
        for url, why in failures[:20]:
            print(f"  {why:12} {url}")


if __name__ == "__main__":
    main()
