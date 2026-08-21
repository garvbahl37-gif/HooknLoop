# Application scenes per product category. Three per category so every product
# gets visually distinct shots rather than the same bench three times.
# Each entry: (short label, scene body). The shared style + negative clause is
# appended by the generator so the wording is identical on every prompt.
SCENES = {
"hook-loop-tapes": [
 ("Cable management","a close-up of a person's hands wrapping a bundle of black and grey cables beneath a modern office desk, cinching them with a strip of plain black hook-and-loop fastener; polished concrete floor and a chair caster softly out of focus behind"),
 ("Exhibition panel","a trade-show technician pressing a lightweight fabric display panel onto an aluminium frame upright, a strip of plain black hook-and-loop fastener visible along the frame edge; bright even exhibition-hall lighting, other booths blurred far behind"),
 ("Marine cushion","hands refitting a removable vinyl seat cushion onto a boat bench, plain black hook-and-loop strips bonded to the underside of the cushion and the fibreglass seat base; bright coastal daylight, water sparkling out of focus beyond the gunwale"),
],
"tapes-dispensers": [
 ("Packing bench","a warehouse worker's hands running a handheld tape gun along the centre seam of a plain kraft carton on a stainless packing bench; stacks of flattened boxes and a label printer softly blurred behind, bright industrial daylight"),
 ("Benchtop station","a benchtop tape dispenser with a weighted base on a workshop bench, a hand drawing a length of clear tape across the cutting blade; hand tools and a steel rule arranged nearby, warm workshop lighting from a window"),
 ("Dispatch line","an over-the-shoulder view of a dispatch operator sealing the last of a row of identical kraft cartons along a roller conveyor, tape gun mid-stroke; long depth of field down the line, cool warehouse lighting"),
],
"packaging-tapes": [
 ("Carton seal","an extreme close-up of clear packaging tape being pressed along the H-seam of a kraft carton, the tape's slight sheen catching the light and the cardboard flute texture visible at the edge; shallow depth of field"),
 ("Pallet of sealed cartons","a shrink-free pallet stacked with uniformly sealed plain kraft cartons in a clean warehouse aisle, tape lines crisp and parallel across every lid; orange racking receding softly out of focus"),
 ("E-commerce packing","a small-business owner taping a parcel closed on a timber worktable surrounded by tissue paper and a stack of ready-to-post boxes; soft warm window light, homely studio atmosphere"),
],
"pvc-electrical-insulation-tape": [
 ("Cable joint","a licensed electrician's hands wrapping black PVC insulation tape tightly around a spliced copper cable joint, the spiral overlap crisp and even; blurred switchboard and cable loom behind, cool task lighting"),
 ("Colour-coded switchboard","a distribution board with neatly dressed cables, several conductors identified with bands of red, blue and yellow PVC tape; sharp focus on the tape bands, breaker rows softly out of focus"),
 ("Conduit run","hands taping a joint on an electrical conduit run against a plasterboard wall stud during a fit-out, offcuts and a cordless driver on the floor below; bright construction daylight"),
],
"foam-tape-double-sided": [
 ("Mirror mounting","hands pressing a frameless bathroom mirror onto a tiled wall, evenly spaced strips of white double-sided foam tape on the mirror's back edge just visible; soft diffused bathroom light, tile grout lines crisp"),
 ("Sign mounting","a signwriter aligning a blank brushed-aluminium plaque onto a painted reception wall, foam tape strips on the reverse; shallow depth of field, soft architectural lighting"),
 ("Window seal","a close-up of grey foam tape being pressed into the rebate of an aluminium window frame on a construction site, weather seal continuous around the corner; bright overcast daylight"),
],
"automotive": [
 ("Trim attachment","a technician's gloved hands pressing a blank chrome side-moulding strip onto a car door panel in a workshop, adhesive tape line visible along the moulding's back; glossy paint reflections, cool overhead workshop lighting"),
 ("Door membrane","hands sealing a plastic vapour barrier to a car door shell with butyl-backed tape, door card removed and speaker visible; shallow depth of field, garage light"),
 ("Dashcam mount","interior view of a windscreen with a compact unbranded black camera being pressed to the glass on an adhesive pad, rear-view mirror and blurred road ahead; bright daylight through the screen"),
],
"hang-tab": [
 ("Retail peg display","a clean retail shelf with plain clear-plastic hang tabs suspending unbranded blister-packed products from a pegboard hook rail; bright even store lighting, shallow depth of field down the row"),
 ("Attaching a tab","a merchandiser's fingers pressing a self-adhesive clear hang tab onto the top edge of a plain product carton at a bench; neat rows of prepared cartons behind"),
 ("Hook rail detail","an extreme close-up of a clear hang tab hooked over a chrome peg, the plastic catching the light and the carton hanging square below; retail aisle bokeh"),
],
"bumpers-tapes": [
 ("Cabinet door","an extreme close-up of a small clear self-adhesive bumper being pressed into the inside corner of a shaker kitchen cabinet door; warm domestic light, timber grain sharp"),
 ("Glass tabletop","clear round bumpers spaced beneath a glass tabletop resting on a timber base, catching a highlight; soft interior daylight, minimal styling"),
 ("Drawer stop","hands fitting clear bumpers to the inside face of a joinery drawer front in a workshop, cabinet carcass on the bench; warm workshop light, sawdust detail"),
],
"masking-tape": [
 ("Wall cut-in","a painter's hand pulling a strip of masking tape along the junction of a wall and white skirting board, roller tray and brush blurred on a drop sheet below; bright interior daylight"),
 ("Automotive spray","a spray booth technician masking a car panel with tape and paper before painting, crisp tape edge along the panel gap; even booth lighting, matte primer surface"),
 ("Clean paint line","an extreme close-up of tape being peeled back to reveal a perfectly sharp paint line between two wall colours; shallow depth of field, soft natural light"),
],
"thermal-insulation-tape": [
 ("Duct seam","gloved hands smoothing insulation tape along the longitudinal seam of a rigid HVAC duct in a plant room; pipework and lagging behind, cool industrial lighting"),
 ("Pipe lagging","a close-up of foil-faced insulation tape spiralled around the joint between two lengths of pipe lagging in a ceiling void; work light raking across the surface"),
 ("Rooftop plant","a technician taping a duct joint on a rooftop air-handling unit, city skyline soft behind; bright late-afternoon daylight, metal duct reflections"),
],
"atg-tapes": [
 ("Picture framing","a framer's hands running an ATG applicator gun along the rebate of a timber picture frame on a felt-topped bench, mount board and a blank print waiting alongside; warm studio lamp light"),
 ("Print finishing","a print-finisher mounting a large blank photographic print onto foam board with transfer adhesive, roller in hand; clean bright studio, shallow depth of field"),
 ("Applicator detail","an extreme macro of an ATG gun laying a clear adhesive line onto matte board, the transfer film peeling away cleanly; dramatic side lighting"),
],
"glue-dots": [
 ("Direct mail","hands attaching a plain card to a folded leaflet with a clear adhesive dot at a mailing bench, stacks of prepared items either side; even bright light"),
 ("Retail POS","a clear adhesive dot holding a small unbranded sample sachet to a plain shelf card in a retail aisle; shallow depth of field, warm store lighting"),
 ("Craft bench","a maker pressing a small embellishment onto a card blank with an adhesive dot, craft tools and paper scraps around; warm window light, cosy atmosphere"),
],
"barricade-hazard-tapes": [
 ("Site cordon","red and white hazard barricade tape strung between two steel star pickets across a construction excavation, tape lifting slightly in the breeze; overcast daylight, site machinery blurred behind"),
 ("Trip hazard","yellow and black hazard tape marking off a section of wet polished concrete floor in a warehouse, wet-floor sheen visible; cool overhead lighting"),
 ("Roll in hand","a site supervisor in hi-vis unrolling barricade tape along a temporary walkway, gloved hands sharp, tape stretching away out of focus; bright daylight"),
],
"masking": [],
"eco-friendly-tapes": [
 ("Kraft carton seal","hands smoothing a strip of brown paper tape across the seam of a recyclable kraft carton at a sustainable packing bench, plant on the windowsill; soft natural light"),
 ("Recyclable parcel","a finished plain kraft parcel sealed with paper tape sitting on a timber table beside twine and a stack of unbleached tissue; warm morning light, minimal styling"),
 ("Water-activated dispenser","a paper tape being drawn from a gummed-tape dispenser and applied to a carton, the moistened tape bonding into the board; clean bright warehouse light"),
],
"fabric-tape": [
 ("Stage cable run","a stage technician taping a run of black cables to a dark venue floor with matte cloth tape, boot and cable coil in frame; moody theatrical lighting, shallow depth of field"),
 ("Carpet edge","hands pressing cloth tape along the trimmed edge of a carpet run in an office fit-out, underlay visible; bright even daylight"),
 ("Roll close-up","an extreme close-up of matte black cloth tape being torn by hand, the woven fibre edge visible in the tear; dramatic raking light, dark background"),
],
"double-sided-tissue-tape": [
 ("Graphic mounting","a signmaker mounting a blank printed graphic panel to an acrylic sheet with thin double-sided tissue tape, squeegee in hand; clean bright studio lighting"),
 ("Paper splice","an extreme macro of two paper webs joined by a thin transparent tissue tape splice on a print-finishing table; crisp side lighting showing the join"),
 ("Bench detail","hands laying strips of double-sided tissue tape onto blank card stock at a finishing bench, release liner curling away; warm task lighting"),
],
"safety-tape": [
 ("Stair nosing","black and yellow anti-slip safety tape applied to the nosing of industrial steel stairs, a boot stepping onto the tread; cool stairwell lighting, textured grit surface sharp"),
 ("Floor marking","yellow floor-marking tape laid in a crisp right angle to define a pedestrian walkway on a warehouse floor, forklift blurred in the distance; bright overhead lighting"),
 ("Ramp edge","high-visibility safety tape marking the edge of a loading dock ramp, rain-darkened concrete; overcast daylight, strong colour contrast"),
],
"reflective-tape": [
 ("Trailer marking","red and white reflective conspicuity tape on the rear of a trailer catching headlight glare at dusk, the retroreflection blazing bright against the dark body; moody blue-hour light"),
 ("Equipment marking","reflective tape strips on the frame of a warehouse forklift, a torch beam catching them in a dim aisle; dramatic pool of light"),
 ("Night detail","an extreme close-up of reflective tape at night, the glass-bead surface glittering under direct light; deep black background, high contrast"),
],
"cloth-double-sided-tape": [
 ("Carpet laying","a flooring installer pressing carpet down onto strips of double-sided cloth tape across a subfloor, knee kicker beside them; bright renovation daylight, dust motes in the air"),
 ("Exhibition floor","hands laying carpet tiles onto double-sided tape over a temporary exhibition floor, tile edges butted tight; even hall lighting"),
 ("Tape on subfloor","a close-up of double-sided cloth tape being unrolled across a plywood subfloor in a straight line, release liner peeling; raking daylight showing the grid"),
],
"polyester-tape": [
 ("Powder-coat masking","gloved hands masking threaded holes on a steel bracket with green polyester tape before powder coating, parts jig behind; bright industrial lighting, matte metal"),
 ("Coil insulation","a close-up of thin polyester film tape wrapped around a transformer coil on an electronics bench; sharp macro detail, cool task lighting"),
 ("Plating mask","polyester masking tape discs applied to machined aluminium parts on a tray before surface treatment; clean bright factory light"),
],
"paper-kraft-tape": [
 ("Gummed seal","water-activated kraft paper tape being pressed onto a carton seam, the fibres visibly bonding into the board; clean bright dispatch bench"),
 ("Bundle wrap","hands wrapping a bundle of flat-packed cardboard with kraft paper tape for recycling; warm warehouse light"),
 ("Macro texture","an extreme macro of kraft paper tape torn across, showing the reinforcing fibre threads inside; dramatic side lighting, dark background"),
],
"protection-tape": [
 ("Metal surface film","a fabricator peeling blue protective film from a freshly cut stainless steel panel, the mirror surface revealed beneath; bright workshop lighting, strong reflections"),
 ("Glazing protection","protective film applied over a newly installed window pane on a construction site, a gloved hand smoothing it flat; bright overcast daylight"),
 ("Peel detail","an extreme close-up of protective film lifting from a brushed aluminium surface in one clean strip; raking light along the brush grain"),
],
"flashing-tape": [
 ("Window flashing","a builder pressing self-adhesive flashing tape around the head of a window opening in a timber-framed wall, house wrap behind; bright construction daylight"),
 ("Sheathing seam","gloved hands rolling flashing tape along the vertical joint between two sheets of structural sheathing, seam roller in use; overcast site light"),
 ("Corner detail","a close-up of flashing tape folded neatly around the corner of a window sill pan, fully sealed; sharp raking daylight"),
],
"double-sided-tape": [
 ("Panel mounting","hands mounting a blank acrylic panel onto a painted wall with double-sided tape strips; clean interior, soft even lighting"),
 ("Bench application","a close-up of double-sided tape being applied along the edge of a timber batten on a workbench, liner peeling away; warm workshop light"),
 ("Fixture install","a tradesperson fixing a slim unbranded fixture to a tiled surface with double-sided tape; bright clean interior"),
],
"aluminium-foil-tapes": [
 ("Duct seam seal","gloved hands burnishing aluminium foil tape along a rectangular duct seam, the foil catching a bright specular highlight; industrial plant room, cool lighting"),
 ("Insulation vapour barrier","foil tape sealing the joint between two foil-faced insulation boards in a roof cavity; work light raking across the reflective surface"),
 ("Macro foil","an extreme macro of aluminium foil tape being smoothed with a plastic squeegee, fine burnish marks in the foil; dramatic directional lighting"),
],
"acribond-accessories": [
 ("Primer application","a gloved hand wiping adhesion primer along a substrate edge with an applicator before bonding; clean workshop bench, bright even light"),
 ("Roller pressure","a hand pressure-rolling a bonded panel joint with a rubber seam roller to activate the adhesive; shallow depth of field, workshop lighting"),
 ("Prep bench","surface-preparation accessories laid out on a clean bench beside a part awaiting bonding; soft studio light, orderly composition"),
],
"felt-tapes-dots": [
 ("Chair leg","self-adhesive felt pads being pressed onto the base of a timber dining chair leg, hardwood floor below; warm domestic light, grain detail sharp"),
 ("Drawer runner","felt tape applied along a timber drawer runner in a cabinetmaking workshop to silence the slide; warm task lighting"),
 ("Furniture base","felt dots on the underside of a ceramic lamp base resting on a polished sideboard; soft interior light, protective intent clear"),
],
"strapping-tapes": [
 ("Bundling","hands strapping a bundle of timber lengths together with filament strapping tape in a hardware yard; bright outdoor daylight"),
 ("Pallet reinforcement","strapping tape wrapped around the top layer of a stacked pallet load to stabilise it; warehouse aisle, cool overhead light"),
 ("Tensioned close-up","an extreme close-up of strapping tape pulled taut over a carton edge, the reinforcing filaments clearly visible under tension; hard directional light"),
],
"filament-tapes": [
 ("Heavy carton","filament tape reinforcing the seam of a heavy double-wall carton on a dispatch bench, glass fibres visible in the tape; bright industrial lighting"),
 ("Pipe bundle","hands bundling lengths of PVC pipe with filament tape in a trade supplier's yard; bright daylight, long depth of field"),
 ("Fibre macro","an extreme macro of filament tape stretched across a corner, individual glass filaments catching the light; dark background, dramatic lighting"),
],
"magnetic-tapes": [
 ("Signage swap","hands sliding a blank display panel onto a magnetic strip mounted on a steel shopfitting rail; clean retail interior, bright even lighting"),
 ("Whiteboard label","a magnetic tape strip holding a blank card label onto a steel planning board in an office; shallow depth of field, cool daylight"),
 ("Strip detail","an extreme close-up of flexible magnetic tape being pressed onto a steel surface, the matte magnetic face and adhesive backing both visible; raking light"),
],
"butyl-tape": [
 ("Gutter seal","gloved hands pressing thick black butyl sealing tape into the lap joint of a metal gutter on a roof; bright hard sunlight, metal glare"),
 ("RV seam","butyl tape being applied along a caravan roof seam before a trim strip is fitted; bright outdoor daylight, aluminium panel texture"),
 ("Stretch detail","a close-up of butyl tape stretching and conforming into an uneven metal joint, its tacky body deforming under thumb pressure; hard side lighting"),
],
"duct-tape": [
 ("Field repair","a worker taping a temporary repair on a piece of site equipment with heavy cloth duct tape; bright outdoor daylight, rugged setting"),
 ("Ducting join","duct tape wrapped around a flexible ducting connection in a ceiling space; work light raking across the ribbed surface"),
 ("Hand tear","an extreme close-up of duct tape being torn by hand, the fabric scrim fraying at the tear line; dramatic dark-background lighting"),
],
"specialty-tape": [
 ("Precision bench","a technician applying a narrow strip of specialist tape to a precision component on a clean workbench, tweezers in hand; bright even task lighting, shallow depth of field"),
 ("Industrial line","the tape in use on a production line, applied to a plain component moving along a conveyor; cool factory lighting, motion softly implied"),
 ("Macro adhesive","an extreme macro of the tape's edge lifting from a smooth substrate, the adhesive stringing slightly; dramatic directional light, dark background"),
],
"__default__": [
 ("In use on the bench","a tradesperson's hands applying the tape to a plain workpiece on a clean workbench, offcuts and simple hand tools around; bright even workshop lighting, shallow depth of field"),
 ("On site","the tape in use in a real Australian trade setting appropriate to the product, applied cleanly to the substrate; natural daylight, working context visible but softly out of focus"),
 ("Macro detail","an extreme macro of the tape being pressed onto its substrate, showing the adhesive contact line and surface texture; dramatic raking light, dark background"),
],
}
