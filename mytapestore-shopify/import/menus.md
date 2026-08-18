# Navigation to build in Shopify Admin

Menus cannot be created from theme files or the Theme Access API — build
these under **Online Store → Navigation**. The header section reads them,
and the mega-menu column count follows the number of children (see
`sections-header-note.md`).

## `main-menu`

```
Home                       /
Double-Sided Tape          /collections/all
  ├ Foam Tape Double Sided                 /collections/foam-tape-double-sided
  ├ Ultra High Bond Tape                   /collections/high-bond-acrylic-tape-vhp
  ├ Cloth Double Sided Tape                /collections/cloth-double-sided-tape
  ├ Butyl Tape                             /collections/butyl-tape
  ├ Glazing Tapes                          /collections/glazing-tapes
  ├ Tissue Tape                            /collections/double-sided-tissue-tape
  ├ Polyester Tape                         /collections/polyester-tape
  ├ ATG Tapes                              /collections/atg-tapes
  ├ Double Sided Tape                      /collections/double-sided-tape
Single-Sided Tapes         /collections/all
  ├ Aluminium Foil Tape                    /collections/aluminium-foil-tapes
  ├ Barricade Hazard Tapes                 /collections/barricade-hazard-tapes
  ├ Bumpers Tapes                          /collections/bumpers-tapes
  ├ Duct Tape                              /collections/duct-tape
  ├ Eco Friendly Tapes                     /collections/eco-friendly-tapes
  ├ Fabric Tape                            /collections/fabric-tape
  ├ Felt Tape & Dots                       /collections/felt-tapes-dots
  ├ Foam Tape – Single Sided               /collections/foam-tape
  ├ Flashing Tape                          /collections/flashing-tape
  ├ Filament Tape                          /collections/filament-tapes
  ├ Glue Dots                              /collections/glue-dots
  ├ Hang Tab                               /collections/hang-tab
  ├ Hook & Loop Tape                       /collections/hook-loop-tapes
  ├ Hook and Loop Dots                     /collections/hook-and-loop-dots
  ├ Packaging Tapes                        /collections/packaging-tapes
  ├ Paper Tape                             /collections/paper-kraft-tape
  ├ Protection Tape                        /collections/protection-tape
  ├ PVC Electrical Insulation Tape         /collections/pvc-electrical-insulation-tape
  ├ Masking Tape                           /collections/masking-tape
  ├ Magnetic Tapes                         /collections/magnetic-tapes
  ├ Reflective Tape                        /collections/reflective-tape
  ├ Safety Tapes                           /collections/safety-tape
  ├ Strapping Tapes                        /collections/strapping-tapes
  ├ Specialty Tape                         /collections/specialty-tape
  ├ Thermal Insulation Tape                /collections/thermal-insulation-tape
  ├ Acribond Accessories                   /collections/acribond-accessories
Dispensers & Accessories   /collections/tapes-dispensers
  ├ Tape Dispensers                        /collections/tapes-dispensers
Industries                 /pages/industries
  ├ Aerospace Defense                      /collections/aerospace-defense
  ├ Airconditioning Refrigeration Tapes    /collections/airconditioning-refrigeration-tapes
  ├ Building & Construction                /collections/building-construction
  ├ Display Signage                        /collections/display-signage
  ├ Electronics & Electrical               /collections/electronics-electrical
  ├ Flooring                               /collections/flooring
  ├ Framing & Insulation                   /collections/framing-insulation
  ├ Glass & Glazing                        /collections/glass-glazing
  ├ HVAC & Plumbing                        /collections/hvac-plumbing
  ├ Joinery Kitchen Furniture              /collections/joinery-kitchen-furniture
  ├ Manufacturing                          /collections/manufacturing
  ├ Marine                                 /collections/marine
  ├ Marking Safety                         /collections/marking-safety
  ├ Nameplates                             /collections/nameplates
  ├ Picture Framing Tapes                  /collections/picture-framing-tapes
  ├ Pool & Spa                             /collections/pool-spa
  ├ Printing                               /collections/printing
  ├ Roofing & Gutters                      /collections/roofing-gutters
  ├ Sheathing & Moisture Management        /collections/sheathing-moisture-management
  ├ Solar Energy                           /collections/solar-energy
  ├ Tapes For School Library               /collections/tapes-for-school-library
  ├ Tapes for Visual, Arts & Entertainment /collections/tapes-for-visual-arts-entertainment
  ├ Telecommunication                      /collections/telecommunication
  ├ Transport Automotive RV                /collections/transport-automotive-rv
  ├ Warehouse Packaging Logistics          /collections/warehouse-packaging-logistics
  ├ Windows Doors & Decking                /collections/windows-doors-decking
All Products               /collections/all
```

## `industries` (drives the home-page industry carousel)

```
Aerospace Defense                        /collections/aerospace-defense
Airconditioning Refrigeration Tapes      /collections/airconditioning-refrigeration-tapes
Building & Construction                  /collections/building-construction
Display Signage                          /collections/display-signage
Electronics & Electrical                 /collections/electronics-electrical
Flooring                                 /collections/flooring
Framing & Insulation                     /collections/framing-insulation
Glass & Glazing                          /collections/glass-glazing
HVAC & Plumbing                          /collections/hvac-plumbing
Joinery Kitchen Furniture                /collections/joinery-kitchen-furniture
Manufacturing                            /collections/manufacturing
Marine                                   /collections/marine
Marking Safety                           /collections/marking-safety
Nameplates                               /collections/nameplates
Picture Framing Tapes                    /collections/picture-framing-tapes
Pool & Spa                               /collections/pool-spa
Printing                                 /collections/printing
Roofing & Gutters                        /collections/roofing-gutters
Sheathing & Moisture Management          /collections/sheathing-moisture-management
Solar Energy                             /collections/solar-energy
Tapes For School Library                 /collections/tapes-for-school-library
Tapes for Visual, Arts & Entertainment   /collections/tapes-for-visual-arts-entertainment
Telecommunication                        /collections/telecommunication
Transport Automotive RV                  /collections/transport-automotive-rv
Warehouse Packaging Logistics            /collections/warehouse-packaging-logistics
Windows Doors & Decking                  /collections/windows-doors-decking
```

## `footer-shop`

```
Aluminium Foil Tape                      /collections/aluminium-foil-tapes
Barricade Hazard Tapes                   /collections/barricade-hazard-tapes
Bumpers Tapes                            /collections/bumpers-tapes
Duct Tape                                /collections/duct-tape
Eco Friendly Tapes                       /collections/eco-friendly-tapes
Fabric Tape                              /collections/fabric-tape
Felt Tape & Dots                         /collections/felt-tapes-dots
```

## `footer-information`

```
About us                                 /pages/about-us
Shop                                     /collections/all
Tape dispensers                          /collections/tapes-dispensers
Industries                               /pages/industries
Bulk & trade                             /pages/bulk-trade
Contact us                               /pages/contact
```

## `footer` (customer care)

```
Shipping & delivery                      /pages/shipping-delivery
Return policy                            /pages/return-policy
Privacy policy                           /policies/privacy-policy
Terms & conditions                       /policies/terms-of-service
Customer service                         /pages/contact
```