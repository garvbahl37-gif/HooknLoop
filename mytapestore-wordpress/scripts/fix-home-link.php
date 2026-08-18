<?php
/**
 * Point "Home" menu items at the site root.
 *
 * The live site's menu links Home to a page that exists only to hold the old
 * builder's homepage layout. Imported here, that page is a shell of empty
 * container shortcodes, so following "Home" landed on a blank article instead
 * of the storefront. The site root is served by front-page.php, which is the
 * real homepage now.
 */
require '/wordpress/wp-load.php';

$fixed = 0;
foreach ( wp_get_nav_menus() as $menu ) {
    foreach ( wp_get_nav_menu_items( $menu->term_id ) ?: array() as $item ) {
        $title_is_home = 0 === strcasecmp( trim( $item->title ), 'home' );
        if ( ! $title_is_home ) { continue; }

        wp_update_nav_menu_item( $menu->term_id, $item->ID, array(
            'menu-item-title'     => $item->title,
            // Root-relative on purpose: this database will move to a staging host and
        // then to mytapestore.com.au, and an absolute URL baked in here would
        // point at the wrong host after every move. (It also avoids the CLI's
        // own ephemeral site URL being written in.)
        'menu-item-url'       => '/',
            'menu-item-type'      => 'custom',
            'menu-item-object'    => '',
            'menu-item-object-id' => 0,
            'menu-item-status'    => 'publish',
            'menu-item-parent-id' => $item->menu_item_parent,
            'menu-item-position'  => $item->menu_order,
        ) );
        $fixed++;
        printf( "  repointed '%s' in %s -> /\n", $item->title, $menu->name );
    }
}

// The builder shell page should not be reachable or indexed either.
foreach ( array( 'layout-dokan' ) as $slug ) {
    $page = get_page_by_path( $slug );
    if ( $page ) {
        wp_update_post( array( 'ID' => $page->ID, 'post_status' => 'draft' ) );
        printf( "  drafted leftover builder page /%s/\n", $slug );
    }
}
printf( "%d menu items repointed\n", $fixed );
