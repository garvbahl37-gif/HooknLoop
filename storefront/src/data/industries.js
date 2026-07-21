/*  Industry / application landing pages — content supplied verbatim by the store.
    Each page: intro → common use cases (with an image each) → key characteristics
    → recommended products → related pages. Images resolve to
    /img/industries/<slug>-hero.jpg and /img/industries/<slug>-<n>.jpg — drop the
    generated files in and they appear (a branded gradient shows until then).      */

export const INDUSTRIES = [
  {
    slug: 'clothing-garments',
    short: 'Clothing & Garments',
    name: 'Hook and Loop for Clothing & Garments',
    metaTitle: 'Hook and Loop for Clothing & Garments | HooknLoop',
    metaDescription: 'Shop sew-on hook and loop for garments, costumes, adaptive clothing and alterations. Washable, fabric-safe options in multiple widths. Australia-wide delivery.',
    intro: 'Hook and loop fasteners for clothing & garments have always been a trusted choice of tailor, costume designer, or clothing manufacturer, as it brings in the cleanest and most suitable alternative to buttons, zips, and snaps for you. Designed to work across a wide range of fabrics, these are suitable for lightweight cotton as well as heavier woven textiles. Available in different types like sew-on formats specifically suited to textile use, these are the handy choices for the cloth industry. With the right hook and loop products from HooknLoop, garments can be made adjustable, easier to put on and take off, and durable across repeated wash cycles.',
    useCases: [
      ['Costume and Theatrical Wear', 'Performers have to change clothes quickly between the scenes. Hook and loop closures let their costumes be fastened and removed in seconds. No more fumbling with buttons or zippers. They are a standard choice in stage, film, and cosplay garment making.'],
      ['Children’s Clothing', 'Young children love easy to wear and simple to manage clothing styles, possible with this fastener. Hook and loop closures on shoes, jackets, and waistbands decrease frustration and boost self-dressing skills.'],
      ['Adaptive and Accessible Clothing', 'Hook and loop fasteners make dressing and undressing significantly easier for people with limited hand mobility or dexterity, including elderly individuals and those with certain disabilities, highly used in adaptive fashion design.'],
      ['Waistband and Belt Adjusters', 'Hook and loop tape sewn inside waistbands allows for a range of fit adjustments without visible external hardware. This is common in school uniforms, work trousers, and maternity wear.'],
      ['Hem and Alteration Work', 'Tailors and home sewers use narrow hook and loop strips as temporary or permanent hem solutions, particularly for trousers and skirts that need to hang cleanly without visible stitching.'],
    ],
    characteristics: [
      ['Soft, non-abrasive loop side suitable for skin contact'],
      ['Machine washable, retains grip through regular laundering'],
      ['Available in sew-on format for permanent fabric attachment'],
      ['Multiple widths from 20mm to 50mm'],
      ['Available in black and white to suit garment colour schemes'],
      ['Nylon construction for flexibility and durability'],
    ],
    recommended: [
      'The Sew On Hook and Loop (Non Adhesive) is the most suitable option for clothing and garment work. It is designed to be stitched directly to fabric, comes in 25mm, 50mm, and 100mm widths, and is available in both black and white. Its fabric-safe backing makes it appropriate for a wide range of textile applications including costumes, adaptive clothing, and uniform alterations.',
      'For applications where a quick attachment to a fabric surface is needed without sewing, the Self Adhesive Hook and Loop Roll can be used on interfacing or stiffer fabric components such as hat brims or bag panels.',
    ],
    products: ['sew-on', 'self-adhesive-roll'],
    related: [
      ['medical-aged-care', 'adaptive clothing and garment closures for care environments'],
      ['upholstery-furniture', 'fabric fastening for soft furnishings'],
    ],
  },

  {
    slug: 'upholstery-furniture',
    short: 'Upholstery & Furniture',
    name: 'Hook and Loop for Upholstery & Furniture',
    metaTitle: 'Hook and Loop for Upholstery & Furniture | HooknLoop Australia',
    metaDescription: 'Secure cushions, fabric panels, and upholstery with hook-and-loop tape. Strong adhesive and sew-on options for furniture projects across Australia.',
    intro: 'Upholstery and furniture work are in consistent need of effective fasteners that hold firm under repeated use with no damaging effects on fabric or surfaces. Hook-and-loop tape for upholstery & furniture serves as a practical choice to secure cushion covers, fabric panels, slipcovers, and decorative elements to furniture frames. It offers convenient removal and reattachment, ideal for cleaning, reupholstering or changing the seasons. HooknLoop Australia offers a wide range of adhesive-backed and sew-on hook and loop strips that are ideal for soft furnishings applications such as residential sofas, commercial fit-outs, and all other applications, in various widths and strengths.',
    useCases: [
      ['Cushion Cover Closures', 'Hook and loop strips sewn into the underside or back side of a cushion cover allow covers to be removed for washing and replaced easily without zips that can snag fabric or corrode over time.'],
      ['Fabric Panel Attachment to Timber or MDF Frames', 'Hook and loop is used in fitted furniture, decorative bed heads and acoustic panels where fabric is to be drawn over and fastened to a hard frame, but can be easily removed if the fabric needs to be replaced or if the finish is to be changed.'],
      ['Seat Pad and Chair Cover Securing', 'Hook and loop strips on the back of the seat that hold the seat in place are more effective than clips for dining chairs and office furniture that can start to move with repeated use.'],
      ['Slipcover Fastenings', 'Slipcovers on sofas and armchairs benefit from hook-and-loop closures at tucking points and back sides. It helps keep the cover tightly stretched and well positioned in place. No need for permanent stitching.'],
      ['Decorative Element Attachment', 'The frame-side adhesive hook-and-loop fastening can be used to attach material to a headboard or wall-hung textile art, and on the fabric side, can be sewn to the fabric so that the material can be removed from the wall without harming the wall or backing structure.'],
    ],
    characteristics: [
      ['Great adhesive strength to wood, MDF, plastic and metal frames'],
      ['Sew-on option for direct fabric attachment'],
      ['Reusable — can be used and closed thousands of times'],
      ['Holds fabric panels securely but without pins or staples or showing fasteners'],
      ['Comes ready to roll and can be cut to length for any project'],
      ['Resists frequent exposure to domestic and commercial use'],
    ],
    recommended: [
      'The Sew-On Hook and Loop (Non-Adhesive) in 50 mm or 100 mm width is the go-to choice for fabric-to-fabric upholstery applications such as cushion closures and slipcovers. For attaching fabric components to timber or board frames, combine with the Self-Adhesive Hook and Loop Roll on the hard surface side. Where a particularly strong hold is needed on heavier panels, consider the Heavy Duty Hook and Loop Strap.',
    ],
    products: ['sew-on', 'self-adhesive-roll', 'heavy-duty-straps'],
    related: [
      ['clothing-garments', 'fabric and sewing applications'],
      ['automotive-caravan-rv', 'interior panel and soft furnishing applications in vehicles'],
    ],
  },

  {
    slug: 'schools-education',
    short: 'Schools & Education',
    name: 'Hook and Loop for Schools & Education',
    metaTitle: 'Hook and Loop for Schools & Education | HooknLoop Australia',
    metaDescription: 'Hook and loop fasteners for classrooms, craft projects, notice boards, and school uniforms. Trusted by Australian teachers and schools. Shop Hook’n Loop.',
    intro: 'Hook and loop fasteners are used in countless creative ways within schools, child care centres and other educational institutions, including displays, learning tools, storage solutions and furniture design. The fasteners are safe, non-destructive and easy to use and can be used by teachers and students without any tools or special knowledge. They enable classroom configurations to be changed in a matter of moments, the display of content to be easily changed, and resources to be organized and easily retrieved. At HooknLoop Australia, we have a range of self-adhesive and sew-on hook and loop products offered to schools, TAFEs and education departments, and can be tax-invoiced for institutional use.',
    useCases: [
      ['Classroom Display Boards', 'Hook and loop strips and dots are used by teachers to attach student work and charts, as well as learning materials to a display board and walls. Unlike staples, drawing pins or tape, content can be changed without any residue or damage.'],
      ['Rotating Learning Aids', 'Flashcards, number charts, letter tiles and other hands-on learning materials can be mounted on boards or surfaces with hook-and-loop dots and be moved, grouped and changed throughout the course of a lesson.'],
      ['Resource and Equipment Organisation', 'Hook and loop strips can be used to label and assign storage shelves, bins and trolleys to help keep classrooms tidy and to help students return resources to the correct location independently.'],
      ['Furniture and Mat Arrangement', 'In movement-based learning areas, lightweight mats, floor markers and positioning guides can be attached to the floor or to surfaces using hook and loop so that layouts can be changed between classes.'],
      ['DIY Educational Games and Activities', 'Reusable activity boards are designed by learning support staff and teachers to attach game pieces, sorting cards, and sequencing materials with hooks and loops so that they can be picked up, placed, and moved repeatedly.'],
    ],
    characteristics: [
      ['No sharp edges, which makes it safe for use around children'],
      ['Self-adhesive options require no tools for installation'],
      ['Reusable displays can be rearranged repeatedly'],
      ['Sew-on versions survive machine washing in uniform and bag applications'],
      ['Tax invoicing available for schools and institutions'],
      ['Available in bulk rolls for cost-effective school ordering'],
    ],
    recommended: [
      'Self-adhesive Hook & Loop Dots are the most convenient for classroom applications. They come in 15 mm and 22 mm sizes, in large bulk rolls and are easy to apply and can be reused for a variety of lighter mounting projects found in education.',
      'For larger format display work — mounting bigger charts or fabric panels to boards — the Self Adhesive Hook and Loop Roll in 25 mm or 50 mm width provides greater surface coverage and hold.',
    ],
    products: ['hook-and-loop-dots', 'self-adhesive-roll'],
    related: [
      ['signage-displays', 'display mounting techniques for larger formats'],
      ['medical-aged-care', 'adaptive use in care and therapy environments'],
    ],
  },

  {
    slug: 'signage-displays',
    short: 'Signage & Displays',
    name: 'Hook and Loop for Signage & Displays',
    metaTitle: 'Hook and Loop for Signage & Displays | HooknLoop Australia',
    metaDescription: 'Mount and swap signage, display panels, and exhibition materials with hook-and-loop tape. Strong, reusable, and damage-free. Shop Hook’n Loop Australia.',
    intro: 'When it comes to signage and displays for retail spaces, events, exhibitions and commercial settings, both timing and presentation are essential. Adhesive backed hook and loop for signage and displays comes as the trusted and professional fastening solution that securely sticks printed panels, banners, foam boards and fabric displays without any damage to the surface. It is ideal as temporary and semi-permanent applications and lets it change quickly between events or promotions while leaving the space completely residue free and clean. At HooknLoop Australia, we offer adhesive-backed rolls and strips that are ideal for temporary or semi-permanent signage on smooth surfaces such as glass, metal, plastic, foam board and painted walls.',
    useCases: [
      ['Point-of-Sale Display Panels', 'Hook and loop tape is widely used in retail stores in multiple applications. It effectively helps in mounting promotional signage, price cards, and campaign graphics as well as shelving, walls, and display fixtures. It promises flexibility to update content in minutes without any surface damage or residue leftover.'],
      ['Trade Show and Exhibition Graphics', 'Exhibition has a consistent demand for using hook and loop tape to attach printed graphics to fabric panels, foam board displays, and lightweight frame systems. This gives the flexibility to use the same display framework with updated graphics for each event.'],
      ['Fabric Banner Attachment', 'Using sew-on hook and loop along the edge, fabric banners and textile displays can be easily attached to aluminium frames or stretched over mounting boards. This helps in creating a neat, flawless, professional finish without visible hardware.'],
      ['Seasonal Retail Displays', 'Window and in-store seasonal displays that change frequently benefit from hook-and-loop mounting elements that can be removed and stored at the end of a season and redeployed when needed.'],
      ['Modular Display Systems', 'Interchangeable panel systems where content areas can be swapped in and out are often built using hook and loop as the primary attachment method, allowing staff to update layouts without any tools or fixings.'],
    ],
    characteristics: [
      ['Pressure-sensitive adhesion bonds easily to glass, metal, acrylic, foam board, and painted surfaces'],
      ['Reusable across multiple display cycles'],
      ['Clean removal without surface damage (on smooth, sealed surfaces)'],
      ['Fire-retardant option available for public environments'],
      ['Supplied in rolls, which can be cut to the required length for any panel size'],
      ['Available in black and white to complement display aesthetics'],
    ],
    recommended: [
      'The Self-Adhesive Hook and Loop Roll in 25 mm or 50 mm width is the most versatile option for signage and display work. It cuts to length, applies directly to hard surfaces, and provides a consistent hold for regular mounting and dismounting of panels and graphics.',
      'For smaller signs and individual display items, the Self-Adhesive Hook & Loop Dots in 22mm are a practical, easy-to-apply option.',
    ],
    products: ['self-adhesive-roll', 'hook-and-loop-dots'],
    related: [
      ['schools-education', 'display board techniques for classrooms'],
      ['construction-industrial', 'temporary signage on site hoardings'],
    ],
  },

  {
    slug: 'automotive-caravan-rv',
    short: 'Automotive, Caravan & RV',
    name: 'Hook and Loop for Automotive, Caravan & RV',
    metaTitle: 'Hook and Loop for Automotive, Caravan & RV | HooknLoop Australia',
    metaDescription: 'Hook and loop fasteners for car interiors, caravan fit-outs, and RV builds. Heat-resistant and moisture-tolerant options available. Shop HooknLoop Australia.',
    intro: 'Hook and loop fasteners are used to attach interior panels, hold accessories in place, organise storage spaces and hold loose items in place inside vehicles, caravans and RVs when traveling. They are suitable for vehicle interior applications where drilling or permanent adhesives are not preferred, as they hold securely against vibration and movement. Hook and loop can mount an organiser inside a camper van, secure carpet sections in a caravan or attach a device holder in a truck cab; it’s flexible and won’t damage the vehicle.',
    useCases: [
      ['Interior Panel and Trim Mounting in Caravans', 'Some of the lightweight interior panels, like fabric-faced boards, foam insulation linings, decorative trim pieces, etc., are easy to attach with hook-and-loop strips and even remove panels without tools for maintenance.'],
      ['Organiser and Storage Pouch Attachment', 'Hanging organisers, storage pouches, and gear nets can be attached to vehicle wall surfaces using adhesive hooks on the wall and a sew-on loop on the organiser. This keeps the interior tidy without permanent fixtures.'],
      ['Installing Carpet and Matting', 'Carpet on the floor or walls of caravans, motorhomes and vans can be secured by hook-and-loop strips around the edges, without the need to glue carpet down permanently.'],
      ['Soft Furnishing and Cushion Hold', 'Decorative cushions, bunk mattress toppers and seat cushions can be attached with hook and loop to the base to keep them stationary while driving and limit the need to move them after each trip.'],
      ['Dashcam and Device Mounting', 'Small electronics like dashcams, GPS and tablet holders can be moved from one position to another throughout the windscreen and dashboard surface with hook and loop mounting pads and without any sticky residue.'],
    ],
    characteristics: [
      ['High-strength adhesive suitable for plastic, metal, and carpeted surfaces'],
      ['Tolerates elevated temperatures common in parked vehicles'],
      ['Vibration-resistant — maintains grip on the move'],
      ['No drilling or permanent modification required'],
      ['Reusable for seasonal or reconfigurable caravan fit-outs'],
      ['Heavy-duty options available for load restraint applications'],
    ],
    recommended: [
      'The Self Adhesive Hook and Loop Roll in 25mm or 50mm is suited to most interior vehicle mounting applications where the surface is hard and smooth. For fabric and carpet attachments, the Sew On Hook and Loop (Non-Adhesive) is a perfect choice to make.',
      'To secure heavier cargo items, storage boxes, or rigid panels in the cargo area of a van or caravan, prefer using the Heavy Duty Hook and Loop Strap. It promises reliable load management.',
    ],
    products: ['self-adhesive-roll', 'sew-on', 'heavy-duty-straps'],
    related: [
      ['upholstery-furniture', 'soft furnishing and interior fabric applications'],
      ['warehousing-logistics', 'load restraint and cargo management'],
    ],
  },

  {
    slug: 'medical-aged-care',
    short: 'Medical & Aged Care',
    name: 'Hook and Loop for Medical & Aged Care',
    metaTitle: 'Hook and Loop for Medical & Aged Care | HooknLoop Australia',
    metaDescription: 'Hook and loop fasteners for adaptive clothing, mobility aids, aged care facilities, and medical equipment. Soft, safe, and reliable from HooknLoop Australia.',
    intro: 'Hook and loop fasteners are playing a significant role in medical and aged care environments when it comes to considering features like ease of use, adjustability, and hygiene. With unique features, these are perfect to be used in adaptive clothing, orthopaedic supports, braces, wheelchair fittings and mobility supports. They are useful everywhere; a secure fasten, yet easily modified, is essential. Hook and loop is used in aged care environments. These turn dressing and undressing more efficient, decreasing strain on carers and care recipients. Soft loop-side materials minimise skin irritation. There are sew-on options that are washable, which is why they become practical for clinical and personal care applications.',
    useCases: [
      ['Orthotic and Prosthetic Fastenings', 'Orthotic braces, ankle foot orthoses (AFOs), and prosthetic liners use hook-and-loop straps as the primary closure mechanism. They allow each person’s device to be fitted precisely and adjusted easily at each application without tools.'],
      ['Adjustable Straps on Braces and Splints', 'Hook and loop closures are perfect for products that offer support to the wrist, knee, elbow and ankle, in a diverse range of medical and physiotherapy sectors. They allow the compression and positioning to be adjusted quickly.'],
      ['Adaptive Clothing for Limited Dexterity', 'The excellent hook-and-loop fasteners are used in some clothes instead of buttons or zippers. This feature turns excellent for those who struggle using their hands for gripping or fine motor movements. People with neurological disorders, arthritis patients, and stroke survivors usually find them useful.'],
      ['Wheelchair Positioning and Strap Systems', 'The fastening mechanism for positioning belts, lap trays or foot strap systems on wheelchairs is often hook and loop. Carers can easily and safely fit it.'],
      ['Medical Equipment and Cuff Attachment', 'Blood pressure cuffs, TENS electrode holders, and other wearable medical devices use hook and loop as the attachment mechanism that holds the device in contact with the body at the correct position.'],
    ],
    characteristics: [
      ['Soft Loop Side for Skin-Adjacent Placement', 'The loop side should always be on the inside, next to the skin, of the garment. Hook-side material can irritate or cause abrasion if it comes into direct contact with sensitive skin.'],
      ['Wash Resistance', 'For garments, straps, and orthotic components used in personal care, the fastener must maintain its grip and structure after repeated machine washing at standard care cycle temperatures.'],
      ['Multiple Width Options for Strap Sizing', 'Narrow widths (20–25mm) suit fine strapping on splints and orthotics. Wider options (50mm+) are better suited to positioning belts and larger garment closures.'],
      ['Consistent Engagement Across Repeated Use', 'Medical and aged care applications often involve dozens of fastening and unfastening cycles per day. Consistent grip across high-cycle use is an important functional requirement.'],
      ['Adjustability Without Tools', 'A key advantage of hook and loop in care settings is the ability to adjust positioning precisely without scissors, tools, or replacement parts — allowing care staff to adapt quickly to each individual’s requirements.'],
    ],
    recommended: [
      'The Sew On Hook and Loop (Non Adhesive) in 25mm or 50mm width is the most appropriate product for medical and aged care applications involving fabric components. It is washable, can be stitched to garments and supports, and is available in both black and white.',
      'For applications where a strap needs to wrap and secure around a limb or device independently, the Double Sided Hook and Loop (Back to Back) in 25mm width provides a clean self-fastening strap solution.',
    ],
    products: ['sew-on', 'double-sided'],
    related: [
      ['clothing-garments', 'adaptive and accessible garment applications'],
      ['schools-education', 'use in early childhood and therapy environments'],
    ],
  },

  {
    slug: 'warehousing-logistics',
    short: 'Warehousing & Logistics',
    name: 'Hook and Loop for Warehousing & Logistics',
    metaTitle: 'Hook and Loop for Warehousing & Logistics | HooknLoop Australia',
    metaDescription: 'Reusable hook and loop straps and rolls for bundling cables, securing covers, and labelling in warehouses and distribution centres. Shop HooknLoop Australia.',
    intro: 'Organising a warehouse and logistics system efficiently and ensuring load management is secure can minimize errors, enhance safety, and accelerate daily operations. Hook and loop fasteners are utilized to bundle cables and hoses, secure lightweight covers on racking and pallets, label and zone storage spaces, and also organize packing stations. They are a reusable substitute to single use cable ties and packing tape and can help to save on consumable costs in high-volume situations. Heavy-duty straps can be used to bundle items that are not regular in shape or heavier, and adhesive rolls are effective for signage, zone marking, and equipment identification on the warehouse floor.',
    useCases: [
      ['Bundling Cables, Leads, and Hoses', 'Power leads, compressed air hoses, data cables and more are frequently found as long runs in warehouses and distribution centres. These are easily kept in bundles and manageable with hook and loop cable wraps, which make them easier to see and find and less likely to cause tripping.'],
      ['Pallet and Racking Cover Securing', 'Hook and loop strips help fasten dust covers, tarpaulins and protective sheets at the edges of the racking bays and pallet stacks. This also makes it easy to remove and replace during picking operations without the cover falling or shifting.'],
      ['Shelving and Bay Labelling', 'Self-adhesive hook strips can be mounted on shelving and storage units with loops and can be removed without causing damage. Labels can be updated quickly as storage locations change. This is effective in environments with high SKU turnover or seasonal layout changes.'],
      ['Packing Station Organisation', 'The station frame can be outfitted with tools and other packing station items mounted with hook and loop for easy access, keeping the work surface clear.'],
      ['Transit Bundle Management', 'Some items that are packed or consolidated for dispatch can be wrapped with reusable hook-and-loop straps rather than single-use bands. This is the way to decrease packaging waste and simplify the unpacking process at the receiving end.'],
    ],
    characteristics: [
      ['Heavy-duty straps support loads up to 100kg with nylon webbing construction'],
      ['Reusable — eliminates waste from single-use packaging materials'],
      ['Quick to apply and remove — improves pick-pack efficiency'],
      ['Machine washable straps for hygiene in food-handling environments'],
      ['Available in roll and strap formats for different applications'],
      ['Industrial-grade adhesive for permanent mounting applications'],
    ],
    recommended: [
      'The Heavy Duty Hook and Loop Strap (50mm x 5m sets) is the recommended choice for bundling hoses, leads, and heavier items on the warehouse floor.',
      'For cable and lead management, the Hook and Loop Reusable Cable Strap & Ties in packs of 20 are a practical, compact option for daily use.',
      'For labelling, zone marking, and attaching organisers to surfaces, the Self Adhesive Hook and Loop Roll in 25mm or 50mm width provides the coverage needed for a clean, flexible labelling system.',
    ],
    products: ['heavy-duty-straps', 'reusable-cable-straps', 'self-adhesive-roll'],
    related: [
      ['construction-industrial', 'site organisation and load management'],
      ['signage-displays', 'zone marking and labelling on the floor'],
    ],
  },

  {
    slug: 'construction-industrial',
    short: 'Construction & Industrial',
    name: 'Hook and Loop for Construction & Industrial Use',
    metaTitle: 'Hook and Loop for Construction & Industrial Use | HooknLoop Australia',
    metaDescription: 'Heavy-duty and fire-retardant hook and loop for tool organisation, cable management, temporary signage, and protective covers on site. Shop HooknLoop Australia.',
    intro: 'Fastening solutions at construction sites and industrial facilities must be capable of performing under harsh conditions, challenging handling, dust, moisture, and heavy loads. Hook and loop fasteners are applied to various supportive uses in situations like securing tool pouches, site organisers, cable/tube management, temporary signage on hoardings and barriers, and the attachment of protective covers to equipment and frameworks. For applications requiring fire safety, there are options available that are fire-resistant. Hook and loop does not qualify as a structural fastener but is useful as a supplement to the other fastening mechanisms for keeping worksites organised and safe.',
    useCases: [
      ['Tool Pouch and Belt Organiser Attachment', 'Tool belts, pouches, and on-site organisers can be equipped with hook and loop attachment points. This allows accessories to be mounted to a belt or work vest and repositioned as needed throughout the day.'],
      ['Temporary Signage on Hoardings and Barriers', 'Adhesive hook-and-loop tape for mounting and replacing construction site safety signs, directional signs and compliance notices allows the site signage to be easily changed when conditions change.'],
      ['Cable and Lead Management on Site', 'Extension leads, power tool cables, and data cables can be wrapped together with reusable hook-and-loop cable straps. This helps decrease tripping hazards and makes a work site manageable.'],
      ['Protective Cover Attachment', 'Heavy-duty hook-and-loop strips can attach dust sheets, weather protection covers and equipment shrouds at the edges. They are easy to remove during operation and reattach overnight or in wet weather.'],
      ['Fire-Rated Applications', 'Fire safety compliance is essential in industrial settings, including electrical installations, building services, and certain manufacturing environments. Fire-retardant hook and loop is available for applications within compliance scope.'],
    ],
    characteristics: [
      ['High-temperature acrylic adhesive maintains bond in elevated heat conditions'],
      ['Fire retardant variant meets safety requirements for commercial buildings'],
      ['Heavy-duty construction handles significant load and repeated stress'],
      ['Resists dust and moisture commonly encountered on construction sites'],
      ['Available in roll format — cut to size for each application'],
      ['Reusable for temporary and reconfigurable installation needs'],
    ],
    recommended: [
      'The Heavy Duty Hook and Loop Strap is the recommended choice for bundling heavy hoses, leads and securing covers in industrial settings.',
      'For cable management on site, the Hook and Loop Reusable Cable Strap & Ties are a practical and compact option.',
      'For fire safety-sensitive applications, the Fire Retardant Adhesive Hook and Loop Roll in 25mm width is available for use where compliance with fire retardant standards is required.',
    ],
    products: ['heavy-duty-straps', 'reusable-cable-straps', 'fire-retardant-adhesive'],
    related: [
      ['signage-displays', 'temporary signage on site hoardings'],
      ['warehousing-logistics', 'load management and bundling'],
    ],
  },
]

export const findIndustry = (slug) => INDUSTRIES.find((i) => i.slug === slug)
