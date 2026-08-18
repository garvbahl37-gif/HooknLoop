<?php
/**
 * Home hero — the mobile banner, then the desktop slider.
 *
 * TWO SECTIONS, NOT ONE. This is what the Shopify store ships and the theme was
 * missing half of it.
 *
 *   .mhero   ONE static banner, shown only below 900px, carrying the page's
 *            single <h1>. A five-slide rotator is a desktop idea: on a phone
 *            each slide stacked its image above its text, ran past the fold, and
 *            four of the five messages were never seen. This says it once.
 *
 *   .hslide  The desktop slider. Its headings are <p class="hslide__title">, NOT
 *            <h1>. The theme rendered an <h1> per slide — four of them on one
 *            page, which is not a document outline, it is four competing claims
 *            about what the page is. Google crawls mobile-first, so the h1 it
 *            indexes is the one a phone renders: the .mhero one above.
 *
 * Class names are taken verbatim from HeroSlider.jsx (mhero__*, hslide__*,
 * is-active). They are not decorative: home.css targets exactly these.
 *
 * All slides ship in the markup and are toggled by class, so the first paints
 * without JavaScript. Non-active slides take tabindex="-1" on their links so
 * keyboard focus cannot land on an invisible control.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_shop_url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/shop/' );

/*
 * The opening banner. Its heading is the page's h1.
 */
$mts_hero = apply_filters( 'mts_hero_banner', array(
	'img'     => 'img/site/banners/banner-3.jpg',
	'eyebrow' => __( 'Australian owned', 'mytapestore' ),
	'title'   => __( 'Adhesive Tape Suppliers in Australia', 'mytapestore' ),
	'text'    => __( 'Premium brands, quality-checked for the job — with volume pricing on every roll.', 'mytapestore' ),
	'cta'     => array( __( 'Shop all tapes', 'mytapestore' ), $mts_shop_url ),
	'proof'   => array(
		array( __( '1–2 days', 'mytapestore' ), __( 'to dispatch', 'mytapestore' ) ),
		array( __( 'Lowest price', 'mytapestore' ), __( 'guaranteed', 'mytapestore' ) ),
		array( __( 'Secure', 'mytapestore' ), __( 'checkout', 'mytapestore' ) ),
	),
) );

$mts_slides = apply_filters( 'mts_hero_slides', array(
	array(
		'img'     => 'img/site/banners/banner-3.jpg',
		'eyebrow' => __( 'Australia-wide', 'mytapestore' ),
		'title'   => __( 'Adhesive Tape Suppliers in Australia', 'mytapestore' ),
		'text'    => __( '130+ industrial lines across 35 categories — double-sided, foam, foil, safety and more, dispatched Australia-wide.', 'mytapestore' ),
		'cta'     => array( __( 'Browse all tapes', 'mytapestore' ), $mts_shop_url ),
		'alt'     => array( __( 'Shop by industry', 'mytapestore' ), home_url( '/industries/' ) ),
	),
	array(
		'img'     => 'img/site/banner-australia.jpg',
		'eyebrow' => __( 'Express delivery', 'mytapestore' ),
		'title'   => __( 'Fast delivery, right across Australia', 'mytapestore' ),
		'text'    => __( 'Dispatch to 3,600+ postcodes — most orders arrive in 2–3 business days.', 'mytapestore' ),
		'cta'     => array( __( 'Shop the range', 'mytapestore' ), $mts_shop_url ),
		'alt'     => array( __( 'Track your order', 'mytapestore' ), home_url( '/shipping-delivery/' ) ),
	),
	array(
		'img'     => 'img/site/banners/banner-australian-owned.jpg',
		'eyebrow' => __( 'Australian owned', 'mytapestore' ),
		'title'   => __( 'Australian owned, Australian stocked', 'mytapestore' ),
		'text'    => __( 'Local stock, local support, and tape on its way to 3,600+ postcodes — no overseas wait.', 'mytapestore' ),
		'cta'     => array( __( 'Shop the range', 'mytapestore' ), $mts_shop_url ),
		'alt'     => array( __( 'About us', 'mytapestore' ), home_url( '/about-us/' ) ),
	),
	array(
		'img'     => 'img/site/banners/banner-2.jpg',
		'eyebrow' => __( 'Premium quality', 'mytapestore' ),
		'title'   => __( 'Industrial-grade tapes, built to last', 'mytapestore' ),
		'text'    => __( 'Trusted brands and premium lines — quality-checked for every job.', 'mytapestore' ),
		'cta'     => array( __( 'Shop premium tapes', 'mytapestore' ), $mts_shop_url ),
		'alt'     => array( __( 'Our brands', 'mytapestore' ), home_url( '/about-us/' ) ),
	),
	array(
		'img'     => 'img/site/banners/banner-4.jpg',
		'eyebrow' => __( 'Bulk & trade', 'mytapestore' ),
		'title'   => __( 'Save more when you buy more', 'mytapestore' ),
		'text'    => __( 'Volume discounts on larger orders for business buyers.', 'mytapestore' ),
		'cta'     => array( __( 'Bulk & trade pricing', 'mytapestore' ), home_url( '/bulk-trade/' ) ),
		'alt'     => array( __( 'Get in contact', 'mytapestore' ), home_url( '/contact-us/' ) ),
	),
) );

// Drop any slide whose artwork is missing rather than render an empty frame.
$mts_slides = array_values( array_filter(
	$mts_slides,
	static fn( array $s ): bool => '' !== mts_asset( $s['img'] )
) );

$mts_total = count( $mts_slides );
?>

<?php if ( '' !== mts_asset( $mts_hero['img'] ) ) : ?>
	<section class="mhero" aria-label="<?php echo esc_attr( $mts_hero['title'] ); ?>">
		<div class="mhero__media">
			<picture>
				<?php
				/*
				 * The 1×1 GIF above 900px is not a trick — it stops desktop
				 * browsers downloading a banner they will never show. The slider's
				 * first slide carries the mirror-image guard, so each viewport pays
				 * for exactly one hero image.
				 */
				?>
				<source media="(min-width: 901px)" srcset="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">
				<img class="mhero__img" src="<?php echo esc_url( mts_asset( $mts_hero['img'] ) ); ?>" alt=""
					 width="1200" height="900" loading="eager" fetchpriority="high" decoding="async">
			</picture>
		</div>

		<div class="wrap mhero__inner">
			<?php
			/*
			 * The eyebrow sits on a torn tape tab. This is a tape merchant — the one
			 * decorative element on the banner is the product itself.
			 */
			?>
			<span class="mhero__tab"><?php echo esc_html( $mts_hero['eyebrow'] ); ?></span>
			<h1 class="mhero__title"><?php echo esc_html( $mts_hero['title'] ); ?></h1>
			<p class="mhero__text"><?php echo esc_html( $mts_hero['text'] ); ?></p>
			<a class="mhero__cta" href="<?php echo esc_url( $mts_hero['cta'][1] ); ?>">
				<?php echo esc_html( $mts_hero['cta'][0] ); ?> <?php mts_the_icon( 'arrowRight', 18 ); ?>
			</a>
		</div>

		<?php
		/*
		 * The proof rail carries the numbers so the sentence above does not have
		 * to — each element does one job.
		 */
		?>
		<ul class="mhero__proof">
			<?php foreach ( $mts_hero['proof'] as $mts_proof ) : ?>
				<li>
					<b class="num"><?php echo esc_html( $mts_proof[0] ); ?></b>
					<span><?php echo esc_html( $mts_proof[1] ); ?></span>
				</li>
			<?php endforeach; ?>
		</ul>
	</section>
<?php endif; ?>

<?php if ( $mts_slides ) : ?>
<section class="hslide" data-mts-hero aria-roledescription="carousel" aria-label="<?php esc_attr_e( 'Featured', 'mytapestore' ); ?>">

	<div class="hslide__track">
		<?php foreach ( $mts_slides as $mts_i => $mts_slide ) : ?>
			<?php $mts_active = ( 0 === $mts_i ); ?>
			<div class="hslide__slide<?php echo $mts_active ? ' is-active' : ''; ?>"
				 data-mts-hero-slide="<?php echo esc_attr( (string) $mts_i ); ?>"
				 <?php echo $mts_active ? '' : 'aria-hidden="true"'; ?>>

				<div class="hslide__media">
					<picture>
						<?php if ( $mts_active ) : ?>
							<source media="(max-width: 900px)" srcset="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">
						<?php endif; ?>
						<img src="<?php echo esc_url( mts_asset( $mts_slide['img'] ) ); ?>" alt=""
							 <?php echo $mts_active ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'; ?>>
					</picture>
				</div>

				<div class="wrap hslide__inner">
					<div class="hslide__content">
						<span class="hslide__eyebrow"><?php echo esc_html( $mts_slide['eyebrow'] ); ?></span>
						<?php
						/*
						 * Not an <h1> — the .mhero banner above owns the page's single
						 * one, and it is the one a phone (and therefore the crawler)
						 * renders.
						 */
						?>
						<p class="hslide__title"><?php echo esc_html( $mts_slide['title'] ); ?></p>
						<p class="hslide__text"><?php echo esc_html( $mts_slide['text'] ); ?></p>
						<div class="hslide__cta">
							<a class="btn btn--brand btn--lg" href="<?php echo esc_url( $mts_slide['cta'][1] ); ?>"
							   tabindex="<?php echo $mts_active ? '0' : '-1'; ?>">
								<?php echo esc_html( $mts_slide['cta'][0] ); ?> <?php mts_the_icon( 'arrowRight', 18 ); ?>
							</a>
							<a class="btn btn--onink-ghost btn--lg" href="<?php echo esc_url( $mts_slide['alt'][1] ); ?>"
							   tabindex="<?php echo $mts_active ? '0' : '-1'; ?>">
								<?php echo esc_html( $mts_slide['alt'][0] ); ?>
							</a>
						</div>
					</div>
				</div>
			</div>
		<?php endforeach; ?>
	</div>

	<?php if ( $mts_total > 1 ) : ?>
		<button class="hslide__arrow hslide__arrow--prev" type="button" data-mts-hero-prev
				aria-label="<?php esc_attr_e( 'Previous slide', 'mytapestore' ); ?>">
			<?php mts_the_icon( 'chevronRight', 22 ); ?>
		</button>
		<button class="hslide__arrow hslide__arrow--next" type="button" data-mts-hero-next
				aria-label="<?php esc_attr_e( 'Next slide', 'mytapestore' ); ?>">
			<?php mts_the_icon( 'chevronRight', 22 ); ?>
		</button>

		<div class="hslide__dots" role="tablist" aria-label="<?php esc_attr_e( 'Choose slide', 'mytapestore' ); ?>">
			<?php foreach ( $mts_slides as $mts_i => $mts_slide ) : ?>
				<button class="hslide__dot<?php echo 0 === $mts_i ? ' is-active' : ''; ?>" type="button" role="tab"
						data-mts-hero-dot="<?php echo esc_attr( (string) $mts_i ); ?>"
						aria-selected="<?php echo 0 === $mts_i ? 'true' : 'false'; ?>"
						aria-label="<?php echo esc_attr( sprintf( /* translators: %d: slide number */ __( 'Slide %d', 'mytapestore' ), $mts_i + 1 ) ); ?>"></button>
			<?php endforeach; ?>
		</div>
	<?php endif; ?>

</section>
<?php endif; ?>
