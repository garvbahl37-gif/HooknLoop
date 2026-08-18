#!/usr/bin/env bash
#
# Install newly supplied collection-banner artwork.
#
# WHY THIS EXISTS
#
# The packaged banners are all 1600×893 (1.79:1) and the band they sit in is
# roughly 4:1 — so `object-fit: cover` throws away the top and bottom third of
# every image and upscales what is left across a 2000px-wide strip. That is what
# "the banners are blurry" was: not soft source files, but a hard crop and an
# upscale. Wider source art at ~3:1 crops far less and never upscales.
#
# It also writes the -1200 and -800 variants that mts_banner_srcset() offers, so
# a phone downloads ~90KB instead of ~700KB.
#
# WHERE THE FILES GO
#
# mytapestore-redesign/public/img/site/cat/ — NOT the theme. build-css.sh
# rsyncs public → theme with --delete, so anything written only into
# theme/assets/img is erased on the next build. That trap has already cost this
# project two rounds of banner and icon artwork.
#
# Usage:
#   scripts/install-banners.sh <slug>=<source-image> [<slug>=<source-image> …]
#
# Example:
#   scripts/install-banners.sh hook-loop-tapes=~/Downloads/hl.png

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEST="$ROOT/mytapestore-redesign/public/img/site/cat"

[ -d "$DEST" ] || { echo "missing $DEST" >&2; exit 1; }
[ "$#" -gt 0 ] || { echo "usage: $0 <slug>=<image> […]" >&2; exit 1; }

for pair in "$@"; do
  slug="${pair%%=*}"
  src="${pair#*=}"
  # shellcheck disable=SC2088
  src="${src/#\~/$HOME}"

  [ -f "$src" ] || { echo "  SKIP $slug — no such file: $src" >&2; continue; }

  w=$(sips -g pixelWidth  "$src" | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$src" | awk '/pixelHeight/{print $2}')

  # Never replace sharp art with something smaller — the exact mistake that made
  # the industry banners worse the first time round.
  if [ -f "$DEST/$slug.jpg" ]; then
    old=$(sips -g pixelWidth "$DEST/$slug.jpg" | awk '/pixelWidth/{print $2}')
    if [ "$w" -lt "$old" ]; then
      echo "  SKIP $slug — ${w}px is narrower than the existing ${old}px" >&2
      continue
    fi
  fi

  sips -s format jpeg -s formatOptions 86 "$src" --out "$DEST/$slug.jpg" >/dev/null
  for width in 1200 800; do
    sips -s format jpeg -s formatOptions 82 -Z "$width" "$src" --out "$DEST/$slug-$width.jpg" >/dev/null
    # -Z fits the LONGEST edge, which for a landscape banner is the width.
  done

  size=$(du -h "$DEST/$slug.jpg" | cut -f1)
  printf "  %-26s %sx%s  %.2f:1  %s\n" "$slug" "$w" "$h" "$(echo "$w/$h" | bc -l)" "$size"
done

echo
echo "written to $DEST"
echo "run scripts/build-css.sh to sync them into the theme."
