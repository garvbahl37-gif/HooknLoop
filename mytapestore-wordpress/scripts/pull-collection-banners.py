#!/usr/bin/env python3
"""Pull the Shopify collection banner artwork into the theme, at full resolution.

WHY THE BANNERS LOOK BLURRY

The theme ships one packaged file per category at 1600×893 (categories) and
1800×1005 (industries), stretched edge to edge with `object-fit: cover`. On any
display wider than the file — which is most desktops, and every 2× phone — the
browser is upscaling, and upscaling looks exactly like this.

The markup made it worse by declaring `width="2000" height="560"` on a file that
is 1600×893, so the layout box the browser reserved had a different aspect ratio
from the pixels arriving to fill it.

Shopify serves the SAME banners from higher-resolution uploads, with a srcset up
to 2000w. This downloads those uploads at three widths so the theme can offer a
real srcset and stop upscaling:

    assets/img/site/cat/<handle>.jpg        2000w
    assets/img/site/cat/<handle>-1200.jpg   1200w
    assets/img/site/cat/<handle>-800.jpg     800w

Industry collections land in assets/img/site/industry/ instead, matching where
the theme already looks for them.

Usage:  python3 scripts/pull-collection-banners.py [--store …] [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys
import time
import urllib.error
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
THEME = HERE.parent / "theme" / "assets" / "img" / "site"
REDESIGN = HERE.parent.parent / "mytapestore-redesign" / "public" / "img" / "site"

UA = "mytapestore-banner-sync/1.0"
WIDTHS = (2000, 1200, 800)

# Kept in step with mts_industry_slugs() in theme/inc/product-data.php.
INDUSTRIES = {
    "aerospace-defense", "building-construction", "display-signage",
    "electronics-electrical", "flooring", "framing-insulation", "glass-glazing",
    "hvac-plumbing", "joinery-kitchen-furniture", "manufacturing", "marine",
    "marking-safety", "nameplates", "pool-spa", "printing", "roofing-gutters",
    "sheathing-moisture-management", "solar-energy", "telecommunication",
    "transport-automotive-rv", "warehouse-packaging-logistics",
    "windows-doors-decking", "airconditioning-refrigeration-tapes",
}


def fetch(url: str, tries: int = 4) -> bytes:
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as res:
                return res.read()
        except urllib.error.HTTPError as err:
            if err.code == 429:
                time.sleep(min(60, 5 * (2 ** attempt)))
            elif err.code in (404, 410):
                return b""
            else:
                time.sleep(2 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError):
            time.sleep(2 * (attempt + 1))
    return b""


def _width(blob: bytes) -> int:
    """Pixel width from a JPEG's SOF marker. No dependencies, no temp file."""
    i = 2
    while i < len(blob) - 9:
        if blob[i] != 0xFF:
            i += 1
            continue
        marker = blob[i + 1]
        if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
            return int.from_bytes(blob[i + 7:i + 9], "big")
        i += 2 + int.from_bytes(blob[i + 2:i + 4], "big")
    return 0


def _file_width(path: pathlib.Path) -> int:
    try:
        return _width(path.read_bytes())
    except OSError:
        return 0


def sized(src: str, width: int) -> str:
    """Shopify's CDN resizes on the query string; strip any width already there."""
    base = src.split("&width=")[0].split("?width=")[0]
    join = "&" if "?" in base else "?"
    return f"{base}{join}width={width}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--store", default="my-tape-store-2.myshopify.com")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    data = json.loads(fetch(f"https://{args.store}/collections.json?limit=250").decode("utf-8"))
    collections = data.get("collections", [])
    print(f"{len(collections)} collections")

    written = 0
    skipped = []

    for collection in collections:
        handle = collection["handle"]
        image = collection.get("image") or {}
        src = image.get("src")

        if not src:
            skipped.append(handle)
            continue

        folder = THEME / ("industry" if handle in INDUSTRIES else "cat")

        for width in WIDTHS:
            name = f"{handle}.jpg" if width == WIDTHS[0] else f"{handle}-{width}.jpg"
            target = folder / name

            if args.dry_run:
                print(f"  would write {target.relative_to(THEME.parent.parent.parent)} ({width}w)")
                continue

            blob = fetch(sized(src, width))
            if not blob:
                print(f"  !! {handle} @ {width}w failed", file=sys.stderr)
                continue

            folder.mkdir(parents=True, exist_ok=True)

            # NEVER DOWNGRADE.
            #
            # Shopify's collection uploads are not always the best copy of the
            # artwork: the industry banners there are 1024×1024 and in one case
            # 500×500, against 1800×1005 for the packaged files this theme
            # already ships. A first run of this script overwrote 23 sharp
            # banners with soft ones — which is the blur it was written to fix.
            if target.exists() and _width(blob) <= _file_width(target):
                print(f"  = {handle} @ {width}w: kept the existing larger file")
                continue

            target.write_bytes(blob)

            # scripts/build-css.sh rsyncs assets/img from the redesign's public
            # directory with --delete, so anything written only into the theme is
            # removed on the next CSS build. Write both.
            mirror = REDESIGN / ("industry" if handle in INDUSTRIES else "cat") / name
            mirror.parent.mkdir(parents=True, exist_ok=True)
            mirror.write_bytes(blob)

            written += 1

        print(f"  {handle}: {len(WIDTHS)} sizes", flush=True)
        time.sleep(0.2)

    print(f"\nwrote {written} files")
    if skipped:
        print(f"no banner image on Shopify for: {', '.join(skipped)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
