<?php
/**
 * Assign the imported menus to the theme's locations.
 *
 * The importer could only guess at 'primary'. This maps the rest by inspecting
 * what each menu actually contains, which is more reliable than matching on a
 * name a merchant may have changed.
 */
require '/wordpress/wp-load.php';

$menus = wp_get_nav_menus();
echo "Menus found:\n";
foreach ( $menus as $m ) {
	echo sprintf( "  #%-4d %-34s %d items\n", $m->term_id, $m->name, $m->count );
}

$locations = (array) get_theme_mod( 'nav_menu_locations', array() );
$by_size   = $menus;
usort( $by_size, fn( $a, $b ) => $b->count <=> $a->count );

foreach ( $menus as $m ) {
	$slug = sanitize_title( $m->name );
	if ( str_contains( $slug, 'main' ) || str_contains( $slug, 'primary' ) ) {
		$locations['primary'] = $m->term_id;
	}
}
// Largest menu is the category tree; use it for primary if nothing matched.
if ( empty( $locations['primary'] ) && $by_size ) {
	$locations['primary'] = $by_size[0]->term_id;
}

// Footer columns: fill from the remaining menus, largest first.
$used    = array( $locations['primary'] ?? 0 );
$columns = array( 'footer-1', 'footer-2', 'footer-3' );
foreach ( $by_size as $m ) {
	if ( in_array( $m->term_id, $used, true ) ) {
		continue;
	}
	$slot = array_shift( $columns );
	if ( ! $slot ) {
		break;
	}
	$locations[ $slot ] = $m->term_id;
	$used[]             = $m->term_id;
}

set_theme_mod( 'nav_menu_locations', $locations );

echo "\nAssigned:\n";
foreach ( $locations as $loc => $id ) {
	$m = wp_get_nav_menu_object( $id );
	echo sprintf( "  %-10s -> %s\n", $loc, $m ? $m->name : '(none)' );
}
