<?php
/**
 * Point the imported copy's internal links at this site.
 *
 * WHAT WAS WRONG
 *
 * Every one of the 54 imported articles links into the catalogue as it goes —
 * 553 links in total, and all of them absolute to mytapestore.com.au:
 *
 *      25  /product/plain-foil-tape/
 *      21  /product/polyimide-film-kapton-tape/
 *      18  /product/fibreglass-cloth-insulation-tape/
 *       8  /packaging-tapes/
 *       7  /duct-tape/
 *      39  /                                (the home page)
 *      …90 distinct targets in all
 *
 * That is the internal linking the copy was written with, and on this draft
 * every click on it left the draft. A reviewer reading a guide about foil tape
 * and tapping "plain foil tape" landed on the LIVE store — the one thing an
 * internal review is supposed to make impossible.
 *
 * THE TWO URL SHAPES
 *
 * Products match one for one: the live site and this one both serve them at
 * /product/<slug>/.
 *
 * Categories do not. The live site drops the base — /packaging-tapes/ — and
 * WooCommerce here serves /product-category/packaging-tapes/. A plain host swap
 * would have produced 404s for every category link in the blog, which is worse
 * than an off-site link because it looks like the draft is broken rather than
 * unfinished. Each one is resolved against the real taxonomy instead.
 *
 * ANYTHING THAT CANNOT BE RESOLVED IS LEFT ALONE, pointing at the live site. A
 * link to a page this draft does not have is more useful sending someone to the
 * real thing than to a 404 here.
 *
 * WHY A FILTER
 *
 * The bodies are owned by scripts/sync-blog.php. Rewriting the stored HTML fixes
 * it until the next pull; filtering fixes every pull after this one too. The
 * `strpos` guard means a body with no live-site link in it costs one substring
 * search.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

const MTS_LEGACY_HOST = 'mytapestore.com.au';

/**
 * Resolve one legacy path to its equivalent here, or '' if there is none.
 */
function mts_map_legacy_path( string $path ): string {
	$path = '/' . trim( (string) wp_parse_url( $path, PHP_URL_PATH ), '/' );
	$path = '/' === $path ? '/' : $path . '/';

	if ( '/' === $path ) {
		return home_url( '/' );
	}

	// /product/<slug>/ — same shape on both sites.
	if ( preg_match( '#^/product/([^/]+)/$#', $path, $m ) ) {
		$post = get_page_by_path( $m[1], OBJECT, 'product' );
		return $post ? (string) get_permalink( $post ) : '';
	}

	/*
	 * /industry/<slug>/ — the live site gives each industry its own landing page.
	 * This draft has the index and no per-industry pages, so a link to
	 * /industry/building-construction/ resolves to the index rather than being
	 * left off-site: the reader still arrives at the industries content, which is
	 * what the sentence around the link promised them.
	 */
	if ( preg_match( '#^/industry/([^/]+)/$#', $path, $m ) ) {
		$page = get_page_by_path( $m[1] );
		if ( $page ) {
			return (string) get_permalink( $page );
		}

		$index = get_page_by_path( 'industries' );
		return $index ? (string) get_permalink( $index ) : '';
	}

	// A single bare segment: a product CATEGORY on the live site, or a page.
	if ( preg_match( '#^/([^/]+)/$#', $path, $m ) ) {
		$term = get_term_by( 'slug', $m[1], 'product_cat' );
		if ( $term instanceof WP_Term ) {
			$link = get_term_link( $term );
			if ( ! is_wp_error( $link ) ) {
				return (string) $link;
			}
		}

		$page = get_page_by_path( $m[1] );
		if ( $page ) {
			return (string) get_permalink( $page );
		}

		$post = get_page_by_path( $m[1], OBJECT, 'post' );
		if ( $post ) {
			return (string) get_permalink( $post );
		}
	}

	return '';
}

/**
 * Rewrite every link to the legacy host that has an equivalent here.
 */
function mts_relink_legacy_content( string $content ): string {
	if ( is_admin() || false === strpos( $content, MTS_LEGACY_HOST ) ) {
		return $content;
	}

	static $resolved = array();

	return (string) preg_replace_callback(
		'#(href=")(https?://(?:www\.)?' . preg_quote( MTS_LEGACY_HOST, '#' ) . '([^"]*))(")#i',
		static function ( array $m ) use ( &$resolved ): string {
			$path = $m[3];

			if ( ! array_key_exists( $path, $resolved ) ) {
				$resolved[ $path ] = mts_map_legacy_path( $path );
			}

			// No equivalent here — leave it pointing at the real site rather than
			// manufacturing a 404.
			if ( '' === $resolved[ $path ] ) {
				return $m[0];
			}

			return $m[1] . esc_url( $resolved[ $path ] ) . $m[4];
		},
		$content
	);
}
add_filter( 'the_content', 'mts_relink_legacy_content', 25 );
add_filter( 'the_excerpt', 'mts_relink_legacy_content', 25 );
