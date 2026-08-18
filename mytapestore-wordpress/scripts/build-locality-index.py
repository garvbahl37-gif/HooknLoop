#!/usr/bin/env python3
"""Compile the Australian locality list into a file the BROWSER can hold.

    python3 scripts/build-locality-index.py

Writes theme/assets/data/au-localities.txt — 15,318 localities as
`suburb|STATE|postcode`, one per line, ordered by how many addresses each
locality contains.

WHY THIS EXISTS

The address finder used to answer every keystroke with a REST request. Even when
the answer was already cached server-side that cost ~0.7s on the WASM preview,
because the floor is WordPress booting, not the query. Stack a debounce on top
and the shopper waits over a second to see their own suburb.

The whole dataset is 289KB of text, 113KB gzipped — one medium image. Sent once
and held in memory, every subsequent lookup is a string comparison over an array:
no request, no database, no debounce needed, no API key, nothing to install.
That is the difference between "fast" and "instant", and it removes the external
dependency at the same time.

WHY ORDERED BY ADDRESS COUNT

It is the ranking. Typing "sydney" should offer Sydney before Sydney Olympic
Park; "south" should lead with Southbank, not with an alphabetically-earlier
hamlet. Sorting here means the browser can stop at the first N matches without
scoring anything, which is what keeps the search O(matches) rather than O(15,318
× compare) on every keystroke.

WHY A TEXT FILE AND NOT JSON

289KB of lines versus 409KB of JSON, and the browser splits on a newline faster
than it parses an array of arrays. The saving is real on a phone.

SOURCE: theme/data/au-localities.csv — G-NAF derived, MIT licensed. See
theme/data/NOTICE.md. Re-run this whenever that CSV is refreshed.
"""

from __future__ import annotations

import csv
import gzip
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE.parent / "theme/data/au-localities.csv"
OUT = HERE.parent / "theme/assets/data/au-localities.txt"


def main() -> int:
    if not SRC.is_file():
        sys.exit(f"missing {SRC}")

    rows = list(csv.DictReader(SRC.open()))
    if not rows:
        sys.exit("no rows in the source CSV")

    # Biggest localities first — see the note above on why this is the ranking.
    rows.sort(key=lambda r: -int(r.get("count") or 0))

    seen: set[str] = set()
    lines: list[str] = []

    for r in rows:
        locality = (r.get("locality") or "").strip()
        state = (r.get("state") or "").strip()
        postcode = (r.get("postcode") or "").strip()

        if not (locality and state and postcode):
            continue

        # The same suburb name recurs across states, and legitimately — there is
        # a Richmond in five of them. Key on all three so none is dropped, but
        # drop true duplicates.
        key = f"{locality}|{state}|{postcode}"
        if key in seen:
            continue
        seen.add(key)
        lines.append(key)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    blob = "\n".join(lines)
    OUT.write_text(blob, encoding="utf-8")

    raw = len(blob.encode())
    gz = len(gzip.compress(blob.encode(), 9))

    print(f"  wrote {OUT.relative_to(HERE.parent)}")
    print(f"  localities : {len(lines):,}")
    print(f"  size       : {raw/1024:.0f} KB raw, ~{gz/1024:.0f} KB gzipped over the wire")
    print(f"  first rows : {lines[0]}  /  {lines[1]}  /  {lines[2]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
