<?php
/**
 * Attach the category editorial content to their product_cat terms.
 *
 * Source: mytapestore-redesign/src/data/categorySeo.js — the long-form copy the
 * original category pages carried (why-choose lists, applications, FAQs). It is
 * real marketing content and the main reason those pages rank, so it belongs on
 * the category, not in a template.
 *
 * Stored as JSON in term meta rather than shoehorned into term_description:
 * the content is STRUCTURED (heading / paragraph / list / faq), and flattening
 * it to an HTML blob would lose the FAQ grouping the design renders as an
 * accordion — and which search engines read as FAQ markup.
 */
require '/wordpress/wp-load.php';

$path = '/wordpress/mts-content/category-seo.json';
if ( ! file_exists( $path ) ) {
    fwrite( STDERR, "missing category-seo.json\n" );
    exit( 1 );
}

$data    = json_decode( (string) file_get_contents( $path ), true ) ?: array();
$applied = 0;
$missing = array();

foreach ( $data as $slug => $entry ) {
    $term = get_term_by( 'slug', $slug, 'product_cat' );
    if ( ! $term ) {
        $missing[] = $slug;
        continue;
    }
    $blocks = $entry['blocks'] ?? array();
    if ( ! $blocks ) {
        continue;
    }
    update_term_meta( $term->term_id, '_mts_seo_blocks', wp_json_encode( $blocks ) );
    $applied++;
}

printf( "applied editorial content to %d categories\n", $applied );
if ( $missing ) {
    printf( "no matching term for %d slugs: %s\n", count( $missing ), implode( ', ', array_slice( $missing, 0, 8 ) ) );
}
