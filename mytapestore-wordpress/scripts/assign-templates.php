<?php
require '/wordpress/wp-load.php';
$map = array( 'wishlist' => 'page-wishlist.php', 'industries' => 'page-industries.php' );
foreach ( $map as $slug => $template ) {
    $page = get_page_by_path( $slug );
    if ( ! $page ) { printf( "  /%s/ not found\n", $slug ); continue; }
    update_post_meta( $page->ID, '_wp_page_template', $template );
    printf( "  /%s/ -> %s\n", $slug, $template );
}
