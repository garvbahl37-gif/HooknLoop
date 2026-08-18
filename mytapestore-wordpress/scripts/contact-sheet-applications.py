#!/usr/bin/env python3
"""Lay the generated application plates out as contact sheets for review.

    python3 scripts/contact-sheet-applications.py [per-sheet]

Writes build/application-review/sheet-N.jpg.

WHY SHEETS AND NOT ONE-BY-ONE

Thirty-one plates have to be checked for two things a generator gets wrong
quietly: a caption that is misspelled, and an application that is not what the
tape is actually for. Both need eyes on the image. Reviewing them individually is
thirty-one separate looks; six to a sheet is six.

The plates are laid out at a width that keeps the caption bars legible, because
caption spelling is the single most likely defect — image models render text as
confident gibberish more often than they render a wrong bench. Each plate is
labelled with its slug above it so a defect can be traced back to the file
without counting positions.
"""

from __future__ import annotations

import pathlib
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("Pillow is required")

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE.parent / "build/application-raw"
OUT = HERE.parent / "build/application-review"

PLATE_W = 980          # wide enough that the black-bar captions stay readable
LABEL_H = 34
PAD = 12


def font(size: int):
    for p in (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ):
        if pathlib.Path(p).is_file():
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def main(argv: list[str]) -> int:
    per = int(argv[1]) if len(argv) > 1 else 6

    plates = sorted(SRC.glob("*.png"))
    if not plates:
        sys.exit(f"no plates in {SRC}")

    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("sheet-*.jpg"):
        old.unlink()

    f = font(20)
    cols = 2
    sheets = 0

    for start in range(0, len(plates), per):
        batch = plates[start:start + per]
        rows = (len(batch) + cols - 1) // cols

        cell_w = PLATE_W
        cell_h = int(PLATE_W * 2 / 3) + LABEL_H

        canvas = Image.new(
            "RGB",
            (cols * cell_w + (cols + 1) * PAD, rows * cell_h + (rows + 1) * PAD),
            (236, 232, 226),
        )
        d = ImageDraw.Draw(canvas)

        for i, p in enumerate(batch):
            r, c = divmod(i, cols)
            x = PAD + c * (cell_w + PAD)
            y = PAD + r * (cell_h + PAD)

            d.text((x + 2, y + 6), p.stem, fill=(20, 20, 20), font=f)

            im = Image.open(p).convert("RGB")
            im = im.resize((cell_w, int(PLATE_W * 2 / 3)), Image.LANCZOS)
            canvas.paste(im, (x, y + LABEL_H))

        sheets += 1
        dest = OUT / f"sheet-{sheets}.jpg"
        canvas.save(dest, "JPEG", quality=88, optimize=True)
        print(f"  {dest.name}  {len(batch)} plates  {dest.stat().st_size // 1024} KB")

    print(f"\n  {len(plates)} plates across {sheets} sheet(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
