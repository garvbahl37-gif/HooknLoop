<?php
/**
 * Collection / shop archive — port of src/pages/CollectionPage.jsx.
 *
 * Banner, then a two-column layout: category rail + filter panel on the left,
 * toolbar and product grid on the right.
 *
 * WooCommerce's own archive hooks are bypassed rather than styled around. Its
 * default output (result count, ordering select, wrappers) is markup this
 * design replaces wholesale, and leaving it in place would mean fighting two
 * layouts at once.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

get_header();

$mts_term    = is_tax( array( 'product_cat', 'product_tag' ) ) ? get_queried_object() : null;
$mts_is_term = $mts_term instanceof WP_Term;
$mts_title   = $mts_is_term ? $mts_term->name : __( 'All products', 'mytapestore' );
$mts_total   = (int) ( $GLOBALS['wp_query']->found_posts ?? 0 );

// Banner artwork: the packaged per-category image when one exists, otherwise
// the category's own thumbnail, otherwise the generic banner.
$mts_bg       = '';
$mts_thumb_id = 0;
if ( $mts_is_term ) {
	$mts_thumb_id = (int) get_term_meta( $mts_term->term_id, 'thumbnail_id', true );
	$mts_bg       = mts_asset( 'img/site/cat/' . $mts_term->slug . '.jpg' );
	if ( ! $mts_bg && $mts_thumb_id ) {
		$mts_bg = (string) wp_get_attachment_image_url( $mts_thumb_id, 'large' );
	}
}
if ( ! $mts_bg ) {
	$mts_bg = mts_asset( 'img/site/banners/banner-3.jpg' );
}

// Breadcrumbs: Home / [parent] / current.
$mts_crumbs = array( array( 'label' => __( 'Home', 'mytapestore' ), 'href' => home_url( '/' ) ) );
$mts_group  = '';
if ( $mts_is_term ) {
	if ( $mts_term->parent ) {
		$mts_parent = get_term( $mts_term->parent, $mts_term->taxonomy );
		if ( $mts_parent instanceof WP_Term ) {
			$mts_group    = $mts_parent->name;
			$mts_crumbs[] = array( 'label' => $mts_parent->name, 'href' => get_term_link( $mts_parent ) );
		}
	}
	$mts_crumbs[] = array( 'label' => $mts_title );
} else {
	$mts_crumbs[] = array( 'label' => $mts_title );
}

$mts_sorts   = mts_sort_options();
$mts_current = (string) mts_filter( MTS_F_SORT, 'popular' );
?>

<main id="main" class="col">

	<?php
	/*
	 * Banner, matching the Shopify section exactly.
	 *
	 * Two layers, and both are load-bearing:
	 *
	 *   - The inline background is a TINY placeholder, not the banner. .colban is
	 *     charcoal, so until the real image decodes the whole band paints solid
	 *     black, which reads as a broken page rather than a loading one.
	 *   - The banner itself is a real <img class="colban__img">, not a CSS
	 *     background. Putting the full image in background-image (as an earlier
	 *     version of this file did) leaves it sitting under .colban's charcoal
	 *     and the scrim with no sizing rules of its own — which is precisely why
	 *     the banners looked black-tinted.
	 */
	$mts_placeholder = $mts_is_term && $mts_thumb_id ? wp_get_attachment_image_url( $mts_thumb_id, 'thumbnail' ) : '';

	/*
	 * THE CAPTION IS ALWAYS WHITE.
	 *
	 * An earlier version measured each banner and switched the caption to ink on
	 * light artwork. It was legible, but it meant the type changed colour from
	 * one category to the next, which reads as inconsistency rather than as a
	 * response to the image.
	 *
	 * The contrast is handled in the artwork instead: scripts/build-banners.py
	 * darkens each crop only as far as the measurement requires — an already
	 * dark banner is untouched, a cream one is taken down the minimum distance
	 * that puts white above 4.5:1. Every banner in the set now clears that with
	 * white type, so there is nothing left for the template to decide.
	 */
	?>
	<div class="colban grain<?php echo $mts_bg ? ' colban--img' : ''; ?>"
		 <?php echo $mts_placeholder ? 'style="background-image:url(' . esc_url( $mts_placeholder ) . ')"' : ''; ?>>
		<?php if ( $mts_bg ) : ?>
			<?php
			/*
			 * A REAL srcset, and honest dimensions.
			 *
			 * This shipped one fixed file declared as width="2000" height="560"
			 * while the file itself was 1600×893 — so the browser reserved a
			 * 3.57:1 box for 1.79:1 pixels and then upscaled a 1600px image
			 * across a 2000px+ band. That is the blur. Shopify serves the same
			 * artwork with a srcset to 2000w; scripts/pull-collection-banners.py
			 * fetches those widths, and mts_banner_srcset() offers whichever of
			 * them actually exist on disk.
			 */
			$mts_srcset = mts_banner_srcset( $mts_bg );
			$mts_dims   = mts_image_size( $mts_bg );

			/*
			 * TWO FRAMES, because the band's shape changes with the viewport.
			 *
			 * Desktop is 4.99:1 and a phone is 2.07:1 — a difference of more
			 * than two to one. Serving the desktop frame to a phone let `cover`
			 * crop its sides away, leaving 35% of the picture and the outer
			 * tapes gone; serving the phone frame to a desktop does the same in
			 * reverse.
			 *
			 * So each banner is cut twice from the same photograph, both times
			 * around its own product cluster, and <picture> picks. 900px is the
			 * breakpoint where the band stops being phone-shaped.
			 */
			$mts_wide = mts_asset( 'img/site/cat/' . $mts_term->slug . '-wide.jpg' );
			?>
			<picture>
				<?php if ( $mts_wide ) : ?>
					<source media="(min-width: 900px)"
							srcset="<?php echo esc_attr( (string) mts_banner_srcset( $mts_wide ) ?: $mts_wide ); ?>"
							sizes="100vw">
				<?php endif; ?>
				<img class="colban__img" src="<?php echo esc_url( $mts_bg ); ?>"
					 <?php echo $mts_srcset ? 'srcset="' . esc_attr( $mts_srcset ) . '" sizes="100vw"' : ''; ?>
					 alt="" aria-hidden="true"
					 <?php echo $mts_dims ? 'width="' . esc_attr( (string) $mts_dims[0] ) . '" height="' . esc_attr( (string) $mts_dims[1] ) . '"' : ''; ?>
					 fetchpriority="high" decoding="async">
			</picture>
		<?php endif; ?>
		<div class="colban__scrim"></div>
		<div class="wrap colban__inner">
			<?php get_template_part( 'template-parts/breadcrumbs', null, array( 'items' => $mts_crumbs ) ); ?>
			<?php if ( $mts_group ) : ?>
				<span class="eyebrow eyebrow--onink"><?php echo esc_html( $mts_group ); ?></span>
			<?php endif; ?>
			<h1 class="colban__title"><?php echo esc_html( $mts_title ); ?></h1>
			<span class="colban__count num">
				<?php
				printf(
					/* translators: %s: number of products */
					esc_html( _n( '%s product available', '%s products available', $mts_total, 'mytapestore' ) ),
					esc_html( number_format_i18n( $mts_total ) )
				);
				?>
			</span>
		</div>
	</div>

	<div class="wrap col__layout">

		<?php
		/*
		 * Mobile bar. Below 900px the sidebar is off-screen and these two buttons
		 * are the only way to reach the category list and the filters — the theme
		 * shipped neither, so on a phone the collection page had no filtering and
		 * no category navigation at all. Desktop hides it in CSS.
		 */
		?>
		<div class="col__mobilebar" data-mts-colbar>
			<button type="button" class="col__mobilebar-btn" data-mts-colbar-toggle="cats" aria-expanded="false">
				<?php mts_the_icon( 'grid', 16 ); ?>
				<span><?php esc_html_e( 'Category', 'mytapestore' ); ?></span>
				<?php mts_the_icon( 'chevronDown', 15, 'col__mobilebar-chev' ); ?>
			</button>
			<button type="button" class="col__mobilebar-btn" data-mts-colbar-toggle="filters" aria-expanded="false">
				<?php mts_the_icon( 'layers', 16 ); ?>
				<span><?php esc_html_e( 'Filters', 'mytapestore' ); ?></span>
				<?php mts_the_icon( 'chevronDown', 15, 'col__mobilebar-chev' ); ?>
			</button>
		</div>

		<aside class="col__side" data-mts-colside>
			<?php
			get_template_part( 'template-parts/category-rail', null, array(
				'active' => $mts_is_term ? (int) $mts_term->term_id : 0,
			) );
			get_template_part( 'template-parts/filter-panel' );
			?>
		</aside>

		<div class="col__main">

			<div class="col__toolbar">
				<span class="col__count num">
					<?php
					printf(
						/* translators: %s: number of products */
						esc_html( _n( '%s product', '%s products', $mts_total, 'mytapestore' ) ),
						esc_html( number_format_i18n( $mts_total ) )
					);
					?>
				</span>

				<div class="col__tools">
					<form class="col__sort-form" data-mts-sort method="get">
						<?php
						// Preserve the active filters when the sort changes.
						foreach ( (array) $_GET as $mts_k => $mts_v ) : // phpcs:ignore WordPress.Security.NonceVerification.Recommended
							if ( MTS_F_SORT === $mts_k ) {
								continue;
							}
							if ( is_array( $mts_v ) ) {
								foreach ( $mts_v as $mts_item ) :
									?>
									<input type="hidden" name="<?php echo esc_attr( $mts_k ); ?>[]" value="<?php echo esc_attr( sanitize_text_field( wp_unslash( $mts_item ) ) ); ?>">
									<?php
								endforeach;
								continue;
							}
							?>
							<input type="hidden" name="<?php echo esc_attr( $mts_k ); ?>" value="<?php echo esc_attr( sanitize_text_field( wp_unslash( $mts_v ) ) ); ?>">
						<?php endforeach; ?>

						<?php
						/*
						 * `.col__sort` belongs on the LABEL, not the form — it is the
						 * bordered pill the design draws around "Sort by ▾", and the
						 * word "Sort by" lives in a <span> inside it. With the class on
						 * the form and a bare <label>, neither rule matched and the
						 * control rendered as unstyled browser default.
						 */
						?>
						<label class="col__sort" for="mts-sort">
							<span><?php esc_html_e( 'Sort by', 'mytapestore' ); ?></span>
							<select id="mts-sort" name="<?php echo esc_attr( MTS_F_SORT ); ?>"
									aria-label="<?php esc_attr_e( 'Sort products', 'mytapestore' ); ?>"
									onchange="this.form.submit()">
								<?php foreach ( $mts_sorts as $mts_value => $mts_label ) : ?>
									<option value="<?php echo esc_attr( $mts_value ); ?>" <?php selected( $mts_current, $mts_value ); ?>>
										<?php echo esc_html( $mts_label ); ?>
									</option>
								<?php endforeach; ?>
							</select>
							<?php mts_the_icon( 'chevronDown', 16 ); ?>
						</label>
						<noscript><button class="btn btn--ghost" type="submit"><?php esc_html_e( 'Sort', 'mytapestore' ); ?></button></noscript>
					</form>
				</div>
			</div>

			<?php if ( woocommerce_product_loop() && have_posts() ) : ?>

				<?php
				/*
				 * Visually hidden, but it closes the h1 → h3 gap: the card titles
				 * are H3 and had no H2 above them, so the outline jumped a level
				 * and a screen-reader user browsing by heading heard the product
				 * names as sub-items of nothing.
				 *
				 * This is `<h2 class="sr-only">` in sections/mts-collection.liquid,
				 * and it was the one heading the WordPress port dropped — the
				 * collection page was the only template whose outline did not
				 * match the Shopify store's.
				 */
				?>
				<h2 class="sr-only">
					<?php
					printf(
						/* translators: %s: category name */
						esc_html__( '%s products', 'mytapestore' ),
						esc_html( $mts_title )
					);
					?>
				</h2>

				<div class="grid-products col__grid">
					<?php
					while ( have_posts() ) {
						the_post();
						wc_get_template_part( 'content', 'product' );
					}
					?>
				</div>

				<?php
				get_template_part( 'template-parts/pagination', null, array( 'label' => __( 'Products pagination', 'mytapestore' ) ) );
				?>

			<?php else : ?>

				<div class="col__empty">
					<?php mts_the_icon( 'layers', 40 ); ?>
					<p><?php esc_html_e( 'No products match your filters here.', 'mytapestore' ); ?></p>
					<?php if ( mts_filters_active() ) : ?>
						<a class="btn btn--ghost" href="<?php echo esc_url( strtok( (string) ( $_SERVER['REQUEST_URI'] ?? '/' ), '?' ) ); // phpcs:ignore ?>">
							<?php esc_html_e( 'Clear filters', 'mytapestore' ); ?>
						</a>
					<?php endif; ?>
				</div>

			<?php endif; ?>

		</div>
	</div>

	<?php
	if ( $mts_is_term ) {
		get_template_part( 'template-parts/category-seo', null, array( 'term' => $mts_term ) );
	}
	?>

</main>

<?php
get_footer();
