#!/usr/bin/env python3
"""
Generates the Shopify Messaging email templates in this folder.

    python3 build.py

One shell, twelve emails. Editing the shell here changes all of them at once,
which is the whole reason this exists -- twelve hand-maintained copies of the
same 170-line table layout drift apart within a week.

THE MESSAGING RULES (why the output looks the way it does)
----------------------------------------------------------
* {{ unsubscribe_link }}    required. Messaging rejects the template without it.
* {{ open_tracking_block }} required. The open pixel.
* Both are PRE-FORMATTED: each emits its own HTML. Place them standalone.
  Wrapping unsubscribe_link in <a href="..."> nests one anchor inside another
  and dumps raw markup on screen. Shopify's own example is:
      <div id="footer">{{ unsubscribe_link }} {{ open_tracking_block }}</div>
  Use unsubscribe_url instead if you need the bare URL to style yourself.
* Liquid runs. Loops and conditionals both work.

The five cart emails render the customer's real abandoned line items. They only
work inside the abandoned-checkout automation, because abandoned_checkout.* and
subtotal_price exist only in that scope.
"""

from pathlib import Path

OUT = Path(__file__).parent

FONT = "'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif"
MONO = "ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace"

LOGO = "https://cdn.shopify.com/s/files/1/0975/4509/3489/files/logo_5.png?v=1767767497"
LOGO_FOOTER = "https://cdn.shopify.com/s/files/1/0975/4509/3489/files/hnl-email-logo-footer.png?v=1786003221"

NAVY = "#142548"
INK = "#5a6b8c"
ORANGE = "#e87722"       # CTA fill only. Navy text on it measures 5.11:1.
LABEL = "#b8460a"        # the darker orange, for small text on white: 5.36:1.
                         # Plain #e87722 on white is 2.96:1 and fails AA.
PAPER = "#f4f7fb"
RULE = "#e7ecf4"
FOOT_TX = "#8194b5"

# The real line items the customer left behind.
#
# Variable names come from Shopify's custom-Liquid reference for ABANDONED
# CHECKOUT templates, not from the notification templates in
# ../email-templates/. They are different scopes and the names do not overlap:
#
#     notification template        messaging (here)
#     ---------------------        ----------------
#     line.title                   line.product_title
#     line.variant.title           line.variant_title
#     line.image + | img_url       line.image_url        (a plain URL)
#     line.line_price              -- does not exist --
#     url                          abandoned_checkout.url
#
# Two consequences worth knowing:
#   * abandoned_checkout.line_items returns only the FIRST FIVE items.
#     remaining_products_count carries the rest, shown as a "+N more" line.
#   * Shopify documents BOTH abandoned_checkout.line_items and a bare
#     line_items. Which one is live at render time is not stated, and the
#     wrong guess renders an EMPTY block with no error. So every field falls
#     back: messaging name first, notification name second. Whichever scope
#     is real, the products render.
#   * There is no per-item price in this scope. Prices are left out entirely --
#     the recovery link takes them back to a checkout that already has them.
#   * image_url returns the FULL-SIZE original. Downloading a 48 KB photo to
#     draw it at 62px is why cart images appear late. Requesting width=124
#     (2x for retina) makes the same thumbnail 3 KB -- 14x smaller.
#
#     Done as ONE filter chain on purpose:
#         | split: '?' | first | append: '?width=124'
#     split/first drops any existing ?v= cache-buster, then a single ?width is
#     appended. The obvious version -- assign + {% if src contains '?' %} ...
#     append '&width=124' -- was REJECTED by Messaging with "Syntax isn't
#     valid on line 86". Messaging's Liquid is a restricted subset: keep to
#     filter chains, avoid inline if/else and avoid '&' inside a string.
#
PRODUCT_LOOP = f"""
          <!-- ══ WHAT THEY LEFT ════════════════════════════════════════════ -->
          <tr>
            <td style="padding:28px 30px 0;" class="px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid {NAVY};">
                {{%- assign cart_items = abandoned_checkout.line_items %}}
                {{%- if cart_items == blank %}}{{%- assign cart_items = line_items %}}{{%- endif %}}
                {{%- for line in cart_items %}}
                  <tr>
                    <td valign="top" width="62" style="padding:15px 14px 15px 0; border-bottom:1px solid {RULE};">
                      <img src="{{{{ line.image_url | default: line.image | split: '?' | first | append: '?width=124' }}}}" width="62" height="62" alt="" style="display:block; width:62px; height:62px; border-radius:8px; background:{PAPER};">
                    </td>
                    <td valign="top" style="padding:15px 12px 15px 0; border-bottom:1px solid {RULE};">
                      <div style="font-family:{FONT}; font-size:15px; font-weight:700; line-height:1.4; color:{NAVY};">{{{{ line.product_title | default: line.title }}}}</div>
                      {{%- assign v = line.variant_title | default: line.variant.title %}}
                      {{%- if v != blank %}}{{%- if v != 'Default Title' %}}
                        <div style="font-family:{MONO}; font-size:11.5px; color:{INK}; padding-top:5px;">{{{{ v }}}}</div>
                      {{%- endif %}}{{%- endif %}}
                    </td>
                    <td valign="top" align="right" style="padding:15px 0; border-bottom:1px solid {RULE}; white-space:nowrap;">
                      <span style="font-family:{MONO}; font-size:14.5px; font-weight:700; color:{NAVY};">&times;&nbsp;{{{{ line.quantity }}}}</span>
                    </td>
                  </tr>
                {{%- endfor %}}
                {{%- if abandoned_checkout.remaining_products_count > 0 %}}
                  <tr>
                    <td colspan="3" style="padding:13px 0; border-bottom:1px solid {RULE}; font-family:{FONT}; font-size:13.5px; color:{INK};">
                      + {{{{ abandoned_checkout.remaining_products_count }}}} more in your cart
                    </td>
                  </tr>
                {{%- endif %}}
              </table>

            </td>
          </tr>
"""


def group_block(heading, items):
    """A titled set of lead-in/detail lines. Content, not a call to action."""
    rows = ""
    if heading:
        rows += (
            f'<div style="font-family:{MONO}; font-size:10px; font-weight:700;'
            f' letter-spacing:0.16em; color:{LABEL}; text-transform:uppercase;'
            f' padding:0 0 10px;">{heading}</div>\n              '
        )
    for lead, rest in items:
        rows += (
            f'<p style="margin:0 0 13px; font-family:{FONT}; font-size:15px;'
            f' line-height:1.6; color:{INK};">'
            f'<span style="color:{NAVY}; font-weight:700;">{lead}</span> {rest}</p>\n              '
        )
    return f"""          <tr>
            <td style="padding:24px 30px 0;" class="px">
              {rows.rstrip()}
            </td>
          </tr>
"""


def links_block(heading, items):
    """A compact run of linked category names. Used on the welcome email to
    show the whole range at a glance without seven product cards."""
    # the separator is a visible character, so it is measured too:
    # #c3ccdb on white is 1.62:1 and fails. INK is 5.36:1.
    links = f'<span style="color:{INK};"> &nbsp;·&nbsp; </span>'.join(
        f'<a href="{url}" style="font-family:{FONT}; font-size:15px; font-weight:700;'
        f' color:{LABEL}; text-decoration:none; white-space:nowrap;">{label}</a>'
        for label, url in items
    )
    return f"""          <tr>
            <td style="padding:26px 30px 0;" class="px">
              <div style="font-family:{MONO}; font-size:10px; font-weight:700; letter-spacing:0.16em; color:{LABEL}; text-transform:uppercase; padding:0 0 12px;">{heading}</div>
              <div style="line-height:2.1;">{links}</div>
            </td>
          </tr>
"""


def gallery_block(items):
    """Two photographs of real work, side by side. On a welcome email this does
    the job a paragraph cannot: it says industrial supplier rather than gift
    shop before a word is read. Stacks full width on mobile -- photographs are
    the one thing worth the extra scroll."""
    cells = ""
    for i, (src, alt) in enumerate(items):
        pad = "padding:0 7px 0 0;" if i == 0 else "padding:0 0 0 7px;"
        cells += f"""<td width="50%" valign="top" class="gcell" style="{pad}">
                      <img src="{src}" width="263" alt="{alt}" style="display:block; width:100%; max-width:263px; height:auto; border-radius:10px; background:{PAPER};">
                    </td>"""
    return f"""          <tr>
            <td style="padding:26px 30px 0;" class="px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    {cells}
                </tr>
              </table>
            </td>
          </tr>
"""


def tiles_block(heading, items):
    """A 2x2 product grid: photo, name, price. Stays 2-up on mobile -- four
    stacked full-width tiles makes a welcome email twice as long for no gain."""
    def cell(it, pad):
        img, name, price, url = it
        return f"""<td width="50%" valign="top" style="{pad}">
                      <a href="{url}" style="text-decoration:none;">
                        <img src="{img}" width="248" alt="{name}" style="display:block; width:100%; max-width:248px; height:auto; border-radius:10px; background:{PAPER};">
                        <div style="font-family:{FONT}; font-size:13.5px; font-weight:700; line-height:1.35; color:{NAVY}; padding-top:10px;">{name}</div>
                        <div style="font-family:{MONO}; font-size:12.5px; font-weight:700; color:{LABEL}; padding-top:4px;">{price}</div>
                      </a>
                    </td>"""

    rows = ""
    for i in range(0, len(items), 2):
        pair = items[i:i + 2]
        left = cell(pair[0], "padding:0 8px 20px 0;")
        right = cell(pair[1], "padding:0 0 20px 8px;") if len(pair) > 1 else '<td width="50%">&nbsp;</td>'
        rows += f"""                  <tr>
                    {left}
                    {right}
                  </tr>
"""
    return f"""          <tr>
            <td style="padding:28px 30px 0;" class="px">
              <div style="font-family:{MONO}; font-size:10px; font-weight:700; letter-spacing:0.16em; color:{LABEL}; text-transform:uppercase; padding:0 0 14px;">{heading}</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
{rows}              </table>
            </td>
          </tr>
"""


def render(slug, title, preheader, h1, body, cta, products=False, groups=(),
           links=None, gallery=None, tiles=None):
    paras = "\n              ".join(
        f'<p style="margin:15px 0 0; font-family:{FONT}; font-size:16px;'
        f' line-height:1.62; color:{INK};">{p}</p>'
        for p in body
    )

    middle = ""
    if products:
        middle += PRODUCT_LOOP
    if gallery:
        middle += gallery_block(gallery)
    if tiles:
        middle += tiles_block(*tiles)
    for heading, items in groups:
        middle += group_block(heading, items)
    if links:
        middle += links_block(*links)

    cta_text, cta_href = cta

    return f"""<!--
  HooknLoop — {title}  (Shopify Messaging)
  {'=' * (len(title) + 26)}
  Generated by build.py — edit that, not this file.

  Liquid is live in Messaging templates -- loops and conditionals both work.
  Proven by ../email-templates/abandoned-checkout.liquid, which loops over
  line_items in a live marketing email.

  No Liquid tag is written inside this comment. Liquid parses comments too,
  so a lone opening tag here would be an unclosed tag and break the file.

  Merge variables used (written bare here on purpose — a live tag inside a
  comment still gets substituted by Liquid):
      unsubscribe_link      required — Messaging rejects the template without it
      open_tracking_block   required — the open pixel
-->
<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>{title}</title>
  <style type="text/css">
    body,table,td,a {{ -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }}
    table,td {{ mso-table-lspace:0pt; mso-table-rspace:0pt; }}
    img {{ -ms-interpolation-mode:bicubic; border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }}
    body {{ margin:0 !important; padding:0 !important; width:100% !important; background:{PAPER}; }}
    a {{ color:#b8460a; }}
    @media only screen and (max-width:600px){{
      .full {{ width:100% !important; }}
      .px {{ padding-left:22px !important; padding-right:22px !important; }}
      .stack {{ display:block !important; width:100% !important; }}
      .stack-gap {{ height:22px !important; line-height:22px !important; font-size:22px !important; }}
      .btn a {{ display:block !important; text-align:center !important; }}
      .gcell {{ display:block !important; width:100% !important; padding:0 0 12px 0 !important; }}
      .gcell img {{ max-width:100% !important; }}
      .h1 {{ font-size:27px !important; line-height:1.18 !important; }}
    }}
  </style>
</head>
<body style="margin:0; padding:0; background:{PAPER};">

  <div style="display:none; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all; color:{PAPER};">
    {preheader}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{PAPER};">
    <tr>
      <td align="center" style="padding:0 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="full"
               style="width:600px; max-width:600px; margin:26px 0; background:#ffffff; border-radius:14px; overflow:hidden;">

          <!-- ══ MASTHEAD ══════════════════════════════════════════════════ -->
          <tr>
            <td style="background:#ffffff; padding:26px 30px 22px;" class="px">
              <img src="{LOGO}" alt="HooknLoop" width="180" height="32" style="display:block; width:180px; height:32px; border:0;">
            </td>
          </tr>
          <tr><td style="border-top:1px solid {RULE}; font-size:0; line-height:0;">&nbsp;</td></tr>

          <!-- ══ MESSAGE ═══════════════════════════════════════════════════ -->
          <tr>
            <td style="padding:30px 30px 0;" class="px">
              <h1 class="h1" style="margin:0; font-family:{FONT}; font-size:31px; line-height:1.14; font-weight:800; letter-spacing:-0.02em; color:{NAVY};">
                {h1}
              </h1>
              {paras}
            </td>
          </tr>

{middle}
          <!-- ══ CTA ═══════════════════════════════════════════════════════ -->
          <tr>
            <td style="padding:26px 30px 34px;" class="px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn">
                <tr>
                  <td align="center" bgcolor="{ORANGE}" style="border-radius:10px;">
                    <a href="{cta_href}" style="display:inline-block; padding:15px 30px; font-family:{FONT}; font-size:15.5px; font-weight:800; color:{NAVY}; text-decoration:none; border-radius:10px;">
                      {cta_text}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ══ FOOTER ════════════════════════════════════════════════════ -->
          <tr>
            <td style="background:{NAVY}; padding:32px 30px;" class="px">
              <img src="{LOGO_FOOTER}" alt="HooknLoop" width="164" height="29" style="display:block; width:164px; height:29px; border:0;">
              <div style="font-family:{FONT}; font-size:13.5px; line-height:1.62; color:{FOOT_TX}; padding-top:14px; max-width:430px;">
                Australian hook &amp; loop specialists — tapes, strips, dots and fasteners, stocked and dispatched locally.
              </div>

              <div style="border-top:1px solid rgba(255,255,255,0.13); margin-top:22px; padding-top:22px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td class="stack" valign="middle" style="white-space:nowrap; padding-right:18px;">
                      <a href="tel:+61340616287" style="font-family:{MONO}; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; white-space:nowrap;">+61&nbsp;3&nbsp;4061&nbsp;6287</a>
                    </td>
                    <td class="stack-gap" style="font-size:0; line-height:0; height:0;">&nbsp;</td>
                    <td class="stack" valign="middle" align="right" style="white-space:nowrap;">
                      <a href="mailto:info@hooknloop.com.au" style="font-family:{FONT}; font-size:14px; color:#c9d3e6; text-decoration:none; border-bottom:1px solid rgba(201,211,230,0.38); white-space:nowrap;">info@hooknloop.com.au</a>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="border-top:1px solid rgba(255,255,255,0.13); margin-top:22px; padding-top:16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="left">
                      <a href="https://hooknloop.com.au" style="font-family:{FONT}; font-size:13px; font-weight:700; color:#ffffff; text-decoration:none;">hooknloop.com.au</a>
                    </td>
                    <td align="right">
                      <div style="font-family:{FONT}; font-size:12px; color:{FOOT_TX};">{{{{ unsubscribe_link }}}}</div>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

  {{{{ open_tracking_block }}}}

</body>
</html>
"""


SHOP = "https://hooknloop.com.au"
# Image host for the newsletter assets. Every URL used below was checked and
# returns 200 -- a broken image in a welcome email is worse than no image.
IMG = "https://hooknloop-newsletter.vercel.app/img"
# Product shots come from the Shopify CDN, not the static host, because only
# the CDN resizes. The same four images on the static host weigh 1.11 MB; at
# width=496 they weigh 277 KB. HeavyDutyHook_Loop.png is 196 KB of that and
# cannot be shrunk further -- it is RGBA, so the CDN refuses jpg conversion.
# Re-export it flat on white and it drops to roughly 30 KB.
CDN = "https://cdn.shopify.com/s/files/1/0975/4509/3489/files"
ALL = f"{SHOP}/collections/all"

# Copy is carried over verbatim from the Klaviyo/Brevo originals in
# ../email-templates/. Klaviyo tags become Messaging tags, logic tags are
# dropped, and the {% if first_name %} greeting goes with them -- Messaging
# has no conditional, and a greeting that renders ", " for a missing name
# reads worse than no greeting at all.
# The two recovery emails carry nothing but the cart: logo, one line of
# headline, the customer's actual line items, the button. Any explanatory copy
# competes with the products for the only click that matters.
EMAILS = [
    dict(
        slug="abandoned-checkout",
        title="You are one step away",
        preheader="Your cart and your details are saved. Nothing to re-enter.",
        h1="You are one step away.",
        body=[],
        products=True,
        cta=("Complete your order &rarr;", "{{ abandoned_checkout.url | default: url }}"),
    ),
    dict(
        slug="abandoned-cart",
        title="Your cart is still here",
        preheader="Everything you added is still saved. Nothing to re-enter.",
        h1="Your cart is still here.",
        body=[],
        products=True,
        cta=("Complete your order &rarr;", "{{ abandoned_checkout.url | default: url }}"),
    ),
    dict(
        slug="01-thank-you",
        title="Thanks for your order",
        preheader="We're packing your order now.",
        h1="Thanks for your order.",
        body=["We're packing it now. You'll get an email with a tracking link as soon as it's on its way."],
        cta=("View your order &rarr;", SHOP),
    ),
    dict(
        slug="02-how-to-use-it",
        title="Getting it to hold",
        preheader="A few minutes of prep is the whole difference.",
        h1="Getting it to hold.",
        body=["Your order should be with you. Whichever type you bought, a few minutes of prep is the difference between something that holds and something that lets go."],
        groups=[
            ("Adhesive", [
                ("Clean it and let it dry.", "Dust, grease and polish all stop tape sticking. Methylated spirits works well."),
                ("Smooth surfaces work best.", "Metal, glass, plastic, sealed wood. Bare brick and flaking paint won't hold."),
                ("Press hard, then leave it a day.", "Press the whole strip, not just the ends. The glue keeps getting stronger for about 24 hours."),
                ("Going outside or somewhere hot?", "Use the heavy duty grade — standard tape softens and slides."),
            ]),
            ("Sew-on", [
                ("Pin it and close it once before you sew,", "to check it lines up."),
                ("Sew round the edge only.", "Stitching across the middle flattens it and it won't grip as well."),
                ("Use a heavy needle and polyester thread.", "A thin one will skip stitches and snap."),
            ]),
            ("Dots", [
                ("Put them near the corners.", "Four spread out hold far better than four bunched in the middle."),
                ("Press each one properly and give them an hour before you hang anything.", "They're small, so they need the time more than tape does."),
            ]),
            ("Straps", [
                ("Snug is enough.", "Over-tightening wears the strap out and can damage cables."),
                ("Store them closed.", "Left open they pick up dust and sawdust and stop gripping."),
            ]),
        ],
        cta=("Shop the range &rarr;", ALL),
    ),
    dict(
        slug="10-second-order",
        title="Need any more?",
        preheader="Still in stock, still goes out fast.",
        h1="Need any more?",
        body=[
            "It's been about a month since your order. Everything you bought is still in stock and still goes out fast, so ordering again is quick.",
            "Buying for work? We do better prices on larger orders and can keep your usual sizes on file.",
        ],
        cta=("Order again &rarr;", ALL),
    ),
    dict(
        slug="11-replenishment",
        title="Running low?",
        preheader="Same thing again, if you need it.",
        h1="Running low?",
        body=["You've had this a while, so you might be getting near the end of it. Here's the same thing again, so you don't have to dig out your old order to check what you bought."],
        cta=("Order it again &rarr;", f"{SHOP}/products/self-adhesive-hook-and-loop-roll"),
    ),
    dict(
        slug="12-win-back",
        title="Been a while",
        preheader="Still in stock, still goes out fast.",
        h1="Been a while.",
        body=["It's been about six months since you last ordered from us. Everything's still in stock and still goes out fast, so if you've got something coming up we're here."],
        cta=("Shop the range &rarr;", ALL),
    ),
    dict(
        slug="13-cart-1-you-left-items",
        title="You left items at checkout",
        preheader="Your cart is still here.",
        h1="You left items at checkout.",
        body=["Your cart is still here if you want to finish off."],
        products=True,
        cta=("Finish your order &rarr;", "{{ abandoned_checkout.url | default: url }}"),
    ),
    dict(
        slug="14-cart-2-complete-your-order",
        title="Complete your order",
        preheader="Still in stock, and we can help if you're unsure.",
        h1="Complete your order.",
        body=[
            "Everything in your cart is still in stock and ready to go out.",
            "One thing worth checking: hook and loop only stick to each other. If your cart has one side, you'll usually need the other too.",
        ],
        products=True,
        cta=("Complete your order &rarr;", "{{ abandoned_checkout.url | default: url }}"),
    ),
    dict(
        slug="15-cart-3-we-saved-your-cart",
        title="We saved your cart for you",
        preheader="Last one from us about this.",
        h1="We saved your cart.",
        body=[
            "It's still here whenever you want it. This is the last we'll mention it.",
            "Changed your mind? No problem — ignore this one.",
        ],
        products=True,
        cta=("View your cart &rarr;", "{{ abandoned_checkout.url | default: url }}"),
    ),
    # The welcome has to earn the subscription, so it opens with the single
    # thing customers most often get wrong rather than with a thank-you and
    # nothing else. The three facts are the copy recovered from the dropped
    # 16-browse email -- real, already approved, and genuinely useful.
    #
    # No shipping threshold is quoted: the repo records it as both $200 and
    # $300 and it is not worth telling a brand-new subscriber the wrong one.
    dict(
        slug="17-welcome-subscriber",
        title="Thanks for signing up",
        preheader="What we stock, and why it holds.",
        h1="You're in.",
        # No frequency promise. "Once or twice a month, no more" is defensive --
        # it answers a spam worry the reader had not raised yet, and a brand
        # that leads by reassuring you it won't bother you sounds like one that
        # expects to. State what arrives instead, and let the footer carry the
        # unsubscribe.
        body=[
            "New stock, the occasional offer, and what actually holds.",
        ],
        groups=[
            ("Why it holds", [
                ("Industrial-grade acrylic adhesive.", "Bonds to metal, glass, plastic and sealed wood, and keeps getting stronger for about 24 hours."),
                ("No drilling, no screws.", "Installs without permanent fixing, so it goes on in minutes."),
                ("Won't fray or lose grip.", "Stands up to daily use, opened and closed again and again."),
                ("A grade for every job.", "Heavy duty for heat and outdoors, sew-on for anything that gets washed."),
            ]),
        ],
        gallery=[
            (f"{IMG}/applications/panel-mount.jpg",
             "A hook and loop strip holding a panel to the wall"),
            (f"{IMG}/applications/cable-management.jpg",
             "Cabling bundled on site with hook and loop straps"),
        ],
        tiles=("What we stock", [
            (f"{CDN}/Untitled-1_29.jpg?width=496",
             "Self Adhesive Hook and Loop Roll", "from $32.90",
             f"{SHOP}/products/self-adhesive-hook-and-loop-roll"),
            (f"{CDN}/HeavyDutyHook_Loop.png?width=496",
             "Heavy Duty Adhesive Fastener", "from $55.43",
             f"{SHOP}/products/heavy-duty-adhesive-hook-and-loop"),
            (f"{CDN}/black-hook-50-mm-copy.jpg?width=496",
             "Sew On Hook and Loop", "from $24.46",
             f"{SHOP}/products/sew-on-hook-and-loop-fastener"),
            # single variant, so no "from" -- there is no range to be from.
            # Checked against the live store: 1 variant at $25.00.
            (f"{CDN}/Image_of_1.png?width=496&amp;format=jpg",
             "Reusable Cable Straps &amp; Ties", "$25.00",
             f"{SHOP}/products/hook-and-loop-adjustable-strap"),
        ]),
        cta=("Shop the range &rarr;", ALL),
    ),
]


def main():
    for e in EMAILS:
        slug = e.pop("slug")
        (OUT / f"{slug}.html").write_text(render(slug, **e))
        print(f"  wrote {slug}.html")
    print(f"\n{len(EMAILS)} templates written to {OUT}")


if __name__ == "__main__":
    main()
