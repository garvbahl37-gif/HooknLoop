<?php
/**
 * Order history — the Shopify order list (snippets/mts-account-orders.liquid).
 *
 * Renders INSIDE the account shell (myaccount/my-account.php →
 * .woocommerce-MyAccount-content), so this file starts at .acct__panel and never
 * emits .wrap or .acct — the shell owns the two-column grid and the sidebar.
 * .acct__panel is the `min-width: 0` that stops a wide order row blowing the
 * 256px/1fr track out and pushing the sidebar off-screen.
 *
 * WooCommerce ships this as a five-column <table class="shop_table">. This theme
 * dequeues every WooCommerce stylesheet, so that table arrived as unstyled
 * browser-default rows in the middle of the account panel. The design has no
 * order table at all: it has .acct-orders, a stack of cards whose header row
 * expands to show the order.
 *
 * THE ROW IS <details>/<summary>, NOT A <button>.
 * The Shopify snippet ships `<button data-mts-order-toggle>` over a `[hidden]`
 * panel and leaves the open/close to JavaScript — and that handler exists in
 * NEITHER theme (grep data-mts-order-toggle: no match in the Shopify
 * mts-theme.js, no match anywhere in assets/js/). Ported literally, every card
 * here would be a row that looks clickable, announces itself as expandable and
 * does nothing. <details>/<summary> carries the same classes and the same
 * layout with the browser doing the toggling, so it works with JavaScript off
 * and keeps working if that handler is written later.
 *
 * WHAT IS STILL WOOCOMMERCE'S, AND WHY IT HAS TO BE:
 *   - wc_get_account_orders_columns() is still the source of truth for which
 *     columns exist, and woocommerce_my_account_my_orders_column_{$column_id}
 *     still fires for every registered column that has a listener. The five
 *     design slots use that hook's output when one is bound, and any column the
 *     design has no slot for is rendered inside the expanded panel instead of
 *     being silently dropped. Hardcoding five cells is how a store loses the
 *     tracking-number or invoice column a plugin added.
 *   - every href comes from wc_get_account_orders_actions() verbatim.
 *     get_cancel_order_url() embeds a _wpnonce; rebuild that URL to make it
 *     tidier and Cancel becomes a no-op that reports nothing.
 *   - all four order hooks still fire, in stock order.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

do_action( 'woocommerce_before_account_orders', $has_orders );

$mts_columns = wc_get_account_orders_columns();

/*
 * The columns the design has a dedicated slot for. Anything else in
 * $mts_columns came from a plugin and is rendered in the expanded panel.
 */
$mts_native_columns = array( 'order-number', 'order-date', 'order-status', 'order-total', 'order-actions' );

/*
 * Woo has one status where Shopify has two (financial + fulfilment), so the
 * Shopify snippet's cancelled/Delivered/Processing mapping is re-expressed
 * against Woo's statuses. The LABEL always comes from wc_get_order_status_name()
 * rather than from this table: it is translated, and it is the only thing that
 * knows the name of a custom status a plugin registered. Unmapped statuses fall
 * through to the bare .tag, which is styled — a modifier on its own is not.
 */
$mts_status_tags = array(
	'completed'  => 'tag--best',
	'processing' => 'tag--sale',
	'on-hold'    => 'tag--processing',
	'pending'    => 'tag--processing',
	'cancelled'  => 'tag--out',
	'refunded'   => 'tag--out',
	'failed'     => 'tag--out',
);
?>

<div class="acct__panel">

	<div class="acct__panel-head">
		<h3><?php esc_html_e( 'Your orders', 'mytapestore' ); ?></h3>
	</div>

	<?php if ( $has_orders ) : ?>

		<div class="acct-orders">
			<?php
			foreach ( $customer_orders->orders as $mts_customer_order ) {
				$mts_order = wc_get_order( $mts_customer_order );

				// An order can be trashed between the query and this loop.
				if ( ! $mts_order instanceof WC_Order ) {
					continue;
				}

				$mts_item_count = $mts_order->get_item_count() - $mts_order->get_item_count_refunded();
				$mts_created    = $mts_order->get_date_created();
				$mts_tag_class  = $mts_status_tags[ $mts_order->get_status() ] ?? '';

				/*
				 * A plugin bound to woocommerce_my_account_my_orders_column_{id}
				 * REPLACES that cell in stock Woo. Capturing the hook's output up
				 * front lets the design slots below honour that without losing the
				 * slot's layout. Columns with no listener are absent from this array
				 * and fall through to the default rendering.
				 */
				$mts_cells = array();
				foreach ( $mts_columns as $mts_column_id => $mts_column_name ) {
					if ( ! has_action( 'woocommerce_my_account_my_orders_column_' . $mts_column_id ) ) {
						continue;
					}
					ob_start();
					do_action( 'woocommerce_my_account_my_orders_column_' . $mts_column_id, $mts_order );
					$mts_cells[ $mts_column_id ] = trim( (string) ob_get_clean() );
				}
				?>
				<details class="acct-order woocommerce-orders-table__row woocommerce-orders-table__row--status-<?php echo esc_attr( $mts_order->get_status() ); ?> order">

					<summary class="acct-order__row">
						<span class="acct-order__id num">
							<?php
							if ( isset( $mts_cells['order-number'] ) ) {
								echo wp_kses_post( $mts_cells['order-number'] );
							} else {
								echo esc_html( _x( '#', 'hash before order number', 'mytapestore' ) . $mts_order->get_order_number() );
							}
							?>
						</span>

						<?php
						/*
						 * The empty third branch is not defensive noise: get_date_created()
						 * is nullable on imported and legacy orders, ->date() on null is a
						 * fatal in PHP 8, and stock Woo calls it unguarded — so one bad row
						 * takes the entire order history down instead of losing one date.
						 * The empty <span> keeps the five grid tracks filled.
						 */
						?>
						<?php if ( isset( $mts_cells['order-date'] ) ) : ?>
							<span class="acct-order__date"><?php echo wp_kses_post( $mts_cells['order-date'] ); ?></span>
						<?php elseif ( $mts_created ) : ?>
							<time class="acct-order__date" datetime="<?php echo esc_attr( $mts_created->date( 'c' ) ); ?>">
								<?php echo esc_html( wc_format_datetime( $mts_created, 'd M Y' ) ); ?>
							</time>
						<?php else : ?>
							<span class="acct-order__date"></span>
						<?php endif; ?>

						<?php if ( isset( $mts_cells['order-status'] ) ) : ?>
							<span class="tag"><?php echo wp_kses_post( $mts_cells['order-status'] ); ?></span>
						<?php else : ?>
							<span class="tag <?php echo esc_attr( $mts_tag_class ); ?>">
								<?php echo esc_html( wc_get_order_status_name( $mts_order->get_status() ) ); ?>
							</span>
						<?php endif; ?>

						<span class="acct-order__total num">
							<?php
							/*
							 * Stock renders "$120.00 for 3 items" here. That does not fit a
							 * 90px column, and the design puts the count inside the panel.
							 * get_formatted_order_total() rather than the raw total because
							 * it is what carries the struck-through original on a partially
							 * refunded order.
							 */
							if ( isset( $mts_cells['order-total'] ) ) {
								echo wp_kses_post( $mts_cells['order-total'] );
							} else {
								echo wp_kses_post( $mts_order->get_formatted_order_total() );
							}
							?>
						</span>

						<?php mts_the_icon( 'chevronDown', 16, 'acct-order__chev' ); ?>
					</summary>

					<div class="acct-order__detail">

						<?php
						$mts_items = $mts_order->get_items();
						if ( $mts_items ) :
							?>
							<ul class="acct-order__items">
								<?php
								foreach ( $mts_items as $mts_item ) {
									$mts_product = $mts_item->get_product();

									/*
									 * Same call Woo's own order/order-details-item.php makes,
									 * filter included. A product can be out of the catalogue,
									 * private or deleted by the time someone re-reads an old
									 * order, and is_visible() is what stops the name becoming
									 * a link into a 404.
									 */
									$mts_permalink = apply_filters(
										'woocommerce_order_item_permalink',
										( $mts_product && $mts_product->is_visible() ) ? $mts_product->get_permalink( $mts_item ) : '',
										$mts_item,
										$mts_order
									);
									?>
									<li>
										<?php
										/*
										 * .acct-order__items img is styled (border, radius,
										 * object-fit) but carries no width — the Shopify port
										 * never rendered thumbnails because Liquid has no line
										 * items on the account object. WooCommerce does, so the
										 * width/height attributes size it here rather than
										 * letting a 100px gallery thumbnail set the row height.
										 */
										if ( $mts_product ) {
											echo wp_kses_post( $mts_product->get_image(
												'woocommerce_gallery_thumbnail',
												array(
													'width'   => '44',
													'height'  => '44',
													'loading' => 'lazy',
												)
											) );
										}

										// woocommerce_order_item_name is what bundle and
										// subscription plugins use to append their own line
										// under the product name; the value is HTML by contract.
										$mts_item_name = apply_filters(
											'woocommerce_order_item_name',
											$mts_item->get_name(),
											$mts_item,
											(bool) $mts_permalink
										);

										if ( $mts_permalink ) {
											printf(
												'<a class="acct-order__item-name" href="%s">%s</a>',
												esc_url( $mts_permalink ),
												wp_kses_post( $mts_item_name )
											);
										} else {
											printf(
												'<span class="acct-order__item-name">%s</span>',
												wp_kses_post( $mts_item_name )
											);
										}
										?>
										<span class="acct-order__item-qty num">
											&times;&nbsp;<?php echo esc_html( number_format_i18n( (float) $mts_item->get_quantity() ) ); ?>
										</span>
									</li>
									<?php
								}
								?>
							</ul>
						<?php endif; ?>

						<dl class="cart__sum-rows acct__form">
							<div>
								<dt><?php esc_html_e( 'Items', 'mytapestore' ); ?></dt>
								<dd class="num"><?php echo esc_html( number_format_i18n( $mts_item_count ) ); ?></dd>
							</div>

							<?php if ( $mts_order->get_payment_method_title() ) : ?>
								<div>
									<dt><?php esc_html_e( 'Payment', 'mytapestore' ); ?></dt>
									<dd><?php echo esc_html( $mts_order->get_payment_method_title() ); ?></dd>
								</div>
							<?php endif; ?>

							<?php
							/*
							 * Plugin columns. The design's row has exactly five grid tracks,
							 * so a sixth column cannot go up there without breaking the
							 * layout for every order — but dropping it would take a store's
							 * tracking number or invoice link off the page entirely, which
							 * is the failure nobody notices until a customer asks where
							 * their tracking went.
							 */
							foreach ( $mts_columns as $mts_column_id => $mts_column_name ) :
								if ( in_array( $mts_column_id, $mts_native_columns, true ) || empty( $mts_cells[ $mts_column_id ] ) ) {
									continue;
								}
								?>
								<div>
									<dt><?php echo esc_html( $mts_column_name ); ?></dt>
									<dd><?php echo wp_kses_post( $mts_cells[ $mts_column_id ] ); ?></dd>
								</div>
							<?php endforeach; ?>
						</dl>

						<?php
						/*
						 * Actions. 'pay' is absent unless the order needs payment and
						 * 'cancel' unless the status allows it, so these are never
						 * rendered unconditionally. $action['url'] is echoed exactly as
						 * given — the cancel URL is nonce-signed and the pay URL carries
						 * the order key.
						 *
						 * If a plugin has taken over the order-actions column, its markup
						 * replaces the buttons rather than sitting beside them, which is
						 * what stock does.
						 */
						if ( isset( $mts_cells['order-actions'] ) ) {
							echo '<div class="acct__form-actions">' . wp_kses_post( $mts_cells['order-actions'] ) . '</div>';
						} else {
							$mts_actions = wc_get_account_orders_actions( $mts_order );

							if ( $mts_actions ) {
								echo '<div class="acct__form-actions">';
								foreach ( $mts_actions as $mts_key => $mts_action ) {
									$mts_aria = empty( $mts_action['aria-label'] )
										? sprintf(
											/* translators: 1: action name, 2: order number */
											__( '%1$s order number %2$s', 'mytapestore' ),
											$mts_action['name'],
											$mts_order->get_order_number()
										)
										: $mts_action['aria-label'];

									printf(
										'<a href="%1$s" class="btn %2$s woocommerce-button%3$s button %4$s" aria-label="%5$s">%6$s</a>',
										esc_url( $mts_action['url'] ),
										esc_attr( 'pay' === $mts_key ? 'btn--brand' : 'btn--ghost' ),
										esc_attr( $wp_button_class ),
										esc_attr( sanitize_html_class( $mts_key ) ),
										esc_attr( $mts_aria ),
										esc_html( $mts_action['name'] )
									);
								}
								echo '</div>';
							}
						}
						?>
					</div>
				</details>
				<?php
			}
			?>
		</div>

		<?php do_action( 'woocommerce_before_account_orders_pagination' ); ?>

		<?php if ( 1 < (int) $customer_orders->max_num_pages ) : ?>
			<?php
			/*
			 * Stock ships prev/next only (.woocommerce-pagination--without-numbers).
			 * The design's pager has numbers, and $customer_orders->max_num_pages is
			 * already here, so the numbers are built rather than thrown away — a
			 * customer on page 1 of nine otherwise has to click Next eight times to
			 * reach their oldest order.
			 *
			 * Every href is wc_get_endpoint_url( 'orders', $n ): the endpoint slug is
			 * translatable and renameable in WooCommerce → Advanced, so a
			 * hand-written /my-account/orders/2/ is a 404 on any store that touched
			 * those settings.
			 */
			$mts_total_pages = (int) $customer_orders->max_num_pages;
			$mts_current     = max( 1, (int) $current_page );

			// First, last and the pages either side of the current one; everything
			// else collapses into a single gap marker.
			$mts_parts = array();
			for ( $mts_page = 1; $mts_page <= $mts_total_pages; $mts_page++ ) {
				if ( 1 === $mts_page || $mts_total_pages === $mts_page || abs( $mts_page - $mts_current ) <= 1 ) {
					$mts_parts[] = $mts_page;
				} elseif ( '' !== end( $mts_parts ) ) {
					$mts_parts[] = '';
				}
			}
			?>
			<nav class="mts-pager woocommerce-pagination" aria-label="<?php esc_attr_e( 'Orders pagination', 'mytapestore' ); ?>">

				<?php if ( 1 < $mts_current ) : ?>
					<a class="mts-pager__step woocommerce-button--previous" rel="prev"
					   href="<?php echo esc_url( wc_get_endpoint_url( 'orders', $mts_current - 1 ) ); ?>">
						<?php mts_the_icon( 'chevronRight', 15, 'mts-pager__back' ); ?>
						<?php esc_html_e( 'Previous', 'mytapestore' ); ?>
					</a>
				<?php else : ?>
					<span class="mts-pager__step is-disabled">
						<?php mts_the_icon( 'chevronRight', 15, 'mts-pager__back' ); ?>
						<?php esc_html_e( 'Previous', 'mytapestore' ); ?>
					</span>
				<?php endif; ?>

				<ol class="mts-pager__list">
					<?php foreach ( $mts_parts as $mts_part ) : ?>
						<li>
							<?php if ( '' === $mts_part ) : ?>
								<span class="mts-pager__gap">&hellip;</span>
							<?php elseif ( $mts_part === $mts_current ) : ?>
								<span class="mts-pager__num num is-current" aria-current="page"><?php echo esc_html( number_format_i18n( $mts_part ) ); ?></span>
							<?php else : ?>
								<a class="mts-pager__num num" href="<?php echo esc_url( wc_get_endpoint_url( 'orders', $mts_part ) ); ?>"
								   aria-label="<?php
									echo esc_attr( sprintf(
										/* translators: %s: page number */
										__( 'Page %s', 'mytapestore' ),
										number_format_i18n( $mts_part )
									) );
									?>"><?php echo esc_html( number_format_i18n( $mts_part ) ); ?></a>
							<?php endif; ?>
						</li>
					<?php endforeach; ?>
				</ol>

				<?php if ( $mts_current < $mts_total_pages ) : ?>
					<a class="mts-pager__step woocommerce-button--next" rel="next"
					   href="<?php echo esc_url( wc_get_endpoint_url( 'orders', $mts_current + 1 ) ); ?>">
						<?php esc_html_e( 'Next', 'mytapestore' ); ?>
						<?php mts_the_icon( 'chevronRight', 15 ); ?>
					</a>
				<?php else : ?>
					<span class="mts-pager__step is-disabled">
						<?php esc_html_e( 'Next', 'mytapestore' ); ?>
						<?php mts_the_icon( 'chevronRight', 15 ); ?>
					</span>
				<?php endif; ?>

			</nav>
		<?php endif; ?>

	<?php else : ?>

		<?php
		/*
		 * Stock puts this through wc_print_notice(), which renders a
		 * .woocommerce-info banner — the same treatment an error gets. Having no
		 * orders yet is not a problem to report, and the design has a real empty
		 * state for it. The redirect filter is kept: "return to shop" is what
		 * wholesale and B2B plugins repoint at a gated catalogue, and a hardcoded
		 * shop link sends those customers to a page they cannot see.
		 */
		?>
		<div class="col__empty">
			<?php mts_the_icon( 'layers', 34 ); ?>
			<p><?php esc_html_e( 'No orders yet — once you place one, it’ll show up here.', 'mytapestore' ); ?></p>
			<a class="btn btn--brand btn--lg" href="<?php echo esc_url( apply_filters( 'woocommerce_return_to_shop_redirect', wc_get_page_permalink( 'shop' ) ) ); ?>">
				<?php esc_html_e( 'Start shopping', 'mytapestore' ); ?>
				<?php mts_the_icon( 'arrowRight', 18 ); ?>
			</a>
		</div>

	<?php endif; ?>

</div>

<?php do_action( 'woocommerce_after_account_orders', $has_orders ); ?>
