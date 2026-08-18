<?php
/**
 * Deployment wp-config for the MyTapeStore draft container.
 *
 * Replaces the Playground-era file entirely. That one was wp-config-sample.php
 * with a debug block appended: placeholder MySQL credentials, all eight salts
 * set to "put your unique phrase here", WP_DEBUG defined twice (PHP honours the
 * first, so the effective value was false and the second define only emitted a
 * warning), @ini_set('display_errors', 1) contradicting WP_DEBUG_DISPLAY, and
 * no WP_HOME/WP_SITEURL to override the http://127.0.0.1:9400 in wp_options.
 */

/* ---------------------------------------------------------------------------
 * 1. Trust the edge proxy.
 *
 * Fly, Render, Railway and Koyeb all terminate TLS at their edge and speak
 * plain HTTP to the container. WP_SITEURL is https, PHP sees http, and
 * redirect_canonical() bounces the visitor to https forever. This snippet is
 * the difference between a working site and ERR_TOO_MANY_REDIRECTS.
 * ------------------------------------------------------------------------- */
if ( isset( $_SERVER['HTTP_X_FORWARDED_PROTO'] )
     && str_contains( $_SERVER['HTTP_X_FORWARDED_PROTO'], 'https' ) ) {
	$_SERVER['HTTPS'] = 'on';
}
if ( isset( $_SERVER['HTTP_X_FORWARDED_HOST'] ) ) {
	$_SERVER['HTTP_HOST'] = trim( explode( ',', $_SERVER['HTTP_X_FORWARDED_HOST'] )[0] );
}

/* ---------------------------------------------------------------------------
 * 2. SQLite.
 *
 * DB_ENGINE is also defined by the db.php drop-in, but declaring it here means
 * a missing drop-in fails loudly instead of quietly dialling MySQL and timing
 * out on database_name_here@localhost.
 *
 * DB_DIR points at the mounted data dir, so the database file is never inside
 * the docroot and never inside an image layer.
 * ------------------------------------------------------------------------- */
define( 'DB_ENGINE', 'sqlite' );
define( 'DB_DIR',    '/var/www/data/database/' );
define( 'DB_FILE',   '.ht.sqlite' );

define( 'DB_NAME',     '' );
define( 'DB_USER',     '' );
define( 'DB_PASSWORD', '' );
define( 'DB_HOST',     '' );
define( 'DB_CHARSET',  'utf8mb4' );
define( 'DB_COLLATE',  '' );

/* ---------------------------------------------------------------------------
 * 3. Site URL from the environment, never from wp_options.
 *
 * wp_options still holds whatever the last migration wrote, and any stray
 * `wp-playground-cli php` run without --site-url will stamp a fresh random port
 * back into it. Constants win over the DB for every generated URL, so the
 * container is immune to that class of bug and one image can serve
 * fly.dev today and mytapestore.com.au later.
 *
 * Constants do NOT rewrite URLs stored inside post_content / _menu_item_url —
 * deploy/migrate-urls.php does that, once, from the entrypoint.
 * ------------------------------------------------------------------------- */
$mts_site_url = rtrim( (string) getenv( 'SITE_URL' ), '/' );
if ( '' === $mts_site_url ) {
	header( 'Content-Type: text/plain', true, 500 );
	exit( "SITE_URL is not set.\n" );
}
define( 'WP_HOME',        $mts_site_url );
define( 'WP_SITEURL',     $mts_site_url );
define( 'WP_CONTENT_URL', $mts_site_url . '/wp-content' );

/* ---------------------------------------------------------------------------
 * 4. Salts — written once by the entrypoint into the data dir.
 * ------------------------------------------------------------------------- */
require_once '/var/www/data/salts.php';

$table_prefix = 'wp_';

/* ---------------------------------------------------------------------------
 * 5. Hardening. This is an unreleased draft behind basic auth, so lock it down.
 * ------------------------------------------------------------------------- */
define( 'WP_DEBUG',              false );   // defined exactly once
define( 'WP_DEBUG_DISPLAY',      false );
define( 'WP_DEBUG_LOG',          false );
define( 'SCRIPT_DEBUG',          false );
define( 'DISALLOW_FILE_EDIT',    true );
define( 'DISALLOW_FILE_MODS',    true );    // docroot is root-owned + read-only
define( 'AUTOMATIC_UPDATER_DISABLED', true );
define( 'WP_AUTO_UPDATE_CORE',   false );
define( 'FS_METHOD',             'direct' );
define( 'WP_MEMORY_LIMIT',       '256M' );
define( 'WP_MAX_MEMORY_LIMIT',   '384M' );
define( 'FORCE_SSL_ADMIN',       ! empty( $_SERVER['HTTPS'] ) );
define( 'WP_ENVIRONMENT_TYPE',   'staging' );

/*
 * wp-cron fires via a loopback HTTP request to the site's own URL. That request
 * hits the basic-auth gate and gets a 401, so cron would silently never run and
 * every page load would pay for the failed attempt. Disabled. Action Scheduler
 * backlog is not a concern for a review draft — 36,947 rows of its logs were
 * the second-largest table in the DB.
 */
define( 'DISABLE_WP_CRON', true );

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}
require_once ABSPATH . 'wp-settings.php';
