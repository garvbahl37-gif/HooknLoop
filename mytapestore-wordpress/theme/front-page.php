<?php
/**
 * Homepage — port of mytapestore-redesign/src/pages/Home.jsx.
 *
 * Home.jsx is pure composition: eleven sections in a fixed order. That order is
 * the argument the page makes — hook, credentials, browse, proof, convert — so
 * it is preserved exactly, and each section lives in its own file the way it
 * had its own component (and its own Shopify section).
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>

<main id="main" class="mts-main">
	<?php
	$mts_sections = apply_filters( 'mts_home_sections', array(
		'hero-slider',
		'intro-band',
		'category-showcase',
		'featured-grid',
		'brand-wall',
		'range',
		'seal',
		'industries',
		'testimonials',
		'wholesale',
		'faq',
	) );

	foreach ( $mts_sections as $mts_section ) {
		get_template_part( 'template-parts/home/' . $mts_section );
	}
	?>
</main>

<?php
get_footer();
