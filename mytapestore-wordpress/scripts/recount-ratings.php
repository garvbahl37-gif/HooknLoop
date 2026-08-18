<?php
/**
 * Recompute every product's average rating and review count.
 *
 * The reviews were imported straight into the comments table, which fills the
 * table but not WooCommerce's LOOKUP META. WooCommerce reads `_wc_average_rating`
 * and `_wc_review_count` — not the comments — for the stars on a card, the
 * rating row on a product page and the "Top rated" sort. Both were left at 0.
 *
 * So a product with a five-star review displayed "0.0", the summary rendered no
 * stars at all (the star partial correctly draws nothing for a zero rating), and
 * sorting by rating ordered the catalogue by a column of zeroes.
 *
 * WC_Comments::get_average_rating_for_product() and get_rating_counts_for_product()
 * both RECALCULATE from the comments and persist the result, so this is simply
 * asking WooCommerce to catch up with its own data.
 *
 * Run (note --site-url; see fix-site-url.php for why):
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://localhost:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./theme:/wordpress/wp-content/themes/mytapestore \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/recount-ratings.php
 *
 * Idempotent.
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

global $wpdb;

$ids = get_posts( array(
	'post_type'      => 'product',
	'post_status'    => 'any',
	'posts_per_page' => -1,
	'fields'         => 'ids',
) );

$with_reviews = 0;

foreach ( $ids as $id ) {
	$product = wc_get_product( $id );
	if ( ! $product ) {
		continue;
	}

	/*
	 * Computed here rather than through WC_Comments::get_rating_counts_for_product().
	 * That helper builds the same figures and calls $product->save(), and on this
	 * install the save left `_wc_rating_count` as an empty string — which then
	 * made get_average_rating_for_product() divide by a count of zero and persist
	 * an average of 0 for 95 products that each had a real five-star review. The
	 * SQL below is WooCommerce's own; only the writing is ours, so the numbers
	 * are the numbers WooCommerce would have produced.
	 */
	$rows = $wpdb->get_results( $wpdb->prepare(
		"SELECT meta_value, COUNT(*) AS meta_value_count
		   FROM {$wpdb->commentmeta}
		   LEFT JOIN {$wpdb->comments} ON {$wpdb->commentmeta}.comment_id = {$wpdb->comments}.comment_ID
		  WHERE meta_key = 'rating'
		    AND comment_post_ID = %d
		    AND comment_approved = '1'
		    AND meta_value > 0
		  GROUP BY meta_value",
		$id
	) );

	$counts = array();
	$sum    = 0;
	$total  = 0;

	foreach ( $rows as $row ) {
		$stars            = (int) $row->meta_value;
		$n                = (int) $row->meta_value_count;
		$counts[ $stars ] = $n;
		$sum             += $stars * $n;
		$total           += $n;
	}

	$average = $total > 0 ? round( $sum / $total, 2 ) : 0;

	$product->set_rating_counts( $counts );
	$product->set_average_rating( (string) $average );
	$product->set_review_count( $total );
	$product->save();

	if ( $total > 0 ) {
		++$with_reviews;
		printf( "  %-52s %s\u{2605} from %d\n", $product->get_name(), $average, $total );
	}
}

printf( "\n%d products checked, %d now carry a rating\n", count( $ids ), $with_reviews );
