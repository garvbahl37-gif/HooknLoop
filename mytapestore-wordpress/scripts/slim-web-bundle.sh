#!/usr/bin/env bash
#
# Second pass: get build/site down to something a browser will actually download.
#
# The first pass (build-web-bundle.sh) copies and does the safe, structural
# trimming. This one is the aggressive pass, and it is separate for a reason: it
# is lossy, it is slow, and it is the part you re-tune. Keeping it apart means
# re-running it does not mean re-copying 439MB.
#
# WHAT PASS ONE LEFT, AND WHY IT IS STILL TOO BIG
#
#   177M  wp-content/uploads                  2,033 images at ~90KB each
#    65M  wp-content/plugins/woocommerce      19M of it is the Blocks client bundle
#    55M  wp-content/themes/*/assets/img      27M of which is referenced NOWHERE
#    65M  wp-includes                         WordPress core, mostly block editor JS
#
# The images are not individually fat — there are simply two thousand of them.
# Re-encoding at demo dimensions is the only lever that moves a number like that.
#
# WHAT IS DELIBERATELY NOT DONE HERE
#
# The SQLite database is not touched. Attachment paths, serialized
# _wp_attachment_metadata and every hardcoded src in imported post content all
# refer to files by name, so files are re-encoded IN PLACE under their existing
# names. Nothing in the database has to know this ran.
#
# Usage:
#   scripts/slim-web-bundle.sh [dir]     (default: build/site)

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="${1:-$HERE/build/site}"

[ -d "$DIR" ] || { echo "missing $DIR — run scripts/build-web-bundle.sh first" >&2; exit 1; }

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
size() { du -sh "$1" 2>/dev/null | cut -f1; }

say "start: $(size "$DIR")"

# --- 1. artwork the theme never asks for -------------------------------------
# `assets/img/products` and `assets/img/categories` are packaged leftovers from
# the React redesign. Verified with a grep across every .php, .css and .js in the
# theme: ZERO references to either. 29MB for files nothing can render.
say "1/5  dropping unreferenced theme artwork"
THEME_IMG="$DIR/wp-content/themes/mytapestore/assets/img"
rm -rf "$THEME_IMG/products" "$THEME_IMG/categories"
echo "     theme assets now: $(size "$DIR/wp-content/themes/mytapestore/assets")"

# --- 2. WooCommerce Blocks ----------------------------------------------------
# assets/client is the Blocks/React front end: the Cart and Checkout BLOCKS, and
# the block editor integration. This store uses the CLASSIC shortcode cart and
# checkout — woocommerce/checkout/form-checkout.php and cart/cart.php are real
# PHP templates in the theme — and functions.php dequeues every vendor stylesheet
# anyway. The Store API the cart and product pages call lives in PHP under src/,
# which is untouched.
say "2/5  dropping the WooCommerce Blocks client bundle"
WC="$DIR/wp-content/plugins/woocommerce"
# ...but assets/client/admin has to stay, and this was learned the hard way.
#
# The line below used to remove assets/client wholesale, on the note that
# "wp-admin is not reachable in this demo". That stopped being true the moment
# the preview was set to open on /wp-admin/, and the result was not a missing
# stylesheet — it was a WHITE SCREEN:
#
#   Uncaught Exception: Could not find asset registry for wp-admin-scripts
#   WCAdminAssets::get_script_asset_filename('wp-admin-scripts', 'command-palette')
#
# WooCommerce reads an asset manifest at admin boot and throws if it is absent,
# so every admin page died. assets/client/admin is 15MB of the 19MB; the Blocks
# front-end client (the rest) is still dropped, because this theme is classic
# and never renders Cart or Checkout blocks.
if [ -d "$WC/assets/client/admin" ]; then
  ADMIN_KEEP="$(mktemp -d)"
  cp -R "$WC/assets/client/admin" "$ADMIN_KEEP/admin"
fi

if [ -d "$WC/assets/client" ]; then
  echo "     before: $(size "$WC")"
  rm -rf "$WC/assets/client"

  # Put the admin client back. Without it wp-admin throws before rendering.
  if [ -n "${ADMIN_KEEP:-}" ] && [ -d "$ADMIN_KEEP/admin" ]; then
    mkdir -p "$WC/assets/client"
    cp -R "$ADMIN_KEEP/admin" "$WC/assets/client/admin"
    rm -rf "$ADMIN_KEEP"
    echo "     kept:   assets/client/admin (wp-admin needs its asset registry)"
  fi

  # Admin-only imagery: marketing screenshots, onboarding art, activity panels.
  # The only front-end image WooCommerce serves is the product placeholder, which
  # lives in wp-content/uploads, not here.
  find "$WC/assets/images" -type d \( -name 'marketplace' -o -name 'onboarding' -o -name 'obw-*' \) -prune -exec rm -rf {} + 2>/dev/null || true
  echo "     after:  $(size "$WC")"
fi

# --- 3. core weight the front end never loads --------------------------------
say "3/5  trimming WordPress core"
# wp-admin is not reachable in this demo and is not what is being showcased.
# Removing it does NOT break the front end: nothing in wp-includes requires it,
# and WordPress only loads wp-admin/* on an admin request.
rm -rf "$DIR/wp-admin"
# The block editor's JS lives in wp-includes/js/dist and is loaded only by the
# editor and by block themes. This is a classic theme that dequeues block assets
# explicitly (see mts_disable_block_styles).
rm -rf "$DIR/wp-includes/js/dist/development" 2>/dev/null || true
find "$DIR/wp-includes" -name '*.map' -delete 2>/dev/null || true
find "$DIR" -type d -name 'languages' -prune -exec rm -rf {} + 2>/dev/null || true
echo "     wp-includes: $(size "$DIR/wp-includes")"

# --- 4. the images ------------------------------------------------------------
# 1400px cap: the widest a product image is ever painted is the PDP main frame at
# ~700 CSS px, doubled for retina. The collection banner is the one exception and
# is served from the theme, which is capped separately below.
say "4/5  re-encoding images for the web"
python3 - "$DIR/wp-content/uploads" 1400 62 <<'PY'
import pathlib, subprocess, sys, shutil

root, cap, quality = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
if not root.exists():
    sys.exit(0)

exts = {'.jpg', '.jpeg', '.png', '.webp'}
files = [p for p in root.rglob('*') if p.suffix.lower() in exts and p.is_file()]
before = sum(p.stat().st_size for p in files)
smaller = 0

for i, p in enumerate(files, 1):
    tmp = p.with_suffix(p.suffix + '.tmp')
    try:
        r = subprocess.run(
            ['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', quality,
             '-Z', cap, str(p), '--out', str(tmp)],
            capture_output=True,
        )
        if r.returncode == 0 and tmp.exists() and tmp.stat().st_size < p.stat().st_size:
            shutil.move(str(tmp), str(p))
            smaller += 1
        else:
            tmp.unlink(missing_ok=True)
    except Exception:
        tmp.unlink(missing_ok=True)
    if i % 400 == 0:
        print(f'     {i}/{len(files)} …', flush=True)

after = sum(p.stat().st_size for p in files if p.exists())
print(f'     {len(files)} images, {smaller} shrunk: {before/1e6:.0f}MB → {after/1e6:.0f}MB')
PY

# The theme's own artwork — banners, hero slides, industry tiles. Capped wider
# because the collection banner really is painted at 100vw.
python3 - "$DIR/wp-content/themes/mytapestore/assets/img" 2000 68 <<'PY'
import pathlib, subprocess, sys, shutil
root, cap, quality = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
if not root.exists():
    sys.exit(0)
files = [p for p in root.rglob('*') if p.suffix.lower() in {'.jpg','.jpeg','.png'} and p.is_file()]
before = sum(p.stat().st_size for p in files)
for p in files:
    tmp = p.with_suffix(p.suffix + '.tmp')
    try:
        r = subprocess.run(['sips','-s','format','jpeg','-s','formatOptions',quality,
                            '-Z',cap,str(p),'--out',str(tmp)], capture_output=True)
        if r.returncode == 0 and tmp.exists() and tmp.stat().st_size < p.stat().st_size:
            shutil.move(str(tmp), str(p))
        else:
            tmp.unlink(missing_ok=True)
    except Exception:
        tmp.unlink(missing_ok=True)
after = sum(p.stat().st_size for p in files if p.exists())
print(f'     theme artwork: {before/1e6:.0f}MB → {after/1e6:.0f}MB')
PY

# --- 5. result ----------------------------------------------------------------
say "5/5  done"
echo "     bundle: $(size "$DIR")"
du -sh "$DIR"/wp-content/* 2>/dev/null | sort -rh | head -5
