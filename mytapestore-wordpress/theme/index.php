<?php
/**
 * Fallback template.
 *
 * WordPress requires index.php to exist. Real templates land alongside it as the
 * port progresses (front-page.php, archive-product.php, single-product.php …);
 * anything not yet ported falls through to here rather than fatally erroring.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>

<main id="main" class="mts-main">
	<?php if ( have_posts() ) : ?>
		<?php while ( have_posts() ) : the_post(); ?>
			<article <?php post_class( 'mts-entry' ); ?>>
				<h1 class="mts-entry__title"><?php the_title(); ?></h1>
				<div class="mts-entry__content"><?php the_content(); ?></div>
			</article>
		<?php endwhile; ?>
	<?php else : ?>
		<p><?php esc_html_e( 'Nothing found.', 'mytapestore' ); ?></p>
	<?php endif; ?>
</main>

<?php
get_footer();
