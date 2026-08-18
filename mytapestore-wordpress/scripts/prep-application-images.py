#!/usr/bin/env python3
"""Turn the raw Magnific renders into web-ready application plates.

    python3 scripts/prep-application-images.py

Reads  build/application-raw/<slug>.png     (what the model returned: ~2528x1696, ~5MB)
Writes build/application-web/<slug>.jpg     (1536x1024, progressive JPEG, ~250KB)

WHY RESIZE AND RE-ENCODE

The raw renders are 5MB PNGs. Attaching those to 126 product pages would add
roughly 600MB to the media library and put a 5MB image on every product page —
on a trade store whose customers are frequently on a phone at a job site. 1536px
is the widest the plate is ever displayed at, and JPEG is the right container for
a photograph; PNG here is storing photographic noise losslessly for no benefit.

WHY 1536x1024 EXACTLY

It is the reference plate's 3:2, at the width WordPress's `large` size and the
theme's content column actually use. Matching the ratio matters: the model was
asked for 3:2 and letterboxing or cropping later would eat into the black caption
bars, which sit in the bottom 20% and carry the only text in the image.

Idempotent, and skips anything already current.
"""

from __future__ import annotations

import pathlib
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required: pip3 install Pillow")

HERE = pathlib.Path(__file__).resolve().parent
RAW = HERE.parent / "build/application-raw"
WEB = HERE.parent / "build/application-web"

TARGET = (1536, 1024)
QUALITY = 86


def main() -> int:
    if not RAW.is_dir():
        sys.exit(f"no raw renders at {RAW}")

    WEB.mkdir(parents=True, exist_ok=True)

    done = skipped = 0
    total_in = total_out = 0

    for src in sorted(RAW.glob("*.png")):
        dest = WEB / f"{src.stem}.jpg"

        if dest.is_file() and dest.stat().st_mtime >= src.stat().st_mtime:
            skipped += 1
            continue

        im = Image.open(src).convert("RGB")

        # The model honours 3:2 but not always to the pixel. Resize rather than
        # crop — cropping would clip the caption bars at the bottom edge.
        if im.size != TARGET:
            im = im.resize(TARGET, Image.LANCZOS)

        im.save(dest, "JPEG", quality=QUALITY, optimize=True, progressive=True)

        total_in += src.stat().st_size
        total_out += dest.stat().st_size
        done += 1
        print(f"  {src.stem:<34} {src.stat().st_size // 1024:>5} KB -> {dest.stat().st_size // 1024:>4} KB")

    print(f"\n  {done} prepared, {skipped} already current")
    if done:
        print(f"  {total_in / 1e6:.1f}MB -> {total_out / 1e6:.1f}MB ({100 * (1 - total_out / total_in):.0f}% smaller)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
