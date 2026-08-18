<?php
/**
 * Template Name: Industries index
 *
 * Every industry we supply, as a card grid. Industries are modelled as children
 * of the "Industry" product category, so this reads the live taxonomy and stays
 * correct as categories are added.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

get_header();

$mts_parent     = get_term_by( 'slug', 'industry', 'product_cat' );
$mts_industries = $mts_parent
	? get_terms( array(
		'taxonomy'   => 'product_cat',
		'parent'     => (int) $mts_parent->term_id,
		'hide_empty' => true,
		'orderby'    => 'name',
	) )
	: array();
$mts_industries = is_wp_error( $mts_industries ) ? array() : $mts_industries;
$mts_banner     = mts_asset( 'img/site/industries.jpg' );
?>

<main id="main" class="mts-main">

	<div class="colban grain<?php echo $mts_banner ? ' colban--img' : ''; ?>">
		<?php if ( $mts_banner ) : ?>
			<?php
			/*
			 * Real dimensions and a real srcset — see the same block in
			 * woocommerce/archive-product.php. A hardcoded width="2000"
			 * height="560" on files that are 1800×1005 made the browser reserve a
			 * 3.57:1 box for 1.79:1 pixels and stretch to fill it.
			 */
			$mts_srcset = mts_banner_srcset( $mts_banner );
			$mts_dims   = mts_image_size( $mts_banner );
			?>
			<img class="colban__img" src="<?php echo esc_url( $mts_banner ); ?>"
				 <?php echo $mts_srcset ? 'srcset="' . esc_attr( $mts_srcset ) . '" sizes="100vw"' : ''; ?>
				 alt="" aria-hidden="true"
				 <?php echo $mts_dims ? 'width="' . esc_attr( (string) $mts_dims[0] ) . '" height="' . esc_attr( (string) $mts_dims[1] ) . '"' : ''; ?>
				 fetchpriority="high" decoding="async">
		<?php endif; ?>
		<div class="colban__scrim"></div>
		<div class="wrap colban__inner">
			<?php
			get_template_part( 'template-parts/breadcrumbs', null, array(
				'items' => array(
					array( 'label' => __( 'Home', 'mytapestore' ), 'href' => home_url( '/' ) ),
					array( 'label' => __( 'Industries', 'mytapestore' ) ),
				),
			) );
			?>
			<span class="eyebrow eyebrow--onink"><?php esc_html_e( 'Industries', 'mytapestore' ); ?></span>
			<h1 class="colban__title"><?php esc_html_e( 'Tapes for every trade', 'mytapestore' ); ?></h1>
			<span class="colban__count num">
				<?php
				printf(
					/* translators: %s: industry count */
					esc_html( _n( '%s industry served', '%s industries served', count( $mts_industries ), 'mytapestore' ) ),
					esc_html( number_format_i18n( count( $mts_industries ) ) )
				);
				?>
			</span>
		</div>
	</div>

	<section class="section">
		<div class="wrap">
			<?php if ( get_the_content() ) : ?>
				<div class="ind-page__intro">
					<?php while ( have_posts() ) : the_post(); the_content(); endwhile; ?>
				</div>
			<?php endif; ?>

			<div class="ind-grid">
				<?php foreach ( $mts_industries as $mts_ind ) : ?>
					<?php $mts_thumb = (int) get_term_meta( $mts_ind->term_id, 'thumbnail_id', true ); ?>
					<a class="ind-card" href="<?php echo esc_url( get_term_link( $mts_ind ) ); ?>">
						<div class="ind-card__img">
							<?php if ( $mts_thumb ) : ?>
								<?php echo wp_get_attachment_image( $mts_thumb, 'woocommerce_thumbnail', false, array( 'alt' => esc_attr( $mts_ind->name ), 'loading' => 'lazy' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
							<?php else : ?>
								<span class="ind-card__img--icon"><?php mts_the_icon( 'factory', 30 ); ?></span>
							<?php endif; ?>
						</div>
						<div class="ind-card__body">
							<b><?php echo esc_html( $mts_ind->name ); ?></b>
							<span class="num">
								<?php
								printf(
									/* translators: %s: product count */
									esc_html( _n( '%s product', '%s products', (int) $mts_ind->count, 'mytapestore' ) ),
									esc_html( number_format_i18n( (int) $mts_ind->count ) )
								);
								?>
								<?php mts_the_icon( 'arrowRight', 14 ); ?>
							</span>
						</div>
					</a>
				<?php endforeach; ?>
			</div>
		</div>
	</section>

</main>

<?php
get_footer();
