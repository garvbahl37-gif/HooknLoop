# CONTINUITY BIBLE — "The Things That Hold"
*Lock these before any generation. AI ads fail when every shot is a different universe; this prevents that.*

## Colour science (identical across ALL AI sources)
- Base: warm Australian daylight, filmic contrast, **rich blacks (not crushed), controlled highlights**.
- **No** teal-orange LUT, no HDR, no Instagram look, no heavy saturation.
- White balance ~5200K exteriors / ~4800K interiors, held consistent.
- Grain: fine 35mm-style, **added last** in grade (not per-shot).
- Halation: subtle on speculars only. Edge softness: gentle, toward frame corners.

## Brand palette (measured for WCAG AA on type)
| Token | Hex | Use |
|---|---|---|
| HooknLoop Blue | `#003B98` | wordmark, deep accents |
| **HooknLoop Orange** | `#E87722` | **the ONE flare per screen** (heavy-duty strap S09; logo n) |
| Product Ink | `#111318` | the black tape/strips |
| Neutral Grey | `#8A8B8E` | `.com.au`, fine type |
| Ground White | `#FFFFFF` / warm `#FFF7F0` | end card |
| Deep Navy | `#081228` | shadow anchor |
- **Orange discipline:** orange appears in exactly ONE element per frame, and only in S09 (strap), S17 (strap cameo), S19 (logo n). Mute hi-vis in S08 so it doesn't compete.

## Camera package (locked)
ARRI Alexa 35 look · Cooke S8/i spherical primes · 24fps · 180° shutter.
Lens language: 35mm worlds, 50mm craft, 85mm intimacy/portraiture, 100mm macro. **Do not** put shallow DOF on every shot — deep for the ute/caravan/warehouse, shallow for hands/macro.

## Recurring characters (reference-lock; never regenerate from text alone)
| ID | Who | Appears | Lock details |
|---|---|---|---|
| **C1** | Parent (hero thread) | S03, S04, S15, S16 | 30s–40s, plain wedding band, freckled hands, chambray shirt; face mostly out of frame (reduces AI risk). Hands are the character. |
| C1b | Child | S03, S04 | ~7–8, soft grey tee, small hands; never full face to camera. |
| C2 | Upholsterer | S06 | 50s+, weathered hands, canvas apron, rolled sleeves. |
| C3 | Sign-maker | S07 | 30s, work polo, forearm tattoo ok. |
| C4 | Electrician | S08 | muted hi-vis (grey/charcoal, minimal safety-orange). |
| C5 | Carer | S11 | soft neutral scrubs/cardigan, calm hands. |
| C6 | Elder | S11 | soft blue cardigan, dignified, relaxed; NO eye-contact to camera, never pitiable. |
| C7 | Traveller | S13 | casual, brimmed hat, sun-warmed. |
> For each recurring character create refs BEFORE scene gen: front / 3-4 / profile / hands / wardrobe. Condition every shot on the ref image, not text.

## Product master specs (accuracy is non-negotiable)
Generated from real range (`newsletter/data/catalog.js`). Geometry, weave, proportion, colour must stay true. Magnific creativity = LOW on all product shots.
- **Black hook-and-loop weave:** visible woven loops + hook field; matte, NOT plastic/glossy; ~20–50mm width strips.
- **Self-adhesive roll** (S04): black, adhesive backing peels as a film.
- **Sew-on tape** (S06, S15): soft, stitched, no adhesive.
- **Reusable cable straps** (S08): self-gripping loop strap, black.
- **Heavy-Duty Strap** (S09): **ORANGE `#E87722`**, wide (~50mm), buckle/loop end — the flare.
- **Dots / Velcoin** (S07, S12): pre-cut circular dots.
- **Double-sided** (S14): back-to-back, grips itself, no adhesive.
- **Forbidden:** fake sheen, wrong weave, invented buckles, any legible third-party branding, mis-coloured strap.

## Locations (architecture/props locked)
Home A (warm suburban brick, oat/timber kitchen) · Upholstery workshop (north light, hessian/brass) · Signage workshop (ply, roller door) · Construction fit-out (studs, cable tray) · Dawn driveway/yard (ute) · Aged-care sunroom (curtain light, plants, framed photos) · Primary classroom (cork, muted primaries) · Country caravan park (gum trees, red dirt, gold light) · Warehouse (high-bay + warm dock spill).

## Lighting direction (consistent key)
Key from frame-left in interiors (window-motivated); dawn sun low camera-right in S09; soft top-fill in macro. Negative fill opposite key everywhere. Shadows fall consistently shot-to-shot within each world.

## Match-cut continuity map (the film's spine)
S02 catch → S03 hands · S05 texture → S06 · S09 cinch → S10 macro · S11 → S12 (movement wipe) · S12 → S13 (whip) · S16 press → S17 hero · S17 → S18 → S19. Each cut is motivated by shape/movement/sound, never a dissolve.

## AI-artifact watchlist (auto-reject)
hands/fingers (count, bends), eyes/teeth (keep faces soft/partial), warped product weave, invented buckles, legible fake logos/text, floating objects, duplicate limbs, impossible shadows, temporal flicker, texture crawl on macro, orange bleeding into non-flare shots. If flagged → diagnose → re-prompt → regenerate → compare → log in `10_qa/qa_report.md`.
