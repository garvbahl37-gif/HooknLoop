<?php
/**
 * Navigation helpers.
 *
 * The design's mega-nav needs a TREE — a top-level item plus its children,
 * split into one or three columns depending on how many children it has.
 * Shopify hands that over ready-made as `link.links`; WordPress hands over a
 * flat array of menu item objects with a `menu_item_parent` on each, so the
 * tree has to be rebuilt here before anything can render.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Number of children above which a mega-menu splits into three columns.
 *
 * Matches the Shopify theme's columns_threshold default and MENUS in
 * Header.jsx: Double-Sided Tape (9 children) stays one column, Single-Sided
 * Tapes (26) becomes three.
 */
const MTS_MEGA_COLUMN_THRESHOLD = 10;

/**
 * Build a nested tree for one menu location.
 *
 * @return array<int,object> Top-level items, each with a ->mts_children array.
 */
function mts_menu_tree( string $location ): array {
	static $cache = array();

	if ( isset( $cache[ $location ] ) ) {
		return $cache[ $location ];
	}

	$locations = get_nav_menu_locations();
	if ( empty( $locations[ $location ] ) ) {
		$cache[ $location ] = array();
		return array();
	}

	$items = wp_get_nav_menu_items( $locations[ $location ] );
	if ( ! $items ) {
		$cache[ $location ] = array();
		return array();
	}

	$by_id = array();
	foreach ( $items as $item ) {
		$item->mts_children      = array();
		$by_id[ (int) $item->ID ] = $item;
	}

	$roots = array();
	foreach ( $items as $item ) {
		$parent = (int) $item->menu_item_parent;
		if ( $parent && isset( $by_id[ $parent ] ) ) {
			$by_id[ $parent ]->mts_children[] = $item;
		} else {
			$roots[] = $item;
		}
	}

	$cache[ $location ] = $roots;
	return $roots;
}

/**
 * Index of the last top-level item wide enough to need a 3-column panel.
 *
 * That one gets pinned right, because a three-column panel hanging off a
 * right-hand trigger would otherwise run off the viewport.
 */
function mts_last_wide_index( array $roots ): int {
	$last = -1;
	foreach ( $roots as $i => $item ) {
		if ( count( $item->mts_children ) > MTS_MEGA_COLUMN_THRESHOLD ) {
			$last = $i;
		}
	}
	return $last;
}

/**
 * Split children into columns, matching the React version's ceil(n / cols).
 *
 * @return array<int,array<int,object>>
 */
function mts_split_columns( array $children, int $columns ): array {
	if ( $columns < 1 || ! $children ) {
		return array();
	}

	$per = (int) ceil( count( $children ) / $columns );
	return array_chunk( $children, max( 1, $per ) );
}

/**
 * Current live cart count, safe to call before WooCommerce has a cart.
 *
 * WooCommerce only builds the cart object on the front end after `wp_loaded`,
 * and the header renders on pages (feeds, some REST-adjacent requests) where it
 * may not exist at all. Guarding here keeps the header from fatalling in those
 * contexts.
 */
function mts_cart_count(): int {
	if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
		return 0;
	}
	return (int) WC()->cart->get_cart_contents_count();
}

/** Cart URL that degrades gracefully if WooCommerce is inactive. */
function mts_cart_url(): string {
	return function_exists( 'wc_get_cart_url' ) ? wc_get_cart_url() : home_url( '/cart/' );
}

/** My-account URL that degrades gracefully if WooCommerce is inactive. */
function mts_account_url(): string {
	return function_exists( 'wc_get_page_permalink' )
		? (string) wc_get_page_permalink( 'myaccount' )
		: home_url( '/my-account/' );
}

/**
 * Initials for the signed-in avatar disc.
 *
 * Signed in, the outline user glyph becomes a filled initials disc — the one
 * place in the header that changes state, so "am I logged in?" is answerable at
 * a glance. Falls back to the email's first letter for accounts created at
 * checkout with no name on file.
 */
function mts_user_initials(): string {
	if ( ! is_user_logged_in() ) {
		return '';
	}

	$user     = wp_get_current_user();
	$initials = '';

	if ( $user->first_name ) {
		$initials = mb_substr( $user->first_name, 0, 1 );
		if ( $user->last_name ) {
			$initials .= mb_substr( $user->last_name, 0, 1 );
		}
	} elseif ( $user->user_email ) {
		$initials = mb_substr( $user->user_email, 0, 1 );
	}

	return $initials ? mb_strtoupper( $initials ) : 'A';
}
