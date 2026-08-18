# QA REPORT — reference-still batch 1
Model: `nano_banana_pro` (→ nano_banana_2), 1k, 16:9. Cost: 2 credits/image.

## Batch 1 (look + character lock)
| Shot | Job ID | Credits | Verdict | Notes |
|---|---|---|---|---|
| S02 catch | 0dea57c8… | 2 | ❌ REDO | Rendered a **metal fishing hook + webbing**, not hook-and-loop micro-mechanism. Cinematic but factually wrong. Re-rolled with accurate nylon-hooks-catching-loops prompt. |
| S03 hands | a45fae7d… | 2 | ✅ APPROVE | Freckled hand + matte gold band, child's hand, warm AU kitchen, correct anatomy, matte skin. **Locked as Character C1 anchor.** |
| S09 strap | 362c229a… | 2 | ✅ APPROVE | White ute + stock cage, weathered timber, dawn backlight, dust, red dirt. Single orange flare. Note: nudge hue → `#E87722`; show hook-and-loop end in i2v. |
| S11 aged care | 76250cf1… | 2 | ✅ APPROVE | Dignified elder, looking down (not to camera), tender carer hands, sunroom w/ plant + photos. **The emotional heart.** Keeper. |
| S02b catch (redo) | 2a3fa3fe… | 2 | ✅ APPROVE | Accurate hook-and-loop macro: two black strips meeting, fibres engaging. Rhymes with end-card. **Locked as macro hero look.** |

**Batch running total: 10 credits spent** (balance ≈ 2613). 4/5 shots first-time pass; 1 re-roll. All look-defining frames approved.

## Standing QA rules applied
Checked: hands/fingers ✓ · faces to camera ✓ (none) · product geometry (S02 failed) · orange discipline ✓ (only S09) · legible fake logos ✓ (none) · plastic sheen ✓. 
Learning: this model literalises "hook" as a fishing hook — always specify "tiny nylon hooks / textile / not metal" for macro product shots.
