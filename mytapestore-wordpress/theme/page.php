<?php
/**
 * Content page — About, FAQ, Shipping, the city landing pages, policies.
 *
 * These pages were authored in WPBakery, so their stored content is builder
 * shortcodes wrapped around real copy. inc/legacy-shortcodes.php unwraps those
 * on the way out; this template only has to give the result a readable measure
 * and a page header.
 *
 * THE CART, CHECKOUT AND ACCOUNT PAGES ARE NOT CONTENT PAGES.
 *
 * They are WordPress pages only because that is how WooCommerce mounts them, and
 * they carry their own full-page layout inside the_content(). Running them
 * through the standard header gave them the black .colban banner with the page
 * title in it — a large "Cart" slab above the cart, which Shopify does not have
 * and which pushed the actual cart below the fold. They get the bare main
 * element instead and lay themselves out.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

get_header();

/** True for the WooCommerce pages that own their whole layout. */
$mts_is_shop_page = function_exists( 'is_cart' ) && ( is_cart() || is_checkout() || is_account_page() );

while ( have_posts() ) :
	the_post();

	if ( $mts_is_shop_page ) :
		$mts_class = 'mts-main';
		if ( is_cart() ) {
			$mts_class .= ' cart';
		} elseif ( is_checkout() ) {
			$mts_class .= ' checkout';
		} elseif ( is_account_page() ) {
			$mts_class .= ' acct';
		}
		?>
		<main id="main" class="<?php echo esc_attr( $mts_class ); ?>">
			<?php the_content(); ?>
		</main>
		<?php
		continue;
	endif;

	$mts_crumbs = array( array( 'label' => __( 'Home', 'mytapestore' ), 'href' => home_url( '/' ) ) );
	$mts_parent = wp_get_post_parent_id( get_the_ID() );
	if ( $mts_parent ) {
		$mts_crumbs[] = array( 'label' => get_the_title( $mts_parent ), 'href' => get_permalink( $mts_parent ) );
	}
	$mts_crumbs[] = array( 'label' => get_the_title() );
	?>

	<main id="main" class="mts-main">

		<div class="colban grain">
			<div class="colban__scrim"></div>
			<div class="wrap colban__inner">
				<?php get_template_part( 'template-parts/breadcrumbs', null, array( 'items' => $mts_crumbs ) ); ?>
				<h1 class="colban__title"><?php the_title(); ?></h1>
			</div>
		</div>

		<section class="section">
			<div class="wrap">
				<?php
				/*
				 * `.page-prose` — the design's own long-form skin, the one the
				 * Shopify theme puts on every page body (mts-page.liquid,
				 * mts-contact.liquid, mts-industries-index.liquid) and the one
				 * single.php uses for articles.
				 *
				 * This was `.blogpage__body`, which is the BLOG INDEX's class. A
				 * WordPress-only override then hung a second, duplicate prose skin
				 * off it so these pages would read — and that skin's `max-width:
				 * 78ch` landed on the index as well, crushing a three-column card
				 * grid into a 787px reading column. One class, two jobs.
				 */
				?>
				<article <?php post_class( 'page-prose' ); ?>>
					<?php
					the_content();

					wp_link_pages( array(
						'before' => '<nav class="mts-pager" aria-label="' . esc_attr__( 'Page sections', 'mytapestore' ) . '"><ol class="mts-pager__list"><li>',
						'after'  => '</li></ol></nav>',
					) );
					?>
				</article>
			</div>
		</section>

	</main>

	<?php
endwhile;

get_footer();
