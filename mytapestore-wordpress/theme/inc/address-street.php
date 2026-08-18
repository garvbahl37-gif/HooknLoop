<?php
/**
 * Street-line autocomplete — the one part of an address the local index cannot do.
 *
 * assets/js/address.js completes SUBURB, STATE and POSTCODE from a static file
 * with no network at all. That is the part that decides the shipping zone, and
 * it is instant. What it cannot do is the street line: street-level Australian
 * data is G-NAF's full address file, 15.8 million records and roughly 1.5GB
 * indexed, which cannot live in a theme or a browser.
 *
 * This file closes that gap through Checkify, an Australian service that
 * republishes G-NAF.
 *
 * WHY IT COSTS NOTHING, AND KEEPS COSTING NOTHING
 *
 * Checkify's free plan meters "units". Measured against the live account rather
 * than assumed from the pricing page:
 *
 *   /autocomplete          0 units   <- unmetered, confirmed
 *   /autocomplete-details  1 unit    <- 250 a month, then it stops
 *
 * The obvious integration calls autocomplete while the customer types and
 * details when they choose, because details returns tidy structured fields. That
 * integration dies at 250 address selections a month — about eight a day, which
 * is worse than useless on a live checkout, and it dies SILENTLY halfway through
 * a billing period.
 *
 * So this never calls details. The autocomplete response already contains the
 * whole formatted address:
 *
 *   "SHOP 4A 108 BOURKE STREET MELBOURNE VIC 3000"
 *
 * and the theme already ships every Australian locality in
 * assets/data/au-localities.txt. Given the state and postcode from the tail of
 * that string, the suburb can only be one of a handful of known values, and the
 * longest one that matches is the split point between street line and suburb.
 * The data needed to parse the answer is already here, so the metered call is
 * simply not made. Zero units, unbounded selections, and the 250 stay untouched
 * as headroom for anything else the store later wants.
 *
 * WHY THE KEY IS NEVER SENT TO THE BROWSER
 *
 * Checkify issues public (domain-bound) and private tokens. A private token in
 * page source is a published token, and their own documentation says so. This
 * proxies through PHP so the token stays in wp-config.php, which also means the
 * store is not relying on a domain restriction being configured correctly.
 *
 * DEGRADES TO NOTHING. No key, no quota, service down, rate limited — the street
 * field stays an ordinary text input and the rest of the address finder is
 * untouched, because it never needed a network in the first place.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/** Shortest query worth sending. Below this every street in the country matches. */
const MTS_STREET_MIN_CHARS = 5;

/** Suggestions returned to the browser. */
const MTS_STREET_MAX_RESULTS = 6;

/** Lookups one visitor may make per hour. */
const MTS_STREET_HOURLY_CAP = 120;

/**
 * The Checkify token, or '' to leave the street field alone.
 *
 * A constant rather than an option, for the same reason as the Groq key: options
 * live in the database, and this database is exported, bundled and copied
 * between environments. A secret that travels with a database dump is a secret
 * in everyone's downloads folder.
 */
function mts_checkify_key(): string {
	$key = defined( 'MTS_CHECKIFY_KEY' ) ? (string) MTS_CHECKIFY_KEY : '';
	return trim( (string) apply_filters( 'mts_checkify_key', $key ) );
}

/** Checkify's own endpoint, unless a relay is standing in front of it. */
const MTS_STREET_API_DEFAULT = 'https://checkify.com.au/api/v1/autocomplete';

/**
 * Where the lookup is sent. Filterable for the same reason as the chat
 * transport: the hosted preview runs PHP inside the visitor's browser and has
 * nowhere private to keep a token, so it points this at a relay that adds one.
 */
function mts_street_api_url(): string {
	return (string) apply_filters( 'mts_street_api_url', MTS_STREET_API_DEFAULT );
}

/** A key, or a relay that holds one. */
function mts_street_enabled(): bool {
	return '' !== mts_checkify_key() || MTS_STREET_API_DEFAULT !== mts_street_api_url();
}

/* ================================================================== routing */

add_action( 'rest_api_init', function (): void {
	register_rest_route( 'mts/v1', '/street', array(
		'methods'             => WP_REST_Server::READABLE,
		// Public, like the chat route: checkout is reachable without an account
		// and a nonce on a CDN-cached page expires and breaks the field.
		'permission_callback' => '__return_true',
		'args'                => array(
			'q' => array(
				'required'          => true,
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'validate_callback' => static fn( $v ): bool => is_string( $v ) && mb_strlen( trim( $v ) ) >= MTS_STREET_MIN_CHARS,
			),
		),
		'callback'            => 'mts_street_search',
	) );
} );

/**
 * GET /wp-json/mts/v1/street?q=10+bourke+st
 *
 * Always 200 with a list — an empty list is a valid answer and the field simply
 * shows nothing. Errors are not the customer's problem to read.
 */
function mts_street_search( WP_REST_Request $request ): WP_REST_Response {
	$query = trim( (string) $request->get_param( 'q' ) );

	if ( ! mts_street_enabled() || ! mts_street_within_cap() ) {
		return new WP_REST_Response( array( 'results' => array() ) );
	}

	/*
	 * CACHE FIRST, AND NOT ONLY FOR SPEED.
	 *
	 * The free plan allows 30 requests a minute for the WHOLE SITE, not per
	 * visitor. Two people typing at once can exceed that between them, and a
	 * throttled request is a suggestion list that fails to appear. Typing is also
	 * the most cacheable traffic there is: every customer in a suburb types the
	 * same street prefixes, and the answers do not change between them.
	 */
	$cache = 'mts_st_' . md5( mb_strtolower( $query ) );
	$hit   = get_transient( $cache );

	if ( is_array( $hit ) ) {
		return new WP_REST_Response( array( 'results' => $hit ) );
	}

	$headers = array();

	// As with the chat relay: behind a proxy we hold no key, and an empty bearer
	// is a malformed credential rather than an absent one.
	if ( '' !== mts_checkify_key() ) {
		$headers['Authorization'] = 'Bearer ' . mts_checkify_key();
	}

	$response = wp_remote_get(
		add_query_arg( 'query', rawurlencode( $query ), mts_street_api_url() ),
		array(
			'timeout' => 6,
			'headers' => $headers,
		)
	);

	if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
		// Cache the miss briefly too. A service that is down or throttling should
		// not be asked again on the customer's very next keystroke.
		set_transient( $cache, array(), MINUTE_IN_SECONDS );
		return new WP_REST_Response( array( 'results' => array() ) );
	}

	$body    = json_decode( (string) wp_remote_retrieve_body( $response ), true );
	$results = array();

	foreach ( (array) $body as $label ) {
		if ( ! is_string( $label ) ) {
			continue;
		}

		// The API marks the matched words with <strong> for highlighting. We
		// render suggestions as text, so the tags come out here rather than
		// anywhere near the DOM.
		$parsed = mts_street_parse( trim( (string) wp_strip_all_tags( $label ) ) );

		if ( $parsed ) {
			$results[] = $parsed;
		}

		if ( count( $results ) >= MTS_STREET_MAX_RESULTS ) {
			break;
		}
	}

	set_transient( $cache, $results, DAY_IN_SECONDS );

	return new WP_REST_Response( array( 'results' => $results ) );
}

/* ================================================================== parsing */

/**
 * Split one formatted address into the four fields the checkout needs.
 *
 *   "SHOP 4A 108 BOURKE STREET MELBOURNE VIC 3000"
 *     -> street "Shop 4A 108 Bourke Street", city "Melbourne", VIC, 3000
 *
 * THE HARD PART IS THE SUBURB, and it is why this is done here rather than with
 * a regex. Suburb names are freely multi-word — MOUNT EVELYN, ST KILDA EAST,
 * BOX HILL NORTH — so nothing in the string itself says where the street line
 * stops and the suburb starts.
 *
 * The state and postcode are unambiguous: last token is four digits, the one
 * before it is one of eight known codes. Those two narrow the suburb to the
 * handful of localities that share that postcode, which the theme already has
 * on disk. Matching the LONGEST of those against the tail is then exact — "BOX
 * HILL NORTH" is preferred over "BOX HILL" because both would otherwise match.
 *
 * Returns null rather than a guess if the tail does not parse. A wrong split
 * puts half a suburb in the street line and misroutes the parcel; showing one
 * fewer suggestion costs nothing.
 */
function mts_street_parse( string $label ): ?array {
	$states = array( 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT' );
	$parts  = preg_split( '/\s+/', $label, -1, PREG_SPLIT_NO_EMPTY );

	if ( ! $parts || count( $parts ) < 4 ) {
		return null;
	}

	$postcode = array_pop( $parts );
	$state    = strtoupper( (string) array_pop( $parts ) );

	if ( ! preg_match( '/^\d{4}$/', (string) $postcode ) || ! in_array( $state, $states, true ) ) {
		return null;
	}

	$rest = implode( ' ', $parts );

	// Candidate suburbs for this postcode, longest first so the most specific
	// name wins the suffix test.
	$candidates = mts_street_localities( $state, (string) $postcode );
	usort( $candidates, static fn( string $a, string $b ): int => mb_strlen( $b ) <=> mb_strlen( $a ) );

	foreach ( $candidates as $suburb ) {
		$suffix = ' ' . strtoupper( $suburb );

		if ( str_ends_with( strtoupper( $rest ), $suffix ) ) {
			$street = trim( mb_substr( $rest, 0, mb_strlen( $rest ) - mb_strlen( $suffix ) ) );

			if ( '' === $street ) {
				return null; // Suburb with no street line — nothing to complete.
			}

			return array(
				'label'    => mts_street_case( $street ) . ', ' . mts_street_case( $suburb ) . ' ' . $state . ' ' . $postcode,
				'street'   => mts_street_case( $street ),
				'city'     => mts_street_case( $suburb ),
				'state'    => $state,
				'postcode' => (string) $postcode,
			);
		}
	}

	return null;
}

/**
 * Every locality sharing one state and postcode.
 *
 * Reads the same static file the browser-side finder uses, so there is exactly
 * one list of Australian localities in this theme. Held in a static so the file
 * is parsed once per request no matter how many suggestions come back.
 */
function mts_street_localities( string $state, string $postcode ): array {
	static $index = null;

	if ( null === $index ) {
		$index = array();
		$path  = get_template_directory() . '/assets/data/au-localities.txt';

		if ( is_readable( $path ) ) {
			foreach ( (array) file( $path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES ) as $line ) {
				$row = explode( '|', (string) $line );

				if ( 3 === count( $row ) ) {
					$index[ $row[1] . '|' . $row[2] ][] = $row[0];
				}
			}
		}
	}

	return $index[ $state . '|' . $postcode ] ?? array();
}

/**
 * ALL CAPS to something a person would write.
 *
 * G-NAF ships upper case throughout. Printing "SHOP 4A 108 BOURKE STREET" into a
 * checkout field looks like shouting and like a data import, neither of which
 * belongs on a finished order. Numbers and unit designators are left alone —
 * "4A" must not become "4a".
 */
function mts_street_case( string $text ): string {
	$words = preg_split( '/\s+/', trim( $text ), -1, PREG_SPLIT_NO_EMPTY ) ?: array();

	foreach ( $words as $i => $word ) {
		// Anything carrying a digit is an identifier, not a word: 4A, 108, 12-14.
		if ( ! preg_match( '/\d/', $word ) ) {
			$words[ $i ] = mb_convert_case( mb_strtolower( $word ), MB_CASE_TITLE, 'UTF-8' );
		}
	}

	return implode( ' ', $words );
}

/* ================================================================ throttling */

/**
 * Per-visitor hourly ceiling.
 *
 * The site-wide limit is 30 requests a minute. This stops one tab — or one
 * scraper that noticed an open endpoint — spending that allowance on behalf of
 * every real customer. Generous enough that nobody filling in a checkout will
 * ever meet it.
 */
function mts_street_within_cap(): bool {
	$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';

	if ( '' === $ip ) {
		return true;
	}

	$key   = 'mts_st_cap_' . md5( $ip );
	$count = (int) get_transient( $key );

	if ( $count >= MTS_STREET_HOURLY_CAP ) {
		return false;
	}

	set_transient( $key, $count + 1, HOUR_IN_SECONDS );

	return true;
}
