<?php
/**
 * Blog index — the Shopify blog (sections/mts-blog.liquid), node for node.
 *
 *   main.blogpage
 *     div.wrap.page__crumbs
 *     section.page-hero.page-hero--blog > div.wrap.blogmast
 *     nav.blogtopics > div.wrap.blogtopics__row
 *     div.wrap.section.blogpage__body > div.blogx
 *
 * The theme had the card grid but none of the frame: no page hero, no
 * breadcrumbs, `.blogmast` as a bare div rather than inside the hero section
 * that gives it its charcoal band, and the topic chips in a plain div instead of
 * a <nav>. So the blog index opened on unstyled black.
 *
 * The first post is given the lead card (.blogx__card--lead); the rest follow in
 * the grid. Topic chips filter by category and are plain links, so each topic
 * has its own indexable URL.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

get_header();

$mts_topics  = get_categories( array( 'hide_empty' => true, 'number' => 20 ) );
$mts_current = is_category() ? (int) get_queried_object_id() : 0;
$mts_total   = (int) ( $GLOBALS['wp_query']->found_posts ?? 0 );
$mts_blog    = (int) get_option( 'page_for_posts' );
$mts_blog_url = $mts_blog ? (string) get_permalink( $mts_blog ) : home_url( '/blog/' );

$mts_crumbs = array( array( 'label' => __( 'Home', 'mytapestore' ), 'href' => home_url( '/' ) ) );
if ( $mts_current ) {
	$mts_crumbs[] = array( 'label' => __( 'Blog', 'mytapestore' ), 'href' => $mts_blog_url );
	$mts_crumbs[] = array( 'label' => single_cat_title( '', false ) );
} else {
	$mts_crumbs[] = array( 'label' => __( 'Blog', 'mytapestore' ) );
}
?>

<main id="main" class="blogpage">

	<div class="wrap page__crumbs">
		<?php get_template_part( 'template-parts/breadcrumbs', null, array( 'items' => $mts_crumbs ) ); ?>
	</div>

	<section class="page-hero page-hero--blog">
		<div class="wrap blogmast">
			<span class="eyebrow eyebrow--onink"><?php esc_html_e( 'From the workshop', 'mytapestore' ); ?></span>
			<h1 class="blogmast__title">
				<?php echo $mts_current ? esc_html( single_cat_title( '', false ) ) : esc_html__( 'Buying guides & tape know-how', 'mytapestore' ); ?>
			</h1>
			<p class="blogmast__intro"><?php esc_html_e( 'Practical advice from the people who supply the tape — how to choose it, apply it, and make it last.', 'mytapestore' ); ?></p>
			<p class="blogmast__count num">
				<?php
				printf(
					/* translators: %s: article count */
					esc_html( _n( '%s article', '%s articles', $mts_total, 'mytapestore' ) ),
					esc_html( number_format_i18n( $mts_total ) )
				);
				?>
			</p>
		</div>
	</section>

	<?php if ( $mts_topics ) : ?>
		<nav class="blogtopics" aria-label="<?php esc_attr_e( 'Article topics', 'mytapestore' ); ?>">
			<div class="wrap blogtopics__row">
				<a class="blogtopics__chip<?php echo $mts_current ? '' : ' is-on'; ?>" href="<?php echo esc_url( $mts_blog_url ); ?>">
					<?php esc_html_e( 'All topics', 'mytapestore' ); ?>
				</a>
				<?php foreach ( $mts_topics as $mts_topic ) : ?>
					<a class="blogtopics__chip<?php echo $mts_current === (int) $mts_topic->term_id ? ' is-on' : ''; ?>"
					   href="<?php echo esc_url( get_category_link( $mts_topic ) ); ?>">
						<?php echo esc_html( $mts_topic->name ); ?>
					</a>
				<?php endforeach; ?>
			</div>
		</nav>
	<?php endif; ?>

	<div class="wrap section blogpage__body">
		<?php if ( have_posts() ) : ?>
			<div class="blogx">
				<?php
				$mts_i = 0;
				while ( have_posts() ) :
					the_post();
					$mts_lead = ( 0 === $mts_i++ && ! is_paged() );
					?>
					<?php
					/*
					 * The whole card is the link, as on Shopify — a.blogx__card, not
					 * an <article> containing two separate links to the same URL.
					 * Two links with the same destination on one card is two tab
					 * stops and two announcements for one target.
					 */
					?>
					<a class="blogx__card<?php echo $mts_lead ? ' blogx__card--lead' : ''; ?>" href="<?php the_permalink(); ?>">
						<span class="blogx__media">
							<?php
							if ( has_post_thumbnail() ) {
								the_post_thumbnail(
									$mts_lead ? 'large' : 'medium_large',
									array( 'loading' => $mts_lead ? 'eager' : 'lazy', 'alt' => '' )
								);
							}
							?>
						</span>
						<span class="blogx__body">
							<?php
							$mts_cats = get_the_category();
							if ( $mts_cats ) :
								?>
								<span class="blogx__topic"><?php echo esc_html( $mts_cats[0]->name ); ?></span>
							<?php endif; ?>

							<?php
						/*
						 * H2, not a span. mts-blog.liquid renders every card title
						 * as `<h2 class="blogx__title">`, and the WordPress port
						 * used a span — so the blog index had exactly ONE heading
						 * on it, the masthead H1, and twelve articles that were
						 * invisible to anything navigating by structure.
						 *
						 * Safe inside the card: the whole card is an <a>, and an
						 * H2 is flow content, so it nests legally. The heading
						 * carries no styles of its own — `.blogx__title` already
						 * sets the size and weight, and the reset zeroes the
						 * browser's default h2 margin.
						 */
						?>
						<h2 class="blogx__title"><?php the_title(); ?></h2>
							<span class="blogx__excerpt"><?php echo esc_html( wp_trim_words( wp_strip_all_tags( get_the_excerpt() ), 28 ) ); ?></span>

							<span class="blogx__meta">
								<time datetime="<?php echo esc_attr( get_the_date( 'c' ) ); ?>"><?php echo esc_html( get_the_date() ); ?></time>
								<span class="blogx__dot" aria-hidden="true"></span>
								<span><?php echo esc_html( sprintf( /* translators: %d: minutes */ __( '%d min read', 'mytapestore' ), max( 1, (int) round( str_word_count( wp_strip_all_tags( get_the_content() ) ) / 200 ) ) ) ); ?></span>
							</span>
						</span>
					</a>
				<?php endwhile; ?>
			</div>

			<?php get_template_part( 'template-parts/pagination', null, array( 'label' => __( 'Article pagination', 'mytapestore' ) ) ); ?>

		<?php else : ?>
			<p class="blogx__empty"><?php esc_html_e( 'No articles here yet.', 'mytapestore' ); ?></p>
		<?php endif; ?>
	</div>

</main>

<?php
get_footer();
