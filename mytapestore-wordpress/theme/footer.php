<?php
/**
 * Site footer — ported from mytapestore-redesign/src/components/Footer.jsx
 * via the Shopify theme's mts-footer section.
 *
 * Brand column + three link columns, the newsletter box, then the payment and
 * legal bar.
 *
 * Each column heading is a button INSIDE the h4, not instead of it — the
 * accordion pattern that keeps the document outline intact while making the
 * group tappable. It renders as a plain heading on desktop; phones get the
 * toggle. Panels ship OPEN, so a crawler or a visitor with JS off still sees
 * every link.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_contact = mts_contact();
$mts_socials = mts_socials();

/** The three link columns, each backed by a menu location. */
/*
 * Column headings, matching the Shopify footer. Two of them were wrong:
 * "Industries" and "Customer service" over columns that hold Information and
 * Customer-care links respectively — the heading described the menu that used to
 * be assigned there rather than the one the design puts in that slot.
 */
$mts_footer_columns = apply_filters( 'mts_footer_columns', array(
	'footer-1' => __( 'Shop tapes', 'mytapestore' ),
	'footer-2' => __( 'Information', 'mytapestore' ),
	'footer-3' => __( 'Customer care', 'mytapestore' ),
) );

/*
 * "All products →" under the tape column, as on Shopify. It is not a
 * truncation notice — the column is a hand-picked seven, and this is the way
 * through to the rest of the catalogue.
 */
$mts_footer_more = apply_filters( 'mts_footer_more', array(
	'footer-1' => array(
		'label' => __( 'All products', 'mytapestore' ),
		'url'   => function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/shop/' ),
	),
) );

$mts_logo_light = mts_asset( 'img/site/logo-light.png' );
?>
<?php
/*
 * The trust band belongs to every page, so it is emitted here rather than
 * composed into each template — a new page type cannot then ship without it.
 * It sits outside <footer> because it is page content, not site metadata.
 */
get_template_part( 'template-parts/value-props' );
?>

<footer class="ft grain">

	<div class="wrap ft-main">

		<div class="ft-col ft-col--brand">
			<a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="ft-logo">
				<?php if ( $mts_logo_light ) : ?>
					<img src="<?php echo esc_url( $mts_logo_light ); ?>" alt="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>"
						 class="ft-logo__img" width="188" height="32">
				<?php else : ?>
					<span class="ft-logo__img"><?php bloginfo( 'name' ); ?></span>
				<?php endif; ?>
			</a>

			<p class="ft-blurb"><?php echo wp_kses_post( mts_brand_blurb() ); ?></p>

			<ul class="ft-contact">
				<?php if ( $mts_contact['phone'] ) : ?>
					<li>
						<span class="ft-contact__ic"><?php mts_the_icon( 'phone', 16 ); ?></span>
						<a href="tel:<?php echo esc_attr( $mts_contact['phone_href'] ); ?>"><?php echo esc_html( $mts_contact['phone'] ); ?></a>
					</li>
				<?php endif; ?>
				<?php if ( $mts_contact['email'] ) : ?>
					<li>
						<span class="ft-contact__ic"><?php mts_the_icon( 'mail', 16 ); ?></span>
						<a href="mailto:<?php echo esc_attr( $mts_contact['email'] ); ?>"><?php echo esc_html( $mts_contact['email'] ); ?></a>
					</li>
				<?php endif; ?>
			</ul>

			<?php if ( $mts_socials ) : ?>
				<ul class="ft-social">
					<?php foreach ( $mts_socials as $mts_key => $mts_social ) : ?>
						<li>
							<a href="<?php echo esc_url( $mts_social['url'] ); ?>"
							   aria-label="<?php echo esc_attr( $mts_social['label'] ); ?>"
							   rel="noopener" target="_blank">
								<?php mts_the_icon( $mts_key, 18 ); ?>
							</a>
						</li>
					<?php endforeach; ?>
				</ul>
			<?php endif; ?>
		</div>

		<?php foreach ( $mts_footer_columns as $mts_location => $mts_heading ) : ?>
			<?php
			$mts_items = mts_menu_tree( $mts_location );
			if ( ! $mts_items ) {
				continue;
			}
			?>
			<div class="ft-col">
				<h4>
					<button type="button" class="ft-col__toggle" data-mts-ftacc aria-expanded="true">
						<span><?php echo esc_html( $mts_heading ); ?></span>
						<?php mts_the_icon( 'chevronDown', 18, 'ft-col__chev' ); ?>
					</button>
				</h4>
				<?php
				/*
				 * The menus are printed WHOLE.
				 *
				 * They used to be capped at eight with a "3 more →" link, from
				 * when these locations pointed at full navigation menus (the
				 * category menu alone has 71 entries). scripts/sync-menus.php now
				 * builds them as the curated footer lists Shopify uses — seven,
				 * seven and five items — so a cap has nothing left to cut and the
				 * counter only ever advertised the truncation as a feature.
				 */
				$mts_more = $mts_footer_more[ $mts_location ] ?? null;
				?>
				<ul data-mts-ftpanel>
					<?php foreach ( $mts_items as $mts_item ) : ?>
						<li><a href="<?php echo esc_url( $mts_item->url ); ?>"><?php echo esc_html( $mts_item->title ); ?></a></li>
					<?php endforeach; ?>
					<?php if ( $mts_more ) : ?>
						<li>
							<a class="ft-more" href="<?php echo esc_url( $mts_more['url'] ); ?>">
								<?php echo esc_html( $mts_more['label'] ); ?> &rarr;
							</a>
						</li>
					<?php endif; ?>
				</ul>
			</div>
		<?php endforeach; ?>

	</div>

	<div class="ft-signup">
		<div class="wrap">
			<div class="ft-signup__box">
				<div class="ft-signup__copy">
					<span class="ft-signup__badge"><?php mts_the_icon( 'mail', 14 ); ?> <?php esc_html_e( 'Newsletter', 'mytapestore' ); ?></span>
					<p class="ft-signup__title"><?php esc_html_e( 'Trade tips &amp; tape deals — no spam.', 'mytapestore' ); ?></p>
				</div>
				<?php
				/**
				 * The signup form.
				 *
				 * Left as a plain POST rather than wired to a provider: the live
				 * store runs both Klaviyo and Noptin, and which one owns the list
				 * is a decision for the cutover, not for the theme. Filter
				 * `mts_newsletter_form` to swap in the provider's own markup.
				 */
				$mts_form = apply_filters( 'mts_newsletter_form', '' );

				if ( $mts_form ) {
					echo $mts_form; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- provider markup, filtered in deliberately.
				} else {
					?>
					<?php $mts_news_status = mts_newsletter_status(); ?>
					<?php if ( 'ok' === $mts_news_status ) : ?>
						<?php
						/*
						 * The confirmation replaces the form rather than sitting
						 * above it: leaving an empty field under "You're on the
						 * list" invites the same person to subscribe twice.
						 */
						?>
						<p class="ft-signup__done" id="newsletter" role="status">
							<?php mts_the_icon( 'check', 16 ); ?> <?php echo esc_html( mts_newsletter_message() ); ?>
						</p>
					<?php else : ?>
						<form class="ft-signup__form" id="newsletter" method="post" action="<?php echo esc_url( home_url( '/' ) ); ?>">
							<label class="screen-reader-text" for="mts-newsletter-email">
								<?php esc_html_e( 'Email address', 'mytapestore' ); ?>
							</label>
							<input id="mts-newsletter-email" type="email" name="mts_newsletter_email" required
								   autocomplete="email"
								   placeholder="<?php esc_attr_e( 'you@company.com.au', 'mytapestore' ); ?>">
							<input type="hidden" name="mts_newsletter_source" value="footer">
							<?php wp_nonce_field( 'mts_newsletter', 'mts_newsletter_nonce' ); ?>
							<button class="btn btn--brand" type="submit"><?php esc_html_e( 'Subscribe', 'mytapestore' ); ?></button>
						</form>
						<?php if ( $mts_news_status ) : ?>
							<p class="ft-signup__error" role="alert"><?php echo esc_html( mts_newsletter_message() ); ?></p>
						<?php endif; ?>
					<?php endif; ?>
					<?php
				}
				?>
			</div>
		</div>
	</div>

	<div class="ft-bottom">
		<div class="wrap ft-bottom__row">
			<p class="num">
				<?php
				printf(
					/* translators: 1: site name, 2: year */
					esc_html__( '%1$s © %2$s · All rights reserved', 'mytapestore' ),
					esc_html( get_bloginfo( 'name' ) ),
					esc_html( wp_date( 'Y' ) )
				);
				if ( $mts_contact['abn'] ) {
					printf( ' · %s %s', esc_html__( 'ABN', 'mytapestore' ), esc_html( $mts_contact['abn'] ) );
				}
				?>
			</p>

			<div class="ft-pay__marks">
				<?php foreach ( array( 'visa', 'mastercard', 'amex', 'paypal', 'shop-pay', 'discover' ) as $mts_mark ) : ?>
					<?php $mts_mark_src = mts_asset( "img/pay/{$mts_mark}.svg" ); ?>
					<?php if ( $mts_mark_src ) : ?>
						<img src="<?php echo esc_url( $mts_mark_src ); ?>" alt="<?php echo esc_attr( $mts_mark ); ?>"
							 width="38" height="24" loading="lazy">
					<?php endif; ?>
				<?php endforeach; ?>
			</div>
		</div>
	</div>

</footer>

<?php
/*
 * Floating widgets, global like the trust band above. App.jsx mounts both
 * at the app root, so they belong here rather than in any one template.
 */
get_template_part( 'template-parts/call-button' );
get_template_part( 'template-parts/chat-widget' );
get_template_part( 'template-parts/newsletter-popup' );

wp_footer();
?>
</body>
</html>
