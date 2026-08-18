<?php
/**
 * Import the blog: posts, categories, featured images and inline media.
 *
 * WHAT WAS WRONG
 *
 * The posts arrived without their media. Every one of the 55 had NO featured
 * image, so the blog index rendered a grid of cards with empty frames and each
 * article opened with no hero. 51 of them still carried <img> tags pointing at
 * mytapestore.com.au — pictures borrowed from another site, which vanish the day
 * that site changes its uploads or blocks hotlinking. And only ONE category
 * existed across the whole blog, so the topic chips above the index had nothing
 * to filter by.
 *
 * WHAT THIS DOES
 *
 * Reads content/blog.json and content/blog-media/ (both produced by
 * scripts/pull-blog.py) and, for every post:
 *
 *   · matches it to the local post by SLUG, creating it if it is missing
 *   · sideloads each image into the media library ONCE, keyed by source URL, so
 *     re-running does not duplicate a single attachment
 *   · rewrites every inline image URL in the body to the local copy
 *   · sets the featured image
 *   · assigns the real categories
 *
 * It also removes WordPress's default "Hello world!" post, which was sitting in
 * the index alongside the real articles.
 *
 * Run (note --site-url; see fix-site-url.php for why):
 *   ./node_modules/.bin/wp-playground-cli php \
 *     --site-url=http://localhost:9400 \
 *     --mount-before-install=./local/wordpress:/wordpress \
 *     --mount=./theme:/wordpress/wp-content/themes/mytapestore \
 *     --mount=./scripts:/wordpress/mts-scripts \
 *     --mount=./content:/wordpress/mts-content \
 *     --wordpress-install-mode=install-from-existing-files \
 *     -- /wordpress/mts-scripts/sync-blog.php
 *
 * Idempotent.
 *
 * @package mytapestore
 */

if ( ! defined( 'ABSPATH' ) ) {
	require_once '/wordpress/wp-load.php';
}

require_once ABSPATH . 'wp-admin/includes/image.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';

$mts_source = '/wordpress/mts-content/blog.json';
$mts_media  = '/wordpress/mts-content/blog-media';

if ( ! file_exists( $mts_source ) ) {
	fwrite( STDERR, "missing {$mts_source} — run scripts/pull-blog.py first.\n" );
	exit( 1 );
}

$mts_posts = json_decode( (string) file_get_contents( $mts_source ), true );
if ( ! is_array( $mts_posts ) ) {
	fwrite( STDERR, "blog.json is not valid JSON.\n" );
	exit( 1 );
}

echo count( $mts_posts ) . " posts in the export\n\n";

/**
 * Put one downloaded file into the media library, once.
 *
 * Keyed on the SOURCE URL in attachment meta, so a second run finds the existing
 * attachment instead of importing a duplicate — and so an image shared by three
 * articles is stored once and referenced three times.
 */
function mts_sideload( string $file, string $source_url, int $parent = 0 ): int {
	if ( '' === $source_url || ! file_exists( $file ) ) {
		return 0;
	}

	$existing = get_posts( array(
		'post_type'      => 'attachment',
		'post_status'    => 'any',
		'posts_per_page' => 1,
		'fields'         => 'ids',
		'meta_key'       => '_mts_source_url', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_query_meta_key
		'meta_value'     => $source_url,       // phpcs:ignore WordPress.DB.SlowDBQuery.slow_query_meta_value
	) );

	if ( $existing ) {
		return (int) $existing[0];
	}

	// media_handle_sideload MOVES the file, so hand it a copy — the export
	// directory has to survive for the next run.
	$tmp = wp_tempnam( basename( $file ) );
	if ( ! $tmp || ! copy( $file, $tmp ) ) {
		return 0;
	}

	$id = media_handle_sideload(
		array(
			'name'     => basename( $file ),
			'tmp_name' => $tmp,
		),
		$parent
	);

	if ( is_wp_error( $id ) ) {
		@unlink( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		return 0;
	}

	update_post_meta( (int) $id, '_mts_source_url', $source_url );
	return (int) $id;
}

/**
 * Percent-encode every non-ASCII byte in a URL, leaving the rest untouched.
 *
 * Deliberately narrower than rawurlencode(), which would also escape brackets,
 * plus signs and other characters WordPress leaves alone — producing a third
 * spelling that matches nothing. Only the bytes that actually differ between the
 * REST API's output and the stored post body are touched.
 */
function mts_encode_url_bytes( string $url ): string {
	return (string) preg_replace_callback(
		'/[\x80-\xFF]/',
		static function ( array $match ): string {
			return '%' . strtoupper( bin2hex( $match[0] ) );
		},
		$url
	);
}

/**
 * Strip the old site's page furniture out of an imported article body.
 *
 * WHAT IS IN THERE
 *
 * mytapestore.com.au runs the Kapee theme with WPBakery, and both leak into
 * post_content. Imported verbatim, every affected article ends with:
 *
 *   · literal `[vc_row][vc_column]` text — WPBakery's shortcodes, printed as
 *     characters here because this theme does not register them
 *   · a `.kapee-element` "Related Products" owl-carousel: 37 of the 54 articles
 *     carry one. Its thumbnails are lazy-loaded, so the real URL is in data-src
 *     and `src` is a 1×1 transparent.png — 216 blank 300×300 squares across the
 *     blog, each linking back to the LIVE store
 *   · inline <script> pushing products into a wpmDataLayer that does not exist
 *     on this install
 *
 * This theme already closes an article with its own "Products in this guide"
 * section, in the store's design and linking to local products. The imported
 * carousel is the same idea rendered as invisible boxes pointing off-site.
 *
 * HOW
 *
 * Parsed as a DOM rather than pattern-matched. The carousel is ~40 nested divs
 * with a <script> inside it; "delete from the opening tag to the end of the
 * content" happens to work today only because the block sits last, and would
 * silently eat a closing paragraph the day one does not.
 */
function mts_clean_article_html( string $html ): string {
	// WPBakery tags only — the text between them is the article.
	$html = (string) preg_replace( '#\[/?vc_[a-z_]*[^\]]*\]#i', '', $html );

	if ( '' === trim( $html ) ) {
		return $html;
	}

	$doc = new DOMDocument();
	$previous = libxml_use_internal_errors( true );

	// The meta forces UTF-8: without it DOMDocument assumes ISO-8859-1 and every
	// curly quote and en-dash in the copy arrives mangled.
	$doc->loadHTML(
		'<?xml encoding="UTF-8"><div id="mts-root">' . $html . '</div>',
		LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
	);

	libxml_clear_errors();
	libxml_use_internal_errors( $previous );

	$xpath = new DOMXPath( $doc );

	$drop = $xpath->query(
		'//*[contains(concat(" ", normalize-space(@class), " "), " kapee-element ")]'
		. ' | //script | //noscript'
	);

	foreach ( $drop as $node ) {
		if ( $node->parentNode ) {
			$node->parentNode->removeChild( $node );
		}
	}

	/*
	 * Any lazy image that survives outside a removed block: promote data-src to
	 * src so it shows something, rather than leaving a transparent spacer.
	 */
	foreach ( $xpath->query( '//img[@data-src]' ) as $img ) {
		$real = (string) $img->getAttribute( 'data-src' );
		if ( '' !== $real ) {
			$img->setAttribute( 'src', $real );
		}
		$img->removeAttribute( 'data-src' );
		$img->removeAttribute( 'data-srcset' );
	}

	$root = $doc->getElementById( 'mts-root' );
	if ( ! $root ) {
		return $html;
	}

	$out = '';
	foreach ( $root->childNodes as $child ) {
		$out .= $doc->saveHTML( $child );
	}

	// Blank lines left where the blocks were.
	return trim( (string) preg_replace( '/(\s*\R){3,}/', "\n\n", $out ) );
}

$mts_stats = array( 'created' => 0, 'updated' => 0, 'featured' => 0, 'inline' => 0, 'cats' => 0, 'cleaned' => 0 );

foreach ( $mts_posts as $mts_index => $mts_record ) {
	$mts_slug = (string) ( $mts_record['slug'] ?? '' );
	if ( '' === $mts_slug ) {
		continue;
	}

	$mts_post = get_page_by_path( $mts_slug, OBJECT, 'post' );

	if ( ! $mts_post ) {
		$mts_id = wp_insert_post( array(
			'post_type'    => 'post',
			'post_status'  => 'publish',
			'post_name'    => $mts_slug,
			'post_title'   => wp_strip_all_tags( (string) $mts_record['title'] ),
			'post_date'    => (string) ( $mts_record['date'] ?? '' ) ?: current_time( 'mysql' ),
			'post_content' => '',
		) );
		if ( is_wp_error( $mts_id ) ) {
			continue;
		}
		$mts_post = get_post( (int) $mts_id );
		$mts_stats['created']++;
	}

	$mts_id      = (int) $mts_post->ID;
	$mts_content = (string) ( $mts_record['content'] ?? '' );
	$mts_changes = array();

	// blog.json stays a faithful capture of the source; the cleaning happens on
	// the way in, so re-pulling never has to be re-cleaned by hand.
	$mts_before_clean = $mts_content;
	$mts_content      = mts_clean_article_html( $mts_content );
	if ( $mts_before_clean !== $mts_content ) {
		$mts_stats['cleaned']++;
	}

	// --- inline images -----------------------------------------------------
	foreach ( (array) ( $mts_record['images'] ?? array() ) as $mts_url => $mts_file ) {
		if ( ! $mts_file ) {
			continue;
		}

		$mts_attachment = mts_sideload( $mts_media . '/' . $mts_file, (string) $mts_url, $mts_id );
		if ( ! $mts_attachment ) {
			continue;
		}

		$mts_local = wp_get_attachment_url( $mts_attachment );
		if ( ! $mts_local ) {
			continue;
		}

		/*
		 * Replace the SOURCE url wherever it appears — src, srcset and any
		 * data-src a lazy-loader left behind. A naive src-only replace leaves the
		 * srcset pointing at the old host, and the browser prefers the srcset.
		 *
		 * BOTH SPELLINGS of the URL, because they are not the same string.
		 * WordPress uploads keep the original filename, and these include
		 * typographic characters — "…Market-Growth-2024–2031.png" with an EN
		 * DASH. The REST API hands that back raw, so it is what blog.json holds;
		 * WordPress percent-encodes it on the way out, so the stored body holds
		 * "…2024%E2%80%932031.png". Matching only the raw form left two images
		 * still loading from the live site, and they were the two whose filenames
		 * contained an en-dash.
		 */
		$mts_before   = $mts_content;
		$mts_variants = array_unique( array( $mts_url, mts_encode_url_bytes( $mts_url ) ) );
		foreach ( $mts_variants as $mts_variant ) {
			$mts_content = str_replace( $mts_variant, $mts_local, $mts_content );
		}
		if ( $mts_before !== $mts_content ) {
			$mts_stats['inline']++;
		}
	}

	/*
	 * Anything still pointing at the live host had no local copy — usually a
	 * srcset variant. Strip the srcset rather than leave a mixed one: the browser
	 * would pick a remote candidate over the local src.
	 */
	if ( false !== strpos( $mts_content, 'mytapestore.com.au/wp-content/uploads' ) ) {
		$mts_content = preg_replace( '/\s+(?:srcset|data-srcset)="[^"]*mytapestore\.com\.au[^"]*"/i', '', $mts_content );
	}

	if ( $mts_content !== $mts_post->post_content ) {
		wp_update_post( array( 'ID' => $mts_id, 'post_content' => wp_slash( $mts_content ) ) );
		$mts_changes[] = 'content';
		$mts_stats['updated']++;
	}

	// --- featured image ----------------------------------------------------
	if ( ! empty( $mts_record['featured_file'] ) && ! has_post_thumbnail( $mts_id ) ) {
		$mts_thumb = mts_sideload(
			$mts_media . '/' . $mts_record['featured_file'],
			(string) $mts_record['featured_url'],
			$mts_id
		);
		if ( $mts_thumb ) {
			set_post_thumbnail( $mts_id, $mts_thumb );
			$mts_changes[] = 'featured';
			$mts_stats['featured']++;
		}
	}

	// --- categories --------------------------------------------------------
	$mts_terms = array();
	foreach ( (array) ( $mts_record['categories'] ?? array() ) as $mts_name ) {
		$mts_name = trim( wp_strip_all_tags( (string) $mts_name ) );
		if ( '' === $mts_name ) {
			continue;
		}

		$mts_term = get_term_by( 'name', $mts_name, 'category' );
		if ( ! $mts_term ) {
			$mts_new = wp_insert_term( $mts_name, 'category' );
			if ( is_wp_error( $mts_new ) ) {
				continue;
			}
			$mts_term_id = (int) $mts_new['term_id'];
			$mts_stats['cats']++;
		} else {
			$mts_term_id = (int) $mts_term->term_id;
		}

		$mts_terms[] = $mts_term_id;
	}

	if ( $mts_terms ) {
		wp_set_post_terms( $mts_id, $mts_terms, 'category', false );
		$mts_changes[] = count( $mts_terms ) . ' cats';
	}

	if ( $mts_changes ) {
		printf( "  [%d/%d] %-52s %s\n", $mts_index + 1, count( $mts_posts ), substr( $mts_slug, 0, 52 ), implode( ', ', $mts_changes ) );
	}
}

/*
 * WordPress's sample post, still in the index between real articles.
 */
$mts_hello = get_page_by_path( 'hello-world', OBJECT, 'post' );
if ( $mts_hello ) {
	wp_delete_post( (int) $mts_hello->ID, true );
	echo "\nremoved the default \"Hello world!\" post\n";
}

// "Uncategorised" is WordPress's fallback, not a topic. Dropping it keeps the
// chip row above the index to real subjects.
$mts_uncat = get_term_by( 'slug', 'uncategorised', 'category' ) ?: get_term_by( 'slug', 'uncategorized', 'category' );
if ( $mts_uncat && 0 === (int) $mts_uncat->count ) {
	wp_delete_term( (int) $mts_uncat->term_id, 'category' );
	echo "removed the empty \"Uncategorised\" category\n";
}

echo "\n--- summary ---\n";
echo "posts created:    {$mts_stats['created']}\n";
echo "content updated:  {$mts_stats['updated']}\n";
echo "featured images:  {$mts_stats['featured']}\n";
echo "inline images:    {$mts_stats['inline']}\n";
echo "bodies cleaned:   {$mts_stats['cleaned']}\n";
echo "categories added: {$mts_stats['cats']}\n";
