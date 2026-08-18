#!/usr/bin/env python3
"""Cut one collection banner to the two shapes the page uses.

    python3 scripts/build-banners.py ~/Downloads/shot.png glazing-tapes

WHAT THIS SOLVES, AND WHY IT IS NOT JUST A CROP

The band is 4.99:1 on desktop and 2.07:1 on a phone. Artwork arrives at 16:9.
Cropping to either ratio with a fixed anchor cuts products off, and it took
several rounds of getting that wrong to see why: the tapes occupy 23% of the
frame height in one photograph and 76% in another. No single anchor, ratio or
`object-position` can serve that spread — one setting always cuts something.

So the frame is built around each photograph's OWN product cluster:

  1. Find the rows containing product, by horizontal detail energy. A studio
     sweep varies smoothly across a row; a row of rolls does not. This survives
     the cream sets, where a plain difference-from-background test was defeated
     by wall texture and plant shadows.
  2. Size the window to that cluster plus a margin, and centre it.
  3. If the cluster is taller than a full-width window can hold — true for 11 of
     the first 19 — widen the canvas rather than cut the tapes, filling the
     extra width per row with THAT ROW'S own edge colour. Because the fill
     starts at the exact pixel it continues, the join has no seam. A blurred
     stretched strip was tried first and showed hard vertical edges.
  4. Darken only as far as white type demands, measured on the strip the caption
     actually occupies — not the whole frame. cloth-double-sided-tape shipped at
     2.69:1 while its whole-frame average looked fine, because the title lands
     on a row of white rolls.

AFTERWARDS: run scripts/build-css.sh to sync the artwork into the theme. The
theme reads theme/assets/img, not the redesign source, and forgetting this step
means the site keeps serving the old file while every measurement passes.
"""

from __future__ import annotations

import pathlib
import sys

try:
    import numpy as np
    from PIL import Image, ImageEnhance
except ImportError:
    sys.exit("needs Pillow and numpy:  pip3 install Pillow numpy")

HERE = pathlib.Path(__file__).resolve().parent
DST = HERE.parent.parent / "mytapestore-redesign/public/img/site/cat"

DESKTOP_RATIO = 4.99      # .colban at >=900px
MOBILE_RATIO = 2.07       # .colban on a 390px phone
MARGIN = 0.06             # breathing room above and below the cluster
TARGET = 4.6              # white on the caption strip; 4.5 + JPEG headroom

DESKTOP_WIDTHS = (2000, 1440, 1000)
MOBILE_WIDTHS = (1200, 800, 500)


def _chan(v: float) -> float:
    v /= 255
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def _lum(px) -> float:
    r, g, b = px[:3]
    return 0.2126 * _chan(r) + 0.7152 * _chan(g) + 0.0722 * _chan(b)


def caption_contrast(im: Image.Image) -> float:
    """White against the 840px-wide centre column the caption occupies."""
    w, h = im.size
    strip = im.crop((int(w * 0.21), int(h * 0.18), int(w * 0.79), int(h * 0.82)))
    return 1.05 / (_lum(strip.resize((1, 1)).getpixel((0, 0))) + 0.05)


def darken(im: Image.Image) -> Image.Image:
    for _ in range(30):
        if caption_contrast(im) >= TARGET:
            return im
        im = ImageEnhance.Brightness(im).enhance(0.93)
    return im


def product_band(im: Image.Image) -> tuple[float, float]:
    """(top, bottom) of the product cluster as fractions of image height."""
    g = np.asarray(im.convert("L").resize((im.width // 3, im.height // 3))).astype(float)
    d = np.abs(np.diff(g, axis=1)).mean(axis=1)
    d = (d - d.min()) / (d.max() - d.min() + 1e-9)
    rows = np.where(d > 0.22)[0]
    if len(rows) == 0:
        return 0.5, 0.95
    # Largest contiguous run, so a plant frond in one corner cannot drag the
    # band across the whole frame.
    runs = np.split(rows, np.where(np.diff(rows) > 3)[0] + 1)
    run = max(runs, key=len)
    return run.min() / len(d), run.max() / len(d)


def scene_frame(im: Image.Image, ratio: float) -> Image.Image:
    """Framing for an industry photograph rather than products on a sweep.

    product_band() looks for a cluster of objects against calm background. An
    industry scene has no such cluster — the whole frame is content — so it
    returns something arbitrary and the crop lands wherever.

    These are shot 21:9 with the subject across the middle and dark structure
    above, so a centre crop is right. Biased slightly above centre because the
    bottom of a wide interior shot is usually floor.
    """
    w, h = im.size
    win = int(w / ratio)
    if win >= h:
        need = int(h * ratio)
        x0 = (w - need) // 2
        return im.crop((x0, 0, x0 + need, h))
    top = max(0, min(h - win, int((h - win) * 0.42)))
    return im.crop((0, top, w, top + win))


def frame(im: Image.Image, ratio: float, y0: float, y1: float) -> Image.Image:
    w, h = im.size
    top = max(0.0, y0 - MARGIN)
    bot = min(1.0, y1 + MARGIN)
    win = int((bot - top) * h)
    cy = int((top + bot) / 2 * h)
    t = max(0, min(h - win, cy - win // 2))
    need = int(win * ratio)

    if need <= w:
        x0 = (w - need) // 2
        return im.crop((x0, t, x0 + need, t + win))

    strip = im.crop((0, t, w, t + win))
    out = Image.new("RGB", (need, win))
    left = (need - w) // 2
    out.paste(strip, (left, 0))

    a = np.asarray(strip)
    lcol = a[:, :12].mean(axis=1).astype(np.uint8)
    rcol = a[:, -12:].mean(axis=1).astype(np.uint8)
    out.paste(Image.fromarray(np.repeat(lcol[:, None, :], left, axis=1)), (0, 0))
    out.paste(Image.fromarray(np.repeat(rcol[:, None, :], need - w - left, axis=1)), (left + w, 0))
    return out


def build(src: pathlib.Path, slug: str, scene: bool = False) -> None:
    im = Image.open(src).convert("RGB")
    y0, y1 = (0.0, 1.0) if scene else product_band(im)

    def cut(ratio):
        return scene_frame(im, ratio) if scene else frame(im, ratio, y0, y1)

    desktop = darken(cut(DESKTOP_RATIO))
    for w in DESKTOP_WIDTHS:
        name = f"{slug}-wide.jpg" if w == DESKTOP_WIDTHS[0] else f"{slug}-wide-{w}.jpg"
        desktop.resize((w, int(w / DESKTOP_RATIO)), Image.LANCZOS).save(
            DST / name, "JPEG", quality=88, optimize=True, progressive=True
        )

    mobile = darken(cut(MOBILE_RATIO))
    for w in MOBILE_WIDTHS:
        name = f"{slug}.jpg" if w == MOBILE_WIDTHS[0] else f"{slug}-{w}.jpg"
        mobile.resize((w, int(w / MOBILE_RATIO)), Image.LANCZOS).save(
            DST / name, "JPEG", quality=88, optimize=True, progressive=True
        )

    fill = max(0, round((desktop.width - im.width) / desktop.width * 100))
    print(f"  {slug}  [{'scene' if scene else 'product'}]")
    if not scene:
        print(f"    tapes occupy   {y0*100:.0f}%-{y1*100:.0f}% of frame height")
    print(f"    desktop        {desktop.size}  side fill {fill}%")
    print(f"    mobile         {mobile.size}")
    print(f"    caption white  {min(caption_contrast(desktop), caption_contrast(mobile)):.2f}:1")


def main(argv: list[str]) -> int:
    args = [a for a in argv[1:] if a != "--scene"]
    scene = "--scene" in argv
    if len(args) != 2:
        print(__doc__)
        return 1
    src = pathlib.Path(args[0]).expanduser()
    if not src.is_file():
        sys.exit(f"no such file: {src}")
    build(src, args[1], scene=scene)
    print("\n  now run scripts/build-css.sh to sync it into the theme")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
