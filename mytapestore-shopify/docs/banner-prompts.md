# Banner image prompts — category & product pages

Prompts for generating banner art (GPT-4o / DALL·E / Midjourney). Written against
how this theme actually renders banners, not generic "make a nice hero" wording.

---

## The constraints these prompts are built around

Read this once — it's why the prompts look the way they do.

**1. A heavy dark scrim sits on top of every category banner.**
`.colban__scrim` lays a radial gradient over the image from `rgba(11,9,7,.66)` in
the middle to `.9` at the edges. Roughly two-thirds of the image's brightness is
gone before anyone sees it. So:

- Generate **bright, high-key** images. Anything already moody turns to mud.
- **Keep the centre simple.** White title, breadcrumbs and a trust row sit dead
  centre in a 840px column. Detail there is wasted.
- Put the subject **off to one or both sides**, weighted to the outer thirds.

**2. Wide and short.** Rendered at 2000px wide, roughly 300–340px tall on desktop
and cropped `center/cover`. Generate **2400 × 800 (3:1)** and keep anything
essential inside the middle 60% horizontally — the sides crop on narrow screens.

**3. No text in the image.** The theme draws the heading. Baked-in words will
collide with it and can't be translated or edited.

**4. Brand palette** — feed these hexes in explicitly:

| Token | Hex | Use in the image |
|---|---|---|
| brand | `#df3c22` | the one hot accent — tape core, safety detail |
| brand-on-dark | `#ee5f3a` | warm highlights against the dark scrim |
| ink | `#1f1f1f` | charcoal tooling, workbench shadow |
| panel | `#faf9f7` | off-white paper, bright surfaces |
| line-2 | `#d3cfc9` | warm grey concrete, kraft tone |

**5. House style.** Real photography, not illustration or 3D render. Australian
trade context. Honest working materials — kraft paper, galvanised steel, timber,
concrete, cardboard. No stock-photo handshakes, no smiling models facing camera,
no floating product on pure white.

---

## Reusable style block

Append this to every prompt below. It's the part that keeps 60 banners looking
like one store.

```
STYLE: Wide cinematic product photography, 2400x800, 3:1 aspect ratio.
Bright, high-key, evenly lit — this image will be darkened ~65% by an overlay,
so expose it one stop brighter than looks correct. Shallow depth of field.
Subject weighted to the left and right thirds; the horizontal centre stays
visually quiet and uncluttered for a text overlay. Warm neutral palette of
off-white #faf9f7, warm grey #d3cfc9 and charcoal #1f1f1f, with a single hot
accent of #df3c22 . No text, no words, no logos, no watermarks, no people
looking at camera. Photographic realism, natural light, Australian workshop or
warehouse context.
```

---

## Category banners still missing art

These five collections have no image and currently fall back to the flat
charcoal gradient.

### Bestsellers
```
A warm overhead shot of an Australian trade counter: an open cardboard carton
with several rolls of adhesive tape standing upright inside — clear packaging
tape, silver cloth duct tape, blue painter's masking tape — plus a hand-held
tape dispenser resting beside it on pale timber. Rolls clustered left and right,
counter surface open through the middle. One roll's core is a hot #df3c22.
[+ STYLE block]
```

### Bumpers Tapes
```
Extreme close-up macro of a sheet of clear self-adhesive rubber bumper dots on
release paper, tilted so the domes catch a rim of light, next to a brushed
aluminium cabinet door edge and a small screwdriver. Sheet sits on the left
third, cabinet hardware on the right, clean pale surface across the centre.
[+ STYLE block]
```

### Tissue Tape (double-sided)
```
A roll of white double-sided tissue tape partly unspooled across a bright
workbench, one end lifted to show the translucent liner peeling back, with a
stack of cut foam-board samples and a steel rule alongside. Roll on the left,
samples on the right, empty pale bench through the middle.
[+ STYLE block]
```

### Glue Dots
```
Macro photograph of a coil of clear adhesive glue dots on a paper liner curling
across a kraft-brown surface, catching the light so the dots read as glossy
beads, with a folded retail carton and a small brush at the right edge.
[+ STYLE block]
```

### Hook and Loop Dots
```
Close-up of black hook-and-loop circular dots — some hook side up showing the
tiny stiff hooks, some soft loop side — scattered and half-attached to a pale
grey display panel, with a strip of the same dots on release paper entering from
the left. Panel surface stays clean through the centre.
[+ STYLE block]
```

---

## Category-family prompts (reuse for any collection)

Rather than 60 one-offs, generate one banner per family and share it across the
collections in that family. Swap the subject line, keep the style block.

**Double-sided tapes** —
```
A roll of double-sided tape with its red release liner peeling away in a smooth
curl, mounted mid-air over a bright workbench where two acrylic panels are being
bonded, offcuts and a roller at the right edge.
```

**Single-sided / packaging tapes** —
```
A pistol-grip tape gun mid-stroke sealing a brown cardboard carton, the clear
tape catching a highlight, a stack of sealed cartons receding at the right, pale
warehouse floor open through the centre.
```

**Masking tapes** —
```
Crisp blue painter's masking tape being laid along the edge of freshly painted
white trim, a paintbrush and half-open paint tin at the right, the wall surface
clean and bright across the middle.
```

**Cloth / duct tapes** —
```
A roll of silver cloth duct tape standing on a galvanised steel toolbox lid with
a torn strip attached to a timber batten, workshop tools softly out of focus at
the far right.
```

**Foil / thermal tapes** —
```
Aluminium foil tape being smoothed onto insulated ducting with a plastic
applicator, the foil throwing a bright specular highlight, ducting running out of
frame at both sides, clean space through the centre.
```

**Hook & loop** —
```
A coil of black hook-and-loop strap unrolled across a pale bench, one end wrapped
around a bundled cable loom, the hook texture sharp in macro at the left edge.
```

**Dispensers** —
```
Three tape dispensers arranged on a pale concrete surface — a heavy weighted
desk dispenser, a pistol-grip gun and a compact handheld — lit from the side,
grouped to the left and right with the concrete open between them.
```

**Safety / line-marking tapes** —
```
Black-and-yellow hazard tape and a strip of #df3c22 line-marking tape applied to
a polished warehouse floor forming a walkway edge, racking legs blurred in the
background, floor open through the centre.
```

---

## Product-page banner

⚠️ **There is no banner slot on the product template today** — product pages lead
with the gallery. If you want one, it'd sit as a full-width band between the buy
row and the description. Tell me and I'll add the section; these are the prompts
for when it exists.

Because it sits mid-page against white (no dark scrim), this one is styled the
opposite way — **light, airy, no overlay compensation**.

**Trust / dispatch band**
```
A bright Australian dispatch bench: sealed cartons with clean tape seals stacked
at the left, a roll of packing tape and a scanner at the right, pale timber and
off-white #faf9f7 surfaces, soft daylight from a high window, generous empty
space across the middle third.
STYLE: Wide photography, 2400x700, light and airy, natural daylight, warm
neutral palette with a single #df3c22 accent, shallow depth of field, no text,
no logos, no people facing camera.
```

**Application / how-it's-used band**
```
Three small vignettes of the same tape in use across one continuous bright
workbench — bonding a sign panel, sealing a carton, bundling cable — separated by
clean empty bench space, shot from directly above, soft even daylight.
STYLE: Wide flat-lay photography, 2400x700, top-down, light and airy, warm
neutral palette with a single #df3c22 accent, no text, no logos, no hands
obscuring the products.
```

**Bulk / volume band** (pairs with the price-break table)
```
A pallet of shrink-wrapped cartons of adhesive tape in a clean Australian
warehouse, forklift softly blurred in the background at the right, polished
concrete floor bright and open across the foreground.
STYLE: Wide photography, 2400x700, bright warehouse daylight, warm neutral
palette with a single #df3c22 accent, shallow depth of field, no text, no logos.
```

---

## After generating

1. Export **JPG, quality ~82, 2400px wide** — these are background images, PNG
   just triples the weight for no visible gain.
2. Category banners: Admin → Products → Collections → *(collection)* → **Image**.
   The theme picks it up automatically; the per-section "Banner image override"
   is only for one-offs.
3. Keep filenames descriptive (`banner-masking-tapes.jpg`) — they become the
   image's alt fallback in some contexts.
4. Check one on mobile before doing the rest. `center/cover` cropping at 390px
   wide is the harshest test of "is the subject too close to the edge".

---

## Premium collection banners — Foam Tape Double Sided, Hook & Loop, Glazing Tapes

Three collections that currently share the generic family art. These are written
as **hero-grade one-offs**: each leads with the one thing that makes that tape
visually different from every other roll in the catalogue, because at banner size
a roll of tape is a roll of tape unless the photograph says otherwise.

> **Regenerate at 2400 × 800.** The art in the theme today is 1600 × 893 (1.79:1)
> while the band renders at roughly 3:1, so the current images are cropped hard
> top and bottom and then upscaled. Generating at 3:1 fixes both.

Append the **STYLE block** above to each of these.

### Foam Tape Double Sided
*The distinguishing feature is THICKNESS.* Every other double-sided tape is a
film; this one has a visible cross-section. Shoot the edge of the roll.

```
A roll of white double-sided PE foam mounting tape standing on its edge on a
bright workbench, photographed low and close so the foam's 3mm cross-section
reads clearly along the roll's rim, with its red release liner peeling away in a
long relaxed curl toward the right of frame. At the right third, an aluminium
composite sign panel is being pressed onto a painted steel upright, a thin
shadow-gap showing the foam compressing under it. Roll and liner occupy the left
third, the panel and hand the right third, pale bench surface open and uncluttered
across the middle. The release liner is a hot #df3c22 — the only saturated colour
in the frame. Natural side light rakes across the foam so its cell texture is
visible.
[+ STYLE block]
```

### Hook & Loop Tape
*The distinguishing feature is the TWO MATING FACES.* A single black strap reads
as webbing; the banner has to show hook and loop as different materials.

```
Extreme macro on the left third: a strip of black hook-and-loop tape being pulled
apart mid-frame, the hook face and the loop face separating with the individual
stiff hooks catching a hard rim light and the soft looped pile stretching between
them. The strip runs out of the left edge and continues across the bench, where at
the right third a bundled cable loom is wrapped and cinched with the same tape
against a pale grey equipment panel. Self-adhesive backing rolls loosely at the
far right with a #df3c22 core visible. Bench surface stays clean and bright through
the horizontal centre. Lit to separate the two textures — the hooks sharp and
specular, the loops matte and soft.
[+ STYLE block]
```

### Glazing Tapes
*The distinguishing feature is the CONTEXT — glass and aluminium.* Shot on the
bench it looks like any black foam strip; shot in a window frame it is unmistakable.

```
An Australian glazier's bench in bright daylight: a length of black closed-cell
foam glazing tape being laid along the inner channel of a powder-coated aluminium
window frame, the frame running diagonally out of the left edge, the tape's
release paper trailing behind the hand. At the right third, a pane of clear glass
rests upright in a padded rack with a suction-cup lifter attached, its edge
catching a clean vertical highlight. The tape roll sits on the bench at the far
left with a #df3c22 label edge. Pale concrete and brushed aluminium throughout,
the middle of the frame left open and quiet. Cool daylight from a high workshop
window, with the glass throwing a soft caustic onto the bench.
[+ STYLE block]
```
