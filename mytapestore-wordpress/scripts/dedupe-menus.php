<?php
/**
 * Remove duplicate menu items left by earlier non-idempotent import runs.
 *
 * Duplicates are identified by (menu, parent, title, url) — the tuple that
 * makes two entries indistinguishable to a visitor. The lowest ID wins so the
 * original ordering survives.
 */
require '/wordpress/wp-load.php';

$removed = 0;
foreach ( wp_get_nav_menus() as $menu ) {
    $items = wp_get_nav_menu_items( $menu->term_id, array( 'post_status' => 'any' ) ) ?: array();
    $seen  = array();
    $before = count( $items );

    foreach ( $items as $item ) {
        $key = implode( '|', array( (int) $item->menu_item_parent, strtolower( trim( $item->title ) ), $item->url ) );
        if ( isset( $seen[ $key ] ) ) {
            wp_delete_post( (int) $item->ID, true );
            $removed++;
            continue;
        }
        $seen[ $key ] = (int) $item->ID;
    }

    printf( "  %-20s %d -> %d items\n", $menu->name, $before, count( $seen ) );
}
printf( "removed %d duplicate menu items\n", $removed );
