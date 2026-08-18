# Third-party data shipped with this theme

## au-localities.csv

15,318 Australian localities — suburb, state code, postcode, and the number of
addresses in that locality.

**Source:** [joelkoen/postcodes-au](https://github.com/joelkoen/postcodes-au),
MIT licence, Copyright (c) 2024 Joel Koen.

**Upstream attribution, which must be reproduced wherever this data is used:**

> Incorporates or developed using G-NAF © [Geoscape Australia](https://geoscape.com.au/legal/data-copyright-and-disclaimer/)
> licensed by the Commonwealth of Australia under the
> [Open Geo-coded National Address File (G-NAF) End User Licence Agreement](https://data.gov.au/dataset/ds-dga-19432f89-dc3a-4ef3-b943-5326ef1dbecc).

The site renders this credit in the address-finder UI. Do not remove it — it is a
licence condition, not a courtesy.

### Why this source and not the obvious one

The widely-used `matthewproctor/australianpostcodes` dataset was rejected. It
carries **no licence file**, and its own README notes that the official Australia
Post database "technically isn't meant to be republished". Shipping unlicensed
postal data in a commercial store is not a risk worth taking to save an
afternoon. This dataset is derived from G-NAF — the Commonwealth's authoritative
address file, published open — and states its licence plainly.

### A G-NAF licence condition worth knowing

The Open G-NAF EULA states the data must not be used to generate or compile an
address for sending mail unless each address has been verified as capable of
receiving mail by reference to a secondary source.

This theme's use is compliant: the data assists a customer typing **their own**
address, which they then confirm and submit. It is never used to synthesise
addresses, and never to build a mailing list. If that ever changes, re-read the
EULA first.

### Columns

| Column | Meaning |
|---|---|
| `locality` | Suburb or locality name, e.g. `Southbank` |
| `state` | State code, already in WooCommerce's format (`VIC`, `NSW`, …) |
| `postcode` | Four-digit postcode |
| `count` | Addresses in that locality — used to rank suggestions by size |

Latitude and longitude were dropped from the upstream file: a checkout address
field has no use for coordinates, and they were two thirds of its weight.

### Refreshing

Re-download `data/localities-au.csv` from the upstream repository, keep the four
columns above, and re-run the importer. G-NAF is revised quarterly, but locality
names and postcodes change slowly — an annual refresh is ample.
