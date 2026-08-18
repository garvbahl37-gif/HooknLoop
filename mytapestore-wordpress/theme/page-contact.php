<?php
/**
 * Template Name: Contact
 *
 * The Shopify contact section (sections/mts-contact.liquid), node for node:
 * page hero, a contact card of real details on the left, and a working form on
 * the right.
 *
 * WooCommerce has no contact form, and the one this page used to carry was a
 * pasted copy of Contact Form 7's output for a plugin that is not installed —
 * no <form>, empty field wrappers, a stray textarea. So the store's contact page
 * offered no way to contact the store. inc/contact-form.php is the handler.
 *
 * Any content authored on the page itself still renders beneath, so the existing
 * copy is not thrown away.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

get_header();

$mts_contact = mts_contact();
$mts_status  = mts_contact_status();

while ( have_posts() ) :
	the_post();
	?>

	<main id="main">

		<div class="wrap page__crumbs">
			<?php
			get_template_part( 'template-parts/breadcrumbs', null, array(
				'items' => array(
					array( 'label' => __( 'Home', 'mytapestore' ), 'href' => home_url( '/' ) ),
					array( 'label' => get_the_title() ),
				),
			) );
			?>
		</div>

		<section class="page-hero">
			<div class="wrap">
				<span class="eyebrow eyebrow--onink"><?php esc_html_e( 'We are here to help', 'mytapestore' ); ?></span>
				<h1><?php the_title(); ?></h1>
				<p><?php esc_html_e( 'Questions about a product, a bulk order or a delivery? Talk to someone who knows the range.', 'mytapestore' ); ?></p>
			</div>
		</section>

		<div class="wrap contact">

			<div class="contact__info">
				<ul>
					<?php if ( $mts_contact['phone'] ) : ?>
						<li>
							<span class="contact__ic"><?php mts_the_icon( 'phone', 20 ); ?></span>
							<div>
								<b><?php esc_html_e( 'Phone', 'mytapestore' ); ?></b>
								<a href="tel:<?php echo esc_attr( $mts_contact['phone_href'] ); ?>"><?php echo esc_html( $mts_contact['phone'] ); ?></a>
							</div>
						</li>
					<?php endif; ?>

					<?php if ( $mts_contact['email'] ) : ?>
						<li>
							<span class="contact__ic"><?php mts_the_icon( 'mail', 20 ); ?></span>
							<div>
								<b><?php esc_html_e( 'Email', 'mytapestore' ); ?></b>
								<a href="mailto:<?php echo esc_attr( $mts_contact['email'] ); ?>"><?php echo esc_html( $mts_contact['email'] ); ?></a>
							</div>
						</li>
					<?php endif; ?>

					<?php if ( $mts_contact['abn'] ) : ?>
						<li>
							<span class="contact__ic"><?php mts_the_icon( 'shieldCheck', 20 ); ?></span>
							<div>
								<b><?php esc_html_e( 'Business', 'mytapestore' ); ?></b>
								<span class="num">
									<?php
									printf(
										/* translators: %s: ABN */
										esc_html__( 'ABN %s · Australian owned', 'mytapestore' ),
										esc_html( $mts_contact['abn'] )
									);
									?>
								</span>
							</div>
						</li>
					<?php endif; ?>
				</ul>

				<div class="contact__ship">
					<?php mts_the_icon( 'truck', 20 ); ?>
					<p><?php esc_html_e( 'Orders are dispatched from our Australian warehouse in 1–2 business days, to over 3,600 postcodes.', 'mytapestore' ); ?></p>
				</div>
			</div>

			<form class="contact__form" id="contact-form" method="post" action="<?php echo esc_url( get_permalink() ); ?>">
				<h2><?php esc_html_e( 'Send us a message', 'mytapestore' ); ?></h2>

				<?php if ( 'sent' === $mts_status ) : ?>
					<div class="contact__sent" role="status">
						<?php mts_the_icon( 'check', 22 ); ?>
						<div>
							<b><?php esc_html_e( 'Thanks — message received.', 'mytapestore' ); ?></b>
							<span><?php esc_html_e( 'Our team will get back to you within one business day.', 'mytapestore' ); ?></span>
						</div>
					</div>
				<?php else : ?>

					<?php if ( $mts_status ) : ?>
						<div class="contact__sent contact__sent--error" role="alert">
							<?php mts_the_icon( 'close', 22 ); ?>
							<div>
								<b><?php esc_html_e( "That didn't send.", 'mytapestore' ); ?></b>
								<span>
									<?php
									echo 'invalid' === $mts_status
										? esc_html__( 'Please give us a name, a valid email address and a message.', 'mytapestore' )
										: esc_html__( 'Please try again.', 'mytapestore' );
									?>
								</span>
							</div>
						</div>
					<?php endif; ?>

					<div class="contact__row">
						<label>
							<?php esc_html_e( 'Name', 'mytapestore' ); ?>
							<input type="text" name="mts_contact_name" required autocomplete="name"
								   placeholder="<?php esc_attr_e( 'Your name', 'mytapestore' ); ?>">
						</label>
						<label>
							<?php esc_html_e( 'Email', 'mytapestore' ); ?>
							<input type="email" name="mts_contact_email" required autocomplete="email"
								   placeholder="<?php esc_attr_e( 'you@email.com', 'mytapestore' ); ?>">
						</label>
					</div>

					<label>
						<?php esc_html_e( 'Subject', 'mytapestore' ); ?>
						<input type="text" name="mts_contact_subject"
							   placeholder="<?php esc_attr_e( "What's it about?", 'mytapestore' ); ?>">
					</label>

					<label>
						<?php esc_html_e( 'Message', 'mytapestore' ); ?>
						<textarea name="mts_contact_message" rows="5" required
								  placeholder="<?php esc_attr_e( 'How can we help?', 'mytapestore' ); ?>"></textarea>
					</label>

					<?php
					/*
					 * The honeypot. Hidden from people, irresistible to bots.
					 * aria-hidden and tabindex="-1" keep it out of the keyboard
					 * order and the accessibility tree, so a screen-reader user is
					 * never asked to fill in a trap.
					 */
					?>
					<div class="screen-reader-text" aria-hidden="true">
						<label>
							<?php esc_html_e( 'Leave this field empty', 'mytapestore' ); ?>
							<input type="text" name="mts_website" tabindex="-1" autocomplete="off">
						</label>
					</div>

					<?php wp_nonce_field( 'mts_contact', 'mts_contact_nonce' ); ?>

					<button class="btn btn--brand btn--lg" type="submit" name="mts_contact_submit" value="1">
						<?php esc_html_e( 'Send message', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 18 ); ?>
					</button>
				<?php endif; ?>
			</form>
		</div>

		<?php
		/*
		 * Any real copy authored on the page still renders beneath the contact
		 * card — but the test has to be run on the FILTERED content, not the raw
		 * post_content.
		 *
		 * This page's stored body is nothing but Kapee page-builder blocks
		 * ("Send Us Message", "Get In Touch", "Our Office", "Working Hours"),
		 * which inc/imported-content.php removes: they are unstyled here, their
		 * FontAwesome icons do not load, and they repeat the phone and email the
		 * card above already shows. `trim( get_the_content() )` sees that raw
		 * markup, calls it content, and prints an empty section — 100px of blank
		 * page below the form.
		 */
		$mts_body = trim( apply_filters( 'the_content', get_the_content() ) );
		?>
		<?php if ( '' !== wp_strip_all_tags( $mts_body ) ) : ?>
			<section class="section">
				<div class="wrap">
					<article class="page-prose">
						<?php echo wp_kses_post( $mts_body ); ?>
					</article>
				</div>
			</section>
		<?php endif; ?>

	</main>

	<?php
endwhile;

get_footer();
