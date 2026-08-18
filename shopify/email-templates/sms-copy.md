# SMS messages

Paste into **Apps → Messaging → SMS**. Each one fits a single text including the link. Go
longer and it splits into two, and you pay for both.

## Before you send any of these

- **Start with "HooknLoop:"** so people know who it's from. That's a legal requirement here.
- **Texting needs its own permission.** Someone signed up to your emails has not agreed to
  texts. Check `Customers` for how many SMS subscribers you actually have first — usually
  it's almost none until you add a phone box at checkout.
- **People must be able to opt out**, and you have to action it within 5 working days.
  Send yourself a test. If Shopify adds "Reply STOP to opt out" on its own, don't write it
  in as well — you'd be paying for those characters every time.
- Don't type the `{{ }}` bits by hand. Use the **Insert variable** button.

## Abandoned cart

You already have this one saved as a draft.

```
HooknLoop: You left something in your cart. Finish your order here: {{ link }}
```

Or with their name:

```
Hi {{ first name }}, your HooknLoop cart is still saved. Grab it here: {{ link }}
```

Send **once**, about 4 hours after they leave. You already have four cart emails going
out — a text on top of that is too much.

## Running low

```
HooknLoop: Running low on {{ product }}? Reorder here: {{ link }}
```

**One text per customer, not one per product they bought.** That's the quickest way to
turn a helpful reminder into a complaint.

## Missing the other side

Only send if they bought one side and haven't since bought the other.

```
HooknLoop: Your order was hook only - it needs loop to fasten. Get it here: {{ link }}
```

Use a plain hyphen, not a dash. Fancy punctuation cuts the length limit by more than half.

## What you can't text

These are in the plan but Shopify can't send them:

| | Who does it instead |
|---|---|
| Dispatch and tracking | Your courier |
| Delivery running late | Your courier, or you by hand |
| Out for delivery | Your courier |
| Delivered | Your courier |

Pick one. Getting the same text from you and the courier is worse than getting one.
