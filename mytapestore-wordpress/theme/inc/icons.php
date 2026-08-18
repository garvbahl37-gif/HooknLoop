<?php
/**
 * The redesign's icon set.
 *
 * Ported 1:1 from mytapestore-redesign/src/components/Icon.jsx via the Shopify
 * theme's mts-icon snippet — flat, stroke-based, 24x24, currentColor, 1.75
 * stroke. That utilitarian line register is what makes the design read as a
 * trade supplier rather than a consumer boutique, so the geometry is copied
 * exactly rather than substituted for an icon font.
 *
 * Usage:
 *   mts_the_icon( 'cart', 22 );
 *   echo mts_icon( 'search', 20, 'hd-search__ic', 'Search' );
 *
 * Omitting $title renders the icon aria-hidden, which is correct whenever
 * neighbouring text already names the thing. Pass $title only when the icon is
 * the sole label.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/**
 * The path data for every icon, keyed by the name used in the React source.
 *
 * @return array<string,string>
 */
function mts_icon_paths(): array {
	static $paths = null;

	if ( null !== $paths ) {
		return $paths;
	}

	$paths = array(
		'search'      => '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
		'cart'        => '<path d="M3 4h2l2.2 12.2a1.5 1.5 0 0 0 1.5 1.3h8.6a1.5 1.5 0 0 0 1.5-1.2L21 8H6"/><circle cx="9.5" cy="20.5" r="1.4"/><circle cx="18" cy="20.5" r="1.4"/>',
		'user'        => '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>',
		'heart'       => '<path d="M12 20.5S3.5 15 3.5 8.9A4.4 4.4 0 0 1 12 6.9a4.4 4.4 0 0 1 8.5 2c0 6.1-8.5 11.6-8.5 11.6z"/>',
		'phone'       => '<path d="M4 5c0 8.3 6.7 15 15 15l1.5-3.2-4-1.8-1.7 1.7a11.7 11.7 0 0 1-5.2-5.2l1.7-1.7-1.8-4L6 4A2 2 0 0 0 4 5z"/>',
		'truck'       => '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
		'badgeCheck'  => '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
		'mapPin'      => '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
		'australia'   => '<path d="M2 11C2 8 4 6 7 5.3C9 4.8 10.5 5 11 6.5L13 10L14 5.5C15 5 16 5.5 16.5 7C19 8.5 21 11 21 14C21 16.5 19.5 18.5 17 19C13 19.8 9 19.5 6 17.5C3.5 16 2 13.5 2 11Z"/><circle cx="11.5" cy="12.3" r="1.1" fill="currentColor" stroke="none"/>',
		'card'        => '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
		'shield'      => '<path d="M12 3l7 2.5v5c0 5-3.4 8.6-7 10-3.6-1.4-7-5-7-10v-5z"/>',
		'shieldCheck' => '<path d="M12 3l7 2.5v5c0 5-3.4 8.6-7 10-3.6-1.4-7-5-7-10v-5z"/><path d="M9 11.5l2 2 4-4"/>',
		'warehouse'   => '<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/>',
		'lock'        => '<rect x="5" y="10.5" width="14" height="9.5" rx="1.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
		'medal'       => '<circle cx="12" cy="10" r="5"/><path d="M9 14l-2 7 5-3 5 3-2-7"/>',
		'flag'        => '<path d="M5 21V4"/><path d="M5 4h13l-3 4 3 4H5"/>',
		'ruler'       => '<rect x="2.5" y="8" width="19" height="8" rx="1"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>',
		'check'       => '<path d="M4 12.5l5 5 11-11"/>',
		'chevronDown' => '<path d="M6 9l6 6 6-6"/>',
		'chevronRight'=> '<path d="M9 6l6 6-6 6"/>',
		'arrowRight'  => '<path d="M4 12h16"/><path d="M14 6l6 6-6 6"/>',
		'menu'        => '<path d="M3 6h18M3 12h18M3 18h18"/>',
		'close'       => '<path d="M5 5l14 14M19 5L5 19"/>',
		'star'        => '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" fill="currentColor" stroke="none"/>',
		'starHalf'    => '<defs><linearGradient id="mts-sh"><stop offset="50%" stop-color="currentColor"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" fill="url(#mts-sh)" stroke="currentColor" stroke-width="1"/>',
		'scissors'    => '<circle cx="6" cy="7" r="2.2"/><circle cx="6" cy="17" r="2.2"/><path d="M8 8.5L20 17M8 15.5L20 7M8.5 12l3 1.6"/>',
		'tag'         => '<path d="M3 11.5V4.5A1.5 1.5 0 0 1 4.5 3h7l9.5 9.5a1.5 1.5 0 0 1 0 2.1l-6.4 6.4a1.5 1.5 0 0 1-2.1 0z"/><circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none"/>',
		'layers'      => '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
		'grid'        => '<rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/>',
		'factory'     => '<path d="M3 21V10l6 4V10l6 4V6l6 3v12z"/><path d="M3 21h18"/>',
		'refresh'     => '<path d="M4 12a8 8 0 0 1 13.7-5.6L21 9"/><path d="M21 4v5h-5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L3 15"/><path d="M3 20v-5h5"/>',
		'pin'         => '<path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
		'mail'        => '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3.5 6.5L12 13l8.5-6.5"/>',
		'clock'       => '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
		'minus'       => '<path d="M5 12h14"/>',
		'plus'        => '<path d="M12 5v14M5 12h14"/>',
		'spool'       => '<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
		'facebook'    => '<path d="M15 8.5h2.2V5.5H15c-2 0-3.2 1.3-3.2 3.3V10.5H9.6v3h2.2V21h3v-7.5h2.3l.4-3h-2.7V9c0-.4.2-.5.6-.5z" fill="currentColor" stroke="none"/>',
		'instagram'   => '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1.05" fill="currentColor" stroke="none"/>',
		'youtube'     => '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10.5 9.2l5 2.8-5 2.8z" fill="currentColor" stroke="none"/>',
		'x'           => '<path d="M5 4l14 16M19 4 5 20" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>',
		'chat'        => '<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/>',
		'send'        => '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
		'linkedin'    => '<path d="M16 8.3a5.7 5.7 0 0 1 5.5 5.7V21h-3.2v-6.6a2.3 2.3 0 0 0-4.6 0V21h-3.2V8.7h3.2v1.5A4.6 4.6 0 0 1 16 8.3z"/><rect x="3.2" y="8.7" width="3.2" height="12.3"/><circle cx="4.8" cy="4.6" r="1.9"/>',
	);

	return $paths;
}

/**
 * Render one icon as an inline SVG string.
 *
 * Inline rather than a sprite or icon font: these are stroke icons inheriting
 * currentColor, and the design changes their colour on hover in several places.
 * A sprite would need a fill override per instance for no saving worth having
 * at this icon count.
 */
function mts_icon( string $name, int $size = 20, string $class = '', string $title = '' ): string {
	$paths = mts_icon_paths();

	if ( ! isset( $paths[ $name ] ) ) {
		return '';
	}

	$label = '' !== $title
		? sprintf( 'role="img" aria-label="%s"', esc_attr( $title ) )
		: 'role="presentation" aria-hidden="true"';

	return sprintf(
		'<svg width="%1$d" height="%1$d" viewBox="0 0 24 24" class="%2$s" %3$s fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">%4$s</svg>',
		$size,
		esc_attr( $class ),
		$label,
		$paths[ $name ]
	);
}

/** Echo helper — the common case in templates. */
function mts_the_icon( string $name, int $size = 20, string $class = '', string $title = '' ): void {
	// Built from a fixed internal path table; only $class/$title are dynamic and
	// both are escaped in mts_icon().
	echo mts_icon( $name, $size, $class, $title ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}
