# HooknLoop hero banner prompts

For generating the first three hero banners in ChatGPT / GPT image.

## Before you start

**Upload your real product photos as references** with every prompt. Without
them the model invents a generic black roll and drops your branding — that is
exactly what went wrong in the automated attempt.

**Target size:** 2400 × 1080 (21:9 ultra-wide). If the model will not do 21:9,
use 16:9 and crop.

**The headline is NOT in the image.** It is HTML text laid over the banner, so
the `<h1>` keeps working for SEO and resizes properly on phones. Every prompt
therefore reserves the left 45% as empty background. Do not let the model put
anything there, and do not ask it to write the heading — generated type comes
out mangled.

## The palette — paste these hex values, do not describe the colours

| Role | Hex |
|---|---|
| Deepest navy | `#0F1D3A` |
| Navy | `#142548` |
| Brand blue | `#1952CC` |
| Blue highlight | `#2E6AE0` |
| Orange accent | `#E87722` |

---

## Banner 1 — "Hook and Loop Tape, Strips & Fasteners"

```
Ultra-wide 21:9 hero banner for a premium Australian industrial hook-and-loop
fastener supplier.

PRODUCT FIDELITY IS THE PRIORITY: reproduce the products in the uploaded
reference images exactly — the same black hook-and-loop weave, the same spool
shapes, the same white circular labels with the blue HooknLoop wordmark and
printed checkbox grid. Do not redesign, recolour, simplify or invent any
product. Do not add products that are not in the references. The printed labels
must stay legible and unchanged.

COMPOSITION: the left 45% of the frame is empty background — no products, no
objects, no detail. All products sit in the right 55%, arranged as a family
group with real depth: one spool standing upright and facing camera as the hero,
two more angled behind it at smaller scale, and a length of tape uncoiling
forward across the surface to show the hook texture close up. Products must not
overlap so heavily that any label is obscured.

BACKGROUND: deep navy studio gradient from #0F1D3A in the upper left to #142548,
with a soft brand-blue #1952CC bloom behind the product group so the black weave
separates from the field. A single low warm #E87722 glow along the floor behind
the products — subtle, one note only, never washing the scene orange.

LIGHTING: large soft key from the upper right raking across the weave to reveal
texture, cool fill from the left, gentle contact shadows grounding each product.
Slight reflection on a dark satin surface.

STYLE: premium industrial catalogue photography, 50mm lens at f/8, everything
tack sharp, engineered and precise. Photographic, not a 3D render, not a collage.

EXCLUDE: no text, no words, no letters, no numbers, no added logos, no
watermarks, no people, no hands, no tools, no props, no plants.
```

## Banner 2 — "Industrial Strength. Reliable Grip."

Same as Banner 1, with these two blocks swapped in:

```
COMPOSITION: the left 45% is empty background. In the right 55%, the heaviest
products from the references only — heavy-duty adhesive spools and industrial
straps. Stack them with weight and mass: one large spool dominant and low in
frame, straps coiled beside it, a strip of tape peeled back to show the adhesive
backing. The arrangement should read as strength and load capacity.

LIGHTING: harder, more directional key from the upper right with deeper falloff
and stronger contrast than a soft studio setup — closer to workshop lighting.
Keep shadows crisp but not black-crushed.
```

## Banner 3 — "Premium Quality Products"

Same as Banner 1, with these two blocks swapped in:

```
COMPOSITION: the left 45% is empty background. In the right 55%, a considered
still-life of the finest products from the references — spools presented at
slight angles like objects in a showcase, generous space between them, nothing
crowded. Fewer products, more air. It should feel curated rather than stacked.

LIGHTING: soft, even, gallery-like. Large diffused source, minimal harsh shadow,
a faint specular highlight along each spool edge. Calm and expensive.
```

---

## If the products still come out wrong

They probably will on the fine detail — image models reliably mangle small
printed type, so the label text is the first thing to break. Two options:

**Generate the background only.** Delete the PRODUCT FIDELITY and COMPOSITION
blocks, and ask for just the lit navy studio scene with an empty surface and the
left 45% clear. Then drop your real product PNGs on top in Canva or Figma. The
products are then pixel-exact because they are your photographs. This is the
only method that guarantees correct branding.

**Fix your product photography.** Of your ten product shots, only three can be
cut out cleanly — the rest have mirrored reflections or inset detail photos
composited into them. Plain white background, no reflection, no insets, and both
this and any future banner work becomes trivial.

## When the banners are ready

Send them over and I will switch the hero from the framed-card layout to
full-bleed image with the headline overlaid, keeping the existing titles.
