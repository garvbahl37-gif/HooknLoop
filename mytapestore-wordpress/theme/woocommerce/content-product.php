<?php
/**
 * Product card — the Shopify catalogue card (snippets/mts-product-card.liquid).
 *
 * Matted product frame, display-face pricing, and a full-width CTA that fills
 * brand-red on hover. Used by the collection archive, the homepage bestseller
 * grid, search, the cart upsell, the wishlist and the related rail, so it is the
 * single most-rendered piece of markup in the theme.
 *
 * Notes on the two departures from Liquid, both deliberate:
 *
 *   - The whole card is clickable (data-mts-card-href, driven by cards.js) AND
 *     the title is a real <a>. Shopify does the same. A div-with-a-click cannot
 *     be focused, opened in a new tab, or read as a link.
 *   - The image is NOT wrapped in a link. It was, and `.pc__media img` styles an
 *     image that is a direct child of the frame — the <a> in between broke the
 *     matting on every card in the store.
 *
 * @param bool $args['hide_cat'] Suppress the category eyebrow. Set on collection
 *                               pages, where every card would repeat the name of
 *                               the page you are already standing on.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

global $product;

if ( ! $product instanceof WC_Product || ! $product->is_visible() ) {
	return;
}

$mts_hide_cat = ! empty( $args['hide_cat'] ) || is_product_taxonomy();

$mts_id        = $product->get_id();
$mts_variable  = $product->is_type( 'variable' );
$mts_in_stock  = $product->is_in_stock();
$mts_permalink = get_permalink( $mts_id );
$mts_rating    = (float) $product->get_average_rating();
$mts_reviews   = (int) $product->get_review_count();
/*
 * Position in the grid. wc_get_template_part() takes no arguments, so the index
 * comes from WooCommerce's own loop counter — the first row is what the visitor
 * sees first, so it loads eagerly and everything below stays lazy.
 */
$mts_index = function_exists( 'wc_get_loop_prop' ) ? (int) wc_get_loop_prop( 'loop', 0 ) : 0;

// The badge follows the same ranked list the homepage row uses, so a product
// flagged "Bestseller" here is one of the products actually shown there.
$mts_bestseller = mts_is_bestseller( $product );

// Distinct sizes, ignoring the Hook/Loop suffix that doubles the term count on
// hook-and-loop lines without offering the buyer a further choice.
$mts_size_count = 0;
foreach ( $product->get_attributes() as $mts_attr ) {
	if ( ! preg_match( '/size/i', wc_attribute_label( $mts_attr->get_name() ) ) ) {
		continue;
	}
	$mts_terms = $mts_attr->is_taxonomy()
		? wp_list_pluck( $mts_attr->get_terms() ?: array(), 'name' )
		: $mts_attr->get_options();
	$mts_size_count = count( array_unique( array_map(
		static fn( $t ) => trim( (string) preg_replace( '/\s*(Hook|Loop)$/i', '', (string) $t ) ),
		(array) $mts_terms
	) ) );
	break;
}

/*
 * The colours this line comes in, as the live store shows them.
 *
 * mytapestore.com.au renders a row of colour dots on every variable product card
 * — `<span class="swatch swatch-color term-blue swatch-circle">` with the fill
 * inline — and the draft's cards showed only "5 sizes". A shopper scanning a
 * masking-tape collection could not see that one line comes in blue and another
 * in six colours without opening both.
 *
 * The attribute is matched on its LABEL rather than its slug: the taxonomy is
 * `pa_color` on the live site and `pa_colour` in places, and hardcoding either
 * one silently renders nothing on half the catalogue.
 */
$mts_colours = array();
foreach ( $product->get_attributes() as $mts_attr ) {
	if ( ! preg_match( '/colou?r/i', wc_attribute_label( $mts_attr->get_name() ) ) ) {
		continue;
	}

	$mts_values = $mts_attr->is_taxonomy()
		? wp_list_pluck( $mts_attr->get_terms() ?: array(), 'name' )
		: $mts_attr->get_options();

	foreach ( (array) $mts_values as $mts_value ) {
		$mts_value = trim( (string) $mts_value );
		if ( '' !== $mts_value && ! isset( $mts_colours[ $mts_value ] ) ) {
			$mts_colours[ $mts_value ] = mts_swatch_fill( $mts_value );
		}
	}
	break;
}

$mts_cat = mts_primary_category( $product );
?>
<article class="pc" data-mts-card data-mts-card-href="<?php echo esc_url( $mts_permalink ); ?>">

	<div class="pc__media">
		<?php
		echo $product->get_image( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- core markup.
			'woocommerce_thumbnail',
			array(
				'decoding' => 'async',
				'loading'  => $mts_index < 5 ? 'eager' : 'lazy',
			)
		);
		?>

		<div class="pc__badges">
			<?php if ( $mts_bestseller ) : ?>
				<span class="tag tag--best"><?php mts_the_icon( 'star', 11 ); ?> <?php esc_html_e( 'Bestseller', 'mytapestore' ); ?></span>
			<?php endif; ?>
			<?php if ( $product->is_on_sale() ) : ?>
				<span class="tag tag--sale"><?php esc_html_e( 'Sale', 'mytapestore' ); ?></span>
			<?php endif; ?>
			<?php
			/*
			 * Only the EXCEPTION gets a badge over the image. "In stock" is true of
			 * almost every line here, so as a filled pill it shouted on every card
			 * and told the shopper nothing; it lives in the body as a quiet dot.
			 */
			?>
			<?php if ( ! $mts_in_stock ) : ?>
				<span class="tag tag--out"><?php esc_html_e( 'Out of stock', 'mytapestore' ); ?></span>
			<?php endif; ?>
		</div>

		<button class="pc__wish" type="button"
				data-mts-wish="<?php echo esc_attr( (string) $mts_id ); ?>"
				aria-pressed="false"
				aria-label="<?php esc_attr_e( 'Add to wishlist', 'mytapestore' ); ?>">
			<?php mts_the_icon( 'heart', 18 ); ?>
		</button>
	</div>

	<div class="pc__body">
		<?php if ( $mts_cat && ! $mts_hide_cat ) : ?>
			<span class="pc__cat"><?php echo esc_html( $mts_cat->name ); ?></span>
		<?php endif; ?>

		<h3 class="pc__name">
			<a href="<?php echo esc_url( $mts_permalink ); ?>"><?php echo esc_html( $product->get_name() ); ?></a>
		</h3>

		<div class="pc__rating">
			<?php if ( $mts_reviews > 0 ) : ?>
				<?php
				get_template_part( 'template-parts/stars', null, array(
					'rating' => $mts_rating,
					'count'  => $mts_reviews,
					'size'   => 14,
				) );
				?>
			<?php endif; ?>

			<?php
			/*
			 * The "·" SEPARATES the star rating from the size count. It used to be
			 * printed unconditionally, so on the many products with no reviews yet
			 * the card opened with a dangling "· 5 sizes".
			 */
			?>
			<?php if ( $mts_size_count > 1 ) : ?>
				<span class="pc__sizes num">
					<?php echo $mts_reviews > 0 ? '· ' : ''; ?>
					<?php
					printf(
						/* translators: %d: number of sizes */
						esc_html( _n( '%d size', '%d sizes', $mts_size_count, 'mytapestore' ) ),
						(int) $mts_size_count
					);
					?>
				</span>
			<?php endif; ?>

			<?php if ( $mts_in_stock ) : ?>
				<span class="pc__stock"><i class="pc__stock-dot"></i><?php esc_html_e( 'In stock', 'mytapestore' ); ?></span>
			<?php endif; ?>
		</div>

		<?php if ( $mts_colours ) : ?>
			<?php
			/*
			 * ONE colour still gets a dot, because that is what the live store does
			 * — its masking-tape grid shows a single blue dot on the Renderers Cloth
			 * Masking Tape card — and because on this catalogue it earns its place:
			 * FrogTape is green, Fine Line is blue, the automotive line is white, and
			 * the grid is otherwise a wall of near-identical rolls.
			 *
			 * Six at most, then a count. Twelve dots wrap onto a second row and push
			 * the price out of alignment across the grid, which is the one thing a
			 * card row cannot afford.
			 *
			 * This is a LIST, not a control. The colour is chosen on the product
			 * page against real stock; making the dots clickable here would promise
			 * a variant selection the card cannot honour. Each dot carries its name
			 * as text for screen readers, since colour alone is never a label.
			 */
			$mts_shown = array_slice( $mts_colours, 0, 6, true );
			$mts_extra = count( $mts_colours ) - count( $mts_shown );
			?>
			<ul class="pc__swatches" aria-label="<?php esc_attr_e( 'Available colours', 'mytapestore' ); ?>">
				<?php foreach ( $mts_shown as $mts_name => $mts_fill ) : ?>
					<li class="pc__swatch" title="<?php echo esc_attr( $mts_name ); ?>">
						<span class="pc__swatch-dot" style="background:<?php echo esc_attr( $mts_fill ); ?>" aria-hidden="true"></span>
						<span class="screen-reader-text"><?php echo esc_html( $mts_name ); ?></span>
					</li>
				<?php endforeach; ?>

				<?php if ( $mts_extra > 0 ) : ?>
					<li class="pc__swatch-more num">
						<?php
						printf(
							/* translators: %d: number of further colours */
							esc_html__( '+%d', 'mytapestore' ),
							(int) $mts_extra
						);
						?>
						<span class="screen-reader-text">
							<?php
							printf(
								/* translators: %d: number of further colours */
								esc_html( _n( '%d more colour', '%d more colours', $mts_extra, 'mytapestore' ) ),
								(int) $mts_extra
							);
							?>
						</span>
					</li>
				<?php endif; ?>
			</ul>
		<?php endif; ?>

		<div class="pc__foot">
			<div class="pc__price">
				<?php if ( $mts_variable ) : ?>
					<?php
					$mts_lo = (float) $product->get_variation_price( 'min', true );
					$mts_hi = (float) $product->get_variation_price( 'max', true );
					?>
					<?php if ( $mts_hi > $mts_lo ) : ?>
						<span class="pc__from"><?php esc_html_e( 'From', 'mytapestore' ); ?></span>
					<?php endif; ?>
					<b class="num"><?php echo esc_html( mts_money( $mts_lo ) ); ?></b>
				<?php else : ?>
					<b class="num"><?php echo esc_html( mts_money( (float) wc_get_price_to_display( $product ) ) ); ?></b>
				<?php endif; ?>
				<span class="pc__gst"><?php esc_html_e( 'Inc GST', 'mytapestore' ); ?></span>
			</div>

			<?php if ( ! $mts_in_stock ) : ?>
				<button class="pc__cta pc__cta--out" type="button" disabled><?php esc_html_e( 'Sold out', 'mytapestore' ); ?></button>
			<?php elseif ( $mts_variable ) : ?>
				<a class="pc__cta" href="<?php echo esc_url( $mts_permalink ); ?>">
					<?php esc_html_e( 'Choose options', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 15 ); ?>
				</a>
			<?php else : ?>
				<?php
				/*
				 * Simple products add straight from the grid, as on Shopify. It was
				 * an <a> to ?add-to-cart=…, which reloads the whole collection page
				 * and loses the shopper's scroll position; cards.js posts to
				 * WooCommerce's AJAX endpoint and falls back to this href if the
				 * request fails, so the link is kept as the no-JS path.
				 */
				?>
				<a class="pc__cta" href="<?php echo esc_url( $product->add_to_cart_url() ); ?>"
				   data-mts-quick-add="<?php echo esc_attr( (string) $mts_id ); ?>"
				   data-quantity="1"
				   rel="nofollow">
					<?php esc_html_e( 'Add to cart', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 15 ); ?>
				</a>
			<?php endif; ?>
		</div>
	</div>

</article>
