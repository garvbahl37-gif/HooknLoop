<?php
/**
 * Category archive — the blog index, filtered to one topic.
 *
 * WHY THIS FILE IS THREE LINES AND NOT A TEMPLATE
 *
 * home.php was already written to render a category: it checks is_category(),
 * swaps the masthead title for single_cat_title(), inserts the topic into the
 * breadcrumb, and marks the matching topic chip as current. Every one of those
 * branches was live code that could never run.
 *
 * The reason is the template hierarchy, not the markup. WordPress uses home.php
 * for the posts index ONLY. A category archive resolves
 *
 *     category-{slug}.php -> category-{id}.php -> category.php -> archive.php
 *     -> index.php
 *
 * and this theme had none of the first four — so /blog/category/blog/ fell all
 * the way through to index.php, the bare "not yet ported" fallback. That
 * template emits .mts-entry markup which the stylesheet has no rules for, so the
 * page arrived with the header and footer intact and the entire middle
 * unstyled. It reads as "the CSS is missing" but nothing was missing; the wrong
 * template was chosen.
 *
 * Requiring home.php is the whole fix. Duplicating its 157 lines here would mean
 * two blog layouts to keep in step, and they would drift the first time one was
 * edited.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

require locate_template( 'home.php' );
