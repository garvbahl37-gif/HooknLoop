#!/usr/bin/env bash
#
# Publish the development preview to Vercel.
#
# WHAT GETS DEPLOYED, AND WHY IT IS SPLIT THIS WAY
#
#   index.html      a wrapper page that boots WP Playground in an iframe
#   blueprint.json  tells Playground which archive to boot from
#   site.zip        wp-content: the theme, WooCommerce and the SQLite database
#   uploads/**      2,033 media files, served as ordinary static assets
#
# The media is deliberately OUTSIDE site.zip. Inside it, the archive is 160MB and
# every visitor downloads all of it before the first pixel; outside, the archive
# is 40MB and images arrive lazily over the CDN as pages are browsed. The
# mu-plugin at wp-content/mu-plugins/00-mts-demo.php is what joins the two halves
# back together.
#
# WHY THERE IS NO SERVER
#
# WP Playground is WordPress compiled to WebAssembly: PHP and the whole install
# run in the visitor's own tab. So this is a STATIC deployment — nothing to keep
# awake, nothing to pay for, and it does not care whether the machine that built
# it is switched on. That is the whole reason this approach was chosen over a
# hosted PHP container.
#
# Usage:
#   scripts/deploy-demo.sh [project-name]

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE="$HERE/build/site"
OUT="$HERE/build/deploy"
PROJECT="${1:-mytapestore-preview}"

command -v vercel >/dev/null 2>&1 || { echo "vercel CLI not found" >&2; exit 1; }
[ -d "$SITE" ] || { echo "missing $SITE — run build-web-bundle.sh then slim-web-bundle.sh" >&2; exit 1; }
[ -d "$OUT/uploads" ] || { echo "missing $OUT/uploads" >&2; exit 1; }

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

# The production URL is deterministic for a named project, so the media base can
# be baked in BEFORE the first deploy — no chicken-and-egg, no second pass.
BASE="https://${PROJECT}.vercel.app"
MEDIA="${BASE}/uploads"

say "1/4  wiring the media base → $MEDIA"
MU="$SITE/wp-content/mu-plugins/00-mts-demo.php"
[ -f "$MU" ] || { echo "missing $MU" >&2; exit 1; }
python3 - "$MU" "$MEDIA" <<'PY'
import pathlib, re, sys
p, media = pathlib.Path(sys.argv[1]), sys.argv[2]
s = p.read_text()
# Replace the placeholder, or a previously-baked value, so re-running is safe.
s = re.sub(r"define\( 'MTS_MEDIA_BASE', '[^']*' \);",
           f"define( 'MTS_MEDIA_BASE', '{media}' );", s)
p.write_text(s)
print(f'    baked: {media}')
PY

say "1a/4  refreshing the database"
# The bundle carries its own copy of the SQLite database, and it was taken when
# build-web-bundle.sh first ran. Every change made through WordPress since then —
# the bare category URL scheme, the menu items repointed off /product-category/,
# imported content — lives in local/wordpress and NOT here. Deploying without
# this step ships a stale catalogue with the old URLs and makes the preview
# disagree with the site it is supposed to be previewing.
SRC_DB="$HERE/local/wordpress/wp-content/database/.ht.sqlite"
DST_DB="$SITE/wp-content/database/.ht.sqlite"
if [ -f "$SRC_DB" ]; then
  mkdir -p "$(dirname "$DST_DB")"
  cp "$SRC_DB" "$DST_DB"

  # The same compaction build-web-bundle.sh does, re-applied to the fresh copy:
  # revisions, orphaned meta and transients are all weight the visitor downloads
  # and never sees, and the file arrives from a live install carrying all three.
  if command -v sqlite3 >/dev/null 2>&1; then
    before=$(du -h "$DST_DB" | cut -f1)
    sqlite3 "$DST_DB" <<'SQL' || true
DELETE FROM wp_posts WHERE post_type = 'revision';
DELETE FROM wp_postmeta WHERE post_id NOT IN (SELECT ID FROM wp_posts);
DELETE FROM wp_options WHERE option_name LIKE '\_transient\_%' ESCAPE '\';
DELETE FROM wp_options WHERE option_name LIKE '\_site\_transient\_%' ESCAPE '\';
DELETE FROM wp_comments WHERE comment_approved = 'spam';
DELETE FROM wp_woocommerce_sessions;
VACUUM;
SQL
    echo "    database refreshed and compacted: $before → $(du -h "$DST_DB" | cut -f1)"
  else
    echo "    database refreshed (sqlite3 not available — not compacted)"
  fi
else
  echo "    WARNING: $SRC_DB missing — shipping whatever the bundle already had" >&2
fi

say "1b/4  refreshing the theme code"
# Templates, CSS and JS are re-synced on every deploy so a theme change reaches
# the demo without rebuilding the 439MB bundle from scratch.
#
# assets/img is EXCLUDED deliberately. The copy in build/site has already been
# through slim-web-bundle.sh — unreferenced artwork dropped, everything else
# re-encoded — and syncing the source directory over it would put 30MB of fat
# images back and silently undo the slimming on every deploy.
rsync -a --exclude 'assets/img' --exclude '.DS_Store' \
  "$HERE/theme/" "$SITE/wp-content/themes/mytapestore/"
echo "    theme code refreshed (artwork left slimmed)"

# ...EXCEPT the collection banners, and this exception is not optional.
#
# The blanket 'assets/img' exclusion above meant NEW ARTWORK COULD NEVER REACH
# THE PREVIEW. Nineteen replacement category banners were installed, the deploy
# reported success, and the demo carried on serving the old ones — the bundle
# copy of masking-tape.jpg was still 1600x893 while the new file was 1600x900.
# Nothing failed and nothing warned; the deploy was simply silently stale.
#
# The exclusion exists because slim-web-bundle.sh re-encodes assets/img and
# syncing the source directory over it would undo that. But the category
# banners are already generated at their final web size (1600/1200/800, JPEG
# q86, progressive) by the install step, so there is nothing left to slim —
# source and bundle differ by 13MB vs 11MB, not by a factor.
#
# So this one directory syncs. If a future directory needs the same treatment,
# add it here rather than dropping the exclusion wholesale.
if [ -d "$HERE/theme/assets/img/site/cat" ]; then
  rsync -a --delete --exclude '.DS_Store' \
    "$HERE/theme/assets/img/site/cat/" \
    "$SITE/wp-content/themes/mytapestore/assets/img/site/cat/"
  echo "    collection banners refreshed ($(ls -1 "$HERE/theme/assets/img/site/cat" | wc -l | tr -d ' ') files)"
fi

say "2/4  packing wp-content"

# CONTENT-HASHED FILENAME, and this is not a nicety.
#
# The archive used to be published at a STABLE /site.zip with
# `Cache-Control: public, max-age=3600`. Two layers then cached it against that
# unchanging URL: the browser for an hour, and WP Playground's own OPFS store —
# which keys the unpacked site by the URL it came from and holds it far longer.
#
# So every redeploy was invisible to anyone who had already opened the preview.
# They kept booting the build from before the fix, reported the fix missing, and
# a fresh browser here showed it working perfectly. That is a miserable loop to
# debug and it cost real time.
#
# A hash in the name means each deploy publishes a genuinely new URL. The
# blueprint is served `no-cache`, so it is always re-read, and it points at the
# new archive — which can then be cached forever, because its name changes
# whenever its contents do.
rm -f "$OUT"/site-*.zip "$OUT/site.zip"
TMP_ZIP="$OUT/.site-build.zip"
( cd "$SITE" && zip -rq "$TMP_ZIP" wp-content -x '*.DS_Store' )

ZIP_HASH=$(shasum -a 256 "$TMP_ZIP" | cut -c1-12)
ZIP_NAME="site-${ZIP_HASH}.zip"
mv "$TMP_ZIP" "$OUT/$ZIP_NAME"
echo "    $ZIP_NAME  ($(du -h "$OUT/$ZIP_NAME" | cut -f1))"

say "3/4  pointing the blueprint at it"
python3 - "$OUT/blueprint.json" "${BASE}/${ZIP_NAME}" <<'PY'
import json, pathlib, sys
p, url = pathlib.Path(sys.argv[1]), sys.argv[2]
bp = json.loads(p.read_text())
for step in bp.get('steps', []):
    if step.get('step') == 'importWordPressFiles':
        step['wordPressFilesZip']['url'] = url
p.write_text(json.dumps(bp, indent=2) + '\n')
print(f'    blueprint → {url}')
PY

# Long-lived caching on the two big artefacts. They are content-addressed by the
# deployment, so a new deploy gets a new URL and the old cache cannot go stale.
cat > "$OUT/vercel.json" <<'JSON'
{
  "headers": [
    {
      "source": "/uploads/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" },
        { "key": "X-Robots-Tag", "value": "noindex, nofollow" }
      ]
    },
    {
      "source": "/site-(.*).zip",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" },
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    },
    {
      "source": "/blueprint.json",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" },
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Robots-Tag", "value": "noindex, nofollow, noarchive" }
      ]
    }
  ]
}
JSON

# Keep it out of search indexes even if the URL leaks. This is an unreleased
# store; a crawled draft catalogue is a real SEO problem for the live site.
cat > "$OUT/robots.txt" <<'TXT'
User-agent: *
Disallow: /
TXT

say "3b/4  installing the signing relays"
#
# WHY A STATIC DEMO SUDDENLY HAS SERVER CODE.
#
# Everything else here runs in the visitor's tab: WP Playground is WordPress
# compiled to WebAssembly, and wp-content is a zip on a CDN. That is exactly why
# the chat assistant answered every question from its scripted fallback — the
# assistant needs an API key, and there is NOWHERE in a static bundle to keep one.
# A key placed in the zip is a published key.
#
# These two functions are the smallest possible fix. Each adds an Authorization
# header and forwards the request; the retrieval, the prompt, the price check and
# the address parsing all stay in the theme and run identically on a real
# WordPress install. The keys live in Vercel's environment and are never written
# into any file that ships.
mkdir -p "$OUT/api"
cp "$HERE/scripts/vercel-api/chat.mjs" "$HERE/scripts/vercel-api/street.mjs" "$OUT/api/"
echo "    api/chat.mjs, api/street.mjs"

# Read the keys from the gitignored .env rather than baking them anywhere.
GROQ_API_KEY=""; CHECKIFY_KEY=""
if [ -f "$HERE/.env" ]; then
  # shellcheck disable=SC1091
  set -a; . "$HERE/.env"; set +a
fi

ENV_ARGS=()
if [ -n "${GROQ_API_KEY:-}" ]; then
  ENV_ARGS+=(--env "GROQ_API_KEY=${GROQ_API_KEY}")
  echo "    GROQ_API_KEY      -> deployment environment"
else
  echo "    WARNING: GROQ_API_KEY missing — chat will use scripted answers" >&2
fi
if [ -n "${CHECKIFY_KEY:-}" ]; then
  ENV_ARGS+=(--env "CHECKIFY_KEY=${CHECKIFY_KEY}")
  echo "    CHECKIFY_KEY      -> deployment environment"
else
  echo "    WARNING: CHECKIFY_KEY missing — street autocomplete stays off" >&2
fi

say "4/4  deploying"
cd "$OUT"
vercel deploy --prod --yes --name "$PROJECT" "${ENV_ARGS[@]}" 2>&1 | tail -5

echo
echo "    $BASE"
