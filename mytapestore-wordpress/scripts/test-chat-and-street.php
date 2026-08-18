<?php
/**
 * End-to-end check for the chat assistant and the street finder.
 *
 * Exercises the REAL entry points — mts_chat_reply() and mts_street_search() —
 * against the real catalogue and the real providers, because the failure this is
 * chasing was never in the model. The assistant answered every question from its
 * scripted fallback, and it did so CORRECTLY: no key was configured, so
 * mts_chat_enabled() was false and the live path was never entered. A test that
 * mocked the provider would have passed throughout.
 *
 * So the keys are injected here through the same filters the theme exposes, and
 * the `source` field on each reply is what actually gets asserted: a model name
 * means the live path ran, `scripted:*` means it did not.
 *
 * Usage — keys come from .env, never from the command line:
 *   set -a; . .env; set +a
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://127.0.0.1:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./theme:/wordpress/wp-content/themes/mytapestore \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/test-chat-and-street.php
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

/**
 * Read a key for the test run.
 *
 * getenv() does NOT work here. PHP is running as WebAssembly inside the
 * Playground runtime, which does not inherit the host shell's environment — the
 * first run of this test reported "Groq key present: FAIL" for exactly that
 * reason, while the key was sitting correctly in .env the whole time.
 *
 * So the keys are read from a file on a directory mounted into the runtime, and
 * that directory is the session scratchpad OUTSIDE the repository — never
 * scripts/, which is tracked.
 */
function mts_test_key( string $name ): string {
	static $env = null;

	if ( null === $env ) {
		$env  = array();
		$path = '/keys/test.env';

		if ( is_readable( $path ) ) {
			foreach ( (array) file( $path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES ) as $line ) {
				if ( str_contains( (string) $line, '=' ) ) {
					[ $k, $v ] = explode( '=', (string) $line, 2 );
					$env[ trim( $k ) ] = trim( $v );
				}
			}
		}
	}

	return (string) ( $env[ $name ] ?? getenv( $name ) ?: '' );
}

add_filter( 'mts_groq_key', static fn(): string => mts_test_key( 'GROQ_API_KEY' ) );
add_filter( 'mts_checkify_key', static fn(): string => mts_test_key( 'CHECKIFY_KEY' ) );

$mts_pass = 0;
$mts_fail = 0;

function mts_t( bool $ok, string $label, string $detail = '' ): void {
	global $mts_pass, $mts_fail;
	$ok ? $mts_pass++ : $mts_fail++;
	printf( "  %s  %s%s\n", $ok ? 'PASS' : 'FAIL', $label, '' !== $detail ? "\n          {$detail}" : '' );
}

echo "\n=== 1. is the live path even reachable? ===\n";
mts_t( '' !== mts_groq_key(), 'Groq key present' );
mts_t( '' !== mts_checkify_key(), 'Checkify key present' );
mts_t( mts_chat_enabled(), 'mts_chat_enabled() — the flag that gated every reply' );
mts_t( mts_street_enabled(), 'mts_street_enabled()' );

echo "\n=== 2. the assistant, on real questions ===\n";

$mts_questions = array(
	'What tape should I use to mount a mirror in a bathroom?',
	'Do you have anything for automotive work?',   // category-only: no title match
	'How long does delivery take to Perth?',
	'What is your cheapest double sided tape?',
);

foreach ( $mts_questions as $mts_q ) {
	$mts_req = new WP_REST_Request( 'POST', '/mts/v1/chat' );
	$mts_req->set_param( 'message', $mts_q );

	$mts_data   = mts_chat_reply( $mts_req )->get_data();
	$mts_reply  = (string) ( $mts_data['reply'] ?? '' );
	$mts_source = (string) ( $mts_data['source'] ?? '' );
	$mts_live   = ! str_starts_with( $mts_source, 'scripted' );

	echo "\n  Q: {$mts_q}\n";
	echo '  A: ' . str_replace( "\n", "\n     ", mb_substr( $mts_reply, 0, 260 ) ) . "\n";
	echo "  source: {$mts_source}  |  products: " . count( (array) ( $mts_data['products'] ?? array() ) ) . "\n";

	mts_t( $mts_live, 'answered by the model, not the script' );
	mts_t( '' !== trim( $mts_reply ), 'reply is not empty' );
	// The bug that showed asterisks to customers.
	mts_t( ! str_contains( $mts_reply, '**' ), 'no raw Markdown in the reply' );
}

echo "\n=== 3. category retrieval (the 'automotive' case) ===\n";
$mts_found = mts_chat_find_products( 'Do you have anything for automotive work?' );
mts_t( count( $mts_found ) > 0, 'automotive question retrieves products', 'got ' . count( $mts_found ) );
foreach ( array_slice( $mts_found, 0, 3 ) as $mts_p ) {
	echo '          - ' . $mts_p->get_name() . "\n";
}

echo "\n=== 4. street autocomplete ===\n";

foreach ( array( '10 bourke st melb', '5 station st box hill north' ) as $mts_q ) {
	$mts_req = new WP_REST_Request( 'GET', '/mts/v1/street' );
	$mts_req->set_param( 'q', $mts_q );

	$mts_rows = (array) ( mts_street_search( $mts_req )->get_data()['results'] ?? array() );

	echo "\n  q: {$mts_q}\n";
	foreach ( array_slice( $mts_rows, 0, 3 ) as $mts_r ) {
		echo "     {$mts_r['label']}\n";
		echo "        street='{$mts_r['street']}' city='{$mts_r['city']}' {$mts_r['state']} {$mts_r['postcode']}\n";
	}

	mts_t( count( $mts_rows ) > 0, 'returned suggestions' );

	foreach ( $mts_rows as $mts_r ) {
		if ( '' === $mts_r['street'] || '' === $mts_r['city'] || ! preg_match( '/^\d{4}$/', $mts_r['postcode'] ) ) {
			mts_t( false, 'every row has street, city and a 4-digit postcode', wp_json_encode( $mts_r ) );
			break;
		}
	}
}

echo "\n=== 5. degradation: no key at all ===\n";
remove_all_filters( 'mts_groq_key' );
add_filter( 'mts_groq_key', static fn(): string => '' );

$mts_req = new WP_REST_Request( 'POST', '/mts/v1/chat' );
$mts_req->set_param( 'message', 'How fast is delivery?' );
$mts_data = mts_chat_reply( $mts_req )->get_data();

mts_t( str_starts_with( (string) $mts_data['source'], 'scripted' ), 'falls back to the script' );
mts_t( '' !== trim( (string) $mts_data['reply'] ), 'fallback still answers rather than erroring' );
echo '          "' . mb_substr( (string) $mts_data['reply'], 0, 110 ) . "\"\n";

printf( "\n=== %d passed, %d failed ===\n\n", $mts_pass, $mts_fail );
exit( $mts_fail > 0 ? 1 : 0 );
