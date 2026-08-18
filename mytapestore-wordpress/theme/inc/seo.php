<?php
/**
 * Page titles and meta description.
 *
 * TWO PROBLEMS, BOTH REPORTED FROM THE BROWSER'S VIEW-SOURCE.
 *
 * 1. EVERY TITLE ENDED "– My Tape Store".
 *
 *        <title>Masking Tape &#8211; My Tape Store</title>
 *        <title>General Purpose Masking Tape &#8211; My Tape Store</title>
 *
 *    That is WordPress appending the site name to every document title. It costs
 *    17 characters of the ~60 a search result shows, on every page, to repeat
 *    something the domain beside it already says. Removed everywhere except the
 *    front page, where the site name IS the title.
 *
 * 2. THERE WAS NO META DESCRIPTION AT ALL.
 *
 *    Not a wrong one — none. WordPress core does not emit `<meta name="description">`;
 *    an SEO plugin normally does, and this install has none. So every product,
 *    every category and all 54 articles shipped with no description, and a search
 *    engine or a shared link had nothing to quote but a slice of the page.
 *
 * WHERE THE TEXT COMES FROM
 *
 * Real content, never invented, in a defined order of preference per page type.
 * If a page genuinely has nothing to say about itself, no tag is emitted — an
 * empty or boilerplate description is worse than none, because it suppresses the
 * snippet a search engine would otherwise choose for itself.
 *
 * The Open Graph and Twitter tags mirror snippets/mts-meta-tags.liquid from the
 * Shopify theme, so a link shared from either store previews identically.
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Drop the site name from the end of the title.
 *
 * The front page keeps it: there the "title" part IS the site name, and stripping
 * it would leave a page called nothing but its tagline.
 */
add_filter( 'document_title_parts', function ( array $parts ): array {
	if ( is_front_page() ) {
		return $parts;
	}

	unset( $parts['site'] );

	/*
	 * THE SEO TITLE WRITTEN ON THE LIVE SITE WINS.
	 *
	 * mytapestore.com.au titles its foam category
	 *
	 *     Foam Tape- Single Sided | Strong Adhesion & Versatile Use
	 *
	 * where this theme was printing the plain term name. That tail is deliberate
	 * SEO copy — written, ranked and earning clicks — and regenerating it from
	 * the H1 silently discards it at cutover.
	 *
	 * scripts/pull-live-seo.py reads those titles off the rendered live pages
	 * (Rank Math does not expose them over REST) and stores them per item, with
	 * the " | My Tape Store" suffix already removed. The heading, breadcrumb and
	 * menu keep using post_title, because a search headline and a page heading
	 * are not the same string.
	 */
	$override = mts_seo_meta( '_mts_seo_title' );
	if ( '' !== $override ) {
		$parts['title'] = $override;
	}

	return $parts;
} );

/**
 * Read an imported SEO field for whatever is currently being rendered.
 *
 * Returns '' for anything with no live counterpart — pages this draft added —
 * so those keep the generated title and description, which is correct.
 *
 * @param string $key _mts_seo_title or _mts_seo_description.
 */
function mts_seo_meta( string $key ): string {
	if ( is_tax( array( 'product_cat', 'product_tag' ) ) || is_category() || is_tag() ) {
		$term = get_queried_object();
		if ( $term instanceof WP_Term ) {
			return trim( (string) get_term_meta( $term->term_id, $key, true ) );
		}
		return '';
	}

	if ( is_singular() ) {
		return trim( (string) get_post_meta( get_queried_object_id(), $key, true ) );
	}

	return '';
}

/**
 * Trim a body of text to a description of the right length.
 *
 * Cut on a WORD boundary and then on a sentence end where one is near, because a
 * description sheared mid-word is the thing that makes a snippet look broken.
 * 155 characters is what Google renders before truncating on desktop.
 */
function mts_meta_excerpt( string $text, int $length = 155 ): string {
	/*
	 * WPBakery tags FIRST, and by pattern rather than through strip_shortcodes().
	 * strip_shortcodes() only removes shortcodes WordPress has a handler
	 * registered for, and this theme registers none of WPBakery's — so the
	 * imported excerpts came through as
	 *
	 *     [vc_row][vc_column][vc_column_text] How to Apply Flashing Tape? …
	 *
	 * and every article's description opened with markup.
	 */
	$text = (string) preg_replace( '#\[/?vc_[a-z_]*[^\]]*\]#i', ' ', $text );
	$text = wp_strip_all_tags( strip_shortcodes( $text ), true );
	$text = html_entity_decode( $text, ENT_QUOTES, 'UTF-8' );
	$text = trim( (string) preg_replace( '/\s+/u', ' ', $text ) );

	if ( '' === $text ) {
		return '';
	}

	if ( mb_strlen( $text ) <= $length ) {
		return $text;
	}

	$cut = mb_substr( $text, 0, $length );

	// Prefer ending on a full sentence if one finishes in the last third.
	$stop = max( mb_strrpos( $cut, '. ' ), mb_strrpos( $cut, '! ' ), mb_strrpos( $cut, '? ' ) );
	if ( false !== $stop && $stop > (int) ( $length * 0.6 ) ) {
		return trim( mb_substr( $cut, 0, $stop + 1 ) );
	}

	$space = mb_strrpos( $cut, ' ' );
	if ( false !== $space ) {
		$cut = mb_substr( $cut, 0, $space );
	}

	return rtrim( $cut, " ,;:-–—" ) . '…';
}

/**
 * Drop an opening line that only repeats the page's own title.
 *
 * Compared on a normalised form — case and punctuation removed — so "Masking
 * Tape", "MASKING TAPE" and "Masking Tape:" are all recognised. Only the FIRST
 * line is ever considered, and only when it matches the title exactly; a line
 * that merely starts with the title is real copy and is left alone.
 */
function mts_strip_leading_title( string $text, string $title ): string {
	$plain = trim( wp_strip_all_tags( $text, false ) );
	$lines = preg_split( '/\R+/u', $plain, 2 );

	if ( ! $lines || count( $lines ) < 2 ) {
		return $text;
	}

	$norm = static fn( string $s ): string => strtolower( trim( (string) preg_replace( '/[^a-z0-9]+/i', ' ', $s ) ) );

	return $norm( $lines[0] ) === $norm( $title ) ? $lines[1] : $text;
}

/**
 * The description for whatever is currently being rendered.
 *
 * Returns '' when the page has no real copy of its own.
 */
function mts_meta_description(): string {
	/*
	 * The description written on the live site wins, for the same reason its
	 * title does: it is copy somebody wrote for a search result, not something
	 * to be re-derived from the first sentence of the page.
	 */
	$override = mts_seo_meta( '_mts_seo_description' );
	if ( '' !== $override ) {
		return mts_meta_excerpt( $override );
	}

	/*
	 * FRONT PAGE FIRST. It is a static page, so is_singular() is also true for
	 * it — and matching that branch first returned the empty body of the page
	 * that holds the homepage sections, which meant the one page most likely to
	 * be linked shipped with no description at all.
	 */
	if ( is_front_page() ) {
		/*
		 * The hero's own lead line, not the tagline. "Bringing Tapes Direct to
		 * Your Doorstep" is a slogan; this says what the store actually sells and
		 * where it ships, which is what someone scanning a search result needs.
		 */
		return mts_meta_excerpt( __( '130+ industrial tape lines across 35 categories — double-sided, foam, foil, safety, masking and more, dispatched Australia-wide to 3,600+ postcodes.', 'mytapestore' ) );
	}

	// --- product ------------------------------------------------------------
	if ( function_exists( 'is_product' ) && is_product() ) {
		$product = wc_get_product( get_queried_object_id() );
		if ( $product ) {
			// The short description is written to sell the thing in a sentence,
			// which is exactly what a snippet wants. The long one is the fallback.
			$text = (string) $product->get_short_description();
			if ( '' === trim( wp_strip_all_tags( $text ) ) ) {
				$text = (string) $product->get_description();
			}
			return mts_meta_excerpt( $text );
		}
	}

	// --- product category / tag ---------------------------------------------
	if ( function_exists( 'is_product_taxonomy' ) && is_product_taxonomy() ) {
		$term = get_queried_object();
		if ( $term instanceof WP_Term ) {
			$text = (string) $term->description;

			/*
			 * Many categories carry no term description but do carry the SEO copy
			 * imported into _mts_seo_blocks — the "Overview" prose the collection
			 * page prints under the grid. Its first paragraph is a written
			 * description of the category, so it is a better source than nothing.
			 */
			if ( '' === trim( wp_strip_all_tags( $text ) ) ) {
				$blocks = get_term_meta( $term->term_id, '_mts_seo_blocks', true );
				if ( is_array( $blocks ) ) {
					foreach ( $blocks as $block ) {
						if ( ! empty( $block['text'] ) && ( $block['type'] ?? '' ) !== 'heading' ) {
							$text = (string) $block['text'];
							break;
						}
					}
				}
			}

			/*
			 * The imported descriptions open with the category's own name on its
			 * own line — "Masking Tape\nMasking tapes are your life saver…" — so
			 * the description began by repeating the title next to it in the
			 * search result. That opening line is dropped when it is just the
			 * term name.
			 */
			$text = mts_strip_leading_title( $text, $term->name );

			return mts_meta_excerpt( $text );
		}
	}

	// --- shop index ----------------------------------------------------------
	if ( function_exists( 'is_shop' ) && is_shop() ) {
		$shop = wc_get_page_id( 'shop' );
		$text = $shop > 0 ? (string) get_post_field( 'post_content', $shop ) : '';
		return mts_meta_excerpt( $text ) ?: mts_meta_excerpt( (string) get_bloginfo( 'description' ) );
	}

	// --- single post or page -------------------------------------------------
	if ( is_singular() ) {
		$post = get_queried_object();
		if ( $post instanceof WP_Post ) {
			$text = has_excerpt( $post ) ? (string) $post->post_excerpt : (string) $post->post_content;
			return mts_meta_excerpt( $text );
		}
	}

	// --- blog index and category archives ------------------------------------
	if ( is_home() ) {
		$blog = (int) get_option( 'page_for_posts' );
		$text = $blog ? (string) get_post_field( 'post_content', $blog ) : '';
		return mts_meta_excerpt( $text )
			?: __( 'Practical advice from the people who supply the tape — how to choose it, apply it, and make it last.', 'mytapestore' );
	}

	if ( is_category() || is_tag() ) {
		$term = get_queried_object();
		return $term instanceof WP_Term ? mts_meta_excerpt( (string) $term->description ) : '';
	}

	// --- front page ----------------------------------------------------------
	if ( is_front_page() ) {
		return mts_meta_excerpt( (string) get_bloginfo( 'description' ) );
	}

	/*
	 * Search results and 404s get nothing, deliberately. Their content is
	 * different for every visitor, so any description would be a lie, and both
	 * are noindex pages anyway.
	 */
	return '';
}

/**
 * The description, filtered.
 *
 * The escape hatch for pages whose content is not in post_content — the FAQ
 * renders from a template part, so WordPress sees an empty body and there is
 * nothing to derive a description from. A template hooks this and supplies one.
 */
function mts_meta_description_filtered(): string {
	$description = (string) apply_filters( 'mts_meta_description', mts_meta_description() );

	/*
	 * A description that is only the page's own title is not a description.
	 * Specialty Tape's whole imported category description is the string
	 * "Specialty Tape", which would render a search result whose headline and
	 * snippet say the same two words. Better to emit nothing and let the engine
	 * pick a real sentence off the page.
	 */
	$title = (string) apply_filters( 'the_title', single_term_title( '', false ) ?: get_the_title() );
	$norm  = static fn( string $s ): string => strtolower( trim( (string) preg_replace( '/[^a-z0-9]+/i', ' ', $s ) ) );

	if ( '' !== $title && $norm( $description ) === $norm( $title ) ) {
		return '';
	}

	return $description;
}

/**
 * The image a shared link should preview with.
 */
function mts_meta_image(): string {
	if ( is_singular() && has_post_thumbnail() ) {
		$src = wp_get_attachment_image_url( (int) get_post_thumbnail_id(), 'large' );
		if ( $src ) {
			return (string) $src;
		}
	}

	if ( function_exists( 'is_product' ) && is_product() ) {
		$product = wc_get_product( get_queried_object_id() );
		if ( $product && $product->get_image_id() ) {
			$src = wp_get_attachment_image_url( (int) $product->get_image_id(), 'large' );
			if ( $src ) {
				return (string) $src;
			}
		}
	}

	if ( function_exists( 'is_product_taxonomy' ) && is_product_taxonomy() ) {
		$term = get_queried_object();
		if ( $term instanceof WP_Term ) {
			$thumb = (int) get_term_meta( $term->term_id, 'thumbnail_id', true );
			if ( $thumb ) {
				$src = wp_get_attachment_image_url( $thumb, 'large' );
				if ( $src ) {
					return (string) $src;
				}
			}
		}
	}

	/*
	 * The hero, so a shared link is never an untitled grey box. Deliberately the
	 * photograph rather than the logo: a 1200x630 social card built from a
	 * transparent PNG logo renders as a small mark floating on whatever
	 * background the platform picks, which looks broken on half of them.
	 */
	return (string) mts_asset( 'img/site/hero.jpg' );
}

/**
 * Emit the tags.
 *
 * Priority 1 so the description sits near the top of <head>, above the
 * stylesheet — where a person reading view-source expects to find it.
 */
add_action( 'wp_head', function (): void {
	$description = mts_meta_description_filtered();
	$title       = wp_get_document_title();
	$image       = mts_meta_image();

	if ( '' !== $description ) {
		printf( '<meta name="description" content="%s">' . "\n", esc_attr( $description ) );
	}

	printf( '<meta property="og:site_name" content="%s">' . "\n", esc_attr( get_bloginfo( 'name' ) ) );
	printf( '<meta property="og:url" content="%s">' . "\n", esc_url( mts_current_url() ) );
	printf( '<meta property="og:title" content="%s">' . "\n", esc_attr( $title ) );
	printf(
		'<meta property="og:type" content="%s">' . "\n",
		esc_attr( ( function_exists( 'is_product' ) && is_product() ) ? 'product' : ( is_singular( 'post' ) ? 'article' : 'website' ) )
	);

	if ( '' !== $description ) {
		printf( '<meta property="og:description" content="%s">' . "\n", esc_attr( $description ) );
	}

	if ( '' !== $image ) {
		printf( '<meta property="og:image" content="%s">' . "\n", esc_url( $image ) );
	}

	// summary_large_image, matching the Shopify snippet.
	echo '<meta name="twitter:card" content="summary_large_image">' . "\n";
	printf( '<meta name="twitter:title" content="%s">' . "\n", esc_attr( $title ) );
	if ( '' !== $description ) {
		printf( '<meta name="twitter:description" content="%s">' . "\n", esc_attr( $description ) );
	}
	if ( '' !== $image ) {
		printf( '<meta name="twitter:image" content="%s">' . "\n", esc_url( $image ) );
	}
}, 1 );

/**
 * The URL of the page being rendered.
 *
 * Built from the queried object rather than $_SERVER, so it never carries a
 * visitor's query string — a canonical or og:url with `?add-to-cart=123` on it
 * is how duplicate URLs end up in an index.
 */
function mts_current_url(): string {
	if ( is_front_page() ) {
		return home_url( '/' );
	}

	if ( is_singular() ) {
		return (string) get_permalink();
	}

	if ( is_tax() || is_category() || is_tag() ) {
		$term = get_queried_object();
		if ( $term instanceof WP_Term ) {
			$link = get_term_link( $term );
			if ( ! is_wp_error( $link ) ) {
				return (string) $link;
			}
		}
	}

	if ( function_exists( 'is_shop' ) && is_shop() ) {
		return (string) wc_get_page_permalink( 'shop' );
	}

	if ( is_home() ) {
		$blog = (int) get_option( 'page_for_posts' );
		if ( $blog ) {
			return (string) get_permalink( $blog );
		}
	}

	return home_url( add_query_arg( array() ) );
}
