# HooknLoop — Application Image Prompts (Product Slider)

Two in-use "application" shots per product, to sit after the packshot in each
product's gallery slider. Applications are taken from each product's real
`applications` list in `src/data/catalog.js`, so the imagery matches what the
page actually claims the product is for.

## Before you generate — read this

**Aspect ratio: 1:1 (square), 2048×2048.**
The gallery frame (`.pdp__stage`) is `aspect-ratio: 1` with `object-fit: contain`.
A non-square image letterboxes against the pale `--cloud` panel and looks broken.
Square is not a style choice here — it is what the slot is.

**File naming** — drop into `storefront/public/img/products/` and append to the
product's `PRODUCT_IMAGES` array in `catalog.js`:
`<handle>-app-1.jpg`, `<handle>-app-2.jpg`

---

## Global style block — paste into EVERY prompt

Append this to each prompt below verbatim. It is what makes twelve separately
generated images read as one photographic system rather than twelve stock photos.

```
STYLE: Photorealistic commercial product photography, shot on a Canon EOS R5 with
an 85mm f/1.8 lens. Shallow-but-controlled depth of field (f/4) — the hook and loop
fastening is tack sharp, the background falls away softly. Natural daylight from a
large window at 45 degrees camera-left, plus a subtle fill card camera-right; no
harsh shadows, no on-camera flash. Clean, calm, premium industrial-supply mood —
the visual register of a trusted Australian trade supplier, not a discount bin.
Muted, desaturated environment palette (cool greys, natural timber, off-white
walls, brushed metal) so the product reads as the only saturated thing in frame.
Realistic materials and honest wear — this is a working environment, not a showroom.
Composition: product occupies the centre-left third, deliberate negative space
camera-right. Square 1:1 crop, 2048x2048, high detail, sharp micro-texture on the
nylon hook and loop weave.

NEGATIVE: no text, no logos, no watermarks, no brand names, no lettering of any
kind, no visible faces, no hands with distorted or extra fingers, no plastic
CGI-render look, no HDR halos, no oversaturation, no orange-and-teal grade, no
lens flare, no confetti bokeh, no stock-photo smiling models, no cluttered
background, no tilted horizon.
```

---

## 1. Self-Adhesive Hook & Loop Roll — `self-adhesive-roll`

*Applications: wall panels, access doors, signage · caravan/RV trims · machine covers · tool boards*

**app-1 — Construction / access panel**
```
A tradesperson's gloved hands pressing a white acoustic wall panel onto a plasterboard
wall, four strips of 50mm black self-adhesive hook and loop tape visible on the back
edge of the panel where it meets the wall. Half-finished commercial fit-out in the
background — bare stud framing, a spirit level resting on a sawhorse, soft daylight
from an unglazed window opening. The adhesive backing paper is peeled halfway on one
strip, showing the tape is being applied right now. Focus on the tape-to-wall contact.
```

**app-2 — Workshop tool board**
```
A garage tool board on a raw plywood wall, with hand tools mounted on black
self-adhesive hook and loop strips instead of hooks — a spirit level, a tape measure
and a set of pliers each backed with a square of tape. One tool lifted slightly away
from the board mid-removal, so the hook and loop separation is visible and reads as
reusable. Warm workshop light, sawdust on the bench below, muted timber and steel
palette.
```

---

## 2. Sew-On Hook & Loop (Non-Adhesive) — `sew-on`

*Applications: clothing & garments · upholstery · bags & backpacks · curtains & cushions · tailoring*

**app-1 — Industrial sewing machine**
```
A length of 25mm black sew-on hook and loop tape running under the presser foot of an
industrial sewing machine, being stitched onto navy canvas workwear. The needle is
mid-stitch, a straight line of stitching already laid down along the tape edge. Spools
of thread out of focus behind, a pair of fabric shears resting on the machine bed.
Machine-shop daylight, brushed metal and matte black machine body.
```

**app-2 — Upholstery / cushion cover**
```
Close crop of a linen cushion cover being opened at its seam, revealing a strip of
white sew-on hook and loop tape neatly stitched inside the closure — the two halves
peeling apart. A neutral upholstered armchair softly out of focus behind. Calm,
domestic, natural-fibre palette; oatmeal, warm grey, pale timber.
```

---

## 3. Self-Adhesive Hook & Loop Dots — `hook-and-loop-dots`

*Applications: craft & DIY · lightweight signs & posters · stationery & teaching aids · classroom organisation*

**app-1 — Classroom visual schedule**
```
A primary-school classroom wall chart with laminated activity cards being placed onto
a felt-backed board, each card fixed by a single 22mm white hook and loop dot visible
on its reverse as the card is lifted. A teacher's hand (adult, plain, no jewellery)
positioning one card. Bright, soft classroom daylight; children's artwork blurred well
out of focus in the background so no drawings are legible.
```

**app-2 — Reel of dots on a craft bench**
```
An open reel of black self-adhesive hook and loop dots on a pale timber craft bench,
a short tail of the release liner unspooled with six dots still attached and two dots
already peeled and stuck to a small mounting board beside it. Scissors and a steel
ruler arranged loosely at the frame edge. Overhead soft daylight, clean flat-lay at a
slight three-quarter angle rather than dead top-down.
```

---

## 4. Reusable Hook & Loop Cable Straps — `reusable-cable-straps`

*Applications: electrical & data cables · workstation cable management · IT/AV & networking · bundling power cords*

**app-1 — Server rack / data cabinet**
```
A network cabinet with Cat6 patch leads bundled into tidy vertical runs, each bundle
held by a black reusable hook and loop cable strap wrapped and fastened back on itself.
One strap being pulled open by a technician's hand to add a lead, showing the reusable
fastening. Cool cabinet lighting, dark powder-coated steel, blue and grey cable
sheathing as the only colour.
```

**app-2 — Desk cable management**
```
Under-desk view of a home-office workstation, power leads and a monitor cable gathered
into a single tidy bundle by two black hook and loop cable straps fixed along a steel
desk frame. A coiled charger cable hanging neatly beside, also strapped. Clean minimal
desk, pale timber top, soft daylight from the left, deliberately calm and uncluttered.
```

---

## 5. Double-Sided Hook & Loop (Back-to-Back) — `double-sided`

*Applications: bundling hoses, cords & ropes · securing tools & equipment · workshop & IT organisation*

**app-1 — Coiled hose on a workshop wall**
```
A coiled air hose hanging on a workshop wall, cinched by a wrap of 25mm black
back-to-back hook and loop tape that grips itself with no adhesive — the tail of the
wrap held slightly open so the self-gripping face is visible. Concrete block wall,
compressor faintly out of focus, industrial grey and black palette with the hose as
the one warm accent.
```

**app-2 — Rope and extension lead bundle**
```
Two bundles side by side on a galvanised steel shelf — a coiled orange extension lead
and a length of rope — each secured with a wrap of black double-sided hook and loop
tape. One wrap partly unwound mid-frame to show the material gripping only itself,
no glue residue. Cool workshop daylight, steel shelving, muted greys.
```

---

## 6. Heavy-Duty Hook & Loop Straps — `heavy-duty-straps`

*Applications: cartons on pallets · warehouse bundling · load stabilising · reusable pallet strapping*

**app-1 — Pallet load restraint**
```
A stacked pallet of cardboard cartons in a warehouse aisle, wrapped and secured by a
wide 50mm orange-and-black heavy-duty hook and loop strap pulled taut around the load
and fastened back on itself. A pallet jack in the foreground, racking receding out of
focus behind. High-bay warehouse light, concrete floor, muted greys so the orange
strap is the clear focal point.
```

**app-2 — Strap in hand, being fastened**
```
A warehouse worker's hands pulling a heavy-duty orange and black hook and loop strap
tight around a bundle of timber lengths, mid-fastening, the strap tail about to press
down onto the hook face. Tension visible in the webbing. Loading-dock daylight, hi-vis
sleeve just visible at the frame edge, industrial concrete and timber palette.
```

---

## 7. Heavy-Duty Adhesive Hook & Loop — `heavy-duty-adhesive`

*Applications: construction panels · automotive & caravan/RV trims · machine covers & insulation · garage*

**app-1 — Caravan / RV interior trim**
```
The interior of a caravan, a removable upholstered wall trim panel being lifted away
from the cabin wall, revealing strips of 50mm black heavy-duty adhesive hook and loop
holding it. Cabinetry and a window with the blind half-drawn behind. Warm interior
daylight, pale timber veneer, cream upholstery, calm and well-built feeling.
```

**app-2 — Machine cover on a factory floor**
```
A protective fabric cover being lifted off industrial machinery, held on by black
heavy-duty adhesive hook and loop strips bonded to the painted steel housing. Factory
floor context, safety-yellow line marking on concrete faintly visible. Cool overhead
industrial light, brushed and painted metal, no visible controls or labelling.
```

---

## 8. Hook & Loop for Fabric & Clothes — `hook-and-loop-for-fabric`

*Applications: uniforms · jackets & safety wear · school bags · upholstery · curtains · sports gear*

**app-1 — Hi-vis workwear cuff**
```
Close crop of the adjustable cuff of a hi-vis work jacket being fastened, a soft black
hook and loop tab pressing closed over the sleeve. Reflective banding just out of focus.
The tape reads soft and flexible rather than stiff and industrial. Neutral daylight,
tight depth of field on the fastening itself.
```

**app-2 — School bag flap**
```
A child's school backpack on a hallway bench, its front pocket flap held open to show
a wide strip of black hook and loop tape sewn across the closure. Canvas texture, worn
but cared-for. Soft domestic daylight, muted navy and grey bag against an off-white
wall, warm and everyday in feeling.
```

---

## 9. VELCRO® Brand Self-Adhesive Roll — `velcro-brand-roll`

*Applications: acoustic & insulation panels · data-centre cable management · exhibition stands · transport interiors*

**app-1 — Exhibition stand panel**
```
A trade-exhibition stand being assembled, a fabric-faced display panel being pressed
onto an aluminium frame upright, held by 25mm black self-adhesive hook and loop strips
running the length of the frame. Exhibition hall in the far background, deliberately
featureless and out of focus. Even hall lighting, aluminium and grey fabric palette,
no signage or graphics anywhere in frame.
```

**app-2 — Acoustic panel install**
```
An installer positioning a grey acoustic foam panel onto an office wall, four squares
of black self-adhesive hook and loop already applied to the wall in a grid, one panel
already mounted beside. Modern quiet office, pale wall, soft even daylight, restrained
grey-on-grey palette.
```

---

## 10. VELCRO® Brand Velcoin Dots — `velcoin-dots`

*Applications: crafts & decorative · display setups & signage · cable management · office & school organisation*

**app-1 — Retail display sign**
```
A small acrylic display sign holder being pressed onto a retail shelf edge, fixed by
two 22mm white hook and loop coins visible on its base as it is positioned. Clean retail
shelving, product boxes deliberately blurred and unbranded behind. Bright even retail
lighting, white and pale grey palette.
```

**app-2 — Coins on a display board**
```
A hand pressing a lightweight foam-board panel onto a display wall, a grid of nine
black hook and loop coins already stuck to the wall in a regular pattern, three still
on their release liner on a table below. Studio-clean environment, soft directional
light raking across the wall to catch the texture of the coins.
```

---

## 11. Fire Retardant Adhesive Hook & Loop — `fire-retardant-adhesive`

*Applications: acoustic & insulation panels · data centres & electrical · exhibition systems · public transport interiors*

**app-1 — Train / bus interior panel**
```
The interior of a public-transport vehicle, a wall lining panel being refitted above a
seat back, held by strips of black fire-retardant adhesive hook and loop. Moulded seat
shells, grab rail, window with daylight behind. Cool neutral transit-interior palette —
charcoal, grey moquette, brushed alloy. Orderly and compliance-grade in feeling.
```

**app-2 — Electrical riser cable management**
```
A building services riser, bundled electrical cabling secured against a cable tray
with black fire-retardant hook and loop strips at regular intervals. Galvanised tray,
conduit, plant-room lighting. Technical, tidy, clearly a regulated installation —
cool grey and steel, no colour beyond the cable sheathing.
```

---

## 12. Fire Retardant Sew-On Hook & Loop — `fire-retardant-sew-on`

*Applications: flame-resistant clothing · industrial curtains & partitions · transport seating · equipment covers*

**app-1 — Flame-resistant workwear**
```
The storm flap of a flame-resistant work jacket being pressed closed over its zip, a
strip of black fire-retardant sew-on hook and loop running the length of the flap,
stitching clearly visible along both edges. Heavy FR fabric texture. Neutral daylight,
tight crop, serious and protective in mood — safety equipment, not fashion.
```

**app-2 — Industrial welding curtain**
```
A heavy industrial partition curtain in a fabrication workshop, two panels joined down
their vertical edge by a long run of black fire-retardant sew-on hook and loop, being
drawn together by a gloved hand. Workshop beyond softly out of focus, sparks absent.
Muted industrial palette — charcoal curtain, concrete, steel framing.
```

---

## Generating these

Works as written in Midjourney (append `--ar 1:1 --style raw`), DALL·E 3, Flux,
Imagen, or Firefly. Two notes:

- **Never let the generator put text in frame.** The negative block handles most of
  it, but check every output — invented signage and fake logos are the single most
  common tell that an image was generated.
- **Regenerate anything where the hook and loop reads as plain black webbing.** The
  point of every one of these shots is the fastening. If you can't see the weave, the
  image isn't doing its job.
