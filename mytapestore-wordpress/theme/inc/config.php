<?php
/**
 * Store identity: contact details, socials, brand copy.
 *
 * Shopify held these in theme settings. Here they are filtered arrays with the
 * real mytapestore.com.au values as defaults, so the theme is correct out of the
 * box and still overridable from a child theme or a plugin without touching
 * template code.
 *
 * Values were read from the live site rather than invented — a placeholder
 * phone number in a footer is worse than no phone number.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Contact details.
 *
 * @return array{phone:string,phone_href:string,mobile:string,mobile_href:string,email:string,hours:string,abn:string}
 */
function mts_contact(): array {
	return apply_filters( 'mts_contact', array(
		// International form, as the Shopify store shows it — the store ships
		// Australia-wide and the number is printed on parcels that leave the
		// country's dialling context.
		'phone'       => '+61 3 4061 6287',
		'phone_href'  => '+61340616287',
		'mobile'      => '0402 416 298',
		'mobile_href' => '0402416298',
		'email'       => 'info@mytapestore.com.au',
		'hours'       => 'Mon–Fri, 9am–5pm AEST',
		'abn'         => '93 878 995 217',
	) );
}

/**
 * Social profiles, keyed by the icon name in inc/icons.php.
 *
 * @return array<string,array{label:string,url:string}>
 */
function mts_socials(): array {
	return apply_filters( 'mts_socials', array(
		'facebook'  => array( 'label' => 'Facebook',  'url' => 'https://www.facebook.com/mytapestore' ),
		'instagram' => array( 'label' => 'Instagram', 'url' => 'https://www.instagram.com/my_tape_store/' ),
		'linkedin'  => array( 'label' => 'LinkedIn',  'url' => 'https://www.linkedin.com/company/mytapestore/' ),
		'x'         => array( 'label' => 'X',         'url' => 'https://x.com/mytapestore' ),
	) );
}

/**
 * The store's bestsellers, in rank order, by product slug.
 *
 * Taken verbatim from BESTSELLER_HANDLES in mytapestore-redesign/src/data/catalog.js,
 * whose own comment records them as "real bestsellers from the live store,
 * ranked by WooCommerce popularity (total sales)".
 *
 * This is a fixed list rather than a live total_sales sort on purpose: it is
 * what the React build and the Shopify theme both show, and "same products in
 * the same order across all three storefronts" is the requirement. Sales rank
 * on a freshly imported database is meaningless anyway — no orders exist here.
 *
 * @return string[]
 */
function mts_bestseller_slugs(): array {
	return apply_filters( 'mts_bestseller_slugs', array(
		'utility-grade-masking-tapes',
		'general-purpose-masking-tape',
		'hook-loop-roll-adhesive-backed',
		'joist-protection-tape',
		'hook-loop-adhesive-dots',
		'cloth-tapes',
		'high-bond-acrylic-tape-clear',
		'structural-glazing-tape',
	) );
}

/** Whether a product is one of the ranked bestsellers (drives the card badge). */
function mts_is_bestseller( WC_Product $product ): bool {
	return in_array( $product->get_slug(), mts_bestseller_slugs(), true );
}

/** The footer's brand blurb. */
function mts_brand_blurb(): string {
	return apply_filters(
		'mts_brand_blurb',
		__( "Australia's adhesive tape specialists. Double-sided, foam, duct, foil, hook &amp; loop, safety and packaging tapes — plus dispensers — direct to your doorstep, Australia-wide.", 'mytapestore' )
	);
}

/**
 * URL for a packaged theme image, or '' when the file is absent.
 *
 * Templates use this instead of building paths inline so that a missing asset
 * degrades to "no image" rather than a broken <img>.
 */
function mts_asset( string $relative ): string {
	$relative = ltrim( $relative, '/' );
	return file_exists( get_stylesheet_directory() . '/assets/' . $relative )
		? get_stylesheet_directory_uri() . '/assets/' . $relative
		: '';
}
