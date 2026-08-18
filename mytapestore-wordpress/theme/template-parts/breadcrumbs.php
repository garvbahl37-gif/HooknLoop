<?php
/**
 * Breadcrumbs — port of src/components/Breadcrumbs.jsx.
 *
 * The last item is the current page and is never a link, marked aria-current.
 *
 * @param array $args['items'] List of ['label' => string, 'href' => string|null].
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

$mts_items = (array) ( $args['items'] ?? array() );
if ( ! $mts_items ) {
	return;
}

$mts_last = count( $mts_items ) - 1;
?>
<nav class="crumbs" aria-label="<?php esc_attr_e( 'Breadcrumb', 'mytapestore' ); ?>">
	<ol>
		<?php foreach ( $mts_items as $mts_i => $mts_crumb ) : ?>
			<li>
				<?php if ( $mts_i === $mts_last || empty( $mts_crumb['href'] ) ) : ?>
					<span aria-current="page"><?php echo esc_html( $mts_crumb['label'] ); ?></span>
				<?php else : ?>
					<a href="<?php echo esc_url( $mts_crumb['href'] ); ?>"><?php echo esc_html( $mts_crumb['label'] ); ?></a>
				<?php endif; ?>
				<?php if ( $mts_i !== $mts_last ) : ?>
					<?php mts_the_icon( 'chevronRight', 13, 'crumbs__sep' ); ?>
				<?php endif; ?>
			</li>
		<?php endforeach; ?>
	</ol>
</nav>
