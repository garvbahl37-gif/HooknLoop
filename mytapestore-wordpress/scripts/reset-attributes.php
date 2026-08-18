<?php
/**
 * Clear every product-attribute term before re-importing.
 *
 * Needed because the first import wrote terms into the wrong taxonomies (live
 * attribute IDs used against local ones). Re-running the importer re-assigns
 * each product's attributes, but the stray terms would linger in the wrong
 * taxonomy and keep showing up in the filter panel.
 */
require '/wordpress/wp-load.php';

$removed = 0;
foreach ( wc_get_attribute_taxonomies() as $tax ) {
    $taxonomy = wc_attribute_taxonomy_name( $tax->attribute_name );
    if ( ! taxonomy_exists( $taxonomy ) ) {
        register_taxonomy( $taxonomy, 'product', array( 'hierarchical' => false, 'show_ui' => false ) );
    }
    $terms = get_terms( array( 'taxonomy' => $taxonomy, 'hide_empty' => false, 'fields' => 'ids' ) );
    if ( is_wp_error( $terms ) ) { continue; }
    foreach ( $terms as $term_id ) {
        wp_delete_term( $term_id, $taxonomy );
        $removed++;
    }
    printf( "  cleared %-24s\n", $taxonomy );
}
printf( "removed %d attribute terms\n", $removed );
