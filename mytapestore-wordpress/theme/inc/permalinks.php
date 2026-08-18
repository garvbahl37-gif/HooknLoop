<?php
/**
 * Keep the blog URL structure matching mytapestore.com.au.
 *
 * THE PROBLEM THIS SOLVES
 *
 * The live site serves articles at /blog/<slug>/ — verified against its own REST
 * API, which reports links like
 * https://mytapestore.com.au/blog/hardwood-floor-protection-hacks-australia/.
 * This install kept landing on WordPress's dated default instead, so the same
 * article sat at /2025/11/05/hardwood-floor-protection-hacks-australia/: every
 * inbound link and every search result pointing at a live URL would 404 after a
 * cutover, and the two sites could not be compared page for page.
 *
 * scripts/fix-post-permalinks.php sets the option correctly and the change
 * sticks — until the next boot. The WP Playground runtime REWRITES
 * `permalink_structure` back to the dated default every time it starts, whether
 * that is `wp-playground-cli server` or a one-off `wp-playground-cli php`. This
 * was proved rather than assumed: writing a probe option and the permalink
 * structure in the same process and reading both back in a second process, the
 * probe survived and the permalink structure did not.
 *
 * So the structure cannot live in an option that something else owns. The theme
 * asserts it on every request instead, which also means the draft still has the
 * right URLs after the snapshot ZIP is unpacked on someone else's machine.
 *
 * COST
 *
 * One get_option() on a value WordPress has already autoloaded, and — only on the
 * request after a reset — one update_option() plus one rewrite flush. Steady
 * state is a string comparison.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/**
 * The structure the live site uses.
 *
 * /blog/ is also the posts page, and that is deliberate: WordPress serves the
 * page at the bare path and the articles beneath it. It is the same arrangement
 * mytapestore.com.au runs.
 */
const MTS_PERMALINK_STRUCTURE = '/blog/%postname%/';

/**
 * Restore the structure whenever something has reset it.
 *
 * THE TIMING HERE IS THE WHOLE POINT — DO NOT MOVE IT TO `init`.
 *
 * The first version of this ran on `init` at priority 99 and called
 * $wp_rewrite->set_permalink_structure(), which looked like the careful thing to
 * do: it recomputes use_verbose_page_rules and the permastruct front, where a
 * bare update_option() would leave $wp_rewrite holding the old structure for the
 * rest of the request.
 *
 * What it actually did was take the account area down. set_permalink_structure()
 * calls WP_Rewrite::init(), and the first thing init() does is
 *
 *     $this->endpoints = array();
 *
 * WooCommerce registers /my-account/orders/, /downloads/, /edit-address/,
 * /edit-account/ and the rest as REWRITE ENDPOINTS on `init` at priority 10. So
 * at priority 99 this wiped all of them, and then flushed — writing a rule set
 * with no account endpoints in it at all. Every account link fell through to the
 * catch-all page rule, matched nothing, and redirected to the home page. Six
 * sidebar rows, all landing on the front page.
 *
 * So: set the option BEFORE anything registers an endpoint, and flush AFTER
 * everything has.
 *
 *   after_setup_theme — the theme's own load, well before `init`. Nothing has
 *                       registered an endpoint yet, so clearing the array costs
 *                       nothing, and $wp_rewrite re-reads the structure in time
 *                       for every permalink generated this request.
 *   wp_loaded         — after `init` has finished, so WooCommerce's endpoints,
 *                       the product post type and every taxonomy are present in
 *                       the rules being written.
 */
function mts_enforce_permalink_structure(): void {
	if ( wp_installing() || is_network_admin() ) {
		return;
	}

	if ( MTS_PERMALINK_STRUCTURE === get_option( 'permalink_structure' ) ) {
		return;
	}

	update_option( 'permalink_structure', MTS_PERMALINK_STRUCTURE );

	global $wp_rewrite;
	if ( $wp_rewrite instanceof WP_Rewrite ) {
		// Safe HERE and nowhere later: this is before `init`, so the endpoint
		// array it empties is still empty.
		$wp_rewrite->init();
	}

	// Rules are rebuilt once the request has finished registering things.
	add_action( 'wp_loaded', 'mts_flush_permalinks', 99 );
}
add_action( 'after_setup_theme', 'mts_enforce_permalink_structure', 1 );

/**
 * The flush, at the only moment it is safe to do one.
 */
function mts_flush_permalinks(): void {
	flush_rewrite_rules( true );
}

/*
 * ============================================================================
 * PRODUCT CATEGORIES AT THE SITE ROOT — exactly as mytapestore.com.au serves them.
 *
 * THE LIVE URLS
 *
 *     https://mytapestore.com.au/masking-tape/
 *     https://mytapestore.com.au/industry/aerospace-defense/
 *
 * No /product-category/ anywhere — the live site 301s that form back to the bare
 * one, so bare is canonical. This theme was serving /product-category/<slug>/,
 * which is 65 of the 66 category URLs different. Replacing the live site with
 * that would 404 every category landing page: the organic rankings that earn the
 * most traffic, and every Google Ads final URL pointing at a category, which is
 * a landing-page policy disapproval within days.
 *
 * WHY THE SETTING ALONE CANNOT DO THIS
 *
 * scripts/match-live-urls.php writes `category_base => ''` into
 * woocommerce_permalinks, and WooCommerce throws it away. wc_get_permalink_structure()
 * does:
 *
 *     $saved = (array) get_option( 'woocommerce_permalinks', array() );
 *     $permalinks = wp_parse_args( array_filter( $saved ), array(
 *         'category_base' => _x( 'product-category', 'slug', 'woocommerce' ),
 *         …
 *
 * `array_filter` with no callback drops every falsy value, and '' is falsy — so
 * an empty base is removed and the default put back. There is no value you can
 * save through the admin that produces a bare category URL. The taxonomy has to
 * be re-registered instead.
 *
 * WHY BOTH SHAPES COME OUT RIGHT
 *
 * `hierarchical => true` keeps a child term's parent in its path, and 'industry'
 * is a real top-level term with 26 children on BOTH sites — verified, same 26.
 * So one empty base yields /masking-tape/ for a top-level term and
 * /industry/aerospace-defense/ for a child, with no per-term rules and no
 * redirect table.
 *
 * WHY THE RULES ARE SAFE
 *
 * They are generated per TERM, from terms that exist, so nothing that is not a
 * category can be shadowed by them. Two further guards:
 *
 *   · the permalink structure above sets use_verbose_page_rules, so WordPress
 *     emits an explicit rule per PAGE ahead of these; pages win their own URLs
 *   · match-live-urls.php refuses to run while any category slug collides with
 *     a page, a post or a reserved path. Checked: zero collisions
 *
 * WHY NOT AN EMPTY REWRITE SLUG EITHER
 *
 * The obvious second attempt — re-registering the taxonomy with
 * `rewrite['slug'] => ''` — does not work: register_taxonomy() substitutes the
 * TAXONOMY NAME for an empty slug, so the URLs came out as
 * /product_cat/masking-tape/, which is worse than where we started.
 *
 * So the base stays 'product-category' internally, and two filters do the work:
 * one rewrites the links the site prints, the other teaches WordPress to resolve
 * them. Explicit per-term rules rather than a catch-all — 73 terms is 146 rules,
 * they are generated from terms that actually exist, and nothing else on the site
 * can be shadowed by them.
 */

/**
 * The full path of a category, parents included: 'industry/aerospace-defense'.
 */
function mts_term_path( WP_Term $term ): string {
	$parts = array( $term->slug );

	$parent = (int) $term->parent;
	$guard  = 0;

	// The guard is not paranoia — a term loop in the database would hang the
	// request, and this runs on every rewrite flush.
	while ( $parent > 0 && $guard < 10 ) {
		$ancestor = get_term( $parent, 'product_cat' );
		if ( ! $ancestor instanceof WP_Term ) {
			break;
		}
		array_unshift( $parts, $ancestor->slug );
		$parent = (int) $ancestor->parent;
		$guard++;
	}

	return implode( '/', $parts );
}

/**
 * Print category links without the base.
 *
 * /product-category/industry/aerospace-defense/ → /industry/aerospace-defense/
 */
add_filter( 'term_link', function ( $url, $term, $taxonomy ) {
	if ( 'product_cat' !== $taxonomy || ! is_string( $url ) ) {
		return $url;
	}

	$base = mts_product_cat_base();
	return $base ? str_replace( '/' . $base . '/', '/', $url ) : $url;
}, 10, 3 );

/**
 * Whatever WooCommerce is currently using as the category base.
 */
function mts_product_cat_base(): string {
	if ( ! function_exists( 'wc_get_permalink_structure' ) ) {
		return 'product-category';
	}

	$structure = wc_get_permalink_structure();
	return trim( (string) ( $structure['category_rewrite_slug'] ?? $structure['category_base'] ?? '' ), '/' );
}

/**
 * Teach WordPress to resolve the bare URLs.
 *
 * Prepended, so a category rule is tried before WordPress's generic page and
 * post rules — but AFTER the verbose per-page rules, which core puts first. A
 * page therefore still wins its own URL.
 */
add_filter( 'rewrite_rules_array', function ( array $rules ): array {
	$terms = get_terms( array(
		'taxonomy'   => 'product_cat',
		'hide_empty' => false,
	) );

	if ( is_wp_error( $terms ) || ! $terms ) {
		return $rules;
	}

	$bare = array();

	foreach ( $terms as $term ) {
		$path = mts_term_path( $term );
		if ( '' === $path ) {
			continue;
		}

		$quoted = preg_quote( $path, '/' );

		// Order matters: the more specific rules must precede the bare one, or
		// "/masking-tape/page/2/" matches the plain rule and drops the page.
		$bare[ $quoted . '/page/?([0-9]{1,})/?$' ]  = 'index.php?product_cat=' . $term->slug . '&paged=$matches[1]';
		$bare[ $quoted . '/feed/?$' ]               = 'index.php?product_cat=' . $term->slug . '&feed=feed';
		$bare[ $quoted . '/?$' ]                    = 'index.php?product_cat=' . $term->slug;
	}

	return $bare + $rules;
} );

/**
 * Send the old /product-category/… form to the bare one, as the live site does.
 *
 * mytapestore.com.au answers /product-category/masking-tape/ with a 301 to
 * /masking-tape/. Anything already linking to the prefixed form — an old post, a
 * bookmark, another site — keeps working and consolidates onto one URL rather
 * than leaving two live paths to the same page.
 */
add_action( 'template_redirect', function (): void {
	if ( ! is_tax( 'product_cat' ) || is_admin() ) {
		return;
	}

	$base = mts_product_cat_base();
	if ( '' === $base ) {
		return;
	}

	$path = (string) wp_parse_url( $_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
	if ( false === strpos( $path, '/' . $base . '/' ) ) {
		return;
	}

	$term = get_queried_object();
	if ( ! $term instanceof WP_Term ) {
		return;
	}

	$target = get_term_link( $term );
	if ( is_wp_error( $target ) ) {
		return;
	}

	wp_safe_redirect( $target, 301 );
	exit;
} );

/**
 * Rebuild the rules once after the base changes.
 *
 * Keyed on a version rather than on the option, because the option is not what
 * changed — the taxonomy registration is, and there is nothing in the database
 * to compare against. Bump the constant to force a re-flush.
 */
const MTS_URL_SCHEME_VERSION = '2-bare-category-base';

add_action( 'wp_loaded', function (): void {
	if ( wp_installing() || get_option( 'mts_url_scheme' ) === MTS_URL_SCHEME_VERSION ) {
		return;
	}

	flush_rewrite_rules( true );
	update_option( 'mts_url_scheme', MTS_URL_SCHEME_VERSION );
}, 98 );
