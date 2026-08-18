<?php
/**
 * FAQ page.
 *
 * WHY THIS FILE EXISTS
 *
 * /faq/ rendered as a banner with an empty page under it. The page's stored
 * content is empty — not truncated by the import, EMPTY: the live site's FAQ was
 * built with Kapee's accordion element, which keeps its questions and answers in
 * the builder's own meta rather than in post_content, so there was nothing for
 * the content sync to bring across.
 *
 * And the live page could not be the source anyway. Its questions are real
 * ("What are the delivery charges?", "What is the estimated delivery time?") but
 * every answer on it is still Lorem ipsum — the page was never finished. Copying
 * it faithfully would put placeholder Latin on the draft.
 *
 * WHERE THE CONTENT COMES FROM
 *
 * template-parts/home/faq.php, which is the port of the Shopify theme's
 * sections/mts-faq.liquid and carries the same seven questions and the same
 * seven answers, word for word. Rendering the SAME part here rather than a copy
 * of it means the FAQ page and the home page cannot drift apart: there is one
 * list, in one file, and `mts_home_faqs` filters both.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/*
 * This page's content is a template part, not post_content, so inc/seo.php has
 * nothing to derive a description from and would emit none. Supplied here rather
 * than special-cased in seo.php, so the page that owns the copy owns its
 * description too.
 */
add_filter( 'mts_meta_description', static function ( string $description ): string {
	return $description ?: __( 'Delivery times, Australia-wide shipping, bulk pricing, payment methods and what we stock — the questions we are asked most.', 'mytapestore' );
} );

get_header();

while ( have_posts() ) :
	the_post();
	?>

	<main id="main" class="mts-main">

		<div class="wrap page__crumbs">
			<?php
			get_template_part( 'template-parts/breadcrumbs', null, array(
				'items' => array(
					array( 'label' => __( 'Home', 'mytapestore' ), 'href' => home_url( '/' ) ),
					array( 'label' => get_the_title() ),
				),
			) );
			?>
		</div>

		<section class="page-hero">
			<div class="wrap">
				<span class="eyebrow eyebrow--onink"><?php esc_html_e( 'Answers', 'mytapestore' ); ?></span>
				<h1><?php esc_html_e( 'Frequently asked questions', 'mytapestore' ); ?></h1>
				<p><?php esc_html_e( 'Delivery, pricing, payment and what we stock — the questions we are asked most.', 'mytapestore' ); ?></p>
			</div>
		</section>

		<?php
		/*
		 * Any copy authored on the page itself still leads, so this template does
		 * not swallow content someone adds later. Filtered, because on an imported
		 * page the raw body can be nothing but builder chrome — see
		 * inc/imported-content.php.
		 */
		$mts_body = trim( apply_filters( 'the_content', get_the_content() ) );
		?>
		<?php if ( '' !== wp_strip_all_tags( $mts_body ) ) : ?>
			<section class="section">
				<div class="wrap">
					<article class="page-prose"><?php echo wp_kses_post( $mts_body ); ?></article>
				</div>
			</section>
		<?php endif; ?>

		<?php get_template_part( 'template-parts/home/faq' ); ?>

		<?php
		/*
		 * A question the list does not answer has to have somewhere to go, or the
		 * page is a dead end for exactly the person who needed it most.
		 */
		?>
		<section class="section section--paper">
			<div class="wrap">
				<div class="col__empty">
					<?php mts_the_icon( 'mail', 34 ); ?>
					<p><?php esc_html_e( 'Still not sure which tape you need? Tell us the job and we will point you at the right one.', 'mytapestore' ); ?></p>
					<a class="btn btn--brand btn--lg" href="<?php echo esc_url( home_url( '/contact-us/' ) ); ?>">
						<?php esc_html_e( 'Ask us a question', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 18 ); ?>
					</a>
				</div>
			</div>
		</section>

	</main>

	<?php
endwhile;

get_footer();
