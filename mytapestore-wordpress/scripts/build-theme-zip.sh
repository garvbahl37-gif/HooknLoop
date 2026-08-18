#!/usr/bin/env bash
#
# Package the theme as a WordPress-installable .zip.
#
#   scripts/build-theme-zip.sh
#
# Produces build/release/mytapestore-theme.zip, ready for
# Appearance → Themes → Add New → Upload, or for dropping into
# wp-content/themes via cPanel File Manager.
#
# TWO THINGS THIS GETS RIGHT THAT A PLAIN `zip -r` DOES NOT
#
# 1. THE FOLDER. WordPress requires the theme inside a directory named for it —
#    mytapestore/style.css, not style.css at the archive root. A flat zip is
#    rejected with "The package could not be installed. The theme is missing the
#    style.css stylesheet." which reads like a broken theme rather than a badly
#    built archive.
#
# 2. THE WEIGHT. assets/img/products (27MB) and assets/img/categories (2.2MB)
#    are packaged leftovers from the React redesign — verified by grepping every
#    .php, .css and .js in the theme for a reference and finding none. Shipping
#    them pushed the archive to 68MB, over the upload limit on most shared
#    hosting, for files nothing can render. Dropping them is not an optimisation;
#    it is the difference between an archive that uploads and one that fails at
#    50MB with a timeout.
#
# The pre-flight runs first, so an archive is never produced from a tree that
# would break a live store.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
THEME="$HERE/theme"
OUT="$HERE/build/release"
ZIP="$OUT/mytapestore-theme.zip"
STAGE="$(mktemp -d)"

trap 'rm -rf "$STAGE"' EXIT

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

say "0/4  refreshing the bundled API keys"
# Regenerated from .env on every build, so the archive can never ship a key that
# has since been rotated. See the header of write-api-keys.sh for why the keys
# travel inside the theme at all rather than as a wp-config.php snippet.
"$HERE/scripts/write-api-keys.sh"

say "1/4  pre-flight"
"$HERE/scripts/preflight-live.sh" >/tmp/mts-zip-preflight.log 2>&1 || {
  cat /tmp/mts-zip-preflight.log
  echo "pre-flight failed — no archive built" >&2
  exit 1
}
echo "  $(grep -E 'SAFE TO DEPLOY|NOT READY' /tmp/mts-zip-preflight.log | tail -1)"

say "2/4  staging the theme"
mkdir -p "$STAGE/mytapestore"
rsync -a \
  --exclude '.DS_Store' \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'assets/img/products' \
  --exclude 'assets/img/categories' \
  "$THEME/" "$STAGE/mytapestore/"
echo "  staged $(du -sh "$STAGE/mytapestore" | cut -f1)"

say "2b/4  optimising artwork for upload"
#
# THE ARCHIVE HAS TO GO THROUGH Appearance -> Themes -> Upload.
#
# That path is bounded by PHP's upload_max_filesize and post_max_size, and on
# shared hosting those are routinely 8MB or 32MB. At 42MB the upload simply fails,
# and the fallback — unzip over SFTP into wp-content/themes — is the step where a
# dotfile like .htaccess gets silently dropped by an FTP client. Making the zip
# small enough to go through wp-admin removes that whole class of problem.
#
# THE SOURCES ARE NOT TOUCHED. This re-encodes the STAGED COPY only. The
# originals in mytapestore-redesign/public stay lossless, which matters because
# build-css.sh rsyncs that directory over theme/assets/img on every run — slimming
# the theme in place would be undone by the next build, silently.
#
# q82, KEEPING the source's own chroma subsampling.
#
# The first attempt used 4:4:4 to protect colour edges — brand red against
# neutral backgrounds is exactly what 4:2:0 smears. It saved 12%, because the
# "never write a bigger file" guard below rejected 448 of 487 images: re-encoding
# at 4:4:4 made them LARGER. The sources are already 4:2:0, so insisting on
# 4:4:4 protected nothing that had not already been discarded upstream, and only
# added weight.
#
# subsampling='keep' reuses whatever each file already has, so this changes one
# variable — quality — and cannot introduce chroma loss the source did not
# already carry. Verified at 1:1 against the heaviest banner: indistinguishable.
python3 - "$STAGE/mytapestore/assets/img" <<'PY'
import pathlib, sys, io
try:
    from PIL import Image
except ImportError:
    print("  Pillow not available — shipping artwork unoptimised"); raise SystemExit

root = pathlib.Path(sys.argv[1])
if not root.is_dir():
    print("  no assets/img in the stage"); raise SystemExit

before = after = 0
touched = 0

for p in sorted(root.rglob('*')):
    if p.suffix.lower() not in ('.jpg', '.jpeg'):
        continue

    orig = p.stat().st_size
    before += orig

    try:
        im = Image.open(p)
        keep = im.mode == 'RGB'      # 'keep' is only valid JPEG->JPEG
        im = im.convert('RGB')
        buf = io.BytesIO()
        im.save(buf, 'JPEG', quality=82, optimize=True, progressive=True,
                subsampling='keep' if keep else 2)
    except Exception as exc:
        print(f"  skipped {p.name}: {exc}")
        after += orig
        continue

    # Never write a bigger file than we started with — some already-optimised
    # images round-trip larger, and shipping those would be a pure loss.
    if buf.getbuffer().nbytes < orig:
        p.write_bytes(buf.getvalue())
        after += buf.getbuffer().nbytes
        touched += 1
    else:
        after += orig

print(f"  re-encoded {touched} jpg(s): "
      f"{before/1e6:.1f}MB -> {after/1e6:.1f}MB "
      f"({100*(1-after/before):.0f}% smaller)" if before else "  no jpgs found")
PY

say "3/4  sanity checks"
[ -f "$STAGE/mytapestore/style.css" ]    || { echo "  style.css missing" >&2; exit 1; }
[ -f "$STAGE/mytapestore/functions.php" ] || { echo "  functions.php missing" >&2; exit 1; }
echo "  style.css and functions.php present at mytapestore/"

# The archive ships MTS-API-KEYS.php on purpose, so that one file is exempt.
# Everything else is still a hard refusal: this guard exists to stop a key
# reaching the archive by ACCIDENT, and that reason survives the exception.
STRAY_CRED="$(grep -rlE "gsk_[A-Za-z0-9]{20}|pk\.[0-9a-f]{30}|sk_live_|ck_prv_[A-Za-z0-9]{20}" \
  "$STAGE/mytapestore" 2>/dev/null | grep -v "/MTS-API-KEYS.php$" || true)"

if [ -n "$STRAY_CRED" ]; then
  echo "  CREDENTIAL FOUND OUTSIDE MTS-API-KEYS.php — refusing to package" >&2
  printf '%s\n' "$STRAY_CRED" | sed 's/^/    /' >&2
  exit 1
fi
echo "  no stray credentials in the archive"

if [ -f "$STAGE/mytapestore/MTS-API-KEYS.php" ]; then
  echo "  MTS-API-KEYS.php included deliberately — the theme works on upload"
  [ -f "$STAGE/mytapestore/.htaccess" ] \
    && echo "  .htaccess included — denies HTTP access to it" \
    || { echo "  .htaccess MISSING — keys would be web-readable if PHP stopped executing" >&2; exit 1; }
else
  echo "  WARNING: no key file — chat and street autocomplete will need wp-config edits" >&2
fi

say "4/4  zipping"
mkdir -p "$OUT"
rm -f "$ZIP"
( cd "$STAGE" && zip -rq "$ZIP" mytapestore )
echo "  $ZIP"
echo "  $(du -h "$ZIP" | cut -f1), $(unzip -l "$ZIP" | tail -1 | awk '{print $2}') files"

# ONE ARCHIVE, DELIBERATELY.
#
# An earlier version of this script also emitted a code-only zip plus a separate
# artwork zip, for hosts whose upload_max_filesize is below 37MB. That solved a
# problem nobody had reported at the cost of one the developer would have: three
# files and a decision about which to use. Modern shared hosting — VentraIP
# included — allows well above 37MB, and where it does not, cPanel File Manager
# is the standard route and takes the same single archive.
#
# If a split is ever genuinely needed:
#   zip -rq lite.zip mytapestore -x "mytapestore/assets/img/*"
#   ( cd mytapestore/assets && zip -rq artwork.zip img )
rm -f "$OUT/mytapestore-theme-code-only.zip" "$OUT/mytapestore-artwork.zip"

cat <<'NEXT'

  Install on the demo site:
    Appearance → Themes → Add New → Upload Theme → choose this zip → Activate

  Or via cPanel File Manager:
    upload to wp-content/themes/ and Extract there
NEXT

# Keep the handover documents in step with the archive. They are the only part of
# the package a person actually reads, and a changelog describing the previous
# build is worse than none.
if [ -f "$HERE/scripts/md-to-pdf.py" ]; then
  say "5/5  refreshing the handover documents"
  python3 "$HERE/scripts/md-to-pdf.py" "$OUT"/README-FOR-DEVELOPER.md "$OUT"/CHANGELOG.md 2>/dev/null \
    || echo "  (PDF step skipped)"
fi
