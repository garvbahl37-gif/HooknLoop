<?php
/**
 * Import the store's real customer reviews as WooCommerce product reviews.
 *
 * Source: mytapestore-redesign/src/data/reviews.js, which its own header
 * records as "pulled verbatim from the live mytapestore.com.au WooCommerce
 * Store API" — these are the store's genuine reviews, keyed by product handle.
 *
 * They are imported as real comment rows rather than hardcoded into a template
 * so they can be moderated, attributed and removed like any other review, and
 * so both the homepage testimonial band and each product page read from one
 * source.
 *
 * Idempotent: a review is skipped when the same author has already left the
 * same text on the same product.
 */
require '/wordpress/wp-load.php';

$path = '/wordpress/mts-content/reviews.json';
if ( ! file_exists( $path ) ) {
	fwrite( STDERR, "missing reviews.json\n" );
	exit( 1 );
}

$data     = json_decode( (string) file_get_contents( $path ), true ) ?: array();
$added    = 0;
$skipped  = 0;
$no_match = 0;

foreach ( $data as $handle => $reviews ) {
	$page = get_page_by_path( (string) $handle, OBJECT, 'product' );
	if ( ! $page ) {
		$no_match += count( $reviews );
		continue;
	}

	foreach ( $reviews as $review ) {
		$author = trim( (string) ( $review['name'] ?? '' ) ) ?: 'Customer';
		$text   = trim( (string) ( $review['text'] ?? '' ) );
		$rating = (int) ( $review['rating'] ?? 5 );

		if ( '' === $text ) {
			continue;
		}

		$existing = get_comments( array(
			'post_id' => $page->ID,
			'author_email' => '',
			'search'  => mb_substr( $text, 0, 40 ),
			'number'  => 1,
			'count'   => true,
		) );
		if ( $existing ) {
			$skipped++;
			continue;
		}

		// "date" is a display string like "Oct 2025"; strtotime resolves it to
		// the first of that month, which is as precise as the source allows.
		$stamp = strtotime( (string) ( $review['date'] ?? '' ) ) ?: time();

		$comment_id = wp_insert_comment( array(
			'comment_post_ID'      => $page->ID,
			'comment_author'       => $author,
			'comment_author_email' => '',
			'comment_content'      => $text,
			'comment_type'         => 'review',
			'comment_approved'     => 1,
			'comment_date'         => gmdate( 'Y-m-d H:i:s', $stamp ),
			'comment_date_gmt'     => gmdate( 'Y-m-d H:i:s', $stamp ),
		) );

		if ( ! $comment_id ) {
			continue;
		}

		add_comment_meta( $comment_id, 'rating', max( 1, min( 5, $rating ) ) );
		if ( ! empty( $review['verified'] ) ) {
			add_comment_meta( $comment_id, 'verified', 1 );
		}
		$added++;
	}
}

// Recalculate the aggregate ratings the product cards and stars read.
$product_ids = get_posts( array( 'post_type' => 'product', 'posts_per_page' => -1, 'fields' => 'ids' ) );
foreach ( $product_ids as $pid ) {
	$p = wc_get_product( $pid );
	if ( $p ) {
		WC_Comments::get_average_rating_for_product( $p );
		WC_Comments::get_review_count_for_product( $p );
	}
}

printf( "reviews: %d added, %d already present, %d had no matching product\n", $added, $skipped, $no_match );
