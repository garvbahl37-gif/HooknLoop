<?php
/**
 * Pagination — the design's pager, on every paged archive.
 *
 * WHAT WAS WRONG
 *
 * This emitted `.pager` / `.pager__list`, and NOTHING in the stylesheet styles
 * those class names — the Shopify theme calls its pager `.mts-pager`. So at the
 * foot of the blog and every collection the numbers rendered as a bare, unstyled
 * <ul>: one item per line, stacked down the page, "1 / 2 / 3 / … / 6 / Next →"
 * running vertically instead of sitting in a row.
 *
 * Now it emits exactly the DOM of snippets/mts-pagination.liquid — same nav,
 * same ol, same class names — so the rule block that already exists for the
 * Shopify store styles this one too, and the two pagers are identical rather
 * than merely similar.
 *
 * WHY THE PARTS ARE BUILT BY HAND
 *
 * paginate_links() returns finished <a class="page-numbers"> strings. Reshaping
 * those into the design's markup means parsing HTML back out of a helper that
 * exists to produce it. The page list is one loop; building it directly gives
 * the prev/next steps their disabled state and the gap its own element, which
 * string-rewriting cannot do reliably.
 *
 * Query args are carried through explicitly so paging never silently drops the
 * visitor's active filters — the single most common way a filtered archive
 * betrays someone on page 2.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

global $wp_query;

$mts_total = (int) ( $wp_query->max_num_pages ?? 1 );
if ( $mts_total < 2 ) {
	return;
}

$mts_current = max( 1, (int) get_query_var( 'paged' ) );

// The visitor's filters, minus the page they are on.
$mts_args = $_GET; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
unset( $mts_args['paged'] );
$mts_args = array_map( 'sanitize_text_field', wp_unslash( $mts_args ) );

/**
 * The URL for a page number, filters intact.
 *
 * get_pagenum_link() is what knows whether this archive pages with /page/2/ or
 * ?paged=2 — that depends on the permalink structure and on which rewrite rule
 * matched, neither of which a template should be guessing at.
 */
$mts_page_url = static function ( int $page ) use ( $mts_args ): string {
	$url = get_pagenum_link( $page, false );
	return $mts_args ? add_query_arg( $mts_args, $url ) : $url;
};

/*
 * First, last, and the pages either side of the current one; everything between
 * collapses into a single gap marker. Same window as the account pager, so the
 * two never disagree about how many numbers a shopper sees.
 */
$mts_parts = array();
for ( $mts_page = 1; $mts_page <= $mts_total; $mts_page++ ) {
	if ( 1 === $mts_page || $mts_total === $mts_page || abs( $mts_page - $mts_current ) <= 1 ) {
		$mts_parts[] = $mts_page;
	} elseif ( '' !== end( $mts_parts ) ) {
		$mts_parts[] = '';
	}
}

$mts_label = $args['label'] ?? __( 'Pagination', 'mytapestore' );
?>
<nav class="mts-pager" aria-label="<?php echo esc_attr( $mts_label ); ?>">

	<?php if ( 1 < $mts_current ) : ?>
		<a class="mts-pager__step" rel="prev" href="<?php echo esc_url( $mts_page_url( $mts_current - 1 ) ); ?>">
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
					<span class="mts-pager__num num is-current" aria-current="page">
						<?php echo esc_html( number_format_i18n( $mts_part ) ); ?>
					</span>
				<?php else : ?>
					<a class="mts-pager__num num" href="<?php echo esc_url( $mts_page_url( $mts_part ) ); ?>"
					   aria-label="<?php
						/* translators: %s: page number */
						echo esc_attr( sprintf( __( 'Page %s', 'mytapestore' ), number_format_i18n( $mts_part ) ) );
						?>">
						<?php echo esc_html( number_format_i18n( $mts_part ) ); ?>
					</a>
				<?php endif; ?>
			</li>
		<?php endforeach; ?>
	</ol>

	<?php if ( $mts_current < $mts_total ) : ?>
		<a class="mts-pager__step" rel="next" href="<?php echo esc_url( $mts_page_url( $mts_current + 1 ) ); ?>">
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
