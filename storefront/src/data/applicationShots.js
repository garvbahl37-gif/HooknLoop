/*  In-use application photography, one pair per product, shown under "Key
    applications" on the PDP. The bullet list says what the product is for;
    these show it. Captions describe the scene rather than restating the
    bullet — a caption that repeats the list above it is wasted space.

    Files live in /public/img/applications/<handle>-<n>.webp.
    Three products are still short a second shot (see MISSING below); the
    component renders whatever exists, so a product with one shot shows one,
    and a product with none renders nothing at all.                           */

export const APPLICATION_SHOTS = {
  'self-adhesive-roll': [
    ['/img/applications/self-adhesive-roll-1.webp', 'Mounting a wall panel on site — peel the liner, press, done'],
    ['/img/applications/self-adhesive-roll-2.webp', 'A garage tool board with no hooks, screws or drilling'],
  ],
  'sew-on': [
    ['/img/applications/sew-on-1.webp', 'Stitched onto workwear on an industrial machine'],
    ['/img/applications/sew-on-2.webp', 'A hidden closure inside a linen cushion cover'],
  ],
  'hook-and-loop-dots': [
    ['/img/applications/hook-and-loop-dots-1.webp', 'Classroom schedule cards that move in a second'],
    ['/img/applications/hook-and-loop-dots-2.webp', 'Mounting control gear inside an electrical cabinet'],
  ],
  'reusable-cable-straps': [
    ['/img/applications/reusable-cable-straps-1.webp', 'Patch leads bundled in a network cabinet'],
    ['/img/applications/reusable-cable-straps-2.webp', 'Under-desk cabling, tidied and still re-openable'],
  ],
  'double-sided': [
    ['/img/applications/double-sided-1.webp', 'An air hose cinched to the workshop wall'],
    ['/img/applications/double-sided-2.webp', 'Leads and rope bundled — it grips itself, no adhesive'],
  ],
  'heavy-duty-straps': [
    ['/img/applications/heavy-duty-straps-1.webp', 'Securing a wrapped pallet load in the warehouse'],
    ['/img/applications/heavy-duty-straps-2.webp', 'Bundling timber on the loading dock'],
  ],
  'heavy-duty-adhesive': [
    ['/img/applications/heavy-duty-adhesive-1.webp', 'A removable trim panel in a caravan interior'],
    ['/img/applications/heavy-duty-adhesive-2.webp', 'A machine cover that lifts straight off'],
  ],
  'hook-and-loop-for-fabric': [
    ['/img/applications/hook-and-loop-for-fabric-1.webp', 'The adjustable cuff on a hi-vis work jacket'],
    ['/img/applications/hook-and-loop-for-fabric-2.webp', 'A school backpack closure built to survive the term'],
  ],
  'velcro-brand-roll': [
    ['/img/applications/velcro-brand-roll-1.webp', 'Fabric panels onto an exhibition stand frame'],
  ],
  'velcoin-dots': [
    ['/img/applications/velcoin-dots-1.webp', 'A shelf-edge sign holder, fixed in seconds'],
  ],
  'fire-retardant-adhesive': [
    ['/img/applications/fire-retardant-adhesive-2.webp', 'Cable runs secured in a building services riser'],
  ],
  'fire-retardant-sew-on': [
    ['/img/applications/fire-retardant-sew-on-1.webp', 'The storm flap on a flame-resistant jacket'],
    ['/img/applications/fire-retardant-sew-on-2.webp', 'Joining welding curtain panels in a fabrication shop'],
  ],
}

/*  MISSING — still need one more shot each (prompts are in
    docs/application-image-prompts.md under the matching product):
      · velcro-brand-roll       app-2  — acoustic panel install
      · velcoin-dots            app-2  — coins on a display board
      · fire-retardant-adhesive app-1  — train / bus interior lining panel   */

export const applicationShots = (handle) => APPLICATION_SHOTS[handle] || []
