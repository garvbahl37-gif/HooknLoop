# HooknLoop — logo design prompts

Briefs for generating logo concepts that sit correctly inside the redesigned
storefront, rather than against the older brand.

## Read this first — how to actually use these

**Image generators cannot set type.** Ask DALL·E/Midjourney for a wordmark and
you will get `HOOKnL00P`, `HOCKnLOOP`, or convincing gibberish — every time,
including when the prompt says the spelling twice. So:

1. **Generate the *mark* only** (the symbol, no lettering) using the directions
   below. That is the part image generation is genuinely good at.
2. **Set "HooknLoop" yourself in DM Sans** — the site already self-hosts it at
   `/fonts/DMSans-var.woff2`. Weight 800, letter-spacing −0.02em.
3. **Have the winner redrawn as vector.** Everything here produces a raster
   concept. A logo has to be an SVG: the header renders it at 30px tall on
   mobile, and a PNG at that size will look muddy.

Treat these as concept generators, not as a finished asset.

---

## The brand, in the terms a designer needs

**What it is:** an Australian supplier that sells hook and loop fastening and
nothing else. Four years old, garage warehouse to nationwide, 26+ industries,
public and private sector, retail through to wholesale pallet quantities.

**How the site reads:** industrial but *premium* — a trusted trade supplier,
not a discount bin. Calm, warm, confident. Navy fields with a single orange
action colour. Tight machined radii (14px cards, 10px controls) rather than
soft friendly bubbles. Nothing clinical, nothing startup-y.

**The idea worth keeping:** the existing logo turns the two O's in HOOK into
concentric spiral tape rolls, and sets the lowercase **n** in orange as the
connector between HOOK and LOOP. That "n" is the smartest thing in the current
mark — it is literally the join, in the brand's action colour. Any new
direction should either keep it or beat it.

**Palette — use these exact values.** The current logo sits on `#003b98` /
`#f58422`, which is slightly off from the site it now lives in. Pull it on to
the site tokens:

| Role | Hex |
|------|-----|
| Navy (primary) | `#142548` |
| Navy deep | `#0f1d3a` |
| Orange (the one accent) | `#e87722` |
| Orange ink (orange *as text* on white, AA) | `#b8460a` |
| Off-white / reversed | `#ffffff` |

Orange is a **fill**, never body text. One accent per lockup — if two things
are orange, neither reads as the point.

---

## Shared constraints — append to every direction

```
CONSTRAINTS: Flat vector-style logo design, no photorealism, no 3D bevels, no
gradients, no drop shadows, no glow. Must survive being reduced to 30 px tall
and still be identifiable. Must work in a single flat colour (test it as solid
navy on white and solid white on navy). Clean geometric construction, tight
machined curves, no soft blobby rounding. Centred on a plain flat background
with generous even margin. Palette strictly: navy #142548, orange #e87722,
white — no other colours.

NEGATIVE: no text, no letters, no words, no typography, no watermark, no
signature, no tagline, no mockup, no business card, no letterhead, no stationery
flat-lay, no multiple variations in one image, no grid of options, no drop
shadow, no gradient mesh, no photorealistic tape, no hands, no swoosh clichés,
no generic globe, no generic checkmark, no shield.
```

---

## Direction 1 — The coil *(recommended — closest to existing equity)*

Keeps the tape-roll idea from the current logo but rebuilds it as a proper mark
that can stand alone as an app icon or favicon.

```
A minimal geometric logo mark of a roll of tape seen face-on: a set of precise
concentric circles with a single clean break where the tape end lifts away from
the roll and curls outward. The lifted end is rendered in orange #e87722; the
roll itself in navy #142548. The curl should read unmistakably as a strip of
material peeling away, not as an arrow or a comma. Even, deliberate spacing
between the concentric rings — engineered, like a technical drawing, not hand
sketched. Perfectly circular overall silhouette so it drops into a round app
icon without cropping.
```

---

## Direction 2 — The interlock

Leans on the *fastening* rather than the product. Abstract, more ownable, less
literal — the direction most likely to still look right in ten years.

```
A minimal geometric logo mark of two interlocking forms: one shaped from a row
of small hooks, its partner from a soft continuous loop, meeting and meshing
along a single vertical seam down the centre. The two halves should read as
distinct materials that belong together — the hook side crisper and toothed,
the loop side rounded and continuous. Left half navy #142548, right half orange
#e87722, meeting exactly on the centre line. Strong negative space; the seam
where they join is the focal point of the mark. Balanced square silhouette.
```

---

## Direction 3 — The monogram n

Takes the strongest existing idea — the orange **n** as the connector — and
makes it the whole mark.

```
A minimal geometric monogram built from a single lowercase letter n, where the
arch of the n is formed by a strip of material curving over and hooking under
itself, as if a length of tape has been bent into the letterform and fastened
back on its own surface. Navy #142548 for the stem, orange #e87722 for the
curved arch that does the fastening. The overlap where the strip meets itself
should be clearly visible — that join is the entire idea. Square silhouette,
confident weight, engineered curves.
```

---

## What to ask for once a direction wins

- **Horizontal lockup** — mark + "HooknLoop" + `.com.au`, for the header
- **Stacked lockup** — for the footer and square placements
- **Mark alone** — favicon, app icon, social avatar
- **Reversed** — white on navy (the footer and hero are navy fields)
- **Single-colour** — one flat navy, for invoices, packing slips and embroidery

Deliver as SVG. Drop the files at `storefront/public/img/logo-header.svg` and
`logo-footer.svg`, keeping those exact filenames — the header and footer
reference them by path, so nothing in the code needs to change.

**Test it before committing:** shrink to 30 px tall, then squint. If the tape
roll turns into a dot, or the interlock turns into mush, the mark is too
detailed for where it has to live.
