# Klaviyo

## Can flows be imported?

Not from a file — Klaviyo has no import button. But there **is** a Create Flow API
that takes a JSON definition, so flows can be generated. Two things to know:

1. **It's beta.** Klaviyo pin it behind the `2024-10-15.pre` revision header and say
   it isn't for production. It works; it may change without warning.
2. **The definition schema isn't documented.** Klaviyo's own advice is to build one
   flow in the UI, read its definition back, and use that as the shape for the rest.

So the order of operations is: build one, read it, generate the others from it.

## Setup

```bash
export KLAVIYO_PRIVATE_KEY=pk_xxxxxxxx
```

Get the key from **Klaviyo → Settings → API keys → Private API keys**. It needs read
and write access to flows.

Don't paste it into a chat or commit it. Putting it in your shell history is also
worth avoiding — prefix the command with a space if your shell is set to skip those.

## Usage

```bash
cd klaviyo/scripts

node flow-tool.mjs list                # every flow and its id
node flow-tool.mjs dump <flowId>       # → ../definitions/<name>.json
node flow-tool.mjs create <file.json>  # creates a DRAFT flow
```

## The workflow

**1. Build one flow by hand in Klaviyo.** The simplest useful one:

```
Trigger:  Placed Order
Wait:     3 days
Send:     How to get it to stick
```

Leave it in draft. It only exists so we can read its shape.

**2. Dump it.**

```bash
node flow-tool.mjs dump <flowId>
```

That writes the real definition — triggers, actions, filters, timing — to
`definitions/`. That file is the template for everything else.

**3. Generate the rest** from that shape, then create them as drafts and review
each one in the UI before activating.

## Safety

`create` always produces a **draft**. Nothing in this tool activates a flow or
sends an email — that stays a deliberate click in Klaviyo.

Worth keeping that way. A beta API writing live automations to a trading store is
exactly the situation where a schema change becomes a customer-facing mistake.

## The emails

Templates live in [`../shopify/email-templates/`](../shopify/email-templates/).

That folder name is now wrong — they were written for Shopify Messaging and have
since been converted to Klaviyo tags (`{% unsubscribe_link %}`, `{{ first_name }}`).
Worth renaming to `email-templates/` at the repo root when convenient.
