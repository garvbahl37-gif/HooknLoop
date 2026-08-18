# Header port — how the React mega-nav maps onto a Shopify menu

The React header derives its menus from `NAV_GROUPS` in `catalog.js`. Shopify has
no equivalent, so the menu comes from a link list and the *layout* rules are
reproduced from the child counts.

| React                                   | Shopify                                                   |
|-----------------------------------------|-----------------------------------------------------------|
| `NAV_GROUPS['Double-Sided Tape']` (9)   | menu item with 9 children → **1 column** (`hd-mega__cols` × 1) |
| `NAV_GROUPS['Single-Sided Tapes']` (26) | menu item with 26 children → **3 columns** + `hd-nav__item--wide` |
| `INDUSTRIES` (26)                       | menu item with 26 children → **3 columns** + `hd-nav__item--right` |
| flat links (Home, Dispensers, All Products) | menu items with no children                          |

The rule the section applies, matching the React output exactly:

- **≤ `columns_threshold` children (default 10) → one column.** Double-Sided
  Tape has 9, so it stays a single column as designed.
- **more than that → three columns**, split with `ceil(n / 3)` per column — the
  same arithmetic as `MENUS` in `Header.jsx`.
- **`--wide`** (panel centred under the trigger) on any multi-column panel.
- **`--right`** (panel flush to the right edge) on the last multi-column item,
  because a 3-column panel opening from a right-hand trigger would otherwise
  overflow the viewport. In the React header that item is Industries.

The "View all …" footer link on each panel uses the parent menu item's own URL.

## The menu to build in Shopify Admin

Menus cannot be created from theme files or the Theme Access API — build this
once under **Online Store → Navigation**, as `main-menu`:

```
Home                     /
Double-Sided Tape        /collections/double-sided-tape
  ├ Foam Tape Double Sided        /collections/foam-tape-double-sided
  ├ High Bond Acrylic Tape (VHP)  /collections/high-bond-acrylic-tape-vhp
  └ … 7 more (see NAV_GROUPS)
Single-Sided Tapes       /collections/all
  └ … 26 children
Dispensers               /collections/tapes-dispensers
Industries               /pages/industries
  └ … 26 children
All Products             /collections/all
```

`mytapestore-shopify/scripts/build_catalogue.py --menus` prints this tree with
every real handle filled in, ready to copy.
