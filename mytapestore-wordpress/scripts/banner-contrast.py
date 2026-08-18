#!/usr/bin/env python3
"""Decide, per collection banner, whether its caption is white or ink.

WHY THIS EXISTS

The collection banner used to carry a scrim — a 66-90% black wash over the
artwork — so white text was legible whatever the image did. That scrim was
removed on request ("no black tint"), and `.colban--img .colban__scrim` is now
`background: none`. The consequence is that the ARTWORK ITSELF is now the only
thing behind the caption.

Measured across the 42 banners in place when this was written, 27 failed WCAG
AA for body text and 17 failed even the relaxed 3:1 for large text. The worst,
painters-tape.jpg, put white text on a near-white ground at 1.18:1 — text that
is functionally invisible.

There are three ways out, and only one of them is honest:

  · Put the tint back. Rejected: it was removed deliberately and it flattens
    every banner to make a minority of them work.
  · Demand every banner be dark. Fragile — one light image slipped in later and
    the page silently breaks, with nothing to catch it.
  · Measure each banner and let the CAPTION adapt. A light banner gets ink
    text, a dark one gets white. No tint, nothing flattened, and a new banner
    cannot break the page because the colour is derived from the image.

This script does the third. It samples the region the caption actually occupies
and writes theme/inc/banner-tone.php, a slug -> "light"|"dark" map the template
reads to pick a class.

RE-RUN THIS WHENEVER BANNERS CHANGE:
    python3 scripts/banner-contrast.py
"""

from __future__ import annotations

import pathlib
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow required:  pip3 install Pillow")

HERE = pathlib.Path(__file__).resolve().parent
BANNERS = HERE.parent.parent / "mytapestore-redesign/public/img/site/cat"
OUT = HERE.parent / "theme/inc/banner-tone.php"

WHITE = "#ffffff"
INK = "#1f1f1f"

# WCAG AA for body text. The banner carries .colban__desc at a small size, so
# 3:1 (large-text) is not sufficient — 4.5:1 is the bar that matters here.
AA = 4.5


def channel(v: float) -> float:
    v /= 255
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def luminance(px) -> float:
    r, g, b = px[:3]
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def contrast(a: float, b: float) -> float:
    lo, hi = sorted((a, b))
    return (hi + 0.05) / (lo + 0.05)


# The rendered window, which is NOT the whole image.
#
# The desktop band is 4.99:1 and the artwork is 16:9, so `object-fit: cover`
# keeps only 1.78/4.99 = ~36% of the image height. `object-position: center 72%`
# then places that slice low, over the products.
#
# THIS MATTERED. The first version of this script sampled the middle of the
# whole frame and pronounced every banner compliant; measuring the real page
# afterwards found four failures, because the slice actually on screen is lower
# and much brighter than the band that was measured. A contrast checker that
# does not look at the pixels the user sees is worse than none — it produces
# confident, wrong reassurance.
BAND_RATIO = 4.99       # .colban at 1440px wide
IMAGE_RATIO = 16 / 9
OBJECT_POSITION_Y = 0.72

# Horizontal extent of .colban__inner: max-width 840px, centred in 1440px.
CAPTION_X0, CAPTION_X1 = 0.21, 0.79


def caption_luminance(path: pathlib.Path) -> float:
    """Average luminance of the pixels that actually end up behind the caption."""
    im = Image.open(path).convert("RGB")
    w, h = im.size

    visible = min(1.0, IMAGE_RATIO / BAND_RATIO)      # fraction of height kept
    top = (1.0 - visible) * OBJECT_POSITION_Y
    bottom = top + visible

    band = im.crop((
        int(w * CAPTION_X0),
        int(h * top),
        int(w * CAPTION_X1),
        int(h * bottom),
    ))
    return luminance(band.resize((1, 1)).getpixel((0, 0)))


def main() -> int:
    if not BANNERS.is_dir():
        sys.exit(f"missing {BANNERS}")

    white_l = luminance((255, 255, 255))
    ink_l = luminance((31, 31, 31))

    rows: list[tuple[str, str, float, float]] = []

    for path in sorted(BANNERS.glob("*.jpg")):
        if path.stem.endswith(("-800", "-1200")):
            continue

        lum = caption_luminance(path)
        on_white = contrast(lum, white_l)
        on_ink = contrast(lum, ink_l)

        tone = "dark" if on_white >= on_ink else "light"
        rows.append((path.stem, tone, on_white, on_ink))

    light = [r for r in rows if r[1] == "light"]
    failing = [r for r in rows if max(r[2], r[3]) < AA]

    lines = [
        "<?php",
        "/**",
        " * Which caption colour each collection banner needs. GENERATED FILE.",
        " *",
        " * Produced by scripts/banner-contrast.py — do not hand-edit, re-run it.",
        " *",
        " * The banner has no scrim (removed on request), so the artwork is the only",
        " * thing behind the white caption. A light banner therefore needs an INK",
        " * caption or the title is unreadable. Each value here is the measured",
        " * answer for that image, not a guess.",
        " *",
        f" * {len(rows)} banners: {len(rows) - len(light)} dark, {len(light)} light.",
        " *",
        " * @package mytapestore",
        " */",
        "",
        "defined( 'ABSPATH' ) || exit;",
        "",
        "/**",
        " * @return array<string,string> slug => 'light'|'dark'",
        " */",
        "function mts_banner_tones(): array {",
        "\treturn array(",
    ]
    for slug, tone, on_white, on_ink in rows:
        best = max(on_white, on_ink)
        lines.append(f"\t\t'{slug}' => '{tone}', // {best:.1f}:1")
    lines += [
        "\t);",
        "}",
        "",
        "/**",
        " * Caption tone for one category slug. Defaults to 'dark' (white caption),",
        " * which is right for the generic fallback banner.",
        " */",
        "function mts_banner_tone( string $slug ): string {",
        "\treturn mts_banner_tones()[ $slug ] ?? 'dark';",
        "}",
        "",
    ]

    OUT.write_text("\n".join(lines))

    print(f"wrote {OUT.relative_to(HERE.parent)}")
    print(f"  {len(rows)} banners: {len(rows) - len(light)} dark caption, {len(light)} ink caption")
    if failing:
        print(f"  WARNING: {len(failing)} cannot reach {AA}:1 with EITHER colour:")
        for slug, _, on_white, on_ink in failing:
            print(f"    {slug}: best {max(on_white, on_ink):.2f}:1")
    else:
        print(f"  every banner reaches {AA}:1 with its chosen caption colour")
    return 0


if __name__ == "__main__":
    sys.exit(main())
