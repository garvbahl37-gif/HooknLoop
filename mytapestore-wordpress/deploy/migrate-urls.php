<?php
/**
 * One-shot host rewrite for the SQLite database.
 *
 *   php migrate-urls.php /var/www/data/database/.ht.sqlite https://example.com
 *
 * Implements the plan from the URL migration audit. Order matters:
 *
 *   Step 1  delete the disposable serialized rows, so nothing left in the DB
 *           carries a length-prefixed string containing the host. A naive
 *           str_replace on those rows measurably corrupts them (verified:
 *           _transient_wc_tracks_blog_details 1 length mismatch, session_tokens
 *           3, woocommerce_sessions 2 — the last is doubly nested, a serialized
 *           string inside a serialized string, so a single-pass length-fixing
 *           regex still leaves the outer prefix wrong).
 *   Step 2  rewrite the plain-string columns with a scheme-anchored pattern, so
 *           it can never touch wp_wc_orders.ip_address or the "ip" field inside
 *           session tokens, both of which legitimately hold bare 127.0.0.1.
 *   Step 3  verify: zero remaining matches anywhere, and every surviving
 *           s:N:"..." prefix still validates.
 *
 * The pattern is a regex, not a literal: siteurl/home are 127.0.0.1:9400, most
 * post_content is localhost:9400, and guid additionally holds five dead
 * ephemeral ports (51459, 51381, 56647, 62019, 62012) from previous
 * `wp-playground-cli php` runs.
 */

declare( strict_types = 1 );

if ( $argc < 3 ) {
	fwrite( STDERR, "usage: migrate-urls.php <db> <new-site-url>\n" );
	exit( 2 );
}
[ , $dbPath, $newUrl ] = $argv;
$newUrl = rtrim( $newUrl, '/' );

$HOST_RE  = '#https?://(?:localhost|127\.0\.0\.1)(?::\d+)?#';
$HOST_RE_ESC = '#https?:\\\\/\\\\/(?:localhost|127\.0\.0\.1)(?::\d+)?#'; // JSON-escaped slashes
$newUrlEsc = str_replace( '/', '\\/', $newUrl );

$pdo = new PDO( 'sqlite:' . $dbPath, null, null, [
	PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
] );
$pdo->exec( 'PRAGMA foreign_keys = OFF' );

$has = function ( string $table ) use ( $pdo ): bool {
	$q = $pdo->prepare( "SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?" );
	$q->execute( [ $table ] );
	return (bool) $q->fetchColumn();
};

$rewrite = static function ( string $v ) use ( $HOST_RE, $HOST_RE_ESC, $newUrl, $newUrlEsc ): string {
	$v = preg_replace( $HOST_RE, $newUrl, $v );
	return preg_replace( $HOST_RE_ESC, $newUrlEsc, $v );
};

/**
 * Serialization-safe deep replace. After step 1 nothing should need it, but it
 * is the safety net for anything an import adds later: unserialize, walk to the
 * leaves, replace, reserialize — applied recursively to strings that are
 * themselves serialized (the wc_notices double-nesting case).
 */
function mts_replace_deep( $data, callable $fn ) {
	if ( is_array( $data ) ) {
		foreach ( $data as $k => $v ) {
			$data[ $k ] = mts_replace_deep( $v, $fn );
		}
		return $data;
	}
	if ( is_object( $data ) ) {
		foreach ( get_object_vars( $data ) as $k => $v ) {
			$data->$k = mts_replace_deep( $v, $fn );
		}
		return $data;
	}
	if ( is_string( $data ) ) {
		$inner = @unserialize( $data, [ 'allowed_classes' => false ] );
		// allowed_classes=false turns real objects into __PHP_Incomplete_Class;
		// re-serializing one would destroy it, so leave those rows untouched.
		if ( ( false !== $inner || 'b:0;' === $data ) && ! str_contains( $data, 'O:' ) ) {
			return serialize( mts_replace_deep( $inner, $fn ) );
		}
		return $fn( $data );
	}
	return $data;
}

function mts_is_serialized( string $v ): bool {
	return (bool) preg_match( '/^[aOsbid]:\d*[:;]/', $v );
}

$pdo->beginTransaction();
$report = [];

/* -------------------------------------------------------------------------
 * Step 1 — delete, don't rewrite.
 * Two transients (regenerate on demand), six throwaway cart sessions, and the
 * login-token blob. None is durable configuration, and logging everyone out on
 * a host change is the correct behaviour anyway.
 * ---------------------------------------------------------------------- */
$report['options.transients'] = $pdo->exec(
	"DELETE FROM wp_options WHERE option_name LIKE '\\_transient\\_%' ESCAPE '\\'
	    OR option_name LIKE '\\_site\\_transient\\_%' ESCAPE '\\'"
);
if ( $has( 'wp_woocommerce_sessions' ) ) {
	$report['woocommerce_sessions'] = $pdo->exec( 'DELETE FROM wp_woocommerce_sessions' );
}
$report['usermeta.session_tokens'] = $pdo->exec(
	"DELETE FROM wp_usermeta WHERE meta_key = 'session_tokens'"
);

/* -------------------------------------------------------------------------
 * Step 2 — rewrite the plain-string surface.
 * [ table, pk, column, extra WHERE ]
 * ---------------------------------------------------------------------- */
$targets = [
	// siteurl and home are ordinary rows in this sweep; the catch-all covers them
	// plus anything an import adds later, serialization-safely.
	[ 'wp_options',   'option_id',  'option_value', '1=1' ],
	[ 'wp_posts',     'ID',         'post_content', '1=1' ],
	[ 'wp_posts',     'ID',         'guid',         '1=1' ],
	[ 'wp_postmeta',  'meta_id',    'meta_value',   "meta_key = '_menu_item_url'" ],
	[ 'wp_usermeta',  'umeta_id',   'meta_value',   "meta_key = '_wc_order_attribution_session_entry'" ],
	[ 'wp_users',     'ID',         'user_url',     '1=1' ],
	[ 'wp_wc_orders_meta',                'id',  'meta_value', '1=1' ],
	[ 'wp_wc_admin_note_actions',         'action_id', 'query', '1=1' ],
	[ 'wp_wc_product_download_directories','url_id',  'url',    '1=1' ],
];

foreach ( $targets as [ $table, $pk, $col, $where ] ) {
	if ( ! $has( $table ) ) {
		continue;
	}
	$sql = "SELECT $pk AS pk, $col AS v FROM $table
	         WHERE ($where)
	           AND ( $col LIKE '%//localhost%' OR $col LIKE '%//127.0.0.1%'
	              OR $col LIKE '%\\/\\/localhost%' OR $col LIKE '%\\/\\/127.0.0.1%' )";
	$rows = $pdo->query( $sql )->fetchAll( PDO::FETCH_ASSOC );
	if ( ! $rows ) {
		continue;
	}
	$upd = $pdo->prepare( "UPDATE $table SET $col = :v WHERE $pk = :pk" );
	$n   = 0;
	foreach ( $rows as $row ) {
		$old = (string) $row['v'];
		$new = mts_is_serialized( $old )
			? mts_replace_deep( $old, $rewrite )   // length prefixes recomputed by serialize()
			: $rewrite( $old );
		if ( $new !== $old ) {
			$upd->execute( [ ':v' => $new, ':pk' => $row['pk'] ] );
			$n++;
		}
	}
	$report[ "$table.$col" ] = ( $report[ "$table.$col" ] ?? 0 ) + $n;
}

/* -------------------------------------------------------------------------
 * Step 3 — the email addresses, which no URL pattern catches.
 * admin@localhost.com is not deliverable; left alone WooCommerce sends live
 * customer mail from it. Set MTS_ADMIN_EMAIL to override.
 * ---------------------------------------------------------------------- */
$adminEmail = getenv( 'MTS_ADMIN_EMAIL' ) ?: '';
if ( $adminEmail ) {
	$opts = [ 'admin_email', 'woocommerce_email_from_address',
	          'woocommerce_pos_store_email', 'woocommerce_stock_email_recipient' ];
	$q = $pdo->prepare( 'UPDATE wp_options SET option_value = ? WHERE option_name = ?' );
	foreach ( $opts as $o ) {
		$q->execute( [ $adminEmail, $o ] );
	}
	$pdo->prepare( "UPDATE wp_users SET user_email = ? WHERE user_email LIKE '%@localhost.com'" )
	    ->execute( [ $adminEmail ] );
	$report['emails'] = count( $opts ) + 1;
}

/* Permalinks: /blog/%postname%/ is what the theme re-asserts on every request
 * (inc/permalinks.php, after_setup_theme priority 1). Keep the option in sync
 * so the first request doesn't trigger a write + flush. */
$pdo->prepare( "UPDATE wp_options SET option_value = ? WHERE option_name = 'permalink_structure'" )
    ->execute( [ '/blog/%postname%/' ] );

$pdo->commit();

/* -------------------------------------------------------------------------
 * Step 4 — verify. Assert zero remaining dev hosts in any text column of any
 * table, and assert every surviving serialized value still parses.
 * ---------------------------------------------------------------------- */
$remaining = 0;
$broken    = 0;
$tables = $pdo->query( "SELECT name FROM sqlite_master WHERE type='table'" )->fetchAll( PDO::FETCH_COLUMN );
foreach ( $tables as $t ) {
	$cols = $pdo->query( "PRAGMA table_info(" . $pdo->quote( $t ) . ")" )->fetchAll( PDO::FETCH_ASSOC );
	foreach ( $cols as $c ) {
		if ( ! preg_match( '/char|text|clob|blob|^$/i', (string) $c['type'] ) ) {
			continue;
		}
		$col = '"' . str_replace( '"', '""', $c['name'] ) . '"';
		$tbl = '"' . str_replace( '"', '""', $t ) . '"';
		foreach ( $pdo->query( "SELECT $col AS v FROM $tbl WHERE $col LIKE '%//localhost%' OR $col LIKE '%//127.0.0.1%'" ) as $r ) {
			$remaining++;
			fwrite( STDERR, "  LEFTOVER $t.{$c['name']}\n" );
		}
		foreach ( $pdo->query( "SELECT $col AS v FROM $tbl WHERE $col LIKE 'a:%' OR $col LIKE 'O:%'" ) as $r ) {
			if ( false === @unserialize( (string) $r['v'], [ 'allowed_classes' => false ] ) ) {
				$broken++;
				fwrite( STDERR, "  CORRUPT SERIALIZED $t.{$c['name']}\n" );
			}
		}
	}
}

foreach ( $report as $k => $v ) {
	fwrite( STDERR, sprintf( "  %-42s %d\n", $k, $v ) );
}
fwrite( STDERR, "  remaining dev-host matches: $remaining\n  corrupt serialized values: $broken\n" );

if ( $remaining > 0 || $broken > 0 ) {
	exit( 1 );
}

/* VACUUM outside the transaction. The DB carried 1,042 freelist pages (4.07 MB)
 * of pure slack; deleting the transients and scheduler noise adds more. */
$pdo->exec( 'VACUUM' );
fwrite( STDERR, "  migrated to $newUrl\n" );
