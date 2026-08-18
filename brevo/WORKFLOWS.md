# HooknLoop — Brevo automation build sheet

Brevo has **no API for automations**. Verified three ways: probing the REST API
(404s), searching Brevo's own OpenAPI spec (206 paths, zero automation or
workflow endpoints), and the PushOwl MCP (web-push automations only, tune and
toggle). There is also **no workflow import** — Brevo imports contacts,
companies and CRM deals, nothing else.

So these ten have to be built by hand. Everything below is settled, so the build
is mechanical: **Automations → Create an automation → Custom workflow → Save as
draft**. Do not activate any of them yet — see "Before going live".

## Already done

| | |
|---|---|
| Domain `hooknloop.com.au` | authenticated, DKIM + DMARC live |
| Sender `info@hooknloop.com.au` | verified, active |
| Templates 1–10 | uploaded, **all inactive** |
| `checkout_started` events | confirmed arriving with full cart contents |

## The event you are triggering on

Real payload, taken from a live event on this account:

```
event_name: checkout_started
event_properties.data:
  items[]            -> title, quantity, line_price
  items[].variant.image.src
  checkout_url
  billing_address.first_name / last_name
  subtotal_price, total_price, currency_code
  buyer_accepts_email_marketing        <- consent flag
```

Templates 6–8 already reference these exact paths
(`{% for item in event.data.items %}`, `{{ event.data.checkout_url }}`,
`{{ item.variant.image.src }}`). Do not retype them in Brevo's editor — the
uploaded HTML is already correct.

## The ten workflows

| # | Workflow | Trigger | Wait | Template | id |
|---|---|---|---|---|---|
| 1 | Cart 1 | Event `checkout_started` | 1 hour | HooknLoop_Cart1_LeftItems | 6 |
| 2 | Cart 2 | Event `checkout_started` | 24 hours | HooknLoop_Cart2_CompleteOrder | 7 |
| 3 | Cart 3 | Event `checkout_started` | 72 hours | HooknLoop_Cart3_SavedCart | 8 |
| 4 | Welcome | Contact added to list | immediate | HooknLoop_Welcome | 10 |
| 5 | Thank you | Order placed | 1 day | HooknLoop_ThankYou | 1 |
| 6 | How to use it | Order placed | 3 days | HooknLoop_HowToUseIt | 2 |
| 7 | Second order | `ORDER_COUNT` = 1 | 33 days | HooknLoop_SecondOrder | 3 |
| 8 | Running low | Last order date | 45 days | HooknLoop_RunningLow | 4 |
| 9 | Win back | No order | 6 months | HooknLoop_WinBack | 5 |
| 10 | Browse abandon | Product viewed, no cart | 4 hours | HooknLoop_Browse_PickUp | 9 |

### Exit conditions — do not skip these

- **Cart 1/2/3**: exit on order placed. Without it, someone who buys after the
  first email still receives the second and third, chasing them for a cart they
  already paid for.
- **Second order / Running low / Win back**: exit on order placed, or a customer
  who orders mid-sequence gets a "we miss you" the week after buying.

### Triggers that may not exist yet

Only `checkout_started` is confirmed flowing. Workflows 5–10 depend on order and
browse events that have not been observed on this account. Build them, but check
the trigger is selectable before assuming it will fire — otherwise they sit as
drafts that never run.

## Before going live

1. **Pause the Klaviyo equivalents.** All ten are live in Klaviyo right now.
   Enabling both means every customer receives each email twice.
2. **List health.** 82 of 154 contacts are already blacklisted and every list
   reads 0 subscribers. Fix the lists before volume, or the first send is mostly
   suppressions.
3. **Consent.** Each event carries `buyer_accepts_email_marketing` — it was
   `false` on the sample. Consider gating the cart series on it.
4. **DMARC stays at `p=none`** until reports confirm Google Workspace, Shopify
   and Brevo all align. Tightening early silently bins your own order
   confirmations.
5. **Send yourself a test** from one workflow and check the headers show
   `DKIM=pass` and `DMARC=pass` before enabling the rest.

## Separately: PushOwl web push is already live

PushOwl's `abandoned_cart` automation is **enabled** on this store with three
web-push notifications (20 min / 2 h / 24 h) still carrying stock demo copy —
including *"Allow me to teleport you… Free of charge of course :)"*. It is
harmless today because there are 0 push subscribers, but it fires the moment
anyone opts in. Rewrite or disable it before it does.
