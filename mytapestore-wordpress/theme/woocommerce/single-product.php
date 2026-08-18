<?php
/**
 * Single product — the Shopify product page (sections/mts-product.liquid), node
 * for node.
 *
 * THE ONE RULE FOR THIS FILE: the add-to-cart form is WooCommerce's, not ours.
 *
 * woocommerce_template_single_add_to_cart() renders the real form — the
 * variation selects, the hidden variation_id, the nonce, the quantity input and
 * the POST target — and wc-add-to-cart-variation.js keeps price and stock in
 * sync with the chosen variation. This template wraps that form in the design's
 * markup and restyles it; it does not reimplement it.
 *
 * The form carries `.pdp-buybox` ITSELF and sits as a direct child of .pdp-buy,
 * because .pdp-buybox is the white bordered card the stylesheet draws around the
 * options and the buy actions. It used to be a wrapper <div> around the whole
 * buy column, which put the eyebrow, the H1, the rating and the price inside
 * that card too — one 700px slab where the design has a title, a price, and then
 * a card. That single misplaced class was the loudest difference on the page.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

get_header();

global $product;

if ( ! $product instanceof WC_Product ) {
	$product = wc_get_product( get_the_ID() );
}

if ( ! $product ) {
	get_footer();
	return;
}

$mts_id       = $product->get_id();
$mts_variable = $product->is_type( 'variable' );
$mts_in_stock = $product->is_in_stock();
$mts_rating   = (float) $product->get_average_rating();
$mts_reviews  = (int) $product->get_review_count();
$mts_brand    = mts_product_brand( $product );
$mts_split    = mts_product_terms( $product );
$mts_cat      = mts_primary_category( $product );

// Breadcrumbs from the product's primary CATEGORY — never an industry, or the
// trail reads "Home / Building & Construction / Kikusui Joist Protection Tape",
// which is who buys it, not where it lives.
$mts_crumbs = array( array( 'label' => __( 'Home', 'mytapestore' ), 'href' => home_url( '/' ) ) );
if ( $mts_cat ) {
	$mts_crumbs[] = array( 'label' => $mts_cat->name, 'href' => get_term_link( $mts_cat ) );
}
$mts_crumbs[] = array( 'label' => $product->get_name() );

// Gallery: featured image first, then the gallery, de-duplicated.
$mts_image_ids = array_values( array_unique( array_filter( array_merge(
	array( (int) $product->get_image_id() ),
	$product->get_gallery_image_ids()
) ) ) );

/*
 * WHICH COLOUR DOES EACH GALLERY IMAGE BELONG TO?
 *
 * On a tape that comes in six colours the thumbnail rail shows all six shots at
 * once, so choosing "Blue" left five photos of other colours sitting beside it.
 * The rail should show the colour you picked and nothing else.
 *
 * WooCommerce stores one image per VARIATION, and a variation is a colour and a
 * size together — so several variations (24mm, 36mm, 48mm) share one photo. The
 * map is therefore built the other way round: image id → the colours that claim
 * it. Any image no variation claims is a shared shot (the lifestyle photo, a
 * dimension diagram) and stays visible whatever is selected.
 *
 * The colour attribute is found by LABEL, not slug: it is `pa_color` on most of
 * this catalogue and `pa_colour` on some, and hardcoding either silently
 * disables the whole feature on half the products.
 */
$mts_image_colours = array();
$mts_colour_field  = '';

if ( $mts_variable ) {
	foreach ( array_keys( $product->get_variation_attributes() ) as $mts_attr_name ) {
		if ( preg_match( '/colou?r/i', wc_attribute_label( $mts_attr_name ) ) ) {
			$mts_colour_field = 'attribute_' . sanitize_title( $mts_attr_name );
			break;
		}
	}

	if ( '' !== $mts_colour_field ) {
		foreach ( $product->get_available_variations() as $mts_variation ) {
			$mts_value    = (string) ( $mts_variation['attributes'][ $mts_colour_field ] ?? '' );
			$mts_image_id = (int) ( $mts_variation['image_id'] ?? 0 );

			// An empty value is the "any colour" variation — it claims nothing.
			if ( '' === $mts_value || ! $mts_image_id ) {
				continue;
			}

			if ( ! isset( $mts_image_colours[ $mts_image_id ] ) ) {
				$mts_image_colours[ $mts_image_id ] = array();
			}
			if ( ! in_array( $mts_value, $mts_image_colours[ $mts_image_id ], true ) ) {
				$mts_image_colours[ $mts_image_id ][] = $mts_value;
			}
		}
	}

	/*
	 * Only filter when it would actually narrow something down. If every
	 * variation shares one photo — which is most of this catalogue — there is
	 * nothing to hide, and switching colour should leave the rail alone rather
	 * than collapsing it to a single thumbnail.
	 */
	if ( count( $mts_image_colours ) < 2 ) {
		$mts_image_colours = array();
		$mts_colour_field  = '';
	}
}

$mts_price = $mts_variable
	? (float) $product->get_variation_price( 'min', true )
	: (float) wc_get_price_to_display( $product );
?>

<main id="main" class="pdp" data-mts-product>

	<div class="wrap pdp__crumbs">
		<?php get_template_part( 'template-parts/breadcrumbs', null, array( 'items' => $mts_crumbs ) ); ?>
	</div>

	<?php
	/**
	 * WooCommerce notices ("added to cart", validation errors) must have a home
	 * on this page, or an add-to-cart failure would be silent.
	 */
	if ( function_exists( 'woocommerce_output_all_notices' ) ) {
		echo '<div class="wrap">';
		woocommerce_output_all_notices();
		echo '</div>';
	}
	?>

	<div id="product-<?php echo esc_attr( (string) $mts_id ); ?>" class="wrap pdp__top">

		<div class="pdp-gallery" data-mts-gallery
			 <?php echo $mts_colour_field ? 'data-mts-colour-field="' . esc_attr( $mts_colour_field ) . '"' : ''; ?>>
			<div class="pdp-gallery__row">
			<?php if ( count( $mts_image_ids ) > 1 ) : ?>
				<div class="pdp-gallery__thumbs" role="group" aria-label="<?php esc_attr_e( 'Product images', 'mytapestore' ); ?>">
					<?php foreach ( $mts_image_ids as $mts_i => $mts_image_id ) : ?>
						<?php
						/*
						 * The colours that claim this shot. Empty means no variation
						 * uses it — a shared shot, shown whatever is selected. See the
						 * map built at the top of this file.
						 */
						$mts_owners = $mts_image_colours[ $mts_image_id ] ?? array();
						?>
						<button type="button"
								class="pdp-gallery__thumb<?php echo 0 === $mts_i ? ' is-active' : ''; ?>"
								data-mts-thumb="<?php echo esc_attr( (string) $mts_i ); ?>"
								data-index="<?php echo esc_attr( (string) $mts_i ); ?>"
								data-full="<?php echo esc_url( (string) wp_get_attachment_image_url( $mts_image_id, 'woocommerce_single' ) ); ?>"
								data-large="<?php echo esc_url( (string) wp_get_attachment_image_url( $mts_image_id, 'full' ) ); ?>"
								data-image-id="<?php echo esc_attr( (string) $mts_image_id ); ?>"
								data-mts-colours="<?php echo esc_attr( implode( ',', $mts_owners ) ); ?>"
								aria-label="<?php esc_attr_e( 'View image', 'mytapestore' ); ?>">
							<?php echo wp_get_attachment_image( $mts_image_id, 'woocommerce_thumbnail', false, array( 'loading' => 'lazy', 'alt' => '' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
						</button>
					<?php endforeach; ?>
				</div>
			<?php endif; ?>

				<?php
				/*
				 * The whole frame is the zoom control, as on Shopify — the image
				 * scales on hover, the magnifier fades up in the corner and a click
				 * anywhere on it opens the lightbox. It was a <div> with a small
				 * button in the corner, so `.pdp-gallery__main { cursor: zoom-in }`
				 * and the `:hover .pdp-gallery__zoom` reveal both had nothing to
				 * apply to.
				 */
				?>
				<button type="button" class="pdp-gallery__main" data-mts-gallery-main
						aria-label="<?php esc_attr_e( 'Zoom image', 'mytapestore' ); ?>">
					<?php if ( $mts_image_ids ) : ?>
						<?php
						echo wp_get_attachment_image( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
							$mts_image_ids[0],
							'woocommerce_single',
							false,
							array(
								'data-mts-gallery-img' => '1',
								'data-mts-main-img'    => '1',
								'fetchpriority'        => 'high',
							)
						);
						?>
					<?php else : ?>
						<?php echo wc_placeholder_img( 'woocommerce_single' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					<?php endif; ?>

					<div class="pdp-gallery__badges">
						<?php if ( mts_is_bestseller( $product ) ) : ?>
							<span class="tag tag--best"><?php mts_the_icon( 'star', 11 ); ?> <?php esc_html_e( 'Bestseller', 'mytapestore' ); ?></span>
						<?php endif; ?>
						<?php if ( $product->is_on_sale() ) : ?>
							<span class="tag tag--sale"><?php esc_html_e( 'Sale', 'mytapestore' ); ?></span>
						<?php endif; ?>
						<?php
						/*
						 * Always in the markup, hidden while the selected variation is
						 * in stock. Choosing a sold-out colour has to be able to show
						 * this badge without the page reloading, which it cannot do if
						 * the element was never rendered.
						 */
						?>
						<span class="tag tag--out" data-mts-oos-badge <?php echo $mts_in_stock ? 'hidden' : ''; ?>>
							<?php esc_html_e( 'Out of stock', 'mytapestore' ); ?>
						</span>
					</div>

					<span class="pdp-gallery__zoom"><?php mts_the_icon( 'search', 16 ); ?></span>
				</button>
			</div>

			<?php $mts_key_specs = mts_product_key_specs( $product ); ?>
			<?php if ( $mts_key_specs ) : ?>
				<ul class="pdp-gallery__specs">
					<?php foreach ( array_slice( $mts_key_specs, 0, 4 ) as $mts_spec ) : ?>
						<li><?php mts_the_icon( 'check', 15 ); ?><span><?php echo esc_html( $mts_spec ); ?></span></li>
					<?php endforeach; ?>
				</ul>
			<?php endif; ?>
		</div>

		<div class="pdp-buy">

			<?php if ( $mts_cat ) : ?>
				<a class="pdp-buy__cat" href="<?php echo esc_url( get_term_link( $mts_cat ) ); ?>">
					<?php echo esc_html( $mts_cat->name ); ?>
				</a>
			<?php endif; ?>

			<h1 class="pdp-buy__title"><?php echo esc_html( $product->get_name() ); ?></h1>

			<div class="pdp-buy__rating">
				<?php if ( $mts_reviews > 0 ) : ?>
					<button type="button" class="pdp-buy__ratebtn" data-mts-goto-reviews
							aria-label="<?php esc_attr_e( 'See reviews', 'mytapestore' ); ?>">
						<?php
						get_template_part( 'template-parts/stars', null, array(
							'rating' => $mts_rating,
							'count'  => 0,
							'size'   => 16,
						) );
						?>
					</button>
				<?php endif; ?>
				<button type="button" class="pdp-buy__revlink" data-mts-goto-reviews>
					<?php
					if ( $mts_reviews > 0 ) {
						printf(
							/* translators: %s: review count */
							esc_html( _n( '%s review', '%s reviews', $mts_reviews, 'mytapestore' ) ),
							esc_html( number_format_i18n( $mts_reviews ) )
						);
					} else {
						esc_html_e( 'No reviews yet', 'mytapestore' );
					}
					?>
				</button>
			</div>

			<div class="pdp-buy__idline">
				<?php if ( $mts_brand ) : ?>
					<span class="pdp-buy__idchip"><b><?php esc_html_e( 'Brand', 'mytapestore' ); ?></b> <?php echo esc_html( $mts_brand ); ?></span>
				<?php endif; ?>
				<span class="pdp-buy__idchip num" data-mts-sku-wrap <?php echo $product->get_sku() ? '' : 'hidden'; ?>>
					<b><?php esc_html_e( 'SKU', 'mytapestore' ); ?></b> <span data-mts-sku><?php echo esc_html( (string) $product->get_sku() ); ?></span>
				</span>
			</div>

			<div class="pdp-buy__pricerow">
				<?php
				/*
				 * When a quantity break applies, the headline becomes the discounted
				 * price and the original is struck through beside it. Hidden until a
				 * tier is active; product.js owns it.
				 */
				?>
				<s class="pdp-buy__was num" data-mts-was hidden></s>
				<span class="pdp-buy__price num" data-mts-price><?php echo esc_html( mts_money( $mts_price ) ); ?></span>
				<span class="pdp-buy__gst"><?php esc_html_e( 'Inc GST', 'mytapestore' ); ?></span>
			</div>

			<p class="pdp-buy__tax">
				<?php esc_html_e( 'Tax included · Shipping calculated at checkout', 'mytapestore' ); ?>
				<?php
				if ( $mts_variable ) {
					$mts_lo = (float) $product->get_variation_price( 'min', true );
					$mts_hi = (float) $product->get_variation_price( 'max', true );
					if ( $mts_hi > $mts_lo ) {
						printf(
							' · %s %s – %s',
							esc_html__( 'Range', 'mytapestore' ),
							esc_html( mts_money( $mts_lo ) ),
							esc_html( mts_money( $mts_hi ) )
						);
					}
				}
				?>
			</p>

			<?php
			/**
			 * WooCommerce's own add-to-cart form — rendered ONCE, and never inside
			 * a loop. It emits <form class="pdp-buybox …"> itself; see
			 * woocommerce/single-product/add-to-cart/{simple,variable}.php.
			 */
			woocommerce_template_single_add_to_cart();
			?>

			<div class="pdp-trust">
				<ul class="pdp-trust__row">
					<li><?php mts_the_icon( 'truck', 18 ); ?><span><?php esc_html_e( 'Fast AU dispatch', 'mytapestore' ); ?></span></li>
					<li><?php mts_the_icon( 'refresh', 18 ); ?><span><?php esc_html_e( 'Easy returns', 'mytapestore' ); ?></span></li>
					<li><?php mts_the_icon( 'lock', 18 ); ?><span><?php esc_html_e( 'Secure checkout', 'mytapestore' ); ?></span></li>
					<li><?php mts_the_icon( 'medal', 18 ); ?><span><?php esc_html_e( 'Lowest-price guarantee', 'mytapestore' ); ?></span></li>
				</ul>

				<div class="pdp-trust__pay">
					<span class="pdp-trust__pay-label"><?php esc_html_e( 'We accept', 'mytapestore' ); ?></span>
					<div class="pdp-buy__pay-marks">
						<?php foreach ( array( 'visa', 'mastercard', 'amex', 'paypal', 'shop-pay' ) as $mts_mark ) : ?>
							<?php $mts_src = mts_asset( "img/pay/{$mts_mark}.svg" ); ?>
							<?php if ( $mts_src ) : ?>
								<img src="<?php echo esc_url( $mts_src ); ?>" alt="<?php echo esc_attr( $mts_mark ); ?>" width="32" height="20" loading="lazy">
							<?php endif; ?>
						<?php endforeach; ?>
					</div>
				</div>

				<?php
				/*
				 * Shipping and Returns. This row used to hold a link back to the
				 * product's own category — a link the eyebrow above the H1 and the
				 * breadcrumb already provide twice — while the two policy links the
				 * design puts here sat below it in a stray .pdp-ship block, which is
				 * the SHIPPING TAB's class and drew tab styling in the buy column.
				 */
				?>
				<div class="pdp-buy__meta">
					<a href="<?php echo esc_url( home_url( '/shipping-delivery/' ) ); ?>">
						<?php esc_html_e( 'Shipping info', 'mytapestore' ); ?> <?php mts_the_icon( 'chevronRight', 14 ); ?>
					</a>
					<a href="<?php echo esc_url( home_url( '/return-exchange-policy/' ) ); ?>">
						<?php esc_html_e( 'Returns &amp; exchanges', 'mytapestore' ); ?> <?php mts_the_icon( 'chevronRight', 14 ); ?>
					</a>
				</div>
			</div>

		</div>
	</div>

	<div class="wrap pdp__tabs" data-mts-tabs>
		<?php
		/*
		 * Each button sits inside an <h2>, as on Shopify. The tab labels ARE this
		 * page's section headings, so keeping them as headings preserves the
		 * document outline; the button inside carries the tab behaviour.
		 */
		$mts_tabs = array(
			'description' => __( 'Description', 'mytapestore' ),
			'specs'       => __( 'Specifications', 'mytapestore' ),
			'reviews'     => $mts_reviews > 0
				/* translators: %s: review count */
				? sprintf( __( 'Reviews (%s)', 'mytapestore' ), number_format_i18n( $mts_reviews ) )
				: __( 'Reviews', 'mytapestore' ),
			'shipping'    => __( 'Shipping &amp; Returns', 'mytapestore' ),
		);
		?>
		<div class="pdp-tabnav" role="tablist">
			<?php $mts_first = true; ?>
			<?php foreach ( $mts_tabs as $mts_key => $mts_label ) : ?>
				<h2 class="pdp-tabnav__h">
					<button role="tab" type="button"
							aria-selected="<?php echo $mts_first ? 'true' : 'false'; ?>"
							class="pdp-tabnav__btn<?php echo $mts_first ? ' is-active' : ''; ?>"
							data-mts-tab="<?php echo esc_attr( $mts_key ); ?>"><?php echo esc_html( $mts_label ); ?></button>
				</h2>
				<?php $mts_first = false; ?>
			<?php endforeach; ?>
		</div>

		<?php
		/*
		 * ONE .pdp-tabpanel, four panels inside it — the stylesheet centres and
		 * caps .pdp-tabpanel at 860px, so four sibling copies of it drew four
		 * stacked boxes where the design has one.
		 */
		?>
		<div class="pdp-tabpanel" role="tabpanel">

			<div class="pdp-desc" data-mts-panel="description">
				<?php
				/*
				 * mts_normalise_product_description() is called EXPLICITLY, not left
				 * to `the_content`. This panel never runs the description through
				 * that filter — it calls $product->get_description() and pipes it
				 * straight through wpautop — so a filter hung on `the_content` would
				 * have applied to nothing on the one page it was written for.
				 *
				 * It is what puts the sections in the same order on every product
				 * (intro → application image → Key features → Applications → …) and
				 * what rewrites the Shopify /collections/ and /products/ links the
				 * copy was written with into the WooCommerce URLs they mean here.
				 * See inc/product-description.php.
				 */
				$mts_description = $product->get_description();
				echo $mts_description
					? wp_kses_post( mts_normalise_product_description( wpautop( do_shortcode( $mts_description ) ) ) )
					: '<p>' . esc_html__( 'No description available for this product yet.', 'mytapestore' ) . '</p>';
				?>
			</div>

			<div data-mts-panel="specs" hidden>
				<div class="pdp-specgrid">
					<table class="spec-table">
						<tbody>
							<?php if ( $mts_cat ) : ?>
								<tr><th><?php esc_html_e( 'Category', 'mytapestore' ); ?></th><td><?php echo esc_html( $mts_cat->name ); ?></td></tr>
							<?php endif; ?>

							<?php
							/*
							 * Variation options — Size, Colour — as plain comma-joined
							 * text. They were rendered as .pdp-specbox__chips, which is
							 * the pill styling for the "Recommended for" links at the
							 * bottom of this tab; a spec table cell is a value, not a
							 * row of buttons.
							 */
							foreach ( $product->get_attributes() as $mts_attr ) :
								if ( ! $mts_attr->get_visible() && ! $mts_attr->get_variation() ) {
									continue;
								}
								$mts_values = $mts_attr->is_taxonomy()
									? wp_list_pluck( (array) $mts_attr->get_terms(), 'name' )
									: $mts_attr->get_options();
								$mts_values = array_unique( array_filter( array_map( 'strval', (array) $mts_values ), 'strlen' ) );
								if ( ! $mts_values ) {
									continue;
								}
								?>
								<tr>
									<th><?php echo esc_html( wc_attribute_label( $mts_attr->get_name() ) ); ?></th>
									<td><?php echo esc_html( implode( ', ', $mts_values ) ); ?></td>
								</tr>
							<?php endforeach; ?>

							<tr>
								<th><?php esc_html_e( 'Price', 'mytapestore' ); ?></th>
								<td class="num">
									<?php
									if ( $mts_variable ) {
										$mts_lo = (float) $product->get_variation_price( 'min', true );
										$mts_hi = (float) $product->get_variation_price( 'max', true );
										echo esc_html(
											$mts_hi > $mts_lo
												? mts_money( $mts_lo ) . ' – ' . mts_money( $mts_hi )
												: mts_money( $mts_lo )
										);
									} else {
										echo esc_html( mts_money( (float) wc_get_price_to_display( $product ) ) );
									}
									echo ' ' . esc_html__( 'Inc GST', 'mytapestore' );
									?>
								</td>
							</tr>

							<tr>
								<th><?php esc_html_e( 'Availability', 'mytapestore' ); ?></th>
								<td><?php echo $mts_in_stock ? esc_html__( 'In stock', 'mytapestore' ) : esc_html__( 'Out of stock', 'mytapestore' ); ?></td>
							</tr>

							<?php if ( $mts_brand ) : ?>
								<tr><th><?php esc_html_e( 'Brand', 'mytapestore' ); ?></th><td><?php echo esc_html( $mts_brand ); ?></td></tr>
							<?php endif; ?>

							<?php
							/*
							 * The real engineering data — thickness, temperature range,
							 * adhesive type, tensile strength. Rows already covered above
							 * (colour, size) are skipped so the table never states the
							 * same thing twice.
							 */
							$mts_shown = array( 'category', 'price', 'availability', 'brand' );
							foreach ( $product->get_attributes() as $mts_attr ) {
								$mts_shown[] = strtolower( wc_attribute_label( $mts_attr->get_name() ) );
							}
							foreach ( mts_product_specs( $product ) as $mts_spec ) :
								$mts_key = strtolower( trim( $mts_spec['label'] ) );
								if ( in_array( $mts_key, $mts_shown, true ) || in_array( rtrim( $mts_key, 's' ), $mts_shown, true ) ) {
									continue;
								}
								?>
								<tr><th><?php echo esc_html( $mts_spec['label'] ); ?></th><td><?php echo esc_html( $mts_spec['value'] ); ?></td></tr>
							<?php endforeach; ?>
						</tbody>
					</table>

					<?php
					/*
					 * "Recommended for" is the INDUSTRIES the product serves, plus any
					 * further categories beyond the primary one. It listed every
					 * product_cat term unfiltered and unlabelled, so a product
					 * recommended itself for its own category.
					 */
					$mts_chips = array();
					foreach ( array_merge( array_slice( $mts_split['categories'], 1 ), $mts_split['industries'] ) as $mts_term ) {
						if ( in_array( $mts_term->slug, array( 'all', 'frontpage', 'bestsellers', 'uncategorised', 'uncategorized' ), true ) ) {
							continue;
						}
						$mts_chips[] = $mts_term;
					}
					?>
					<?php if ( $mts_chips ) : ?>
						<div class="pdp-specgrid__ind">
							<h3><?php esc_html_e( 'Recommended for', 'mytapestore' ); ?></h3>
							<div class="pdp-specbox__chips">
								<?php foreach ( $mts_chips as $mts_term ) : ?>
									<a href="<?php echo esc_url( get_term_link( $mts_term ) ); ?>"><?php echo esc_html( $mts_term->name ); ?></a>
								<?php endforeach; ?>
							</div>
						</div>
					<?php endif; ?>
				</div>
			</div>

			<div data-mts-panel="reviews" id="reviews" hidden>
				<?php comments_template(); ?>
			</div>

			<div class="pdp-desc pdp-ship" data-mts-panel="shipping" hidden>
				<h3><?php esc_html_e( 'Shipping &amp; delivery', 'mytapestore' ); ?></h3>
				<p><?php esc_html_e( "We deliver to every part of Australia. Orders are processed within 1–2 business days — placed before our daily cut-off, they're processed the same day. Every shipment includes tracking so you can follow your parcel in real time.", 'mytapestore' ); ?></p>
				<h3><?php esc_html_e( 'Returns &amp; exchanges', 'mytapestore' ); ?></h3>
				<p><?php esc_html_e( 'Incorrect items we send can be returned for exchange; items ordered by mistake can be returned at your expense. Faulty or damaged items are replaced free — file a claim within 2 days of delivery with photos. Items must be returned within 30 days of delivery, and refunds are processed within 7 days of receipt.', 'mytapestore' ); ?></p>
			</div>

		</div>
	</div>

	<?php
	/*
	 * Related products come from the primary CATEGORY, not wc_get_related_products()
	 * — Woo's version mixes in tag matches and shuffles the result on every load,
	 * so the rail showed a different four products each refresh where Shopify
	 * shows the first four of the collection.
	 */
	$mts_related_ids = array();
	if ( $mts_cat ) {
		$mts_related_ids = get_posts( array(
			'post_type'           => 'product',
			'post_status'         => 'publish',
			'posts_per_page'      => 5,
			'post__not_in'        => array( $mts_id ),
			'fields'              => 'ids',
			'orderby'             => 'menu_order title',
			'order'               => 'ASC',
			'ignore_sticky_posts' => true,
			'tax_query'           => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
				array(
					'taxonomy' => 'product_cat',
					'field'    => 'term_id',
					'terms'    => $mts_cat->term_id,
				),
			),
		) );
		$mts_related_ids = array_slice( $mts_related_ids, 0, 4 );
	}

	if ( count( $mts_related_ids ) > 0 ) :
		?>
		<section class="section section--paper">
			<div class="wrap">
				<div class="section-head">
					<div class="section-title-wrap">
						<span class="eyebrow"><?php esc_html_e( 'You might also need', 'mytapestore' ); ?></span>
						<h2><?php esc_html_e( 'Related products', 'mytapestore' ); ?></h2>
					</div>
				</div>
				<div class="grid-products grid-products--fit">
					<?php
					foreach ( $mts_related_ids as $mts_related_id ) {
						$GLOBALS['post']    = get_post( $mts_related_id ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride
						$GLOBALS['product'] = wc_get_product( $mts_related_id );
						setup_postdata( $GLOBALS['post'] );
						wc_get_template_part( 'content', 'product' );
					}
					wp_reset_postdata();
					$GLOBALS['product'] = $product;
					?>
				</div>
			</div>
		</section>
	<?php endif; ?>

	<?php
	/*
	 * Lightbox — in the markup, as on Shopify, rather than assembled in
	 * JavaScript. The hand-built version used text glyphs ("✕", "‹") where the
	 * design uses icons, shipped no image counter, and could not be styled by
	 * `.pdp-lightbox__stage figcaption` because it never created one.
	 */
	?>
	<div class="pdp-lightbox" data-mts-lightbox role="dialog" aria-modal="true"
		 aria-label="<?php echo esc_attr( sprintf( /* translators: %s: product name */ __( '%s — image viewer', 'mytapestore' ), $product->get_name() ) ); ?>" hidden>
		<button type="button" class="pdp-lightbox__close" data-mts-lightbox-close
				aria-label="<?php esc_attr_e( 'Close image viewer', 'mytapestore' ); ?>">
			<?php mts_the_icon( 'close', 26 ); ?>
		</button>
		<button type="button" class="pdp-lightbox__nav pdp-lightbox__nav--prev" data-mts-lightbox-prev
				aria-label="<?php esc_attr_e( 'Previous image', 'mytapestore' ); ?>">
			<?php mts_the_icon( 'chevronRight', 28 ); ?>
		</button>
		<figure class="pdp-lightbox__stage">
			<img alt="<?php echo esc_attr( $product->get_name() ); ?>" data-mts-lightbox-img>
			<figcaption class="num" data-mts-lightbox-count></figcaption>
		</figure>
		<button type="button" class="pdp-lightbox__nav pdp-lightbox__nav--next" data-mts-lightbox-next
				aria-label="<?php esc_attr_e( 'Next image', 'mytapestore' ); ?>">
			<?php mts_the_icon( 'chevronRight', 28 ); ?>
		</button>
	</div>

</main>

<?php
get_footer();
