<?php
/**
 * Site-structure gaps between WordPress and the Shopify store.
 *
 * Three things, none of which is a theme problem — they are all missing or
 * mis-set CONTENT, which is why no amount of template work fixed them:
 *
 * 1. THE BLOG WAS NOT A BLOG.
 *    55 posts existed and nothing linked to them: `page_for_posts` was 0, so
 *    /blog/ resolved to a leftover page whose body is Kapee shortcode markup
 *    ([kapee-blog]) that this theme has no renderer for — the page rendered an
 *    empty <div> where Shopify shows an article index. Pointing the posts page
 *    at it makes WordPress route /blog/ through the theme's home.php instead.
 *
 * 2. NO "BULK & TRADE" PAGE.
 *    The Shopify footer links /pages/bulk-trade and WordPress had no equivalent,
 *    so that footer entry had nowhere to point.
 *
 * 3. CATEGORY PRODUCT ORDER.
 *    WooCommerce sorts a category by the shop default; mytapestore.com.au puts
 *    its bestsellers on the first row and returning customers navigate by that
 *    shape. scripts/pull-category-order.py captures the live order and this
 *    stores it per category as term meta `_mts_product_order`, which
 *    inc/filters.php applies to the archive query.
 *
 * Run:
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://localhost:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./theme:/wordpress/wp-content/themes/mytapestore \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --mount=./content:/wordpress/mts-content \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/sync-site-structure.php
 *
 * ALWAYS pass --site-url. Without it the CLI boots on a random port and writes
 * that port into the siteurl/home options, so the live dev server then
 * canonical-redirects every visitor to a dead address.
 *
 * Idempotent.
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

/* ------------------------------------------------------------ 1. the blog --*/

$mts_blog = get_page_by_path( 'blog' );

if ( ! $mts_blog ) {
	$mts_blog_id = wp_insert_post( array(
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'Blog',
		'post_name'    => 'blog',
		'post_content' => '',
	) );
	$mts_blog = $mts_blog_id && ! is_wp_error( $mts_blog_id ) ? get_post( $mts_blog_id ) : null;
	echo "created the Blog page\n";
}

if ( $mts_blog ) {
	/*
	 * The page's stored body is builder markup for a plugin this site does not
	 * run. As the posts page WordPress ignores the body entirely — but leaving
	 * shortcode residue in it means anyone who later un-sets the posts page gets
	 * the broken version back. Clear it.
	 */
	if ( false !== strpos( (string) $mts_blog->post_content, 'kapee' ) ) {
		wp_update_post( array( 'ID' => $mts_blog->ID, 'post_content' => '' ) );
		echo "cleared the Kapee shortcode body from the Blog page\n";
	}

	if ( (int) get_option( 'page_for_posts' ) !== (int) $mts_blog->ID ) {
		update_option( 'show_on_front', 'page' );
		update_option( 'page_for_posts', (int) $mts_blog->ID );
		echo "set page_for_posts to #{$mts_blog->ID} (/blog/)\n";
	}
}

/*
 * show_on_front = 'page' needs a front page too, or WordPress shows the post
 * list at /. The theme has front-page.php, which takes priority for the static
 * front page; without page_on_front set, "page" mode has nothing to show.
 */
$mts_front = get_page_by_path( 'home' ) ?: get_page_by_path( 'homepage' );
if ( ! $mts_front ) {
	$mts_front_id = wp_insert_post( array(
		'post_type'   => 'page',
		'post_status' => 'publish',
		'post_title'  => 'Home',
		'post_name'   => 'home',
	) );
	$mts_front = $mts_front_id && ! is_wp_error( $mts_front_id ) ? get_post( $mts_front_id ) : null;
}
if ( $mts_front && (int) get_option( 'page_on_front' ) !== (int) $mts_front->ID ) {
	update_option( 'page_on_front', (int) $mts_front->ID );
	echo "set page_on_front to #{$mts_front->ID}\n";
}

/* -------------------------------------------------------- 2. bulk & trade --*/

if ( ! get_page_by_path( 'bulk-trade' ) ) {
	$mts_bulk = wp_insert_post( array(
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'Bulk & trade',
		'post_name'    => 'bulk-trade',
		'post_content' => implode( "\n\n", array(
			'<p>Buying tape by the carton rather than the roll? We price for it.</p>',
			'<h3>Volume pricing</h3>',
			'<p>Quantity breaks apply automatically on most lines — the price per roll drops as the quantity rises, and the break you qualify for is shown on the product page before you add to cart.</p>',
			'<h3>Trade accounts</h3>',
			'<p>Regular buyers can open an account for consistent pricing across the range, consolidated invoicing and priority dispatch. Tell us what you use and how often, and we will quote it.</p>',
			'<h3>Custom sizes and private label</h3>',
			'<p>Many of our lines can be slit to width or supplied in custom lengths, with a minimum order quantity. Printed and private-label tape is available on longer lead times.</p>',
			'<p>Get in touch with your requirements and we will come back with pricing and lead times.</p>',
		) ),
	) );
	if ( $mts_bulk && ! is_wp_error( $mts_bulk ) ) {
		echo "created the Bulk & trade page (#{$mts_bulk})\n";
	}
}

/* --------------------------------------------------- 3. category ordering --*/

$mts_order_file = '/wordpress/mts-content/category-order.json';

if ( ! file_exists( $mts_order_file ) ) {
	echo "\nno category-order.json — run scripts/pull-category-order.py first.\n";
} else {
	$mts_orders = json_decode( (string) file_get_contents( $mts_order_file ), true );

	if ( ! is_array( $mts_orders ) ) {
		echo "\ncategory-order.json is not valid JSON.\n";
	} else {
		$mts_set     = 0;
		$mts_pinned  = 0;
		$mts_unknown = array();

		foreach ( $mts_orders as $mts_slug => $mts_handles ) {
			$mts_term = get_term_by( 'slug', $mts_slug, 'product_cat' );
			if ( ! $mts_term instanceof WP_Term ) {
				$mts_unknown[] = $mts_slug;
				continue;
			}

			// Resolve handles to IDs, dropping any product this site does not
			// have. A pinned ID that is not in the category is harmless — the
			// archive only reorders products the query already returned.
			$mts_ids = array();
			foreach ( (array) $mts_handles as $mts_handle ) {
				$mts_post = get_page_by_path( (string) $mts_handle, OBJECT, 'product' );
				if ( $mts_post ) {
					$mts_ids[] = (int) $mts_post->ID;
				}
			}

			if ( ! $mts_ids ) {
				delete_term_meta( $mts_term->term_id, '_mts_product_order' );
				continue;
			}

			update_term_meta( $mts_term->term_id, '_mts_product_order', $mts_ids );
			++$mts_set;
			$mts_pinned += count( $mts_ids );
		}

		echo "\ncategory order: {$mts_set} categories, {$mts_pinned} pinned products\n";
		if ( $mts_unknown ) {
			echo "  no such category here: " . implode( ', ', array_slice( $mts_unknown, 0, 12 ) ) . "\n";
		}
	}
}

echo "\ndone\n";
