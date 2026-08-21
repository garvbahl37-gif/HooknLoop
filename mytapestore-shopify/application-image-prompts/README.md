# Application image prompts

396 prompts — 3 per product across all 132 active products.

| File | What it is |
|---|---|
| `prompts.csv` | one row per prompt: product, handle, category, n, scene, industries, prompt |
| `prompts.json` | same data, for scripting |
| `scenes.py` | the scene library the prompts were generated from — 34 categories x 3 scenes |

## How the prompts were built

Each product is matched to its **own Shopify category collection**, and that category has three
distinct application scenes written for it. The scenes are grounded in what the product is actually
for, not inferred from its title.

Two deliberate constraints:

**No prompt contains the product name.** Naming "Aluminium Foil Tape" in a prompt invites the model to
render those words onto the roll. Tapes are described by appearance and use instead.

**Every prompt carries a hard no-text clause** naming each surface that image models habitually
scribble on — roll cores, cartons, panels, signage. Trimming it brings the garbled lettering back.

## Regenerating

Edit `scenes.py`, then re-run the generator against a fresh product pull. Industry context is applied
**only** to the `__default__` fallback scenes; bolting an industry tag onto a category scene produced
contradictions (a cable-management shot labelled "Display Signage").
