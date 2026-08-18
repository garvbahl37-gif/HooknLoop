<?php
/**
 * Volume / tier pricing.
 *
 * The live store runs "Tiered Price Table for WooCommerce", and the importer
 * copied its meta across verbatim. This file reads that meta and renders the
 * design's .pdp-vol table from it.
 *
 * Read-only by design. It never writes a rule, never computes a cart price and
 * never registers a price filter — the plugin remains the sole authority on what
 * a customer is actually charged. This is only a display of the rules it holds.
 *
 * ---------------------------------------------------------------------------
 * THE UNITS TRAP — read this before changing anything below.
 *
 * The meta key is `_tiered_pricing_fixed_rules` REGARDLESS of rule type, and a
 * separate key `_tiered_pricing_type` says how to read it:
 *
 *     _tiered_pricing_type = 'percentage'  -> values are PERCENT OFF
 *     _tiered_pricing_type = 'fixed'       -> values are UNIT PRICES
 *
 * On this store the duct tape line is {2=>10, 6=>15, 10=>20} with type
 * 'percentage', i.e. 10%/15%/20% off. An earlier version of this file trusted
 * the key name, ignored the type, and printed "$10.00 / $15.00 / $20.00" — a
 * price the store does not charge, rising with quantity on a discount table.
 * Never infer the unit from the key name.
 * ---------------------------------------------------------------------------
 *
 * @package mytapestore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Read the raw rule map for a product, falling back to its parent.
 *
 * @return array<int|string,mixed>
 */
function mts_tier_raw_rules( WC_Product $product ): array {
	$ids = array_filter( array( $product->get_id(), $product->get_parent_id() ) );

	foreach ( $ids as $id ) {
		foreach ( array( '_tiered_pricing_fixed_rules', 'tiered_pricing_fixed_rules', '_tiered_pricing_percentage_rules' ) as $key ) {
			$raw = get_post_meta( $id, $key, true );

			// The plugin double-serialises on some versions, so unwrap until it
			// stops being a serialised string.
			$guard = 0;
			while ( is_string( $raw ) && '' !== $raw && $guard++ < 3 ) {
				$un = maybe_unserialize( $raw );
				if ( $un === $raw ) {
					$decoded = json_decode( $raw, true );
					$un      = ( JSON_ERROR_NONE === json_last_error() ) ? $decoded : $un;
				}
				if ( $un === $raw ) {
					break;
				}
				$raw = $un;
			}

			if ( is_array( $raw ) && $raw ) {
				return $raw;
			}
		}
	}

	return array();
}

/** 'percentage' or 'fixed' — how the rule values must be interpreted. */
function mts_tier_type( WC_Product $product ): string {
	foreach ( array_filter( array( $product->get_id(), $product->get_parent_id() ) ) as $id ) {
		$type = (string) get_post_meta( $id, '_tiered_pricing_type', true );
		if ( '' !== $type ) {
			return $type;
		}
	}
	return 'fixed';
}

/**
 * Tier rows ready for display.
 *
 * @return array<int,array{min:int,price:float,off:int}>
 *         `price` is the resulting unit price; `off` is the percentage saved
 *         (0 when it cannot be established).
 */
function mts_tier_rules_as( WC_Product $product, bool $is_percentage ): array {
	$raw = mts_tier_raw_rules( $product );
	if ( ! $raw ) {
		return array();
	}

	$base  = (float) wc_get_price_to_display( $product );
	$rules = array();

	foreach ( $raw as $key => $value ) {
		$min    = null;
		$amount = null;

		if ( is_numeric( $key ) && is_scalar( $value ) && is_numeric( $value ) ) {
			$min    = (int) $key;
			$amount = (float) $value;
		} elseif ( is_array( $value ) ) {
			$min    = $value['quantity'] ?? $value['min'] ?? $value['from'] ?? null;
			$amount = $value['price'] ?? $value['value'] ?? $value['amount'] ?? $value['discount'] ?? null;
		}

		if ( null === $min || null === $amount || ! is_numeric( $min ) || ! is_numeric( $amount ) ) {
			continue;
		}

		$min    = (int) $min;
		$amount = (float) $amount;

		if ( $min < 2 ) {
			continue; // handled below as the base tier
		}

		if ( $is_percentage ) {
			$off   = (int) round( $amount );
			$price = $base > 0 ? round( $base * ( 1 - ( $amount / 100 ) ), 2 ) : 0.0;
		} else {
			$price = round( $amount, 2 );
			$off   = ( $base > 0 && $price < $base ) ? (int) round( ( 1 - ( $price / $base ) ) * 100 ) : 0;
		}

		$rules[] = array( 'min' => $min, 'price' => $price, 'off' => max( 0, $off ) );
	}

	if ( ! $rules ) {
		return array();
	}

	usort( $rules, static fn( array $a, array $b ): int => $a['min'] <=> $b['min'] );

	/*
	 * SANITY GATE — a volume table that is not a discount is not shown.
	 *
	 * A tier price must fall as quantity rises, and must never exceed the base
	 * price. If either holds false the meta has been misread (this store mixes
	 * `_tiered_pricing_type` with per-role type keys, and at least one product
	 * declares 'fixed' while storing percentages), and rendering it anyway would
	 * advertise a price the store does not charge — the exact failure this file
	 * already carries a warning about.
	 *
	 * Suppressing the table costs a merchandising flourish. Publishing a wrong
	 * price costs a customer's trust and possibly a sale honoured at a loss, so
	 * the trade is not close.
	 */
	$previous = $base > 0 ? $base : PHP_FLOAT_MAX;
	foreach ( $rules as $rule ) {
		if ( $rule['price'] <= 0 || $rule['price'] > $previous ) {
			return array();
		}
		$previous = $rule['price'];
	}

	// The base tier is part of the table, not a preamble to it. The Shopify buy
	// box shows "1 piece" at full price as the first (selected) card, so a buyer
	// can see what they save by moving up rather than having to work it out.
	array_unshift( $rules, array( 'min' => 1, 'price' => $base, 'off' => 0 ) );

	// Each tier runs until the next one begins, so the card can read "2 - 5
	// pieces" instead of the ambiguous "2+".
	$count = count( $rules );
	foreach ( $rules as $i => &$rule ) {
		$next         = $rules[ $i + 1 ]['min'] ?? null;
		$rule['max']  = ( null !== $next ) ? (int) $next - 1 : null;
		$rule['last'] = ( $i === $count - 1 );
	}
	unset( $rule );

	return $rules;
}

/**
 * Human label for a tier's quantity range: "1 piece", "2 - 5 pieces", "10+ pieces".
 */
function mts_tier_range_label( array $rule ): string {
	if ( null === $rule['max'] ) {
		return sprintf(
			/* translators: %s: minimum quantity */
			__( '%s+ pieces', 'mytapestore' ),
			number_format_i18n( $rule['min'] )
		);
	}

	if ( $rule['min'] === $rule['max'] ) {
		return sprintf(
			/* translators: %s: quantity */
			_n( '%s piece', '%s pieces', $rule['min'], 'mytapestore' ),
			number_format_i18n( $rule['min'] )
		);
	}

	return sprintf(
		/* translators: 1: from quantity, 2: to quantity */
		__( '%1$s - %2$s pieces', 'mytapestore' ),
		number_format_i18n( $rule['min'] ),
		number_format_i18n( $rule['max'] )
	);
}


/**
 * Tier rows, resolving the units question by CHECKING rather than trusting.
 *
 * `_tiered_pricing_type` is not reliable on this store: at least one product
 * declares 'fixed' while storing percentages, which rendered "$10.00 (84% off)"
 * on a table whose prices rose with quantity.
 *
 * Rather than guess, both readings are computed and validated against a rule
 * that holds for every genuine volume discount: the unit price must fall as
 * quantity rises, and must never exceed the base price. Exactly one reading
 * normally survives, and that is the right one. If both survive, the declared
 * type wins. If neither does, nothing is rendered — an absent table is a
 * cosmetic loss, a wrong price is a broken promise.
 */
function mts_tier_rules( WC_Product $product ): array {
	$declared = ( 'percentage' === mts_tier_type( $product ) );

	$primary  = mts_tier_rules_as( $product, $declared );
	if ( $primary ) {
		return $primary;
	}

	// The declared reading produced an impossible table; try the other one.
	return mts_tier_rules_as( $product, ! $declared );
}
