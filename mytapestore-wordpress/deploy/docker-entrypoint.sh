#!/bin/sh
# Entrypoint for the MyTapeStore draft container.
#
# Five jobs, in order:
#   1. refuse to boot unauthenticated or without a site URL
#   2. mint / reuse the eight auth salts
#   3. seed the mutable trees (database, uploads) from the image
#   4. reconcile the site URL — constants for generated URLs, a one-shot DB
#      rewrite for stored ones
#   5. write the review-gate htpasswd, then hand off to Apache
#
# It is safe to run with or without a mounted volume at /var/www/data. Without
# one, everything still works; it just doesn't survive a restart.

set -eu

DATA=/var/www/data
SEED=/usr/src/seed
DOCROOT=/var/www/html

log() { printf '[entrypoint] %s\n' "$*" >&2; }
die() { printf '[entrypoint] FATAL: %s\n' "$*" >&2; exit 1; }

###############################################################################
# 1. Refuse to serve an unreleased store unprotected.
###############################################################################
[ -n "${SITE_URL:-}" ] || die "SITE_URL is unset. Set it to the public origin, e.g. https://mytapestore-draft.fly.dev"
case "$SITE_URL" in
  http://*|https://*) ;;
  *) die "SITE_URL must include the scheme (got: $SITE_URL)" ;;
esac
SITE_URL="${SITE_URL%/}"
export SITE_URL

if [ -z "${REVIEW_USER:-}" ] || [ -z "${REVIEW_PASS:-}" ]; then
  die "REVIEW_USER/REVIEW_PASS are unset. This is an unreleased store draft; refusing to serve it to the open internet."
fi

###############################################################################
# 2. Salts.
#
# The shipped wp-config had all eight set to "put your unique phrase here",
# which makes every auth cookie and nonce forgeable. Generate real ones.
#
# They live on the data dir, not in the image, so (a) they are never committed,
# and (b) a redeploy does not log everyone out. If there is no volume, set
# SALT_SEED to any fixed string to keep them stable across restarts anyway.
###############################################################################
mkdir -p "$DATA"
if [ ! -f "$DATA/salts.php" ]; then
  php /usr/local/bin/gen-salts.php > "$DATA/salts.php"
  chmod 600 "$DATA/salts.php"
  log "generated auth salts"
fi

###############################################################################
# 3. Seed the mutable trees.
#
# SEED_MODE=image   (default) — every boot the image's DB and uploads replace
#                   whatever is on the volume. Your laptop is the source of
#                   truth; "update the site" means rebuild + redeploy. Anything
#                   a reviewer typed into wp-admin is discarded.
#
# SEED_MODE=persist — seed only when the target is missing. The deployed site
#                   becomes the source of truth for content; redeploys ship
#                   code/theme only. Use this the moment anyone starts editing
#                   in the live wp-admin, or you will silently overwrite them.
#
# Swap-then-delete rather than rm-then-copy: a crash mid-seed leaves the old
# tree intact instead of a half-copied site.
###############################################################################
seed_tree() {
  name="$1"
  if [ "${SEED_MODE:-image}" = "image" ] || [ ! -d "$DATA/$name" ]; then
    rm -rf "$DATA/$name.new" "$DATA/$name.old"
    cp -a "$SEED/$name" "$DATA/$name.new"
    if [ -d "$DATA/$name" ]; then mv "$DATA/$name" "$DATA/$name.old"; fi
    mv "$DATA/$name.new" "$DATA/$name"
    rm -rf "$DATA/$name.old"
    log "seeded $name from image (SEED_MODE=${SEED_MODE:-image})"
  else
    log "kept existing $name (SEED_MODE=persist)"
  fi
}
seed_tree database
seed_tree uploads

# The driver resolves the DB to WP_CONTENT_DIR/database/.ht.sqlite unless DB_DIR
# says otherwise; wp-config points DB_DIR at the data dir directly. uploads is
# symlinked because WP builds upload URLs from wp-content/uploads.
ln -sfn "$DATA/uploads" "$DOCROOT/wp-content/uploads"
mkdir -p "$DATA/upgrade" "$DATA/cache"
ln -sfn "$DATA/upgrade" "$DOCROOT/wp-content/upgrade"
ln -sfn "$DATA/cache"   "$DOCROOT/wp-content/cache"

# WAL mode means the driver creates .ht.sqlite-wal and -shm siblings, so the
# DIRECTORY has to be writable, not just the file.
chown -R www-data:www-data "$DATA"
chmod 700 "$DATA/database"

###############################################################################
# 4. The site URL. This is the part that actually breaks people.
#
# Two independent surfaces, and constants only fix one of them:
#
#   (a) GENERATED urls — home_url(), get_permalink(), wc_get_page_permalink(),
#       enqueued asset URLs, redirect_canonical. These read WP_HOME/WP_SITEURL
#       when defined, so wp-config's `define(WP_HOME, getenv('SITE_URL'))`
#       covers all of them with no DB write. That is what makes one image
#       runnable on fly.dev today and mytapestore.com.au later.
#
#   (b) STORED urls — 491 absolute src=/data-src= image URLs baked into 155
#       post_content rows, 20 _menu_item_url rows, 1848 guids, and a handful of
#       WooCommerce columns, all still pointing at http://localhost:9400 or
#       http://127.0.0.1:9400 (plus five dead ephemeral ports). No constant
#       touches these. Blog images 404 and custom menu links go nowhere until
#       the rows are rewritten.
#
# So: constants always, plus a one-shot DB pass stamped by URL. The stamp makes
# it idempotent — it runs on first boot and again only if SITE_URL changes,
# never on an ordinary restart.
###############################################################################
DB="$DATA/database/.ht.sqlite"
STAMP="$DATA/.site-url"
if [ ! -f "$STAMP" ] || [ "$(cat "$STAMP")" != "$SITE_URL" ]; then
  log "rewriting stored URLs -> $SITE_URL"
  php /usr/local/bin/migrate-urls.php "$DB" "$SITE_URL" \
    || die "URL migration failed; refusing to serve a half-migrated database"
  printf '%s' "$SITE_URL" > "$STAMP"
  chown www-data:www-data "$STAMP" "$DB"
fi

###############################################################################
# 5. Review gate. Basic auth over the whole vhost except /healthz.
#
# None of Fly, Render, Railway or Koyeb ships a built-in password gate for a
# container service, so it belongs in the container — which is the better
# answer anyway: it travels with the image to whichever host you pick.
###############################################################################
htpasswd -bcB /etc/apache2/.htpasswd "$REVIEW_USER" "$REVIEW_PASS" >/dev/null 2>&1 \
  || die "could not write /etc/apache2/.htpasswd"
chmod 640 /etc/apache2/.htpasswd
chown root:www-data /etc/apache2/.htpasswd

log "serving $SITE_URL"
exec "$@"
