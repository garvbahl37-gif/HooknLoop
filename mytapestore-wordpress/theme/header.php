<?php
/**
 * Site header — ported from mytapestore-redesign/src/components/Header.jsx
 * via the Shopify theme's mts-header section.
 *
 * Three bands: the red utility strip, the sticky masthead (logo / search /
 * actions) and the mega-nav — plus the mobile drawer.
 *
 * The burger is a DIRECT child of the masthead row, before the logo, so on a
 * phone it sits hard left where a thumb expects it. It is deliberately NOT
 * inside .hd-actions: CSS `order` can only move an item within its own flex
 * container, so from there it stayed right of the logo and dropped onto a
 * second line once the row wrapped. Position in the DOM is the fix.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_roots      = mts_menu_tree( 'primary' );
$mts_last_wide  = mts_last_wide_index( $mts_roots );
$mts_cart_count = mts_cart_count();

/**
 * The red utility strip's trust features.
 *
 * Shopify exposed these as editable blocks. Here they are a filtered array —
 * a site owner changes them in one place rather than through a settings UI the
 * theme would otherwise have to build and maintain.
 */
$mts_features = apply_filters( 'mts_header_features', array(
	array( 'art' => 'img/icons/fast-delivery.svg',  'icon' => 'truck',       'text' => __( 'Fast delivery across Australia', 'mytapestore' ) ),
	array( 'art' => 'img/icons/secure-payment.svg', 'icon' => 'shieldCheck', 'text' => __( 'Secure checkout', 'mytapestore' ) ),
	array( 'art' => 'img/icons/price.svg',          'icon' => 'medal',       'text' => __( 'Lowest-price guarantee', 'mytapestore' ) ),
	array( 'art' => 'img/icons/flag-australia.svg', 'icon' => 'australia',   'text' => __( 'Australian owned', 'mytapestore' ) ),
) );
?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="profile" href="https://gmpg.org/xfn/11">
	<?php wp_head(); ?>
</head>

<body <?php body_class( 'mts' ); ?>>
<?php wp_body_open(); ?>

<a class="mts-skip-link" href="#main"><?php esc_html_e( 'Skip to content', 'mytapestore' ); ?></a>

<header class="hd">

	<?php if ( $mts_features ) : ?>
		<div class="hd-util grain">
			<div class="wrap hd-util__row">
				<?php
				/*
				 * ON A PHONE THIS SCROLLS. On desktop it is the same centred row it
				 * has always been.
				 *
				 * Four trust lines do not fit across a 390px screen, so they wrapped
				 * onto four stacked rows — ninety pixels of red band above the logo
				 * before any content. The previous answer was to hide items three and
				 * four below 900px, which meant a phone never saw "Lowest-price
				 * guarantee" or "Australian owned" at all.
				 *
				 * A marquee shows all four in the height of one.
				 *
				 * THE LIST IS RENDERED TWICE. A single list animated to -100% snaps
				 * back to a visible gap at the end of every cycle; with an identical
				 * copy behind it, the moment the first list has fully left is the
				 * moment the copy sits exactly where the first began, so the loop has
				 * no seam. The copy is aria-hidden — it is the same four sentences,
				 * and a screen reader should hear them once.
				 */
				$mts_render_feats = static function ( array $features, bool $clone ) {
					?>
					<ul class="hd-util__feats<?php echo $clone ? ' hd-util__feats--clone' : ''; ?>"
						<?php echo $clone ? 'aria-hidden="true"' : ''; ?>>
						<?php foreach ( $features as $i => $feature ) : ?>
							<?php
							/*
							 * The strip uses the packaged full-colour artwork, not the line
							 * icon set. That is a property of the FILES, not a preference:
							 * these are illustrations (a red truck, the Australian flag, a
							 * best-price badge) and rendering them as single-colour glyphs
							 * would turn the flag into a white silhouette. The line icon is
							 * kept only as a fallback for a missing file.
							 */
							$mts_art = mts_asset( $feature['art'] ?? '' );
							?>
							<li class="<?php echo 0 === $i ? 'hd-util__lead' : 'hd-util__sep'; ?>">
								<span class="hd-util__ic">
									<?php if ( $mts_art ) : ?>
										<img class="hd-util__ic--colour" src="<?php echo esc_url( $mts_art ); ?>" alt=""
											 width="16" height="16" loading="lazy" decoding="async">
									<?php else : ?>
										<?php mts_the_icon( $feature['icon'], 16 ); ?>
									<?php endif; ?>
								</span>
								<?php echo esc_html( $feature['text'] ); ?>
							</li>
						<?php endforeach; ?>
					</ul>
					<?php
				};
				?>
				<div class="hd-util__marquee">
					<?php $mts_render_feats( $mts_features, false ); ?>
					<?php $mts_render_feats( $mts_features, true ); ?>
				</div>
			</div>
		</div>
	<?php endif; ?>

	<div class="hd-stick">

		<div class="hd-mast">
			<div class="wrap hd-mast__row">

				<button class="hd-burger" data-mts-drawer-open
						aria-label="<?php esc_attr_e( 'Open menu', 'mytapestore' ); ?>"
						aria-expanded="false" aria-controls="mts-drawer">
					<?php mts_the_icon( 'menu', 24 ); ?>
				</button>

				<a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="hd-logo"
				   aria-label="<?php echo esc_attr( get_bloginfo( 'name' ) . ' — ' . __( 'home', 'mytapestore' ) ); ?>">
					<?php if ( has_custom_logo() ) : ?>
						<?php
						$mts_logo_id  = (int) get_theme_mod( 'custom_logo' );
						$mts_logo_src = wp_get_attachment_image_src( $mts_logo_id, 'full' );
						?>
						<img src="<?php echo esc_url( $mts_logo_src[0] ?? '' ); ?>"
							 alt="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>"
							 class="hd-logo__img" width="196" height="34">
					<?php else : ?>
						<?php
						// No custom logo set: fall back to the packaged wordmark the
						// React build ships, so the header is never a bare text link.
						$mts_wordmark = get_stylesheet_directory() . '/assets/img/site/logo.png';
						?>
						<?php if ( file_exists( $mts_wordmark ) ) : ?>
							<img src="<?php echo esc_url( get_stylesheet_directory_uri() . '/assets/img/site/logo.png' ); ?>"
								 alt="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>"
								 class="hd-logo__img" width="196" height="34">
						<?php else : ?>
							<span class="hd-logo__img"><?php bloginfo( 'name' ); ?></span>
						<?php endif; ?>
					<?php endif; ?>
				</a>

				<?php get_template_part( 'template-parts/search-form' ); ?>

				<div class="hd-actions">

					<?php if ( is_user_logged_in() ) : ?>
						<?php $mts_user = wp_get_current_user(); ?>
						<a href="<?php echo esc_url( mts_account_url() ); ?>" class="hd-act hd-act--account is-in"
						   aria-label="<?php echo esc_attr( sprintf( /* translators: %s: user name */ __( 'Account — %s', 'mytapestore' ), $mts_user->first_name ?: $mts_user->user_email ) ); ?>">
							<span class="hd-avatar" aria-hidden="true"><?php echo esc_html( mts_user_initials() ); ?></span>
							<span><?php echo esc_html( $mts_user->first_name ?: __( 'Account', 'mytapestore' ) ); ?></span>
						</a>
					<?php else : ?>
						<a href="<?php echo esc_url( mts_account_url() ); ?>" class="hd-act hd-act--account"
						   aria-label="<?php esc_attr_e( 'Log in', 'mytapestore' ); ?>">
							<?php mts_the_icon( 'user', 22 ); ?><span><?php esc_html_e( 'Account', 'mytapestore' ); ?></span>
						</a>
					<?php endif; ?>

					<a href="<?php echo esc_url( home_url( '/wishlist/' ) ); ?>" class="hd-act hd-act--wish"
					   data-mts-wishlist-link aria-label="<?php esc_attr_e( 'Wishlist', 'mytapestore' ); ?>">
						<span class="hd-act__cart-icon">
							<?php mts_the_icon( 'heart', 22 ); ?>
							<b class="hd-cart-badge num" data-mts-wish-count hidden>0</b>
						</span>
						<span><?php esc_html_e( 'Wishlist', 'mytapestore' ); ?></span>
					</a>

					<a href="<?php echo esc_url( mts_cart_url() ); ?>" class="hd-act hd-act--cart"
					   aria-label="<?php echo esc_attr( sprintf( /* translators: %d: item count */ _n( 'Cart, %d item', 'Cart, %d items', $mts_cart_count, 'mytapestore' ), $mts_cart_count ) ); ?>">
						<span class="hd-act__cart-icon">
							<?php mts_the_icon( 'cart', 22 ); ?>
							<b class="hd-cart-badge num" data-mts-cart-count <?php echo 0 === $mts_cart_count ? 'hidden' : ''; ?>><?php echo esc_html( (string) $mts_cart_count ); ?></b>
						</span>
						<span><?php esc_html_e( 'Cart', 'mytapestore' ); ?></span>
					</a>

				</div>
			</div>
		</div>

		<?php if ( $mts_roots ) : ?>
			<nav class="hd-nav" data-mts-nav aria-label="<?php esc_attr_e( 'Primary', 'mytapestore' ); ?>">
				<div class="wrap hd-nav__row">
					<ul class="hd-nav__list">
						<?php foreach ( $mts_roots as $mts_i => $mts_item ) : ?>
							<?php
							$mts_kids = $mts_item->mts_children;
							$mts_wide = count( $mts_kids ) > MTS_MEGA_COLUMN_THRESHOLD;
							$mts_right = ( $mts_i === $mts_last_wide && $mts_wide );
							$mts_classes = 'hd-nav__item'
								. ( $mts_wide ? ' hd-nav__item--wide' : '' )
								. ( $mts_right ? ' hd-nav__item--right' : '' );
							?>

							<?php if ( $mts_kids ) : ?>
								<li class="<?php echo esc_attr( $mts_classes ); ?>" data-mts-menu>
									<button class="hd-nav__link" aria-expanded="false" data-mts-menu-trigger>
										<?php echo esc_html( $mts_item->title ); ?>
										<?php mts_the_icon( 'chevronDown', 15 ); ?>
									</button>
									<div class="hd-mega" role="menu">
										<div class="hd-mega__cols">
											<?php foreach ( mts_split_columns( $mts_kids, $mts_wide ? 3 : 1 ) as $mts_column ) : ?>
												<ul>
													<?php foreach ( $mts_column as $mts_child ) : ?>
														<li>
															<a href="<?php echo esc_url( $mts_child->url ); ?>" role="menuitem">
																<?php echo esc_html( $mts_child->title ); ?>
															</a>
														</li>
													<?php endforeach; ?>
												</ul>
											<?php endforeach; ?>
										</div>
										<a class="hd-mega__all" href="<?php echo esc_url( $mts_item->url ); ?>">
											<?php
											printf(
												/* translators: %s: menu title, lowercased */
												esc_html__( 'View all %s', 'mytapestore' ),
												esc_html( strtolower( $mts_item->title ) )
											);
											?>
											<?php mts_the_icon( 'arrowRight', 16 ); ?>
										</a>
									</div>
								</li>
							<?php else : ?>
								<li class="hd-nav__item">
									<a class="hd-nav__link" href="<?php echo esc_url( $mts_item->url ); ?>"><?php echo esc_html( $mts_item->title ); ?></a>
								</li>
							<?php endif; ?>

						<?php endforeach; ?>
					</ul>
				</div>
			</nav>
		<?php endif; ?>

	</div>

	<div class="hd-drawer" id="mts-drawer" data-mts-drawer role="dialog" aria-modal="true"
		 aria-label="<?php esc_attr_e( 'Menu', 'mytapestore' ); ?>" hidden>
		<div class="hd-drawer__scrim" data-mts-drawer-close></div>
		<div class="hd-drawer__panel">
			<div class="hd-drawer__top">
				<b><?php esc_html_e( 'Browse', 'mytapestore' ); ?></b>
				<button data-mts-drawer-close aria-label="<?php esc_attr_e( 'Close menu', 'mytapestore' ); ?>">
					<?php mts_the_icon( 'close', 22 ); ?>
				</button>
			</div>
			<div class="hd-drawer__search">
				<?php get_template_part( 'template-parts/search-form', null, array( 'in_drawer' => true ) ); ?>
			</div>
			<nav class="hd-drawer__nav">
				<?php foreach ( $mts_roots as $mts_item ) : ?>
					<?php if ( $mts_item->mts_children ) : ?>
						<div class="hd-drawer__group">
							<button class="hd-drawer__acc" aria-expanded="false" data-mts-acc>
								<?php echo esc_html( $mts_item->title ); ?>
								<span data-mts-acc-icon><?php mts_the_icon( 'plus', 18 ); ?></span>
							</button>
							<ul class="hd-drawer__sub" hidden>
								<?php foreach ( $mts_item->mts_children as $mts_child ) : ?>
									<li><a href="<?php echo esc_url( $mts_child->url ); ?>"><?php echo esc_html( $mts_child->title ); ?></a></li>
								<?php endforeach; ?>
							</ul>
						</div>
					<?php else : ?>
						<a class="hd-drawer__link" href="<?php echo esc_url( $mts_item->url ); ?>"><?php echo esc_html( $mts_item->title ); ?></a>
					<?php endif; ?>
				<?php endforeach; ?>
			</nav>

			<?php
			/*
			 * ACCOUNT, IN THE DRAWER.
			 *
			 * The header keeps its account icon on mobile, but at 22px with no
			 * label beside a heart and a cart it is not something anyone finds
			 * when they are looking for "sign in" or "my orders". The drawer is
			 * where a phone user goes to navigate, and it listed categories and
			 * nothing else — so on a phone the account area was effectively
			 * unreachable.
			 *
			 * Wishlist sits with it because the two belong together: both are
			 * "things I saved or bought", and the wishlist is browser-local, so
			 * it is the one link a signed-out visitor still has something behind.
			 */
			$mts_account_url = function_exists( 'wc_get_page_permalink' )
				? (string) wc_get_page_permalink( 'myaccount' )
				: home_url( '/my-account/' );
			?>
			<div class="hd-drawer__account">
				<a class="hd-drawer__link hd-drawer__link--icon" href="<?php echo esc_url( $mts_account_url ); ?>">
					<?php mts_the_icon( 'user', 18 ); ?>
					<?php echo is_user_logged_in()
						? esc_html__( 'My account', 'mytapestore' )
						: esc_html__( 'Sign in / Register', 'mytapestore' ); ?>
				</a>
				<a class="hd-drawer__link hd-drawer__link--icon" href="<?php echo esc_url( home_url( '/wishlist/' ) ); ?>">
					<?php mts_the_icon( 'heart', 18 ); ?>
					<?php esc_html_e( 'Wishlist', 'mytapestore' ); ?>
				</a>
			</div>
		</div>
	</div>

</header>
