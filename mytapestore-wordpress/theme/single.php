<?php
/**
 * Blog article — the Shopify article page (sections/mts-article.liquid).
 *
 *   main
 *     div.wrap.page__crumbs
 *     section.page-hero          eyebrow (topic) · h1 · standfirst · art__meta
 *     div.wrap.page-prose        hero image, then the article body
 *
 * The previous version used `.blogpage` / `.blogmast__title` / `.blogpage__body`
 * — the BLOG INDEX's classes, on a single article. So the article opened with no
 * charcoal hero band, its title took the index masthead's treatment, and the body
 * inherited the index's measure rather than the prose column the design gives
 * long-form copy.
 *
 * `.page-prose` is the shared long-form skin (About, the policies, the city
 * pages), which is why the article body and the rest of the site's copy now read
 * identically — one measure, one heading scale, one list style.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

get_header();

while ( have_posts() ) :
	the_post();

	$mts_blog     = (int) get_option( 'page_for_posts' );
	$mts_blog_url = $mts_blog ? (string) get_permalink( $mts_blog ) : home_url( '/blog/' );
	$mts_cats     = get_the_category();
	$mts_topic    = $mts_cats ? $mts_cats[0] : null;

	$mts_crumbs = array(
		array( 'label' => __( 'Home', 'mytapestore' ), 'href' => home_url( '/' ) ),
		array( 'label' => __( 'Blog', 'mytapestore' ), 'href' => $mts_blog_url ),
		array( 'label' => get_the_title() ),
	);

	// Reading time, from the words actually in the post.
	$mts_minutes = max( 1, (int) round( str_word_count( wp_strip_all_tags( get_the_content() ) ) / 200 ) );
	?>

	<main id="main" class="artpage">

		<div class="wrap page__crumbs">
			<?php get_template_part( 'template-parts/breadcrumbs', null, array( 'items' => $mts_crumbs ) ); ?>
		</div>

		<section class="page-hero">
			<div class="wrap">
				<?php if ( $mts_topic ) : ?>
					<span class="eyebrow eyebrow--onink"><?php echo esc_html( $mts_topic->name ); ?></span>
				<?php endif; ?>

				<h1><?php the_title(); ?></h1>

				<?php
				/*
				 * The standfirst is the excerpt, and only when the post has one of
				 * its own. get_the_excerpt() would otherwise auto-generate it by
				 * chopping the first 55 words — which prints the opening of the
				 * article immediately above the article.
				 */
				$mts_standfirst = has_excerpt() ? get_the_excerpt() : '';
				?>
				<?php if ( $mts_standfirst ) : ?>
					<p><?php echo esc_html( wp_strip_all_tags( $mts_standfirst ) ); ?></p>
				<?php endif; ?>

				<p class="art__meta num">
					<time datetime="<?php echo esc_attr( get_the_date( 'c' ) ); ?>"><?php echo esc_html( get_the_date() ); ?></time>
					<span class="blogx__dot" aria-hidden="true"></span>
					<span>
						<?php
						printf(
							/* translators: %d: minutes */
							esc_html__( '%d min read', 'mytapestore' ),
							$mts_minutes
						);
						?>
					</span>
				</p>
			</div>
		</section>

		<article <?php post_class( 'wrap page-prose' ); ?>>

			<?php
			/*
			 * The hero image opens the prose column rather than sitting between
			 * the band and the text, which is where Shopify puts it — the first
			 * thing inside .page-prose.
			 */
			?>
			<?php if ( has_post_thumbnail() ) : ?>
				<?php the_post_thumbnail( 'large', array( 'class' => 'art__hero', 'loading' => 'eager', 'fetchpriority' => 'high' ) ); ?>
			<?php endif; ?>

			<?php
			the_content();

			wp_link_pages( array(
				'before' => '<nav class="mts-pager" aria-label="' . esc_attr__( 'Page sections', 'mytapestore' ) . '"><ol class="mts-pager__list"><li>',
				'after'  => '</li></ol></nav>',
			) );
			?>

			<?php if ( count( $mts_cats ) > 0 ) : ?>
				<div class="art__topics">
					<span><?php esc_html_e( 'Filed under', 'mytapestore' ); ?></span>
					<div class="pdp-specbox__chips">
						<?php foreach ( $mts_cats as $mts_cat ) : ?>
							<a href="<?php echo esc_url( get_category_link( $mts_cat ) ); ?>"><?php echo esc_html( $mts_cat->name ); ?></a>
						<?php endforeach; ?>
					</div>
				</div>
			<?php endif; ?>

			<a class="art__back" href="<?php echo esc_url( $mts_blog_url ); ?>">
				<?php mts_the_icon( 'chevronRight', 15, 'art__back-icon' ); ?> <?php esc_html_e( 'All articles', 'mytapestore' ); ?>
			</a>
		</article>

		<?php
		/*
		 * Products related to the article, matched on a shared category NAME — a
		 * guide about masking tape should be able to sell the masking tape it
		 * describes.
		 */
		$mts_names = wp_get_post_terms( get_the_ID(), 'category', array( 'fields' => 'names' ) );
		$mts_ids   = array();

		foreach ( (array) $mts_names as $mts_name ) {
			$mts_match = get_term_by( 'name', $mts_name, 'product_cat' );
			if ( ! $mts_match ) {
				continue;
			}
			$mts_ids = get_posts( array(
				'post_type'      => 'product',
				'posts_per_page' => 4,
				'fields'         => 'ids',
				'tax_query'      => array( array( 'taxonomy' => 'product_cat', 'field' => 'term_id', 'terms' => $mts_match->term_id ) ), // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
			) );
			if ( $mts_ids ) {
				break;
			}
		}

		if ( $mts_ids ) :
			?>
			<section class="section section--paper">
				<div class="wrap">
					<div class="section-head">
						<div class="section-title-wrap">
							<span class="eyebrow"><?php esc_html_e( 'Mentioned in this guide', 'mytapestore' ); ?></span>
							<h2><?php esc_html_e( 'Products in this guide', 'mytapestore' ); ?></h2>
						</div>
					</div>
					<div class="grid-products grid-products--fit">
						<?php
						foreach ( $mts_ids as $mts_pid ) {
							$GLOBALS['post']    = get_post( $mts_pid ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride
							$GLOBALS['product'] = wc_get_product( $mts_pid );
							setup_postdata( $GLOBALS['post'] );
							wc_get_template_part( 'content', 'product' );
						}
						wp_reset_postdata();
						?>
					</div>
				</div>
			</section>
		<?php endif; ?>

		<?php
		/*
		 * More reading, from the same topic. Shopify's article page closes with
		 * this and the theme had nothing — an article ended on a dead end.
		 */
		$mts_more = $mts_topic ? get_posts( array(
			'post_type'      => 'post',
			'posts_per_page' => 3,
			'post__not_in'   => array( get_the_ID() ),
			'category'       => $mts_topic->term_id,
			'orderby'        => 'date',
			'order'          => 'DESC',
		) ) : array();

		if ( $mts_more ) :
			?>
			<section class="section">
				<div class="wrap">
					<div class="section-head">
						<div class="section-title-wrap">
							<span class="eyebrow"><?php esc_html_e( 'Keep reading', 'mytapestore' ); ?></span>
							<h2><?php esc_html_e( 'More from the workshop', 'mytapestore' ); ?></h2>
						</div>
					</div>
					<div class="blogx">
						<?php foreach ( $mts_more as $mts_related ) : ?>
							<a class="blogx__card" href="<?php echo esc_url( get_permalink( $mts_related ) ); ?>">
								<span class="blogx__media">
									<?php echo get_the_post_thumbnail( $mts_related, 'medium_large', array( 'loading' => 'lazy', 'alt' => '' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
								</span>
								<span class="blogx__body">
									<span class="blogx__topic"><?php echo esc_html( $mts_topic->name ); ?></span>
									<span class="blogx__title"><?php echo esc_html( get_the_title( $mts_related ) ); ?></span>
									<span class="blogx__meta">
										<time datetime="<?php echo esc_attr( get_the_date( 'c', $mts_related ) ); ?>">
											<?php echo esc_html( get_the_date( '', $mts_related ) ); ?>
										</time>
									</span>
								</span>
							</a>
						<?php endforeach; ?>
					</div>
				</div>
			</section>
		<?php endif; ?>

	</main>

	<?php
endwhile;

get_footer();
