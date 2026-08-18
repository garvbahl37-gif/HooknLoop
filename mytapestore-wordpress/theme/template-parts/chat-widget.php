<?php
/**
 * Floating chat assistant — bottom RIGHT.
 *
 * Port of src/components/ChatWidget.jsx: a launcher with an unread ping, a
 * dismissible teaser, and a panel with quick-reply chips.
 *
 * This is a guided helper, not a live agent: it answers from a fixed script of
 * store facts (delivery, bulk pricing, returns, contact) and hands off to a
 * human for anything else. That is deliberate — an assistant that invents an
 * answer about delivery times or discounts on a trade store creates a promise
 * somebody then has to honour.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_contact = mts_contact();

$mts_quick = apply_filters( 'mts_chat_quick_replies', array(
	array(
		'q' => __( 'How fast is delivery?', 'mytapestore' ),
		'a' => __( 'We dispatch in 1–2 business days to over 3,600 Australian postcodes. Most orders arrive within 2–3 business days after dispatch, and express is available at checkout.', 'mytapestore' ),
	),
	array(
		'q' => __( 'Do you offer bulk pricing?', 'mytapestore' ),
		'a' => __( 'Yes — volume discounts apply automatically at checkout, and larger quantities show their price break on the product page. For pallet quantities, contact us for a quote.', 'mytapestore' ),
	),
	array(
		'q' => __( 'Which tape should I use?', 'mytapestore' ),
		'a' => __( 'Tell us the surface and the conditions and we will point you at the right line. Our industry pages group tapes by trade if you would rather browse.', 'mytapestore' ),
	),
	array(
		'q' => __( 'Can I return an item?', 'mytapestore' ),
		'a' => __( 'Unopened stock can be returned — see our Return & Exchange Policy for the details and timeframes.', 'mytapestore' ),
	),
) );
?>
<div class="chatw" data-mts-chat>

	<button class="chatw__teaser" type="button" data-mts-chat-teaser>
		<?php esc_html_e( 'Need help choosing a tape?', 'mytapestore' ); ?>
		<span class="chatw__teaser-x" data-mts-chat-teaser-close
			  role="button" tabindex="0"
			  aria-label="<?php esc_attr_e( 'Dismiss', 'mytapestore' ); ?>">
			<?php mts_the_icon( 'close', 13 ); ?>
		</span>
	</button>

	<button class="chatw__launch" type="button" data-mts-chat-launch
			aria-expanded="false" aria-controls="mts-chat-panel"
			aria-label="<?php esc_attr_e( 'Open chat', 'mytapestore' ); ?>">
		<?php mts_the_icon( 'chat', 24 ); ?>
		<span class="chatw__ping" data-mts-chat-ping aria-hidden="true"></span>
	</button>

	<div class="chatw__panel" id="mts-chat-panel" data-mts-chat-panel role="dialog"
		 aria-label="<?php esc_attr_e( 'Chat with My Tape Store', 'mytapestore' ); ?>" hidden>

		<div class="chatw__head">
			<span class="chatw__avatar" aria-hidden="true"><?php mts_the_icon( 'spool', 20 ); ?></span>
			<span class="chatw__head-info">
				<b><?php esc_html_e( 'My Tape Store', 'mytapestore' ); ?></b>
				<?php
				/*
				 * Trading hours used to sit here, and they were the wrong thing to
				 * say. This box answers at 2am as readily as at 2pm, so printing
				 * "Mon–Fri, 9am–5pm" next to a live assistant reads as "closed" and
				 * discourages the very question the widget exists to take.
				 *
				 * What replaces it is what the box actually is. Being plain about
				 * that is also what makes the generated-answer disclaimer below
				 * land as honesty rather than as small print.
				 */
				?>
				<em><?php esc_html_e( 'Product assistant', 'mytapestore' ); ?></em>
			</span>
			<button class="chatw__close" type="button" data-mts-chat-close
					aria-label="<?php esc_attr_e( 'Close chat', 'mytapestore' ); ?>">
				<?php mts_the_icon( 'close', 18 ); ?>
			</button>
		</div>

		<div class="chatw__list" data-mts-chat-list role="log" aria-live="polite">
			<div class="chatw__row chatw__row--bot">
				<span class="chatw__msg"><?php esc_html_e( 'Hi! Ask us anything about tapes, delivery or bulk pricing.', 'mytapestore' ); ?></span>
			</div>
		</div>

		<div class="chatw__quick" data-mts-chat-quick>
			<?php foreach ( $mts_quick as $mts_i => $mts_item ) : ?>
				<button type="button" data-mts-chat-q="<?php echo esc_attr( (string) $mts_i ); ?>"
						data-answer="<?php echo esc_attr( $mts_item['a'] ); ?>">
					<?php echo esc_html( $mts_item['q'] ); ?>
				</button>
			<?php endforeach; ?>
		</div>

		<?php
		/*
		 * THE ASK BOX IS ALWAYS PRESENT.
		 *
		 * It used to render only when a Groq key was configured, on the reasoning
		 * that without one the field would answer everything with the same line.
		 * That was wrong twice over.
		 *
		 * It is wrong about the behaviour: mts_chat_reply() falls through to
		 * mts_chat_fallback(), which keyword-matches the question and returns the
		 * store's real answers on delivery, bulk pricing and returns, plus links
		 * to whatever products matched. That is a useful reply, not a shrug.
		 *
		 * And it is wrong about the experience: a chat panel with no way to type
		 * is not a degraded chat panel, it is a broken one. On the hosted preview
		 * — which carries no key, deliberately — the box simply vanished and the
		 * widget looked half-built.
		 */
		?>
			<form class="chatw__ask" data-mts-chat-form>
				<label class="screen-reader-text" for="mts-chat-input">
					<?php esc_html_e( 'Ask about a tape', 'mytapestore' ); ?>
				</label>
				<input type="text" id="mts-chat-input" name="message" autocomplete="off"
					   maxlength="500" data-mts-chat-input
					   placeholder="<?php esc_attr_e( 'Ask about a tape…', 'mytapestore' ); ?>">
				<button type="submit" data-mts-chat-send
						aria-label="<?php esc_attr_e( 'Send', 'mytapestore' ); ?>">
					<?php mts_the_icon( 'arrowRight', 16 ); ?>
				</button>
			</form>
			<?php
			/*
			 * Stated, not buried — but only when it is TRUE.
			 *
			 * With a key the replies are model-generated and a trade buyer
			 * choosing a tape for a real job is entitled to know that before
			 * acting on one. Without a key they are the store's own scripted
			 * answers, and calling those "generated and can be wrong" would be
			 * both inaccurate and needlessly undermining. So the notice follows
			 * the key, while the box that produces the answers does not.
			 */
			if ( function_exists( 'mts_chat_enabled' ) && mts_chat_enabled() ) :
				?>
				<p class="chatw__disclaimer">
					<?php esc_html_e( 'Answers are generated and can be wrong — please don’t share personal or payment details.', 'mytapestore' ); ?>
				</p>
			<?php endif; ?>

		<div class="chatw__form">
			<a class="chatw__cta" href="<?php echo esc_url( home_url( '/contact-us/' ) ); ?>">
				<?php esc_html_e( 'Talk to a person', 'mytapestore' ); ?> <?php mts_the_icon( 'arrowRight', 15 ); ?>
			</a>
			<?php if ( ! empty( $mts_contact['phone'] ) ) : ?>
				<a class="chatw__cta" href="tel:<?php echo esc_attr( $mts_contact['phone_href'] ); ?>">
					<?php mts_the_icon( 'phone', 15 ); ?> <?php echo esc_html( $mts_contact['phone'] ); ?>
				</a>
			<?php endif; ?>
		</div>
	</div>
</div>
