# Address finder + chat assistant — design

**Date:** 2026-08-10
**Status:** approved, not yet implemented
**Constraint that shaped everything:** zero cost, permanently. Not "cheap", not
"free tier with a card on file" — no mechanism by which a bill can ever arrive.

---

## The constraint, stated precisely

"Free" comes in three grades and only two of them satisfy the brief:

1. No account, no card — cannot bill you.
2. Account, no card — hits a wall and stops.
3. Free tier, card required — an overage becomes a charge, not a stop.

**Google Places is grade 3 and was rejected on that basis alone**, despite being
the obvious default and despite its autocomplete sessions now being largely free.
Google Maps Platform requires a billing account to claim the free tier. A store
that must bear zero cost cannot hold a key that can generate an invoice.

Both providers chosen here are grade 2. Worst case on a leak or a traffic spike
is lost quota, never money.

---

## Part 1 — Address finder

### Shape

Two halves, deliberately split by who owns the failure:

| Half | Source | Cost | Handles |
|---|---|---|---|
| Suburb / state / postcode | Local DB table | $0 forever, no network | The mismatch that breaks deliveries |
| Street line | LocationIQ autocomplete | Free tier, 5k/day | Convenience |

The split is the point. A wrong suburb/postcode pairing is what actually costs
money in reshipping, and that half must never depend on a third party being up,
in quota, or still offering a free tier in two years. The street line is
convenience, so it is allowed to degrade.

### Why not one hosted API for the whole address

LocationIQ and Geoapify are OpenStreetMap-derived. OSM's Australian coverage is
materially weaker than G-NAF — the federal government's authoritative file — on
unit numbers and rural addresses. Running suburb/postcode off authoritative local
data and using OSM only for the street line gets the accuracy where it matters
without paying for a G-NAF-backed commercial API.

### Why LocationIQ over Geoapify

5,000 req/day vs 3,000, neither needs a card. Decisive factor: **the autocomplete
response returns the full structured address in one call** — `house_number`,
`road`, `city`, `state`, `postcode`, `country`. Google requires a second Place
Details call to get the postcode; LocationIQ does not. That halves request count.

Verified live against this account on 2026-08-10 with `12 Bourke St Melbourne`:
three ranked results, each carrying complete structured components.

### Endpoints used

**Autocomplete only** (`/v1/autocomplete`). Not forward geocoding (autocomplete
already returns coordinates), not reverse geocoding (no "use my location"
feature), not directions, not map tiles.

### Two free-tier conditions that shaped the implementation

**2 requests/second, account-wide** — shared across all concurrent shoppers, not
per user. Mitigations, all required:

- 400ms debounce, 4-character minimum, and abort any in-flight request on the
  next keystroke, so one shopper is never more than one request.
- Server-side transient cache keyed by query. Shoppers type the same prefixes
  constantly ("bris", "melb", "parram"), so most keystrokes never leave our
  server. Same pattern as `inc/search-suggest.php` already uses.
- On 429: back off, fall through to a plain text field, do not retry.

**Attribution required** — free commercial use is conditional on a visible
LocationIQ credit. A line near the address field. Not optional.

### Known transform: state names

LocationIQ returns full state names (`Victoria`). WooCommerce stores codes
(`VIC`). A mapping table is required or the state field silently fails to match
and shipping zones misfire. This is the single most likely source of a quiet bug
in this feature.

### Degradation ladder

1. Normal: local suburb/postcode + LocationIQ street.
2. LocationIQ 429 / down / key absent: street becomes a plain text input;
   suburb and postcode keep autocompleting locally.
3. Local table missing: all fields are plain text inputs. Checkout still works.

Nothing in this feature can prevent a customer from completing an order.

---

## Part 2 — Chat assistant

### Provider: Groq, not Gemini

Gemini's free tier is more generous on volume, but **Google may use free-tier
inputs and outputs to improve its products, including for training, with human
reviewers**. Paid tiers exclude this; free does not. For a widget customers type
into, on a store with a privacy policy, that is disqualifying.

**Groq does not train on prompts on either tier** — the policy is account-wide,
not tier-gated — and Zero Data Retention is available as a setting. That removes
the objection entirely, at the cost of a tighter token budget.

### The budget is what forces the architecture

Verified against this account on 2026-08-10:

```
x-ratelimit-limit-requests: 1000      (per day)
x-ratelimit-limit-tokens:   8000      (per minute)
```

Docs give 200,000 tokens/day for `openai/gpt-oss-120b`.

The catalogue is **133 products**. Putting all of them in every prompt costs
~5,000 tokens per call and would exhaust the entire daily token budget in about
40 replies.

**So retrieval is not an optimisation here — it is what makes the feature
possible at all.** Search the catalogue locally first, send only the ~5 most
relevant products. That holds a call to ~1,300 tokens, giving roughly 150 replies
a day, with the 1,000-request ceiling never binding first.

8,000 tokens/minute is the tighter constraint for bursts (~6 calls/minute), so
429 handling is mandatory, not defensive.

### Fallback ladder

| Tier | Model | When |
|---|---|---|
| 1 | `openai/gpt-oss-120b` | Normal |
| 2 | `llama-3.1-8b-instant` | Tier 1 quota hit — 500k tokens/day, weaker |
| 3 | Existing scripted answers | No key, provider down, free tier withdrawn |

Tier 3 matters more than it looks. Free tiers get retired. This guarantees the
widget degrades to exactly what ships today rather than to a spinner.

### Guardrails

`template-parts/chat-widget.php` currently carries this comment, and it is right:

> an assistant that invents an answer about delivery times or discounts on a
> trade store creates a promise somebody then has to honour.

Under Australian Consumer Law a hallucinated delivery promise or price is a
misleading representation. Replacing the script with a model does not retire that
reasoning, it raises the bar for the guardrails:

- System prompt permits discussion **only** of products supplied in that call's
  retrieved context.
- Never state a price, stock level or delivery date not present in that context.
- **Post-check:** strip any dollar figure the model emits that does not appear in
  the retrieved context. Prompt rules are not a security boundary; this is the
  actual enforcement.
- Anything out of scope routes to `/contact-us/`, which the widget already links.
- The widget never invites order numbers, addresses or payment details.

### Preserved

The widget's design, quick-reply chips, teaser, ping and panel are unchanged.
Only the answer source changes. Front-end work extends `assets/js/widgets.js`
using the same no-`innerHTML` DOM construction discipline as `assets/js/search.js`.

---

## Shared: key handling

Both keys are **server-side only**. The browser only ever talks to our own REST
endpoints; neither key is ever emitted to a page, stored in the database, or
committed.

- Canonical store: `mytapestore-wordpress/.env` — git-ignored, `chmod 600`.
- Runtime: WordPress cannot read `.env` (it sits outside the WordPress root), so
  the theme reads the constants `MTS_GROQ_KEY` and `MTS_LOCATIONIQ_KEY`.
- Local dev: defined in `local/wordpress/wp-config.php` — `local/` is git-ignored.
- Production: the same two lines added to the live host's `wp-config.php`.
- A missing constant is not an error. It selects the degraded path.

### Playground limitation

The preview runs PHP in the browser via WASM, so a server-side key proxy cannot
work there. Both features are testable locally and on real hosting; the preview
will show the degraded path. This is expected, not a defect.

---

## New files

```
theme/inc/address-lookup.php     REST mts/v1/address, locality table, state map
theme/inc/chat-assistant.php     REST mts/v1/chat, retrieval, provider ladder
theme/data/au-localities.csv     ~16k suburb/state/postcode rows
```

Both follow the REST pattern already set by `theme/inc/search-suggest.php`.

## Open item

The locality dataset's exact licence must be confirmed against the specific file
shipped, not assumed. G-NAF is published under an open licence permitting
commercial use, but the assertion needs verifying before the CSV lands in git.
