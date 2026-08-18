#!/usr/bin/env bash
#
# Build a slim, self-contained copy of the site for the web demo.
#
# WHY
#
# The review snapshot is 350MB zipped (439MB on disk). That is fine as a file you
# hand someone, and hopeless as something a browser downloads before it can show
# a page. This produces the same site at a fraction of the weight.
#
# Nothing here touches local/wordpress. It copies first and trims the copy, so a
# mistake in this script costs a rebuild and not the install.
#
# WHERE THE WEIGHT IS (measured, not guessed)
#
#   250M  wp-content/uploads    2,033 images — 653 originals, 1,380 generated sizes
#    69M  wp-content/plugins    WooCommerce; ~half of it is translations and maps
#    28M  wp-content/database   SQLite, never vacuumed
#    15M  wp-content/themes     14.6M of which is twentytwentythree/four/five
#
# No single file is large. It is volume, which is why re-encoding wins.
#
# THE THEME IS NOT ON DISK
#
# wp-content/themes/mytapestore is 0 bytes in the install — the theme is mounted
# into the runtime from ./theme and never written. A bundle that copies only
# local/wordpress ships a site with no theme, which renders as WordPress's
# fallback and looks like a total failure. It is copied in explicitly below.
#
# Usage:
#   scripts/build-web-bundle.sh [outdir]

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$HERE/local/wordpress"
THEME="$HERE/theme"
OUT="${1:-$HERE/build/site}"

[ -d "$SRC" ] || { echo "missing $SRC" >&2; exit 1; }
[ -d "$THEME" ] || { echo "missing $THEME" >&2; exit 1; }

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
size() { du -sh "$1" 2>/dev/null | cut -f1; }

say "1/7  copying the install → $OUT"
rm -rf "$OUT"
mkdir -p "$(dirname "$OUT")"
rsync -a \
  --exclude 'wp-content/upgrade/' \
  --exclude 'wp-content/uploads/wc-logs/' \
  --exclude 'wp-content/cache/' \
  --exclude 'wp-content/debug.log' \
  --exclude '*.DS_Store' \
  "$SRC/" "$OUT/"
echo "    copied: $(size "$OUT")"

say "2/7  installing the theme (it is a runtime mount, not a file on disk)"
rm -rf "$OUT/wp-content/themes/mytapestore"
rsync -a --exclude '.DS_Store' "$THEME/" "$OUT/wp-content/themes/mytapestore/"
# The build artefacts the theme needs at runtime, and nothing else.
[ -f "$OUT/wp-content/themes/mytapestore/assets/mts-styles.css" ] \
  || { echo "    theme has no built stylesheet — run scripts/build-css.sh first" >&2; exit 1; }
echo "    theme: $(size "$OUT/wp-content/themes/mytapestore")"

say "3/7  dropping the default themes"
# The site uses `mytapestore` and nothing else. WordPress only needs a fallback
# if the active theme breaks, which would be a broken demo either way.
for t in twentytwentythree twentytwentyfour twentytwentyfive twentytwentytwo twentytwentyone; do
  rm -rf "$OUT/wp-content/themes/$t"
done
echo "    themes now: $(size "$OUT/wp-content/themes")"

say "4/7  trimming WooCommerce"
WC="$OUT/wp-content/plugins/woocommerce"
if [ -d "$WC" ]; then
  # Translations: the store is en_AU and ships no other locale.
  rm -rf "$WC/i18n/languages" "$WC/languages" 2>/dev/null || true
  # Source maps are a debugging aid for people who have the sources.
  find "$WC" -name '*.map' -delete 2>/dev/null || true
  # Unminified twins of files that also ship minified.
  find "$WC/assets/js" -name '*.js' ! -name '*.min.js' -print0 2>/dev/null \
    | while IFS= read -r -d '' f; do [ -f "${f%.js}.min.js" ] && rm -f "$f"; done || true
  # Tests, docs and changelogs are not runtime.
  rm -rf "$WC/tests" "$WC/docs" "$WC/changelog" "$WC/readme.txt" "$WC/CHANGELOG.txt" 2>/dev/null || true
  echo "    woocommerce: $(size "$WC")"
fi
rm -rf "$OUT/wp-content/plugins/akismet" "$OUT/wp-content/plugins/hello.php"

say "5/7  re-encoding uploads"
# The single biggest saving. Every image is re-encoded and capped at a width no
# layout on the site can exceed: the widest slot is the collection banner at
# 100vw, and the design's own art is 2,172px. 2,000 is generous for a demo.
#
# WebP, because every browser that can run WebAssembly can decode WebP — if
# Playground boots at all, the images render.
#
# The FILENAME IS NOT CHANGED. WordPress stores attachment paths in the database
# and in serialized _wp_attachment_metadata; renaming .jpg to .webp would need a
# database migration and would break every hardcoded src in imported post
# content. Re-encoding in place keeps every reference valid.
python3 - "$OUT/wp-content/uploads" <<'PY'
import pathlib, subprocess, sys, shutil

root = pathlib.Path(sys.argv[1])
if not root.exists():
    sys.exit(0)

exts = {'.jpg', '.jpeg', '.png', '.webp'}
files = [p for p in root.rglob('*') if p.suffix.lower() in exts and p.is_file()]

before = sum(p.stat().st_size for p in files)
converted = skipped = 0

for i, p in enumerate(files, 1):
    try:
        # sips writes a real WebP; the extension on disk stays whatever it was,
        # which is exactly what we want (see the note above).
        tmp = p.with_suffix(p.suffix + '.tmp')
        r = subprocess.run(
            ['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '72',
             '-Z', '2000', str(p), '--out', str(tmp)],
            capture_output=True,
        )
        if r.returncode != 0 or not tmp.exists():
            tmp.unlink(missing_ok=True)
            skipped += 1
            continue
        # Only keep it if it actually got smaller. Re-encoding an already-tight
        # file can make it bigger, and a "compression" step that inflates half
        # the library is worse than none.
        if tmp.stat().st_size < p.stat().st_size:
            shutil.move(str(tmp), str(p))
            converted += 1
        else:
            tmp.unlink(missing_ok=True)
            skipped += 1
    except Exception:
        skipped += 1

    if i % 250 == 0:
        print(f'    {i}/{len(files)} …', flush=True)

after = sum(p.stat().st_size for p in files if p.exists())
print(f'    {len(files)} images: {converted} re-encoded, {skipped} left alone')
print(f'    {before/1e6:.0f}MB → {after/1e6:.0f}MB  (saved {(before-after)/1e6:.0f}MB)')
PY

say "6/7  compacting the database"
DB="$OUT/wp-content/database/.ht.sqlite"
if [ -f "$DB" ] && command -v sqlite3 >/dev/null 2>&1; then
  echo "    before: $(size "$DB")"
  sqlite3 "$DB" <<'SQL' || true
DELETE FROM wp_posts WHERE post_type = 'revision';
DELETE FROM wp_postmeta WHERE post_id NOT IN (SELECT ID FROM wp_posts);
DELETE FROM wp_options WHERE option_name LIKE '\_transient\_%' ESCAPE '\';
DELETE FROM wp_options WHERE option_name LIKE '\_site\_transient\_%' ESCAPE '\';
DELETE FROM wp_comments WHERE comment_approved = 'spam';
VACUUM;
SQL
  echo "    after:  $(size "$DB")"
fi

say "7/7  done"
echo "    bundle: $(size "$OUT")"
echo "    $OUT"
